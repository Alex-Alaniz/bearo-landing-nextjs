import React, { useState, useEffect } from 'react';
import { getTierAvailabilityAPI } from '../lib/api';
import { TierIcon } from './TierIcon';

interface TierOption {
  tierNumber: number;
  tier: string;
  emoji: string;
  color: string;
  positions: string;
  maxSpots: number;
  perks: string[];
  description: string;
}

const tierOptions: TierOption[] = [
  {
    tierNumber: 1,
    tier: 'OG Founder',
    emoji: '💎',
    color: 'from-amber-500 to-orange-500',
    positions: '#1-10',
    maxSpots: 10,
    perks: [
      'OG Founder Badge',
      'Lifetime VIP Status',
      'Shape the Roadmap',
      'Direct Access to Founders',
      'First TestFlight Invite',
      'Exclusive Alpha Channel'
    ],
    description: "You're building this with us. Co-creator status."
  },
  {
    tierNumber: 2,
    tier: 'Alpha Insider',
    emoji: '🚀',
    color: 'from-orange-500 to-red-500',
    positions: '#11-50',
    maxSpots: 40,
    perks: [
      'Alpha Tester Badge',
      'Priority Features',
      'Alpha Channel Access',
      'Early TestFlight',
      'Feedback Priority'
    ],
    description: 'Inner circle access. Shape features before launch.'
  },
  {
    tierNumber: 3,
    tier: 'Beta Crew',
    emoji: '⚡',
    color: 'from-yellow-500 to-orange-500',
    positions: '#51-100',
    maxSpots: 50,
    perks: [
      'Beta Crew Badge',
      'Early Features',
      'Beta TestFlight',
      'Community Recognition',
      'Feedback Channel'
    ],
    description: 'Join the testing crew. Help us perfect the app.'
  },
  {
    tierNumber: 4,
    tier: 'Early Adopter',
    emoji: '🌟',
    color: 'from-bearo-honey to-bearo-amber',
    positions: '#101-500',
    maxSpots: 400,
    perks: [
      'Early Adopter Badge',
      'TestFlight Priority',
      'Special Rewards',
      'Early Access',
      'Community Status'
    ],
    description: 'Get in early. Enjoy exclusive perks and rewards.'
  },
  {
    tierNumber: 5,
    tier: 'Pioneer Wave',
    emoji: '🎯',
    color: 'from-green-500 to-emerald-500',
    positions: '#501-1K',
    maxSpots: 500,
    perks: [
      'Pioneer Badge',
      'Early Access',
      'Community Recognition',
      'TestFlight Invite',
      'Beta Access'
    ],
    description: 'Still early enough. Join the first thousand.'
  },
  {
    tierNumber: 6,
    tier: 'Community Member',
    emoji: '🐻',
    color: 'from-blue-500 to-cyan-500',
    positions: '#1K-5K',
    maxSpots: 4000,
    perks: [
      'Member Badge',
      'Beta Access',
      'Join the Den',
      'TestFlight Invite',
      'Community Events'
    ],
    description: 'Join the Bearo community. Be part of the den.'
  },
];

interface TierSelectorProps {
  email: string;
  onTierClaimed: (tierNumber: number, tier: string) => void;
  onBack: () => void;
}

