// Waitlist management for TestFlight beta invites
// Separate thirdweb project - just collecting emails (no wallets)

const THIRDWEB_CLIENT_ID = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || '';
const THIRDWEB_SECRET_KEY = process.env.THIRDWEB_SECRET_KEY || ''; // Server-side only

interface WaitlistEntry {
  email: string;
  timestamp: number;
  userId?: string;
  walletAddress?: string;
  tier?: string;
  tierNumber?: number;
  position?: number;
}

// Get tier info based on position
export function getTierForPosition(position: number): { tier: string; tierNumber: number } {
  if (position === 0) return { tier: '$Bearco', tierNumber: 0 };
  if (position <= 10) return { tier: 'OG Founder', tierNumber: 1 };
  if (position <= 50) return { tier: 'Alpha Insider', tierNumber: 2 };
  if (position <= 100) return { tier: 'Beta Crew', tierNumber: 3 };
  if (position <= 500) return { tier: 'Early Adopter', tierNumber: 4 };
  if (position <= 1000) return { tier: 'Pioneer Wave', tierNumber: 5 };
  if (position <= 5000) return { tier: 'Community Member', tierNumber: 6 };
  if (position <= 10000) return { tier: 'General Access', tierNumber: 7 };
  return { tier: 'Waitlist', tierNumber: 8 };
}

// Get real user count from Supabase (thirdweb user-wallets endpoint requires secret key)
export async function getThirdwebUserCount(): Promise<number> {
  try {
    // Use Supabase waitlist count instead - this is the real count of verified users
    const { getWaitlistCountAPI } = await import('./api');
    return await getWaitlistCountAPI();
  } catch (error) {
    console.error('Error fetching user count:', error);
    return 0;
  }
}

// Create user wallet with email and tier metadata
export async function createUserWalletWithTier(email: string, position: number) {
  try {
    if (!THIRDWEB_SECRET_KEY) {
      throw new Error('Thirdweb Secret Key not configured. This requires backend authentication.');
    }

    const tierInfo = getTierForPosition(position);

    const response = await fetch('https://embedded-wallet.thirdweb.com/api/2024-05-05/embedded-wallet/user-wallets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-secret-key': THIRDWEB_SECRET_KEY,
      },
      body: JSON.stringify({
        type: 'email',
        email,
        // Store tier metadata with the user
        metadata: {
          tier: tierInfo.tier,
          tierNumber: tierInfo.tierNumber,
          position: position,
          joinedAt: new Date().toISOString(),
          source: 'waitlist',
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create user wallet');
    }

    const result = await response.json();
    console.log('✅ User created with tier:', {
      email,
      tier: tierInfo.tier,
      position,
    });
    return result;
  } catch (error) {
    console.error('Error creating user wallet:', error);
    throw error;
  }
}

// Initiate email authentication with thirdweb
export async function initiateEmailAuth(email: string) {
  try {
    if (!THIRDWEB_CLIENT_ID) {
      throw new Error('Thirdweb Client ID not configured');
    }

    const response = await fetch('https://embedded-wallet.thirdweb.com/api/2024-05-05/embedded-wallet/auth/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': THIRDWEB_CLIENT_ID,
      },
      body: JSON.stringify({
        email,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to initiate email auth');
    }

    const result = await response.json();
    console.log('📧 Email auth initiated, check inbox for verification');
    return result;
  } catch (error) {
    console.error('Error initiating email auth:', error);
    throw error;
  }
}

// Complete email authentication with verification
export async function completeEmailAuth(email: string, verificationCode: string) {
  try {
    if (!THIRDWEB_CLIENT_ID) {
      throw new Error('Thirdweb Client ID not configured');
    }

    const response = await fetch('https://embedded-wallet.thirdweb.com/api/2024-05-05/embedded-wallet/auth/email/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': THIRDWEB_CLIENT_ID,
      },
      body: JSON.stringify({
        email,
        verificationCode,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to complete email auth');
    }

    const result = await response.json();
    console.log('✅ Email auth completed, wallet created');
    return result;
  } catch (error) {
    console.error('Error completing email auth:', error);
    throw error;
  }
}

// Get dynamic waitlist count (REAL users only - no inflation)
export async function getWaitlistCount(): Promise<number> {
  try {
    // Get real thirdweb user count
    const thirdwebUsers = await getThirdwebUserCount();
    
    // Get local signups
    const localSignups = getLocalSignupCount();
    
    // Return ONLY real signups - no fake base count
    return thirdwebUsers + localSignups;
  } catch (error) {
    console.error('Error getting waitlist count:', error);
    // Fallback to local count only
    return getLocalSignupCount();
  }
}

// Get local signup count (backup method)
function getLocalSignupCount(): number {
  if (typeof window === 'undefined') return 0;
  
  try {
    const waitlist = localStorage.getItem('bearo_waitlist');
    if (!waitlist) return 0;
    
    const entries: WaitlistEntry[] = JSON.parse(waitlist);
    return entries.length;
  } catch (error) {
    return 0;
  }
}

// Add email to waitlist with claimed tier
export function addToWaitlist(
  email: string, 
  userId?: string, 
  claimedTierNumber?: number,
  claimedTierName?: string
): boolean {
  try {
    const waitlist = localStorage.getItem('bearo_waitlist');
    const entries: WaitlistEntry[] = waitlist ? JSON.parse(waitlist) : [];
    
    // Check if email already exists
    const exists = entries.some(entry => entry.email === email);
    if (exists) {
      return false; // Already on waitlist
    }
    
    // Use claimed tier if provided, otherwise auto-assign
    const tierInfo = claimedTierNumber && claimedTierName
      ? { tier: claimedTierName, tierNumber: claimedTierNumber }
      : getTierForPosition(entries.length + 1);
    
    // Calculate position within tier
    const position = entries.length + 1;
    
    // Add new entry with tier info
    entries.push({
      email,
      timestamp: Date.now(),
      userId,
      tier: tierInfo.tier,
      tierNumber: tierInfo.tierNumber,
      position: position,
    });
    
    localStorage.setItem('bearo_waitlist', JSON.stringify(entries));
    console.log(`🎉 ${email} claimed ${tierInfo.tier} tier (Position #${position})`);
    return true;
  } catch (error) {
    console.error('Error adding to waitlist:', error);
    return false;
  }
}

// Check if email is on waitlist
export function isOnWaitlist(email: string): boolean {
  try {
    const waitlist = localStorage.getItem('bearo_waitlist');
    if (!waitlist) return false;
    
    const entries: WaitlistEntry[] = JSON.parse(waitlist);
    return entries.some(entry => entry.email === email);
  } catch (error) {
    console.error('Error checking waitlist:', error);
    return false;
  }
}

// Export waitlist data (for admin/backend sync)
export function exportWaitlist(): WaitlistEntry[] {
  try {
    const waitlist = localStorage.getItem('bearo_waitlist');
    return waitlist ? JSON.parse(waitlist) : [];
  } catch (error) {
    console.error('Error exporting waitlist:', error);
    return [];
  }
}

