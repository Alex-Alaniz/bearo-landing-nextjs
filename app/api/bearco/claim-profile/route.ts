import { NextRequest, NextResponse } from "next/server";
import {
  getBearcoHolderProfile,
  normalizeDisplayName,
  upsertHolderProfile,
} from "@/lib/bearco-server";
import {
  requestHost,
  verifyClaimSignature,
} from "@/lib/bearco-claim";
import {
  createHolderSessionValue,
  HOLDER_SESSION_COOKIE,
  holderSessionCookieOptions,
} from "@/lib/bearco-session";
import { isValidSolanaAddress } from "@/lib/bearco";

export const dynamic = "force-dynamic";

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
        host: requestHost(req.headers, req.nextUrl.host),
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
