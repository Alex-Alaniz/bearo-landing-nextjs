import {
  BEARCO_MINT_ADDRESS,
  formatTokenAmount,
  isValidSolanaAddress,
} from "./bearco";
import {
  getSupabaseServiceClient,
  listBearcoHolderLeaderboard,
} from "./bearco-server";

const HELIUS_RPC_URL = "https://mainnet.helius-rpc.com/";
const HELIUS_WALLET_API_URL = "https://api.helius.xyz/v1/wallet";
const DEFAULT_RADAR_LIMIT = 50;
const MAX_RADAR_LIMIT = 100;
const DEFAULT_REFRESH_HOLDER_LIMIT = 250;
const DEFAULT_EVENT_WALLET_LIMIT = 25;
const TRANSFER_HISTORY_LIMIT = 50;
const BEARCO_DECIMALS_FALLBACK = 6;

export type BearcoHolderRadarAction =
  | "buy"
  | "sell"
  | "transfer_in"
  | "transfer_out";

export type BearcoHolderRadarPnlStatus =
  | "estimated"
  | "needs_price_source"
  | "unavailable";

export interface BearcoHolderRadarIdentity {
  authenticatedAt: string | null;
  displayName: string | null;
  username: string | null;
}

export interface BearcoHolderRadarEntry {
  airdropMultiplier: number;
  airdropWatchScore: number;
  balanceAtomic: string;
  balanceUi: string;
  buyCount: number;
  displayName: string | null;
  firstSeenAt: string | null;
  holderPercent: number;
  holdingAgeDays: number;
  isClaimed: boolean;
  lastAction: BearcoHolderRadarAction | null;
  lastActionAt: string | null;
  pnlStatus: BearcoHolderRadarPnlStatus;
  rank: number;
  realizedPnlUsd: number | null;
  sellCount: number;
  socials: {
    discord: BearcoHolderRadarIdentity;
    telegram: BearcoHolderRadarIdentity;
    x: BearcoHolderRadarIdentity;
  };
  sparkline: number[];
  transferCount: number;
  unrealizedPnlUsd: number | null;
  updatedAt: string;
  walletAddress: string;
}

export interface BearcoHolderRadarEvent {
  actionType: BearcoHolderRadarAction;
  amountAtomic: string;
  amountUi: string;
  blockTime: string | null;
  counterparty: string | null;
  pnlUsd: number | null;
  quoteAmount: string | null;
  quoteSymbol: string | null;
  quoteUsd: number | null;
  signature: string;
  slot: number | null;
  sourceProvider: string;
  walletAddress: string;
}

export interface BearcoHolderRadarList {
  entries: BearcoHolderRadarEntry[];
  nextCursor: string | null;
  source: "snapshot" | "claimed-profile-fallback";
  storageReady: boolean;
  total: number;
  updatedAt: string;
}

export interface BearcoHistoricalBalanceAt {
  asOf: {
    blockTime: number | null;
    signature: string;
    slot: number;
  } | null;
  balance: string;
  balanceRaw: string;
  decimals: number;
  requested: {
    datetime?: string | null;
    slot?: number | null;
    time?: number | null;
  };
}

export interface BearcoHolderRadarRefreshResult {
  eventWalletsSynced: number;
  holderRowsSynced: number;
  message: string;
  refreshedAt: string;
  storageReady: boolean;
  transferRowsSynced: number;
}

interface HeliusRpcResponse<T> {
  error?: { code?: number; message?: string };
  result?: T;
}

interface HeliusTokenSupplyResult {
  value: {
    amount: string;
    decimals: number;
    uiAmountString?: string;
  };
}

interface HeliusTokenAccount {
  address?: string;
  amount?: number | string;
  mint?: string;
  owner?: string;
}

interface HeliusTokenAccountsResult {
  cursor?: string | null;
  last_indexed_slot?: number;
  limit?: number;
  token_accounts?: HeliusTokenAccount[];
  total?: number;
}

interface HeliusTransferRow {
  amount?: number | string;
  blockTime?: number;
  confirmationStatus?: string;
  decimals?: number;
  fromUserAccount?: string | null;
  innerInstructionIdx?: number | null;
  instructionIdx?: number | null;
  mint?: string;
  paginationToken?: string;
  signature?: string;
  slot?: number;
  toUserAccount?: string | null;
  transactionIdx?: number | null;
  type?: string;
  uiAmount?: number | string;
}

