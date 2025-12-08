"use client";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const ASSETS = {
  // Using the exact assets from your logs
  maskImage: "https://cash-f.squarecdn.com/web/marketing/9f08d4c9b2ac3153552bf9b8605afcb9b5af3d99/assets/images/home-fall-release-2025/portal1.png",
  video: "https://cash-f.squarecdn.com/web/marketing/9f08d4c9b2ac3153552bf9b8605afcb9b5af3d99/assets/images/home-fall-release-2025/videos/fall-release-hero-large-alpha.webm",
};

export default function HeroSection() {
  const containerRef = useRef(null);
  const maskRef = useRef(null);
  const contentRef = useRef(null);
  const bgRef = useRef(null);

  useGSAP(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "+=200%", // The animation lasts for 2 screen heights
        scrub: 0.5,    // Smooth scrubbing (lag) like the logs show
        pin: true,     // Pin the content while animating
      },
    });

    // --- REVERSE ENGINEERED LOGIC ---
    
    // 1. Shrink Mask: 8.55 -> 1
    // The CSS variable --mask-scale is updated by GSAP
    tl.to(maskRef.current, {
      "--mask-scale": 1, 
      ease: "power2.inOut", // Matches the curve in your logs
      duration: 1
    }, 0);

    // 2. Parallax Background: 0% -> 20%
    tl.to(bgRef.current, {
      y: "20%",
      ease: "none",
      duration: 1
    }, 0);

    // 3. Fade out Text Content halfway through
    tl.to(contentRef.current, {
      opacity: 0,
      y: -50,
      duration: 0.4
    }, 0);

    // 4. Fade out the Green Background at the very end
    // This reveals the next section underneath
    tl.to(maskRef.current, {
      opacity: 0,
      duration: 0.2
    }, 0.8);

  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="h-screen w-full relative overflow-hidden bg-black">
      
      {/* 
        THE GREEN MASK LAYER 
        We use CSS variables for performance, just like the logs.
      */}
      <div 
        ref={maskRef}
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          "--mask-scale": 8.55, // Initial scale from logs
          "--mask-image": `url(${ASSETS.maskImage})`,
          backgroundColor: "rgb(0, 224, 19)", // Cash App Green
        }}
      >
        <div 
          ref={bgRef}
          className="w-full h-full"
          style={{
            maskImage: "var(--mask-image)",
            WebkitMaskImage: "var(--mask-image)",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
            maskPosition: "center",
            WebkitMaskPosition: "center",
            // The Logic: Scale * Native Image Dimensions (337x724)
            maskSize: "calc(var(--mask-scale) * 337px) calc(var(--mask-scale) * 724px)",
            WebkitMaskSize: "calc(var(--mask-scale) * 337px) calc(var(--mask-scale) * 724px)",
          }}
        />
      </div>

      {/* THE CONTENT INSIDE THE PORTAL (Video) */}
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        {/* The video sits physically behind the mask hole */}
        <div className="w-[337px] h-[724px] relative rounded-[40px] overflow-hidden bg-gray-900">
           <video 
             src={ASSETS.video} 
             autoPlay muted loop playsInline 
             className="w-full h-full object-cover"
           />
        </div>
      </div>

      {/* THE TEXT OVERLAY */}
      <div 
        ref={contentRef}
        className="absolute inset-0 z-30 flex flex-col items-center justify-center text-center text-white p-4"
      >
        <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-6">
          The way money<br />should work
        </h1>
        <p className="text-xl md:text-2xl max-w-xl opacity-90 mb-8">
          Cash App makes managing your money effortless and instant.
        </p>
        <button className="bg-white text-black px-8 py-3 rounded-full font-bold text-lg hover:bg-gray-200 transition-colors">
          Get Started
        </button>
      </div>

    </div>
  );
}