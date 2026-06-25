import { NextRequest, NextResponse } from "next/server";
import bs58 from "bs58";
import nacl from "tweetnacl";
import {
  getBearcoHolderProfile,
  normalizeDisplayName,
  upsertHolderProfile,
} from "@/lib/bearco-server";
import {
  createHolderSessionValue,
  HOLDER_SESSION_COOKIE,
  holderSessionCookieOptions,
} from "@/lib/bearco-session";
import { isValidSolanaAddress } from "@/lib/bearco";

export const dynamic = "force-dynamic";

const CLAIM_MAX_AGE_MS = 10 * 60 * 1000;

function decodeBase64(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, "base64"));
}

function claimDisplayName(displayName: string | null): string {
  return displayName || "holder";
}

function claimIssuedAt(message: string): number | null {
  const match = message.match(/^Issued At: (.+)$/m);
  if (!match) return null;

  const timestamp = Date.parse(match[1]);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function claimDomain(message: string): string | null {
  const match = message.match(/^Domain: (.+)$/m);
  return match?.[1]?.trim().toLowerCase() || null;
}

function requestHost(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    req.nextUrl.host
  )
    .split(",")[0]
    .trim()
    .toLowerCase();
}

function verifyClaimSignature(input: {
  host: string;
  walletAddress: string;
  displayName: string | null;
  message: string;
  signature: string;
}): boolean {
  if (!input.message.includes("Bearo $BEARCO holder profile")) return false;
  if (!input.message.includes(`Wallet: ${input.walletAddress}`)) return false;
  if (
    !input.message.includes(`Display Name: ${claimDisplayName(input.displayName)}`)
  ) {
      return false;
  }
  if (claimDomain(input.message) !== input.host) return false;

  const issuedAt = claimIssuedAt(input.message);
  if (!issuedAt) return false;
  const ageMs = Date.now() - issuedAt;
  if (ageMs < -60_000 || ageMs > CLAIM_MAX_AGE_MS) return false;

  const publicKey = bs58.decode(input.walletAddress);
  const signature = decodeBase64(input.signature);
  const message = new TextEncoder().encode(input.message);

  return nacl.sign.detached.verify(message, signature, publicKey);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const walletAddress =
    typeof body.walletAddress === "string" ? body.walletAddress.trim() : "";
  const message = typeof body.message === "string" ? body.message : "";
  const signature = typeof body.signature === "string" ? body.signature : "";
  const displayName = normalizeDisplayName(body.displayName);

  if (!isValidSolanaAddress(walletAddress)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  if (!message || !signature) {
    return NextResponse.json(
      { error: "Missing signed profile claim" },
      { status: 400 },
    );
  }

  try {
    if (
      !verifyClaimSignature({
        host: requestHost(req),
        walletAddress,
        displayName,
        message,
        signature,
      })
    ) {
      return NextResponse.json(
        { error: "Wallet signature could not be verified" },
        { status: 401 },
      );
    }

    const holder = await getBearcoHolderProfile(walletAddress);
    const claim = await upsertHolderProfile({
      walletAddress,
      displayName,
      holderPercent: holder.holderPercent,
      tokenBalance: holder.effectiveBalance.uiAmountString,
    });

    const sessionValue = createHolderSessionValue(walletAddress);
    const response = NextResponse.json({
      success: true,
      persisted: claim.persisted,
      sessionIssued: Boolean(sessionValue),
      profile: claim.profile,
      holder: {
        holderPercent: holder.holderPercent,
        unlockedTiers: holder.unlockedTiers,
        highestTier: holder.highestTier,
      },
    });
    if (sessionValue) {
      response.cookies.set(
        HOLDER_SESSION_COOKIE,
        sessionValue,
        holderSessionCookieOptions(),
      );
    }

    return response;
  } catch (error) {
    const fallback =
      error instanceof Error ? error.message : "Unable to claim profile";
    const status = fallback.includes("rate limiting") ? 429 : 500;
    return NextResponse.json({ error: fallback }, { status });
  }
}
