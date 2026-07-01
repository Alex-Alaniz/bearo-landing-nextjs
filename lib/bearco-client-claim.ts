export function signedDisplayName(displayName: string): string {
  const cleaned = displayName.trim().replace(/\s+/g, " ").slice(0, 48);
  return cleaned.length >= 2 ? cleaned : "holder";
}

export function createBearcoClaimMessage(input: {
  claimCode?: string;
  displayName: string;
  host: string;
  issuedAt?: string;
  walletAddress: string;
}): string {
  const lines = [
    "Bearo $BEARCO holder profile",
    `Wallet: ${input.walletAddress}`,
    `Display Name: ${signedDisplayName(input.displayName)}`,
    `Domain: ${input.host}`,
  ];
  if (input.claimCode) lines.push(`Claim Code: ${input.claimCode}`);
  lines.push(`Issued At: ${input.issuedAt || new Date().toISOString()}`);
  return lines.join("\n");
}

export function createBearcoClaimCode(): string {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  const code = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `BEARCO-${code.toUpperCase()}`;
}
