-- =============================================================================
-- Drop permissive anon write policies on public.waitlist
-- =============================================================================
-- Flagged by Supabase security advisor (lint 0024_permissive_rls_policy):
--   * anon_insert_waitlist: INSERT WITH CHECK (true) for anon
--   * anon_update_waitlist: UPDATE USING (true) WITH CHECK (true) for anon
--
-- These allowed anyone holding the public anon key to insert or modify
-- arbitrary waitlist rows (tiers, referral data, emails), contradicting the
-- security model in CLAUDE.md ("all mutations go through API routes").
--
-- All waitlist mutations now go through /api/* routes (signup, link-wallet,
-- link-referral) using the service role key, which bypasses RLS. The frontend
-- keeps read-only SELECT access via the anon key.
--
-- DEPLOYMENT ORDER MATTERS:
--   1. anon_insert_waitlist can be dropped immediately — no client path has
--      ever inserted into waitlist directly (signups go through /api/signup).
--   2. anon_update_waitlist must be dropped ONLY AFTER deploying the commit
--      that migrates saveWalletAddress / linkReferralRetroactively in
--      lib/api.ts to API routes. Dropping it earlier breaks the wallet-save
--      and retroactive-referral flows on the live site.
--
-- Run in Supabase Dashboard -> SQL Editor (project jhumhgyizwvwhebwtdko),
-- then re-run the security advisor to confirm both WARNs are cleared.
-- =============================================================================

drop policy if exists "anon_insert_waitlist" on public.waitlist;
drop policy if exists "anon_update_waitlist" on public.waitlist;
