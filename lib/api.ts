// Frontend API client for thirdweb authentication + Supabase database sync

import { supabase, WaitlistSyncEntry } from './supabase';

// Use correct thirdweb API base URL
const THIRDWEB_API = 'https://api.thirdweb.com/v1';
const THIRDWEB_CLIENT_ID = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || '';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

// Tier max spots configuration
const TIER_MAX_SPOTS: Record<number, number> = {
  1: 10,   // OG Founder
  2: 40,   // Alpha Insider
  3: 50,   // Beta Crew
  4: 400,  // Early Adopter
  5: 500,  // Pioneer Wave
  6: 4000  // Community
};

// Base token amounts per tier (for airdrop)
const TIER_BASE_AMOUNTS: Record<number, number> = {
  1: 50000,  // OG Founder
  2: 10000,  // Alpha Insider
  3: 2500,   // Beta Crew
  4: 1000,   // Early Adopter
  5: 500,    // Pioneer Wave
  6: 100     // Community
};

interface InitiateResponse {
  success: boolean;
  message: string;
}

interface VerifyResponse {
  success: boolean;
  tier: string;
  tierNumber: number;
  position: number;
  spotsLeft: number;
  userId: string;
  referralCode?: string;
  referralLink?: string;
}

// Generate referral code matching database format: BEAR + 4 alphanumeric chars
function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding confusing chars (0, O, I, L, 1)
  let result = 'BEAR';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function storeLocalFallback(authResult: any, email: string, tierNumber: number, tierName: string, referralCode: string, referralLink: string) {
  // Store auth session in localStorage (fallback)
  localStorage.setItem('bearo_auth', JSON.stringify({
    token: authResult.token,
    userId: authResult.userId,
    walletAddress: authResult.walletAddress,
    email: email,
    isNewUser: authResult.isNewUser,
  }));

  localStorage.setItem('bearo_referral', JSON.stringify({
    referralCode,
    referralLink,
    createdAt: Date.now(),
  }));

  localStorage.setItem('bearo_user_tier', JSON.stringify({
    tierNumber,
    tierName,
    claimedAt: Date.now(),
  }));
}

interface CountResponse {
  count: number;
}

interface TierAvailability {
  maxSpots: number;
  claimed: number;
  available: number;
}

