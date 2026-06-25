-- $BEARCO holder identity graph
-- Apply before relying on persisted wallet claims, social identities, LP
-- snapshots, or holder feedback.

create table if not exists public.bearco_profiles (
  id uuid primary key default gen_random_uuid(),
  display_name text,
  profile_slug text,
  social_claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bearco_profiles
  add column if not exists display_name text,
  add column if not exists profile_slug text,
  add column if not exists social_claimed_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_bearco_profiles_slug
  on public.bearco_profiles(lower(profile_slug))
  where profile_slug is not null;

create index if not exists idx_bearco_profiles_updated
  on public.bearco_profiles(updated_at desc);

create table if not exists public.bearco_wallet_claims (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.bearco_profiles(id) on delete cascade,
  wallet_address text not null unique,
  claim_method text not null default 'solana_signature',
  holder_percent_snapshot numeric(12, 8) not null default 0,
  token_balance_snapshot numeric(30, 8) not null default 0,
  lp_token_balance_atomic_snapshot text,
  lp_token_balance_snapshot text,
  lp_token_account text,
  lp_snapshot_signature text,
  lp_snapshot_at timestamptz,
  claimed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

alter table public.bearco_wallet_claims
  add column if not exists profile_id uuid references public.bearco_profiles(id) on delete cascade,
  add column if not exists wallet_address text,
  add column if not exists claim_method text not null default 'solana_signature',
  add column if not exists holder_percent_snapshot numeric(12, 8) not null default 0,
  add column if not exists token_balance_snapshot numeric(30, 8) not null default 0,
  add column if not exists lp_token_balance_atomic_snapshot text,
  add column if not exists lp_token_balance_snapshot text,
  add column if not exists lp_token_account text,
  add column if not exists lp_snapshot_signature text,
  add column if not exists lp_snapshot_at timestamptz,
  add column if not exists claimed_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists last_seen_at timestamptz not null default now();

create unique index if not exists idx_bearco_wallet_claims_wallet
  on public.bearco_wallet_claims(wallet_address);

create index if not exists idx_bearco_wallet_claims_profile
  on public.bearco_wallet_claims(profile_id);

create index if not exists idx_bearco_wallet_claims_percent
  on public.bearco_wallet_claims(holder_percent_snapshot desc);

create index if not exists idx_bearco_wallet_claims_lp_snapshot
  on public.bearco_wallet_claims(lp_snapshot_at desc)
  where lp_snapshot_at is not null;

create table if not exists public.bearco_social_identities (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.bearco_profiles(id) on delete cascade,
  provider text not null check (provider in ('x', 'telegram', 'discord')),
  provider_user_id text,
  username text,
  display_name text,
  auth_source text not null default 'oauth' check (auth_source in ('oauth', 'legacy')),
  authenticated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bearco_social_identities
  add column if not exists profile_id uuid references public.bearco_profiles(id) on delete cascade,
  add column if not exists provider text,
  add column if not exists provider_user_id text,
  add column if not exists username text,
  add column if not exists display_name text,
  add column if not exists auth_source text not null default 'oauth',
  add column if not exists authenticated_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists idx_bearco_social_identities_provider_user
  on public.bearco_social_identities(provider, provider_user_id)
  where provider_user_id is not null;

create unique index if not exists idx_bearco_social_identities_profile_provider
  on public.bearco_social_identities(profile_id, provider);

create index if not exists idx_bearco_social_identities_username
  on public.bearco_social_identities(provider, lower(username))
  where username is not null;

create table if not exists public.bearco_identity_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.bearco_profiles(id) on delete set null,
  wallet_address text,
  provider text check (provider in ('x', 'telegram', 'discord')),
  event_type text not null,
  previous_profile_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.bearco_identity_events
  add column if not exists profile_id uuid references public.bearco_profiles(id) on delete set null,
  add column if not exists wallet_address text,
  add column if not exists provider text,
  add column if not exists event_type text,
  add column if not exists previous_profile_id uuid,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_bearco_identity_events_profile
  on public.bearco_identity_events(profile_id, created_at desc);

create index if not exists idx_bearco_identity_events_wallet
  on public.bearco_identity_events(wallet_address, created_at desc)
  where wallet_address is not null;

-- Compatibility projection kept for the current holder APIs and UI response
-- shape. Normalized tables above are the source of truth.
create table if not exists public.bearco_holder_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.bearco_profiles(id) on delete set null,
  wallet_address text not null unique,
  display_name text,
  profile_slug text,
  x_username text,
  x_user_id text,
  x_display_name text,
  x_authenticated_at timestamptz,
  telegram_username text,
  telegram_user_id text,
  telegram_display_name text,
  telegram_authenticated_at timestamptz,
  discord_user_id text,
  discord_username text,
  discord_display_name text,
  discord_authenticated_at timestamptz,
  holder_percent_snapshot numeric(12, 8) not null default 0,
  token_balance_snapshot numeric(30, 8) not null default 0,
  lp_token_balance_atomic_snapshot text,
  lp_token_balance_snapshot text,
  lp_token_account text,
  lp_snapshot_signature text,
  lp_snapshot_at timestamptz,
  claimed_at timestamptz not null default now(),
  social_claimed_at timestamptz,
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

alter table public.bearco_holder_profiles
  add column if not exists profile_id uuid references public.bearco_profiles(id) on delete set null,
  add column if not exists x_username text,
  add column if not exists x_user_id text,
  add column if not exists x_display_name text,
  add column if not exists x_authenticated_at timestamptz,
  add column if not exists telegram_username text,
  add column if not exists telegram_user_id text,
  add column if not exists telegram_display_name text,
  add column if not exists telegram_authenticated_at timestamptz,
  add column if not exists discord_user_id text,
  add column if not exists discord_username text,
  add column if not exists discord_display_name text,
  add column if not exists discord_authenticated_at timestamptz,
  add column if not exists social_claimed_at timestamptz,
  add column if not exists lp_token_balance_atomic_snapshot text,
  add column if not exists lp_token_balance_snapshot text,
  add column if not exists lp_token_account text,
  add column if not exists lp_snapshot_signature text,
  add column if not exists lp_snapshot_at timestamptz;

create index if not exists idx_bearco_holder_profiles_wallet
  on public.bearco_holder_profiles(wallet_address);

create index if not exists idx_bearco_holder_profiles_percent
  on public.bearco_holder_profiles(holder_percent_snapshot desc);

create index if not exists idx_bearco_holder_profiles_lp_snapshot
  on public.bearco_holder_profiles(lp_snapshot_at desc)
  where lp_snapshot_at is not null;

drop index if exists public.idx_bearco_holder_profiles_x_username;
drop index if exists public.idx_bearco_holder_profiles_telegram_username;
drop index if exists public.idx_bearco_holder_profiles_discord_username;

create unique index if not exists idx_bearco_holder_profiles_x_user_id
  on public.bearco_holder_profiles(x_user_id)
  where x_user_id is not null;

create unique index if not exists idx_bearco_holder_profiles_telegram_user_id
  on public.bearco_holder_profiles(telegram_user_id)
  where telegram_user_id is not null;

create unique index if not exists idx_bearco_holder_profiles_discord_user_id
  on public.bearco_holder_profiles(discord_user_id)
  where discord_user_id is not null;

with missing_profiles as (
  select wallet_address, gen_random_uuid() as profile_id
  from public.bearco_holder_profiles
  where profile_id is null
)
update public.bearco_holder_profiles holder
set profile_id = missing_profiles.profile_id
from missing_profiles
where holder.wallet_address = missing_profiles.wallet_address;

insert into public.bearco_profiles (
  id,
  display_name,
  profile_slug,
  social_claimed_at,
  created_at,
  updated_at
)
select
  holder.profile_id,
  holder.display_name,
  holder.profile_slug,
  holder.social_claimed_at,
  holder.claimed_at,
  holder.updated_at
from public.bearco_holder_profiles holder
where holder.profile_id is not null
on conflict (id) do update
set
  display_name = coalesce(excluded.display_name, public.bearco_profiles.display_name),
  profile_slug = coalesce(excluded.profile_slug, public.bearco_profiles.profile_slug),
  social_claimed_at = coalesce(excluded.social_claimed_at, public.bearco_profiles.social_claimed_at),
  updated_at = greatest(public.bearco_profiles.updated_at, excluded.updated_at);

insert into public.bearco_wallet_claims (
  profile_id,
  wallet_address,
  holder_percent_snapshot,
  token_balance_snapshot,
  lp_token_balance_atomic_snapshot,
  lp_token_balance_snapshot,
  lp_token_account,
  lp_snapshot_signature,
  lp_snapshot_at,
  claimed_at,
  updated_at,
  last_seen_at
)
select
  holder.profile_id,
  holder.wallet_address,
  holder.holder_percent_snapshot,
  holder.token_balance_snapshot,
  holder.lp_token_balance_atomic_snapshot,
  holder.lp_token_balance_snapshot,
  holder.lp_token_account,
  holder.lp_snapshot_signature,
  holder.lp_snapshot_at,
  holder.claimed_at,
  holder.updated_at,
  holder.last_seen_at
from public.bearco_holder_profiles holder
where holder.profile_id is not null
on conflict (wallet_address) do update
set
  profile_id = excluded.profile_id,
  holder_percent_snapshot = excluded.holder_percent_snapshot,
  token_balance_snapshot = excluded.token_balance_snapshot,
  lp_token_balance_atomic_snapshot = excluded.lp_token_balance_atomic_snapshot,
  lp_token_balance_snapshot = excluded.lp_token_balance_snapshot,
  lp_token_account = excluded.lp_token_account,
  lp_snapshot_signature = excluded.lp_snapshot_signature,
  lp_snapshot_at = excluded.lp_snapshot_at,
  updated_at = excluded.updated_at,
  last_seen_at = excluded.last_seen_at;

insert into public.bearco_social_identities (
  profile_id,
  provider,
  provider_user_id,
  username,
  display_name,
  auth_source,
  authenticated_at,
  created_at,
  updated_at
)
select
  holder.profile_id,
  social.provider,
  social.provider_user_id,
  social.username,
  social.display_name,
  case when social.provider_user_id is null then 'legacy' else 'oauth' end,
  social.authenticated_at,
  holder.claimed_at,
  coalesce(social.authenticated_at, holder.updated_at)
from public.bearco_holder_profiles holder
cross join lateral (
  values
    ('x', holder.x_user_id, holder.x_username, holder.x_display_name, holder.x_authenticated_at),
    ('telegram', holder.telegram_user_id, holder.telegram_username, holder.telegram_display_name, holder.telegram_authenticated_at),
    ('discord', holder.discord_user_id, holder.discord_username, holder.discord_display_name, holder.discord_authenticated_at)
) as social(provider, provider_user_id, username, display_name, authenticated_at)
where holder.profile_id is not null
  and (social.provider_user_id is not null or social.username is not null)
on conflict (profile_id, provider) do update
set
  provider_user_id = coalesce(excluded.provider_user_id, public.bearco_social_identities.provider_user_id),
  username = coalesce(excluded.username, public.bearco_social_identities.username),
  display_name = coalesce(excluded.display_name, public.bearco_social_identities.display_name),
  auth_source = excluded.auth_source,
  authenticated_at = coalesce(excluded.authenticated_at, public.bearco_social_identities.authenticated_at),
  updated_at = greatest(public.bearco_social_identities.updated_at, excluded.updated_at);

create table if not exists public.bearco_holder_feedback (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.bearco_profiles(id) on delete set null,
  wallet_address text not null,
  display_name_snapshot text,
  x_username_snapshot text,
  telegram_username_snapshot text,
  discord_username_snapshot text,
  holder_percent_snapshot numeric(12, 8) not null default 0,
  category text not null default 'product',
  message text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bearco_holder_feedback
  add column if not exists profile_id uuid references public.bearco_profiles(id) on delete set null,
  add column if not exists discord_username_snapshot text;

create index if not exists idx_bearco_holder_feedback_created
  on public.bearco_holder_feedback(created_at desc);

create index if not exists idx_bearco_holder_feedback_wallet
  on public.bearco_holder_feedback(wallet_address);

create index if not exists idx_bearco_holder_feedback_profile
  on public.bearco_holder_feedback(profile_id, created_at desc)
  where profile_id is not null;

create index if not exists idx_bearco_holder_feedback_status
  on public.bearco_holder_feedback(status, created_at desc);

alter table public.bearco_profiles enable row level security;
alter table public.bearco_wallet_claims enable row level security;
alter table public.bearco_social_identities enable row level security;
alter table public.bearco_identity_events enable row level security;
alter table public.bearco_holder_profiles enable row level security;
alter table public.bearco_holder_feedback enable row level security;

drop policy if exists "bearco_profiles_service_role_all"
  on public.bearco_profiles;
create policy "bearco_profiles_service_role_all"
  on public.bearco_profiles
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "bearco_wallet_claims_service_role_all"
  on public.bearco_wallet_claims;
create policy "bearco_wallet_claims_service_role_all"
  on public.bearco_wallet_claims
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "bearco_social_identities_service_role_all"
  on public.bearco_social_identities;
create policy "bearco_social_identities_service_role_all"
  on public.bearco_social_identities
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "bearco_identity_events_service_role_all"
  on public.bearco_identity_events;
create policy "bearco_identity_events_service_role_all"
  on public.bearco_identity_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "bearco_holder_profiles_public_select"
  on public.bearco_holder_profiles;
drop policy if exists "bearco_holder_profiles_service_role_all"
  on public.bearco_holder_profiles;
create policy "bearco_holder_profiles_service_role_all"
  on public.bearco_holder_profiles
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "bearco_holder_feedback_public_select"
  on public.bearco_holder_feedback;
drop policy if exists "bearco_holder_feedback_service_role_all"
  on public.bearco_holder_feedback;
create policy "bearco_holder_feedback_service_role_all"
  on public.bearco_holder_feedback
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

grant select, insert, update, delete on
  public.bearco_profiles,
  public.bearco_wallet_claims,
  public.bearco_social_identities,
  public.bearco_identity_events,
  public.bearco_holder_profiles,
  public.bearco_holder_feedback
to service_role;

comment on table public.bearco_profiles is
  'Canonical $BEARCO holder identity profile. Wallets and socials attach to this profile.';

comment on table public.bearco_wallet_claims is
  'Solana wallets signed into and claimed under canonical $BEARCO holder profiles.';

comment on table public.bearco_social_identities is
  'Provider-authenticated X, Telegram, and Discord accounts linked to canonical holder profiles.';

comment on table public.bearco_identity_events is
  'Append-only identity audit events for wallet, social, and profile linking changes.';

comment on table public.bearco_holder_profiles is
  'Compatibility projection for current $BEARCO holder API response shape. Source of truth is bearco_profiles plus wallet/social tables.';

comment on table public.bearco_holder_feedback is
  'Holder feedback and message board posts created by signed $BEARCO holder sessions through server API routes.';
