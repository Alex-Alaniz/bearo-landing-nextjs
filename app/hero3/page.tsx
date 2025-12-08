import React from 'react';

const SecuritySection = () => {
  return (
    <section className="relative w-full bg-black text-white py-20 overflow-hidden flex justify-center">
      {/* Container matching design max-width */}
      <div className="w-full max-w-[1416px] px-6 lg:px-0 flex flex-col lg:flex-row items-center lg:items-start justify-between relative">
        
        {/* LEFT COLUMN: Title */}
        {/* Width constrained to 311px to match design line-breaks */}
        <div className="lg:w-[311px] mb-12 lg:mb-0 z-10 mt-[205px]">
          <h2 className="text-[38px] font-normal text-white leading-[44px] tracking-[-1.20px] text-left">
            Security built <br className="hidden lg:block" />
            into every swipe, <br className="hidden lg:block" />
            tap, and send
          </h2>
        </div>

        {/* MIDDLE COLUMN: Video Portal (Masking Setup Preserved) */}
        {/* The 'overflow-hidden' and 'rounded-[20px]' on this container act as the mask */}
        <div className="relative w-[270px] h-[583px] mx-auto lg:mx-[27px] z-0 overflow-hidden rounded-[20px] bg-black shrink-0">
          <div className="absolute inset-0 w-full h-full">
            <div className="relative w-full h-full">
              <video
                data-testid="video"
                preload="auto"
                muted
                loop
                playsInline
                autoPlay
                poster="https://cash-f.squarecdn.com/web/marketing/9f08d4c9b2ac3153552bf9b8605afcb9b5af3d99/assets/images/home-fall-release-2025/posters/security-poster.webp"
                className="w-full h-full object-cover"
              >
                <source
                  src="https://cash-f.squarecdn.com/web/marketing/9f08d4c9b2ac3153552bf9b8605afcb9b5af3d99/assets/images/home-fall-release-2025/videos/security_11182025.mp4"
                  type="video/mp4"
                />
              </video>
              
              {/* Pause Button */}
              <div className="absolute bottom-[25px] right-[21px] w-[22px] h-[25px]">
                <button aria-label="Pause video" className="w-full h-full flex items-center justify-center hover:opacity-80 transition-opacity">
                  <svg width="22" height="26" viewBox="0 0 22 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g transform="translate(0.43 2.18)">
                        <path fillRule="evenodd" clipRule="evenodd" d="M10.3584 20.7168 C16.0792 20.7168 20.7168 16.0792 20.7168 10.3584 C20.7168 4.63761 16.0792 0 10.3584 0 C4.63761 0 0 4.63761 0 10.3584 C0 16.0792 4.63761 20.7168 10.3584 20.7168 Z" fill="transparent"/>
                        <path d="M20.7168 10.3584 L20.2852 10.3584 C20.2852 15.8408 15.8408 20.2852 10.3584 20.2852 L10.3584 20.7168 L10.3584 21.1484 C16.3176 21.1484 21.1484 16.3176 21.1484 10.3584 L20.7168 10.3584 Z M10.3584 20.7168 L10.3584 20.2852 C4.87598 20.2852 0.4316 15.8408 0.4316 10.3584 L0 10.3584 L-0.4316 10.3584 C-0.4316 16.3176 4.39925 21.1484 10.3584 21.1484 L10.3584 20.7168 Z M0 10.3584 L0.4316 10.3584 C0.4316 4.87598 4.87598 0.4316 10.3584 0.4316 L10.3584 0 L10.3584 -0.4316 C4.39925 -0.4316 -0.4316 4.39925 -0.4316 10.3584 L0 10.3584 Z M10.3584 0 L10.3584 0.4316 C15.8408 0.4316 20.2852 4.87598 20.2852 10.3584 L20.7168 10.3584 L21.1484 10.3584 C21.1484 4.39925 16.3176 -0.4316 10.3584 -0.4316 L10.3584 0 Z" fill="white"/>
                    </g>
                    <g transform="translate(9.06 9.95)">
                        <path fillRule="evenodd" clipRule="evenodd" d="M0 0 L0 5.1792 Z" fill="white"/>
                        <path d="M0 0 L-0.4316 0 L-0.4316 5.1792 L0 5.1792 L0.4316 5.1792 L0.4316 0 L0 0 Z" fill="white"/>
                    </g>
                    <g transform="translate(12.52 9.95)">
                        <path fillRule="evenodd" clipRule="evenodd" d="M0 0 L0 5.1792 Z" fill="white"/>
                        <path d="M0 0 L-0.4316 0 L-0.4316 5.1792 L0 5.1792 L0.4316 5.1792 L0.4316 0 L0 0 Z" fill="white"/>
                    </g>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Description & Links */}
        {/* Width constrained to 371px to match design */}
        <div className="lg:w-[371px] flex flex-col justify-start mt-[198px] z-10 space-y-8">
          
          {/* Description Text */}
          <div className="w-full">
            <p className="text-[17px] font-normal text-white leading-[25px] tracking-[-0.54px] text-left">
              Since 2020, we’ve prevented $2 billion+ in scams—while protecting what matters with real-time monitoring, Zero Fraud Liability, and FDIC insurance, subject to terms.
              {/* Asterisk superscript */}
              <span className="relative bottom-[6px] text-[14px] leading-[19px] ml-0.5">*</span>
            </p>
          </div>

          {/* Button */}
          <a
            href="/security"
            className="flex items-center justify-center w-[164px] h-[51px] border border-white rounded-[100px] text-white hover:bg-white hover:text-black transition-colors"
          >
            <span className="text-[14px] font-normal leading-[17px] tracking-[-0.28px]">
              Learn about security
            </span>
          </a>

          {/* Disclaimer Link */}
          <button className="flex items-start group mt-8 lg:mt-auto text-white hover:opacity-70 transition-opacity">
             <div className="flex flex-row items-baseline gap-1 cursor-pointer">
                {/* Small Asterisk */}
                <div className="text-[11px] font-normal leading-[14px] tracking-[-0.36px]">
                    *
                </div>
                {/* Disclaimer Text */}
                <div className="border-b border-white pb-[2px]">
                   <span className="text-[11px] font-normal leading-[14px] tracking-[-0.36px]">
                    See legal disclaimers
                   </span>
                </div>
             </div>
          </button>
        </div>
      </div>
    </section>
  );
};

export default SecuritySection;