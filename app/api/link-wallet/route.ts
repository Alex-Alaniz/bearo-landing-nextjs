import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

// Solana address validation
function isValidSolanaAddress(address: string): boolean {
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, referralCode, walletAddress } = body;

    // Validate required fields
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    if (!email && !referralCode) {
      return NextResponse.json({ error: 'Email or referral code required' }, { status: 400 });
    }

    // Validate wallet address format
    const trimmedWallet = walletAddress.trim();
    if (!isValidSolanaAddress(trimmedWallet)) {
      return NextResponse.json({ error: 'Invalid Solana wallet address' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Look up user by email or referral code
    let userEmail: string;

    if (email) {
      userEmail = email.toLowerCase().trim();
    } else {
      // Look up email by referral code
      const { data: userData, error: lookupError } = await supabase
        .from('waitlist')
        .select('email')
        .eq('referral_code', referralCode.toUpperCase())
        .single();

      if (lookupError || !userData) {
        return NextResponse.json({ error: 'Referral code not found' }, { status: 404 });
      }
      userEmail = userData.email;
    }

    // Verify user exists and is authenticated
    const { data: userCheck, error: checkError } = await supabase
      .from('waitlist')
      .select('email, thirdweb_user_id, solana_wallet_address')
      .eq('email', userEmail)
      .single();

    if (checkError || !userCheck) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // User must be authenticated (have thirdweb_user_id) to link wallet
    if (!userCheck.thirdweb_user_id) {
      return NextResponse.json({
        error: 'Please complete email verification first',
        requiresAuth: true
      }, { status: 401 });
    }

    // Update waitlist table
    const { error: waitlistError } = await supabase
      .from('waitlist')
      .update({
        solana_wallet_address: trimmedWallet,
        wallet_set_at: new Date().toISOString(),
      })
      .eq('email', userEmail);

    if (waitlistError) {
      console.error('[link-wallet] Waitlist update error:', waitlistError);
      return NextResponse.json({ error: 'Failed to save wallet' }, { status: 500 });
    }

    // Also update airdrop_allocations table
    await supabase
      .from('airdrop_allocations')
      .update({
        wallet_address: trimmedWallet,
      })
      .eq('email', userEmail);

    console.log(`✅ [API] Wallet linked for ${userEmail}: ${trimmedWallet.substring(0, 8)}...`);

    return NextResponse.json({
      success: true,
      message: 'Wallet linked successfully',
    });

  } catch (error: any) {
    console.error('Link wallet API error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
