import React from 'react';

interface PhoneFrameProps {
  children: React.ReactNode;
  className?: string;
}

export const PhoneFrame: React.FC<PhoneFrameProps> = ({ children, className = '' }) => {
  return (
    <div className={`relative mx-auto w-[280px] h-[580px] sm:w-[300px] sm:h-[620px] rounded-[3rem] overflow-hidden z-10 ${className}`}>
      {/* Real iPhone frame - Apple OEM styling */}
      <div className="absolute inset-0 rounded-[3rem] bg-gradient-to-b from-gray-800 via-gray-900 to-black p-[2px] shadow-2xl">
        <div className="w-full h-full rounded-[3rem] bg-gradient-to-b from-gray-700/50 to-black" />
      </div>

      {/* Inner bezel - iPhone style */}
      <div className="absolute inset-[4px] rounded-[2.9rem] bg-black p-[3px]">
        <div className="w-full h-full rounded-[2.7rem] bg-black overflow-hidden shadow-inner">
          {/* Dynamic Island */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
            <div className="w-28 h-7 bg-black rounded-full flex items-center justify-center gap-2 shadow-lg">
              <div className="w-2.5 h-2.5 rounded-full bg-[#1a1a1a] ring-1 ring-white/10" />
              <div className="w-3 h-3 rounded-full bg-[#1a1a1a] ring-1 ring-white/10" />
            </div>
          </div>

          {/* Status Bar */}
          <div className="absolute top-3 left-8 right-8 flex justify-between items-center z-20 text-[11px] text-white font-semibold">
            <span className="tracking-tight">9:41</span>
            <div className="flex items-center gap-1.5">
              {/* Signal */}
              <div className="flex items-end gap-[2px] h-3">
                <div className="w-[3px] h-1 bg-white rounded-sm" />
                <div className="w-[3px] h-1.5 bg-white rounded-sm" />
                <div className="w-[3px] h-2 bg-white rounded-sm" />
                <div className="w-[3px] h-2.5 bg-white rounded-sm" />
              </div>
              {/* WiFi */}
              <svg className="w-4 h-4" fill="white" viewBox="0 0 24 24">
                <path d="M12 18c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0-6c3.3 0 6 2.7 6 6h-2c0-2.2-1.8-4-4-4s-4 1.8-4 4H6c0-3.3 2.7-6 6-6zm0-4c4.4 0 8 3.6 8 8h-2c0-3.3-2.7-6-6-6s-6 2.7-6 6H4c0-4.4 3.6-8 8-8z"/>
              </svg>
              {/* Battery */}
              <div className="flex items-center gap-0.5">
                <div className="w-6 h-3 rounded-[3px] border border-white/60 p-[2px]">
                  <div className="w-full h-full bg-bearo-green rounded-[1px]" />
                </div>
                <div className="w-[3px] h-1.5 bg-white/60 rounded-r-sm" />
              </div>
            </div>
          </div>

          {/* Screen Content */}
          <div className="w-full h-full pt-12 relative">
            {children}
          </div>

          {/* Home Indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white rounded-full opacity-30 z-20" />
        </div>
      </div>

      {/* Reflection overlay */}
      <div className="absolute inset-0 rounded-[3rem] bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
    </div>
  );
};
