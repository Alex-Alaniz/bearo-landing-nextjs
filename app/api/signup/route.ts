import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Platform } from '../../../lib/deviceDetection';
import { addBetaTester, isConfigured as isTestFlightConfigured } from '../../../lib/appStoreConnect';

// Use service role key - only available on server
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  // Check multiple possible env var names for the service key
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.NEX_SUPABASE_SERVICE_KEY
    || '';

  if (!url || !serviceKey) {
    console.error('Missing Supabase config:', { url: !!url, serviceKey: !!serviceKey });
    throw new Error('Supabase not configured');
  }

  return createClient(url, serviceKey);
}

// Tier configurations
const TIER_MAX_SPOTS: Record<number, number> = {
  1: 10, 2: 40, 3: 50, 4: 400, 5: 500, 6: 4000,
};

const TIER_BASE_AMOUNTS: Record<number, number> = {
  1: 50000, 2: 10000, 3: 2500, 4: 1000, 5: 500, 6: 100,
};

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'BEAR';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, tierNumber, tierName, referredBy, thirdwebUserId, platform } = body as {
      email: string;
      tierNumber: number;
      tierName: string;
      referredBy?: string;
      thirdwebUserId: string;
      platform?: Platform;
    };

    // Validate required fields
    if (!email || !tierNumber || !tierName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // SECURITY: Require thirdweb authentication
    if (!thirdwebUserId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const supabase = getSupabase();
    const normalizedEmail = email.toLowerCase().trim();

    // Check if already exists
    const { data: existing } = await supabase
      .from('waitlist')
      .select('email, referral_code')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        success: true,
        existing: true,
        referralCode: existing.referral_code,
        referralLink: `https://bearo.cash/?ref=${encodeURIComponent(existing.referral_code)}`,
      });
    }

    // Get position
    const { count: currentCount } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true });

    const signupPosition = (currentCount || 0) + 1;

    // Check tier availability
    const { count: tierCount } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true })
      .eq('tier_number', tierNumber)
      .eq('verified', true);

    const maxSpots = TIER_MAX_SPOTS[tierNumber] || 0;
    const claimed = tierCount || 0;
    const spotsLeft = maxSpots - claimed;

    if (spotsLeft <= 0) {
      return NextResponse.json({ error: `${tierName} tier is full` }, { status: 400 });
    }

    // Generate referral code
    const referralCode = generateReferralCode();

    // Validate referrer code if provided
    let validatedReferrer: string | null = null;
    if (referredBy) {
      const referrerCode = referredBy.toUpperCase().trim();
      if (referrerCode !== referralCode) {
        const { data: referrerData } = await supabase
          .from('waitlist')
          .select('referral_code')
          .eq('referral_code', referrerCode)
          .maybeSingle();

        if (referrerData) {
          validatedReferrer = referrerCode;
        }
      }
    }

    // Insert into waitlist (with thirdweb_user_id and verified=true)
    const { error: insertError } = await supabase
      .from('waitlist')
      .insert({
        email: normalizedEmail,
        tier_name: tierName,
        tier_number: tierNumber,
        signup_position: signupPosition,
        referral_code: referralCode,
        referred_by: validatedReferrer,
        thirdweb_user_id: thirdwebUserId,
        verified: true, // They've completed thirdweb auth
        platform: platform || 'unknown', // Device platform for TestFlight/Play Store targeting
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Insert airdrop allocation (non-fatal)
    const baseAmount = TIER_BASE_AMOUNTS[tierNumber] || 100;
    try {
      await supabase
        .from('airdrop_allocations')
        .insert({
          email: normalizedEmail,
          referral_code: referralCode,
          tier_name: tierName,
          tier_number: tierNumber,
          base_amount: baseAmount,
          referral_amount: 0,
          action_amount: 0,
          bonus_multiplier: 1.5,
          referral_count: 0,
          referred_by_code: validatedReferrer,
        });
    } catch {
      // Non-fatal - airdrop allocation insert failed
    }

    // Trigger TestFlight invite for iOS users (tracked, non-blocking to response)
    if (platform === 'ios' && isTestFlightConfigured()) {
      // Fire off the invite but track the result in the database
      addBetaTester(normalizedEmail).then(async (result) => {
        // Track the invite attempt in metadata
        const metadata: Record<string, unknown> = {
          testflight_invited: result.success,
          testflight_invited_at: new Date().toISOString(),
          testflight_already_invited: result.alreadyInvited || false,
        };

        if (!result.success && result.error) {
          metadata.testflight_error = result.error;
        }

        // Update the user's metadata with TestFlight status
        try {
          await supabase
            .from('waitlist')
            .update({ metadata })
            .eq('email', normalizedEmail);

          if (result.success) {
            console.log(`📱 [TestFlight] Invite sent to ${normalizedEmail}${result.alreadyInvited ? ' (already invited)' : ''}`);
          } else {
            console.error(`📱 [TestFlight] Failed for ${normalizedEmail}:`, result.error);
          }
        } catch (updateErr) {
          console.error(`📱 [TestFlight] Failed to update metadata for ${normalizedEmail}:`, updateErr);
        }
      }).catch(async (err) => {
        console.error(`📱 [TestFlight] Error for ${normalizedEmail}:`, err);
        // Track the error in metadata
        try {
          await supabase
            .from('waitlist')
            .update({
              metadata: {
                testflight_invited: false,
                testflight_invited_at: new Date().toISOString(),
                testflight_error: err instanceof Error ? err.message : 'Unknown error',
              }
            })
            .eq('email', normalizedEmail);
        } catch {
          // Ignore metadata update error
        }
      });
    }

    console.log(`✅ [API] ${normalizedEmail} signed up: ${tierName}, code: ${referralCode}, platform: ${platform || 'unknown'}`);

    return NextResponse.json({
      success: true,
      referralCode,
      referralLink: `https://bearo.cash/?ref=${encodeURIComponent(referralCode)}`,
      position: signupPosition,
      spotsLeft: spotsLeft - 1,
    });

  } catch (error: any) {
    console.error('Signup API error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