interface HeliusTransfersResult {
  data?: HeliusTransferRow[];
  paginationToken?: string | null;
}

interface HolderSnapshotRow {
  balance_atomic: string | number;
  balance_ui: string | number;
  first_seen_at: string | null;
  holder_percent: string | number;
  last_seen_at: string | null;
  rank: number | null;
  refreshed_at: string;
  source_slot: number | null;
  wallet_address: string;
}

interface HolderStatsRow {
  airdrop_multiplier: string | number | null;
  airdrop_watch_score: string | number | null;
  buy_count: number | null;
  holding_age_days: number | null;
  last_action_at: string | null;
  last_action_type: BearcoHolderRadarAction | null;
  pnl_status: BearcoHolderRadarPnlStatus | null;
  realized_pnl_usd: string | number | null;
  sell_count: number | null;
  sparkline: number[] | null;
  transfer_count: number | null;
  unrealized_pnl_usd: string | number | null;
  wallet_address: string;
}

interface HolderEventRow {
  action_type: BearcoHolderRadarAction;
  amount_atomic: string | number;
  amount_ui: string | number;
  block_time: string | null;
  counterparty: string | null;
  pnl_usd: string | number | null;
  quote_amount: string | null;
  quote_symbol: string | null;
  quote_usd: string | number | null;
  slot: number | null;
  source_provider: string;
  tx_signature: string;
  wallet_address: string;
}

interface HolderProfileOverlay {
  displayName: string | null;
  isClaimed: boolean;
  socials: BearcoHolderRadarEntry["socials"];
}

type SupabaseServiceClient = NonNullable<
  ReturnType<typeof getSupabaseServiceClient>
>;

function emptyIdentity(): BearcoHolderRadarIdentity {
  return {
    authenticatedAt: null,
    displayName: null,
    username: null,
  };
}

function emptySocials(): BearcoHolderRadarEntry["socials"] {
  return {
    discord: emptyIdentity(),
    telegram: emptyIdentity(),
    x: emptyIdentity(),
  };
}

function getHeliusApiKey(): string | null {
  return process.env.HELIUS_API_KEY?.trim() || null;
}

function safeLimit(value: number | string | null | undefined): number {
  const numeric = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(numeric)) return DEFAULT_RADAR_LIMIT;
  return Math.min(Math.max(Math.trunc(numeric || 0), 1), MAX_RADAR_LIMIT);
}

function safeOffset(value: string | null | undefined): number {
  if (!value) return 0;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? Math.trunc(numeric) : 0;
}

