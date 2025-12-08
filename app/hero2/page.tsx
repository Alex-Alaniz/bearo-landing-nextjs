"use client";

import React, { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// --- ASSETS FROM YOUR DUMP ---
const ASSETS = {
  portalMask: "https://cash-f.squarecdn.com/web/marketing/9f08d4c9b2ac3153552bf9b8605afcb9b5af3d99/assets/images/home-fall-release-2025/portal1.png",
  video: "https://cash-f.squarecdn.com/web/marketing/9f08d4c9b2ac3153552bf9b8605afcb9b5af3d99/assets/images/home-fall-release-2025/videos/fall-release-hero-large-alpha.webm",
  poster: "https://cash-f.squarecdn.com/web/marketing/9f08d4c9b2ac3153552bf9b8605afcb9b5af3d99/assets/images/home-fall-release-2025/posters/hero-video-poster.webp"
};

export default function CashAppHero() {
  const containerRef = useRef(null);
  const stickyRef = useRef(null);
  const greenMaskRef = useRef(null);
  const contentRef = useRef(null);
  const videoRef = useRef(null);

  useGSAP(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: 1, // Smooth scrub like the original site
      },
    });

    // --- STEP 1: THE MASK SCALE ANIMATION ---
    // CSS Variable --mask-scale goes from ~8.5 down to 1
    // At 8.5, the "phone hole" is so big it's off screen, seeing only green.
    // At 1, the "phone hole" is exactly 337px x 724px.
    tl.fromTo(
      greenMaskRef.current,
      { "--mask-scale": 8.55 }, 
      { "--mask-scale": 1, ease: "power2.inOut", duration: 1 }
    );

    // --- STEP 2: CONTENT FADE OUT ---
    // The text fades out earlier than the mask finishes
    tl.to(contentRef.current, { opacity: 0, y: -50, duration: 0.3 }, 0);

    // --- STEP 3: VIDEO PARALLAX & OPACITY ---
    // The video moves slightly to create depth against the moving mask
    tl.fromTo(videoRef.current, 
      { y: 0, scale: 1.1 }, 
      { y: 50, scale: 1, duration: 1 }, 
      0
    );

    // --- STEP 4: HERO EXIT ---
    // Once mask is Scale 1 (perfectly framing video), the whole green layer fades out
    // allowing the next section (Cash App Green) to be visible.
    tl.to(stickyRef.current, { opacity: 0, duration: 0.2 }, 0.9);

  }, { scope: containerRef });

  return (
    <div className="bg-black text-white relative">
      
      {/* 
        SCROLL CONTAINER (The Track)
        Corresponds to: .home-fall-release-page_contentWrapper__Nswiu
        Height is set to 300vh to give us room to scroll through the animation.
      */}
      <div ref={containerRef} className="relative h-[300vh] w-full z-10">
        
        {/* 
          STICKY WRAPPER 
          Corresponds to: .home-fall-release-hero_homeFallReleaseHero__0nmLq
          This stays pinned while we animate the insides.
        */}
        <div 
          ref={stickyRef}
          className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center"
        >

          {/* 
            LAYER 1: THE VIDEO (Behind the mask)
            Corresponds to: .hero-video_heroVideo__MvFDU
          */}
          <div ref={videoRef} className="absolute inset-0 flex items-center justify-center z-0">
             <video 
              src={ASSETS.video} 
              poster={ASSETS.poster}
              autoPlay muted loop playsInline 
              className="h-[724px] w-[337px] object-cover" // Native size of the portal content
            />
          </div>

          {/* 
            LAYER 2: THE GREEN MASK (The Portal)
            Corresponds to: .home-fall-release-hero_background__UgCL0
            
            CRITICAL CSS LOGIC:
            We use the mask-size calc() exactly from your logs.
            When scale is huge, the image (phone frame) is blown up, filling screen with green.
            When scale is 1, it shrinks to the exact size of the video behind it.
          */}
          <div 
            ref={greenMaskRef}
            className="absolute inset-0 z-10 pointer-events-none"
            style={{
              backgroundColor: "#00E013", // The specific Cash App Green
              // The mask image is the "phone shape"
              maskImage: `url(${ASSETS.portalMask})`,
              WebkitMaskImage: `url(${ASSETS.portalMask})`,
              
              maskPosition: "center",
              WebkitMaskPosition: "center",
              
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
              
              // THE MAGIC FORMULA from your CSS dump
              // --mask-scale is updated by GSAP
              maskSize: "calc(var(--mask-scale) * 337px) calc(var(--mask-scale) * 724px)",
              WebkitMaskSize: "calc(var(--mask-scale) * 337px) calc(var(--mask-scale) * 724px)",
            }}
          />

          {/* 
            LAYER 3: TEXT CONTENT 
            Corresponds to: .home-fall-release-hero_content__ityFk
          */}
          <div 
            ref={contentRef}
            className="relative z-20 flex flex-col items-center text-center px-4 max-w-[800px]"
          >
            <h1 className="text-[12vw] md:text-[5rem] leading-[0.9] font-bold tracking-tighter mb-8 font-['Cash_Sans_Wide']">
              The way money<br />should work
            </h1>
            <p className="text-lg md:text-xl font-medium max-w-xl mb-8 leading-relaxed">
              From getting paid to growing what you’ve got, Cash App makes managing your money effortless and instant—without all the fees.
            </p>
            <a href="#" className="bg-white text-black px-8 py-4 rounded-full font-bold text-lg hover:opacity-90 transition-opacity">
              Get started
            </a>
          </div>

        </div>
      </div>

      {/* 
        NEXT SECTION 
        Corresponds to: .homepage-scroll-section... data-identifier="cash-app-green"
        This is what is revealed when the sticky header fades out at the end.
      */}
      <section className="relative z-0 min-h-screen bg-[#00E013] flex items-center justify-center -mt-[100vh]">
        <div className="text-center">
           <h2 className="text-black text-[5rem] font-bold tracking-tighter">
             Cash App Green
           </h2>
           {/* Placeholder for the phone grids */}
           <div className="mt-20 grid grid-cols-2 gap-8 max-w-4xl mx-auto px-4">
             <div className="h-[500px] bg-black/10 rounded-[32px] border border-black/5"></div>
             <div className="h-[500px] bg-black/10 rounded-[32px] border border-black/5 translate-y-24"></div>
           </div>
        </div>
      </section>

    </div>
  );
}