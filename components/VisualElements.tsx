import React from 'react';
import { IconType } from '../types';

const FloatingIcon: React.FC<{ icon: IconType; className?: string }> = ({ icon, className }) => {
  const renderIcon = () => {
    switch (icon) {
      case IconType.DOLLAR:
        return (
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="text-bearo-green">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        );
      case IconType.BITCOIN:
        return (
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-bearo-green font-bold text-2xl border-4 border-bearo-green">
            B
          </div>
        );
      case IconType.CARD:
        return (
          <div className="w-16 h-10 bg-gradient-to-br from-bearo-green to-emerald-700 rounded-md border border-white/20 skew-y-6"></div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`absolute ${className}`}>
      {renderIcon()}
    </div>
  );
};

export const BackgroundEffects: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Abstract gradients */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-bearo-green/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-900/20 rounded-full blur-[100px]" />
      
      {/* Floating Icons */}
      <FloatingIcon icon={IconType.DOLLAR} className="top-[20%] left-[10%] animate-float opacity-50 rotate-12 scale-150" />
      <FloatingIcon icon={IconType.BITCOIN} className="bottom-[30%] right-[10%] animate-float-delayed opacity-50 -rotate-12" />
      <FloatingIcon icon={IconType.CARD} className="top-[60%] left-[5%] animate-float opacity-30 rotate-45" />
    </div>
  );
};