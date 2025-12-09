import React, { useEffect, useState } from 'react';
import { getThirdwebUserCount } from '../lib/waitlist';
import { TierRoadmap } from './TierRoadmap';
import { TierIcon } from './TierIcon';

export const LiveWaitlistCounter: React.FC = () => {
  const [thirdwebCount, setThirdwebCount] = useState<number>(0);
  const [localCount, setLocalCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showPerks, setShowPerks] = useState(false);

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

  const updateCounts = async () => {
    const prevTotal = totalCount;
    
    try {
      const tw = await getThirdwebUserCount();
      const local = getLocalCount();
      const newTotal = tw + local;
      
      setThirdwebCount(tw);
      setLocalCount(local);
      setTotalCount(newTotal);

      // Trigger animation if count increased
      if (newTotal > prevTotal) {
        setIsAnimating(true);
        setShowCelebration(true);
        setTimeout(() => setIsAnimating(false), 600);
        setTimeout(() => setShowCelebration(false), 2000);
      }
    } catch (error) {
      console.error('Error updating counts:', error);
    }
  };

  useEffect(() => {
    updateCounts();
    
    // Update every 3 seconds
    const interval = setInterval(updateCounts, 3000);
    return () => clearInterval(interval);
  }, []);

  // Tiered FOMO system with psychological triggers
  const getTierInfo = (count: number) => {
    if (count === 0) {
      return {
        tier: 'First Mover',
        tierNumber: 0,
        message: 'Be the very first OG. Legendary status awaits.',
        color: 'from-amber-500 to-yellow-500',
        urgency: 'ULTRA RARE',
        spotsLeft: 1,
        totalInTier: 1,
        perks: '• Founding Member Badge\n• Direct line to founders\n• Shape the future'
      };
    } else if (count <= 10) {
      return {
        tier: 'OG Founder',
        tierNumber: 1,
        message: `Only ${11 - count} OG spots remaining. You're building this with us.`,
        color: 'from-amber-500 to-orange-500',
        urgency: 'LEGENDARY',
        spotsLeft: 11 - count,
        totalInTier: 10,
        perks: '• OG Founder Badge\n• Lifetime VIP status\n• Shape the roadmap'
      };
    } else if (count <= 50) {
      return {
        tier: 'Alpha Insider',
        tierNumber: 2,
        message: `${51 - count} Alpha spots left. Early access + exclusive perks.`,
        color: 'from-orange-500 to-red-500',
        urgency: 'VERY RARE',
        spotsLeft: 51 - count,
        totalInTier: 50,
        perks: '• Alpha Tester Badge\n• Priority features\n• Alpha channel access'
      };
    } else if (count <= 100) {
      return {
        tier: 'Beta Crew',
        tierNumber: 3,
        message: `${101 - count} Beta Crew slots available. Join the inner circle.`,
        color: 'from-yellow-500 to-orange-500',
        urgency: 'RARE',
        spotsLeft: 101 - count,
        totalInTier: 100,
        perks: '• Beta Crew Badge\n• Early features\n• Feedback priority'
      };
    } else if (count <= 500) {
      return {
        tier: 'Early Adopter',
        tierNumber: 4,
        message: `${501 - count} Early Adopter spots remaining. Act fast.`,
        color: 'from-bearo-honey to-bearo-amber',
        urgency: 'LIMITED',
        spotsLeft: 501 - count,
        totalInTier: 500,
        perks: '• Early Adopter Badge\n• TestFlight priority\n• Special rewards'
      };
    } else if (count <= 1000) {
      return {
        tier: 'Pioneer Wave',
        tierNumber: 5,
        message: `${1001 - count} Pioneer spots left. Still early enough.`,
        color: 'from-green-500 to-emerald-500',
        urgency: 'FILLING FAST',
        spotsLeft: 1001 - count,
        totalInTier: 1000,
        perks: '• Pioneer Badge\n• Early access\n• Community recognition'
      };
    } else if (count <= 5000) {
      return {
        tier: 'Community Member',
        tierNumber: 6,
        message: `${5001 - count} spots until next tier. Good timing.`,
        color: 'from-blue-500 to-cyan-500',
        urgency: 'ACTIVE',
        spotsLeft: 5001 - count,
        totalInTier: 5000,
        perks: '• Member Badge\n• Beta access\n• Join the den'
      };
    } else if (count <= 10000) {
      return {
        tier: 'General Access',
        tierNumber: 7,
        message: `${10001 - count} spots until waitlist fills. Don't miss out.`,
        color: 'from-gray-500 to-slate-500',
        urgency: 'CLOSING SOON',
        spotsLeft: 10001 - count,
        totalInTier: 10000,
        perks: '• Access Badge\n• TestFlight invite\n• App access'
      };
    } else {
      return {
        tier: 'Waitlist Full',
        tierNumber: 7,
        message: 'First 10,000 spots filled! Join waiting list for next wave.',
        color: 'from-red-500 to-rose-500',
        urgency: 'FULL',
        spotsLeft: 0,
        totalInTier: 10000,
        perks: '• Next batch priority\n• Notified at launch\n• Still early'
      };
    }
  };

  const tierInfo = getTierInfo(totalCount);
  const targetGoal = 100;
  const progress = Math.min((totalCount / targetGoal) * 100, 100);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <>
      {/* Celebration confetti effect */}
      {showCelebration && (
        <div className="fixed bottom-6 right-6 pointer-events-none z-[100]">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full animate-confetti"
              style={{
                left: '50%',
                top: '50%',
                background: ['#F97316', '#FBBF24', '#10B981', '#3B82F6'][i % 4],
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Minimized Widget (Default State) */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="fixed bottom-6 right-6 z-50 group animate-fade-in"
        >
          {/* Rainbow animated border */}
          <div className="relative rounded-full rainbow-border p-[3px] hover:scale-105 transition-transform duration-300">
            <div className="w-full h-full rounded-full bg-black backdrop-blur-2xl flex items-center gap-3 px-5 py-3">
              <div className="w-2 h-2 rounded-full bg-bearo-green animate-pulse" />
              
              <div className="flex items-center gap-2">
                <TierIcon tierNumber={tierInfo.tierNumber} size={24} />
                <div className="text-left">
                  <div className={`text-2xl font-bold transition-all duration-300 ${isAnimating ? 'scale-110' : 'scale-100'}`}>
                    <span className="bg-gradient-to-r from-bearo-honey to-bearo-amber bg-clip-text text-transparent">
                      {totalCount}
                    </span>
                  </div>
                  <div className="text-[9px] text-white/50 uppercase tracking-wider">
                    {tierInfo.tier}
                  </div>
                </div>
              </div>

              <svg className="w-4 h-4 text-white/40 group-hover:text-white/60 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
              </svg>
            </div>
          </div>
        </button>
      )}

      {/* Expanded Card */}
      {isExpanded && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-in-up">
          <div className="relative group">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-bearo-honey/20 to-bearo-amber/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500" />
          
          {/* Card */}
          <div className="relative backdrop-blur-2xl bg-gradient-to-br from-black/90 via-black/85 to-black/90 border border-white/10 rounded-2xl shadow-2xl w-80 max-h-[600px] overflow-hidden">
            
            {/* Header - Always Visible */}
            <div className="p-4 border-b border-white/5">
          
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-bearo-green animate-pulse" />
                  <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">TestFlight</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`text-[9px] font-bold px-2 py-1 rounded-full bg-gradient-to-r ${tierInfo.color} text-white`}>
                    {tierInfo.urgency}
                  </div>
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Tier Badge */}
              <div className="mt-3">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${tierInfo.color} text-white shadow-lg`}>
                  <TierIcon tierNumber={tierInfo.tierNumber} size={20} />
                  <span className="text-sm font-bold">{tierInfo.tier}</span>
                </div>
              </div>
            </div>

            {/* Main Content - Scrollable */}
            <div className="px-4 pb-4 space-y-3 max-h-[480px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">

              {/* Counter Display with Progress Ring */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div>
                    <div className={`text-5xl font-bold text-white mb-1 transition-all duration-300 ${isAnimating ? 'scale-110' : 'scale-100'}`}>
                      <span className="bg-gradient-to-r from-bearo-honey to-bearo-amber bg-clip-text text-transparent">
                        {totalCount.toLocaleString()}
                      </span>
                    </div>
                    {tierInfo.spotsLeft > 0 && (
                      <p className="text-white/50 text-sm">
                        <span className="text-red-400 font-semibold">{tierInfo.spotsLeft}</span> spots left
                      </p>
                    )}
                  </div>
                </div>

                {/* Progress Ring */}
                {totalCount > 0 && (
                  <div className="relative">
                    <svg className="w-20 h-20 -rotate-90">
                      {/* Background circle */}
                      <circle
                        cx="40"
                        cy="40"
                        r="36"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="5"
                        fill="none"
                      />
                      {/* Progress circle */}
                      <circle
                        cx="40"
                        cy="40"
                        r="36"
                        stroke="url(#gradient)"
                        strokeWidth="5"
                        fill="none"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#F97316" />
                          <stop offset="100%" stopColor="#FBBF24" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-bearo-honey text-xs font-bold">{progress.toFixed(0)}%</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Stats Breakdown - Collapsible */}
              <div>
                <button
                  onClick={() => setShowStats(!showStats)}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <span className="text-white/60 text-xs font-semibold">Stats</span>
                  <svg 
                    className={`w-4 h-4 text-white/40 transition-transform ${showStats ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showStats && (
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5">
                      <span className="text-white/60 text-xs">Email Signups</span>
                      <span className="text-bearo-honey font-semibold text-sm">{thirdwebCount}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5">
                      <span className="text-white/60 text-xs">Pending Verification</span>
                      <span className="text-white font-semibold text-sm">{localCount}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Goal Progress */}
              {totalCount > 0 && (
                <div>
                  <div className="flex justify-between text-[10px] text-white/40 mb-1">
                    <span>Goal: {targetGoal.toLocaleString()}</span>
                    <span>{(targetGoal - totalCount).toLocaleString()} to go</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-bearo-honey to-bearo-amber rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* FOMO Message */}
              <div className={`p-3 rounded-lg bg-gradient-to-r ${tierInfo.color} bg-opacity-10 border-2 ${tierInfo.spotsLeft <= 10 ? 'border-red-500 animate-pulse' : 'border-white/10'}`}>
                <div className="flex items-start gap-2">
                  <TierIcon tierNumber={tierInfo.tierNumber} size={18} />
                  <p className="text-white/90 text-xs leading-relaxed font-medium">
                    {tierInfo.message}
                  </p>
                </div>
              </div>

              {/* Perks Preview - Collapsible */}
              <div>
                <button
                  onClick={() => setShowPerks(!showPerks)}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <span className="text-white/60 text-xs font-semibold">Your Perks</span>
                  <svg 
                    className={`w-4 h-4 text-white/40 transition-transform ${showPerks ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showPerks && (
                  <div className="mt-2 p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="text-white/80 text-xs whitespace-pre-line leading-relaxed">
                      {tierInfo.perks}
                    </div>
                  </div>
                )}
              </div>

              {/* View All Tiers Button */}
              <button
                onClick={() => setShowRoadmap(!showRoadmap)}
                className="w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-white/70 hover:text-white text-xs font-medium"
              >
                {showRoadmap ? '← Hide' : 'View All Tiers →'}
              </button>

              {/* Action hint */}
              <div className="flex items-center justify-center gap-2 text-white/30 text-[10px]">
                <div className="w-1 h-1 rounded-full bg-white/30 animate-pulse" />
                <span>Updates every 3 seconds</span>
                <div className="w-1 h-1 rounded-full bg-white/30 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* Tier Roadmap Panel (slides in from right) */}
      {showRoadmap && (
        <div className="fixed inset-0 z-[60] flex items-end justify-end pointer-events-none">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
            onClick={() => setShowRoadmap(false)}
          />
          
          {/* Panel - Full height, side panel */}
          <div className="relative w-full max-w-md h-full bg-gradient-to-br from-black/95 via-black/90 to-black/95 border-l border-white/10 shadow-2xl pointer-events-auto overflow-y-auto animate-slide-in-right">
            <div className="sticky top-0 bg-black/80 backdrop-blur-xl border-b border-white/10 p-4 flex items-center justify-between z-10">
              <h2 className="text-white font-bold text-lg">Tier System</h2>
              <button
                onClick={() => setShowRoadmap(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4">
              <TierRoadmap currentCount={totalCount} />
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-in-up {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .animate-slide-in-up {
          animation: slide-in-up 0.3s ease-out;
        }

        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }

        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }

        .scrollbar-thumb-white\/10::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }

        .scrollbar-track-transparent::-webkit-scrollbar-track {
          background-color: transparent;
        }
      `}</style>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes confetti {
          0% {
            transform: translate(-50%, -50%) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y))) rotate(720deg);
            opacity: 0;
          }
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }

        .animate-confetti {
          --x: calc(${Math.random() * 200 - 100}px);
          --y: calc(${Math.random() * 200 - 100}px);
          animation: confetti 1s ease-out forwards;
        }
      `}</style>
    </>
  );
};

