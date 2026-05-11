import "server-only";
import crypto from "crypto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Platform } from "./deviceDetection";
import { addBetaTester, isConfigured as isTestFlightConfigured } from "./appStoreConnect";
import { IOS_TESTFLIGHT_URL, ANDROID_PLAY_TESTING_URL } from "./downloadLinks";

export const REFERRAL_CODE_PATTERN = /^BEAR[A-Z0-9]{4}$/;
export const DEFAULT_CLAIM_TIER_NUMBER = 6;
export const DEFAULT_CLAIM_TIER_NAME = "Community";

const THIRDWEB_API = "https://api.thirdweb.com/v1";
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const EMAIL_OTP_LIMIT = 3;
const IP_OTP_LIMIT = 10;
const INVITE_RESEND_WINDOW_MS = 24 * 60 * 60 * 1000;

type WaitlistMetadata = Record<string, unknown>;

interface ReferralClaimRow {
  id: string;
  email: string;
  referrer_code: string;
  last_invite_attempt_at: string | null;
  invite_resend_count: number | null;
  metadata: WaitlistMetadata | null;
}

interface WaitlistRow {
  email: string;
  referral_code: string | null;
  referred_by: string | null;
  metadata: WaitlistMetadata | null;
}

interface ReferralClaimResult {
  email: string;
  requestedReferrerCode: string;
  effectiveReferrerCode: string;
  attributionStatus: "new" | "repeat_same_referrer" | "different_referrer_exists";
  platform: Platform;
  referralCode: string | null;
  ctaUrl: string | null;
  invite: {
    attempted: boolean;
    skippedReason?: string;
    success?: boolean;
    alreadyInvited?: boolean;
    error?: string;
  };
  reconcile?: Record<string, unknown>;
}

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null;
}

export function normalizeReferralCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return REFERRAL_CODE_PATTERN.test(normalized) ? normalized : null;
}

export function normalizePlatform(value: unknown): Platform {
  return value === "ios" || value === "android" || value === "desktop" || value === "unknown"
    ? value
    : "unknown";
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded
    || req.headers.get("x-real-ip")
    || req.headers.get("cf-connecting-ip")
    || "unknown";
}

export function getSupabaseServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEX_SUPABASE_SERVICE_KEY || "";

  if (!url || !serviceKey) {
    throw new Error("Supabase service configuration missing");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function hashIdentifier(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function enforceOtpRateLimit(
  supabase: SupabaseClient,
  params: { email: string; ip: string }
): Promise<{ allowed: true } | { allowed: false; reason: string }> {
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const checks = [
    { scope: "email", id: params.email, max: EMAIL_OTP_LIMIT },
    { scope: "ip", id: params.ip, max: IP_OTP_LIMIT },
  ] as const;

  for (const check of checks) {
    const identifierHash = hashIdentifier(`${check.scope}:${check.id}`);
    const { count, error } = await supabase
      .from("referral_claim_rate_events")
      .select("*", { count: "exact", head: true })
      .eq("scope", check.scope)
      .eq("identifier_hash", identifierHash)
      .eq("action", "otp_send")
      .gte("created_at", since);

    if (error) {
      throw new Error(`Rate limit lookup failed: ${error.message}`);
    }
    if ((count ?? 0) >= check.max) {
      return { allowed: false, reason: `${check.scope}_rate_limited` };
    }
  }

  for (const check of checks) {
    const identifierHash = hashIdentifier(`${check.scope}:${check.id}`);
    const { error } = await supabase.from("referral_claim_rate_events").insert({
      scope: check.scope,
      identifier_hash: identifierHash,
      action: "otp_send",
      metadata: { windowSeconds: RATE_LIMIT_WINDOW_MS / 1000 },
    });
    if (error) {
      throw new Error(`Rate limit write failed: ${error.message}`);
    }
  }

  return { allowed: true };
}

export async function verifyCaptchaToken(token: unknown, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  const captchaRequired = process.env.REFERRAL_CLAIM_CAPTCHA_REQUIRED !== "false";

  if (!secret) {
    return process.env.NODE_ENV !== "production" || !captchaRequired;
  }
  if (typeof token !== "string" || !token.trim()) {
    return false;
  }

  const body = new URLSearchParams({
    secret,
    response: token,
  });
  if (ip !== "unknown") {
    body.set("remoteip", ip);
  }

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });
  if (!response.ok) return false;

  const result = await response.json().catch(() => ({ success: false }));
  return result?.success === true;
}

