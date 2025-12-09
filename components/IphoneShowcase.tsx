import React from 'react';

interface IphoneShowcaseProps {
  screenSrc: string;
  alt?: string;
}

export const IphoneShowcase: React.FC<IphoneShowcaseProps> = ({ screenSrc, alt }) => {
  return (
    <div className="relative w-[240px] h-[520px] sm:w-[280px] sm:h-[600px] flex-shrink-0">
      <div className="absolute inset-[5%] rounded-[30px] overflow-hidden bg-black shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <img src={screenSrc} alt={alt || 'Bearo app screen'} className="h-full w-full object-cover" />
      </div>
      <img
        src="/iphoneOutline.png"
        alt="Phone frame"
        className="absolute inset-0 h-full w-full object-contain pointer-events-none"
      />
    </div>
  );
};

export default IphoneShowcase;
