-- Bearo TestFlight invite wiring
-- Run this in Supabase SQL Editor after the base waitlist table exists.
--
-- The app writes TestFlight status into waitlist.metadata and decides whether
-- to invite from waitlist.platform. This migration is idempotent and covers both
-- the current public.waitlist table and the older public.waitlist_sync table.

do $$
declare
  table_name text;
  table_ref regclass;
  index_prefix text;
begin
  foreach table_name in array array['public.waitlist', 'public.waitlist_sync']
  loop
    table_ref := to_regclass(table_name);

    if table_ref is null then
      raise notice 'Skipping %, table does not exist', table_name;
      continue;
    end if;

    index_prefix := replace(replace(table_name, 'public.', ''), '.', '_');

    execute format('alter table %s add column if not exists thirdweb_user_id text', table_ref);
    execute format('alter table %s add column if not exists verified boolean', table_ref);
    execute format('alter table %s add column if not exists verified_at timestamptz', table_ref);
    execute format('alter table %s add column if not exists platform text', table_ref);
    execute format('alter table %s add column if not exists metadata jsonb', table_ref);
    execute format('alter table %s add column if not exists solana_wallet_address text', table_ref);

    execute format('update %s set verified = false where verified is null', table_ref);
    execute format('update %s set platform = ''unknown'' where platform is null', table_ref);
    execute format('update %s set metadata = ''{}''::jsonb where metadata is null', table_ref);

    execute format('alter table %s alter column verified set default false', table_ref);
    execute format('alter table %s alter column verified set not null', table_ref);
    execute format('alter table %s alter column platform set default ''unknown''', table_ref);
    execute format('alter table %s alter column platform set not null', table_ref);
    execute format('alter table %s alter column metadata set default ''{}''::jsonb', table_ref);
    execute format('alter table %s alter column metadata set not null', table_ref);

    execute format('alter table %s drop constraint if exists %I', table_ref, index_prefix || '_platform_check');
    execute format(
      'alter table %s add constraint %I check (platform in (''ios'', ''android'', ''desktop'', ''unknown''))',
      table_ref,
      index_prefix || '_platform_check'
    );

    execute format(
      'create index if not exists %I on %s (platform, verified)',
      index_prefix || '_testflight_platform_idx',
      table_ref
    );
    execute format(
      'create index if not exists %I on %s using gin (metadata)',
      index_prefix || '_testflight_metadata_idx',
      table_ref
    );
  end loop;
end $$;
