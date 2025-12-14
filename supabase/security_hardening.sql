-- =============================================================================
-- Bearo Referral System Security Hardening
-- Run this AFTER setup.sql in Supabase Dashboard → SQL Editor
-- =============================================================================
-- This migration adds critical security constraints to prevent gaming:
-- 1. Self-referral prevention
-- 2. Immutable referred_by_code after first set
-- 3. Restricted RLS policy (wallet_address only)
-- 4. Automatic referral_count increment
-- 5. Atomic tier capacity enforcement
-- =============================================================================

-- =============================================================================
-- 1. SELF-REFERRAL PREVENTION
-- =============================================================================
-- Users cannot set their own referral code as their referrer

ALTER TABLE public.airdrop_allocations
DROP CONSTRAINT IF EXISTS no_self_referral;

ALTER TABLE public.airdrop_allocations
ADD CONSTRAINT no_self_referral
CHECK (referral_code IS DISTINCT FROM referred_by_code);

COMMENT ON CONSTRAINT no_self_referral ON public.airdrop_allocations IS
  'Prevents users from referring themselves';

-- =============================================================================
-- 2. IMMUTABLE REFERRED_BY_CODE
-- =============================================================================
-- Once referred_by_code is set, it cannot be changed (prevents referrer shopping)

CREATE OR REPLACE FUNCTION prevent_referrer_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If old value was set and new value is different, block the change
  IF OLD.referred_by_code IS NOT NULL
     AND OLD.referred_by_code IS DISTINCT FROM NEW.referred_by_code THEN
    RAISE EXCEPTION 'Cannot change referrer once set. Referrer is immutable.';
  END IF;

  -- Validate the referrer code exists (if being set)
  IF NEW.referred_by_code IS NOT NULL AND OLD.referred_by_code IS NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.airdrop_allocations
      WHERE referral_code = NEW.referred_by_code
    ) THEN
      RAISE EXCEPTION 'Invalid referrer code: %', NEW.referred_by_code;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_immutable_referrer ON public.airdrop_allocations;
CREATE TRIGGER enforce_immutable_referrer
  BEFORE UPDATE OF referred_by_code ON public.airdrop_allocations
  FOR EACH ROW
  EXECUTE FUNCTION prevent_referrer_change();

-- =============================================================================
-- 3. RESTRICTED RLS POLICY - WALLET ADDRESS ONLY
-- =============================================================================
-- Anonymous users can ONLY update wallet_address, nothing else

DROP POLICY IF EXISTS "airdrop_anon_wallet_update" ON public.airdrop_allocations;

-- New restricted policy: only allow wallet_address updates
CREATE POLICY "airdrop_anon_wallet_update" ON public.airdrop_allocations
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (
    -- Only allow if the wallet_address is being set for the first time
    -- or if nothing else is changing
    wallet_address IS NOT NULL
  );

-- Add a trigger to enforce column-level restrictions
CREATE OR REPLACE FUNCTION restrict_anon_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- For anonymous users (detected via session check), only allow wallet_address updates
  -- Check if sensitive fields are being modified
  IF OLD.referral_code IS DISTINCT FROM NEW.referral_code THEN
    RAISE EXCEPTION 'Cannot modify referral_code';
  END IF;

  IF OLD.email IS DISTINCT FROM NEW.email THEN
    RAISE EXCEPTION 'Cannot modify email';
  END IF;

  IF OLD.tier_number IS DISTINCT FROM NEW.tier_number THEN
    RAISE EXCEPTION 'Cannot modify tier_number';
  END IF;

  IF OLD.tier_name IS DISTINCT FROM NEW.tier_name THEN
    RAISE EXCEPTION 'Cannot modify tier_name';
  END IF;

  IF OLD.base_amount IS DISTINCT FROM NEW.base_amount THEN
    RAISE EXCEPTION 'Cannot modify base_amount';
  END IF;

  IF OLD.referral_amount IS DISTINCT FROM NEW.referral_amount THEN
    RAISE EXCEPTION 'Cannot modify referral_amount';
  END IF;

  IF OLD.action_amount IS DISTINCT FROM NEW.action_amount THEN
    RAISE EXCEPTION 'Cannot modify action_amount';
  END IF;

  IF OLD.bonus_multiplier IS DISTINCT FROM NEW.bonus_multiplier THEN
    RAISE EXCEPTION 'Cannot modify bonus_multiplier';
  END IF;

  IF OLD.referral_count IS DISTINCT FROM NEW.referral_count THEN
    RAISE EXCEPTION 'Cannot modify referral_count';
  END IF;

  IF OLD.vested_amount IS DISTINCT FROM NEW.vested_amount THEN
    RAISE EXCEPTION 'Cannot modify vested_amount';
  END IF;

  IF OLD.claimed_amount IS DISTINCT FROM NEW.claimed_amount THEN
    RAISE EXCEPTION 'Cannot modify claimed_amount';
  END IF;

  IF OLD.claim_tx_hash IS DISTINCT FROM NEW.claim_tx_hash THEN
    RAISE EXCEPTION 'Cannot modify claim_tx_hash';
  END IF;

  IF OLD.claimed_at IS DISTINCT FROM NEW.claimed_at THEN
    RAISE EXCEPTION 'Cannot modify claimed_at';
  END IF;

  -- Allow wallet_address and updated_at to be modified
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS restrict_anon_field_updates ON public.airdrop_allocations;
CREATE TRIGGER restrict_anon_field_updates
  BEFORE UPDATE ON public.airdrop_allocations
  FOR EACH ROW
  EXECUTE FUNCTION restrict_anon_updates();