// Initiate email authentication with thirdweb
export async function initiateWaitlistAuth(email: string): Promise<InitiateResponse> {
  try {
    if (!THIRDWEB_CLIENT_ID) {
      throw new Error('Thirdweb Client ID not configured');
    }

    console.log('📧 Initiating auth for:', email, 'Client ID:', THIRDWEB_CLIENT_ID.substring(0, 15) + '...');

    const response = await fetch(`${THIRDWEB_API}/auth/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': THIRDWEB_CLIENT_ID,
      },
      body: JSON.stringify({
        method: 'email',
        email,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let error;
      try {
        error = JSON.parse(errorText);
      } catch {
        error = { message: errorText || `HTTP ${response.status}: ${response.statusText}` };
      }

      console.error('❌ Thirdweb initiate error:', {
        status: response.status,
        statusText: response.statusText,
        error,
        endpoint: `${THIRDWEB_API}/auth/initiate`,
        clientIdConfigured: !!THIRDWEB_CLIENT_ID
      });

      throw new Error(error.message || `Failed to send verification email (${response.status})`);
    }

    const result = await response.json();
    console.log('✅ Verification email sent via thirdweb', result);
    console.log('📋 Initiate response keys:', Object.keys(result));

    // Store challenge if provided (needed for complete)
    if (result.challenge) {
      sessionStorage.setItem(`thirdweb_challenge_${email}`, JSON.stringify(result.challenge));
      console.log('📝 Stored challenge for:', email);
    }

    // Also store the full result in case we need other fields
    sessionStorage.setItem(`thirdweb_initiate_${email}`, JSON.stringify(result));

    return {
      success: true,
      message: 'Verification email sent'
    };
  } catch (error: any) {
    console.error('Thirdweb auth error:', error);
    throw error;
  }
}

// Validate referrer code exists
async function validateReferrerCode(code: string): Promise<boolean> {
  if (!supabase || !code) return false;

  const { data } = await supabase
    .from('airdrop_allocations')
    .select('referral_code')
    .eq('referral_code', code.toUpperCase())
    .maybeSingle();

  return !!data;
}

// Verify OTP and claim tier - syncs with Supabase database
export async function verifyAndClaimTier(
  email: string,
  otp: string,
  tierNumber: number,
  tierName: string,
  referredBy?: string // Optional: referral code of who referred this user
): Promise<VerifyResponse> {
  try {
    // 1. Complete thirdweb authentication
    if (!THIRDWEB_CLIENT_ID) {
      throw new Error('Thirdweb Client ID not configured');
    }

    console.log('🔐 Verifying code for:', email, 'Code length:', otp.length, 'Code:', otp.substring(0, 2) + '****');

    // Get stored challenge if available
    const storedChallenge = sessionStorage.getItem(`thirdweb_challenge_${email}`);
    let challenge = null;
    if (storedChallenge) {
      try {
        challenge = JSON.parse(storedChallenge);
        console.log('📝 Using stored challenge');
      } catch (e) {
        console.warn('⚠️ Failed to parse stored challenge');
      }
    }

    // Try 'code' parameter first (most common)
    let completeBody: any = {
      method: 'email',
      email,
      code: otp,
    };

    if (challenge) {
      completeBody.challenge = challenge;
    }

    let authResponse = await fetch(`${THIRDWEB_API}/auth/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': THIRDWEB_CLIENT_ID,
      },
      body: JSON.stringify(completeBody),
    });

    // If 'code' doesn't work, try 'verificationCode'
    if (!authResponse.ok) {
      const errorData = await authResponse.json().catch(() => ({}));
      console.log('⚠️ First attempt with "code" failed:', {
        status: authResponse.status,
        error: errorData
      });

      console.log('🔄 Retrying with "verificationCode" parameter...');
      completeBody = {
        method: 'email',
        email,
        verificationCode: otp,
      };

      if (challenge) {
        completeBody.challenge = challenge;
      }

      authResponse = await fetch(`${THIRDWEB_API}/auth/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': THIRDWEB_CLIENT_ID,
        },
        body: JSON.stringify(completeBody),
      });
    }

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText || `HTTP ${authResponse.status}: ${authResponse.statusText}` };
      }

      // Log full error details including validation issues
      console.error('❌ Thirdweb complete error:', {
        status: authResponse.status,
        statusText: authResponse.statusText,
        error: errorData,
        errorIssues: errorData.error?.issues || errorData.issues || [],
        requestBody: completeBody,
        endpoint: `${THIRDWEB_API}/auth/complete`
      });

      // Show validation errors if present
      if (errorData.error?.issues) {
        console.error('📋 Validation errors:', errorData.error.issues);
      }

      throw new Error(errorData.message || errorData.error?.message || 'Invalid verification code');
    }

    const authResult = await authResponse.json();
    console.log('✅ Email verified with thirdweb:', authResult);

    // 2. Save to database and get referral code
    if (supabase) {
      try {
        // Check if email already exists
        const { data: existing } = await supabase
          .from('waitlist_sync')
          .select('email, referral_code')
          .eq('email', email.toLowerCase())
          .maybeSingle();

        if (existing) {
          // User already exists - return their existing code
          const referralLink = `https://bearo.cash/?ref=${encodeURIComponent(existing.referral_code)}`;
          storeLocalFallback(authResult, email, tierNumber, tierName, existing.referral_code, referralLink);

          return {
            success: true,
            tier: tierName,
            tierNumber,
            position: 0,
            spotsLeft: 0,
            userId: authResult.userId,
            referralCode: existing.referral_code,
            referralLink,
          };
        }

        // Get current count for position
        const { count: currentCount } = await supabase
          .from('waitlist_sync')
          .select('*', { count: 'exact', head: true });

        const signupPosition = (currentCount || 0) + 1;

        // Check tier availability
        const { count: tierCount } = await supabase
          .from('waitlist_sync')
          .select('*', { count: 'exact', head: true })
          .eq('tier_number', tierNumber);

        const maxSpots = TIER_MAX_SPOTS[tierNumber] || 0;
        const claimed = tierCount || 0;
        const spotsLeft = maxSpots - claimed;

        if (spotsLeft <= 0) {
          throw new Error(`${tierName} tier is full. Please select another tier.`);
        }

        // Generate referral code (database trigger will also generate one, but we need it for the response)
        const referralCode = generateReferralCode();
        const referralLink = `https://bearo.cash/?ref=${encodeURIComponent(referralCode)}`;

        // Validate referrer code if provided (prevent gaming)
        let validatedReferrer: string | undefined = undefined;
        if (referredBy) {
          const referrerCode = referredBy.toUpperCase().trim();
          // Prevent self-referral (comparing with the code we're about to create)
          if (referrerCode === referralCode) {
            console.warn('⚠️ Self-referral attempt blocked:', email);
          } else if (await validateReferrerCode(referrerCode)) {
            validatedReferrer = referrerCode;
            console.log('✅ Valid referrer code:', referrerCode);
          } else {
            console.warn('⚠️ Invalid referrer code ignored:', referrerCode);
          }
        }

        // Insert to waitlist_sync
        const waitlistEntry: WaitlistSyncEntry = {
          email: email.toLowerCase(),
          tier_name: tierName,
          tier_number: tierNumber,
          signup_position: signupPosition,
          referral_code: referralCode,
          referred_by: validatedReferrer, // Track who referred them
        };

        const { error: insertError } = await supabase
          .from('waitlist_sync')
          .insert([waitlistEntry]);

        if (insertError) {
          console.error('Database insert error:', insertError);
          if (insertError.code === '23505') { // Unique constraint violation
            throw new Error('Email already registered');
          }
          throw new Error(`Database error: ${insertError.message}`);
        }

        console.log(`🎉 ${email} claimed ${tierName} tier at position #${signupPosition} with code ${referralCode}!`);

        // Also insert to airdrop_allocations for leaderboard
        // NOTE: The security_hardening.sql trigger will auto-sync this, but we do it here for immediate response
        const baseAmount = TIER_BASE_AMOUNTS[tierNumber] || 100;
        try {
          await supabase
            .from('airdrop_allocations')
            .insert([{
              email: email.toLowerCase(),
              referral_code: referralCode,
              tier_name: tierName,
              tier_number: tierNumber,
              base_amount: baseAmount,
              referral_amount: 0,
              action_amount: 0,
              bonus_multiplier: 1.5, // Week 1 early bird bonus
              referral_count: 0,
              referred_by_code: validatedReferrer, // Track referrer for rewards
            }]);
        } catch (airdropError) {
          console.warn('[Airdrop] Could not insert airdrop_allocations (non-fatal):', airdropError);
        }

        // If user signed up with a referral code, trigger airdrop to referrer
        if (validatedReferrer) {
          try {
            // Look up referrer's email from their code
            const { data: referrerData } = await supabase
              .from('airdrop_allocations')
              .select('email')
              .eq('referral_code', validatedReferrer)
              .single();

            if (referrerData?.email) {
              // Increment referrer's count
              const { data: currentData } = await supabase
                .from('airdrop_allocations')
                .select('referral_count')
                .eq('referral_code', validatedReferrer)
                .single();

              if (currentData) {
                await supabase
                  .from('airdrop_allocations')
                  .update({ referral_count: (currentData.referral_count || 0) + 1 })
                  .eq('referral_code', validatedReferrer);
              }

              // Trigger airdrop to referrer
              const airdropResult = await triggerReferralAirdrop(
                referrerData.email,
                email.toLowerCase(),
                'signup'
              );
              if (airdropResult.success) {
                console.log(`🪂 Signup airdrop sent to referrer ${referrerData.email}`);
              }
            }
          } catch (referrerError) {
            console.warn('[Signup] Referrer airdrop error (non-fatal):', referrerError);
          }
        }

        storeLocalFallback(authResult, email, tierNumber, tierName, referralCode, referralLink);

        return {
          success: true,
          tier: tierName,
          tierNumber,
          position: signupPosition,
          spotsLeft: spotsLeft - 1,
          userId: authResult.userId,
          referralCode,
          referralLink,
        };
      } catch (dbError: any) {
        // SECURITY: Do NOT generate codes without database persistence
        // This prevents gaming where users get codes that aren't tracked
        console.error('❌ Database error during signup:', dbError);

        // If it's a known error, provide helpful message
        if (dbError.message?.includes('full')) {
          throw new Error(`${tierName} tier is full. Please select another tier.`);
        }
        if (dbError.message?.includes('already') || dbError.code === '23505') {
          throw new Error('This email is already registered. Please use your existing code.');
        }
        if (dbError.message?.includes('referrer')) {
          throw new Error('Invalid referral code. Please check and try again.');
        }

        // Generic database error - user must retry
        throw new Error('Unable to complete registration. Please try again in a moment.');
      }
    } else {
      // SECURITY: Require database connection - no localStorage fallback
      console.error('❌ Supabase not configured');
      throw new Error('Service temporarily unavailable. Please try again later.');
    }
  } catch (error: any) {
    console.error('Verification error:', error);
    throw error;
  }
}