export async function initiateThirdwebEmailOtp(email: string): Promise<Record<string, unknown>> {
  const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "";
  if (!clientId) throw new Error("Thirdweb Client ID not configured");

  const response = await fetch(`${THIRDWEB_API}/auth/initiate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": clientId,
    },
    body: JSON.stringify({ method: "email", email }),
  });

  const data = await response.json().catch(async () => ({ message: await response.text().catch(() => "") }));
  if (!response.ok) {
    throw new Error(data?.message || data?.error?.message || `Thirdweb initiate failed (${response.status})`);
  }
  return data as Record<string, unknown>;
}

export async function completeThirdwebEmailOtp(
  email: string,
  otp: string,
  challenge?: unknown
): Promise<{ userId: string; raw: Record<string, unknown> }> {
  const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "";
  if (!clientId) throw new Error("Thirdweb Client ID not configured");

  const requestBodies: Array<Record<string, unknown>> = [
    { method: "email", email, code: otp },
    { method: "email", email, verificationCode: otp },
  ];
  if (challenge) {
    requestBodies.forEach((body) => {
      body.challenge = challenge;
    });
  }

  let lastError = "Invalid verification code";
  for (const body of requestBodies) {
    const response = await fetch(`${THIRDWEB_API}/auth/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": clientId,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(async () => ({ message: await response.text().catch(() => "") }));
    if (response.ok && typeof data?.userId === "string") {
      return { userId: data.userId, raw: data as Record<string, unknown> };
    }
    lastError = data?.message || data?.error?.message || lastError;
  }

  throw new Error(lastError);
}

function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "BEAR";
  for (let i = 0; i < 4; i += 1) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function referralCodeExists(supabase: SupabaseClient, code: string): Promise<boolean> {
  const tables = ["airdrop_allocations", "waitlist", "waitlist_sync"];
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select("referral_code")
      .ilike("referral_code", code)
      .limit(1)
      .maybeSingle();
    if (error && error.code !== "42P01") {
      throw new Error(`Referral lookup failed in ${table}: ${error.message}`);
    }
    if (data) return true;
  }
  return false;
}

async function fetchWaitlistRow(supabase: SupabaseClient, email: string): Promise<WaitlistRow | null> {
  const { data, error } = await supabase
    .from("waitlist")
    .select("email, referral_code, referred_by, metadata")
    .eq("email", email)
    .maybeSingle<WaitlistRow>();
  if (error) throw new Error(`Waitlist lookup failed: ${error.message}`);
  return data ?? null;
}

async function fetchClaimRow(supabase: SupabaseClient, email: string): Promise<ReferralClaimRow | null> {
  const { data, error } = await supabase
    .from("referral_claims")
    .select("id, email, referrer_code, last_invite_attempt_at, invite_resend_count, metadata")
    .eq("email", email)
    .maybeSingle<ReferralClaimRow>();
  if (error) throw new Error(`Referral claim lookup failed: ${error.message}`);
  return data ?? null;
}

function shouldAttemptInvite(lastAttempt: string | null | undefined): boolean {
  if (!lastAttempt) return true;
  const timestamp = new Date(lastAttempt).getTime();
  if (!Number.isFinite(timestamp)) return true;
  return Date.now() - timestamp > INVITE_RESEND_WINDOW_MS;
}

async function writeAirdropCompatibilityRow(
  supabase: SupabaseClient,
  params: { email: string; referralCode: string; referrerCode: string }
) {
  await supabase.from("airdrop_allocations").insert({
    email: params.email,
    referral_code: params.referralCode,
    tier_name: DEFAULT_CLAIM_TIER_NAME,
    tier_number: DEFAULT_CLAIM_TIER_NUMBER,
    base_amount: 100,
    referral_amount: 0,
    action_amount: 0,
    bonus_multiplier: 1.0,
    referral_count: 0,
    referred_by_code: params.referrerCode,
  });
}

