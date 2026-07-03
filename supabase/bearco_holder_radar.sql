-- $BEARCO Holder Radar analytics
-- Public pages read this data only through API routes. Refresh writes use the
-- Supabase service role from a protected cron endpoint.

create table if not exists public.bearco_holder_snapshots (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null unique,
  rank integer not null,
  balance_atomic text not null default '0',
  balance_ui numeric(30, 8) not null default 0,
  holder_percent numeric(12, 8) not null default 0,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  source text not null default 'helius.getTokenAccounts',
  source_slot bigint,
  refreshed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bearco_holder_snapshots
  add column if not exists wallet_address text,
  add column if not exists rank integer not null default 0,
  add column if not exists balance_atomic text not null default '0',
  add column if not exists balance_ui numeric(30, 8) not null default 0,
  add column if not exists holder_percent numeric(12, 8) not null default 0,
  add column if not exists first_seen_at timestamptz,
  add column if not exists last_seen_at timestamptz,
  add column if not exists source text not null default 'helius.getTokenAccounts',
  add column if not exists source_slot bigint,
  add column if not exists refreshed_at timestamptz not null default now(),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists idx_bearco_holder_snapshots_wallet
  on public.bearco_holder_snapshots(wallet_address);

create index if not exists idx_bearco_holder_snapshots_rank
  on public.bearco_holder_snapshots(rank asc);

create index if not exists idx_bearco_holder_snapshots_percent
  on public.bearco_holder_snapshots(holder_percent desc);

create index if not exists idx_bearco_holder_snapshots_refreshed
  on public.bearco_holder_snapshots(refreshed_at desc);

create table if not exists public.bearco_holder_events (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  tx_signature text not null,
  event_index integer not null default 0,
  block_time timestamptz,
  slot bigint,
  action_type text not null check (
    action_type in ('buy', 'sell', 'transfer_in', 'transfer_out')
  ),
  amount_atomic text not null default '0',
  amount_ui numeric(30, 8) not null default 0,
  quote_symbol text,
  quote_amount text,
  quote_usd numeric(30, 8),
  pnl_usd numeric(30, 8),
  counterparty text,
  source_provider text not null default 'helius.getTransfersByAddress',
  source_payload_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bearco_holder_events
  add column if not exists wallet_address text,
  add column if not exists tx_signature text,
  add column if not exists event_index integer not null default 0,
  add column if not exists block_time timestamptz,
  add column if not exists slot bigint,
  add column if not exists action_type text,
  add column if not exists amount_atomic text not null default '0',
  add column if not exists amount_ui numeric(30, 8) not null default 0,
  add column if not exists quote_symbol text,
  add column if not exists quote_amount text,
  add column if not exists quote_usd numeric(30, 8),
  add column if not exists pnl_usd numeric(30, 8),
  add column if not exists counterparty text,
  add column if not exists source_provider text not null default 'helius.getTransfersByAddress',
  add column if not exists source_payload_hash text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists idx_bearco_holder_events_unique
  on public.bearco_holder_events(
    wallet_address,
    tx_signature,
    action_type,
    event_index
  );

create index if not exists idx_bearco_holder_events_wallet_time
  on public.bearco_holder_events(wallet_address, block_time desc);

create index if not exists idx_bearco_holder_events_action_time
  on public.bearco_holder_events(action_type, block_time desc);

create table if not exists public.bearco_holder_stats (
  wallet_address text primary key,
  buy_count integer not null default 0,
  sell_count integer not null default 0,
  transfer_count integer not null default 0,
  net_bought_ui numeric(30, 8),
  net_sold_ui numeric(30, 8),
  realized_pnl_usd numeric(30, 8),
  unrealized_pnl_usd numeric(30, 8),
  pnl_status text not null default 'needs_price_source' check (
    pnl_status in ('estimated', 'needs_price_source', 'unavailable')
  ),
  last_action_type text check (
    last_action_type in ('buy', 'sell', 'transfer_in', 'transfer_out')
  ),
  last_action_at timestamptz,
  holding_age_days integer not null default 0,
  airdrop_watch_score integer not null default 0,
  airdrop_multiplier numeric(6, 2) not null default 1,
  sparkline jsonb not null default '[42,42,42,42,42,42,42]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bearco_holder_stats
  add column if not exists buy_count integer not null default 0,
  add column if not exists sell_count integer not null default 0,
  add column if not exists transfer_count integer not null default 0,
  add column if not exists net_bought_ui numeric(30, 8),
  add column if not exists net_sold_ui numeric(30, 8),
  add column if not exists realized_pnl_usd numeric(30, 8),
  add column if not exists unrealized_pnl_usd numeric(30, 8),
  add column if not exists pnl_status text not null default 'needs_price_source',
  add column if not exists last_action_type text,
  add column if not exists last_action_at timestamptz,
  add column if not exists holding_age_days integer not null default 0,
  add column if not exists airdrop_watch_score integer not null default 0,
  add column if not exists airdrop_multiplier numeric(6, 2) not null default 1,
  add column if not exists sparkline jsonb not null default '[42,42,42,42,42,42,42]'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_bearco_holder_stats_watch_score
  on public.bearco_holder_stats(airdrop_watch_score desc);

create index if not exists idx_bearco_holder_stats_last_action
  on public.bearco_holder_stats(last_action_at desc)
  where last_action_at is not null;

alter table public.bearco_holder_snapshots enable row level security;
alter table public.bearco_holder_events enable row level security;
alter table public.bearco_holder_stats enable row level security;
