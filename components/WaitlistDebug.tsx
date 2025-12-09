import React, { useEffect, useState } from 'react';
import { getThirdwebUserCount } from '../lib/waitlist';

// Debug component to show waitlist count breakdown
// Remove or hide in production
export const WaitlistDebug: React.FC = () => {
  const [thirdwebCount, setThirdwebCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const count = await getThirdwebUserCount();
        setThirdwebCount(count);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch');
      } finally {
        setLoading(false);
      }
    };

    fetchCount();
  }, []);

  // Get local count from localStorage
  const getLocalCount = () => {
    try {
      const waitlist = localStorage.getItem('bearo_waitlist');
      if (!waitlist) return 0;
      const entries = JSON.parse(waitlist);
      return entries.length;
    } catch {
      return 0;
    }
  };
  
  const localCount = getLocalCount();
  const totalCount = (thirdwebCount || 0) + localCount; // REAL count only

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl p-4 text-xs font-mono max-w-xs z-50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-bearo-honey font-bold">🐻 Waitlist Debug</span>
        <span className="text-white/40 text-[10px]">DEV MODE</span>
      </div>
      
      <div className="space-y-1 text-white/60">
        <div className="flex justify-between">
          <span>Thirdweb Users:</span>
          {loading ? (
            <span className="text-bearo-honey">Loading...</span>
          ) : error ? (
            <span className="text-red-400">Error</span>
          ) : (
            <span className="text-bearo-honey font-semibold">{thirdwebCount?.toLocaleString() || 0}</span>
          )}
        </div>
        
        <div className="flex justify-between">
          <span>Local Signups:</span>
          <span className="text-white">{localCount}</span>
        </div>
        
        <div className="border-t border-white/10 mt-2 pt-2 flex justify-between">
          <span className="font-bold">Real Total:</span>
          <span className="text-bearo-honey font-bold">{totalCount.toLocaleString()}</span>
        </div>
        
        <div className="mt-2 text-bearo-green text-[10px]">
          ✅ Honest count - no inflation
        </div>
        
        {error && (
          <div className="mt-2 text-red-400 text-[10px]">
            {error}
          </div>
        )}
        
        <div className="mt-2 text-white/30 text-[9px]">
          Env: {process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID ? '✅ Configured' : '❌ Missing'}
        </div>
      </div>
    </div>
  );
};