function numericValue(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function nullableNumericValue(
  value: string | number | null | undefined,
): number | null {
  if (value === null || value === undefined) return null;
  const numeric = numericValue(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function amountToBigInt(value: string | number | undefined): bigint {
  if (typeof value === "number") return BigInt(Math.trunc(value));
  if (typeof value === "string" && /^\d+$/.test(value)) return BigInt(value);
  return BigInt(0);
}

function decimalFromAtomic(amount: bigint, decimals: number): string {
  if (decimals <= 0) return amount.toString();
  const raw = amount.toString().padStart(decimals + 1, "0");
  const whole = raw.slice(0, -decimals) || "0";
  const fraction = raw.slice(-decimals).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

function percentOfSupply(balance: bigint, supply: bigint): number {
  if (supply <= BigInt(0)) return 0;
  const scaled = (balance * BigInt(100000000)) / supply;
  return Number(scaled) / 1_000_000;
}

function actionLabelFromTransfer(
  transfer: HeliusTransferRow,
  walletAddress: string,
): BearcoHolderRadarAction {
  if (transfer.toUserAccount === walletAddress) return "transfer_in";
  if (transfer.fromUserAccount === walletAddress) return "transfer_out";
  return "transfer_in";
}

function isoFromBlockTime(blockTime: number | undefined): string | null {
  if (!blockTime || !Number.isFinite(blockTime)) return null;
  return new Date(blockTime * 1000).toISOString();
}

function ageDaysFromDate(value: string | null): number {
  if (!value) return 0;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return 0;
  return Math.max(0, Math.floor((Date.now() - time) / 86_400_000));
}

export function getBearcoAirdropMultiplier(holdingAgeDays: number): number {
  if (holdingAgeDays >= 180) return 2;
  if (holdingAgeDays >= 90) return 1.75;
  if (holdingAgeDays >= 30) return 1.5;
  if (holdingAgeDays >= 7) return 1.25;
  return 1;
}

export function getBearcoAirdropWatchScore(input: {
  holderPercent: number;
  holdingAgeDays: number;
  isClaimed: boolean;
  isHolding: boolean;
}): number {
  if (!input.isHolding || input.holderPercent <= 0) return 0;

  const holdingComponent = Math.min(input.holdingAgeDays / 180, 1) * 35;
  const balanceComponent = Math.min(input.holderPercent / 10, 1) * 55;
  const claimComponent = input.isClaimed ? 10 : 0;
  return Math.round(holdingComponent + balanceComponent + claimComponent);
}

function generateSparkline(events: BearcoHolderRadarEvent[]): number[] {
  if (events.length === 0) return [42, 42, 42, 42, 42, 42, 42];

  const newestFirst = events.slice(0, 7);
  const values = newestFirst
    .map((event, index) => {
      const amount = numericValue(event.amountUi);
      const direction =
        event.actionType === "transfer_out" || event.actionType === "sell"
          ? -1
          : 1;
      return 42 + direction * Math.min(amount / 100000, 28) + index * 1.7;
    })
    .reverse();

  while (values.length < 7) values.unshift(values[0] ?? 42);
  return values.map((value) => Math.max(8, Math.min(92, Math.round(value))));
}

async function heliusRpc<T>(
  method: string,
  params?: Record<string, unknown> | unknown[],
): Promise<T> {
  const apiKey = getHeliusApiKey();
  if (!apiKey) throw new Error("HELIUS_API_KEY is not configured.");

  const url = new URL(HELIUS_RPC_URL);
  url.searchParams.set("api-key", apiKey);

  const response = await fetch(url.toString(), {
    body: JSON.stringify({
      id: `bearco-radar-${method}`,
      jsonrpc: "2.0",
      method,
      ...(params === undefined ? {} : { params }),
    }),
    cache: "no-store",
    headers: { "content-type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(
      () => null,
    )) as HeliusRpcResponse<T> | null;
    const detail = payload?.error?.message ? `: ${payload.error.message}` : "";
    throw new Error(`Helius RPC failed with HTTP ${response.status}${detail}`);
  }

  const payload = (await response.json()) as HeliusRpcResponse<T>;
  if (payload.error) {
    throw new Error(payload.error.message || "Helius RPC returned an error.");
  }
  if (!payload.result) throw new Error("Helius RPC returned no result.");
  return payload.result;
}

async function fetchHeliusTokenSupply(): Promise<HeliusTokenSupplyResult> {
  return heliusRpc<HeliusTokenSupplyResult>("getTokenSupply", [
    BEARCO_MINT_ADDRESS,
  ]);
}

async function fetchHeliusTokenAccountsByMint(
  maxHolders: number,
): Promise<{
  accounts: HeliusTokenAccount[];
  lastIndexedSlot: number | null;
}> {
  const accounts: HeliusTokenAccount[] = [];
  let cursor: string | undefined;
  let lastIndexedSlot: number | null = null;

  while (accounts.length < maxHolders) {
    const result = await heliusRpc<HeliusTokenAccountsResult>(
      "getTokenAccounts",
      {
        cursor,
        limit: Math.min(1000, Math.max(maxHolders - accounts.length, 1)),
        mint: BEARCO_MINT_ADDRESS,
        options: { showZeroBalance: false },
      },
    );

    accounts.push(...(result.token_accounts || []));
    lastIndexedSlot = result.last_indexed_slot ?? lastIndexedSlot;
    if (!result.cursor || result.token_accounts?.length === 0) break;
    cursor = result.cursor;
  }

  return { accounts, lastIndexedSlot };
}

async function fetchHeliusTransfers(
  walletAddress: string,
): Promise<HeliusTransferRow[]> {
  const result = await heliusRpc<HeliusTransfersResult>(
    "getTransfersByAddress",
    [
      walletAddress,
      {
        limit: TRANSFER_HISTORY_LIMIT,
        mint: BEARCO_MINT_ADDRESS,
        sortOrder: "desc",
      },
    ],
  );

  return result.data || [];
}

export async function getBearcoHistoricalBalanceAt(input: {
  datetime?: string;
  slot?: number;
  time?: number;
  walletAddress: string;
}): Promise<BearcoHistoricalBalanceAt> {
  const apiKey = getHeliusApiKey();
  if (!apiKey) throw new Error("HELIUS_API_KEY is not configured.");
  if (!isValidSolanaAddress(input.walletAddress)) {
    throw new Error("Invalid Solana wallet address.");
  }

  const url = new URL(
    `${HELIUS_WALLET_API_URL}/${encodeURIComponent(input.walletAddress)}/balance-at`,
  );
  url.searchParams.set("api-key", apiKey);
  url.searchParams.set("mint", BEARCO_MINT_ADDRESS);
  if (input.slot !== undefined) url.searchParams.set("slot", String(input.slot));
  if (input.time !== undefined) url.searchParams.set("time", String(input.time));
  if (input.datetime) url.searchParams.set("datetime", input.datetime);

  const pointCount = [input.slot, input.time, input.datetime].filter(
    (value) => value !== undefined,
  ).length;
  if (pointCount !== 1) {
    throw new Error("Historical balance requires exactly one time, datetime, or slot.");
  }

  const response = await fetch(url.toString(), { cache: "force-cache" });
  if (!response.ok) {
    throw new Error(`Helius balance-at failed with HTTP ${response.status}`);
  }

  return (await response.json()) as BearcoHistoricalBalanceAt;
}

async function estimateHoldingAgeFromBalanceAt(
  walletAddress: string,
): Promise<number> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const checkpoints = [180, 90, 30, 7];

  for (const days of checkpoints) {
    const balance = await getBearcoHistoricalBalanceAt({
      time: nowSeconds - days * 86_400,
      walletAddress,
    }).catch(() => null);
    if (balance && amountToBigInt(balance.balanceRaw) > BigInt(0)) {
      return days;
    }
  }

  return 0;
}

async function loadProfileOverlays(
  supabase: SupabaseServiceClient,
  walletAddresses: string[],
): Promise<Map<string, HolderProfileOverlay>> {
  const overlays = new Map<string, HolderProfileOverlay>();
  if (walletAddresses.length === 0) return overlays;

  const claims = await supabase
    .from("bearco_wallet_claims")
    .select("wallet_address, profile_id")
    .in("wallet_address", walletAddresses);

  if (claims.error || !claims.data?.length) return overlays;

  const claimRows = claims.data as Array<{
    profile_id: string | null;
    wallet_address: string;
  }>;
  const profileIds = [
    ...new Set(
      claimRows
        .map((row) => row.profile_id)
        .filter((profileId): profileId is string => Boolean(profileId)),
    ),
  ];
  if (profileIds.length === 0) return overlays;

  const [profiles, socials] = await Promise.all([
    supabase
      .from("bearco_profiles")
      .select("id, display_name")
      .in("id", profileIds),
    supabase
      .from("bearco_social_identities")
      .select("profile_id, provider, username, display_name, authenticated_at")
      .in("profile_id", profileIds),
  ]);

  if (profiles.error || socials.error) return overlays;

  const profilesById = new Map(
    ((profiles.data || []) as Array<{
      display_name: string | null;
      id: string;
    }>).map((profile) => [profile.id, profile.display_name]),
  );
  const socialsByProfileId = new Map<
    string,
    BearcoHolderRadarEntry["socials"]
  >();

  for (const social of (socials.data || []) as Array<{
    authenticated_at: string | null;
    display_name: string | null;
    profile_id: string;
    provider: "x" | "telegram" | "discord";
    username: string | null;
  }>) {
    const current = socialsByProfileId.get(social.profile_id) || emptySocials();
    current[social.provider] = {
      authenticatedAt: social.authenticated_at,
      displayName: social.display_name,
      username: social.username,
    };
    socialsByProfileId.set(social.profile_id, current);
  }

  for (const claim of claimRows) {
    if (!claim.profile_id) continue;
    overlays.set(claim.wallet_address, {
      displayName: profilesById.get(claim.profile_id) || null,
      isClaimed: true,
      socials: socialsByProfileId.get(claim.profile_id) || emptySocials(),
    });
  }

  return overlays;
}

function entryFromRows(
  snapshot: HolderSnapshotRow,
  stats: HolderStatsRow | null,
  overlay: HolderProfileOverlay | null,
): BearcoHolderRadarEntry {
  const holdingAgeDays =
    stats?.holding_age_days ?? ageDaysFromDate(snapshot.first_seen_at);
  const holderPercent = numericValue(snapshot.holder_percent);
  const isClaimed = overlay?.isClaimed || false;
  const multiplier =
    nullableNumericValue(stats?.airdrop_multiplier) ??
    getBearcoAirdropMultiplier(holdingAgeDays);
  const score =
    nullableNumericValue(stats?.airdrop_watch_score) ??
    getBearcoAirdropWatchScore({
      holderPercent,
      holdingAgeDays,
      isClaimed,
      isHolding: numericValue(snapshot.balance_ui) > 0,
    });

  return {
    airdropMultiplier: multiplier,
    airdropWatchScore: score,
    balanceAtomic: String(snapshot.balance_atomic || "0"),
    balanceUi: String(snapshot.balance_ui || "0"),
    buyCount: stats?.buy_count ?? 0,
    displayName: overlay?.displayName || null,
    firstSeenAt: snapshot.first_seen_at,
    holderPercent,
    holdingAgeDays,
    isClaimed,
    lastAction: stats?.last_action_type || null,
    lastActionAt: stats?.last_action_at || null,
    pnlStatus: stats?.pnl_status || "needs_price_source",
    rank: snapshot.rank || 0,
    realizedPnlUsd: nullableNumericValue(stats?.realized_pnl_usd),
    sellCount: stats?.sell_count ?? 0,
    socials: overlay?.socials || emptySocials(),
    sparkline: stats?.sparkline || [42, 42, 42, 42, 42, 42, 42],
    transferCount: stats?.transfer_count ?? 0,
    unrealizedPnlUsd: nullableNumericValue(stats?.unrealized_pnl_usd),
    updatedAt: snapshot.refreshed_at,
    walletAddress: snapshot.wallet_address,
  };
}

function eventFromRow(row: HolderEventRow): BearcoHolderRadarEvent {
  return {
    actionType: row.action_type,
    amountAtomic: String(row.amount_atomic || "0"),
    amountUi: String(row.amount_ui || "0"),
    blockTime: row.block_time,
    counterparty: row.counterparty,
    pnlUsd: nullableNumericValue(row.pnl_usd),
    quoteAmount: row.quote_amount,
    quoteSymbol: row.quote_symbol,
    quoteUsd: nullableNumericValue(row.quote_usd),
    signature: row.tx_signature,
    slot: row.slot,
    sourceProvider: row.source_provider,
    walletAddress: row.wallet_address,
  };
}

async function fallbackFromClaimedProfiles(
  limit: number,
): Promise<BearcoHolderRadarList> {
  const leaderboard = await listBearcoHolderLeaderboard(limit);
  return {
    entries: leaderboard.entries.map((entry) => {
      const holdingAgeDays = ageDaysFromDate(entry.claimedAt);
      return {
        airdropMultiplier: getBearcoAirdropMultiplier(holdingAgeDays),
        airdropWatchScore: getBearcoAirdropWatchScore({
          holderPercent: entry.holderPercent,
          holdingAgeDays,
          isClaimed: true,
          isHolding: numericValue(entry.tokenBalance) > 0,
        }),
        balanceAtomic: "0",
        balanceUi: entry.tokenBalance || "0",
        buyCount: 0,
        displayName: entry.displayName,
        firstSeenAt: entry.claimedAt,
        holderPercent: entry.holderPercent,
        holdingAgeDays,
        isClaimed: true,
        lastAction: null,
        lastActionAt: null,
        pnlStatus: "needs_price_source",
        rank: entry.rank,
        realizedPnlUsd: null,
        sellCount: 0,
        socials: entry.socials,
        sparkline: [42, 42, 42, 42, 42, 42, 42],
        transferCount: 0,
        unrealizedPnlUsd: null,
        updatedAt: entry.updatedAt,
        walletAddress: entry.walletAddress,
      };
    }),
    nextCursor: null,
    source: "claimed-profile-fallback",
    storageReady: leaderboard.storageReady,
    total: leaderboard.entries.length,
    updatedAt: leaderboard.updatedAt,
  };
}

export async function listBearcoHolderRadar(input: {
  cursor?: string | null;
  limit?: number | string | null;
} = {}): Promise<BearcoHolderRadarList> {
  const supabase = getSupabaseServiceClient();
  const limit = safeLimit(input.limit);
  if (!supabase) return fallbackFromClaimedProfiles(limit);

  const offset = safeOffset(input.cursor);
  const snapshots = await supabase
    .from("bearco_holder_snapshots")
    .select(
      "wallet_address, rank, balance_atomic, balance_ui, holder_percent, first_seen_at, last_seen_at, source_slot, refreshed_at",
      { count: "exact" },
    )
    .order("holder_percent", { ascending: false })
    .range(offset, offset + limit - 1);

  if (snapshots.error) return fallbackFromClaimedProfiles(limit);

  const snapshotRows = (snapshots.data || []) as HolderSnapshotRow[];
  if (snapshotRows.length === 0) return fallbackFromClaimedProfiles(limit);

  const walletAddresses = snapshotRows.map((row) => row.wallet_address);
  const [stats, overlays] = await Promise.all([
    supabase
      .from("bearco_holder_stats")
      .select(
        "wallet_address, buy_count, sell_count, transfer_count, realized_pnl_usd, unrealized_pnl_usd, pnl_status, last_action_type, last_action_at, holding_age_days, airdrop_watch_score, airdrop_multiplier, sparkline",
      )
      .in("wallet_address", walletAddresses),
    loadProfileOverlays(supabase, walletAddresses),
  ]);

  const statsByWallet = new Map(
    ((stats.error ? [] : stats.data || []) as HolderStatsRow[]).map((row) => [
      row.wallet_address,
      row,
    ]),
  );

  const total = snapshots.count ?? offset + snapshotRows.length;
  const nextOffset = offset + snapshotRows.length;

  return {
    entries: snapshotRows.map((row) =>
      entryFromRows(row, statsByWallet.get(row.wallet_address) || null, overlays.get(row.wallet_address) || null),
    ),
    nextCursor: nextOffset < total ? String(nextOffset) : null,
    source: "snapshot",
    storageReady: true,
    total,
    updatedAt: new Date().toISOString(),
  };
}

export async function getBearcoHolderRadarEvents(input: {
  limit?: number | string | null;
  walletAddress: string;
}): Promise<{ events: BearcoHolderRadarEvent[]; storageReady: boolean }> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return { events: [], storageReady: false };

  const walletAddress = input.walletAddress.trim();
  if (!isValidSolanaAddress(walletAddress)) {
    return { events: [], storageReady: false };
  }

  const limit = safeLimit(input.limit);
  const events = await supabase
    .from("bearco_holder_events")
    .select(
      "wallet_address, tx_signature, block_time, slot, action_type, amount_atomic, amount_ui, quote_symbol, quote_amount, quote_usd, pnl_usd, counterparty, source_provider",
    )
    .eq("wallet_address", walletAddress)
    .order("block_time", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (events.error) return { events: [], storageReady: false };

  return {
    events: ((events.data || []) as HolderEventRow[]).map(eventFromRow),
    storageReady: true,
  };
}

export async function getBearcoHolderRadarWallet(walletAddress: string): Promise<{
  entry: BearcoHolderRadarEntry | null;
  events: BearcoHolderRadarEvent[];
  storageReady: boolean;
}> {
  const supabase = getSupabaseServiceClient();
  const normalizedWallet = walletAddress.trim();
  if (!supabase || !isValidSolanaAddress(normalizedWallet)) {
    return { entry: null, events: [], storageReady: false };
  }

  const [snapshot, events] = await Promise.all([
    supabase
      .from("bearco_holder_snapshots")
      .select(
        "wallet_address, rank, balance_atomic, balance_ui, holder_percent, first_seen_at, last_seen_at, source_slot, refreshed_at",
      )
      .eq("wallet_address", normalizedWallet)
      .maybeSingle(),
    getBearcoHolderRadarEvents({ limit: 50, walletAddress: normalizedWallet }),
  ]);

  if (snapshot.error || !snapshot.data) {
    return {
      entry: null,
      events: events.events,
      storageReady: !snapshot.error && events.storageReady,
    };
  }

  const [stats, overlays] = await Promise.all([
    supabase
      .from("bearco_holder_stats")
      .select(
        "wallet_address, buy_count, sell_count, transfer_count, realized_pnl_usd, unrealized_pnl_usd, pnl_status, last_action_type, last_action_at, holding_age_days, airdrop_watch_score, airdrop_multiplier, sparkline",
      )
      .eq("wallet_address", normalizedWallet)
      .maybeSingle(),
    loadProfileOverlays(supabase, [normalizedWallet]),
  ]);

  return {
    entry: entryFromRows(
      snapshot.data as HolderSnapshotRow,
      stats.error ? null : (stats.data as HolderStatsRow | null),
      overlays.get(normalizedWallet) || null,
    ),
    events: events.events,
    storageReady: true,
  };
}

function transferEventFromHelius(
  transfer: HeliusTransferRow,
  walletAddress: string,
): BearcoHolderRadarEvent | null {
  if (!transfer.signature || transfer.mint !== BEARCO_MINT_ADDRESS) return null;

  const actionType = actionLabelFromTransfer(transfer, walletAddress);
  const counterparty =
    actionType === "transfer_in"
      ? transfer.fromUserAccount || null
      : transfer.toUserAccount || null;
  const amountAtomic = String(transfer.amount || "0");
  const amountUi =
    typeof transfer.uiAmount === "string"
      ? transfer.uiAmount
      : typeof transfer.uiAmount === "number"
        ? String(transfer.uiAmount)
        : decimalFromAtomic(amountToBigInt(amountAtomic), transfer.decimals ?? BEARCO_DECIMALS_FALLBACK);

  return {
    actionType,
    amountAtomic,
    amountUi,
    blockTime: isoFromBlockTime(transfer.blockTime),
    counterparty,
    pnlUsd: null,
    quoteAmount: null,
    quoteSymbol: null,
    quoteUsd: null,
    signature: transfer.signature,
    slot: transfer.slot ?? null,
    sourceProvider: "helius.getTransfersByAddress",
    walletAddress,
  };
}

function statsPayloadForWallet(input: {
  events: BearcoHolderRadarEvent[];
  holderPercent: number;
  isClaimed: boolean;
  snapshotFirstSeenAt: string | null;
  walletAddress: string;
}): Record<string, unknown> {
  const firstEventAt =
    input.events
      .map((event) => event.blockTime)
      .filter((value): value is string => Boolean(value))
      .sort()[0] || null;
  const firstSeenAt = input.snapshotFirstSeenAt || firstEventAt;
  const holdingAgeDays = ageDaysFromDate(firstSeenAt);
  const transferCount = input.events.filter((event) =>
    event.actionType.startsWith("transfer"),
  ).length;
  const buyCount = input.events.filter((event) => event.actionType === "buy").length;
  const sellCount = input.events.filter((event) => event.actionType === "sell").length;
  const airdropMultiplier = getBearcoAirdropMultiplier(holdingAgeDays);
  const airdropWatchScore = getBearcoAirdropWatchScore({
    holderPercent: input.holderPercent,
    holdingAgeDays,
    isClaimed: input.isClaimed,
    isHolding: input.holderPercent > 0,
  });
  const lastEvent = input.events[0] || null;

  return {
    airdrop_multiplier: airdropMultiplier,
    airdrop_watch_score: airdropWatchScore,
    buy_count: buyCount,
    holding_age_days: holdingAgeDays,
    last_action_at: lastEvent?.blockTime || null,
    last_action_type: lastEvent?.actionType || null,
    pnl_status: "needs_price_source",
    realized_pnl_usd: null,
    sell_count: sellCount,
    sparkline: generateSparkline(input.events),
    transfer_count: transferCount,
    unrealized_pnl_usd: null,
    updated_at: new Date().toISOString(),
    wallet_address: input.walletAddress,
  };
}

export async function refreshBearcoHolderRadar(input: {
  eventWalletLimit?: number;
  holderLimit?: number;
} = {}): Promise<BearcoHolderRadarRefreshResult> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return {
      eventWalletsSynced: 0,
      holderRowsSynced: 0,
      message: "Supabase service credentials are not configured.",
      refreshedAt: new Date().toISOString(),
      storageReady: false,
      transferRowsSynced: 0,
    };
  }

  const holderLimit =
    input.holderLimit || Number(process.env.BEARCO_RADAR_REFRESH_LIMIT) || DEFAULT_REFRESH_HOLDER_LIMIT;
  const eventWalletLimit =
    input.eventWalletLimit ||
    Number(process.env.BEARCO_RADAR_EVENT_WALLET_LIMIT) ||
    DEFAULT_EVENT_WALLET_LIMIT;
  const refreshedAt = new Date().toISOString();
  const [supply, tokenAccounts] = await Promise.all([
    fetchHeliusTokenSupply(),
    fetchHeliusTokenAccountsByMint(holderLimit),
  ]);

  const decimals = supply.value.decimals ?? BEARCO_DECIMALS_FALLBACK;
  const supplyAtomic = amountToBigInt(supply.value.amount);
  const balancesByOwner = new Map<string, bigint>();

  for (const account of tokenAccounts.accounts) {
    if (!account.owner || !isValidSolanaAddress(account.owner)) continue;
    const amount = amountToBigInt(account.amount);
    if (amount <= BigInt(0)) continue;
    balancesByOwner.set(account.owner, (balancesByOwner.get(account.owner) || BigInt(0)) + amount);
  }

  const holderRows = [...balancesByOwner.entries()]
    .sort((left, right) => (right[1] > left[1] ? 1 : right[1] < left[1] ? -1 : 0))
    .slice(0, holderLimit)
    .map(([walletAddress, amount], index) => ({
      balance_atomic: amount.toString(),
      balance_ui: decimalFromAtomic(amount, decimals),
      first_seen_at: null,
      holder_percent: percentOfSupply(amount, supplyAtomic),
      last_seen_at: refreshedAt,
      rank: index + 1,
      refreshed_at: refreshedAt,
      source: "helius.getTokenAccounts",
      source_slot: tokenAccounts.lastIndexedSlot,
      updated_at: refreshedAt,
      wallet_address: walletAddress,
    }));

  if (holderRows.length > 0) {
    const { error } = await supabase
      .from("bearco_holder_snapshots")
      .upsert(holderRows, { onConflict: "wallet_address" });
    if (error) {
      return {
        eventWalletsSynced: 0,
        holderRowsSynced: 0,
        message: "Holder Radar storage is not ready. Apply supabase/bearco_holder_radar.sql.",
        refreshedAt,
        storageReady: false,
        transferRowsSynced: 0,
      };
    }
  }

  const eventWallets = holderRows.slice(0, eventWalletLimit);
  const overlays = await loadProfileOverlays(
    supabase,
    eventWallets.map((row) => row.wallet_address),
  );
  let transferRowsSynced = 0;

  for (const holder of eventWallets) {
    const transfers = await fetchHeliusTransfers(holder.wallet_address).catch(
      () => [],
    );
    const events = transfers
      .map((transfer) => transferEventFromHelius(transfer, holder.wallet_address))
      .filter((event): event is BearcoHolderRadarEvent => Boolean(event));
    const checkpointAge = await estimateHoldingAgeFromBalanceAt(
      holder.wallet_address,
    ).catch(() => 0);
    const firstSeenAt =
      checkpointAge > 0
        ? new Date(Date.now() - checkpointAge * 86_400_000).toISOString()
        : events
            .map((event) => event.blockTime)
            .filter((value): value is string => Boolean(value))
            .sort()[0] || null;

    if (firstSeenAt) {
      await supabase
        .from("bearco_holder_snapshots")
        .update({ first_seen_at: firstSeenAt, updated_at: refreshedAt })
        .eq("wallet_address", holder.wallet_address);
    }

    const eventRows = events.map((event, index) => ({
      action_type: event.actionType,
      amount_atomic: event.amountAtomic,
      amount_ui: event.amountUi,
      block_time: event.blockTime,
      counterparty: event.counterparty,
      event_index: index,
      pnl_usd: event.pnlUsd,
      quote_amount: event.quoteAmount,
      quote_symbol: event.quoteSymbol,
      quote_usd: event.quoteUsd,
      slot: event.slot,
      source_provider: event.sourceProvider,
      tx_signature: event.signature,
      updated_at: refreshedAt,
      wallet_address: event.walletAddress,
    }));

    if (eventRows.length > 0) {
      const writeEvents = await supabase
        .from("bearco_holder_events")
        .upsert(eventRows, {
          onConflict: "wallet_address,tx_signature,action_type,event_index",
        });
      if (!writeEvents.error) transferRowsSynced += eventRows.length;
    }

    await supabase.from("bearco_holder_stats").upsert(
      statsPayloadForWallet({
        events,
        holderPercent: holder.holder_percent,
        isClaimed: overlays.get(holder.wallet_address)?.isClaimed || false,
        snapshotFirstSeenAt: firstSeenAt,
        walletAddress: holder.wallet_address,
      }),
      { onConflict: "wallet_address" },
    );
  }

  return {
    eventWalletsSynced: eventWallets.length,
    holderRowsSynced: holderRows.length,
    message: "Holder Radar refresh complete.",
    refreshedAt,
    storageReady: true,
    transferRowsSynced,
  };
}

export function formatRadarCurrency(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "pending";
  const sign = value > 0 ? "+" : "";
  return `${sign}${new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value)}`;
}

export function formatRadarTokenAmount(value: string): string {
  return formatTokenAmount(value);
}
