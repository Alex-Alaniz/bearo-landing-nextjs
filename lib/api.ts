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
