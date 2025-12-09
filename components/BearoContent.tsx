"use client";
import React from 'react';
import { Hero } from './Hero';
import { FeatureSection } from './FeatureSection';
import { HowItWorks } from './HowItWorks';
import { SpendSection } from './SpendSection';
import { Footer } from './Footer';
import { TierRoadmap } from './TierRoadmap';

export const BearoContent: React.FC = () => {
  return (
    <div className="min-h-screen bg-bearo-dark text-white">
      {/* Hero Section with Waitlist Signup */}
      <Hero />

      {/* Tagline */}
      <div className="text-center py-20 px-4">
        <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
          Be{' '}
          <span className="text-gradient">Bearified.</span>
        </h2>
        <p className="mt-6 text-xl text-white/60 max-w-2xl mx-auto">
          The future of instant payments, powered by stablecoins.
        </p>
      </div>

      {/* Features */}
      <FeatureSection />

      {/* How It Works */}
      <HowItWorks />

      {/* Spend Section */}
      <SpendSection />

      {/* Tier Roadmap */}
      <TierRoadmap />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default BearoContent;
