"use client";
import React, { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// Solana address validation (base58, 32-44 characters)
const isValidSolanaAddress = (address: string): boolean => {
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
};

// BEAR code validation
const isValidBearCode = (code: string): boolean => {
  return /^BEAR[A-Z0-9]{4}$/i.test(code);
};

// Email validation
const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

interface AllocationData {
  email: string;
  referral_code: string;
  tier_name: string;
  base_amount: number;
  referral_amount: number;
  bonus_multiplier: number;
  referral_count: number;
  wallet_address: string | null;
}

type LookupMethod = 'code' | 'email';
type Step = 'choose' | 'enter-code' | 'enter-email' | 'verify-otp' | 'wallet' | 'done';

export const WalletClaimSection: React.FC = () => {
  const [lookupMethod, setLookupMethod] = useState<LookupMethod>('code');
  const [referralCode, setReferralCode] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [allocation, setAllocation] = useState<AllocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState<Step>('choose');

  // Verify by referral code
  const handleVerifyCode = useCallback(async () => {
    if (!referralCode.trim()) {
      setError('Please enter your referral code');
      return;
    }

    const code = referralCode.trim().toUpperCase();
    if (!isValidBearCode(code)) {
      setError('Invalid code format. Should be BEAR followed by 4 characters (e.g., BEARVA59)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!supabase) {
        setError('Database connection not available');
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('airdrop_allocations')
        .select('email, referral_code, tier_name, base_amount, referral_amount, bonus_multiplier, referral_count, wallet_address')
        .eq('referral_code', code)
        .single();

      if (fetchError || !data) {
        setError('Referral code not found. Try looking up by email instead.');
        return;
      }

      setAllocation(data);
      setReferralCode(data.referral_code);

      if (data.wallet_address) {
        setWalletAddress(data.wallet_address);
        setStep('done');
      } else {
        setStep('wallet');
      }
    } catch (err) {
      console.error('[WalletClaim] Error verifying code:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [referralCode]);

  // Look up by email - Step 1: Send OTP
  const handleSendOTP = useCallback(async () => {
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    if (!isValidEmail(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!supabase) {
        setError('Database connection not available');
        return;
      }

      // First check if email exists in airdrop_allocations
      const { data: allocation, error: fetchError } = await supabase
        .from('airdrop_allocations')
        .select('email')
        .eq('email', email.trim().toLowerCase())
        .single();

      if (fetchError || !allocation) {
        setError('Email not found on waitlist. Make sure you use the same email you signed up with.');
        return;
      }

      // Send OTP via thirdweb
      const THIRDWEB_API = 'https://api.thirdweb.com/v1';
      const THIRDWEB_CLIENT_ID = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || '';

      if (!THIRDWEB_CLIENT_ID) {
        setError('Authentication not configured');
        return;
      }

      const response = await fetch(`${THIRDWEB_API}/auth/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': THIRDWEB_CLIENT_ID,
        },
        body: JSON.stringify({
          method: 'email',
          email: email.trim().toLowerCase(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send verification code');
      }

      setStep('verify-otp');
    } catch (err) {
      console.error('[WalletClaim] Error sending OTP:', err);
      setError('Failed to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [email]);

  // Verify OTP and get allocation
  const handleVerifyOTP = useCallback(async () => {
    if (!otp.trim() || otp.length < 6) {
      setError('Please enter the 6-digit code from your email');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Verify OTP with thirdweb
      const THIRDWEB_API = 'https://api.thirdweb.com/v1';
      const THIRDWEB_CLIENT_ID = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || '';

      const response = await fetch(`${THIRDWEB_API}/auth/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': THIRDWEB_CLIENT_ID,
        },
        body: JSON.stringify({
          method: 'email',
          email: email.trim().toLowerCase(),
          code: otp.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Invalid verification code');
      }

      // OTP verified - now fetch allocation
      if (!supabase) {
        setError('Database connection not available');
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('airdrop_allocations')
        .select('email, referral_code, tier_name, base_amount, referral_amount, bonus_multiplier, referral_count, wallet_address')
        .eq('email', email.trim().toLowerCase())
        .single();

      if (fetchError || !data) {
        setError('Could not find your allocation. Please contact support.');
        return;
      }

      setAllocation(data);
      setReferralCode(data.referral_code);

      if (data.wallet_address) {
        setWalletAddress(data.wallet_address);
        setStep('done');
      } else {
        setStep('wallet');
      }
    } catch (err: any) {
      console.error('[WalletClaim] Error verifying OTP:', err);
      setError(err.message || 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [email, otp]);

  // Submit wallet address
  const handleSubmitWallet = useCallback(async () => {
    if (!walletAddress.trim()) {
      setError('Please enter your Solana wallet address');
      return;
    }

    const wallet = walletAddress.trim();
    if (!isValidSolanaAddress(wallet)) {
      setError('Invalid Solana wallet address. Please check and try again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!allocation) {
        setError('No allocation data found');
        return;
      }

      // Use secure API endpoint instead of direct Supabase
      const response = await fetch('/api/link-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: allocation.email,
          referralCode: allocation.referral_code,
          walletAddress: wallet,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.requiresAuth) {
          setError('Please complete email verification on the main signup form first.');
        } else {
          setError(result.error || 'Failed to save wallet address. Please try again.');
        }
        return;
      }

      setSuccess(true);
      setStep('done');
    } catch (err) {
      console.error('[WalletClaim] Error submitting wallet:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [walletAddress, allocation]);

  // Reset form
  const resetForm = () => {
    setStep('choose');
    setLookupMethod('code');
    setReferralCode('');
    setEmail('');
    setOtp('');
    setWalletAddress('');
    setAllocation(null);
    setSuccess(false);
    setError(null);
  };

  // Calculate projected airdrop
  const projectedAirdrop = allocation
    ? Math.floor((allocation.base_amount + allocation.referral_amount) * parseFloat(String(allocation.bonus_multiplier)))
    : 0;

  // Mask email for privacy
  const maskedEmail = allocation?.email
    ? allocation.email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
    : '';

  return (
    <section id="claim-wallet" className="py-20 px-4 bg-gradient-to-b from-black/20 to-transparent">
      <div className="max-w-xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 rounded-full text-orange-400 text-sm font-medium mb-4">
            <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            Airdrop Claim
          </span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Link Your <span className="text-gradient">Solana Wallet</span>
          </h2>
          <p className="mt-4 text-white/60 max-w-md mx-auto">
            Already on the waitlist? Link your wallet to receive your $BEARCO airdrop at launch.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white/5 rounded-2xl border border-white/10 p-6 md:p-8">

          {/* Step: Choose lookup method */}
          {step === 'choose' && (
            <div className="space-y-6">
              <p className="text-center text-white/60 text-sm mb-6">
                How would you like to verify your waitlist account?
              </p>

              <button
                onClick={() => {
                  setLookupMethod('code');
                  setStep('enter-code');
                  setError(null);
                }}
                className="w-full p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <span className="text-xl">🎫</span>
                  </div>
                  <div>
                    <p className="text-white font-semibold group-hover:text-purple-400 transition-colors">I have my BEAR code</p>
                    <p className="text-white/40 text-sm">Enter your referral code (e.g., BEARVA59)</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setLookupMethod('email');
                  setStep('enter-email');
                  setError(null);
                }}
                className="w-full p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <span className="text-xl">📧</span>
                  </div>
                  <div>
                    <p className="text-white font-semibold group-hover:text-blue-400 transition-colors">Look up by email</p>
                    <p className="text-white/40 text-sm">We'll send a verification code to your email</p>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Step: Enter BEAR code */}
          {step === 'enter-code' && (
            <div className="space-y-6">
              <div>
                <label className="block text-white/60 text-sm mb-2">Your Referral Code</label>
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => {
                    setReferralCode(e.target.value.toUpperCase());
                    setError(null);
                  }}
                  placeholder="BEARXXXX"
                  maxLength={8}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500 font-mono text-lg tracking-wider"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => { setStep('choose'); setError(null); }}
                  className="flex-1 py-3 px-6 bg-white/5 border border-white/10 rounded-xl font-medium text-white/60 hover:bg-white/10 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleVerifyCode}
                  disabled={loading || !referralCode.trim()}
                  className="flex-[2] py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verifying...
                    </span>
                  ) : (
                    'Verify Code'
                  )}
                </button>
              </div>

              <p className="text-center text-white/40 text-sm">
                Don't have your code? <button onClick={() => { setStep('enter-email'); setError(null); }} className="text-purple-400 hover:underline">Look up by email</button>
              </p>
            </div>
          )}

          {/* Step: Enter email */}
          {step === 'enter-email' && (
            <div className="space-y-6">
              <div>
                <label className="block text-white/60 text-sm mb-2">Waitlist Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-blue-500"
                />
                <p className="mt-2 text-white/40 text-xs">
                  Enter the email you used to join the waitlist
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => { setStep('choose'); setError(null); }}
                  className="flex-1 py-3 px-6 bg-white/5 border border-white/10 rounded-xl font-medium text-white/60 hover:bg-white/10 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSendOTP}
                  disabled={loading || !email.trim()}
                  className="flex-[2] py-3 px-6 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    'Send Code'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step: Verify OTP */}
          {step === 'verify-otp' && (
            <div className="space-y-6">
              <div className="text-center mb-4">
                <p className="text-white/60 text-sm">
                  We sent a verification code to
                </p>
                <p className="text-white font-medium">{email}</p>
              </div>

              <div>
                <label className="block text-white/60 text-sm mb-2">Verification Code</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                    setError(null);
                  }}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-blue-500 font-mono text-2xl tracking-[0.5em] text-center"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => { setStep('enter-email'); setOtp(''); setError(null); }}
                  className="flex-1 py-3 px-6 bg-white/5 border border-white/10 rounded-xl font-medium text-white/60 hover:bg-white/10 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleVerifyOTP}
                  disabled={loading || otp.length < 6}
                  className="flex-[2] py-3 px-6 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verifying...
                    </span>
                  ) : (
                    'Verify'
                  )}
                </button>
              </div>

              <p className="text-center text-white/40 text-sm">
                Didn't get the code? <button onClick={handleSendOTP} disabled={loading} className="text-blue-400 hover:underline disabled:opacity-50">Resend</button>
              </p>
            </div>
          )}

          {/* Step: Enter Wallet */}
          {step === 'wallet' && allocation && (
            <div className="space-y-6">
              {/* Allocation Preview */}
              <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-4 border border-purple-500/20">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white/60 text-sm">Account Verified</span>
                  <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Verified
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-white/40 text-sm">Your Code</span>
                    <span className="text-white font-mono font-bold">{allocation.referral_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40 text-sm">Email</span>
                    <span className="text-white text-sm">{maskedEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40 text-sm">Tier</span>
                    <span className="text-white text-sm">{allocation.tier_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40 text-sm">Referrals</span>
                    <span className="text-green-400 text-sm">{allocation.referral_count}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-white/10">
                    <span className="text-white/60 text-sm font-medium">Projected Airdrop</span>
                    <span className="text-purple-400 font-bold">{projectedAirdrop.toLocaleString()} $BEARCO</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-white/60 text-sm mb-2">Solana Wallet Address</label>
                <input
                  type="text"
                  value={walletAddress}
                  onChange={(e) => {
                    setWalletAddress(e.target.value);
                    setError(null);
                  }}
                  placeholder="Enter your Solana wallet address"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500 font-mono text-sm"
                />
                <p className="mt-2 text-white/40 text-xs">
                  This is where your $BEARCO tokens will be sent. Make sure it's correct!
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              <button
                onClick={handleSubmitWallet}
                disabled={loading || !walletAddress.trim()}
                className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Linking Wallet...
                  </span>
                ) : (
                  'Link Wallet'
                )}
              </button>
            </div>
          )}

          {/* Step: Success */}
          {step === 'done' && allocation && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {success ? 'Wallet Linked!' : 'Wallet Already Linked'}
                </h3>
                <p className="text-white/60">
                  {success
                    ? 'Your Solana wallet has been linked to your account.'
                    : 'Your wallet is already linked to this account.'}
                </p>
              </div>

              {/* Summary */}
              <div className="bg-white/5 rounded-xl p-4 text-left space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-white/40 text-sm">Code</span>
                  <span className="text-white font-mono font-bold">{allocation.referral_code}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/40 text-sm">Tier</span>
                  <span className="text-white">{allocation.tier_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/40 text-sm">Referrals</span>
                  <span className="text-green-400">{allocation.referral_count}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/40 text-sm">Wallet</span>
                  <span className="text-white font-mono text-xs">
                    {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : allocation.wallet_address ? `${allocation.wallet_address.slice(0, 6)}...${allocation.wallet_address.slice(-4)}` : 'Not linked'}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-white/10">
                  <span className="text-white/60 font-medium">Projected Airdrop</span>
                  <span className="text-purple-400 font-bold text-lg">{projectedAirdrop.toLocaleString()} $BEARCO</span>
                </div>
              </div>

              {/* Share referral code */}
              <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-4 border border-purple-500/20">
                <p className="text-white/60 text-sm mb-2">Share your code to earn more $BEARCO!</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-white/5 rounded-lg font-mono text-white text-center">
                    {allocation.referral_code}
                  </code>
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(`https://bearo.cash/?ref=${allocation.referral_code}`);
                        alert('Referral link copied!');
                      } catch {
                        alert('Copy failed');
                      }
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white text-sm font-medium transition-colors"
                  >
                    Copy Link
                  </button>
                </div>
              </div>

              <button
                onClick={resetForm}
                className="text-purple-400 hover:text-purple-300 text-sm font-medium"
              >
                Link another account
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default WalletClaimSection;
