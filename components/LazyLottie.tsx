"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

/**
 * Lottie heavy — dynamic-imported so it's never in the main bundle.
 * SSR-disabled because Lottie touches `window` during mount.
 */
const Lottie = dynamic(() => import("lottie-react"), {
  ssr: false,
  loading: () => null,
});

interface LazyLottieProps {
  /**
   * Either an imported animation data object OR a path under /public to fetch
   * on demand. Prefer a path for big animations so the JSON is never in the
   * main bundle and only downloads when the user scrolls to it.
   */
  src: string | object;

  /** Passed through to Lottie */
  loop?: boolean;
  autoplay?: boolean;
  style?: CSSProperties;
  className?: string;

  /**
   * If true (default), the animation will NOT load or play on mobile-width
   * screens. Set `playOnMobile={true}` to opt in for critical hero
   * animations. Most decorative Lotties should be desktop-only.
   */
  playOnMobile?: boolean;

  /**
   * If the viewport is below this CSS pixel width, treat as "mobile" for the
   * gating logic. Default 768 to match Tailwind's `md:` breakpoint.
   */
  mobileBreakpoint?: number;

  /**
   * Fallback rendered when:
   *  - Animation is still loading (IntersectionObserver hasn't fired)
   *  - User prefers reduced motion
   *  - We're on mobile and playOnMobile is false
   * Use a static poster <img> for the best LCP.
   */
  fallback?: ReactNode;

  /**
   * IntersectionObserver root margin — how early before scroll-in to start
   * loading. Default "200px" so the animation pre-warms a bit.
   */
  rootMargin?: string;
}

/**
 * Drop-in replacement for `<Lottie animationData={...} />` that:
 *  1. Dynamically imports `lottie-react` (not in main bundle)
 *  2. Skips entirely on mobile by default (biggest perf win)
 *  3. Respects `prefers-reduced-motion`
 *  4. Only mounts when scrolled into view (IntersectionObserver)
 *  5. Lazy-fetches JSON from a URL when `src` is a string path
 *
 * Before: every page load downloads and runs all Lottie animations.
 * After: zero Lottie on mobile, desktop-only and only when visible.
 */
export function LazyLottie({
  src,
  loop = true,
  autoplay = true,
  style,
  className,
  playOnMobile = false,
  mobileBreakpoint = 768,
  fallback = null,
  rootMargin = "200px",
}: LazyLottieProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [animationData, setAnimationData] = useState<object | null>(
    typeof src === "object" ? src : null,
  );
  const [shouldPlay, setShouldPlay] = useState(false);

  // Decide whether we should play based on viewport + reduced-motion.
  // This runs on the client only — the initial SSR render shows the fallback.
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const isMobile = window.innerWidth < mobileBreakpoint;

    if (prefersReducedMotion) {
      setShouldPlay(false);
      return;
    }

    if (isMobile && !playOnMobile) {
      setShouldPlay(false);
      return;
    }

    setShouldPlay(true);
  }, [mobileBreakpoint, playOnMobile]);

  // IntersectionObserver: only mount Lottie when scrolled into view
  useEffect(() => {
    if (!shouldPlay || !containerRef.current) return;
    if (inView) return; // already triggered

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin },
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [shouldPlay, inView, rootMargin]);

  // Fetch JSON on demand if `src` is a path string
  useEffect(() => {
    if (!inView) return;
    if (typeof src !== "string") return;
    if (animationData) return;

    let cancelled = false;
    fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error(`Lottie fetch failed: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setAnimationData(data);
      })
      .catch((err) => {
        console.warn("[LazyLottie] failed to load", src, err);
      });

    return () => {
      cancelled = true;
    };
  }, [inView, src, animationData]);

  const readyToPlay = shouldPlay && inView && animationData !== null;

  return (
    <div ref={containerRef} className={className} style={style}>
      {readyToPlay ? (
        <Lottie
          animationData={animationData}
          loop={loop}
          autoplay={autoplay}
          style={{ width: "100%", height: "100%" }}
        />
      ) : (
        fallback
      )}
    </div>
  );
}

export default LazyLottie;
