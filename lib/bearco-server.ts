import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import {
  BEARCO_MINT_ADDRESS,
  BEARCO_PUMPSWAP_LP_MINT,
  BEARCO_PUMPSWAP_POOL,
  DEFAULT_SOLANA_RPC_URL,
  getHighestHolderTier,
  getUnlockedHolderTiers,
  isValidSolanaAddress,
} from "./bearco";
import { getBearcoStreamflowLockCreditForWallet } from "./bearco-streamflow";

interface SolanaRpcResponse<T> {
  error?: { code: number; message: string };
  result?: T;
}

class SolanaRpcError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "SolanaRpcError";
    this.status = status;
  }
}

interface TokenSupplyResult {
  value: {
    amount: string;
    decimals: number;
    uiAmountString?: string;
  };
}

interface TokenAccountResult {
  value: Array<{
    account: {
      data: {
        parsed?: {
          info?: {
            tokenAmount?: {
              amount?: string;
            };
          };
        };
      };
    };
  }>;
}

interface RpcAccountInfoResult {
  value: Array<{
    data: [string, string];
    executable: boolean;
    lamports: number;
    owner: string;
    rentEpoch?: number;
    space?: number;
  } | null>;
}

interface CacheEntry<T> {
  expiresAt: number;
  staleUntil: number;
  value: T;
}

export interface StoredHolderProfile {
  profile_id?: string | null;
  wallet_address: string;
  display_name: string | null;
  profile_slug: string | null;
  x_username: string | null;
  x_user_id?: string | null;
  x_display_name?: string | null;
  x_authenticated_at?: string | null;
  telegram_username: string | null;
  telegram_user_id?: string | null;
  telegram_display_name?: string | null;
  telegram_authenticated_at?: string | null;
  discord_user_id?: string | null;
  discord_username?: string | null;
  discord_display_name?: string | null;
  discord_authenticated_at?: string | null;
  holder_percent_snapshot: number | null;
  token_balance_snapshot: string | null;
  lp_token_balance_atomic_snapshot?: string | null;
  lp_token_balance_snapshot?: string | null;
  lp_token_account?: string | null;
  lp_snapshot_signature?: string | null;
  lp_snapshot_at?: string | null;
  claimed_at: string;
  social_claimed_at: string | null;
  updated_at: string;
}

export interface BearcoHolderProfile {
  walletAddress: string;
  mintAddress: string;
  balance: {
    amountAtomic: string;
    uiAmountString: string;
  };
  effectiveBalance: {
    amountAtomic: string;
    holderPercent: number;
    uiAmountString: string;
  };
  liquidHolderPercent: number;
  lockedBalance: {
    amountAtomic: string;
    contractCount: number;
    holderPercent: number;
    sourceUrl: string;
    sourceWallets: string[];
    uiAmountString: string;
  };
  supply: {
    amountAtomic: string;
    decimals: number;
    uiAmountString: string;
  };
  holderPercent: number;
  unlockedTiers: ReturnType<typeof getUnlockedHolderTiers>;
  highestTier: ReturnType<typeof getHighestHolderTier>;
  profile: StoredHolderProfile | null;
  updatedAt: string;
}

export interface BearcoPumpSwapReadiness {
  poolAddress: string;
  lpMintAddress: string;
  poolExists: boolean;
  poolOwner: string | null;
  lpMintExists: boolean;
  lpMintOwner: string | null;
  updatedAt: string;
}

export interface BearcoHolderFeedback {
  id: string;
  profile_id?: string | null;
  wallet_address: string;
  display_name_snapshot: string | null;
  x_username_snapshot: string | null;
  telegram_username_snapshot: string | null;
  discord_username_snapshot?: string | null;
  holder_percent_snapshot: number;
  category: string;
  message: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface BearcoHolderLeaderboardIdentity {
  authenticatedAt: string | null;
  displayName: string | null;
  username: string | null;
}

export interface BearcoHolderLeaderboardEntry {
  claimedAt: string;
  displayName: string | null;
  highestTier: ReturnType<typeof getHighestHolderTier>;
  holderPercent: number;
  rank: number;
  socials: {
    discord: BearcoHolderLeaderboardIdentity;
    telegram: BearcoHolderLeaderboardIdentity;
    x: BearcoHolderLeaderboardIdentity;
  };
  tokenBalance: string | null;
  updatedAt: string;
  walletAddress: string;
}

const TOKEN_SUPPLY_CACHE_TTL_MS = 2 * 60 * 1000;
const TOKEN_ACCOUNTS_CACHE_TTL_MS = 30 * 1000;
const RPC_STALE_TTL_MS = 10 * 60 * 1000;

const tokenSupplyCache = new Map<string, CacheEntry<TokenSupplyResult>>();
const tokenAccountsCache = new Map<string, CacheEntry<TokenAccountResult>>();
const pumpSwapReadinessCache = new Map<
  string,
  CacheEntry<BearcoPumpSwapReadiness>
>();
const rpcInflight = new Map<string, Promise<unknown>>();

const HOLDER_PROFILE_BASE_SELECT =
  "wallet_address, display_name, profile_slug, x_username, telegram_username, holder_percent_snapshot, token_balance_snapshot, claimed_at, social_claimed_at, updated_at";
const HOLDER_PROFILE_SOCIAL_SELECT =
  "x_user_id, x_display_name, x_authenticated_at, telegram_user_id, telegram_display_name, telegram_authenticated_at, discord_user_id, discord_username, discord_display_name, discord_authenticated_at";
const HOLDER_PROFILE_EXTENDED_SELECT = `${HOLDER_PROFILE_BASE_SELECT}, ${HOLDER_PROFILE_SOCIAL_SELECT}, lp_token_balance_atomic_snapshot, lp_token_balance_snapshot, lp_token_account, lp_snapshot_signature, lp_snapshot_at`;
const HOLDER_FEEDBACK_SELECT =
  "id, profile_id, wallet_address, display_name_snapshot, x_username_snapshot, telegram_username_snapshot, discord_username_snapshot, holder_percent_snapshot, category, message, status, created_at, updated_at";
const LEGACY_HOLDER_FEEDBACK_SELECT =
  "id, wallet_address, display_name_snapshot, x_username_snapshot, telegram_username_snapshot, holder_percent_snapshot, category, message, status, created_at, updated_at";
const HOLDER_COMPAT_REFERRAL_TYPE = "holder_dashboard";
const HOLDER_COMPAT_REJECTION_REASON = "holder-dashboard-profile-store";
const HOLDER_COMPAT_SELECT =
  "id, referrer_wallet, notes, queued_at, reviewed_at";

interface BearcoProfileRow {
  id: string;
  display_name: string | null;
  profile_slug: string | null;
  social_claimed_at: string | null;
  updated_at: string;
}

interface BearcoWalletClaimRow {
  profile_id: string;
  wallet_address: string;
  holder_percent_snapshot: number | string | null;
  token_balance_snapshot: number | string | null;
  lp_token_balance_atomic_snapshot: string | null;
  lp_token_balance_snapshot: string | null;
  lp_token_account: string | null;
  lp_snapshot_signature: string | null;
  lp_snapshot_at: string | null;
  claimed_at: string;
  updated_at: string;
  last_seen_at?: string | null;
}

interface BearcoSocialIdentityRow {
  id?: string;
  profile_id: string;
  provider: BearcoSocialProvider;
  provider_user_id: string | null;
  username: string | null;
  display_name: string | null;
  auth_source: "oauth" | "legacy";
  authenticated_at: string | null;
  updated_at?: string | null;
}

interface BearcoHolderCompatRow {
  id: string;
  notes: string | null;
  referrer_wallet: string | null;
}

interface BearcoHolderCompatPayload {
  feedback?: BearcoHolderFeedback[];
  kind?: string;
  profile?: StoredHolderProfile;
  updatedAt?: string;
}

const BEARCO_PROFILE_SELECT =
  "id, display_name, profile_slug, social_claimed_at, updated_at";
const BEARCO_WALLET_CLAIM_SELECT =
  "profile_id, wallet_address, holder_percent_snapshot, token_balance_snapshot, lp_token_balance_atomic_snapshot, lp_token_balance_snapshot, lp_token_account, lp_snapshot_signature, lp_snapshot_at, claimed_at, updated_at, last_seen_at";
const BEARCO_SOCIAL_IDENTITY_SELECT =
  "id, profile_id, provider, provider_user_id, username, display_name, auth_source, authenticated_at, updated_at";

function getRpcUrls(): string[] {
  const rawValues = [
    process.env.SOLANA_RPC_URLS,
    process.env.SOLANA_RPC_URL,
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
    DEFAULT_SOLANA_RPC_URL,
  ];
  const urls = rawValues
    .flatMap((value) => (value || "").split(","))
    .map((value) => value.trim())
    .filter(Boolean);

  return [...new Set(urls)];
}

export function getSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEX_SUPABASE_SERVICE_KEY ||
    "";

  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryAfterMs(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);