// Get waitlist count - from Supabase waitlist_sync table
export async function getWaitlistCountAPI(): Promise<number> {
  try {
    if (supabase) {
      const { count, error } = await supabase
        .from('waitlist_sync')
        .select('*', { count: 'exact', head: true });

      if (!error && count !== null) {
        return count;
      }
    }

    // Fallback to API endpoint if Supabase not configured
    const response = await fetch(`${API_BASE}/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'count' }),
    });

    if (response.ok) {
      const data: CountResponse = await response.json();
      return data.count;
    }

    return 0;
  } catch (error) {
    console.error('Waitlist count error:', error);
    return 0;
  }
}

// Check if user already exists and return their tier info
export interface ExistingUserInfo {
  exists: boolean;
  email?: string;
  tierNumber?: number;
  tierName?: string;
  referralCode?: string;
  referralLink?: string;
  walletAddress?: string; // Solana wallet for airdrops
}

export async function checkExistingUser(email: string): Promise<ExistingUserInfo> {
  console.log('[checkExistingUser] Checking email:', email);

  try {
    if (!supabase) {
      console.warn('[checkExistingUser] Supabase client not initialized');
      return { exists: false };
    }

    console.log('[checkExistingUser] Querying waitlist_sync...');

    // Check waitlist_sync first
    const { data: waitlistData, error: waitlistError } = await supabase
      .from('waitlist_sync')
      .select('email, tier_name, tier_number, referral_code, solana_wallet_address')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    console.log('[checkExistingUser] Query result:', { waitlistData, waitlistError });

    if (waitlistError) {
      console.error('[checkExistingUser] Waitlist query error:', waitlistError);
      return { exists: false };
    }

    if (waitlistData) {
      const referralLink = `https://bearo.cash/?ref=${encodeURIComponent(waitlistData.referral_code)}`;
      console.log(`✅ Found existing user: ${email} - ${waitlistData.tier_name} - wallet: ${waitlistData.solana_wallet_address || 'not set'}`);
      return {
        exists: true,
        email: waitlistData.email,
        tierNumber: waitlistData.tier_number,
        tierName: waitlistData.tier_name,
        referralCode: waitlistData.referral_code,
        referralLink,
        walletAddress: waitlistData.solana_wallet_address || undefined,
      };
    }

    console.log('[checkExistingUser] User not found in database');
    return { exists: false };
  } catch (error) {
    console.error('[checkExistingUser] Error:', error);
    return { exists: false };
  }
}

