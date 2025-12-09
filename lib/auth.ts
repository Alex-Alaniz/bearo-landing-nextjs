// User authentication state management

interface AuthSession {
  token: string;
  userId: string;
  walletAddress: string;
  email: string;
  isNewUser: boolean;
}

interface UserTier {
  tierNumber: number;
  tierName: string;
  claimedAt: number;
}

// Get current auth session
export function getAuthSession(): AuthSession | null {
  try {
    const session = localStorage.getItem('bearo_auth');
    return session ? JSON.parse(session) : null;
  } catch {
    return null;
  }
}

// Get user tier
export function getUserTier(): UserTier | null {
  try {
    const tier = localStorage.getItem('bearo_user_tier');
    return tier ? JSON.parse(tier) : null;
  } catch {
    return null;
  }
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  return getAuthSession() !== null;
}

// Logout user
export function logout() {
  localStorage.removeItem('bearo_auth');
  localStorage.removeItem('bearo_user_tier');
  window.location.reload();
}

// Get tier badge info
export function getTierBadge(tierNumber: number): { label: string; color: string } {
  const badges: Record<number, { label: string; color: string }> = {
    0: { label: 'FM', color: 'from-amber-500 to-yellow-500' },
    1: { label: 'OG', color: 'from-amber-500 to-orange-500' },
    2: { label: 'AI', color: 'from-orange-500 to-red-500' },
    3: { label: 'BC', color: 'from-yellow-500 to-orange-500' },
    4: { label: 'EA', color: 'from-bearo-honey to-bearo-amber' },
    5: { label: 'PW', color: 'from-green-500 to-emerald-500' },
    6: { label: 'CM', color: 'from-blue-500 to-cyan-500' },
  };

  return badges[tierNumber] || { label: 'BU', color: 'from-gray-500 to-slate-500' };
}

