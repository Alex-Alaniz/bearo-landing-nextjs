import React from 'react';
import { LazyLottie } from './LazyLottie';

interface TierIconProps {
  tierNumber: number;
  className?: string;
  size?: number; // Size in pixels (default: 24)
}

// Map tier numbers to Lottie animation file paths under /public/animations/tiers/
const TIER_ANIMATIONS: Record<number, string> = {
  0: '/animations/tiers/tier-0-first-mover.json',
  1: '/animations/tiers/tier-1-og-founder.json',
  2: '/animations/tiers/tier-2-alpha-insider.json',
  3: '/animations/tiers/tier-3-beta-crew.json',
  4: '/animations/tiers/tier-4-early-adopter.json',
  5: '/animations/tiers/tier-5-pioneer-wave.json',
  6: '/animations/tiers/tier-6-community.json',
  7: '/animations/tiers/tier-7-default.json',
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
  const animationSrc = TIER_ANIMATIONS[tierNumber] || TIER_ANIMATIONS[7];
  const tierName = TIER_NAMES[tierNumber] || TIER_NAMES[7];
  const fallbackLabel = FALLBACK_LABELS[tierNumber] || FALLBACK_LABELS[7];

  // Tier-initials fallback shown until the animation loads (or on mobile / reduced-motion).
  const labelFallback = (
    <span
      className="inline-flex items-center justify-center font-bold text-current w-full h-full"
      style={{ fontSize: `${size * 0.4}px`, lineHeight: 1 }}
    >
      {fallbackLabel}
    </span>
  );

  return (
    <div
      className={className}
      style={{ width: `${size}px`, height: `${size}px` }}
      title={tierName}
      role="img"
      aria-label={tierName}
    >
      <LazyLottie
        src={animationSrc}
        loop
        playOnMobile
        className="w-full h-full"
        fallback={labelFallback}
      />
    </div>
  );
};

export default TierIcon;
