// app/hero4/page.jsx (or wherever your route is)
'use client';

import React, { useRef, useState } from 'react';
import gsap from 'gsap';
import SmoothScrollManager from '@/components/SmoothScrollManager';
import SharedPortal from '@/components/SharedPortal';

// Reusable Layout for Text (No Video Here!)
const TextSection = ({ id, leftContent, rightContent, textRefLeft, textRefRight }) => {
  return (
    <section 
      data-scroll-section 
      data-identifier={id}
      className="relative w-full h-screen flex items-center justify-center bg-transparent pointer-events-none"
    >
      {/* 
        Container matching design max-width. 
        pointer-events-auto re-enables clicking on buttons since section is none 
      */}
      <div className="w-full max-w-[1416px] px-6 lg:px-0 flex flex-col lg:flex-row items-center lg:items-start justify-between relative pointer-events-auto">
        
        {/* LEFT TEXT */}
        <div ref={textRefLeft} className="lg:w-[311px] mb-12 lg:mb-0 z-20 mt-[15vh]">
          {leftContent}
        </div>

        {/* MIDDLE SPACER (Keeps layout correct while Portal floats behind) */}
        <div className="w-[290px] mx-auto lg:mx-[27px] shrink-0" />

        {/* RIGHT TEXT */}
        <div ref={textRefRight} className="lg:w-[371px] flex flex-col justify-start mt-[15vh] z-20">
          {rightContent}
        </div>
      </div>
    </section>
  );
};

const CashAppPage = () => {
  // We track which section is active to tell the Portal what to show
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);

  // Text Refs for GSAP
  const securityLeftRef = useRef(null);
  const securityRightRef = useRef(null);
  const reviewsLeftRef = useRef(null);
  const reviewsRightRef = useRef(null);

  const handleSectionChange = (fromIndex, toIndex) => {
    setActiveSectionIndex(toIndex);

    const tl = gsap.timeline();

    // Helper to get refs based on index
    const getRefs = (idx) => idx === 0 ? [securityLeftRef.current, securityRightRef.current] : [reviewsLeftRef.current, reviewsRightRef.current];

    const outgoingRefs = getRefs(fromIndex);
    const incomingRefs = getRefs(toIndex);

    // 1. Animate Outgoing Text (Move UP and Fade Out)
    tl.to(outgoingRefs, {
      y: -100,
      opacity: 0,
      duration: 0.8,
      ease: "power2.inOut"
    }, 0);

    // 2. Animate Incoming Text (Come from DOWN and Fade In)
    tl.fromTo(incomingRefs, {
      y: 100,
      opacity: 0
    }, {
      y: 0,
      opacity: 1,
      duration: 1.0,
      ease: "power3.out",
      stagger: 0.1, // Left text moves slightly before right text
    }, 0.2);
  };

  return (
    <div className="bg-black min-h-screen text-white">
      {/* 
        The Portal lives outside the ScrollManager.
        It is "Fixed" to the viewport.
        It listens to activeSectionIndex to do the wipe animation.
      */}
      <SharedPortal activeIndex={activeSectionIndex} />

      <SmoothScrollManager onSectionChange={handleSectionChange}>
        
        {/* SECTION 0: SECURITY */}
        <TextSection
          id="security"
          textRefLeft={securityLeftRef}
          textRefRight={securityRightRef}
          leftContent={
            <h2 className="text-[38px] font-normal leading-[44px] tracking-[-1.20px]">
              Security built <br className="hidden lg:block" />
              into every swipe, <br className="hidden lg:block" />
              tap, and send
            </h2>
          }
          rightContent={
            <>
              <p className="text-[17px] leading-[25px] tracking-[-0.54px] mb-8">
                Since 2020, we’ve prevented $2 billion+ in scams—while protecting what matters with real-time monitoring, Zero Fraud Liability, and FDIC insurance, subject to terms.
                <span className="relative bottom-[6px] text-[14px] leading-[19px] ml-0.5">*</span>
              </p>
              <a href="/security" className="flex items-center justify-center w-[164px] h-[51px] border border-white rounded-[100px] hover:bg-white hover:text-black transition-colors duration-300">
                <span className="text-[14px]">Learn about security</span>
              </a>
            </>
          }
        />

        {/* SECTION 1: REVIEWS */}
        <TextSection
          id="reviews"
          textRefLeft={reviewsLeftRef}
          textRefRight={reviewsRightRef}
          leftContent={
             <h2 className="text-[38px] font-normal leading-[44px] tracking-[-1.20px]">
               The money app <br/>
               57 million+ <br/>
               people trust
             </h2>
          }
          rightContent={
            <>
              <blockquote className="text-[24px] leading-[32px] tracking-[-0.8px] mb-8">
                "Cash App makes it so easy to manage everything—I use it for saving, splitting bills, and getting paid. It’s all-in-one."
              </blockquote>
              <a href="/reviews" className="flex items-center justify-center w-[164px] h-[51px] border border-white rounded-[100px] hover:bg-white hover:text-black transition-colors duration-300">
                Read reviews
              </a>
            </>
          }
        />

      </SmoothScrollManager>
    </div>
  );
};

export default CashAppPage;