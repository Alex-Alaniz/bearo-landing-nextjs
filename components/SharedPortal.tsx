import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';

const MASK_URL = "https://cash-f.squarecdn.com/web/marketing/9f08d4c9b2ac3153552bf9b8605afcb9b5af3d99/assets/images/home-fall-release-2025/portal1.png";

const VIDEOS = [
  {
    id: 'security', // The "Base" Layer (Bottom)
    src: "https://cash-f.squarecdn.com/web/marketing/9f08d4c9b2ac3153552bf9b8605afcb9b5af3d99/assets/images/home-fall-release-2025/videos/security_11182025.mp4",
    poster: "https://cash-f.squarecdn.com/web/marketing/9f08d4c9b2ac3153552bf9b8605afcb9b5af3d99/assets/images/home-fall-release-2025/posters/security-poster.webp"
  },
  {
    id: 'reviews', // The "Card" Layer (Top)
    src: "https://cash-f.squarecdn.com/web/marketing/9f08d4c9b2ac3153552bf9b8605afcb9b5af3d99/assets/images/home-fall-release-2025/videos/testimonial_11182025.mp4",
    poster: "https://cash-f.squarecdn.com/web/marketing/9f08d4c9b2ac3153552bf9b8605afcb9b5af3d99/assets/images/home-fall-release-2025/posters/reviews-poster.webp"
  }
];

interface SharedPortalProps {
  activeIndex: number;
}

const SharedPortal = ({ activeIndex }: SharedPortalProps) => {
  const containerRef = useRef(null);
  const baseVideoRef = useRef(null); // Video 0
  const overlayVideoRef = useRef(null); // Video 1

  useEffect(() => {
    // Initial Setup to ensure correct z-stacking
    // Base video is always at 0% (visible behind)
    gsap.set(baseVideoRef.current, { 
      zIndex: 1, 
      yPercent: 0,
      scale: 1 // Slight scale for parallax effect later
    });

    // Overlay video starts off-screen (100%) if we are at index 0
    // Or on-screen (0%) if we start at index 1
    if (activeIndex === 0) {
      gsap.set(overlayVideoRef.current, { 
        zIndex: 2, 
        yPercent: 100,
        opacity: 1
      });
    }
  }, []); // Run once on mount

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.inOut", duration: 1.2 } });

    if (activeIndex === 1) {
      // --- SCROLLING DOWN (Show Reviews) ---
      // The Overlay Video (Video 1) slides UP to cover the Base Video
      
      tl.to(overlayVideoRef.current, {
        yPercent: 0, // Slide up to center
      });

      // Optional: Slight Parallax on the base video pushing it back
      tl.to(baseVideoRef.current, {
        scale: 0.95,
        opacity: 0.5,
        duration: 1.2
      }, 0);

    } else {
      // --- SCROLLING UP (Show Security) ---
      // The Overlay Video (Video 1) slides DOWN to reveal Base Video
      
      tl.to(overlayVideoRef.current, {
        yPercent: 100, // Slide down off screen
      });

      // Restore base video
      tl.to(baseVideoRef.current, {
        scale: 1,
        opacity: 1,
        duration: 1.2
      }, 0);
    }

  }, [activeIndex]);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none flex items-center justify-center">
      
      {/* THE PORTAL MASK CONTAINER */}
      <div 
        ref={containerRef}
        className="relative w-[290px] h-[625px] overflow-hidden bg-black"
        style={{
          // The Organic Phone Shape Mask
          maskImage: `url(${MASK_URL})`,
          WebkitMaskImage: `url(${MASK_URL})`,
          maskSize: '100% 100%',
          WebkitMaskSize: '100% 100%',
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
        }}
      >
        {/* VIDEO 0: THE BASE (Security) */}
        <div 
          ref={baseVideoRef}
          className="absolute inset-0 w-full h-full bg-black"
        >
          <video
            src={VIDEOS[0].src}
            poster={VIDEOS[0].poster}
            autoPlay muted loop playsInline
            className="w-full h-full object-cover"
          />
        </div>

        {/* VIDEO 1: THE OVERLAY (Reviews) */}
        {/* 
           This is the "Sheet" that slides up/down.
           We add 'rounded-t-[32px]' to give it that card look 
           as it slides through the portal.
        */}
        <div 
          ref={overlayVideoRef}
          className="absolute inset-0 w-full h-full bg-black overflow-hidden rounded-t-[32px]"
          style={{ willChange: 'transform' }}
        >
          <video
            src={VIDEOS[1].src}
            poster={VIDEOS[1].poster}
            autoPlay muted loop playsInline
            className="w-full h-full object-cover"
          />
          {/* Optional: Dark overlay on the video itself to make text pop if needed */}
          <div className="absolute inset-0 bg-black/10" />
        </div>

      </div>
    </div>
  );
};

export default SharedPortal;