async function ensureWaitlistRow(
  supabase: SupabaseClient,
  params: {
    email: string;
    effectiveReferrerCode: string;
    thirdwebUserId: string;
    platform: Platform;
    previousRow: WaitlistRow | null;
  }
): Promise<{ referralCode: string | null; metadata: WaitlistMetadata }> {
  const now = new Date().toISOString();

  if (params.previousRow) {
    const previousMetadata = params.previousRow.metadata || {};
    const nextMetadata = {
      ...previousMetadata,
      referral_claim_verified_at: now,
      referral_claim_source: "refer_page",
    };

    const updates: Record<string, unknown> = {
      verified: true,
      verified_at: now,
      thirdweb_user_id: params.thirdwebUserId,
      platform: params.platform,
      metadata: nextMetadata,
    };
    if (!params.previousRow.referred_by) {
      updates.referred_by = params.effectiveReferrerCode;
    }

    const { error } = await supabase
      .from("waitlist")
      .update(updates)
      .eq("email", params.email);
    if (error) throw new Error(`Waitlist update failed: ${error.message}`);

    return { referralCode: params.previousRow.referral_code, metadata: nextMetadata };
  }

  const { count } = await supabase
    .from("waitlist")
    .select("*", { count: "exact", head: true });
  const signupPosition = (count ?? 0) + 1;

  let referralCode: string | null = null;
  let insertError: Error | null = null;
  const metadata = {
    referral_claim_verified_at: now,
    referral_claim_source: "refer_page",
  };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    referralCode = generateReferralCode();
    const { error } = await supabase.from("waitlist").insert({
      email: params.email,
      tier_name: DEFAULT_CLAIM_TIER_NAME,
      tier_number: DEFAULT_CLAIM_TIER_NUMBER,
      signup_position: signupPosition,
      referral_code: referralCode,
      referred_by: params.effectiveReferrerCode,
      thirdweb_user_id: params.thirdwebUserId,
      verified: true,
      verified_at: now,
      platform: params.platform,
      metadata,
    });

    if (!error) {
      try {
        await writeAirdropCompatibilityRow(supabase, {
          email: params.email,
          referralCode,
          referrerCode: params.effectiveReferrerCode,
        });
      } catch {
        // Compatibility row is non-blocking; current app rewards do not trust it.
      }
      return { referralCode, metadata };
    }

    insertError = new Error(error.message);
    if (error.code === "23505") {
      const existing = await fetchWaitlistRow(supabase, params.email);
      if (existing) {
        return ensureWaitlistRow(supabase, { ...params, previousRow: existing });
      }
    }
  }

  throw insertError || new Error("Waitlist insert failed");
}

async function updateClaimInviteState(
  supabase: SupabaseClient,
  claimId: string,
  metadata: WaitlistMetadata,
  inviteResendCount?: number
) {
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    last_invite_attempt_at: now,
    metadata,
    updated_at: now,
  };
  if (typeof inviteResendCount === "number") {
    updates.invite_resend_count = inviteResendCount;
  }

  const { error } = await supabase
    .from("referral_claims")
    .update(updates)
    .eq("id", claimId);
  if (error) throw new Error(`Referral claim invite update failed: ${error.message}`);
}

async function updateClaimMetadata(
  supabase: SupabaseClient,
  claimId: string,
  metadata: WaitlistMetadata
) {
  const { error } = await supabase
    .from("referral_claims")
    .update({
      metadata,
      updated_at: new Date().toISOString(),
    })
    .eq("id", claimId);
  if (error) throw new Error(`Referral claim metadata update failed: ${error.message}`);
}

async function maybeSendInvite(
  supabase: SupabaseClient,
  params: {
    email: string;
    platform: Platform;
    claim: ReferralClaimRow;
    waitlistMetadata: WaitlistMetadata;
  }
): Promise<ReferralClaimResult["invite"] & { ctaUrl: string | null; metadata: WaitlistMetadata }> {
  const now = new Date().toISOString();
  const metadata = { ...params.waitlistMetadata };
  const attemptAllowed = shouldAttemptInvite(params.claim.last_invite_attempt_at);

  if (params.platform === "ios") {
    if (!attemptAllowed) {
      return {
        attempted: false,
        skippedReason: "resend_throttled",
        ctaUrl: IOS_TESTFLIGHT_URL,
        metadata,
      };
    }

    metadata.testflight_checked_at = now;

    if (!isTestFlightConfigured()) {
      metadata.testflight_invited = false;
      metadata.testflight_skipped_reason = "not_configured";
      await updateClaimInviteState(supabase, params.claim.id, metadata, (params.claim.invite_resend_count ?? 0) + 1);
      return {
        attempted: true,
        skippedReason: "not_configured",
        success: false,
        ctaUrl: IOS_TESTFLIGHT_URL,
        metadata,
      };
    }

    const result = await addBetaTester(params.email);
    metadata.testflight_invited = result.success;
    metadata.testflight_invited_at = now;
    metadata.testflight_already_invited = result.alreadyInvited || false;
    if (result.error) {
      metadata.testflight_error = result.error;
    } else {
      delete metadata.testflight_error;
      delete metadata.testflight_skipped_reason;
    }

    await updateClaimInviteState(supabase, params.claim.id, metadata, (params.claim.invite_resend_count ?? 0) + 1);
    return {
      attempted: true,
      success: result.success,
      alreadyInvited: result.alreadyInvited,
      error: result.error,
      ctaUrl: IOS_TESTFLIGHT_URL,
      metadata,
    };
  }

  if (params.platform === "android") {
    metadata.android_beta_checked_at = now;
    if (ANDROID_PLAY_TESTING_URL) {
      metadata.android_beta_status = "opt_in_ready";
      await updateClaimMetadata(supabase, params.claim.id, metadata);
      return {
        attempted: false,
        skippedReason: "play_open_testing_url",
        success: true,
        ctaUrl: ANDROID_PLAY_TESTING_URL,
        metadata,
      };
    }

    metadata.android_beta_status = "queued";
    metadata.android_beta_skipped_reason = "play_open_testing_url_not_configured";
    await updateClaimMetadata(supabase, params.claim.id, metadata);
    return {
      attempted: false,
      skippedReason: "play_open_testing_url_not_configured",
      success: false,
      ctaUrl: null,
      metadata,
    };
  }

  metadata.beta_invite_status = "platform_unknown";
  return { attempted: false, skippedReason: "platform_unknown", ctaUrl: IOS_TESTFLIGHT_URL, metadata };
}

