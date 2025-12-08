"use client";
import React, { useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';
import SmoothScrollManager from '@/components/SmoothScrollManager';

// --- Shared Constants ---
const MASK_URL = "https://cash-f.squarecdn.com/web/marketing/9f08d4c9b2ac3153552bf9b8605afcb9b5af3d99/assets/images/home-fall-release-2025/portal1.png";

// --- Sub-Components ---

// 1. The Masked Video Component (The "Portal")
const PortalVideo = React.forwardRef(({ src, poster, isVisible = true }, ref) => {
  return (
    <div 
      className="relative w-[290px] h-[625px] mx-auto z-10 transition-opacity duration-300"
      // This maps to the "three-column-grid-section_portal" class logic
      style={{
        '--mask-image': `url(${MASK_URL})`,
        WebkitMaskImage: `url(${MASK_URL})`,
        WebkitMaskSize: '100% 100%',
        maskSize: '100% 100%',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        opacity: isVisible ? 1 : 0
      }}
    >
      <div className="w-full h-full bg-black">
        <video
          ref={ref}
          className="w-full h-full object-cover"
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
        >
          <source src={src} type="video/mp4" />
        </video>
      </div>
      
      {/* Optional Overlay/Pause UI here if needed */}
    </div>
  );
});

// 2. Generic Section Layout (Matches the 3-column grid)
const SectionLayout = ({ 
  id, 
  leftContent, 
  rightContent, 
  videoSrc, 
  posterSrc,
  videoRef,
  textRefLeft,
  textRefRight
}) => {
  return (
    <section 
      data-scroll-section 
      data-identifier={id}
      className="relative w-full h-screen flex items-center justify-center overflow-hidden bg-black text-white"
    >
      <div className="w-full max-w-[1416px] px-6 lg:px-0 flex flex-col lg:flex-row items-center lg:items-start justify-between relative">
        
        {/* LEFT COLUMN */}
        <div ref={textRefLeft} className="lg:w-[311px] mb-12 lg:mb-0 z-10 mt-[15vh] opacity-100">
          {leftContent}
        </div>

        {/* MIDDLE COLUMN (Portal) */}
        <div className="relative mx-auto lg:mx-[27px] z-0 shrink-0">
           <PortalVideo 
             ref={videoRef}
             src={videoSrc}
             poster={posterSrc}
           />
        </div>

        {/* RIGHT COLUMN */}
        <div ref={textRefRight} className="lg:w-[371px] flex flex-col justify-start mt-[15vh] z-10 opacity-100">
          {rightContent}
        </div>
      </div>
    </section>
  );
};

// --- Main App Component ---

const CashAppPage = () => {
  // Refs for animating elements
  const securityVideoRef = useRef(null);
  const securityLeftRef = useRef(null);
  const securityRightRef = useRef(null);

  const reviewsVideoRef = useRef(null);
  const reviewsLeftRef = useRef(null);
  const reviewsRightRef = useRef(null);

  // The Animation Orchestrator
  const handleSectionChange = (fromIndex, toIndex) => {
    // We only care about animating between specific sections here
    // 0 = Security, 1 = Reviews

    const tl = gsap.timeline();

    // SCROLLING DOWN (Security -> Reviews)
    if (fromIndex === 0 && toIndex === 1) {
      
      // 1. Animate OUT Security Elements
      tl.to([securityLeftRef.current, securityRightRef.current], {
        y: -50,
        opacity: 0,
        duration: 0.8,
        ease: "power2.inOut"
      }, 0);

      // 2. Animate Portal Transition (The "Wipe" effect)
      // We scale the outgoing video slightly down and fade it
      tl.to(securityVideoRef.current, {
        opacity: 0.5,
        scale: 0.95,
        duration: 1,
        ease: "power2.inOut"
      }, 0);

      // 3. Prepare Reviews Elements (Set initial state before animating in)
      tl.fromTo([reviewsLeftRef.current, reviewsRightRef.current], {
        y: 50,
        opacity: 0
      }, {
        y: 0,
        opacity: 1,
        duration: 0.8,
        stagger: 0.1,
        ease: "power3.out",
        delay: 0.4 // Wait for scroll to be halfway
      }, 0);

      // 4. Animate IN Reviews Video
      // It scales up from slightly smaller, creating a "portal pop" effect
      tl.fromTo(reviewsVideoRef.current, {
        scale: 0.9,
        opacity: 0
      }, {
        scale: 1,
        opacity: 1,
        duration: 1,
        ease: "power3.out"
      }, 0.2);
    }

    // SCROLLING UP (Reviews -> Security)
    if (fromIndex === 1 && toIndex === 0) {
      
      // Reverse logic
      tl.to([reviewsLeftRef.current, reviewsRightRef.current], {
        y: 50,
        opacity: 0,
        duration: 0.8,
        ease: "power2.inOut"
      }, 0);

      tl.to(reviewsVideoRef.current, {
        opacity: 0,
        scale: 0.9,
        duration: 1,
        ease: "power2.inOut"
      }, 0);

      tl.fromTo([securityLeftRef.current, securityRightRef.current], {
        y: -50,
        opacity: 0
      }, {
        y: 0,
        opacity: 1,
        duration: 0.8,
        stagger: 0.1,
        ease: "power3.out",
        delay: 0.4
      }, 0);

      tl.fromTo(securityVideoRef.current, {
        scale: 0.95,
        opacity: 0.5
      }, {
        scale: 1,
        opacity: 1,
        duration: 1,
        ease: "power3.out"
      }, 0.2);
    }
  };

  return (
    <SmoothScrollManager onSectionChange={handleSectionChange}>
      
      {/* SECTION 1: SECURITY */}
      <SectionLayout
        id="security"
        videoRef={securityVideoRef}
        textRefLeft={securityLeftRef}
        textRefRight={securityRightRef}
        videoSrc="https://cash-f.squarecdn.com/web/marketing/9f08d4c9b2ac3153552bf9b8605afcb9b5af3d99/assets/images/home-fall-release-2025/videos/security_11182025.mp4"
        posterSrc="https://cash-f.squarecdn.com/web/marketing/9f08d4c9b2ac3153552bf9b8605afcb9b5af3d99/assets/images/home-fall-release-2025/posters/security-poster.webp"
        
        leftContent={
          <h2 className="text-[38px] font-normal text-white leading-[44px] tracking-[-1.20px] text-left">
            Security built <br className="hidden lg:block" />
            into every swipe, <br className="hidden lg:block" />
            tap, and send
          </h2>
        }
        
        rightContent={
          <>
            <p className="text-[17px] font-normal text-white leading-[25px] tracking-[-0.54px] text-left mb-8">
              Since 2020, we’ve prevented $2 billion+ in scams—while protecting what matters with real-time monitoring, Zero Fraud Liability, and FDIC insurance, subject to terms.
              <span className="relative bottom-[6px] text-[14px] leading-[19px] ml-0.5">*</span>
            </p>
            <a href="/security" className="flex items-center justify-center w-[164px] h-[51px] border border-white rounded-[100px] text-white hover:bg-white hover:text-black transition-colors duration-300">
              <span className="text-[14px]">Learn about security</span>
            </a>
          </>
        }
      />

      {/* SECTION 2: REVIEWS */}
      <SectionLayout
        id="reviews"
        videoRef={reviewsVideoRef}
        textRefLeft={reviewsLeftRef}
        textRefRight={reviewsRightRef}
        videoSrc="https://cash-f.squarecdn.com/web/marketing/9f08d4c9b2ac3153552bf9b8605afcb9b5af3d99/assets/images/home-fall-release-2025/videos/testimonial_11182025.mp4"
        posterSrc="https://cash-f.squarecdn.com/web/marketing/9f08d4c9b2ac3153552bf9b8605afcb9b5af3d99/assets/images/home-fall-release-2025/posters/reviews-poster.webp"
        
        leftContent={
           // The HTML structure you provided had an empty left column or header container here
           // Based on the 'reviews' section usually being flipped or having a title:
           <h2 className="text-[38px] font-normal text-white leading-[44px] tracking-[-1.20px] text-left">
             The money app <br/>
             57 million+ <br/>
             people trust
           </h2>
        }
        
        rightContent={
          <>
            <blockquote className="text-[24px] font-normal text-white leading-[32px] tracking-[-0.8px] mb-8">
              "Cash App makes it so easy to manage everything—I use it for saving, splitting bills, and getting paid. It’s all-in-one."
            </blockquote>
            <a href="/reviews" className="flex items-center justify-center w-[164px] h-[51px] border border-white rounded-[100px] text-white hover:bg-white hover:text-black transition-colors duration-300">
              Read reviews
            </a>
          </>
        }
      />

    </SmoothScrollManager>
  );
};

export default CashAppPage;