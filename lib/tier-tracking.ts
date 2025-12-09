// Tier tracking with proper position management
// Handles cases where user #5 claims OG Founder and user #20 claims General

interface TierClaim {
  email: string;
  tierNumber: number;
  tierName: string;
  signupPosition: number; // When they signed up (e.g., #5, #20)
  claimedAt: number;
  verified: boolean;
}

// Get next available signup position
export function getNextSignupPosition(): number {
  try {
    const waitlist = localStorage.getItem('bearo_waitlist');
    if (!waitlist) return 1; // First signup is position 1

    const entries = JSON.parse(waitlist);
    return entries.length + 1;
  } catch {
    return 1;
  }
}

// Get claimed spots for a specific tier
export function getClaimedSpotsForTier(tierNumber: number): number {
  try {
    const waitlist = localStorage.getItem('bearo_waitlist');
    if (!waitlist) return 0;

    const entries = JSON.parse(waitlist);
    return entries.filter((e: any) => e.tierNumber === tierNumber).length;
  } catch {
    return 0;
  }
}

// Check if tier has spots available
export function isTierAvailable(tierNumber: number): { available: boolean; spotsLeft: number } {
  const maxSpots: Record<number, number> = {
    1: 10,  // OG Founder
    2: 40,  // Alpha Insider  
    3: 50,  // Beta Crew
    4: 400, // Early Adopter
    5: 500, // Pioneer Wave
    6: 4000 // Community
  };

  const claimed = getClaimedSpotsForTier(tierNumber);
  const max = maxSpots[tierNumber] || 0;
  const spotsLeft = max - claimed;

  return {
    available: spotsLeft > 0,
    spotsLeft
  };
}

// Get tier distribution for analytics
export function getTierDistribution() {
  try {
    const waitlist = localStorage.getItem('bearo_waitlist');
    if (!waitlist) return {};

    const entries = JSON.parse(waitlist);
    
    const distribution: Record<string, {
      count: number;
      positions: number[];
      emails: string[];
    }> = {};

    entries.forEach((entry: any) => {
      const tier = entry.tier || 'Unknown';
      
      if (!distribution[tier]) {
        distribution[tier] = { count: 0, positions: [], emails: [] };
      }
      
      distribution[tier].count++;
      distribution[tier].positions.push(entry.position);
      distribution[tier].emails.push(entry.email);
    });

    return distribution;
  } catch {
    return {};
  }
}

// Export waitlist with proper tier tracking
export function exportWaitlistWithTiers() {
  try {
    const waitlist = localStorage.getItem('bearo_waitlist');
    if (!waitlist) return [];

    const entries = JSON.parse(waitlist);
    
    // Sort by tier priority for TestFlight invites
    return entries.sort((a: any, b: any) => {
      // Lower tier number = higher priority
      if (a.tierNumber !== b.tierNumber) {
        return a.tierNumber - b.tierNumber;
      }
      // Within same tier, earlier signup = higher priority
      return a.position - b.position;
    });
  } catch {
    return [];
  }
}

// Get users for TestFlight invite batch (by tier priority)
export function getTestFlightInviteBatch(batchSize: number = 100): string[] {
  const sorted = exportWaitlistWithTiers();
  return sorted.slice(0, batchSize).map((entry: any) => entry.email);
}

// Example: Get OG Founders for first TestFlight batch
export function getOGFoundersForTestFlight(): Array<{
  email: string;
  position: number;
  claimedAt: string;
}> {
  try {
    const waitlist = localStorage.getItem('bearo_waitlist');
    if (!waitlist) return [];

    const entries = JSON.parse(waitlist);
    
    return entries
      .filter((e: any) => e.tierNumber === 1) // OG Founders only
      .map((e: any) => ({
        email: e.email,
        position: e.position,
        claimedAt: new Date(e.timestamp).toISOString(),
      }))
      .sort((a: any, b: any) => a.position - b.position); // Earliest first
  } catch {
    return [];
  }
}

// Console access for admin
if (typeof window !== 'undefined') {
  (window as any).bearoTierTracking = {
    getNextSignupPosition,
    getClaimedSpotsForTier,
    isTierAvailable,
    getTierDistribution,
    exportWaitlistWithTiers,
    getTestFlightInviteBatch,
    getOGFoundersForTestFlight,
  };
  
  console.log('🎯 Tier tracking loaded. Use: window.bearoTierTracking');
}

