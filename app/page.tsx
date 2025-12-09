"use client";
import React, { useRef, useState, useEffect } from 'react';
import './CashAppInvest.css';
import { useCashAppAnimations } from '../hooks/useCashAppAnimations';
import {
  EyeballIcon, MenuIcon, LogoIcon, ArrowIcon,
  AppStoreIcon, GooglePlayIcon, TwitterIcon, InstagramIcon
} from '../components/Icons';
import { BearoContent } from '../components/BearoContent';
import { LiveWaitlistCounter } from '../components/LiveWaitlistCounter';
import { StablecoinExplorer } from '../components/StablecoinExplorer';

const CashAppInvest = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showWidgets, setShowWidgets] = useState(false);
  const timelineRef = useCashAppAnimations(containerRef);

  // Constants for colors
  const BRAND_COLOR = '#f97316';

  // Track if animation is paused due to scroll
  const [isPausedByScroll, setIsPausedByScroll] = useState(false);

  // Scroll detection to pause/resume animation and show widgets
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const vh = window.innerHeight;

      // When user scrolls past the animated section, pause the animation
      if (scrollY > vh * 0.5) {
        if (timelineRef.current && !isPausedByScroll) {
          timelineRef.current.pause();
          setIsPausedByScroll(true);
        }
      } else {
        // When user scrolls back up to Jonathan's section, resume the animation
        if (timelineRef.current && isPausedByScroll) {
          timelineRef.current.play();
          setIsPausedByScroll(false);
        }
      }

      // Show floating widgets only when user has scrolled to Bearo section
      setShowWidgets(scrollY > vh * 0.8);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [timelineRef, isPausedByScroll]);

  // Scroll down handler
  const handleScrollDown = () => {
    window.scrollTo({
      top: window.innerHeight,
      behavior: 'smooth'
    });
  };

  // Scroll to waitlist signup section
  const handleScrollToWaitlist = () => {
    const waitlistSection = document.getElementById('waitlist-signup');
    if (waitlistSection) {
      waitlistSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      // Fallback - scroll past Jonathan's section first, then find the element
      window.scrollTo({
        top: window.innerHeight,
        behavior: 'smooth'
      });
      setTimeout(() => {
        const el = document.getElementById('waitlist-signup');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500);
    }
  };

  // Menu Handling
  const toggleMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const newMenuState = !isMenuOpen;
    setIsMenuOpen(newMenuState);

    const modal = containerRef.current.querySelector('[data-modal]') as HTMLElement;
    const menuLink = containerRef.current.querySelector('[data-menu-link]') as HTMLElement;
    const logos = containerRef.current.querySelector('[data-logos]') as HTMLElement;
    const jewel = containerRef.current.querySelector('[data-jewel]') as HTMLElement;
    const cutout = containerRef.current.querySelector('[data-cutout]') as HTMLElement;
    const signInLink = containerRef.current.querySelector('[data-sign-in-link]') as HTMLElement;
    const myFirstLink = containerRef.current.querySelector('[data-my-first]') as HTMLElement;
    const appLinks = containerRef.current.querySelector('[data-apps]') as HTMLElement;
    const socialLinks = containerRef.current.querySelector('[data-social]') as HTMLElement;
    const disclosures = containerRef.current.querySelectorAll('[data-disclosure]');

    // Imperative style changes to match original script behavior
    if (newMenuState) {
        if (modal) modal.style.visibility = 'visible';
        if (menuLink) menuLink.style.transform = 'rotate(90deg)';
        if (timelineRef.current) timelineRef.current.pause();

        if (logos && logos.querySelector('a')) logos.querySelector('a')!.style.color = 'white';
        if (jewel) jewel.style.fill = 'white';
        if (cutout) cutout.style.fill = BRAND_COLOR;
        if (menuLink) menuLink.style.color = 'white';
        if (signInLink) signInLink.style.color = 'white';
        if (myFirstLink) myFirstLink.style.color = 'white';
        if (appLinks) {
            appLinks.querySelectorAll('a').forEach((link: any) => {
                link.style.color = 'white';
                link.style.borderColor = 'white';
                link.querySelector('svg').style.color = 'white';
            });
        }
        if (socialLinks) socialLinks.querySelectorAll('a').forEach((link: any) => link.style.color = 'white');
        if (disclosures) disclosures.forEach((link: any) => link.style.color = 'white');
    } else {
        if (modal) modal.style.visibility = 'hidden';
        if (menuLink) menuLink.style.transform = '';

        // When closing, restart the timeline from roughly where it was or reset visible sections
        const sections = containerRef.current.querySelectorAll('section');
        sections.forEach((s: any) => s.style.visibility = 'hidden');
        if (timelineRef.current) timelineRef.current.restart();
    }
  };

  return (
    <div className="landing-page-wrapper">
      {/* Jonathan's Animated Landing - Scoped to .cash-app-animation class */}
      <div ref={containerRef} className="cash-app-animation">
        <main>
          <header data-grid>
            <div data-logos>
              <a href="/" className="font-sans font-black text-lg shrink-0">
              Bearo
              </a>
            </div>

            <EyeballIcon />

            <div data-links>
              <a data-menu-link href="#" onClick={toggleMenu}>
                <MenuIcon />
              </a>
            </div>
          </header>

          <section data-chapter="loader" style={{height: 'var(--vh)', zIndex: 5}}>
            <LogoIcon />
          </section>

          <section data-chapter="now">
            <span data-character="n">BE</span>
            <span data-character="o">AR</span>
            <span data-character="w">O</span>
            <div data-background></div>
          </section>

          <section data-chapter="you">
            <span data-character="y">PAY</span>
            <span data-character="o">ME</span>
            <span data-character="u">NTS</span>
            <img data-stairs alt="Stairs" src="/stairs.png"/>
            <img data-cube alt="Cube" src="/cube.png"/>
            <img data-blocks alt="Blocks" src="/blocks.png"/>
            <img data-sphere alt="Sphere" src="/sphere.png"/>
          </section>

          <section data-chapter="can">
            <span data-character="c">A</span>
            <span data-character="a">P</span>
            <span data-character="n">P</span>
            <div data-circle></div>
          </section>

          <section data-chapter="invest">
            <figure data-group>
              {['w','a','l','l','e','t'].map((char, index) => (
                <figcaption key={`${char}-${index}`} data-characters={char}>
                  {Array(13).fill(char.toUpperCase()).map((c, i) => (
                    <span key={i} data-character={char}>{c}</span>
                  ))}
                </figcaption>
              ))}
            </figure>
          </section>

          <section data-chapter="cta">
            <p data-words>
              <span data-word="now">Sign up</span>{' '}
              <span data-word="you">for</span>{' '}
              <span data-word="can">Waitlist</span>{' '}
              <span data-word="invest">Today</span>
              <br/><span data-word="with">with</span>{' '}
              <span data-word="cash">Bearo</span>{' '}
              <span data-word="app">Cash</span>
              <span data-word="dot">.</span>
            </p>
          </section>

          <footer data-grid>
            <a data-my-first href="#waitlist-signup" onClick={(e) => { e.preventDefault(); handleScrollToWaitlist(); }}>
              <ArrowIcon />
              <h3>Send money instantly<br/>with crypto rails</h3>
            </a>
            <div data-apps>
              <a href="">
                <AppStoreIcon />
                <span>App Store</span>
              </a>
              <a href="">
                <GooglePlayIcon />
                <span>Google Play</span>
              </a>
            </div>
            <div data-social>
              <a data-twitter href="https://x.com/BearifiedCo">
                <TwitterIcon />
              </a>
              <a data-ig href="">
                <InstagramIcon />
              </a>
            </div>
            <p data-disclosure>BearifiedCo LLC. Crypto payments made simple.</p>
          </footer>

          <nav data-modal="menu">
            <ul>
              <li><a href="/">Sign In</a></li>
              <li><a href="/">Legal</a></li>
              <li><a href="/">Security</a></li>
              <li><a href="/">Careers</a></li>
              <li><a href="/">Press</a></li>
              <li><a href="/">Support</a></li>
            </ul>
          </nav>
        </main>
      </div>

      {/* Bearo Content - Appears when user scrolls down */}
      <div id="bearo-content">
        <BearoContent />
      </div>

      {/* Floating Widgets - Only visible when scrolled to Bearo section */}
      {showWidgets && (
        <>
          <LiveWaitlistCounter />
          <StablecoinExplorer />
        </>
      )}
    </div>
  );
};

export default CashAppInvest;