// Queue airdrop for manual review instead of instant send (anti-sybil measure)
const BEARCO_TOKEN_ADDRESS = 'FdFUGJSzJXDCZemQbkBwYs3tZEvixyEc8cZfRqJrpump';
const DEFAULT_AIRDROP_AMOUNT = '500000000'; // 500 tokens (6 decimals)

async function triggerReferralAirdrop(
  referrerEmail: string,
  refereeEmail: string,
  referralType: 'signup' | 'retroactive'
): Promise<{ success: boolean; queued?: boolean }> {
  try {
    if (!supabase) {
      console.warn('[triggerAirdrop] Supabase not configured');
      return { success: false };
    }

    console.log(`📋 Queuing ${referralType} airdrop for referrer: ${referrerEmail}`);

    // Check if referrer is flagged/banned
    const { data: flaggedAccount } = await supabase
      .from('flagged_accounts')
      .select('is_banned, flag_type')
      .eq('email', referrerEmail.toLowerCase())
      .maybeSingle();

    if (flaggedAccount?.is_banned) {
      console.warn(`🚫 Referrer ${referrerEmail} is banned - airdrop blocked`);
      return { success: false };
    }

    // Get referrer's wallet address
    const { data: referrerData } = await supabase
      .from('waitlist_sync')
      .select('solana_wallet_address')
      .eq('email', referrerEmail.toLowerCase())
      .single();

    if (!referrerData?.solana_wallet_address) {
      console.warn(`⚠️ Referrer ${referrerEmail} has no wallet - cannot queue airdrop`);
      return { success: false };
    }

    // Queue the airdrop for manual review
    const { error: queueError } = await supabase
      .from('airdrop_queue')
      .insert({
        referrer_email: referrerEmail.toLowerCase(),
        referee_email: refereeEmail.toLowerCase(),
        referrer_wallet: referrerData.solana_wallet_address,
        amount: DEFAULT_AIRDROP_AMOUNT,
        token_address: BEARCO_TOKEN_ADDRESS,
        referral_type: referralType,
        status: flaggedAccount ? 'pending' : 'pending', // Could auto-approve non-flagged later
        notes: flaggedAccount ? `Referrer flagged as: ${flaggedAccount.flag_type}` : null,
      });

    if (queueError) {
      console.error('[triggerAirdrop] Queue error:', queueError);
      return { success: false };
    }

    console.log(`✅ Airdrop queued for review: ${referrerEmail}`);

    return {
      success: true,
      queued: true
    };
  } catch (error) {
    console.error('[triggerAirdrop] Error:', error);
    return { success: false };
  }
}

