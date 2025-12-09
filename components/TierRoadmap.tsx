import React from 'react';
import { TierIcon } from './TierIcon';

interface TierInfo {
  position: string;
  tier: string;
  tierNumber: number;
  color: string;
  perks: string[];
}

const tiers: TierInfo[] = [
  {
    position: '#0',
    tier: 'First Mover',
    tierNumber: 0,
    color: 'from-amber-500 to-yellow-500',
    perks: ['Founding Member Badge', 'Direct line to founders', 'Shape the future']
  },
  {
    position: '#1-10',
    tier: 'OG Founder',
    tierNumber: 1,
    color: 'from-amber-500 to-orange-500',
    perks: ['OG Founder Badge', 'Lifetime VIP status', 'Shape the roadmap']
  },
  {
    position: '#11-50',
    tier: 'Alpha Insider',
    tierNumber: 2,
    color: 'from-orange-500 to-red-500',
    perks: ['Alpha Tester Badge', 'Priority features', 'Alpha channel access']
  },
  {
    position: '#51-100',
    tier: 'Beta Crew',
    tierNumber: 3,
    color: 'from-yellow-500 to-orange-500',
    perks: ['Beta Crew Badge', 'Early features', 'Feedback priority']
  },
  {
    position: '#101-500',
    tier: 'Early Adopter',
    tierNumber: 4,
    color: 'from-bearo-honey to-bearo-amber',
    perks: ['Early Adopter Badge', 'TestFlight priority', 'Special rewards']
  },
  {
    position: '#501-1K',
    tier: 'Pioneer Wave',
    tierNumber: 5,
    color: 'from-green-500 to-emerald-500',
    perks: ['Pioneer Badge', 'Early access', 'Community recognition']
  },
  {
    position: '#1K-5K',
    tier: 'Community',
    tierNumber: 6,
    color: 'from-blue-500 to-cyan-500',
    perks: ['Member Badge', 'Beta access', 'Join the den']
  },
  {
    position: '#5K-10K',
    tier: 'General',
    tierNumber: 7,
    color: 'from-gray-500 to-slate-500',
    perks: ['Access Badge', 'TestFlight invite', 'App access']
  },
];

interface TierRoadmapProps {
  currentCount: number;
  userPosition?: number;
}

export const TierRoadmap: React.FC<TierRoadmapProps> = ({ currentCount, userPosition }) => {
  const getCurrentTierIndex = () => {
    if (currentCount === 0) return 0;
    if (currentCount <= 10) return 1;
    if (currentCount <= 50) return 2;
    if (currentCount <= 100) return 3;
    if (currentCount <= 500) return 4;
    if (currentCount <= 1000) return 5;
    if (currentCount <= 5000) return 6;
    if (currentCount <= 10000) return 7;
    return 8;
  };

  const currentTierIndex = getCurrentTierIndex();

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold text-sm">Tier Progression</h3>
        <span className="text-white/40 text-xs">See what you unlock</span>
      </div>

      {/* Tier List */}
      <div className="space-y-2 overflow-y-visible pr-2">
        {tiers.map((tier, index) => {
          const isPast = index < currentTierIndex;
          const isCurrent = index === currentTierIndex;
          const isFuture = index > currentTierIndex;
          const isUserTier = userPosition !== undefined && 
            ((index === 0 && userPosition === 0) ||
             (index === 1 && userPosition >= 1 && userPosition <= 10) ||
             (index === 2 && userPosition >= 11 && userPosition <= 50) ||
             (index === 3 && userPosition >= 51 && userPosition <= 100) ||
             (index === 4 && userPosition >= 101 && userPosition <= 500) ||
             (index === 5 && userPosition >= 501 && userPosition <= 1000) ||
             (index === 6 && userPosition >= 1001 && userPosition <= 5000) ||
             (index === 7 && userPosition >= 5001 && userPosition <= 10000));

          return (
            <div
              key={tier.tier}
              className={`relative p-3 rounded-lg border-2 transition-all duration-300 ${
                isCurrent 
                  ? `bg-gradient-to-r ${tier.color} bg-opacity-20 border-white/30 ring-2 ring-white/20` 
                  : isPast
                  ? 'bg-white/5 border-white/5 opacity-50'
                  : 'bg-white/5 border-white/10 opacity-70'
              } ${isUserTier ? 'ring-2 ring-bearo-honey' : ''}`}
            >
              {/* User's Tier Indicator */}
              {isUserTier && (
                <div className="absolute -top-2 -right-2 px-2 py-1 bg-bearo-honey text-black text-[9px] font-bold rounded-full">
                  YOUR TIER
                </div>
              )}

              <div className="flex items-start gap-3">
                {/* Status Icon */}
                <div className="flex-shrink-0">
                  {isPast ? (
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white/40" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  ) : (
                    <TierIcon tierNumber={tier.tierNumber} size={28} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span className={`text-xs font-semibold ${isCurrent ? 'text-white' : 'text-white/60'}`}>
                        {tier.tier}
                      </span>
                      {isCurrent && (
                        <span className="ml-2 text-[9px] px-2 py-0.5 rounded-full bg-bearo-honey text-black font-bold">
                          CURRENT
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-white/40">{tier.position}</span>
                  </div>

                  {/* Perks */}
                  <div className="space-y-1">
                    {tier.perks.map((perk, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <span className="text-bearo-honey text-[10px] mt-0.5">•</span>
                        <span className={`text-[10px] ${isCurrent ? 'text-white/80' : 'text-white/50'}`}>
                          {perk}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Status label */}
              {isPast && (
                <div className="mt-2 text-[9px] text-white/30 uppercase tracking-wider">
                  Tier Filled
                </div>
              )}
              {isFuture && (
                <div className="mt-2 text-[9px] text-white/40 uppercase tracking-wider">
                  Coming Next
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-[10px] text-white/40">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-white/10" />
          <span>Filled</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-bearo-honey" />
          <span>Current</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-white/20" />
          <span>Upcoming</span>
        </div>
      </div>
    </div>
  );
};

