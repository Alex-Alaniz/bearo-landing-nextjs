// Frontend API client for thirdweb authentication + Supabase database sync

import { supabase } from './supabase';
import type { Platform } from './deviceDetection';

// Auth result type from thirdweb
interface ThirdwebAuthResult {
  token?: string;
  userId?: string;
  walletAddress?: string;
  isNewUser?: boolean;
}

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

function storeLocalFallback(authResult: ThirdwebAuthResult, email: string, tierNumber: number, tierName: string, referralCode: string, referralLink: string) {
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
  } catch (error) {
    console.error('Thirdweb auth error:', error);
    throw error;
  }
}

// Verify OTP and claim tier - syncs with Supabase database
export async function verifyAndClaimTier(
  email: string,
  otp: string,
  tierNumber: number,
  tierName: string,
  referredBy?: string, // Optional: referral code of who referred this user
  platform?: Platform  // Optional: device platform (ios, android, desktop, unknown)
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
    let completeBody: Record<string, string> = {
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

    // 2. Save to database via secure API endpoint (uses service role)
    try {
      const signupResponse = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase(),
          tierNumber,
          tierName,
          referredBy,
          thirdwebUserId: authResult.userId,
          platform,
        }),
      });

      const signupResult = await signupResponse.json();

      if (!signupResponse.ok) {
        throw new Error(signupResult.error || 'Signup failed');
      }

      const referralCode = signupResult.referralCode;
      const referralLink = signupResult.referralLink;

      // Store local fallback
      storeLocalFallback(authResult, email, tierNumber, tierName, referralCode, referralLink);

      return {
        success: true,
        tier: tierName,
        tierNumber,
        position: signupResult.position || 0,
        spotsLeft: signupResult.spotsLeft || 0,
        userId: authResult.userId,
        referralCode,
        referralLink,
      };
    } catch (signupError) {
      console.error('❌ Signup API error:', signupError);
      const message = signupError instanceof Error ? signupError.message : 'Unable to complete registration. Please try again.';
      throw new Error(message);
    }
  } catch (error) {
    console.error('Verification error:', error);
    throw error;
  }
}

// Get waitlist count - from Supabase waitlist table
export async function getWaitlistCountAPI(): Promise<number> {
  try {
    if (supabase) {
      const { count, error } = await supabase
        .from('waitlist')
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
  isAuthenticated?: boolean; // true if thirdweb_user_id is set
}

export async function checkExistingUser(email: string): Promise<ExistingUserInfo> {
  console.log('[checkExistingUser] Checking email:', email);

  try {
    if (!supabase) {
      console.warn('[checkExistingUser] Supabase client not initialized');
      return { exists: false };
    }

    console.log('[checkExistingUser] Querying waitlist table...');

    // Query the waitlist table for user info (includes wallet and auth status)
    const { data: waitlistData, error: waitlistError } = await supabase
      .from('waitlist')
      .select('email, tier_name, tier_number, referral_code, solana_wallet_address, thirdweb_user_id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    console.log('[checkExistingUser] Query result:', { waitlistData, waitlistError });

    if (waitlistError) {
      console.error('[checkExistingUser] Waitlist query error:', waitlistError);
      return { exists: false };
    }

    if (waitlistData) {
      const isAuthenticated = !!waitlistData.thirdweb_user_id;
      const referralLink = `https://bearo.cash/?ref=${encodeURIComponent(waitlistData.referral_code)}`;
      console.log(`✅ Found existing user: ${email} - ${waitlistData.tier_name} - auth: ${isAuthenticated} - wallet: ${waitlistData.solana_wallet_address || 'not set'}`);
      return {
        exists: true,
        email: waitlistData.email,
        tierNumber: waitlistData.tier_number,
        tierName: waitlistData.tier_name,
        referralCode: waitlistData.referral_code,
        referralLink,
        walletAddress: waitlistData.solana_wallet_address || undefined,
        isAuthenticated,
      };
    }

    console.log('[checkExistingUser] User not found in database');
    return { exists: false };
  } catch (error) {
    console.error('[checkExistingUser] Error:', error);
    return { exists: false };
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

  try {
    // All validation and writes happen server-side (service role)
    const response = await fetch(`${API_BASE}/link-referral`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: userEmail.toLowerCase().trim(),
        referrerCode: referrerCode.toUpperCase().trim(),
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      return { success: false, message: result.error || 'Failed to link referral. Please try again.' };
    }

    console.log(`✅ Retroactive referral linked: ${userEmail} -> ${result.referrerCode}`);

    return {
      success: true,
      message: result.message || 'Referral linked successfully!',
      referrerCode: result.referrerCode,
      airdropSent: result.airdropSent,
    };
  } catch (error) {
    console.error('[linkReferral] Error:', error);
    const message = error instanceof Error ? error.message : 'An error occurred. Please try again.';
    return { success: false, message };
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

  try {
    // Auth check, wallet validation, and writes happen server-side (service role)
    const response = await fetch(`${API_BASE}/link-wallet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.toLowerCase().trim(),
        walletAddress: walletAddress.trim(),
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      return { success: false, message: result.error || 'Failed to save wallet address. Please try again.' };
    }

    console.log(`✅ Wallet saved for ${email}`);

    return {
      success: true,
      message: result.message || 'Wallet address saved successfully!',
    };
  } catch (error) {
    console.error('[saveWalletAddress] Error:', error);
    const message = error instanceof Error ? error.message : 'An error occurred. Please try again.';
    return { success: false, message };
  }
}

// Get tier availability - from Supabase waitlist table
export async function getTierAvailabilityAPI(): Promise<Record<number, TierAvailability>> {
  try {
    if (supabase) {
      const availability: Record<number, TierAvailability> = {};

      // Get claimed counts for each tier
      for (const [tierNumStr, maxSpots] of Object.entries(TIER_MAX_SPOTS)) {
        const tierNum = parseInt(tierNumStr);
        const { count, error } = await supabase
          .from('waitlist')
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
