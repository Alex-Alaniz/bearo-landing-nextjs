import { PublicKey } from "@solana/web3.js";
import {
  DEFAULT_SOLANA_RPC_URL,
  BEARCO_MINT_ADDRESS,
  BEARCO_STREAMFLOW_DASHBOARD_URL,
} from "./bearco";

const STREAMFLOW_TOKEN_DASHBOARD_API =
  "https://api.streamflow.finance/v2/api/token-dashboards/SOLANA";
const STREAMFLOW_REVALIDATE_SECONDS = 5 * 60;
const DEFAULT_BEARCO_DECIMALS = 6;
const STREAMFLOW_MAINNET_PROGRAM_ID =
  "strmRqUCoQUgGUan5YhzUZa6KqdzwX5L6FpUxfmKg5m";
const STREAMFLOW_TOKEN_LOCK_TYPE = "TOKEN_LOCK";
const STREAMFLOW_LOCK_ACCOUNT_OFFSETS = {
  closed: 671,
  depositedAmount: 417,
  mint: 177,
  recipient: 113,
  sender: 49,
  withdrawnAmount: 17,
} as const;

interface StreamflowTokenAmount {
  raw?: string;
  ui?: string;
}

interface StreamflowTokenInfo {
  circulatingSupply?: StreamflowTokenAmount;
  decimals?: number;
  name?: string;
  symbol?: string;
  totalSupply?: StreamflowTokenAmount;
}

interface StreamflowStats {
  active?: number;
  canceled?: number;
  completed?: number;
  paused?: number;
  scheduled?: number;
  tokensDeposited?: string;
  tokensLocked?: string;
  tokensUnlocked?: string;
  total?: number;
  unlockSchedule?: Array<{
    ts?: number;
    value?: string;
  }>;
}

interface StreamflowDashboardResponse {
  chain?: string;
  labelContractsMap?: Record<string, Record<string, string[]>>;
  info?: StreamflowTokenInfo;
  mint?: string;
  name?: string;
  stats?: {
    byType?: Record<string, StreamflowStats>;
  };
  tokenSupply?: string;
}

export interface BearcoLockedSupplyBreakdown {
  contractCount: number;
  lockedUiAmount: string;
  type: string;
}

export interface BearcoLockedSupplySnapshot {
  circulatingUiAmount: string;
  contractCount: number;
  lockedPercent: number;
  lockedUiAmount: string;
  mintAddress: string;
  sourceUrl: string;
  totalUiAmount: string;
  typeBreakdown: BearcoLockedSupplyBreakdown[];
  unlockEndsAt: string | null;
  unlockStartsAt: string | null;
  updatedAt: string;
}

export interface BearcoStreamflowLockCredit {
  amountAtomic: string;
  contractCount: number;
  contracts: string[];
  holderPercent: number;
  sourceUrl: string;
  sourceWallets: string[];
  uiAmountString: string;
  updatedAt: string;
}

function atomicToDecimalString(amount: bigint, decimals: number): string {
  if (decimals <= 0) return amount.toString();

  const zero = BigInt(0);
  const sign = amount < zero ? "-" : "";
  const absolute = amount < zero ? -amount : amount;
  const raw = absolute.toString().padStart(decimals + 1, "0");
  const whole = raw.slice(0, -decimals) || "0";
  const fraction = raw.slice(-decimals).replace(/0+$/, "");
  return `${sign}${fraction ? `${whole}.${fraction}` : whole}`;
}

function safeBigInt(value: string | undefined): bigint | null {
  if (!value || !/^-?\d+$/.test(value)) return null;
  return BigInt(value);
}

function percentOfSupply(part: bigint, total: bigint): number {
  if (total <= BigInt(0)) return 0;
  const scaled = (part * BigInt(100000000)) / total;
  return Number(scaled) / 1_000_000;
}

function isoFromSeconds(seconds: number | null): string | null {
  if (!seconds || !Number.isFinite(seconds)) return null;
  return new Date(seconds * 1000).toISOString();
}

function streamflowDashboardUrl(): string {
  return `${STREAMFLOW_TOKEN_DASHBOARD_API}/${encodeURIComponent(BEARCO_MINT_ADDRESS)}`;
}

