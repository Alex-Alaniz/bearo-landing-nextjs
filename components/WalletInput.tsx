import React, { useState } from 'react';

interface WalletInputProps {
  email: string;
  tierName: string;
  onWalletSubmit: (walletAddress: string) => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

// Basic Solana address validation (base58, 32-44 chars)
function isValidSolanaAddress(address: string): boolean {
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
}

export const WalletInput: React.FC<WalletInputProps> = ({
  email,
  tierName,
  onWalletSubmit,
  onBack,
  isSubmitting = false,
}) => {
  const [walletAddress, setWalletAddress] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const trimmed = walletAddress.trim();

    if (!trimmed) {
      setError('Please enter your Solana wallet address');
      return;
    }

    if (!isValidSolanaAddress(trimmed)) {
      setError('Please enter a valid Solana wallet address');
      return;
    }

    setError('');
    onWalletSubmit(trimmed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4">
      {/* Mobile: bottom sheet, Desktop: centered modal */}
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-[#1a1a1c] border border-white/10 sm:border p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto overscroll-contain">
        {/* Mobile drag indicator */}
        <div className="sm:hidden flex justify-center mb-4">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header - smaller on mobile */}
        <div className="text-center mb-4 sm:mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-bearo-honey/20 to-bearo-amber/20 mb-3 sm:mb-4">
            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-bearo-honey" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">Almost there!</h2>
          <p className="text-white/60 text-sm">
            Welcome, <span className="text-bearo-honey font-medium">{tierName}</span>
          </p>
        </div>

        {/* Info Box - more compact on mobile */}
        <div className="rounded-xl bg-bearo-honey/10 border border-bearo-honey/20 p-3 sm:p-4 mb-4 sm:mb-6">
          <p className="text-white/80 text-sm leading-relaxed">
            Enter your <span className="text-bearo-honey font-semibold">Solana wallet</span> for referral airdrops.
          </p>
        </div>

        {/* Wallet Input */}
        <div className="mb-4">
          <label className="block text-white/60 text-sm font-medium mb-2">
            Solana Wallet Address
          </label>
          <input
            type="text"
            value={walletAddress}
            onChange={(e) => {
              setWalletAddress(e.target.value);
              setError('');
            }}
            placeholder="e.g., 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder:text-white/30 text-sm font-mono focus:outline-none focus:border-bearo-honey/50 focus:bg-white/10 transition-all"
            disabled={isSubmitting}
          />
          {error && (
            <p className="text-red-400 text-xs mt-2">{error}</p>
          )}
        </div>

        {/* Warning - hidden on mobile to save space, shown on desktop */}
        <div className="hidden sm:block rounded-lg bg-white/5 border border-white/10 p-3 mb-6">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-white/50 text-xs">
              Double-check your wallet address. You can update it later in settings.
            </p>
          </div>
        </div>

        {/* Buttons - with safe-area padding on mobile */}
        <div className="flex gap-3 pb-[env(safe-area-inset-bottom)] sm:pb-0">
          <button
            onClick={onBack}
            disabled={isSubmitting}
            className="flex-1 py-3.5 sm:py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 font-medium text-sm hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            Back
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !walletAddress.trim()}
            className="flex-1 py-3.5 sm:py-3 rounded-xl bg-gradient-to-r from-bearo-honey to-bearo-amber text-white font-semibold text-sm active:scale-95 transition-transform disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                Saving...
              </span>
            ) : (
              'Get My Code'
            )}
          </button>
        </div>

        {/* Email reminder - smaller margin on mobile */}
        <p className="text-white/30 text-xs text-center mt-3 sm:mt-4 mb-2 sm:mb-0">
          Signed in as {email}
        </p>
      </div>
    </div>
  );
};

export default WalletInput;