  const dateMs = Date.parse(value);
  if (!Number.isFinite(dateMs)) return null;
  return Math.max(0, dateMs - Date.now());
}

function isRetryableRpcStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function friendlyRpcError(error: unknown): Error {
  if (error instanceof SolanaRpcError && error.status === 429) {
    return new SolanaRpcError(
      "Solana RPC is rate limiting holder lookups. Wait a moment or set SOLANA_RPC_URLS to a dedicated provider endpoint.",
      429,
    );
  }

  return error instanceof Error
    ? error
    : new Error("Solana RPC request failed");
}

async function fetchSolanaRpc<T>(
  url: string,
  method: string,
  params: unknown[],
): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: `bearco-${method}`,
      method,
      params,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const message = `Solana RPC failed with HTTP ${response.status}`;
    const error = new SolanaRpcError(message, response.status);
    const retryMs = retryAfterMs(response.headers.get("retry-after"));
    if (retryMs !== null) await wait(Math.min(retryMs, 1500));
    throw error;
  }

  const payload = (await response.json()) as SolanaRpcResponse<T>;
  if (payload.error) {
    throw new SolanaRpcError(payload.error.message, payload.error.code);
  }
  if (!payload.result) {
    throw new SolanaRpcError("Solana RPC returned no result");
  }

  return payload.result;
}

async function solanaRpc<T>(method: string, params: unknown[]): Promise<T> {
  const urls = getRpcUrls();
  let lastError: unknown = null;

  for (let cycle = 0; cycle < 2; cycle += 1) {
    for (const url of urls) {
      try {
        return await fetchSolanaRpc<T>(url, method, params);
      } catch (error) {
        lastError = error;
        const status =
          error instanceof SolanaRpcError ? error.status ?? 0 : 0;
        if (status && !isRetryableRpcStatus(status)) {
          throw friendlyRpcError(error);
        }
      }
    }

    if (cycle === 0) await wait(300);
  }

  throw friendlyRpcError(lastError);
}

async function cachedRpc<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) return cached.value;

  const inFlight = rpcInflight.get(key) as Promise<T> | undefined;
  if (inFlight) return inFlight;

  const request = load()
    .then((value) => {
      cache.set(key, {
        expiresAt: Date.now() + ttlMs,
        staleUntil: Date.now() + RPC_STALE_TTL_MS,
        value,
      });
      return value;
    })
    .catch((error) => {
      const stale = cache.get(key);
      if (stale && stale.staleUntil > Date.now()) return stale.value;
      throw error;
    })
    .finally(() => {
      rpcInflight.delete(key);
    });

  rpcInflight.set(key, request);
  return request;
}

function getTokenSupply(): Promise<TokenSupplyResult> {
  return cachedRpc(
    tokenSupplyCache,
    `supply:${BEARCO_MINT_ADDRESS}`,
    TOKEN_SUPPLY_CACHE_TTL_MS,
    () => solanaRpc<TokenSupplyResult>("getTokenSupply", [BEARCO_MINT_ADDRESS]),
  );
}

function getOwnerTokenAccounts(walletAddress: string): Promise<TokenAccountResult> {
  return cachedRpc(
    tokenAccountsCache,
    `accounts:${walletAddress}:${BEARCO_MINT_ADDRESS}`,
    TOKEN_ACCOUNTS_CACHE_TTL_MS,
    () =>
      solanaRpc<TokenAccountResult>("getTokenAccountsByOwner", [
        walletAddress,
        { mint: BEARCO_MINT_ADDRESS },
        { encoding: "jsonParsed" },
      ]),
  );
}

export async function getBearcoPumpSwapReadiness(): Promise<BearcoPumpSwapReadiness> {
  return cachedRpc(
    pumpSwapReadinessCache,
    `pumpswap:${BEARCO_PUMPSWAP_POOL}:${BEARCO_PUMPSWAP_LP_MINT}`,
    TOKEN_SUPPLY_CACHE_TTL_MS,
    async () => {
      const result = await solanaRpc<RpcAccountInfoResult>(
        "getMultipleAccounts",
        [
          [BEARCO_PUMPSWAP_POOL, BEARCO_PUMPSWAP_LP_MINT],
          { encoding: "base64" },
        ],
      );
      const [pool, lpMint] = result.value;

      return {
        poolAddress: BEARCO_PUMPSWAP_POOL,
        lpMintAddress: BEARCO_PUMPSWAP_LP_MINT,
        poolExists: Boolean(pool),
        poolOwner: pool?.owner || null,
        lpMintExists: Boolean(lpMint),
        lpMintOwner: lpMint?.owner || null,
        updatedAt: new Date().toISOString(),
      };
    },
  );
}

function atomicToDecimalString(amount: bigint, decimals: number): string {
  if (decimals === 0) return amount.toString();

  const zero = BigInt(0);
  const sign = amount < zero ? "-" : "";
  const absolute = amount < zero ? -amount : amount;
  const raw = absolute.toString().padStart(decimals + 1, "0");
  const whole = raw.slice(0, -decimals) || "0";
  const fraction = raw.slice(-decimals).replace(/0+$/, "");

  return `${sign}${fraction ? `${whole}.${fraction}` : whole}`;
}

function percentOfSupply(balance: bigint, supply: bigint): number {
  if (supply <= BigInt(0)) return 0;
  const scaled = (balance * BigInt(100000000)) / supply;
  return Number(scaled) / 1_000_000;
}

export async function getStoredHolderProfile(
  walletAddress: string,
): Promise<StoredHolderProfile | null> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return null;

  const normalized = await getNormalizedStoredHolderProfile(
    supabase,
    walletAddress,
  );
  if (normalized) return normalized;

  const legacy = await getLegacyStoredHolderProfile(supabase, walletAddress);
  if (legacy) return legacy;

  return getCompatStoredHolderProfile(supabase, walletAddress);
}