async function fetchStreamflowDashboard(): Promise<StreamflowDashboardResponse> {
  const response = await fetch(streamflowDashboardUrl(), {
    headers: { accept: "application/json" },
    next: { revalidate: STREAMFLOW_REVALIDATE_SECONDS },
  });

  if (!response.ok) {
    throw new Error("Unable to load Streamflow locked supply.");
  }

  return (await response.json()) as StreamflowDashboardResponse;
}

export async function getBearcoLockedSupply(): Promise<BearcoLockedSupplySnapshot> {
  const data = await fetchStreamflowDashboard();
  const decimals = data.info?.decimals ?? DEFAULT_BEARCO_DECIMALS;
  const totalRaw =
    safeBigInt(data.info?.totalSupply?.raw) ?? safeBigInt(data.tokenSupply);
  const circulatingRaw = safeBigInt(data.info?.circulatingSupply?.raw);
  const statsByType = data.stats?.byType ?? {};
  const typeBreakdown = Object.entries(statsByType)
    .map(([type, stats]) => {
      const locked = safeBigInt(stats.tokensLocked);
      return {
        contractCount: stats.total ?? 0,
        locked,
        type,
      };
    })
    .filter(
      (item): item is { contractCount: number; locked: bigint; type: string } =>
        item.locked !== null && item.locked > BigInt(0),
    );

  const statsLockedRaw = typeBreakdown.reduce(
    (total, item) => total + item.locked,
    BigInt(0),
  );
  const lockedRaw =
    totalRaw !== null && circulatingRaw !== null
      ? totalRaw - circulatingRaw
      : statsLockedRaw;
  const totalSupplyRaw = totalRaw ?? lockedRaw + (circulatingRaw ?? BigInt(0));
  const circulatingSupplyRaw =
    circulatingRaw ??
    totalSupplyRaw - (lockedRaw > BigInt(0) ? lockedRaw : BigInt(0));
  const unlockTimestamps = Object.values(statsByType)
    .flatMap((stats) => stats.unlockSchedule || [])
    .map((item) => item.ts)
    .filter((ts): ts is number => typeof ts === "number" && Number.isFinite(ts))
    .sort((left, right) => left - right);

  return {
    circulatingUiAmount: atomicToDecimalString(circulatingSupplyRaw, decimals),
    contractCount: typeBreakdown.reduce(
      (total, item) => total + item.contractCount,
      0,
    ),
    lockedPercent: percentOfSupply(lockedRaw, totalSupplyRaw),
    lockedUiAmount: atomicToDecimalString(lockedRaw, decimals),
    mintAddress: data.mint ?? BEARCO_MINT_ADDRESS,
    sourceUrl: BEARCO_STREAMFLOW_DASHBOARD_URL,
    totalUiAmount: atomicToDecimalString(totalSupplyRaw, decimals),
    typeBreakdown: typeBreakdown.map((item) => ({
      contractCount: item.contractCount,
      lockedUiAmount: atomicToDecimalString(item.locked, decimals),
      type: item.type,
    })),
    unlockEndsAt: isoFromSeconds(unlockTimestamps.at(-1) ?? null),
    unlockStartsAt: isoFromSeconds(unlockTimestamps[0] ?? null),
    updatedAt: new Date().toISOString(),
  };
}

function isSolanaAddress(value: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value.trim());
}

function normalizeWallet(value: string): string | null {
  const trimmed = value.trim();
  return isSolanaAddress(trimmed) ? trimmed : null;
}

function streamflowLockSourceWallets(walletAddress: string): string[] {
  const sourceWallets = new Set<string>([walletAddress]);
  const aliases = process.env.BEARCO_STREAMFLOW_LOCK_WALLET_ALIASES || "";

  aliases
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((entry) => {
      const [target, sources] = entry.split("=");
      if (normalizeWallet(target || "") !== walletAddress) return;

      sources
        ?.split(",")
        .map((source) => normalizeWallet(source))
        .filter((source): source is string => Boolean(source))
        .forEach((source) => sourceWallets.add(source));
    });

  return [...sourceWallets];
}

function tokenLockContractIds(data: StreamflowDashboardResponse): string[] {
  const ids = new Set<string>();
  Object.values(data.labelContractsMap || {}).forEach((contractsByType) => {
    contractsByType[STREAMFLOW_TOKEN_LOCK_TYPE]?.forEach((id) => ids.add(id));
  });
  return [...ids].filter(isSolanaAddress);
}

function rpcUrl(): string {
  return (
    process.env.SOLANA_RPC_URL ||
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    DEFAULT_SOLANA_RPC_URL
  );
}