export const TierSelector: React.FC<TierSelectorProps> = ({ email, onTierClaimed, onBack }) => {
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [tierAvailability, setTierAvailability] = useState<Record<number, { maxSpots: number; claimed: number; available: number }>>({});
  const [loading, setLoading] = useState(true);

  // Get tier availability from database
  useEffect(() => {
    const loadAvailability = async () => {
      try {
        const availability = await getTierAvailabilityAPI();
        setTierAvailability(availability);
        setLoading(false);
      } catch (error) {
        console.error('Error loading tier availability:', error);
        setLoading(false);
      }
    };

    loadAvailability();
    
    // Update every 3 seconds to show real-time changes
    const interval = setInterval(loadAvailability, 3000);
    
    return () => clearInterval(interval);
  }, []);

  const getSpotsRemaining = (tier: TierOption) => {
    const tierData = tierAvailability[tier.tierNumber];
    if (tierData) {
      return tierData.available;
    }
    // Fallback to maxSpots if data not loaded yet
    return tier.maxSpots;
  };

  const isTierFull = (tier: TierOption) => {
    return getSpotsRemaining(tier) <= 0;
  };

  const handleClaim = () => {
    if (selectedTier !== null) {
      const tier = tierOptions.find(t => t.tierNumber === selectedTier);
      if (tier && !isTierFull(tier)) {
        onTierClaimed(selectedTier, tier.tier);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onBack} />

      {/* Modal - Full height on mobile, centered on desktop */}
      <div className="relative w-full sm:max-w-3xl h-[95vh] sm:h-auto sm:max-h-[90vh] bg-gradient-to-br from-black/95 via-black/90 to-black/95 border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">

        {/* Mobile drag indicator */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-white/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="sticky top-0 bg-black/90 backdrop-blur-xl border-b border-white/10 px-4 py-4 sm:p-6 z-10">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white">Choose Your Tier</h2>
            <button
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-white/10 active:bg-white/20 transition-colors touch-manipulation"
            >
              <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-white/60 text-xs sm:text-sm truncate">
            Joining as: <span className="text-bearo-honey font-semibold">{email}</span>
          </p>
        </div>

        {/* Tier Options - Scrollable */}
        <div className="px-3 py-4 sm:p-6 space-y-3 overflow-y-auto max-h-[calc(95vh-220px)] sm:max-h-[calc(90vh-200px)] overscroll-contain">
          {tierOptions.map((tier) => {
            const spotsLeft = getSpotsRemaining(tier);
            const isFull = isTierFull(tier);
            const isSelected = selectedTier === tier.tierNumber;
            const isLowSpots = spotsLeft <= 5 && spotsLeft > 0;

            return (
              <button
                key={tier.tierNumber}
                onClick={() => !isFull && setSelectedTier(tier.tierNumber)}
                disabled={isFull}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-300 ${
                  isSelected
                    ? `bg-gradient-to-r ${tier.color} bg-opacity-20 border-white/40 ring-2 ring-white/20 scale-[1.02]`
                    : isFull
                    ? 'bg-white/5 border-white/5 opacity-40 cursor-not-allowed'
                    : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10'
                } ${isLowSpots ? 'animate-pulse-slow' : ''}`}
              >
                <div className="flex items-start gap-4">
                  {/* Tier Icon & Info */}
                  <div className="flex-shrink-0">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${tier.color} flex items-center justify-center shadow-lg`}>
                      <TierIcon tierNumber={tier.tierNumber} size={40} />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          {tier.tier}
                          {isSelected && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-bearo-honey text-black font-bold">
                              SELECTED
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-white/40">{tier.positions}</p>
                      </div>

                      {/* Spots Status */}
                      <div className="text-right">
                        {isFull ? (
                          <div className="px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40">
                            <span className="text-xs font-bold text-red-400">FULL</span>
                          </div>
                        ) : (
                          <div className={`px-3 py-1 rounded-full ${isLowSpots ? 'bg-red-500/20 border border-red-500/40 animate-pulse' : 'bg-bearo-honey/10 border border-bearo-honey/20'}`}>
                            <span className={`text-xs font-bold ${isLowSpots ? 'text-red-400' : 'text-bearo-honey'}`}>
                              {spotsLeft} {spotsLeft === 1 ? 'SPOT' : 'SPOTS'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-white/70 mb-3">{tier.description}</p>

                    {/* Perks Grid - Single column on mobile */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                      {tier.perks.slice(0, 4).map((perk, i) => (
                        <div key={i} className="flex items-start gap-1.5">
                          <span className="text-bearo-honey text-xs mt-0.5">✓</span>
                          <span className="text-xs text-white/60">{perk}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute top-4 right-4">
                    <div className="w-6 h-6 rounded-full bg-bearo-honey flex items-center justify-center">
                      <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}
              </button>
            );
          })}

          {/* Selection Required Notice */}
          <div className="p-4 rounded-xl bg-bearo-honey/10 border border-bearo-honey/20">
            <p className="text-white/80 text-sm">
              🎯 <strong className="text-white">Choose wisely!</strong> Your tier determines your perks and TestFlight priority. Once claimed, it's yours!
            </p>
          </div>
        </div>

        {/* Footer - Claim Button */}
        <div className="sticky bottom-0 bg-black/90 backdrop-blur-xl border-t border-white/10 px-3 py-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={onBack}
              className="px-4 sm:px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/10 text-white font-medium transition-colors touch-manipulation"
            >
              ←
            </button>
            <button
              onClick={handleClaim}
              disabled={selectedTier === null}
              className={`flex-1 px-4 sm:px-8 py-3.5 rounded-xl font-bold text-base transition-all touch-manipulation ${
                selectedTier !== null
                  ? 'bg-gradient-to-r from-bearo-honey to-bearo-amber text-black shadow-lg shadow-bearo-honey/30 active:scale-[0.98]'
                  : 'bg-white/10 border border-white/20 text-white/50 cursor-not-allowed'
              }`}
            >
              {selectedTier !== null
                ? `Continue →`
                : 'Select a tier to continue'}
            </button>
          </div>

          {selectedTier !== null && (
            <p className="text-white/40 text-xs text-center mt-3">
              You'll receive <strong className="text-bearo-honey">
                {tierOptions.find(t => t.tierNumber === selectedTier)?.perks.length} exclusive perks
              </strong>
            </p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

