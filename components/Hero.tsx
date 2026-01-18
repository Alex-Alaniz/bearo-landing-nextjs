import React, { useState, useEffect } from 'react';
import Lottie from 'lottie-react';
import { PhoneFrame } from './PhoneFrame';
import { TierSelector } from './TierSelector';
import { EmailVerification } from './EmailVerification';
import { isOnWaitlist } from '../lib/waitlist';
import { initiateWaitlistAuth, verifyAndClaimTier, checkExistingUser, ExistingUserInfo, linkReferralRetroactively, saveWalletAddress } from '../lib/api';
import { detectPlatform } from '../lib/deviceDetection';
import { WalletInput } from './WalletInput';

// Animation data will be loaded dynamically
type AnimationData = Record<string, unknown>;

const ArrowUpRight: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M7 17L17 7M7 7H17V17" />
  </svg>
);

const DollarSign: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 1v22" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

export const Hero: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTierSelector, setShowTierSelector] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [claimedTier, setClaimedTier] = useState<{ number: number; name: string; emoji: string } | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [referral, setReferral] = useState<{ code: string; link: string } | null>(null);
  const [existingUser, setExistingUser] = useState<ExistingUserInfo | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [welcomeAnimation, setWelcomeAnimation] = useState<AnimationData | null>(null);
  const [moneyAnimation, setMoneyAnimation] = useState<AnimationData | null>(null);
  // Retroactive referral linking state
  const [showLinkReferral, setShowLinkReferral] = useState(false);
  const [linkReferralCode, setLinkReferralCode] = useState('');
  const [isLinkingReferral, setIsLinkingReferral] = useState(false);
  const [linkedReferrer, setLinkedReferrer] = useState<string | null>(null);
  // Wallet input state (required before showing code)
  const [showWalletInput, setShowWalletInput] = useState(false);
  const [isSavingWallet, setIsSavingWallet] = useState(false);
  // URL referral param capture
  const [urlReferralCode, setUrlReferralCode] = useState<string | null>(null);

  // Capture ?ref= URL parameter on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const refCode = params.get('ref');
      if (refCode && refCode.match(/^BEAR[A-Z0-9]{4}$/i)) {
        console.log('📎 Captured referral code from URL:', refCode.toUpperCase());
        setUrlReferralCode(refCode.toUpperCase());
      }
    }
  }, []);

  useEffect(() => {
    // Load animations from iOS app
    fetch('/animations/Welcome.json')
      .then(res => res.json())
      .then(data => setWelcomeAnimation(data))
      .catch(() => console.log('Welcome animation loading...'));

    fetch('/animations/Money.json')
      .then(res => res.json())
      .then(data => setMoneyAnimation(data))
      .catch(() => console.log('Money animation loading...'));
  }, []);

  const handleCTA = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[handleCTA] Starting with email:', email);
    if (!email || isSubmitting || isCheckingEmail) return;

    setIsCheckingEmail(true);

    try {
      // Check database for existing user
      console.log('[handleCTA] Calling checkExistingUser...');
      const existingUserInfo = await checkExistingUser(email);
      console.log('[handleCTA] checkExistingUser returned:', existingUserInfo);

      if (existingUserInfo.exists && existingUserInfo.tierNumber && existingUserInfo.tierName) {
        // User already has a tier - skip tier selection
        console.log(`🔄 Existing user found: ${email} - ${existingUserInfo.tierName}`);
        setExistingUser(existingUserInfo);

        // Set their existing tier
        const tierLabel = existingUserInfo.tierNumber === 1 ? 'OG' : existingUserInfo.tierNumber === 2 ? 'AI' : existingUserInfo.tierNumber === 3 ? 'BC' : existingUserInfo.tierNumber === 4 ? 'EA' : existingUserInfo.tierNumber === 5 ? 'PW' : 'CM';
        setClaimedTier({
          number: existingUserInfo.tierNumber,
          name: existingUserInfo.tierName,
          emoji: tierLabel
        });

        // Send verification email directly (skip tier selection)
        await initiateWaitlistAuth(email);
        console.log('✅ Verification email sent to existing user:', email);

        // Show OTP verification modal
        setShowEmailVerification(true);
        return;
      }

      // Also check localStorage fallback
      if (isOnWaitlist(email)) {
        alert('This email is already on the waitlist!');
        return;
      }

      // New user - show tier selector modal
      setShowTierSelector(true);
    } catch (error) {
      console.error('Error checking existing user:', error);
      // On error, proceed with normal flow
      setShowTierSelector(true);
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleTierClaimed = async (tierNumber: number, tierName: string) => {
    // Store claimed tier info - use tier initials instead of emojis
    const tierLabel = tierNumber === 1 ? 'OG' : tierNumber === 2 ? 'AI' : tierNumber === 3 ? 'BC' : tierNumber === 4 ? 'EA' : tierNumber === 5 ? 'PW' : 'CM';
    setClaimedTier({ number: tierNumber, name: tierName, emoji: tierLabel });
    
    // Close tier selector
    setShowTierSelector(false);
    
    try {
      // Send REAL verification email via thirdweb API
      await initiateWaitlistAuth(email);
      console.log('✅ Real verification email sent via thirdweb to:', email);
      
      // Show OTP verification modal
      setShowEmailVerification(true);
    } catch (error) {
      console.error('Error sending verification:', error);
      
      // Fallback: still show verification modal for development
      console.warn('⚠️ API not available, using development mode');
      setShowEmailVerification(true);
    }
  };

  const handleEmailVerified = async (otp: string) => {
    if (!claimedTier) return;

    setIsSubmitting(true);
    setShowEmailVerification(false);

    try {
      // For existing users, check if they have a wallet
      if (existingUser?.exists && existingUser.referralCode && existingUser.referralLink) {
        console.log(`✅ Welcome back ${email}! Tier: ${existingUser.tierName}, Auth: ${existingUser.isAuthenticated}`);

        // SECURITY: Only allow wallet input if user is authenticated
        if (!existingUser.isAuthenticated) {
          console.warn('🚫 User exists but not authenticated - requiring OTP verification');
          // Don't return - fall through to normal verification flow
        } else if (existingUser.walletAddress) {
          // Has wallet - show code immediately
          setIsSubmitted(true);
          setReferral({ code: existingUser.referralCode, link: existingUser.referralLink });
          return;
        } else {
          // Authenticated but no wallet - show wallet input
          console.log('🔐 Authenticated user needs to set wallet before getting code');
          setShowWalletInput(true);
          return;
        }
      }

      // New user - verify with backend API (thirdweb + Supabase)
      // Pass URL referral code if present (5th parameter) and detected platform (6th parameter)
      const userPlatform = detectPlatform();
      const result = await verifyAndClaimTier(
        email,
        otp,
        claimedTier.number,
        claimedTier.name,
        urlReferralCode || undefined,
        userPlatform
      );

      console.log(`✅ ${email} verified and claimed ${claimedTier.name}!`, result);

      // Store referral info for after wallet is set
      if (result.referralCode && result.referralLink) {
        setReferral({ code: result.referralCode, link: result.referralLink });
      }

      // Show wallet input (required before showing code)
      setShowWalletInput(true);

    } catch (error: any) {
      console.error('Error verifying:', error);
      alert(error.message || 'Something went wrong. Please try again!');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle wallet submission
  const handleWalletSubmit = async (walletAddress: string) => {
    setIsSavingWallet(true);

    try {
      // Save wallet to database
      const result = await saveWalletAddress(email, walletAddress);

      if (!result.success) {
        alert(result.message || 'Failed to save wallet. Please try again.');
        return;
      }

      console.log(`✅ Wallet saved for ${email}: ${walletAddress}`);

      // Auto-link referral from URL if user doesn't have one linked yet
      if (urlReferralCode && existingUser?.exists && !existingUser?.walletAddress) {
        // Check if user's own code is different from the referral code (prevent self-referral)
        if (existingUser.referralCode !== urlReferralCode) {
          console.log(`🔗 Auto-linking referral from URL: ${urlReferralCode}`);
          try {
            const linkResult = await linkReferralRetroactively(email, urlReferralCode);
            if (linkResult.success) {
              console.log(`✅ Auto-linked to referrer: ${urlReferralCode}`);
              setLinkedReferrer(urlReferralCode);
            } else {
              console.warn(`⚠️ Auto-link failed: ${linkResult.message}`);
            }
          } catch (linkError) {
            console.warn('Auto-link error (non-fatal):', linkError);
          }
        }
      }

      // Close wallet input and show code
      setShowWalletInput(false);
      setIsSubmitted(true);

      // If we don't have referral info yet (existing user flow), fetch it
      if (!referral && existingUser?.referralCode && existingUser?.referralLink) {
        setReferral({ code: existingUser.referralCode, link: existingUser.referralLink });
      }

    } catch (error: any) {
      console.error('Error saving wallet:', error);
      alert(error.message || 'Failed to save wallet. Please try again.');
    } finally {
      setIsSavingWallet(false);
    }
  };

  return (
    <section className="relative flex min-h-screen w-full flex-col items-center bg-bearo-dark text-white selection:bg-white selection:text-black">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes float-slow {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-12px); }
            }
            @keyframes float-delayed {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-14px); }
            }
            .animate-float-slow { animation: float-slow 6s ease-in-out infinite; }
            .animate-float-delayed { animation: float-delayed 7s ease-in-out infinite 0.4s; }
          `,
        }}
      />

      <main className="relative flex flex-1 w-full max-w-6xl flex-col items-center justify-center px-6 pb-14 pt-8 md:px-10">
        {/* BearoApp Logo - Large header size */}
        <div className="z-10 mb-[-30px] animate-fade-up stagger-2">
          <img
            src="/images/BearoApp.png"
            alt="Bearo"
            className="w-[clamp(12rem,25vw,20rem)] h-auto"
          />
        </div>

        {/* Money Animation - below logo like iOS app */}
        <div className="animate-fade-up stagger-3 mb-2 w-28 h-28 z-10">
          {moneyAnimation && (
            <Lottie
              animationData={moneyAnimation}
              loop={true}
              style={{ width: '100%', height: '100%' }}
            />
          )}
        </div>

        {/* iPhone Mockup with Real iOS Auth Flow UI - Complete Redesign */}
        <div className="relative z-10 flex items-center justify-center mt-12 mb-8">
          {/* Honey glow behind phone */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[600px] bg-gradient-to-b from-[#F97316]/20 via-[#FBBF24]/15 to-[#D97706]/10 rounded-full blur-[100px] animate-glow-pulse -z-10" />
          
          <div className="relative animate-float">
            <PhoneFrame className="shadow-[0_20px_60px_rgba(249,115,22,0.3)] w-[320px] h-[650px] sm:w-[360px] sm:h-[720px]">
              {/* iOS Welcome/Auth Screen UI - Real Design from iOS App */}
              <div className="flex flex-col h-full bg-[#0A0A0B] relative overflow-hidden">
                {/* Top Spacer for status bar */}
                <div className="h-12" />
                
                {/* Welcome Animation - Integrated naturally at top */}
                <div className="flex justify-center mb-4 px-4">
                  <div className="w-[65%] h-24">
                    {welcomeAnimation ? (
                      <Lottie
                        animationData={welcomeAnimation}
                        loop={true}
                        style={{ width: '100%', height: '100%' }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-white/40 text-xs">Loading...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* BearoApp Logo - Centered */}
                <div className="flex justify-center mb-3">
                  <img
                    src="/images/BearoApp.png"
                    alt="Bearo"
                    className="w-28 h-28"
                  />
                </div>

                {/* Money Animation - Floating naturally on the right */}
                <div className="absolute top-[32%] right-[8%] w-20 h-20 z-10">
                  {moneyAnimation && (
                    <Lottie
                      animationData={moneyAnimation}
                      loop={true}
                      style={{ width: '100%', height: '100%' }}
                    />
                  )}
                </div>

                {/* Tagline */}
                <p className="text-center text-white/70 text-xs font-medium mb-10 px-4">
                  Bearified Instant Payments
                </p>

                {/* Get Bearified Button - Real iOS Style with Rainbow Border */}
                <div className="px-6 mb-3">
                  <div className="relative rounded-2xl rainbow-border p-[2px]">
                    <button
                      onClick={async () => {
                        const inputEmail = prompt('Enter your email to get Bearified:');
                        if (inputEmail && inputEmail.trim()) {
                          const trimmedEmail = inputEmail.trim();
                          setEmail(trimmedEmail);

                          // Check database for existing user
                          try {
                            const existingUserInfo = await checkExistingUser(trimmedEmail);

                            if (existingUserInfo.exists && existingUserInfo.tierNumber && existingUserInfo.tierName) {
                              // User already has a tier - skip tier selection
                              console.log(`🔄 Existing user found: ${trimmedEmail} - ${existingUserInfo.tierName}`);
                              setExistingUser(existingUserInfo);

                              const tierLabel = existingUserInfo.tierNumber === 1 ? 'OG' : existingUserInfo.tierNumber === 2 ? 'AI' : existingUserInfo.tierNumber === 3 ? 'BC' : existingUserInfo.tierNumber === 4 ? 'EA' : existingUserInfo.tierNumber === 5 ? 'PW' : 'CM';
                              setClaimedTier({
                                number: existingUserInfo.tierNumber,
                                name: existingUserInfo.tierName,
                                emoji: tierLabel
                              });

                              await initiateWaitlistAuth(trimmedEmail);
                              setShowEmailVerification(true);
                              return;
                            }
                          } catch (error) {
                            console.error('Error checking existing user:', error);
                          }

                          // New user - show tier selector
                          if (!isOnWaitlist(trimmedEmail)) {
                            setShowTierSelector(true);
                          } else {
                            alert('This email is already on the waitlist!');
                          }
                        }
                      }}
                      className="w-full py-4 bg-white text-black rounded-2xl font-semibold text-base shadow-lg active:scale-[0.98] transition-transform duration-150"
                    >
                      Get Bearified
                    </button>
                  </div>
                </div>

                {/* Referral Code (after verified) */}
                {isSubmitted && referral && (
                  <div className="px-6 mb-4">
                    <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                      <p className="text-white/60 text-xs font-medium mb-2">Your referral code</p>
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-mono text-white text-base font-bold truncate">{referral.code}</p>
                          <p className="text-white/40 text-[11px] truncate">{referral.link}</p>
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(referral.link);
                              alert('Copied referral link!');
                            } catch {
                              alert('Copy failed — please copy manually.');
                            }
                          }}
                          className="shrink-0 px-3 py-2 rounded-xl bg-white text-black text-xs font-semibold active:scale-[0.98] transition-transform"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sign In Link */}
                <div className="px-6 mb-8">
                  <button className="w-full py-2.5 text-white/60 text-sm font-medium">
                    Sign In
                  </button>
                </div>

                {/* App Store Buttons - Compact with Rainbow for iOS */}
                <div className="px-6 mb-6 space-y-2.5">
                  {/* iOS Download Button - Positive CTA with Rainbow */}
                  <div className="relative rounded-xl rainbow-border p-[2px]">
                    <button className="w-full py-2.5 bg-white text-black rounded-xl font-semibold text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-transform duration-150">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                      </svg>
                      Download for iOS
                    </button>
                  </div>
                  {/* Android Download Button - Secondary, no rainbow */}
                  <button className="w-full py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-medium flex items-center justify-center gap-2 active:bg-white/10 transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.5,12.92 20.16,13.19L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                    </svg>
                    Download for Android
                  </button>
                </div>

                {/* Bottom Activity Indicator */}
                <div className="flex-1 flex items-end justify-center pb-4">
                  <div className="w-8 h-1 bg-white/20 rounded-full" />
                </div>
              </div>
            </PhoneFrame>
          </div>
        </div>

        <div id="waitlist-signup" className="relative z-40 mt-16 w-full max-w-xl scroll-mt-32 px-4 sm:px-0">
          {!isSubmitted ? (
            <form onSubmit={handleCTA} className="relative">
              {/* Mobile: Stacked layout, Desktop: Inline layout */}
              {/* Mobile Layout (stacked) */}
              <div className="flex flex-col gap-3 sm:hidden">
                <div className="relative rounded-2xl rainbow-border p-[2px]">
                  <input
                    type="email"
                    inputMode="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full px-5 py-4 rounded-2xl bg-[#1a1a1c] border border-white/10 text-white placeholder:text-white/50 text-base font-semibold tracking-wide focus:outline-none focus:border-bearo-honey/50 focus:bg-white/5 transition-all"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || isCheckingEmail}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-bearo-honey to-bearo-amber px-6 py-4 text-base font-semibold uppercase text-white transition-transform duration-200 active:scale-[0.98] disabled:opacity-50"
                >
                  {isSubmitting || isCheckingEmail ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                  ) : (
                    <>
                      Join Waitlist
                      <ArrowUpRight className="h-5 w-5 text-white" />
                    </>
                  )}
                </button>
              </div>

              {/* Desktop Layout (inline) */}
              <div className="hidden sm:block">
                <div className="relative rounded-full rainbow-border p-[3px]">
                  <div className="w-full h-full rounded-full bg-[#1a1a1c] border border-white/10 flex gap-2 p-1.5 md:h-16">
                    <input
                      type="email"
                      inputMode="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email"
                      className="flex-1 min-w-0 px-5 py-3 md:py-4 rounded-full bg-white/10 border border-white/20 text-white placeholder:text-white/60 text-sm md:text-base font-display font-semibold tracking-wide focus:outline-none focus:border-bearo-honey/50 focus:bg-white/15 transition-all"
                      required
                      disabled={isSubmitting}
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting || isCheckingEmail}
                      className="flex shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-bearo-honey to-bearo-amber px-5 py-3 md:px-6 md:py-4 text-sm md:text-base font-semibold uppercase text-white transition-transform duration-200 hover:scale-[1.02] active:scale-95 hover:shadow-[0_0_30px_rgba(249,115,22,0.3)] whitespace-nowrap disabled:opacity-50"
                    >
                      {isSubmitting || isCheckingEmail ? (
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                      ) : (
                        <>
                          Join Waitlist
                          <ArrowUpRight className="h-4 w-4 text-white" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Success Message */}
              <div className="flex items-center justify-center gap-2 px-6 py-4 rounded-full bg-bearo-green/10 border border-bearo-green/20">
                <svg className="w-5 h-5 text-bearo-green" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
                <span className="text-bearo-green font-semibold">
                  {existingUser?.exists ? "Welcome back! You're verified." : "You're on the list!"}
                </span>
              </div>

              {/* Referral Code Display */}
              {referral && (
                <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
                  <p className="text-white/60 text-sm font-medium mb-3 text-center">Your Referral Code</p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <div className="text-center sm:text-left">
                      <p className="font-mono text-white text-2xl font-bold">{referral.code}</p>
                      <p className="text-white/40 text-xs mt-1 break-all">{referral.link}</p>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(referral.link);
                          alert('Referral link copied!');
                        } catch {
                          // Fallback for older browsers
                          const textArea = document.createElement('textarea');
                          textArea.value = referral.link;
                          document.body.appendChild(textArea);
                          textArea.select();
                          document.execCommand('copy');
                          document.body.removeChild(textArea);
                          alert('Referral link copied!');
                        }
                      }}
                      className="shrink-0 px-6 py-3 rounded-xl bg-gradient-to-r from-bearo-honey to-bearo-amber text-white font-semibold hover:scale-[1.02] active:scale-95 transition-transform"
                    >
                      Copy Link
                    </button>
                  </div>
                  <p className="text-white/40 text-xs mt-4 text-center">
                    Share your code to earn bonus $BEARCO tokens!
                  </p>
                </div>
              )}

              {/* Retroactive Referral Linking */}
              {referral && !linkedReferrer && (
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  {!showLinkReferral ? (
                    <button
                      onClick={() => setShowLinkReferral(true)}
                      className="w-full text-center text-white/60 text-sm hover:text-white/80 transition-colors"
                    >
                      Have a referral code? <span className="underline">Link it here</span>
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-white/60 text-sm text-center">Enter the referral code from who invited you:</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={linkReferralCode}
                          onChange={(e) => setLinkReferralCode(e.target.value.toUpperCase())}
                          placeholder="BEAR****"
                          maxLength={8}
                          className="flex-1 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 text-sm font-mono uppercase focus:outline-none focus:border-bearo-honey/50"
                        />
                        <button
                          onClick={async () => {
                            if (!linkReferralCode || linkReferralCode.length < 8) {
                              alert('Please enter a valid 8-character referral code (e.g., BEAR1234)');
                              return;
                            }
                            setIsLinkingReferral(true);
                            try {
                              const result = await linkReferralRetroactively(email, linkReferralCode);
                              if (result.success) {
                                setLinkedReferrer(result.referrerCode || linkReferralCode);
                                setShowLinkReferral(false);
                                alert(result.message);
                              } else {
                                alert(result.message);
                              }
                            } catch (error: any) {
                              alert(error.message || 'Failed to link referral code');
                            } finally {
                              setIsLinkingReferral(false);
                            }
                          }}
                          disabled={isLinkingReferral || linkReferralCode.length < 8}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-bearo-honey to-bearo-amber text-white font-semibold text-sm disabled:opacity-50 hover:scale-[1.02] active:scale-95 transition-transform"
                        >
                          {isLinkingReferral ? '...' : 'Link'}
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          setShowLinkReferral(false);
                          setLinkReferralCode('');
                        }}
                        className="w-full text-white/40 text-xs hover:text-white/60 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Linked Referrer Confirmation */}
              {linkedReferrer && (
                <div className="rounded-2xl bg-bearo-green/10 border border-bearo-green/20 p-4">
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 text-bearo-green" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                    </svg>
                    <span className="text-bearo-green text-sm font-medium">
                      Linked to referrer: <span className="font-mono">{linkedReferrer}</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tier Selector Modal */}
          {showTierSelector && (
            <TierSelector
              email={email}
              onTierClaimed={handleTierClaimed}
              onBack={() => setShowTierSelector(false)}
            />
          )}

          {/* Email Verification Modal */}
          {showEmailVerification && claimedTier && (
            <EmailVerification
              email={email}
              tierName={claimedTier.name}
              tierEmoji={claimedTier.emoji}
              onVerified={handleEmailVerified}
              onBack={() => {
                setShowEmailVerification(false);
                // Only show tier selector if not an existing user
                if (!existingUser?.exists) {
                  setShowTierSelector(true);
                }
                // Reset existing user state
                setExistingUser(null);
              }}
              isExistingUser={!!existingUser?.exists}
            />
          )}

          {/* Wallet Input Modal - Required before showing referral code */}
          {showWalletInput && claimedTier && (
            <WalletInput
              email={email}
              tierName={claimedTier.name}
              onWalletSubmit={handleWalletSubmit}
              onBack={() => setShowWalletInput(false)}
              isSubmitting={isSavingWallet}
            />
          )}
        </div>
      </main>

      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[660px] w-[660px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5 blur-[130px]" />
    </section>
  );
};

export default Hero;
