/**
 * Airdrop Service
 * Fetches leaderboard and airdrop allocation data from Supabase
 *
 * NOTE: Actual token distribution is handled via thirdweb server wallet.
 * This service only tracks allocations - the airdrop_allocations table
 * stores who gets what amount, and thirdweb server wallet sends tokens.
 */

import { supabase } from './supabase';

export interface LeaderboardEntry {
  rank: number;
  code: string;  // Partially masked (BEAR****)
  tierName: string;
  tierNumber: number;
  referralCount: number;
  projectedAirdrop: number;
}

export interface AirdropStats {
  totalAllocated: number;
  totalReferrals: number;
  participantCount: number;
  topTier: string;
}

// Tier display info
export const TIER_INFO: Record<number, { name: string; color: string; emoji: string }> = {
  1: { name: 'OG Founder', color: '#FFD700', emoji: '👑' },
  2: { name: 'Alpha Insider', color: '#C0C0C0', emoji: '🔥' },
  3: { name: 'Beta Crew', color: '#CD7F32', emoji: '🚀' },
  4: { name: 'Early Adopter', color: '#8E8AFF', emoji: '⚡' },
  5: { name: 'Pioneer Wave', color: '#34C759', emoji: '🌊' },
  6: { name: 'Community', color: '#FFFFFF', emoji: '🐻' },
};

/**
 * Get referral leaderboard
 */
export async function getReferralLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
  if (!supabase) {
    console.warn('[Airdrop] Supabase not configured');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('airdrop_allocations')
      .select('referral_code, tier_name, tier_number, base_amount, referral_amount, action_amount, bonus_multiplier, referral_count')
      .order('referral_count', { ascending: false })
      .order('tier_number', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('[Airdrop] Error fetching leaderboard:', error);
      return [];
    }

    if (!data) return [];

    return data.map((row, index) => {
      const total = Math.floor(
        (row.base_amount + row.referral_amount + (row.action_amount || 0)) *
        parseFloat(row.bonus_multiplier || '1')
      );

      // Partially mask the code (BEARAB12 -> BEAR****)
      const maskedCode = row.referral_code.slice(0, 4) + '****';

      return {
        rank: index + 1,
        code: maskedCode,
        tierName: row.tier_name,
        tierNumber: row.tier_number,
        referralCount: row.referral_count || 0,
        projectedAirdrop: total,
      };
    });
  } catch (error) {
    console.error('[Airdrop] Error getting leaderboard:', error);
    return [];
  }
}

/**
 * Get overall airdrop statistics
 */
export async function getAirdropStats(): Promise<AirdropStats | null> {
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('airdrop_allocations')
      .select('base_amount, referral_amount, action_amount, bonus_multiplier, referral_count, tier_name, tier_number');

    if (error || !data) {
      console.error('[Airdrop] Error fetching stats:', error);
      return null;
    }

    let totalAllocated = 0;
    let totalReferrals = 0;
    let topTierNumber = 6;
    let topTierName = 'Community';

    data.forEach((row) => {
      const amount = Math.floor(
        (row.base_amount + row.referral_amount + (row.action_amount || 0)) *
        parseFloat(row.bonus_multiplier || '1')
      );
      totalAllocated += amount;
      totalReferrals += row.referral_count || 0;

      if (row.tier_number < topTierNumber) {
        topTierNumber = row.tier_number;
        topTierName = row.tier_name;
      }
    });

    return {
      totalAllocated,
      totalReferrals,
      participantCount: data.length,
      topTier: topTierName,
    };
  } catch (error) {
    console.error('[Airdrop] Error calculating stats:', error);
    return null;
  }
}

/**
 * Calculate early bird bonus based on week number
 */
export function getEarlyBirdMultiplier(weekNumber: number): number {
  const multipliers: Record<number, number> = {
    1: 1.5,
    2: 1.25,
    3: 1.0,
    4: 0.75,
  };
  return multipliers[weekNumber] || 0.5;
}

/**
 * Get current week number since launch
 */
export function getCurrentWeekNumber(): number {
  // Returns week 1 (early bird bonus active)
  return 1;
}
