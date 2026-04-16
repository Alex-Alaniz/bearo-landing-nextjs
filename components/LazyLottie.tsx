"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

const Lottie = dynamic(() => import("lottie-react"), {
  ssr: false,
  loading: () => null,
});

interface LazyLottieProps {
  src: string | object;
  loop?: boolean;
  autoplay?: boolean;
  style?: CSSProperties;
  className?: string;
  playOnMobile?: boolean;
  mobileBreakpoint?: number;
  fallback?: ReactNode;
  rootMargin?: string;
  /**
   * Override the SVG viewBox after Lottie mounts. Fixes animations whose
   * content extends outside the declared canvas (e.g. negative coordinates).
   * Format: "minX minY width height"
   */
  viewBox?: string;
}

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
  viewBox,
}: LazyLottieProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [animationData, setAnimationData] = useState<object | null>(
    typeof src === "object" ? src : null,
  );
  const [shouldPlay, setShouldPlay] = useState(false);

  // When a custom viewBox is specified, patch the SVG + clipPath after mount
  const onDOMLoaded = useCallback(() => {
    if (!viewBox || !containerRef.current) return;
    const svg = containerRef.current.querySelector("svg");
    if (!svg) return;
    svg.setAttribute("viewBox", viewBox);
    const parts = viewBox.split(/\s+/).map(Number);
    if (parts.length === 4) {
      const clipRect = svg.querySelector("clipPath rect");
      if (clipRect) {
        clipRect.setAttribute("x", String(parts[0]));
        clipRect.setAttribute("y", String(parts[1]));
        clipRect.setAttribute("width", String(parts[2]));
        clipRect.setAttribute("height", String(parts[3]));
      }
    }
  }, [viewBox]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const isMobile = window.innerWidth < mobileBreakpoint;
    if (prefersReducedMotion) { setShouldPlay(false); return; }
    if (isMobile && !playOnMobile) { setShouldPlay(false); return; }
    setShouldPlay(true);
  }, [mobileBreakpoint, playOnMobile]);

  useEffect(() => {
    if (!shouldPlay || !containerRef.current) return;
    if (inView) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) { setInView(true); observer.disconnect(); }
        });
      },
      { rootMargin },
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [shouldPlay, inView, rootMargin]);

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
      .then((data) => { if (!cancelled) setAnimationData(data); })
      .catch((err) => { console.warn("[LazyLottie] failed to load", src, err); });
    return () => { cancelled = true; };
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
          onDOMLoaded={onDOMLoaded}
        />
      ) : (
        fallback
      )}
    </div>
  );
}

export default LazyLottie;
