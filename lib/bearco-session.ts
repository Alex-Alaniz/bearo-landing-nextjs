import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { isValidSolanaAddress } from "./bearco";

export const HOLDER_SESSION_COOKIE = "bearco_holder_session";

const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function getSessionSecret(): string | null {
  if (process.env.BEARCO_SESSION_SECRET) {
    return process.env.BEARCO_SESSION_SECRET;
  }
  if (process.env.NODE_ENV === "production") {
    return null;
  }
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return process.env.SUPABASE_SERVICE_ROLE_KEY;
  }
  if (process.env.THIRDWEB_SECRET_KEY) {
    return process.env.THIRDWEB_SECRET_KEY;
  }

  return "bearco-local-holder-session";
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function signaturesMatch(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export function createHolderSessionValue(walletAddress: string): string | null {
  const secret = getSessionSecret();
  if (!secret) return null;

  const payload = Buffer.from(
    JSON.stringify({
      walletAddress,
      issuedAt: Date.now(),
    }),
  ).toString("base64url");

  return `${payload}.${signPayload(payload, secret)}`;
}

export function holderSessionCookieOptions() {
  return {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export async function readHolderSessionWallet(): Promise<string | null> {
  const secret = getSessionSecret();
  if (!secret) return null;

  const cookieStore = await cookies();
  const value = cookieStore.get(HOLDER_SESSION_COOKIE)?.value;
  if (!value) return null;

  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const expected = signPayload(payload, secret);
  if (!signaturesMatch(signature, expected)) return null;

  try {
    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { walletAddress?: unknown; issuedAt?: unknown };
    if (typeof decoded.walletAddress !== "string") return null;
    if (!isValidSolanaAddress(decoded.walletAddress)) return null;
    if (typeof decoded.issuedAt !== "number") return null;

    const ageMs = Date.now() - decoded.issuedAt;
    if (ageMs < 0 || ageMs > SESSION_MAX_AGE_SECONDS * 1000) return null;

    return decoded.walletAddress;
  } catch {
    return null;
  }
}
