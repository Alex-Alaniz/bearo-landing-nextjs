// Admin tools for exporting waitlist data with tiers
// Use this to track who gets what perks

interface WaitlistUser {
  email: string;
  tier: string;
  tierNumber: number;
  position: number;
  timestamp: number;
  date: string;
  userId?: string;
}

// Export all users with tiers as CSV
export function exportWaitlistCSV(): string {
  try {
    const waitlist = localStorage.getItem('bearo_waitlist');
    if (!waitlist) return 'No data';

    const entries = JSON.parse(waitlist);
    
    // CSV Header
    const header = 'Position,Email,Tier,Tier Number,Join Date,User ID\n';
    
    // CSV Rows
    const rows = entries.map((entry: any) => {
      const date = new Date(entry.timestamp).toISOString();
      return `${entry.position || 'N/A'},"${entry.email}","${entry.tier || 'N/A'}",${entry.tierNumber || 'N/A'},"${date}","${entry.userId || 'N/A'}"`;
    }).join('\n');

    const csv = header + rows;
    
    // Auto-download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bearo-waitlist-with-tiers-${Date.now()}.csv`;
    a.click();
    
    console.log('📊 Exported', entries.length, 'users with tier data');
    return csv;
  } catch (error) {
    console.error('Error exporting CSV:', error);
    return '';
  }
}

// Get users by tier (for targeted communications)
export function getUsersByTier(tierNumber: number): WaitlistUser[] {
  try {
    const waitlist = localStorage.getItem('bearo_waitlist');
    if (!waitlist) return [];

    const entries = JSON.parse(waitlist);
    return entries.filter((e: any) => e.tierNumber === tierNumber);
  } catch (error) {
    console.error('Error getting users by tier:', error);
    return [];
  }
}

// Get tier breakdown (analytics)
export function getTierBreakdown() {
  try {
    const waitlist = localStorage.getItem('bearo_waitlist');
    if (!waitlist) return {};

    const entries = JSON.parse(waitlist);
    
    const breakdown: Record<string, number> = {};
    entries.forEach((entry: any) => {
      const tier = entry.tier || 'Unknown';
      breakdown[tier] = (breakdown[tier] || 0) + 1;
    });

    console.table(breakdown);
    return breakdown;
  } catch (error) {
    console.error('Error getting tier breakdown:', error);
    return {};
  }
}

// Get OG Founders specifically (your VIPs)
export function getOGFounders(): WaitlistUser[] {
  return getUsersByTier(1); // Tier 1 = OG Founders
}

// Get Alpha Insiders
export function getAlphaInsiders(): WaitlistUser[] {
  return getUsersByTier(2);
}

// Export for TestFlight (just emails + tiers)
export function exportForTestFlight(): string {
  try {
    const waitlist = localStorage.getItem('bearo_waitlist');
    if (!waitlist) return '';

    const entries = JSON.parse(waitlist);
    
    // Simple format: email,tier
    const data = entries.map((e: any) => 
      `${e.email},${e.tier || 'Unknown'}`
    ).join('\n');

    const blob = new Blob([`Email,Tier\n${data}`], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bearo-testflight-list-${Date.now()}.csv`;
    a.click();

    console.log('✈️ Exported for TestFlight');
    return data;
  } catch (error) {
    console.error('Error exporting for TestFlight:', error);
    return '';
  }
}

// Sync to backend (template for your backend)
export async function syncToBackend(backendUrl: string) {
  try {
    const waitlist = localStorage.getItem('bearo_waitlist');
    if (!waitlist) return;

    const entries = JSON.parse(waitlist);

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entries,
        timestamp: Date.now(),
        source: 'landing-page',
      }),
    });

    if (response.ok) {
      console.log('✅ Synced', entries.length, 'users to backend');
    } else {
      throw new Error('Backend sync failed');
    }
  } catch (error) {
    console.error('Error syncing to backend:', error);
  }
}

// Make available in console for admin use
if (typeof window !== 'undefined') {
  (window as any).bearoAdminExport = {
    exportWaitlistCSV,
    getUsersByTier,
    getTierBreakdown,
    getOGFounders,
    getAlphaInsiders,
    exportForTestFlight,
    syncToBackend,
  };
  
  console.log('📊 Admin export tools loaded. Use: window.bearoAdminExport');
}