async function getStreamflowContractAccounts(contractIds: string[]) {
  if (contractIds.length === 0) return [];

  const response = await fetch(rpcUrl(), {
    body: JSON.stringify({
      id: "bearco-streamflow-locks",
      jsonrpc: "2.0",
      method: "getMultipleAccounts",
      params: [contractIds, { encoding: "base64" }],
    }),
    headers: { "content-type": "application/json" },
    method: "POST",
    next: { revalidate: STREAMFLOW_REVALIDATE_SECONDS },
  });

  if (!response.ok) {
    throw new Error("Unable to load Streamflow lock accounts.");
  }

  const data = (await response.json()) as {
    error?: { message?: string };
    result?: {
      value?: Array<{
        data?: [string, string];
        owner?: string;
      } | null>;
    };
  };

  if (data.error) {
    throw new Error(data.error.message || "Unable to load Streamflow locks.");
  }

  return data.result?.value || [];
}

function publicKeyFromAccountData(data: Buffer, offset: number): string | null {
  const bytes = data.subarray(offset, offset + 32);
  if (bytes.length !== 32) return null;

  try {
    return new PublicKey(bytes).toBase58();
  } catch {
    return null;
  }
}

function readU64(data: Buffer, offset: number): bigint {
  if (offset + 8 > data.length) return BigInt(0);
  return data.readBigUInt64LE(offset);
}

export async function getBearcoStreamflowLockCreditForWallet(
  walletAddress: string,
): Promise<BearcoStreamflowLockCredit> {
  const normalizedWallet = normalizeWallet(walletAddress);
  if (!normalizedWallet) {
    throw new Error("Invalid Streamflow lock wallet address.");
  }

  const sourceWallets = streamflowLockSourceWallets(normalizedWallet);
  const sourceWalletSet = new Set(sourceWallets);
  const data = await fetchStreamflowDashboard();
  const decimals = data.info?.decimals ?? DEFAULT_BEARCO_DECIMALS;
  const totalSupplyRaw =
    safeBigInt(data.info?.totalSupply?.raw) ?? safeBigInt(data.tokenSupply);
  const contractIds = tokenLockContractIds(data);
  const accounts = await getStreamflowContractAccounts(contractIds);
  let amountAtomic = BigInt(0);
  const creditedContracts: string[] = [];

  accounts.forEach((account, index) => {
    if (!account || account.owner !== STREAMFLOW_MAINNET_PROGRAM_ID) return;
    const encoded = account.data?.[0];
    if (!encoded) return;

    const accountData = Buffer.from(encoded, "base64");
    if (accountData[STREAMFLOW_LOCK_ACCOUNT_OFFSETS.closed] === 1) return;

    const mint = publicKeyFromAccountData(
      accountData,
      STREAMFLOW_LOCK_ACCOUNT_OFFSETS.mint,
    );
    if (mint !== BEARCO_MINT_ADDRESS) return;

    const sender = publicKeyFromAccountData(
      accountData,
      STREAMFLOW_LOCK_ACCOUNT_OFFSETS.sender,
    );
    const recipient = publicKeyFromAccountData(
      accountData,
      STREAMFLOW_LOCK_ACCOUNT_OFFSETS.recipient,
    );
    if (!sender || !recipient) return;
    if (!sourceWalletSet.has(sender) && !sourceWalletSet.has(recipient)) return;

    const deposited = readU64(
      accountData,
      STREAMFLOW_LOCK_ACCOUNT_OFFSETS.depositedAmount,
    );
    const withdrawn = readU64(
      accountData,
      STREAMFLOW_LOCK_ACCOUNT_OFFSETS.withdrawnAmount,
    );
    const remaining = deposited > withdrawn ? deposited - withdrawn : BigInt(0);
    if (remaining <= BigInt(0)) return;

    amountAtomic += remaining;
    creditedContracts.push(contractIds[index]);
  });

  return {
    amountAtomic: amountAtomic.toString(),
    contractCount: creditedContracts.length,
    contracts: creditedContracts,
    holderPercent: totalSupplyRaw
      ? percentOfSupply(amountAtomic, totalSupplyRaw)
      : 0,
    sourceUrl: BEARCO_STREAMFLOW_DASHBOARD_URL,
    sourceWallets,
    uiAmountString: atomicToDecimalString(amountAtomic, decimals),
    updatedAt: new Date().toISOString(),
  };
}