async function getLegacyStoredHolderProfile(
  supabase: NonNullable<ReturnType<typeof getSupabaseServiceClient>>,
  walletAddress: string,
): Promise<StoredHolderProfile | null> {
  const extended = await supabase
    .from("bearco_holder_profiles")
    .select(HOLDER_PROFILE_EXTENDED_SELECT)
    .eq("wallet_address", walletAddress)
    .maybeSingle();

  if (!extended.error) return extended.data as StoredHolderProfile | null;

  const { data, error } = await supabase
    .from("bearco_holder_profiles")
    .select(HOLDER_PROFILE_BASE_SELECT)
    .eq("wallet_address", walletAddress)
    .maybeSingle();

  return error ? null : (data as StoredHolderProfile | null);
}

function holderCompatEmail(walletAddress: string): string {
  return `holder+${walletAddress.toLowerCase()}@bearo.cash`;
}

function parseHolderCompatPayload(
  row: Pick<BearcoHolderCompatRow, "notes"> | null,
): BearcoHolderCompatPayload | null {
  if (!row?.notes) return null;

  try {
    const parsed = JSON.parse(row.notes) as BearcoHolderCompatPayload;
    if (parsed?.kind !== "bearco_holder_profile" || !parsed.profile) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function getHolderCompatRow(
  supabase: NonNullable<ReturnType<typeof getSupabaseServiceClient>>,
  walletAddress: string,
): Promise<BearcoHolderCompatRow | null> {
  const { data, error } = await supabase
    .from("airdrop_queue")
    .select(HOLDER_COMPAT_SELECT)
    .eq("referral_type", HOLDER_COMPAT_REFERRAL_TYPE)
    .eq("rejection_reason", HOLDER_COMPAT_REJECTION_REASON)
    .eq("referrer_wallet", walletAddress)
    .order("queued_at", { ascending: false })
    .limit(1);

  if (error) return null;
  return (data?.[0] as BearcoHolderCompatRow | undefined) || null;
}

async function getCompatStoredHolderProfile(
  supabase: NonNullable<ReturnType<typeof getSupabaseServiceClient>>,
  walletAddress: string,
): Promise<StoredHolderProfile | null> {
  const row = await getHolderCompatRow(supabase, walletAddress);
  const payload = parseHolderCompatPayload(row);
  return payload?.profile || null;
}

const storedHolderProfileKeys = [
  "profile_id",
  "wallet_address",
  "display_name",
  "profile_slug",
  "x_username",
  "x_user_id",
  "x_display_name",
  "x_authenticated_at",
  "telegram_username",
  "telegram_user_id",
  "telegram_display_name",
  "telegram_authenticated_at",
  "discord_user_id",
  "discord_username",
  "discord_display_name",
  "discord_authenticated_at",
  "holder_percent_snapshot",
  "token_balance_snapshot",
  "lp_token_balance_atomic_snapshot",
  "lp_token_balance_snapshot",
  "lp_token_account",
  "lp_snapshot_signature",
  "lp_snapshot_at",
  "claimed_at",
  "social_claimed_at",
  "updated_at",
] as const;

function defaultCompatProfile(
  walletAddress: string,
  now: string,
): StoredHolderProfile {
  return {
    claimed_at: now,
    display_name: null,
    discord_authenticated_at: null,
    discord_display_name: null,
    discord_user_id: null,
    discord_username: null,
    holder_percent_snapshot: null,
    lp_snapshot_at: null,
    lp_snapshot_signature: null,
    lp_token_account: null,
    lp_token_balance_atomic_snapshot: null,
    lp_token_balance_snapshot: null,
    profile_id: null,
    profile_slug: null,
    social_claimed_at: null,
    telegram_authenticated_at: null,
    telegram_display_name: null,
    telegram_user_id: null,
    telegram_username: null,
    token_balance_snapshot: null,
    updated_at: now,
    wallet_address: walletAddress,
    x_authenticated_at: null,
    x_display_name: null,
    x_user_id: null,
    x_username: null,
  };
}

function compactCompatProfile(
  current: StoredHolderProfile,
  payload: Record<string, unknown>,
  now: string,
): StoredHolderProfile {
  const profile: StoredHolderProfile = {
    ...current,
    updated_at: now,
    wallet_address: current.wallet_address,
  };

  for (const key of storedHolderProfileKeys) {
    const value = payload[key];
    if (value !== undefined) {
      (profile as unknown as Record<string, unknown>)[key] = value;
    }
  }

  profile.holder_percent_snapshot = numericSnapshot(
    profile.holder_percent_snapshot,
  );
  profile.token_balance_snapshot = tokenSnapshot(profile.token_balance_snapshot);
  profile.claimed_at = profile.claimed_at || now;
  profile.updated_at = now;
  return profile;
}

async function writeCompatHolderPayload(
  supabase: NonNullable<ReturnType<typeof getSupabaseServiceClient>>,
  walletAddress: string,
  payload: BearcoHolderCompatPayload,
  rowId?: string,
): Promise<boolean> {
  const now = new Date().toISOString();
  const notes = JSON.stringify({
    ...payload,
    kind: "bearco_holder_profile",
    updatedAt: now,
  } satisfies BearcoHolderCompatPayload);
  const email = holderCompatEmail(walletAddress);
  const rowPayload = {
    amount: 0,
    referee_email: email,
    referrer_email: email,
    referrer_wallet: walletAddress,
    referral_type: HOLDER_COMPAT_REFERRAL_TYPE,
    rejection_reason: HOLDER_COMPAT_REJECTION_REASON,
    reviewed_at: now,
    status: "rejected",
    token_address: BEARCO_MINT_ADDRESS,
    notes,
  };

  const write = rowId
    ? await supabase.from("airdrop_queue").update(rowPayload).eq("id", rowId)
    : await supabase.from("airdrop_queue").insert(rowPayload);

  return !write.error;
}

async function upsertCompatHolderProfileProjection(
  supabase: NonNullable<ReturnType<typeof getSupabaseServiceClient>>,
  payload: Record<string, unknown>,
): Promise<StoredHolderProfile | null> {
  const walletAddress =
    typeof payload.wallet_address === "string" ? payload.wallet_address : "";
  if (!walletAddress) return null;

  const now =
    typeof payload.updated_at === "string"
      ? payload.updated_at
      : new Date().toISOString();
  const row = await getHolderCompatRow(supabase, walletAddress);
  const currentPayload = parseHolderCompatPayload(row);
  const currentProfile =
    currentPayload?.profile || defaultCompatProfile(walletAddress, now);
  const profile = compactCompatProfile(currentProfile, payload, now);
  const feedback = currentPayload?.feedback || [];

  const wrote = await writeCompatHolderPayload(
    supabase,
    walletAddress,
    { feedback, profile },
    row?.id,
  );

  return wrote ? profile : null;
}

async function appendCompatHolderFeedback(
  supabase: NonNullable<ReturnType<typeof getSupabaseServiceClient>>,
  walletAddress: string,
  feedback: BearcoHolderFeedback,
  profile: StoredHolderProfile | null,
): Promise<boolean> {
  const row = await getHolderCompatRow(supabase, walletAddress);
  const currentPayload = parseHolderCompatPayload(row);
  const currentProfile =
    currentPayload?.profile ||
    profile ||
    defaultCompatProfile(walletAddress, feedback.created_at);
  const nextFeedback = [feedback, ...(currentPayload?.feedback || [])].slice(
    0,
    50,
  );

  return writeCompatHolderPayload(
    supabase,
    walletAddress,
    { feedback: nextFeedback, profile: currentProfile },
    row?.id,
  );
}

async function listCompatHolderFeedback(
  supabase: NonNullable<ReturnType<typeof getSupabaseServiceClient>>,
): Promise<{ feedback: BearcoHolderFeedback[]; storageReady: boolean }> {
  const { data, error } = await supabase
    .from("airdrop_queue")
    .select(HOLDER_COMPAT_SELECT)
    .eq("referral_type", HOLDER_COMPAT_REFERRAL_TYPE)
    .eq("rejection_reason", HOLDER_COMPAT_REJECTION_REASON)
    .order("queued_at", { ascending: false })
    .limit(200);

  if (error) return { feedback: [], storageReady: false };

  const feedback = (data || [])
    .flatMap((row) => parseHolderCompatPayload(row)?.feedback || [])
    .sort(
      (left, right) =>
        Date.parse(right.created_at) - Date.parse(left.created_at),
    )
    .slice(0, 25);

  return { feedback, storageReady: true };
}

function numericSnapshot(value: number | string | null): number | null {
  if (value === null) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function tokenSnapshot(value: number | string | null): string | null {
  if (value === null) return null;
  return String(value);
}

function socialForProvider(
  socials: BearcoSocialIdentityRow[],
  provider: BearcoSocialProvider,
): BearcoSocialIdentityRow | null {
  return socials.find((item) => item.provider === provider) || null;
}

function authenticatedProviderUserId(
  social: BearcoSocialIdentityRow | null,
): string | null {
  if (!social || social.auth_source !== "oauth") return null;
  return social.provider_user_id;
}

function composeStoredHolderProfile(input: {
  claim: BearcoWalletClaimRow;
  profile: BearcoProfileRow;
  socials: BearcoSocialIdentityRow[];
}): StoredHolderProfile {
  const x = socialForProvider(input.socials, "x");
  const telegram = socialForProvider(input.socials, "telegram");
  const discord = socialForProvider(input.socials, "discord");

  return {
    profile_id: input.profile.id,
    wallet_address: input.claim.wallet_address,
    display_name: input.profile.display_name,
    profile_slug: input.profile.profile_slug,
    x_username: x?.username || null,
    x_user_id: authenticatedProviderUserId(x),
    x_display_name: x?.display_name || null,
    x_authenticated_at: x?.authenticated_at || null,
    telegram_username: telegram?.username || null,
    telegram_user_id: authenticatedProviderUserId(telegram),
    telegram_display_name: telegram?.display_name || null,
    telegram_authenticated_at: telegram?.authenticated_at || null,
    discord_user_id: authenticatedProviderUserId(discord),
    discord_username: discord?.username || null,
    discord_display_name: discord?.display_name || null,
    discord_authenticated_at: discord?.authenticated_at || null,
    holder_percent_snapshot: numericSnapshot(
      input.claim.holder_percent_snapshot,
    ),
    token_balance_snapshot: tokenSnapshot(input.claim.token_balance_snapshot),
    lp_token_balance_atomic_snapshot:
      input.claim.lp_token_balance_atomic_snapshot,
    lp_token_balance_snapshot: input.claim.lp_token_balance_snapshot,
    lp_token_account: input.claim.lp_token_account,
    lp_snapshot_signature: input.claim.lp_snapshot_signature,
    lp_snapshot_at: input.claim.lp_snapshot_at,
    claimed_at: input.claim.claimed_at,
    social_claimed_at: input.profile.social_claimed_at,
    updated_at: input.claim.updated_at || input.profile.updated_at,
  };
}

function socialLeaderboardIdentity(input: {
  authenticatedAt?: string | null;
  displayName?: string | null;
  username?: string | null;
}): BearcoHolderLeaderboardIdentity {
  return {
    authenticatedAt: input.authenticatedAt || null,
    displayName: input.displayName || null,
    username: input.authenticatedAt ? input.username || null : null,
  };
}

function holderLeaderboardEntryFromProfile(
  profile: StoredHolderProfile,
  index: number,
): BearcoHolderLeaderboardEntry {
  const holderPercent = numericSnapshot(profile.holder_percent_snapshot) || 0;

  return {
    claimedAt: profile.claimed_at,
    displayName: profile.display_name || null,
    highestTier: getHighestHolderTier(holderPercent),
    holderPercent,
    rank: index + 1,
    socials: {
      discord: socialLeaderboardIdentity({
        authenticatedAt: profile.discord_authenticated_at,
        displayName: profile.discord_display_name,
        username: profile.discord_username,
      }),
      telegram: socialLeaderboardIdentity({
        authenticatedAt: profile.telegram_authenticated_at,
        displayName: profile.telegram_display_name,
        username: profile.telegram_username,
      }),
      x: socialLeaderboardIdentity({
        authenticatedAt: profile.x_authenticated_at,
        displayName: profile.x_display_name,
        username: profile.x_username,
      }),
    },
    tokenBalance: tokenSnapshot(profile.token_balance_snapshot),
    updatedAt: profile.updated_at || profile.claimed_at,
    walletAddress: profile.wallet_address,
  };
}

async function enrichLeaderboardEntryWithStreamflowLocks(
  entry: BearcoHolderLeaderboardEntry,
): Promise<BearcoHolderLeaderboardEntry> {
  const lockCredit = await getBearcoStreamflowLockCreditForWallet(
    entry.walletAddress,
  ).catch(() => null);
  if (!lockCredit || lockCredit.amountAtomic === "0") return entry;

  const liveProfile = await getBearcoHolderProfile(entry.walletAddress).catch(
    () => null,
  );
  if (!liveProfile) return entry;

  return {
    ...entry,
    highestTier: liveProfile.highestTier,
    holderPercent: liveProfile.holderPercent,
    tokenBalance: liveProfile.effectiveBalance.uiAmountString,
  };
}

async function getNormalizedStoredHolderProfile(
  supabase: NonNullable<ReturnType<typeof getSupabaseServiceClient>>,
  walletAddress: string,
): Promise<StoredHolderProfile | null> {
  const claim = await supabase
    .from("bearco_wallet_claims")
    .select(BEARCO_WALLET_CLAIM_SELECT)
    .eq("wallet_address", walletAddress)
    .maybeSingle();

  if (claim.error || !claim.data) return null;

  const claimRow = claim.data as BearcoWalletClaimRow;
  const [profile, socials] = await Promise.all([
    supabase
      .from("bearco_profiles")
      .select(BEARCO_PROFILE_SELECT)
      .eq("id", claimRow.profile_id)
      .maybeSingle(),
    supabase
      .from("bearco_social_identities")
      .select(BEARCO_SOCIAL_IDENTITY_SELECT)
      .eq("profile_id", claimRow.profile_id),
  ]);

  if (profile.error || !profile.data || socials.error) return null;

  return composeStoredHolderProfile({
    claim: claimRow,
    profile: profile.data as BearcoProfileRow,
    socials: (socials.data || []) as BearcoSocialIdentityRow[],
  });
}

async function listNormalizedHolderLeaderboard(
  supabase: NonNullable<ReturnType<typeof getSupabaseServiceClient>>,
  limit: number,
): Promise<StoredHolderProfile[] | null> {
  const claims = await supabase
    .from("bearco_wallet_claims")
    .select(BEARCO_WALLET_CLAIM_SELECT)
    .not("holder_percent_snapshot", "is", null)
    .order("holder_percent_snapshot", { ascending: false })
    .limit(limit);

  if (claims.error) return null;

  const claimRows = (claims.data || []) as BearcoWalletClaimRow[];
  const profileIds = [
    ...new Set(
      claimRows
        .map((claim) => claim.profile_id)
        .filter((profileId): profileId is string => Boolean(profileId)),
    ),
  ];
  if (profileIds.length === 0) return [];

  const [profiles, socials] = await Promise.all([
    supabase
      .from("bearco_profiles")
      .select(BEARCO_PROFILE_SELECT)
      .in("id", profileIds),
    supabase
      .from("bearco_social_identities")
      .select(BEARCO_SOCIAL_IDENTITY_SELECT)
      .in("profile_id", profileIds),
  ]);

  if (profiles.error || socials.error) return null;

  const profilesById = new Map(
    ((profiles.data || []) as BearcoProfileRow[]).map((profile) => [
      profile.id,
      profile,
    ]),
  );
  const socialsByProfileId = new Map<string, BearcoSocialIdentityRow[]>();
  for (const social of (socials.data || []) as BearcoSocialIdentityRow[]) {
    const current = socialsByProfileId.get(social.profile_id) || [];
    current.push(social);
    socialsByProfileId.set(social.profile_id, current);
  }

  return claimRows.flatMap((claim) => {
    const profile = profilesById.get(claim.profile_id);
    if (!profile) return [];
    return composeStoredHolderProfile({
      claim,
      profile,
      socials: socialsByProfileId.get(claim.profile_id) || [],
    });
  });
}

async function listLegacyHolderLeaderboard(
  supabase: NonNullable<ReturnType<typeof getSupabaseServiceClient>>,
  limit: number,
): Promise<StoredHolderProfile[] | null> {
  const extended = await supabase
    .from("bearco_holder_profiles")
    .select(HOLDER_PROFILE_EXTENDED_SELECT)
    .not("holder_percent_snapshot", "is", null)
    .order("holder_percent_snapshot", { ascending: false })
    .limit(limit);

  if (!extended.error) return (extended.data || []) as StoredHolderProfile[];

  const base = await supabase
    .from("bearco_holder_profiles")
    .select(HOLDER_PROFILE_BASE_SELECT)
    .not("holder_percent_snapshot", "is", null)
    .order("holder_percent_snapshot", { ascending: false })
    .limit(limit);

  if (base.error) return null;
  return (base.data || []) as StoredHolderProfile[];
}

async function listCompatHolderLeaderboard(
  supabase: NonNullable<ReturnType<typeof getSupabaseServiceClient>>,
  limit: number,
): Promise<StoredHolderProfile[] | null> {
  const { data, error } = await supabase
    .from("airdrop_queue")
    .select(HOLDER_COMPAT_SELECT)
    .eq("referral_type", HOLDER_COMPAT_REFERRAL_TYPE)
    .eq("rejection_reason", HOLDER_COMPAT_REJECTION_REASON)
    .order("queued_at", { ascending: false })
    .limit(500);

  if (error) return null;

  const profilesByWallet = new Map<string, StoredHolderProfile>();
  for (const row of data || []) {
    const profile = parseHolderCompatPayload(row)?.profile;
    if (!profile?.wallet_address) continue;

    const current = profilesByWallet.get(profile.wallet_address);
    if (
      !current ||
      Date.parse(profile.updated_at) > Date.parse(current.updated_at)
    ) {
      profilesByWallet.set(profile.wallet_address, profile);
    }
  }

  return Array.from(profilesByWallet.values())
    .filter((profile) => numericSnapshot(profile.holder_percent_snapshot) !== null)
    .sort(
      (left, right) =>
        (numericSnapshot(right.holder_percent_snapshot) || 0) -
        (numericSnapshot(left.holder_percent_snapshot) || 0),
    )
    .slice(0, limit);
}

export async function listBearcoHolderLeaderboard(
  limit = 25,
): Promise<{
  entries: BearcoHolderLeaderboardEntry[];
  storageReady: boolean;
  updatedAt: string;
}> {
  const supabase = getSupabaseServiceClient();
  const updatedAt = new Date().toISOString();
  if (!supabase) return { entries: [], storageReady: false, updatedAt };

  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 50);
  const normalizedRows = await listNormalizedHolderLeaderboard(
    supabase,
    safeLimit,
  );
  const legacyRows =
    normalizedRows && normalizedRows.length > 0
      ? null
      : await listLegacyHolderLeaderboard(supabase, safeLimit);
  const compatRows =
    (normalizedRows && normalizedRows.length > 0) ||
    (legacyRows && legacyRows.length > 0)
      ? null
      : await listCompatHolderLeaderboard(supabase, safeLimit);
  const rows =
    (normalizedRows && normalizedRows.length > 0
      ? normalizedRows
      : legacyRows && legacyRows.length > 0
        ? legacyRows
        : compatRows) ||
    normalizedRows ||
    legacyRows ||
    compatRows;

  if (!rows) return { entries: [], storageReady: false, updatedAt };

  const entries = (
    await Promise.all(
      rows.map((profile, index) =>
        enrichLeaderboardEntryWithStreamflowLocks(
          holderLeaderboardEntryFromProfile(profile, index),
        ),
      ),
    )
  )
    .sort((left, right) => right.holderPercent - left.holderPercent)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  return { entries, storageReady: true, updatedAt };
}

export async function getBearcoHolderProfile(
  walletAddress: string,
): Promise<BearcoHolderProfile> {
  const trimmedWallet = walletAddress.trim();
  if (!isValidSolanaAddress(trimmedWallet)) {
    throw new Error("Invalid Solana wallet address");
  }

  const [supplyResult, accountResult, storedProfile, streamflowLockCredit] =
    await Promise.all([
      getTokenSupply(),
      getOwnerTokenAccounts(trimmedWallet),
      getStoredHolderProfile(trimmedWallet),
      getBearcoStreamflowLockCreditForWallet(trimmedWallet).catch(() => null),
    ]);

  const supplyAtomic = BigInt(supplyResult.value.amount);
  const balanceAtomic = accountResult.value.reduce((total, item) => {
    const amount =
      item.account.data.parsed?.info?.tokenAmount?.amount || "0";
    return total + BigInt(amount);
  }, BigInt(0));
  const decimals = supplyResult.value.decimals;
  const lockedBalanceAtomic = BigInt(streamflowLockCredit?.amountAtomic || "0");
  const effectiveBalanceAtomic = balanceAtomic + lockedBalanceAtomic;
  const liquidHolderPercent = percentOfSupply(balanceAtomic, supplyAtomic);
  const holderPercent = percentOfSupply(effectiveBalanceAtomic, supplyAtomic);

  return {
    walletAddress: trimmedWallet,
    mintAddress: BEARCO_MINT_ADDRESS,
    balance: {
      amountAtomic: balanceAtomic.toString(),
      uiAmountString: atomicToDecimalString(balanceAtomic, decimals),
    },
    effectiveBalance: {
      amountAtomic: effectiveBalanceAtomic.toString(),
      holderPercent,
      uiAmountString: atomicToDecimalString(effectiveBalanceAtomic, decimals),
    },
    liquidHolderPercent,
    lockedBalance: {
      amountAtomic: lockedBalanceAtomic.toString(),
      contractCount: streamflowLockCredit?.contractCount || 0,
      holderPercent: percentOfSupply(lockedBalanceAtomic, supplyAtomic),
      sourceUrl: streamflowLockCredit?.sourceUrl || "",
      sourceWallets: streamflowLockCredit?.sourceWallets || [trimmedWallet],
      uiAmountString: atomicToDecimalString(lockedBalanceAtomic, decimals),
    },
    supply: {
      amountAtomic: supplyAtomic.toString(),
      decimals,
      uiAmountString:
        supplyResult.value.uiAmountString ||
        atomicToDecimalString(supplyAtomic, decimals),
    },
    holderPercent,
    unlockedTiers: getUnlockedHolderTiers(holderPercent),
    highestTier: getHighestHolderTier(holderPercent),
    profile: storedProfile,
    updatedAt: new Date().toISOString(),
  };
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function normalizeDisplayName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/\s+/g, " ").slice(0, 48);
  return cleaned.length >= 2 ? cleaned : null;
}

export function normalizeSocialUsername(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value
    .trim()
    .replace(/^https?:\/\/(www\.)?(x\.com|twitter\.com|t\.me)\//i, "")
    .replace(/^@+/, "")
    .split(/[/?#]/)[0]
    .trim();

  if (!cleaned) return null;
  if (!/^[A-Za-z0-9_]{2,32}$/.test(cleaned)) return null;
  return cleaned;
}

export async function upsertHolderProfile(input: {
  walletAddress: string;
  displayName: string | null;
  holderPercent: number;
  tokenBalance: string;
}): Promise<{ persisted: boolean; profile: StoredHolderProfile | null }> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return { persisted: false, profile: null };

  const fallbackName = `holder-${input.walletAddress.slice(0, 6).toLowerCase()}`;
  const displayName = input.displayName || fallbackName;
  const profileSlug = slugify(displayName) || fallbackName;
  const normalized = await upsertNormalizedHolderProfile(supabase, {
    ...input,
    displayName,
    profileSlug,
  });
  if (normalized) return { persisted: true, profile: normalized };

  const legacyProfile = await upsertLegacyHolderProfileProjection(supabase, {
    wallet_address: input.walletAddress,
    display_name: displayName,
    profile_slug: profileSlug,
    holder_percent_snapshot: input.holderPercent,
    token_balance_snapshot: input.tokenBalance,
    updated_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
  });

  if (legacyProfile) return { persisted: true, profile: legacyProfile };

  const compatProfile = await upsertCompatHolderProfileProjection(supabase, {
    wallet_address: input.walletAddress,
    display_name: displayName,
    profile_slug: profileSlug,
    holder_percent_snapshot: input.holderPercent,
    token_balance_snapshot: input.tokenBalance,
    updated_at: new Date().toISOString(),
  });

  return { persisted: Boolean(compatProfile), profile: compatProfile };
}

export type BearcoSocialProvider = "x" | "telegram" | "discord";

export async function upsertHolderSocialIdentity(input: {
  walletAddress: string;
  provider: BearcoSocialProvider;
  providerUserId: string;
  username: string | null;
  displayName: string | null;
}): Promise<{ persisted: boolean; profile: StoredHolderProfile | null }> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return { persisted: false, profile: null };

  const now = new Date().toISOString();
  const normalizedUsername = normalizeSocialUsername(input.username);
  const normalizedDisplayName = normalizeDisplayName(input.displayName);
  const normalized = await upsertNormalizedHolderSocialIdentity(supabase, {
    ...input,
    displayName: normalizedDisplayName,
    username: normalizedUsername,
    now,
  });
  if (normalized) return { persisted: true, profile: normalized };

  const legacyPayload =
    input.provider === "x"
      ? {
          wallet_address: input.walletAddress,
          x_user_id: input.providerUserId,
          x_username: normalizedUsername,
          x_display_name: normalizedDisplayName,
          x_authenticated_at: now,
          social_claimed_at: now,
          updated_at: now,
          last_seen_at: now,
        }
      : input.provider === "telegram"
        ? {
            wallet_address: input.walletAddress,
            telegram_user_id: input.providerUserId,
            telegram_username: normalizedUsername,
            telegram_display_name: normalizedDisplayName,
            telegram_authenticated_at: now,
            social_claimed_at: now,
            updated_at: now,
            last_seen_at: now,
          }
        : {
            wallet_address: input.walletAddress,
            discord_user_id: input.providerUserId,
            discord_username: normalizedUsername,
            discord_display_name: normalizedDisplayName,
            discord_authenticated_at: now,
            social_claimed_at: now,
            updated_at: now,
            last_seen_at: now,
          };

  const legacyProfile = await upsertLegacyHolderProfileProjection(
    supabase,
    legacyPayload,
  );

  if (legacyProfile) return { persisted: true, profile: legacyProfile };

  const compatProfile = await upsertCompatHolderProfileProjection(
    supabase,
    legacyPayload,
  );

  return { persisted: Boolean(compatProfile), profile: compatProfile };
}

async function upsertLegacyHolderProfileProjection(
  supabase: NonNullable<ReturnType<typeof getSupabaseServiceClient>>,
  payload: Record<string, unknown>,
): Promise<StoredHolderProfile | null> {
  const extended = await supabase
    .from("bearco_holder_profiles")
    .upsert(payload, { onConflict: "wallet_address" })
    .select(HOLDER_PROFILE_EXTENDED_SELECT)
    .single();

  if (!extended.error) return extended.data as StoredHolderProfile;

  const basePayload = {
    wallet_address: payload.wallet_address,
    display_name: payload.display_name,
    profile_slug: payload.profile_slug,
    x_username: payload.x_username,
    telegram_username: payload.telegram_username,
    holder_percent_snapshot: payload.holder_percent_snapshot,
    token_balance_snapshot: payload.token_balance_snapshot,
    social_claimed_at: payload.social_claimed_at,
    updated_at: payload.updated_at,
    last_seen_at: payload.last_seen_at,
  };

  const { data, error } = await supabase
    .from("bearco_holder_profiles")
    .upsert(basePayload, { onConflict: "wallet_address" })
    .select(HOLDER_PROFILE_BASE_SELECT)
    .single();

  return error ? null : (data as StoredHolderProfile);
}

async function ensureProfileForWallet(
  supabase: NonNullable<ReturnType<typeof getSupabaseServiceClient>>,
  input: {
    displayName: string;
    profileSlug: string;
    walletAddress: string;
  },
): Promise<string | null> {
  const claim = await supabase
    .from("bearco_wallet_claims")
    .select("profile_id")
    .eq("wallet_address", input.walletAddress)
    .maybeSingle();

  if (claim.error) return null;
  if (claim.data?.profile_id) return claim.data.profile_id as string;

  const profile = await supabase
    .from("bearco_profiles")
    .insert({
      display_name: input.displayName,
      profile_slug: input.profileSlug,
    })
    .select("id")
    .single();

  if (profile.error || !profile.data?.id) return null;
  return profile.data.id as string;
}

async function upsertNormalizedHolderProfile(
  supabase: NonNullable<ReturnType<typeof getSupabaseServiceClient>>,
  input: {
    walletAddress: string;
    displayName: string;
    profileSlug: string;
    holderPercent: number;
    tokenBalance: string;
  },
): Promise<StoredHolderProfile | null> {
  const now = new Date().toISOString();
  const profileId = await ensureProfileForWallet(supabase, input);
  if (!profileId) return null;

  await supabase
    .from("bearco_profiles")
    .update({
      display_name: input.displayName,
      profile_slug: input.profileSlug,
      updated_at: now,
    })
    .eq("id", profileId);

  const claim = await supabase
    .from("bearco_wallet_claims")
    .upsert(
      {
        profile_id: profileId,
        wallet_address: input.walletAddress,
        holder_percent_snapshot: input.holderPercent,
        token_balance_snapshot: input.tokenBalance,
        updated_at: now,
        last_seen_at: now,
      },
      { onConflict: "wallet_address" },
    )
    .select(BEARCO_WALLET_CLAIM_SELECT)
    .single();

  if (claim.error) return null;

  await upsertLegacyHolderProfileProjection(supabase, {
    profile_id: profileId,
    wallet_address: input.walletAddress,
    display_name: input.displayName,
    profile_slug: input.profileSlug,
    holder_percent_snapshot: input.holderPercent,
    token_balance_snapshot: input.tokenBalance,
    updated_at: now,
    last_seen_at: now,
  });

  await recordIdentityEvent(supabase, {
    event_type: "wallet_claimed",
    profile_id: profileId,
    wallet_address: input.walletAddress,
  });

  return getStoredHolderProfile(input.walletAddress);
}

async function upsertNormalizedHolderSocialIdentity(
  supabase: NonNullable<ReturnType<typeof getSupabaseServiceClient>>,
  input: {
    walletAddress: string;
    provider: BearcoSocialProvider;
    providerUserId: string;
    username: string | null;
    displayName: string | null;
    now: string;
  },
): Promise<StoredHolderProfile | null> {
  const fallbackName = `holder-${input.walletAddress.slice(0, 6).toLowerCase()}`;
  const profileId = await ensureProfileForWallet(supabase, {
    displayName: fallbackName,
    profileSlug: fallbackName,
    walletAddress: input.walletAddress,
  });
  if (!profileId) return null;

  const claim = await supabase.from("bearco_wallet_claims").upsert(
    {
      profile_id: profileId,
      wallet_address: input.walletAddress,
      updated_at: input.now,
      last_seen_at: input.now,
    },
    { onConflict: "wallet_address" },
  );
  if (claim.error) return null;

  const existingForProfile = await supabase
    .from("bearco_social_identities")
    .select("id, provider_user_id")
    .eq("profile_id", profileId)
    .eq("provider", input.provider);

  if (existingForProfile.error) return null;

  const replacementIds = (existingForProfile.data || [])
    .filter((item) => item.provider_user_id !== input.providerUserId)
    .map((item) => item.id)
    .filter((id): id is string => typeof id === "string");

  if (replacementIds.length > 0) {
    await supabase
      .from("bearco_social_identities")
      .delete()
      .in("id", replacementIds);
  }

  const existingIdentity = await supabase
    .from("bearco_social_identities")
    .select("id, profile_id")
    .eq("provider", input.provider)
    .eq("provider_user_id", input.providerUserId)
    .maybeSingle();

  if (existingIdentity.error) return null;

  const previousProfileId =
    typeof existingIdentity.data?.profile_id === "string"
      ? existingIdentity.data.profile_id
      : null;
  const identityPayload = {
    profile_id: profileId,
    provider: input.provider,
    provider_user_id: input.providerUserId,
    username: input.username,
    display_name: input.displayName,
    auth_source: "oauth",
    authenticated_at: input.now,
    updated_at: input.now,
  };

  const identityWrite = existingIdentity.data?.id
    ? await supabase
        .from("bearco_social_identities")
        .update(identityPayload)
        .eq("id", existingIdentity.data.id)
    : await supabase.from("bearco_social_identities").insert(identityPayload);

  if (identityWrite.error) return null;

  await supabase
    .from("bearco_profiles")
    .update({
      social_claimed_at: input.now,
      updated_at: input.now,
    })
    .eq("id", profileId);

  await upsertLegacyHolderProfileProjection(supabase, {
    profile_id: profileId,
    wallet_address: input.walletAddress,
    ...legacyProviderPayload(input),
    social_claimed_at: input.now,
    updated_at: input.now,
    last_seen_at: input.now,
  });

  await recordIdentityEvent(supabase, {
    event_type:
      previousProfileId && previousProfileId !== profileId
        ? "social_relinked"
        : "social_linked",
    profile_id: profileId,
    previous_profile_id: previousProfileId,
    provider: input.provider,
    wallet_address: input.walletAddress,
    metadata: {
      providerUserId: input.providerUserId,
      username: input.username,
    },
  });

  return getStoredHolderProfile(input.walletAddress);
}

function legacyProviderPayload(input: {
  displayName: string | null;
  now: string;
  provider: BearcoSocialProvider;
  providerUserId: string;
  username: string | null;
}): Record<string, unknown> {
  if (input.provider === "x") {
    return {
      x_user_id: input.providerUserId,
      x_username: input.username,
      x_display_name: input.displayName,
      x_authenticated_at: input.now,
    };
  }

  if (input.provider === "telegram") {
    return {
      telegram_user_id: input.providerUserId,
      telegram_username: input.username,
      telegram_display_name: input.displayName,
      telegram_authenticated_at: input.now,
    };
  }

  return {
    discord_user_id: input.providerUserId,
    discord_username: input.username,
    discord_display_name: input.displayName,
    discord_authenticated_at: input.now,
  };
}

async function recordIdentityEvent(
  supabase: NonNullable<ReturnType<typeof getSupabaseServiceClient>>,
  event: {
    event_type: string;
    metadata?: Record<string, unknown>;
    previous_profile_id?: string | null;
    profile_id?: string | null;
    provider?: BearcoSocialProvider;
    wallet_address?: string | null;
  },
): Promise<void> {
  const { error } = await supabase.from("bearco_identity_events").insert({
    event_type: event.event_type,
    metadata: event.metadata || {},
    previous_profile_id: event.previous_profile_id || null,
    profile_id: event.profile_id || null,
    provider: event.provider || null,
    wallet_address: event.wallet_address || null,
  });

  if (error) {
    console.warn("[bearco] identity event was not recorded", {
      eventType: event.event_type,
      provider: event.provider || null,
    });
  }
}

export function normalizeFeedbackCategory(value: unknown): string {
  if (typeof value !== "string") return "product";
  const cleaned = value.trim().toLowerCase();
  if (["product", "community", "liquidity", "bug", "other"].includes(cleaned)) {
    return cleaned;
  }
  return "product";
}

export function normalizeFeedbackMessage(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, 500);
}

export async function persistHolderLpSnapshot(input: {
  lpTokenAccount: string;
  lpTokenBalanceAtomic: string;
  lpTokenBalanceUi: string;
  transactionSignature: string | null;
  updatedAt: string;
  walletAddress: string;
}): Promise<{ persisted: boolean; persistError: string | null }> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return {
      persisted: false,
      persistError: "Supabase service credentials are not configured.",
    };
  }

  const fallbackName = `holder-${input.walletAddress.slice(0, 6).toLowerCase()}`;
  const profileId = await ensureProfileForWallet(supabase, {
    displayName: fallbackName,
    profileSlug: fallbackName,
    walletAddress: input.walletAddress,
  });

  if (!profileId) {
    const legacy = await upsertLegacyHolderProfileProjection(supabase, {
      wallet_address: input.walletAddress,
      lp_token_balance_atomic_snapshot: input.lpTokenBalanceAtomic,
      lp_token_balance_snapshot: input.lpTokenBalanceUi,
      lp_token_account: input.lpTokenAccount,
      lp_snapshot_signature: input.transactionSignature,
      lp_snapshot_at: input.updatedAt,
      updated_at: input.updatedAt,
      last_seen_at: input.updatedAt,
    });
    if (legacy) {
      return { persisted: true, persistError: null };
    }

    const compat = await upsertCompatHolderProfileProjection(supabase, {
      wallet_address: input.walletAddress,
      lp_token_balance_atomic_snapshot: input.lpTokenBalanceAtomic,
      lp_token_balance_snapshot: input.lpTokenBalanceUi,
      lp_token_account: input.lpTokenAccount,
      lp_snapshot_signature: input.transactionSignature,
      lp_snapshot_at: input.updatedAt,
      updated_at: input.updatedAt,
    });

    return {
      persisted: Boolean(compat),
      persistError: compat
        ? null
        : "LP balance loaded, but identity storage is not ready. Apply supabase/bearco_holder_profiles.sql and retry.",
    };
  }

  const claim = await supabase.from("bearco_wallet_claims").upsert(
    {
      profile_id: profileId,
      wallet_address: input.walletAddress,
      lp_token_balance_atomic_snapshot: input.lpTokenBalanceAtomic,
      lp_token_balance_snapshot: input.lpTokenBalanceUi,
      lp_token_account: input.lpTokenAccount,
      lp_snapshot_signature: input.transactionSignature,
      lp_snapshot_at: input.updatedAt,
      updated_at: input.updatedAt,
      last_seen_at: input.updatedAt,
    },
    { onConflict: "wallet_address" },
  );

  if (claim.error) {
    const compat = await upsertCompatHolderProfileProjection(supabase, {
      wallet_address: input.walletAddress,
      lp_token_balance_atomic_snapshot: input.lpTokenBalanceAtomic,
      lp_token_balance_snapshot: input.lpTokenBalanceUi,
      lp_token_account: input.lpTokenAccount,
      lp_snapshot_signature: input.transactionSignature,
      lp_snapshot_at: input.updatedAt,
      updated_at: input.updatedAt,
    });

    if (compat) return { persisted: true, persistError: null };

    return {
      persisted: false,
      persistError:
        "LP balance loaded, but wallet claim storage is not ready. Apply supabase/bearco_holder_profiles.sql and retry.",
    };
  }

  await upsertLegacyHolderProfileProjection(supabase, {
    profile_id: profileId,
    wallet_address: input.walletAddress,
    lp_token_balance_atomic_snapshot: input.lpTokenBalanceAtomic,
    lp_token_balance_snapshot: input.lpTokenBalanceUi,
    lp_token_account: input.lpTokenAccount,
    lp_snapshot_signature: input.transactionSignature,
    lp_snapshot_at: input.updatedAt,
    updated_at: input.updatedAt,
    last_seen_at: input.updatedAt,
  });

  await recordIdentityEvent(supabase, {
    event_type: "lp_snapshot_recorded",
    profile_id: profileId,
    wallet_address: input.walletAddress,
    metadata: {
      lpTokenAccount: input.lpTokenAccount,
      transactionSignature: input.transactionSignature,
    },
  });

  return { persisted: true, persistError: null };
}