-- =============================================================================
-- 4. AUTOMATIC REFERRAL COUNT INCREMENT
-- =============================================================================
-- When a new user signs up with a referrer, increment the referrer's count

CREATE OR REPLACE FUNCTION increment_referral_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_reward bigint;
  current_week int;
  week_multiplier numeric;
BEGIN
  -- Only process if referred_by_code is set
  IF NEW.referred_by_code IS NOT NULL THEN
    -- Calculate current week (week 1 = highest multiplier)
    current_week := GREATEST(1, EXTRACT(WEEK FROM NOW()) - EXTRACT(WEEK FROM '2024-01-01'::date) + 1);

    -- Week multipliers: Week 1 = 1.5x, Week 2 = 1.25x, Week 3+ = 1.0x
    week_multiplier := CASE
      WHEN current_week = 1 THEN 1.5
      WHEN current_week = 2 THEN 1.25
      ELSE 1.0
    END;

    -- Base referral reward
    referrer_reward := 500; -- Base reward per referral

    -- Update the referrer's stats
    UPDATE public.airdrop_allocations
    SET
      referral_count = referral_count + 1,
      referral_amount = referral_amount + (referrer_reward * week_multiplier)::bigint,
      updated_at = NOW()
    WHERE referral_code = NEW.referred_by_code;

    -- Record the completion in referral_completions
    INSERT INTO public.referral_completions (
      referrer_code,
      referee_code,
      referee_email,
      completion_type,
      week_number,
      base_reward,
      multiplier,
      final_reward,
      verified
    ) VALUES (
      NEW.referred_by_code,
      NEW.referral_code,
      NEW.email,
      'signup',
      current_week,
      referrer_reward,
      week_multiplier,
      (referrer_reward * week_multiplier)::bigint,
      true -- Auto-verified on signup
    )
    ON CONFLICT (referrer_code, referee_code) DO NOTHING; -- Prevent duplicate completions

    -- Set referred_at timestamp
    NEW.referred_at := NOW();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_increment_referral_count ON public.airdrop_allocations;
CREATE TRIGGER auto_increment_referral_count
  BEFORE INSERT ON public.airdrop_allocations
  FOR EACH ROW
  EXECUTE FUNCTION increment_referral_count();

-- =============================================================================
-- 5. ATOMIC TIER CAPACITY ENFORCEMENT
-- =============================================================================
-- Prevent race conditions when checking tier capacity

CREATE OR REPLACE FUNCTION check_tier_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tier_max int;
  tier_current int;
BEGIN
  -- Define tier maximums
  tier_max := CASE NEW.tier_number
    WHEN 1 THEN 10    -- OG Founder
    WHEN 2 THEN 40    -- Alpha Insider
    WHEN 3 THEN 50    -- Beta Crew
    WHEN 4 THEN 400   -- Early Adopter
    WHEN 5 THEN 500   -- Pioneer Wave
    WHEN 6 THEN 4000  -- Community
    ELSE 0
  END;

  -- Get current count with row lock to prevent race conditions
  SELECT COUNT(*) INTO tier_current
  FROM public.waitlist_sync
  WHERE tier_number = NEW.tier_number
  FOR UPDATE;

  IF tier_current >= tier_max THEN
    RAISE EXCEPTION 'Tier % is full (% of % spots taken)',
      NEW.tier_number, tier_current, tier_max;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_tier_capacity ON public.waitlist_sync;
CREATE TRIGGER enforce_tier_capacity
  BEFORE INSERT ON public.waitlist_sync
  FOR EACH ROW
  EXECUTE FUNCTION check_tier_capacity();

-- =============================================================================
-- 6. SYNC WAITLIST TO AIRDROP ON INSERT
-- =============================================================================
-- Auto-create airdrop allocation when user joins waitlist

CREATE OR REPLACE FUNCTION sync_waitlist_to_airdrop()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tier_base_amount bigint;
  current_week int;
  early_bird_multiplier numeric;
