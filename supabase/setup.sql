-- Bearo Landing Supabase Setup
-- Run this in Supabase Dashboard → SQL Editor.
-- This creates the tables needed for the waitlist and airdrop system.
--
-- Tables:
-- - public.waitlist_sync (waitlist users with referral codes)
-- - public.airdrop_allocations (token allocations for leaderboard)
-- - public.referral_completions (completed referral audit trail)
-- - public.airdrop_snapshots (weekly snapshots for historical tracking)
--
-- Notes:
-- - RLS is enabled on all tables
-- - The landing page leaderboard needs SELECT on airdrop_allocations
-- - Waitlist signups use INSERT on waitlist_sync

create extension if not exists "pgcrypto";

-- =========================
-- Waitlist Sync
-- =========================
-- Stores waitlist users with their BEAR referral codes
create table if not exists public.waitlist_sync (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  tier_name text,
  tier_number integer,
  signup_position integer,
  referral_code text,                -- User's own BEAR code (e.g., BEARVA59)
  referred_by text,                  -- Who originally referred them (if any)
  synced_at timestamptz default now(),
  -- Retroactive referral linking fields
  linked_referrer_code text,         -- Code they were referred by (retroactive)
  linked_at timestamptz,             -- When they linked
  link_verified boolean default false -- Re-auth completed
);

comment on table public.waitlist_sync is 'Cached waitlist data for referral lookups during signup';

alter table public.waitlist_sync enable row level security;

-- Allow anonymous inserts for waitlist signup
create policy "waitlist_anon_insert" on public.waitlist_sync
  for insert to anon with check (true);

-- Allow public reads for checking referral codes
create policy "waitlist_public_select" on public.waitlist_sync
  for select to anon using (true);

-- =========================
-- Airdrop Allocations
-- =========================
-- Tracks $BEARO token allocations for each user
create table if not exists public.airdrop_allocations (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  referral_code text not null unique,
  tier_number integer not null,
  tier_name text not null,

  -- Token amounts (in $BEARO)
  base_amount bigint not null default 0,      -- From tier
  referral_amount bigint not null default 0,  -- From referrals
  action_amount bigint not null default 0,    -- From in-app actions
  bonus_multiplier numeric not null default 1.0,  -- Early bird multiplier

  -- Referral tracking
  referral_count integer not null default 0,
  referred_by_code text,              -- Who referred this user
  referred_at timestamptz,            -- When they were referred
  link_verified boolean default false,
  link_verified_at timestamptz,

  -- Vesting & claiming
  vested_amount bigint not null default 0,
  claimed_amount bigint not null default 0,
  wallet_address text,
  claim_tx_hash text,
  claimed_at timestamptz,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on table public.airdrop_allocations is 'Tracks $BEARO token allocations for waitlist and app users';

alter table public.airdrop_allocations enable row level security;

-- Allow public reads for leaderboard
create policy "airdrop_public_select" on public.airdrop_allocations
  for select to anon using (true);

-- Allow service role full access
create policy "airdrop_service_role" on public.airdrop_allocations
  for all to service_role using (true) with check (true);

-- Allow anonymous users to update wallet_address (for waitlist wallet linking)
create policy "airdrop_anon_wallet_update" on public.airdrop_allocations
  for update to anon using (true) with check (true);

-- =========================
-- Referral Completions
-- =========================
-- Audit trail for completed referrals
create table if not exists public.referral_completions (
  id uuid primary key default gen_random_uuid(),
  referrer_code text not null,        -- Who gets the reward
  referee_code text not null,         -- Who was referred
  referee_email text not null,

  -- Completion info
  completion_type text not null check (completion_type in ('signup', 'topup', 'transaction', 'retroactive')),
  completed_at timestamptz default now(),

  -- Reward calculation
  week_number integer not null default 1,   -- For early bird multiplier
  base_reward bigint not null,
  multiplier numeric not null default 1.0,
  final_reward bigint not null,

  -- Verification
  verified boolean default false,
  verified_at timestamptz,

  unique(referrer_code, referee_code)  -- One completion per pair
);

comment on table public.referral_completions is 'Records completed referrals and their rewards';

alter table public.referral_completions enable row level security;

-- Allow public reads for transparency
create policy "completions_public_select" on public.referral_completions
  for select to anon using (true);

-- Allow service role full access
create policy "completions_service_role" on public.referral_completions
  for all to service_role using (true) with check (true);

-- =========================
-- Airdrop Snapshots
-- =========================
-- Weekly snapshots for leaderboard history
create table if not exists public.airdrop_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null,
  week_number integer not null,

  email text not null,
  referral_code text not null,
  tier_number integer not null,
  tier_name text not null,

  referral_count integer not null default 0,
  base_amount bigint not null default 0,
  referral_amount bigint not null default 0,
  action_amount bigint not null default 0,
  projected_total bigint not null default 0,

  rank integer,

  created_at timestamptz default now(),

  unique(snapshot_date, email)
);

comment on table public.airdrop_snapshots is 'Weekly snapshots for leaderboard and historical tracking';

alter table public.airdrop_snapshots enable row level security;

-- Allow public reads
create policy "snapshots_public_select" on public.airdrop_snapshots
  for select to anon using (true);

-- Allow service role full access
create policy "snapshots_service_role" on public.airdrop_snapshots
  for all to service_role using (true) with check (true);

-- =========================
-- Helper Function: Generate Referral Code
-- =========================
create or replace function generate_referral_code()
returns text
language plpgsql
set search_path = public
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := 'BEAR';
  i int;
begin
  for i in 1..4 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$;

-- =========================
-- Trigger: Auto-generate referral code on waitlist insert
-- =========================
create or replace function set_waitlist_referral_code()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if NEW.referral_code is null then
    NEW.referral_code := generate_referral_code();
  end if;
  return NEW;
end;
$$;

drop trigger if exists waitlist_set_referral_code on public.waitlist_sync;
create trigger waitlist_set_referral_code
  before insert on public.waitlist_sync
  for each row
  execute function set_waitlist_referral_code();
