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

const VALID_PLATFORMS = new Set<Platform>(['ios', 'android', 'desktop', 'unknown']);

type WaitlistMetadata = Record<string, unknown>;

interface WaitlistUser {
  email: string;
  referral_code: string;
  platform: Platform | null;
  metadata: WaitlistMetadata | null;
  thirdweb_user_id: string | null;
  verified: boolean | null;
}

function normalizePlatform(platform: unknown): Platform {
  return typeof platform === 'string' && VALID_PLATFORMS.has(platform as Platform)
    ? platform as Platform
    : 'unknown';
}

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'BEAR';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function trackTestFlightInvite(
  supabase: ReturnType<typeof getSupabase>,
  email: string,
  previousMetadata: WaitlistMetadata | null,
  platform: Platform
) {
  if (platform !== 'ios') {
    return;
  }

  if (previousMetadata?.testflight_invited === true) {
    return;
  }

  const nextMetadata: WaitlistMetadata = {
    ...(previousMetadata || {}),
    testflight_checked_at: new Date().toISOString(),
  };

  if (!isTestFlightConfigured()) {
    nextMetadata.testflight_invited = false;
    nextMetadata.testflight_skipped_reason = 'not_configured';

    await updateTestFlightMetadata(supabase, email, nextMetadata);

    console.warn(`📱 [TestFlight] Skipped for ${email}: App Store Connect not configured`);
    return;
  }

  try {
    const result = await addBetaTester(email);

    nextMetadata.testflight_invited = result.success;
    nextMetadata.testflight_invited_at = new Date().toISOString();
    nextMetadata.testflight_already_invited = result.alreadyInvited || false;
    delete nextMetadata.testflight_skipped_reason;

    if (!result.success && result.error) {
      nextMetadata.testflight_error = result.error;
    } else {
      delete nextMetadata.testflight_error;
    }

    await updateTestFlightMetadata(supabase, email, nextMetadata);

    if (result.success) {
      console.log(`📱 [TestFlight] Invite sent to ${email}${result.alreadyInvited ? ' (already invited)' : ''}`);
    } else {
      console.error(`📱 [TestFlight] Failed for ${email}:`, result.error);
    }
  } catch (testflightErr) {
    console.error(`📱 [TestFlight] Error for ${email}:`, testflightErr);

    nextMetadata.testflight_invited = false;
    nextMetadata.testflight_invited_at = new Date().toISOString();
    nextMetadata.testflight_error = testflightErr instanceof Error ? testflightErr.message : 'Unknown error';

    await updateTestFlightMetadata(supabase, email, nextMetadata);
  }
}

async function updateTestFlightMetadata(
  supabase: ReturnType<typeof getSupabase>,
  email: string,
  metadata: WaitlistMetadata
) {
  const { error } = await supabase
    .from('waitlist')
    .update({ metadata })
    .eq('email', email);

  if (error) {
    console.error(`📱 [TestFlight] Failed to update metadata for ${email}:`, error);
  }
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
    const normalizedPlatform = normalizePlatform(platform);

    // Check if already exists
    const { data: existing } = await supabase
      .from('waitlist')
      .select('email, referral_code, platform, metadata, thirdweb_user_id, verified')
      .eq('email', normalizedEmail)
      .maybeSingle<WaitlistUser>();

    if (existing) {
      const existingPlatform = normalizePlatform(existing.platform);
      const effectivePlatform = normalizedPlatform !== 'unknown'
        ? normalizedPlatform
        : existingPlatform;
      const updates: Record<string, unknown> = {
        verified: true,
        thirdweb_user_id: thirdwebUserId,
      };

      if (normalizedPlatform !== 'unknown' && normalizedPlatform !== existingPlatform) {
        updates.platform = normalizedPlatform;
      }

      const { error: updateError } = await supabase
        .from('waitlist')
        .update(updates)
        .eq('email', normalizedEmail);

      if (updateError) {
        console.error('Existing user update error:', updateError);
      }

      await trackTestFlightInvite(
        supabase,
        normalizedEmail,
        existing.metadata,
        effectivePlatform
      );

      return NextResponse.json({
        success: true,
        existing: true,
        referralCode: existing.referral_code,
        referralLink: `https://bearo.cash/refer/${encodeURIComponent(existing.referral_code)}`,
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
        platform: normalizedPlatform, // Device platform for TestFlight/Play Store targeting
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

    // Trigger TestFlight invite for iOS users (BLOCKING - must complete before response)
    // Serverless functions terminate after response, so we MUST await this.
    await trackTestFlightInvite(supabase, normalizedEmail, null, normalizedPlatform);

    console.log(`✅ [API] ${normalizedEmail} signed up: ${tierName}, code: ${referralCode}, platform: ${normalizedPlatform}`);

    return NextResponse.json({
      success: true,
      referralCode,
      referralLink: `https://bearo.cash/refer/${encodeURIComponent(referralCode)}`,
      position: signupPosition,
      spotsLeft: spotsLeft - 1,
    });

  } catch (error) {
    console.error('Signup API error:', error);
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
