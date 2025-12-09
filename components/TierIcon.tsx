import React, { useState, useEffect } from 'react';
import Lottie from 'lottie-react';

interface TierIconProps {
  tierNumber: number;
  className?: string;
  size?: number; // Size in pixels (default: 24)
}

// Map tier numbers to Lottie animation file paths
// Primary: Check /animations/tiers/ for tier-specific files
// Fallback: Use general animations from Bearo-iOS repo
const TIER_ANIMATIONS: Record<number, { primary: string; fallback: string }> = {
  0: { primary: '/animations/tiers/tier-0-first-mover.json', fallback: '/animations/Bear.json' },
  1: { primary: '/animations/tiers/tier-1-og-founder.json', fallback: '/animations/FlyingBee.json' },
  2: { primary: '/animations/tiers/tier-2-alpha-insider.json', fallback: '/animations/Beary.json' },
  3: { primary: '/animations/tiers/tier-3-beta-crew.json', fallback: '/animations/FlossBear.json' },
  4: { primary: '/animations/tiers/tier-4-early-adopter.json', fallback: '/animations/Money.json' },
  5: { primary: '/animations/tiers/tier-5-pioneer-wave.json', fallback: '/animations/Contact.json' },
  6: { primary: '/animations/tiers/tier-6-community.json', fallback: '/animations/Bear.json' },
  7: { primary: '/animations/tiers/tier-7-default.json', fallback: '/animations/EmailSend.json' },
};

// Fallback labels if Lottie fails to load (tier initials)
const FALLBACK_LABELS: Record<number, string> = {
  0: 'FM',
  1: 'OG',
  2: 'AI',
  3: 'BC',
  4: 'EA',
  5: 'PW',
  6: 'CM',
  7: 'BU',
};

// Tier names for accessibility
const TIER_NAMES: Record<number, string> = {
  0: 'First Mover',
  1: 'OG Founder',
  2: 'Alpha Insider',
  3: 'Beta Crew',
  4: 'Early Adopter',
  5: 'Pioneer Wave',
  6: 'Community Member',
  7: 'Bearo User',
};

export const TierIcon: React.FC<TierIconProps> = ({ tierNumber, className = '', size = 24 }) => {
  const [animationData, setAnimationData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const tierConfig = TIER_ANIMATIONS[tierNumber] || TIER_ANIMATIONS[7];
    setIsLoading(true);
    setHasError(false);
    
    console.log(`🎬 TierIcon: Loading animation for tier ${tierNumber}`, tierConfig.primary);
    
    // Try primary path first (tier-specific), then fallback
    fetch(tierConfig.primary)
      .then(res => {
        console.log(`🎬 TierIcon: Primary fetch response for tier ${tierNumber}:`, res.status);
        if (!res.ok) throw new Error(`Primary not found: ${res.status}`);
        return res.json();
      })
      .then(data => {
        console.log(`✅ TierIcon: Loaded primary animation for tier ${tierNumber}`);
        setAnimationData(data);
        setHasError(false);
        setIsLoading(false);
      })
      .catch((err) => {
        console.log(`⚠️ TierIcon: Primary failed for tier ${tierNumber}, trying fallback...`, err.message);
        // Try fallback path
        fetch(tierConfig.fallback)
          .then(res => {
            console.log(`🎬 TierIcon: Fallback fetch response for tier ${tierNumber}:`, res.status);
            if (!res.ok) throw new Error(`Fallback not found: ${res.status}`);
            return res.json();
          })
          .then(data => {
            console.log(`✅ TierIcon: Loaded fallback animation for tier ${tierNumber}`);
            setAnimationData(data);
            setHasError(false);
            setIsLoading(false);
          })
          .catch((fallbackErr) => {
            console.error(`❌ TierIcon: Both primary and fallback failed for tier ${tierNumber}`, fallbackErr.message);
            setHasError(true);
            setIsLoading(false);
          });
      });
  }, [tierNumber]);

  // Show tier badge while loading or on error
  if (isLoading || hasError || !animationData) {
    return (
      <span
        className={`inline-flex items-center justify-center font-bold text-current ${className}`}
        style={{ width: `${size}px`, height: `${size}px`, fontSize: `${size * 0.4}px`, lineHeight: 1 }}
        title={TIER_NAMES[tierNumber] || TIER_NAMES[7]}
        role="img"
        aria-label={TIER_NAMES[tierNumber] || TIER_NAMES[7]}
      >
        {FALLBACK_LABELS[tierNumber] || FALLBACK_LABELS[7]}
      </span>
    );
  }

  return (
    <div 
      className={className} 
      style={{ width: `${size}px`, height: `${size}px` }}
      title={TIER_NAMES[tierNumber] || TIER_NAMES[7]}
      role="img"
      aria-label={TIER_NAMES[tierNumber] || TIER_NAMES[7]}
    >
      <Lottie
        animationData={animationData}
        loop={true}
        autoplay={true}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default TierIcon;
