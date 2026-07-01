import "server-only";

import bs58 from "bs58";
import nacl from "tweetnacl";
import { isValidSolanaAddress } from "./bearco";

export const CLAIM_MAX_AGE_MS = 10 * 60 * 1000;

export function claimDisplayName(displayName: string | null): string {
  return displayName || "holder";
}

export function claimIssuedAt(message: string): number | null {
  const match = message.match(/^Issued At: (.+)$/m);
  if (!match) return null;

  const timestamp = Date.parse(match[1]);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function claimDomain(message: string): string | null {
  const match = message.match(/^Domain: (.+)$/m);
  return match?.[1]?.trim().toLowerCase() || null;
}

export function claimCode(message: string): string | null {
  const match = message.match(/^Claim Code: (.+)$/m);
  return match?.[1]?.trim() || null;
}

export function requestHost(headers: Headers, fallbackHost: string): string {
  return (
    headers.get("x-forwarded-host") ||
    headers.get("host") ||
    fallbackHost
  )
    .split(",")[0]
    .trim()
    .toLowerCase();
}

export function verifyClaimMessage(input: {
  host: string;
  walletAddress: string;
  displayName: string | null;
  message: string;
}): boolean {
  if (!isValidSolanaAddress(input.walletAddress)) return false;
  if (!input.message.includes("Bearo $BEARCO holder profile")) return false;
  if (!input.message.includes(`Wallet: ${input.walletAddress}`)) return false;
  if (
    !input.message.includes(
      `Display Name: ${claimDisplayName(input.displayName)}`,
    )
  ) {
    return false;
  }
  if (claimDomain(input.message) !== input.host) return false;

  const issuedAt = claimIssuedAt(input.message);
  if (!issuedAt) return false;
  const ageMs = Date.now() - issuedAt;
  return ageMs >= -60_000 && ageMs <= CLAIM_MAX_AGE_MS;
}

function decodeBase64Signature(value: string): Uint8Array | null {
  const normalized = value.trim().replace(/-/g, "+").replace(/_/g, "/");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)) return null;

  const bytes = new Uint8Array(Buffer.from(normalized, "base64"));
  return bytes.length === 64 ? bytes : null;
}

function decodeBase58Signature(value: string): Uint8Array | null {
  try {
    const bytes = bs58.decode(value.trim());
    return bytes.length === 64 ? bytes : null;
  } catch {
    return null;
  }
}

function decodeHexSignature(value: string): Uint8Array | null {
  const normalized = value.trim().replace(/^0x/i, "");
  if (!/^[0-9a-fA-F]+$/.test(normalized)) return null;

  const bytes = new Uint8Array(Buffer.from(normalized, "hex"));
  return bytes.length === 64 ? bytes : null;
}

export function decodeClaimSignature(value: string): Uint8Array | null {
  return (
    decodeBase64Signature(value) ||
    decodeBase58Signature(value) ||
    decodeHexSignature(value)
  );
}

export function verifyClaimSignature(input: {
  host: string;
  walletAddress: string;
  displayName: string | null;
  message: string;
  signature: string;
}): boolean {
  if (!verifyClaimMessage(input)) return false;

  const publicKey = bs58.decode(input.walletAddress);
  const signature = decodeClaimSignature(input.signature);
  if (!signature) return false;

  const message = new TextEncoder().encode(input.message);
  return nacl.sign.detached.verify(message, signature, publicKey);
}
