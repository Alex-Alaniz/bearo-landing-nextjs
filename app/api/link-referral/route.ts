import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { queueReferralAirdrop } from '../../../lib/referral-airdrop';

// Use service role key - only available on server
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.NEX_SUPABASE_SERVICE_KEY
    || '';

  if (!url || !serviceKey) {
    throw new Error('Supabase not configured');
  }

  return createClient(url, serviceKey);
}

// Link a referral code retroactively (for users who signed up without a referral)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, referrerCode } = body as { email?: string; referrerCode?: string };

    if (!email || !referrerCode) {
      return NextResponse.json({ error: 'Email and referral code required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedCode = referrerCode.toUpperCase().trim();

    const supabase = getSupabase();

    // 1. Check if user exists and has completed email verification
    const { data: userData, error: userError } = await supabase
      .from('waitlist')
      .select('email, referral_code, referred_by, linked_referrer_code, thirdweb_user_id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found. Please sign up first.' }, { status: 404 });
    }

    if (!userData.thirdweb_user_id) {
      return NextResponse.json({
        error: 'Please complete email verification first',
        requiresAuth: true,
      }, { status: 401 });
    }

    // 2. Prevent self-referral
    if (userData.referral_code === normalizedCode) {
      return NextResponse.json({ error: 'You cannot use your own referral code.' }, { status: 400 });
    }

    // 3. Check if already has a referrer
    if (userData.referred_by || userData.linked_referrer_code) {
      return NextResponse.json({ error: 'You already have a linked referral code.' }, { status: 400 });
    }

    // 4. Validate referrer code exists
    const { data: referrerData, error: referrerError } = await supabase
      .from('airdrop_allocations')
      .select('referral_code, email')
      .eq('referral_code', normalizedCode)
      .maybeSingle();

    if (referrerError || !referrerData) {
      return NextResponse.json({ error: 'Invalid referral code. Please check and try again.' }, { status: 400 });
    }

    // 5. Prevent circular referral (A refers B, B tries to refer A)
    const { data: circularCheck } = await supabase
      .from('airdrop_allocations')
      .select('referred_by_code')
      .eq('email', referrerData.email)
      .maybeSingle();

    if (circularCheck?.referred_by_code === userData.referral_code) {
      return NextResponse.json({ error: 'Circular referrals are not allowed.' }, { status: 400 });
    }

    // 6. Update waitlist with linked referrer
    const { error: updateWaitlistError } = await supabase
      .from('waitlist')
      .update({
        linked_referrer_code: normalizedCode,
        linked_at: new Date().toISOString(),
        link_verified: true,
      })
      .eq('email', normalizedEmail);

    if (updateWaitlistError) {
      console.error('[link-referral] Waitlist update error:', updateWaitlistError);
      return NextResponse.json({ error: 'Failed to link referral. Please try again.' }, { status: 500 });
    }

    // 7. Update airdrop_allocations with retroactive referrer (non-fatal)
    const { error: updateAirdropError } = await supabase
      .from('airdrop_allocations')
      .update({
        referred_by_code: normalizedCode,
        referred_at: new Date().toISOString(),
        link_verified: true,
        link_verified_at: new Date().toISOString(),
      })
      .eq('email', normalizedEmail);

    if (updateAirdropError) {
      console.error('[link-referral] Airdrop update error (non-fatal):', updateAirdropError);
    }

    // 8. Increment referrer's count
    const { error: incrementError } = await supabase.rpc('increment_referral_count', {
      referrer_code: normalizedCode,
    });

    if (incrementError) {
      // Try manual increment if RPC doesn't exist
      const { data: currentData } = await supabase
        .from('airdrop_allocations')
        .select('referral_count')
        .eq('referral_code', normalizedCode)
        .single();

      if (currentData) {
        await supabase
          .from('airdrop_allocations')
          .update({ referral_count: (currentData.referral_count || 0) + 1 })
          .eq('referral_code', normalizedCode);
      }
    }

    // 9. Record the completion (for audit trail, non-fatal)
    const { error: completionError } = await supabase
      .from('referral_completions')
      .insert({
        referrer_code: normalizedCode,
        referee_code: userData.referral_code,
        referee_email: normalizedEmail,
        completion_type: 'retroactive',
        week_number: 1,
        base_reward: 500, // Retroactive referral reward
        multiplier: 1.5,  // Early bird multiplier
        final_reward: 750,
        verified: true,
        verified_at: new Date().toISOString(),
      });

    if (completionError) {
      console.warn('[link-referral] Completion record error (non-fatal):', completionError);
    }

    console.log(`✅ [API] Retroactive referral linked: ${normalizedEmail} -> ${normalizedCode}`);

    // 10. Queue airdrop to referrer (non-fatal, manual review)
    let airdropSent = false;
    try {
      const airdropResult = await queueReferralAirdrop(
        supabase,
        referrerData.email,
        normalizedEmail,
        'retroactive'
      );
      airdropSent = airdropResult.success;
    } catch (airdropError) {
      console.warn('[link-referral] Airdrop queue error (non-fatal):', airdropError);
    }

    return NextResponse.json({
      success: true,
      message: airdropSent
        ? 'Referral linked successfully! Your referrer has been queued for a $BEARCO airdrop.'
        : 'Referral linked successfully! Both you and your referrer will receive bonus tokens.',
      referrerCode: normalizedCode,
      airdropSent,
    });

  } catch (error) {
    console.error('Link referral API error:', error);
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
