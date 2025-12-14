"use client";
import React, { useEffect, useState } from 'react';
import { getReferralLeaderboard, getAirdropStats, TIER_INFO, LeaderboardEntry, AirdropStats } from '../lib/airdrop';

export const Leaderboard: React.FC = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<AirdropStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [leaderboard, airdropStats] = await Promise.all([
          getReferralLeaderboard(10),
          getAirdropStats(),
        ]);
        setEntries(leaderboard);
        setStats(airdropStats);
      } catch (error) {
        console.error('[Leaderboard] Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Format number with commas
  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-transparent to-black/20">
      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 rounded-full text-purple-400 text-sm font-medium mb-4">
            <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
            Live Airdrop Leaderboard
          </span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Refer & Earn <span className="text-gradient">$BEARCO</span>
          </h2>
          <p className="mt-4 text-white/60 max-w-xl mx-auto">
            Top referrers earn bonus $BEARCO tokens. Refer friends to climb the leaderboard!
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <p className="text-white/40 text-xs uppercase tracking-wider">Participants</p>
              <p className="text-2xl font-bold text-white mt-1">{formatNumber(stats.participantCount)}</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <p className="text-white/40 text-xs uppercase tracking-wider">Total Referrals</p>
              <p className="text-2xl font-bold text-white mt-1">{formatNumber(stats.totalReferrals)}</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <p className="text-white/40 text-xs uppercase tracking-wider">$BEARCO Allocated</p>
              <p className="text-2xl font-bold text-purple-400 mt-1">{formatNumber(stats.totalAllocated)}</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <p className="text-white/40 text-xs uppercase tracking-wider">Early Bird Bonus</p>
              <p className="text-2xl font-bold text-green-400 mt-1">1.5x</p>
            </div>
          </div>
        )}

        {/* Leaderboard Table */}
        <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-white/5 text-white/40 text-xs uppercase tracking-wider border-b border-white/10">
            <div className="col-span-1">#</div>
            <div className="col-span-3">Code</div>
            <div className="col-span-3">Tier</div>
            <div className="col-span-2 text-center">Referrals</div>
            <div className="col-span-3 text-right">$BEARCO</div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="py-12 text-center">
              <div className="inline-block w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
              <p className="mt-4 text-white/40">Loading leaderboard...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && entries.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-white/40">No entries yet. Be the first to refer!</p>
            </div>
          )}

          {/* Entries */}
          {!loading && entries.map((entry) => {
            const tierInfo = TIER_INFO[entry.tierNumber] || TIER_INFO[6];
            const isTop3 = entry.rank <= 3;

            return (
              <div
                key={entry.rank}
                className={`grid grid-cols-12 gap-2 px-4 py-4 items-center border-b border-white/5 last:border-0 transition-colors hover:bg-white/5 ${
                  isTop3 ? 'bg-gradient-to-r from-purple-500/10 to-transparent' : ''
                }`}
              >
                {/* Rank */}
                <div className="col-span-1">
                  {entry.rank === 1 && <span className="text-2xl">🥇</span>}
                  {entry.rank === 2 && <span className="text-2xl">🥈</span>}
                  {entry.rank === 3 && <span className="text-2xl">🥉</span>}
                  {entry.rank > 3 && (
                    <span className="text-white/60 font-medium">{entry.rank}</span>
                  )}
                </div>

                {/* Code */}
                <div className="col-span-3">
                  <span className="font-mono text-white font-medium">{entry.code}</span>
                </div>

                {/* Tier */}
                <div className="col-span-3">
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{ backgroundColor: `${tierInfo.color}20`, color: tierInfo.color }}
                  >
                    <span>{tierInfo.emoji}</span>
                    <span className="hidden sm:inline">{entry.tierName}</span>
                  </span>
                </div>

                {/* Referral Count */}
                <div className="col-span-2 text-center">
                  <span className={`font-medium ${entry.referralCount > 0 ? 'text-green-400' : 'text-white/40'}`}>
                    {entry.referralCount}
                  </span>
                </div>

                {/* Projected Airdrop */}
                <div className="col-span-3 text-right">
                  <span className="text-purple-400 font-medium">
                    {formatNumber(entry.projectedAirdrop)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <p className="text-white/40 text-sm mb-4">
            Join the waitlist to get your referral code and start earning $BEARCO
          </p>
          <div className="inline-flex rounded-full rainbow-border p-[2px] hover:scale-[1.02] transition-transform duration-200">
            <a
              href="#waitlist-signup"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#0a0a0b] border border-white/10 rounded-full font-medium text-white hover:bg-white/5 transition-colors"
            >
              Get Your Code
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Leaderboard;