// Link a referral code retroactively (for users who signed up without a referral)
export interface LinkReferralResult {
  success: boolean;
  message: string;
  referrerCode?: string;
  airdropSent?: boolean;
}

export async function linkReferralRetroactively(
  userEmail: string,
  referrerCode: string
): Promise<LinkReferralResult> {
  console.log('[linkReferral] Linking referral for:', userEmail, 'to referrer:', referrerCode);

  if (!supabase) {
    return { success: false, message: 'Database not available' };
  }

  const normalizedEmail = userEmail.toLowerCase().trim();
  const normalizedCode = referrerCode.toUpperCase().trim();

  try {
    // 1. Check if user exists
    const { data: userData, error: userError } = await supabase
      .from('waitlist_sync')
      .select('email, referral_code, referred_by, linked_referrer_code')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (userError || !userData) {
      return { success: false, message: 'User not found. Please sign up first.' };
    }

    // 2. Prevent self-referral
    if (userData.referral_code === normalizedCode) {
      return { success: false, message: 'You cannot use your own referral code.' };
    }

    // 3. Check if already has a referrer
    if (userData.referred_by || userData.linked_referrer_code) {
      return {
        success: false,
        message: 'You already have a linked referral code.'
      };
    }

    // 4. Validate referrer code exists
    const { data: referrerData, error: referrerError } = await supabase
      .from('airdrop_allocations')
      .select('referral_code, email')
      .eq('referral_code', normalizedCode)
      .maybeSingle();

    if (referrerError || !referrerData) {
      return { success: false, message: 'Invalid referral code. Please check and try again.' };
    }

    // 5. Prevent circular referral (A refers B, B tries to refer A)
    const { data: circularCheck } = await supabase
      .from('airdrop_allocations')
      .select('referred_by_code')
      .eq('email', referrerData.email)
      .maybeSingle();

    if (circularCheck?.referred_by_code === userData.referral_code) {
      return { success: false, message: 'Circular referrals are not allowed.' };
    }

    // 6. Update waitlist_sync with linked referrer
    const { error: updateWaitlistError } = await supabase
      .from('waitlist_sync')
      .update({
        linked_referrer_code: normalizedCode,
        linked_at: new Date().toISOString(),
        link_verified: true,
      })
      .eq('email', normalizedEmail);

    if (updateWaitlistError) {
      console.error('[linkReferral] Waitlist update error:', updateWaitlistError);
      return { success: false, message: 'Failed to link referral. Please try again.' };
    }

    // 7. Update airdrop_allocations with retroactive referrer
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
      console.error('[linkReferral] Airdrop update error:', updateAirdropError);
      // Non-fatal - waitlist was updated
    }

    // 8. Increment referrer's count
    const { error: incrementError } = await supabase.rpc('increment_referral_count', {
      referrer_code: normalizedCode,
    });

    if (incrementError) {
      // Try manual increment if RPC doesn't exist
      console.warn('[linkReferral] RPC failed, trying manual increment:', incrementError);
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

    // 9. Record the completion (for audit trail)
    try {
      await supabase
        .from('referral_completions')
        .insert({
          referrer_code: normalizedCode,
          referee_code: userData.referral_code,
          referee_email: normalizedEmail,
          completion_type: 'retroactive',
          week_number: 1, // Current week
          base_reward: 500, // Retroactive referral reward
          multiplier: 1.5, // Early bird multiplier
          final_reward: 750,
          verified: true,
          verified_at: new Date().toISOString(),
        });
    } catch (completionError) {
      console.warn('[linkReferral] Completion record error (non-fatal):', completionError);
    }

    console.log(`✅ Retroactive referral linked: ${normalizedEmail} -> ${normalizedCode}`);

    // 10. Trigger airdrop to referrer
    let airdropSent = false;
    try {
      const airdropResult = await triggerReferralAirdrop(
        referrerData.email,
        normalizedEmail,
        'retroactive'
      );
      airdropSent = airdropResult.success;
      if (airdropSent) {
        console.log(`🪂 Airdrop sent to referrer ${referrerData.email}`);
      }
    } catch (airdropError) {
      console.warn('[linkReferral] Airdrop trigger error (non-fatal):', airdropError);
    }

    return {
      success: true,
      message: airdropSent
        ? 'Referral linked successfully! Your referrer has been queued for a $BEARCO airdrop.'
        : 'Referral linked successfully! Both you and your referrer will receive bonus tokens.',
      referrerCode: normalizedCode,
      airdropSent,
    };
  } catch (error: any) {
    console.error('[linkReferral] Error:', error);
    return { success: false, message: error.message || 'An error occurred. Please try again.' };
  }
}