async function callReconcileClaimedReferral(email: string): Promise<Record<string, unknown> | undefined> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEX_SUPABASE_SERVICE_KEY || "";
  if (!supabaseUrl || !serviceKey) return undefined;

  const endpoint = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/handle-referrals`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ action: "reconcileClaimedReferral", verifiedEmail: email }),
  });

  const body = await response.json().catch(() => ({}));
  return {
    status: response.status,
    ok: response.ok,
    ...body,
  };
}

export async function processVerifiedReferralClaim(params: {
  email: string;
  referrerCode: string;
  platform: Platform;
  thirdwebUserId: string;
}): Promise<ReferralClaimResult> {
  const supabase = getSupabaseServiceClient();
  const email = normalizeEmail(params.email);
  if (!email) {
    throw new Error("Enter a valid email.");
  }

  const requestedReferrerCode = params.referrerCode;

  const referrerExists = await referralCodeExists(supabase, requestedReferrerCode);
  if (!referrerExists) {
    throw new Error("Referral code not found");
  }

  const existingWaitlist = await fetchWaitlistRow(supabase, email);
  const existingClaim = await fetchClaimRow(supabase, email);
  const waitlistReferrer = normalizeReferralCode(existingWaitlist?.referred_by);
  const effectiveReferrerCode = existingClaim?.referrer_code || waitlistReferrer || requestedReferrerCode;
  const attributionStatus: ReferralClaimResult["attributionStatus"] = existingClaim
    ? (existingClaim.referrer_code === requestedReferrerCode ? "repeat_same_referrer" : "different_referrer_exists")
    : "new";

  const claim = existingClaim || await insertReferralClaim(supabase, {
    email,
    referrerCode: effectiveReferrerCode,
    platform: params.platform,
    thirdwebUserId: params.thirdwebUserId,
  });

  const waitlist = await ensureWaitlistRow(supabase, {
    email,
    effectiveReferrerCode,
    thirdwebUserId: params.thirdwebUserId,
    platform: params.platform,
    previousRow: existingWaitlist,
  });

  const invite = await maybeSendInvite(supabase, {
    email,
    platform: params.platform,
    claim,
    waitlistMetadata: waitlist.metadata,
  });

  await supabase
    .from("waitlist")
    .update({ metadata: invite.metadata })
    .eq("email", email);

  const reconcile = await callReconcileClaimedReferral(email).catch((error) => {
    const message = error instanceof Error ? error.message : "Reconcile call failed";
    console.warn("[referral-claim/reconcile]", message, {
      emailHash: hashIdentifier(`email:${email}`),
      effectiveReferrerCode,
      requestedReferrerCode,
    });
    return { ok: false, error: message };
  });

  return {
    email,
    requestedReferrerCode,
    effectiveReferrerCode,
    attributionStatus,
    platform: params.platform,
    referralCode: waitlist.referralCode,
    ctaUrl: invite.ctaUrl,
    invite: {
      attempted: invite.attempted,
      skippedReason: invite.skippedReason,
      success: invite.success,
      alreadyInvited: invite.alreadyInvited,
      error: invite.error,
    },
    reconcile,
  };
}

async function insertReferralClaim(
  supabase: SupabaseClient,
  params: {
    email: string;
    referrerCode: string;
    platform: Platform;
    thirdwebUserId: string;
  }
): Promise<ReferralClaimRow> {
  const idempotencyKey = `referral_claim:${params.email}:${params.referrerCode}`;
  const { data, error } = await supabase
    .from("referral_claims")
    .insert({
      email: params.email,
      referrer_code: params.referrerCode,
      idempotency_key: idempotencyKey,
      platform: params.platform,
      thirdweb_user_id: params.thirdwebUserId,
      metadata: { source: "refer_page" },
    })
    .select("id, email, referrer_code, last_invite_attempt_at, invite_resend_count, metadata")
    .single<ReferralClaimRow>();

  if (!error && data) return data;

  if (error?.code === "23505") {
    const existing = await fetchClaimRow(supabase, params.email);
    if (existing) return existing;
  }

  throw new Error(error?.message || "Referral claim insert failed");
}
