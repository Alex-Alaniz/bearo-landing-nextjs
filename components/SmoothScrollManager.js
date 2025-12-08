// components/SmoothScrollManager.js
import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { disablePageScroll, enablePageScroll } from 'scroll-lock';

gsap.registerPlugin(ScrollToPlugin);

// --- Configuration ---
const SCROLL_CONFIG = {
  scrollDuration: 1.2,
  scrollEase: 'power3.inOut',
  minScrollDuration: 0.8,
  maxScrollDuration: 2.0,
};

// --- Custom Hook (Replaces react-use) ---
function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Check purely on client side
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    
    const listener = () => setMatches(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  return matches;
}

// --- Main Component ---
function SmoothScrollManager({ children, onSectionChange }) {
  const containerRef = useRef(null);
  const sectionsRef = useRef([]);
  const currentSectionIndexRef = useRef(0);
  const isScrollingRef = useRef(false);
  const scrollEnabledRef = useRef(false);

  // Use the custom hook defined above
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const gatherSections = useCallback(() => {
    if (containerRef.current) {
      sectionsRef.current = Array.from(
        containerRef.current.querySelectorAll('[data-scroll-section]')
      );
    }
  }, []);

  const scrollToSection = useCallback((sectionIndex) => {
    const sections = sectionsRef.current;
    
    if (sectionIndex < 0 || 
        sectionIndex >= sections.length || 
        isScrollingRef.current || 
        !containerRef.current) {
      return;
    }

    if (onSectionChange) {
        onSectionChange(currentSectionIndexRef.current, sectionIndex);
    }

    isScrollingRef.current = true;
    const targetSection = sections[sectionIndex];

    const currentScrollTop = containerRef.current.scrollTop;
    const distanceInViewports = Math.abs(targetSection.offsetTop - currentScrollTop) / 
                                containerRef.current.clientHeight;
    
    const duration = Math.max(
        SCROLL_CONFIG.minScrollDuration,
        Math.min(SCROLL_CONFIG.maxScrollDuration, 
                 SCROLL_CONFIG.scrollDuration * distanceInViewports)
    );

    gsap.to(containerRef.current, {
      scrollTo: { y: targetSection.offsetTop, autoKill: false },
      duration: duration,
      ease: SCROLL_CONFIG.scrollEase,
      overwrite: 'auto',
      onComplete: () => {
        currentSectionIndexRef.current = sectionIndex;
        isScrollingRef.current = false;
      }
    });
  }, [onSectionChange]);

  const handleWheel = useCallback((event) => {
    if (!scrollEnabledRef.current || isScrollingRef.current) return;
    event.preventDefault();

    if (Math.abs(event.deltaY) <= 10) return;

    const direction = event.deltaY > 0 ? 1 : -1;
    const targetIndex = currentSectionIndexRef.current + direction;

    if (targetIndex >= 0 && targetIndex < sectionsRef.current.length) {
      scrollToSection(targetIndex);
    }
  }, [scrollToSection]);

  const handleKeyDown = useCallback((event) => {
    if (isScrollingRef.current) return;
    if (event.key === 'ArrowDown' || event.key === 'PageDown') {
        event.preventDefault();
        scrollToSection(currentSectionIndexRef.current + 1);
    } else if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        event.preventDefault();
        scrollToSection(currentSectionIndexRef.current - 1);
    }
  }, [scrollToSection]);

  useEffect(() => {
    if (!containerRef.current || !isDesktop) {
      enablePageScroll();
      return;
    }

    disablePageScroll();
    const container = containerRef.current;
    
    container.scrollTop = 0; 
    currentSectionIndexRef.current = 0;
    
    gatherSections();

    container.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    setTimeout(() => { scrollEnabledRef.current = true; }, 100);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      enablePageScroll();
    };
  }, [gatherSections, handleKeyDown, handleWheel, isDesktop]);

  return (
    <div 
      className="h-screen w-full overflow-hidden bg-black"
      ref={containerRef}
    >
      {children}
    </div>
  );
}

export default SmoothScrollManager;