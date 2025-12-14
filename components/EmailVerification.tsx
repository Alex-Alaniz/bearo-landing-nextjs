import React, { useState, useRef, useEffect } from 'react';
import { initiateWaitlistAuth } from '../lib/api';

interface EmailVerificationProps {
  email: string;
  tierName: string;
  tierEmoji: string;
  onVerified: (otp: string) => void;
  onBack: () => void;
  isExistingUser?: boolean;
}

export const EmailVerification: React.FC<EmailVerificationProps> = ({
  email,
  tierName,
  tierEmoji,
  onVerified,
  onBack,
  isExistingUser = false
}) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();

    // Countdown for resend
    const interval = setInterval(() => {
      setResendCountdown(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.slice(0, 6).split('');
      const newOtp = [...otp];
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newOtp[index + i] = digit;
        }
      });
      setOtp(newOtp);
      
      // Focus last filled input
      const lastIndex = Math.min(index + digits.length, 5);
      inputRefs.current[lastIndex]?.focus();
      
      // Auto-verify if complete
      if (newOtp.every(d => d !== '')) {
        handleVerify(newOtp.join(''));
      }
    } else {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      // Auto-advance to next input
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }

      // Auto-verify if complete
      if (index === 5 && value && newOtp.every(d => d !== '')) {
        handleVerify(newOtp.join(''));
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (code: string) => {
    setIsVerifying(true);
    setError('');

    try {
      if (code.length !== 6) {
        throw new Error('Code must be 6 digits');
      }

      console.log('🔐 Verifying code:', code);
      
      // Pass OTP to parent for backend verification
      onVerified(code);
      
    } catch (err: any) {
      setError(err.message || 'Invalid code. Please try again.');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0) return;

    try {
      // Resend verification email via thirdweb API
      await initiateWaitlistAuth(email);
      
      console.log('✅ Verification code resent to:', email);
      setResendCountdown(60);
      setError('');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      console.error('Resend failed:', err);
      setError(err.message || 'Failed to resend code. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-gradient-to-br from-black/95 via-black/90 to-black/95 border border-white/10 rounded-3xl shadow-2xl p-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-bearo-honey to-bearo-amber flex items-center justify-center text-3xl shadow-lg">
            {tierEmoji}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Verify Your Email</h2>
          <p className="text-white/60 text-sm">
            We sent a 6-digit code to<br />
            <span className="text-bearo-honey font-semibold">{email}</span>
          </p>
        </div>

        {/* OTP Input */}
        <div className="mb-6">
          <div className="flex gap-2 justify-center mb-4">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={el => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(index, e.target.value)}
                onKeyDown={e => handleKeyDown(index, e)}
                className="w-12 h-14 text-center text-2xl font-bold bg-white/5 border-2 border-white/10 rounded-xl text-white focus:border-bearo-honey focus:bg-white/10 focus:outline-none transition-all"
                disabled={isVerifying}
              />
            ))}
          </div>

          {error && (
            <div className="text-red-400 text-sm text-center mb-4 animate-shake">
              {error}
            </div>
          )}

          {isVerifying && (
            <div className="flex items-center justify-center gap-2 text-bearo-honey text-sm">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              Verifying...
            </div>
          )}
        </div>

        {/* Resend Code */}
        <div className="text-center mb-6">
          <button
            onClick={handleResend}
            disabled={resendCountdown > 0}
            className={`text-sm ${
              resendCountdown > 0
                ? 'text-white/30 cursor-not-allowed'
                : 'text-bearo-honey hover:text-bearo-amber transition-colors'
            }`}
          >
            {resendCountdown > 0
              ? `Resend code in ${resendCountdown}s`
              : '📧 Resend verification code'}
          </button>
        </div>

        {/* Tier Confirmation */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 mb-6">
          <p className="text-white/60 text-xs mb-2">
            {isExistingUser ? 'Welcome back! Your tier:' : "You're claiming:"}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{tierEmoji}</span>
            <span className="text-white font-bold">{tierName}</span>
          </div>
        </div>

        {/* Back Button */}
        <button
          onClick={onBack}
          className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white font-medium transition-all"
        >
          {isExistingUser ? '← Cancel' : '← Back to tier selection'}
        </button>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }

        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
};