// Save wallet address for a user (required before showing referral code)
export interface SaveWalletResult {
  success: boolean;
  message: string;
}

export async function saveWalletAddress(
  email: string,
  walletAddress: string
): Promise<SaveWalletResult> {
  console.log('[saveWalletAddress] Saving wallet for:', email, 'wallet:', walletAddress.substring(0, 8) + '...');

  if (!supabase) {
    return { success: false, message: 'Database not available' };
  }

  const normalizedEmail = email.toLowerCase().trim();
  const trimmedWallet = walletAddress.trim();

  try {
    // SECURITY: First verify that user has completed thirdweb authentication
    const { data: authCheck } = await supabase
      .from('waitlist')
      .select('thirdweb_user_id')
      .eq('email', normalizedEmail)
      .single();

    if (!authCheck) {
      console.error('[saveWalletAddress] User not found:', normalizedEmail);
      return { success: false, message: 'User not found. Please complete signup first.' };
    }

    if (!authCheck.thirdweb_user_id) {
      console.error('[saveWalletAddress] BLOCKED: Attempt to set wallet without auth for:', normalizedEmail);
      return { success: false, message: 'Authentication required. Please verify your email first.' };
    }

    // Update base waitlist table (not the view) with wallet address
    // Double-check thirdweb_user_id matches to prevent spoofing
    const { error: updateError } = await supabase
      .from('waitlist')
      .update({
        solana_wallet_address: trimmedWallet,
        wallet_set_at: new Date().toISOString(),
      })
      .eq('email', normalizedEmail)
      .eq('thirdweb_user_id', authCheck.thirdweb_user_id);

    if (updateError) {
      console.error('[saveWalletAddress] Update error:', updateError);
      return { success: false, message: 'Failed to save wallet address. Please try again.' };
    }

    // Also update airdrop_allocations if exists (uses 'wallet_address' not 'solana_wallet_address')
    try {
      await supabase
        .from('airdrop_allocations')
        .update({
          wallet_address: trimmedWallet,
        })
        .eq('email', normalizedEmail);
    } catch (airdropError) {
      console.warn('[saveWalletAddress] Airdrop table update (non-fatal):', airdropError);
    }

    console.log(`✅ Wallet saved for ${normalizedEmail}: ${trimmedWallet}`);

    return {
      success: true,
      message: 'Wallet address saved successfully!',
    };
  } catch (error: any) {
    console.error('[saveWalletAddress] Error:', error);
    return { success: false, message: error.message || 'An error occurred. Please try again.' };
  }
}

// Get tier availability - from Supabase waitlist_sync table
export async function getTierAvailabilityAPI(): Promise<Record<number, TierAvailability>> {
  try {
    if (supabase) {
      const availability: Record<number, TierAvailability> = {};

      // Get claimed counts for each tier
      for (const [tierNumStr, maxSpots] of Object.entries(TIER_MAX_SPOTS)) {
        const tierNum = parseInt(tierNumStr);
        const { count, error } = await supabase
          .from('waitlist_sync')
          .select('*', { count: 'exact', head: true })
          .eq('tier_number', tierNum);

        if (error) {
          console.error(`Tier ${tierNum} availability error:`, error);
          continue;
        }

        const claimed = count || 0;
        availability[tierNum] = {
          maxSpots,
          claimed,
          available: maxSpots - claimed,
        };
      }

      return availability;
    }

    // Fallback to API endpoint if Supabase not configured
    const response = await fetch(`${API_BASE}/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'tier-availability' }),
    });

    if (!response.ok) return {};

    const data = await response.json();
    return data.availability;
  } catch (error) {
    console.error('Tier availability error:', error);
    return {};
  }
}
