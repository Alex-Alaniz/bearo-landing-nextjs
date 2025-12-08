"use client";
import React, { useRef, useState } from 'react';
import './CashAppInvest.css';
import { useCashAppAnimations } from './hooks/useCashAppAnimations';
import { 
  EyeballIcon, MenuIcon, LogoIcon, ArrowIcon, 
  AppStoreIcon, GooglePlayIcon, TwitterIcon, InstagramIcon 
} from './components/Icons';

const CashAppInvest = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const timelineRef = useCashAppAnimations(containerRef);

  // Constants for colors
  const GREEN = '#00D54B';

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
        if (cutout) cutout.style.fill = GREEN;
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
    <div ref={containerRef}>
      <link rel="stylesheet" type="text/css" href="https://cash-f.squarecdn.com/ember/48e0bff4be493d4293e1a2dfa777c71ece92c0a0/assets/home-stocks.css" crossOrigin="anonymous" />

      <main>
        <header data-grid>
          <div data-logos>
            <a href="/" className="font-sans font-black text-lg shrink-0">
            BearoCoin
            </a>
          </div>
          
          <EyeballIcon />

          <div data-links>
            <a data-sign-in-link href="/account">Sign In</a>
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
          <img data-stairs alt="Stairs" src="https://cash-f.squarecdn.com/ember/48e0bff4be493d4293e1a2dfa777c71ece92c0a0/assets/images/marketing/home-stocks/stairs.png"/>
          <img data-cube alt="Cube" src="https://cash-f.squarecdn.com/ember/48e0bff4be493d4293e1a2dfa777c71ece92c0a0/assets/images/marketing/home-stocks/cube.png"/>
          <img data-blocks alt="Blocks" src="https://cash-f.squarecdn.com/ember/48e0bff4be493d4293e1a2dfa777c71ece92c0a0/assets/images/marketing/home-stocks/blocks.png"/>
          <img data-sphere alt="Sphere" src="https://cash-f.squarecdn.com/ember/48e0bff4be493d4293e1a2dfa777c71ece92c0a0/assets/images/marketing/home-stocks/sphere.png"/>
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
            <span data-word="now">Sign up</span>
            <span data-word="you">For</span>
            <span data-word="can">Waitlist</span>
            <span data-word="invest">Today</span>
            <br/><span data-word="with">with</span>
            <span data-word="cash">Bearo</span>
            <span data-word="app">Cash</span>
            <span data-word="dot">.</span>
          </p>
        </section>

        <footer data-grid>
          <a data-my-first href="/stocks">
            <ArrowIcon />
            <h3>Learn more with <br/>My First Stock</h3>
          </a>
          <div data-apps>
            <a href="https://itunes.apple.com/us/app/square-cash/id711923939?pt=302818&mt=8&ct=cash-web-home">
              <AppStoreIcon />
              <span>App Store</span>
            </a>
            <a href="https://play.google.com/store/apps/details?id=com.squareup.cash&utm_source=cash-web-home&utm_medium=web">
              <GooglePlayIcon />
              <span>Google Play</span>
            </a>
          </div>
          <div data-social>
            <a data-twitter href="https://twitter.com/cashapp">
              <TwitterIcon />
            </a>
            <a data-ig href="https://instagram.com/cashapp">
              <InstagramIcon />
            </a>
          </div>
          <p data-disclosure>Brokerage services by Cash App Investing LLC, member <a href="https://www.finra.org" target="_blank" rel="noreferrer">FINRA</a> / <a href="https://www.sipc.org/" target="_blank" rel="noreferrer">SIPC</a>. <br/>See our <a href="https://brokercheck.finra.org/firm/summary/144076" target="_blank" rel="noreferrer">BrokerCheck</a>. Investing involves risk; you may lose money.</p>
        </footer>

        <nav data-modal="menu">
          <ul>
            <li><a data-menu-stock-link href="/stocks">My First Stock</a></li>
            <li><a href="/account">Sign In</a></li>
            <li><a href="https://cash.app/legal/us/en-us/tos">Legal</a></li>
            <li><a href="https://squareup.com/legal/licenses">Licenses</a></li>
            <li><a href="/security">Security</a></li>
            <li><a href="/careers">Careers</a></li>
            <li><a href="/press">Press</a></li>
            <li><a href="/help">Support</a></li>
          </ul>
        </nav>
      </main>
    </div>
  );
};

export default CashAppInvest;
