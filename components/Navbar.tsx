import React, { useState, useEffect } from 'react';
import Lottie from 'lottie-react';
import { getAuthSession, getUserTier, getTierBadge, logout } from '../lib/auth';
import { TierSelector } from './TierSelector';
import { EmailVerification } from './EmailVerification';
import { initiateWaitlistAuth, verifyAndClaimTier } from '../lib/api';
import { isOnWaitlist } from '../lib/waitlist';
import { TierIcon } from './TierIcon';

// Get Bearified Button Component with real auth flow
const GetBearifiedButton: React.FC = () => {
  const [email, setEmail] = useState('');
  const [showTierSelector, setShowTierSelector] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [claimedTier, setClaimedTier] = useState<{ number: number; name: string; emoji: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGetBearified = () => {
    // Prompt for email
    const userEmail = prompt('Enter your email to get Bearified:');
    if (!userEmail || !userEmail.trim()) return;
    
    const trimmedEmail = userEmail.trim();
    
    // Check if already on waitlist
    if (isOnWaitlist(trimmedEmail)) {
      alert('This email is already on the waitlist!');
      return;
    }
    
    setEmail(trimmedEmail);
    setShowTierSelector(true);
  };

  const handleTierClaimed = async (tierNumber: number, tierName: string) => {
    // Use tier initials instead of emojis
    const tierLabel = tierNumber === 1 ? 'OG' : tierNumber === 2 ? 'AI' : tierNumber === 3 ? 'BC' : tierNumber === 4 ? 'EA' : tierNumber === 5 ? 'PW' : 'CM';
    setClaimedTier({ number: tierNumber, name: tierName, emoji: tierLabel });
    setShowTierSelector(false);
    
    try {
      await initiateWaitlistAuth(email);
      setShowEmailVerification(true);
    } catch (error) {
      console.error('Error sending verification:', error);
      setShowEmailVerification(true);
    }
  };

  const handleEmailVerified = async (otp: string) => {
    if (!claimedTier) return;
    setIsSubmitting(true);
    setShowEmailVerification(false);

    try {
      await verifyAndClaimTier(email, otp, claimedTier.number, claimedTier.name);
      alert(`✅ You're Bearified! Welcome to ${claimedTier.name}!`);
      window.location.reload(); // Refresh to show auth state
    } catch (error: any) {
      alert(error.message || 'Something went wrong. Please try again!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button 
        onClick={handleGetBearified}
        disabled={isSubmitting}
        className="group relative px-6 py-2.5 bg-white text-black rounded-full text-sm font-semibold overflow-hidden transition-all duration-500 hover:shadow-[0_0_40px_rgba(249,115,22,0.3)] hover:scale-105 disabled:opacity-50"
      >
        Get Bearified
      </button>

      {showTierSelector && (
        <TierSelector
          email={email}
          onTierClaimed={handleTierClaimed}
          onBack={() => setShowTierSelector(false)}
        />
      )}

      {showEmailVerification && claimedTier && (
        <EmailVerification
          email={email}
          tierName={claimedTier.name}
          tierEmoji={claimedTier.emoji}
          onVerified={handleEmailVerified}
          onBack={() => {
            setShowEmailVerification(false);
            setShowTierSelector(true);
          }}
        />
      )}
    </>
  );
};

export const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [authSession, setAuthSession] = useState(getAuthSession());
  const [userTier, setUserTier] = useState(getUserTier());
  const [beeAnimation, setBeeAnimation] = useState<any>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);

    // Load BEE-lieve animation
    fetch('/animations/BEE-lieve.json')
      .then(res => res.json())
      .then(data => setBeeAnimation(data))
      .catch(() => console.log('BEE-lieve animation loading...'));

    // Check for auth updates every second
    const authInterval = setInterval(() => {
      setAuthSession(getAuthSession());
      setUserTier(getUserTier());
    }, 1000);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearInterval(authInterval);
    };
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out ${
      scrolled
        ? 'py-4 backdrop-blur-xl bg-black/40 border-b border-white/5'
        : 'py-6 bg-transparent border-b border-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-8 flex items-center justify-between gap-4">
        {/* Logo - BearoApp.png only - EVEN BIGGER */}
        <a href="#" className="flex items-center group shrink-0">
          <div className="relative">
            <img
              src="/images/BearoApp.png"
              alt="Bearo"
              className="h-16 sm:h-20 md:h-24 w-auto transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-bearo-honey opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-500" />
          </div>
        </a>

        {/* Center Navigation - Ultra Minimal */}
        <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {[
              { label: 'Spend', href: 'spend', comingSoon: false },
              { label: 'Money', href: 'money', comingSoon: false },
              { label: 'Send', href: 'send', comingSoon: false },
              { label: 'Honey', href: 'honey', comingSoon: false }
            ].map((item) => (
            <a
              key={item.label}
              href={`#${item.href}`}
              className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white rounded-full hover:bg-white/5 transition-all duration-300 relative"
            >
              {item.label}
              {item.comingSoon && (
                <>
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-bearo-honey rounded-full animate-pulse" />
                  <span className="text-xs text-white/40 ml-1">(Coming Soon)</span>
                </>
              )}
            </a>
          ))}
        </div>

        {/* CTA - Shows auth state */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {authSession ? (
            <>
              {/* User Tier Badge with Rainbow Border and BEE-lieve Animation */}
              {userTier && (
                <div className="flex items-center">
                  <div className="relative rounded-full rainbow-border p-[2px]">
                    <div className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-gradient-to-r ${getTierBadge(userTier.tierNumber).color} text-white text-[10px] sm:text-xs font-bold shadow-lg`}>
                      {beeAnimation ? (
                        <div className="w-4 h-4 sm:w-5 sm:h-5">
                          <Lottie
                            animationData={beeAnimation}
                            loop={true}
                            style={{ width: '100%', height: '100%' }}
                          />
                        </div>
                      ) : (
                        <TierIcon tierNumber={userTier.tierNumber} size={18} />
                      )}
                      <span className="hidden sm:inline">{userTier.tierName}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* User Email & Sign Out */}
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="hidden lg:block text-xs sm:text-sm text-white/70 truncate max-w-[150px]">
                  {authSession.email}
                </div>
                <button
                  onClick={logout}
                  className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-white/60 hover:text-white transition-colors whitespace-nowrap"
                >
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <>
              <a
                href="#"
                className="hidden sm:block px-4 py-2 text-sm font-medium text-white/60 hover:text-white transition-colors duration-300"
              >
                Sign in <span className="text-xs text-white/40">(Coming Soon)</span>
              </a>
              <GetBearifiedButton />
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