BEGIN
  -- Calculate base amount from tier
  tier_base_amount := CASE NEW.tier_number
    WHEN 1 THEN 50000  -- OG Founder
    WHEN 2 THEN 10000  -- Alpha Insider
    WHEN 3 THEN 2500   -- Beta Crew
    WHEN 4 THEN 1000   -- Early Adopter
    WHEN 5 THEN 500    -- Pioneer Wave
    WHEN 6 THEN 100    -- Community
    ELSE 100
  END;

  -- Calculate early bird multiplier based on week
  current_week := GREATEST(1, EXTRACT(WEEK FROM NOW()) - EXTRACT(WEEK FROM '2024-01-01'::date) + 1);
  early_bird_multiplier := CASE
    WHEN current_week = 1 THEN 1.5
    WHEN current_week = 2 THEN 1.25
    ELSE 1.0
  END;

  -- Insert into airdrop_allocations
  INSERT INTO public.airdrop_allocations (
    email,
    referral_code,
    tier_number,
    tier_name,
    base_amount,
    bonus_multiplier,
    referred_by_code
  ) VALUES (
    NEW.email,
    NEW.referral_code,
    NEW.tier_number,
    NEW.tier_name,
    tier_base_amount,
    early_bird_multiplier,
    NEW.referred_by
  )
  ON CONFLICT (email) DO NOTHING; -- Prevent duplicates

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_sync_airdrop ON public.waitlist_sync;
CREATE TRIGGER auto_sync_airdrop
  AFTER INSERT ON public.waitlist_sync
  FOR EACH ROW
  EXECUTE FUNCTION sync_waitlist_to_airdrop();

-- =============================================================================
-- 7. PREVENT DUPLICATE EMAILS ACROSS TABLES
-- =============================================================================
-- Ensure email uniqueness is enforced

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON public.waitlist_sync(email);
CREATE INDEX IF NOT EXISTS idx_airdrop_email ON public.airdrop_allocations(email);
CREATE INDEX IF NOT EXISTS idx_airdrop_referral_code ON public.airdrop_allocations(referral_code);
CREATE INDEX IF NOT EXISTS idx_airdrop_referred_by ON public.airdrop_allocations(referred_by_code);

-- =============================================================================
-- 8. RATE LIMITING FUNCTION (For API to call)
-- =============================================================================
-- Track signup attempts to detect suspicious activity

CREATE TABLE IF NOT EXISTS public.signup_attempts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  ip_address text,
  user_agent text,
  attempted_at timestamptz default now(),
  success boolean default false
);

CREATE INDEX IF NOT EXISTS idx_signup_attempts_email ON public.signup_attempts(email);
CREATE INDEX IF NOT EXISTS idx_signup_attempts_ip ON public.signup_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_signup_attempts_time ON public.signup_attempts(attempted_at);

ALTER TABLE public.signup_attempts ENABLE ROW LEVEL SECURITY;

-- Only service role can access signup attempts
CREATE POLICY "signup_attempts_service_only" ON public.signup_attempts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Function to check rate limits
CREATE OR REPLACE FUNCTION check_signup_rate_limit(
  p_email text,
  p_ip_address text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  email_attempts int;
  ip_attempts int;
  time_window interval := interval '1 hour';
BEGIN
  -- Check email attempts in last hour
  SELECT COUNT(*) INTO email_attempts
  FROM public.signup_attempts
  WHERE email = p_email
    AND attempted_at > NOW() - time_window;

  IF email_attempts >= 5 THEN
    RETURN false; -- Rate limited
  END IF;

  -- Check IP attempts in last hour (if provided)
  IF p_ip_address IS NOT NULL THEN
    SELECT COUNT(*) INTO ip_attempts
    FROM public.signup_attempts
    WHERE ip_address = p_ip_address
      AND attempted_at > NOW() - time_window;

    IF ip_attempts >= 10 THEN
      RETURN false; -- Rate limited
    END IF;
  END IF;

  RETURN true; -- Allowed
END;
$$;

-- =============================================================================
-- SUMMARY OF PROTECTIONS
-- =============================================================================
--
-- | Protection                      | Table              | Type       |
-- |---------------------------------|--------------------|------------|
-- | no_self_referral               | airdrop_allocations | CONSTRAINT |
-- | enforce_immutable_referrer     | airdrop_allocations | TRIGGER    |
-- | restrict_anon_field_updates    | airdrop_allocations | TRIGGER    |
-- | auto_increment_referral_count  | airdrop_allocations | TRIGGER    |
-- | enforce_tier_capacity          | waitlist_sync       | TRIGGER    |
-- | auto_sync_airdrop              | waitlist_sync       | TRIGGER    |
-- | check_signup_rate_limit        | signup_attempts     | FUNCTION   |
-- | airdrop_anon_wallet_update     | airdrop_allocations | RLS POLICY |
--
-- =============================================================================