export async function listHolderFeedback(): Promise<{
  feedback: BearcoHolderFeedback[];
  storageReady: boolean;
}> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return { feedback: [], storageReady: false };

  const extended = await supabase
    .from("bearco_holder_feedback")
    .select(HOLDER_FEEDBACK_SELECT)
    .order("created_at", { ascending: false })
    .limit(25);

  if (!extended.error) {
    return {
      feedback: (extended.data || []) as BearcoHolderFeedback[],
      storageReady: true,
    };
  }

  const { data, error } = await supabase
    .from("bearco_holder_feedback")
    .select(
      "id, wallet_address, display_name_snapshot, x_username_snapshot, telegram_username_snapshot, holder_percent_snapshot, category, message, status, created_at, updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) return listCompatHolderFeedback(supabase);
  return {
    feedback: (data || []) as BearcoHolderFeedback[],
    storageReady: true,
  };
}

export async function createHolderFeedback(input: {
  walletAddress: string;
  category: string;
  message: string;
  holder: BearcoHolderProfile;
}): Promise<{ persisted: boolean; feedback: BearcoHolderFeedback | null }> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return { persisted: false, feedback: null };

  const profile = input.holder.profile;
  const payload = {
    profile_id: profile?.profile_id || null,
    wallet_address: input.walletAddress,
    display_name_snapshot: profile?.display_name || null,
    x_username_snapshot: profile?.x_username || null,
    telegram_username_snapshot: profile?.telegram_username || null,
    discord_username_snapshot: profile?.discord_username || null,
    holder_percent_snapshot: input.holder.holderPercent,
    category: input.category,
    message: input.message,
    status: "open",
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("bearco_holder_feedback")
    .insert(payload)
    .select(HOLDER_FEEDBACK_SELECT)
    .single();

  if (!error) return { persisted: true, feedback: data as BearcoHolderFeedback };

  const fallbackPayload = {
    wallet_address: input.walletAddress,
    display_name_snapshot: profile?.display_name || null,
    x_username_snapshot: profile?.x_username || null,
    telegram_username_snapshot: profile?.telegram_username || null,
    holder_percent_snapshot: input.holder.holderPercent,
    category: input.category,
    message: input.message,
    status: "open",
    updated_at: new Date().toISOString(),
  };

  const fallback = await supabase
    .from("bearco_holder_feedback")
    .insert(fallbackPayload)
    .select(LEGACY_HOLDER_FEEDBACK_SELECT)
    .single();

  if (fallback.error) {
    const now = new Date().toISOString();
    const compatFeedback: BearcoHolderFeedback = {
      category: input.category,
      created_at: now,
      display_name_snapshot: profile?.display_name || null,
      discord_username_snapshot: profile?.discord_username || null,
      holder_percent_snapshot: input.holder.holderPercent,
      id: randomUUID(),
      message: input.message,
      profile_id: profile?.profile_id || null,
      status: "open",
      telegram_username_snapshot: profile?.telegram_username || null,
      updated_at: now,
      wallet_address: input.walletAddress,
      x_username_snapshot: profile?.x_username || null,
    };
    const persisted = await appendCompatHolderFeedback(
      supabase,
      input.walletAddress,
      compatFeedback,
      profile,
    );
    return {
      feedback: persisted ? compatFeedback : null,
      persisted,
    };
  }
  return { persisted: true, feedback: fallback.data as BearcoHolderFeedback };
}
