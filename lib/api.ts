// Frontend API client for thirdweb authentication + Supabase database sync

import { supabase, WaitlistEntry } from './supabase';

// Use correct thirdweb API base URL
const THIRDWEB_API = 'https://api.thirdweb.com/v1';
const THIRDWEB_CLIENT_ID = import.meta.env.VITE_THIRDWEB_CLIENT_ID || '';
const API_BASE = import.meta.env.VITE_API_URL || '/api';

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

// Verify OTP and claim tier - syncs with Supabase database
export async function verifyAndClaimTier(
  email: string,
  otp: string,
  tierNumber: number,
  tierName: string
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

    // 2. Check if email already exists in database
    if (supabase) {
      const { data: existing, error: checkError } = await supabase
        .from('waitlist')
        .select('email')
        .eq('email', email)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle no results gracefully

      // If we got data (not null), email already exists
      if (existing && !checkError) {
        throw new Error('This email is already registered on the waitlist');
      }
      
      // Log but don't fail on check errors (406, etc.) - insert will handle duplicates
      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned (expected)
        console.warn('⚠️ Email check warning (non-fatal):', checkError);
      }

      // 3. Get next signup position
      const { count: currentCount } = await supabase
        .from('waitlist')
        .select('*', { count: 'exact', head: true });

      const signupPosition = (currentCount || 0) + 1;

      // 4. Check tier availability
      const { count: tierCount } = await supabase
        .from('waitlist')
        .select('*', { count: 'exact', head: true })
        .eq('tier_number', tierNumber)
        .eq('verified', true);

      const maxSpots = TIER_MAX_SPOTS[tierNumber] || 0;
      const claimed = tierCount || 0;
      const spotsLeft = maxSpots - claimed;

      if (spotsLeft <= 0) {
        throw new Error(`${tierName} tier is full. Please select another tier.`);
      }

      // 5. Save to Supabase database
      const waitlistEntry: WaitlistEntry = {
        email,
        tier_name: tierName,
        tier_number: tierNumber,
        signup_position: signupPosition,
        thirdweb_user_id: authResult.userId,
        verified: true,
        claimed_at: new Date().toISOString(),
        metadata: {
          walletAddress: authResult.walletAddress,
          isNewUser: authResult.isNewUser,
        }
      };

      const { data: savedEntry, error: dbError } = await supabase
        .from('waitlist')
        .insert([waitlistEntry])
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        if (dbError.code === '23505') { // Unique constraint violation
          throw new Error('Email already registered');
        }
        throw new Error(`Database error: ${dbError.message}`);
      }

      console.log(`🎉 ${email} claimed ${tierName} tier at position #${signupPosition}!`);

      // 6. Store auth session in localStorage (fallback)
      localStorage.setItem('bearo_auth', JSON.stringify({
        token: authResult.token,
        userId: authResult.userId,
        walletAddress: authResult.walletAddress,
        email: email,
        isNewUser: authResult.isNewUser,
      }));

      // 7. Store tier claim in localStorage (fallback)
      localStorage.setItem('bearo_user_tier', JSON.stringify({
        tierNumber,
        tierName,
        claimedAt: Date.now(),
      }));

      return {
        success: true,
        tier: tierName,
        tierNumber,
        position: signupPosition,
        spotsLeft: spotsLeft - 1,
        userId: authResult.userId,
      };
    } else {
      // Fallback to localStorage if Supabase not configured
      console.warn('⚠️ Supabase not configured, using localStorage fallback');
      
      localStorage.setItem('bearo_auth', JSON.stringify({
        token: authResult.token,
        userId: authResult.userId,
        walletAddress: authResult.walletAddress,
        email: email,
        isNewUser: authResult.isNewUser,
      }));

      localStorage.setItem('bearo_user_tier', JSON.stringify({
        tierNumber,
        tierName,
        claimedAt: Date.now(),
      }));

      return {
        success: true,
        tier: tierName,
        tierNumber,
        position: 0,
        spotsLeft: 0,
        userId: authResult.userId,
      };
    }
  } catch (error: any) {
    console.error('Verification error:', error);
    throw error;
  }
}

// Get waitlist count - from Supabase (synced with thirdweb on signup)
export async function getWaitlistCountAPI(): Promise<number> {
  try {
    // Use Supabase count - this is synced with thirdweb on each signup
    // Supabase is the cached source of truth for display purposes
    if (supabase) {
      const { count, error } = await supabase
        .from('waitlist')
        .select('*', { count: 'exact', head: true })
        .eq('verified', true);

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

// Get tier availability - from Supabase database
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
          .eq('tier_number', tierNum)
          .eq('verified', true);

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
