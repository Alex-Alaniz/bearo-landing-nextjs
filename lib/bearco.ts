export const BEARCO_MINT_ADDRESS =
  "FdFUGJSzJXDCZemQbkBwYs3tZEvixyEc8cZfRqJrpump";

export const DEFAULT_SOLANA_RPC_URL = "https://api.mainnet-beta.solana.com";
export const PUMPSWAP_PROGRAM_ID =
  "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA";
export const SOL_WRAPPED_MINT = "So11111111111111111111111111111111111111112";
export const BEARCO_LIQUIDITY_PATH = "/holders/liquidity";
export const BEARCO_PUMPSWAP_POOL =
  "BakErJmVtygmYPQvA8avwgqHif2zbGxRs6DD3RNVHHVF";
export const BEARCO_PUMPSWAP_LP_MINT =
  "G35NRNmYA89SSP8LUXV1zWkUyg8cZPQxBJWxp22hPBq8";
export const BEARCO_PUMP_URL =
  "https://pump.fun/coin/FdFUGJSzJXDCZemQbkBwYs3tZEvixyEc8cZfRqJrpump";
export const BEARCO_STREAMFLOW_DASHBOARD_URL =
  "https://app.streamflow.finance/token-dashboard/solana/mainnet/FdFUGJSzJXDCZemQbkBwYs3tZEvixyEc8cZfRqJrpump";

export type HolderTierKey = "1" | "2" | "3" | "5" | "10";

export interface HolderRoomCommunityLink {
  description: string;
  href: string | null;
  label: string;
  provider: "telegram" | "discord";
}

export interface HolderTier {
  key: HolderTierKey;
  thresholdPercent: number;
  title: string;
  shortTitle: string;
  path: string;
  description: string;
  communityLinks: HolderRoomCommunityLink[];
}

function publicEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

function tierChannelUrl(provider: "telegram" | "discord", key: HolderTierKey) {
  const prefix =
    provider === "telegram"
      ? "NEXT_PUBLIC_BEARCO_TELEGRAM"
      : "NEXT_PUBLIC_BEARCO_DISCORD";
  return (
    publicEnv(`${prefix}_ROOM_${key}_URL`) ||
    publicEnv(`${prefix}_HOLDER_URL`) ||
    null
  );
}

function communityLinksForTier(
  key: HolderTierKey,
): HolderRoomCommunityLink[] {
  return [
    {
      description: "Open the tier channel for announcements and live holder chat.",
      href: tierChannelUrl("telegram", key),
      label: "Telegram channel",
      provider: "telegram",
    },
    {
      description: "Open the Discord space for async planning and moderation.",
      href: tierChannelUrl("discord", key),
      label: "Discord channel",
      provider: "discord",
    },
  ];
}

export const HOLDER_TIERS: HolderTier[] = [
  {
    key: "1",
    thresholdPercent: 1,
    title: "1% Holder Room",
    shortTitle: "1%+",
    path: "/holders/1",
    description:
      "Profile visibility, early feature votes, and holder-only roadmap context.",
    communityLinks: communityLinksForTier("1"),
  },
  {
    key: "2",
    thresholdPercent: 2,
    title: "2% Holder Room",
    shortTitle: "2%+",
    path: "/holders/2",
    description:
      "Campaign coordination, builder previews, and partner-launch planning.",
    communityLinks: communityLinksForTier("2"),
  },
  {
    key: "3",
    thresholdPercent: 3,
    title: "3% Holder Room",
    shortTitle: "3%+",
    path: "/holders/3",
    description:
      "LP research, staking assumptions, PumpSwap review, and product economics.",
    communityLinks: communityLinksForTier("3"),
  },
  {
    key: "5",
    thresholdPercent: 5,
    title: "5% Holder Room",
    shortTitle: "5%+",
    path: "/holders/5",
    description:
      "Treasury structure, rewards policy, staking design, and LP strategy drafts.",
    communityLinks: communityLinksForTier("5"),
  },
  {
    key: "10",
    thresholdPercent: 10,
    title: "10% Holder Room",
    shortTitle: "10%+",
    path: "/holders/10",
    description:
      "Creator-scale governance, allocation policy, and deep treasury work.",
    communityLinks: communityLinksForTier("10"),
  },
];

export function getHolderTierByKey(key: string): HolderTier | undefined {
  return HOLDER_TIERS.find((tier) => tier.key === key);
}

export function getUnlockedHolderTiers(holderPercent: number): HolderTier[] {
  return HOLDER_TIERS.filter((tier) => holderPercent >= tier.thresholdPercent);
}

export function getHighestHolderTier(holderPercent: number): HolderTier | null {
  return getUnlockedHolderTiers(holderPercent).at(-1) ?? null;
}

export function isValidSolanaAddress(address: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address.trim());
}

export function formatHolderPercent(value: number): string {
  if (!Number.isFinite(value)) return "0%";
  if (value >= 1) return `${value.toFixed(2).replace(/\.?0+$/, "")}%`;
  if (value >= 0.01) return `${value.toFixed(3).replace(/\.?0+$/, "")}%`;
  return `${value.toFixed(6).replace(/\.?0+$/, "")}%`;
}

export function formatTokenAmount(value: string | number): string {
  const numeric = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(numeric)) return "0";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: numeric >= 1 ? 2 : 6,
  }).format(numeric);
}
