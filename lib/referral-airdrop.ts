// Server-only helper for queueing referral airdrops for manual review.
// Called from API routes with a service-role Supabase client — never import
// this from client code.

import type { SupabaseClient } from '@supabase/supabase-js';

const BEARCO_TOKEN_ADDRESS = 'FdFUGJSzJXDCZemQbkBwYs3tZEvixyEc8cZfRqJrpump';
const DEFAULT_AIRDROP_AMOUNT = '500000000'; // 500 tokens (6 decimals)

export async function queueReferralAirdrop(
  supabase: SupabaseClient,
  referrerEmail: string,
  refereeEmail: string,
  referralType: 'signup' | 'retroactive'
): Promise<{ success: boolean; queued?: boolean }> {
  try {
    const normalizedReferrer = referrerEmail.toLowerCase();

    // Check if referrer is flagged/banned
    const { data: flaggedAccount } = await supabase
      .from('flagged_accounts')
      .select('is_banned, flag_type')
      .eq('email', normalizedReferrer)
      .maybeSingle();

    if (flaggedAccount?.is_banned) {
      console.warn(`🚫 [airdrop-queue] Referrer ${normalizedReferrer} is banned - airdrop blocked`);
      return { success: false };
    }

    // Get referrer's wallet address
    const { data: referrerData } = await supabase
      .from('waitlist')
      .select('solana_wallet_address')
      .eq('email', normalizedReferrer)
      .single();

    if (!referrerData?.solana_wallet_address) {
      console.warn(`⚠️ [airdrop-queue] Referrer ${normalizedReferrer} has no wallet - cannot queue airdrop`);
      return { success: false };
    }

    // Queue the airdrop for manual review (anti-sybil measure)
    const { error: queueError } = await supabase
      .from('airdrop_queue')
      .insert({
        referrer_email: normalizedReferrer,
        referee_email: refereeEmail.toLowerCase(),
        referrer_wallet: referrerData.solana_wallet_address,
        amount: DEFAULT_AIRDROP_AMOUNT,
        token_address: BEARCO_TOKEN_ADDRESS,
        referral_type: referralType,
        status: 'pending',
        notes: flaggedAccount ? `Referrer flagged as: ${flaggedAccount.flag_type}` : null,
      });

    if (queueError) {
      console.error('[airdrop-queue] Queue error:', queueError);
      return { success: false };
    }

    console.log(`✅ [airdrop-queue] Airdrop queued for review: ${normalizedReferrer} (${referralType})`);

    return { success: true, queued: true };
  } catch (error) {
    console.error('[airdrop-queue] Error:', error);
    return { success: false };
  }
}
