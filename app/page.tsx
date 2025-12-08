"use client";
import React, { useEffect, useRef, useState } from 'react';
import { createTimeline, cubicBezier, utils, animate } from 'animejs';
import './CashAppInvest.css'; // You need to save the CSS from the HTML link provided below

const CashAppInvest = () => {
  const containerRef = useRef(null);
  const timelineRef = useRef(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Constants for colors
  const GREEN = '#00D54B';

  useEffect(() => {
    // 1. Setup Viewport CSS Variables
    const setViewPort = () => {
      const vh = window.innerHeight;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    const computeMaskSize = () => {
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const radius = Math.sqrt(vh * vh + vw * vw);
      document.documentElement.style.setProperty('--ms', `${radius}px`);
    };

    setViewPort();
    computeMaskSize();

    window.addEventListener('resize', () => {
      setViewPort();
      computeMaskSize();
    });

    // 2. Select Elements Helper (scoped to this component)
    const $ = (selector) => {
      // Handle the modal separately as it might be outside main flow in some app structures, 
      // but here we assume it's in container.
      return containerRef.current.querySelector(selector);
    };
    const $$ = (selector) => containerRef.current.querySelectorAll(selector);

    // Elements
    const loader = $('[data-chapter="loader"]');
    const sections = $$('section');
    const now = $('[data-chapter="now"]');
    const you = $('[data-chapter="you"]');
    const can = $('[data-chapter="can"]');
    const invest = $('[data-chapter="invest"]');
    const cta = $('[data-chapter="cta"]');
    
    // Logo elements for color changing
    const logoLink = $('[data-logos] a');
    const jewel = $('[data-jewel]');
    const cutout = $('[data-cutout]');
    const menuLink = $('[data-menu-link]');
    const signInLink = $('[data-sign-in-link]');
    const myFirstLink = $('[data-my-first]');
    const appLinks = $('[data-apps]');
    const socialLinks = $('[data-social]');
    const disclosures = $$('[data-disclosure]');

    // 3. Independent Eyeball Animation
    const animateEyeball = () => {
      const mask = $$('#clip-path, #outer-lid');
      const eyeBall = $('#moving');
      const iris = $('#pupil');

      // Mask Timeline
      createTimeline({ loop: true })
        .add(mask, {
          scaleY: [
            { to: 1, duration: 300 }, { to: 0.86, duration: 300 }, 
            { to: 0.9, duration: 300 }, { to: 0.86, duration: 300 }, 
            { to: 0.86, duration: 1000 }, { to: 0.8, duration: 300 }, 
            { to: 0.9, duration: 300 }, { to: 0.4, duration: 200 }, 
            { to: 0.9, duration: 200 }, { to: 0.9, duration: 200 }, 
            { to: 0.84, duration: 200 }, { to: 0.02, duration: 200 }, 
            { to: 0.9, duration: 200 }, { to: 0.9, duration: 100 }, 
            { to: 0.01, duration: 200 }, { to: 1, duration: 200 }, 
            { to: 1, duration: 800 }
          ],
          ease: 'cubicBezier(0.25, 0.1, 0.25, 1)'
        });

      // Eyeball Movement
      createTimeline({ loop: true })
        .add(eyeBall, {
          x: [
            { to: '0%', duration: 1000 }, { to: '22%', duration: 300 }, { to: '22%', duration: 1000 }, 
            { to: '11%', duration: 300 }, { to: '11%', duration: 1400 }, { to: '22%', duration: 300 }, 
            { to: '22%', duration: 1000 }, { to: '-28%', duration: 300 }, { to: '-4%', duration: 300 }, 
            { to: '1%', duration: 300 }, { to: '1%', duration: 500 }, { to: '-23%', duration: 300 }, 
            { to: '-30%', duration: 300 }, { to: '-26%', duration: 300 }, { to: '-26%', duration: 1000 }, 
            { to: '20%', duration: 300 }, { to: '10%', duration: 300 }, { to: '10%', duration: 1000 }, 
            { to: '8%', duration: 300 }, { to: '8%', duration: 1000 }, { to: '-5%', duration: 300 }, 
            { to: '0%', duration: 300 }, { to: '0%', duration: 1000 }, { to: '-7%', duration: 300 }, 
            { to: '1%', duration: 300 }, { to: '1%', duration: 1000 }, { to: '17%', duration: 300 }, 
            { to: '17%', duration: 300 }, { to: '0%', duration: 300 }
          ],
          y: [
            { to: '0%', duration: 1000 }, { to: '4%', duration: 300 }, { to: '4%', duration: 1000 }, 
            { to: '4.8%', duration: 300 }, { to: '4.8%', duration: 1400 }, { to: '20%', duration: 300 }, 
            { to: '20%', duration: 1000 }, { to: '20%', duration: 300 }, { to: '12%', duration: 300 }, 
            { to: '10%', duration: 300 }, { to: '10%', duration: 500 }, { to: '-20%', duration: 300 }, 
            { to: '-18%', duration: 300 }, { to: '-20%', duration: 300 }, { to: '-20%', duration: 1000 }, 
            { to: '7%', duration: 300 }, { to: '7%', duration: 1000 }, { to: '28%', duration: 300 }, 
            { to: '28%', duration: 300 }, { to: '28%', duration: 1000 }, { to: '33%', duration: 300 }, 
            { to: '33%', duration: 300 }, { to: '33%', duration: 1000 }, { to: '13%', duration: 300 }, 
            { to: '13%', duration: 300 }, { to: '0%', duration: 300 }
          ],
          ease: 'cubicBezier(0.25, 0.1, 0.25, 1)'
        });

      // Iris Scaling
      createTimeline({ loop: true })
        .add(iris, {
          scale: [
            { to: '1', duration: 2000 }, { to: '1.1', duration: 600 }, { to: '1.1', duration: 1000 }, 
            { to: '1', duration: 600 }, { to: '1', duration: 2000 }, { to: '0.8', duration: 600 }, 
            { to: '0.8', duration: 1000 }, { to: '1', duration: 600 }
          ],
          ease: 'cubicBezier(0.41, 0.15, 0, 1)'
        });
    };

    // 4. Main Timeline Logic
    const initMasterAnimation = () => {
      if (loader) loader.remove();
      
      const tl = createTimeline({
        defaults: { ease: cubicBezier(0.5, 0.24, 0.17, 0.97) },
        onComplete: () => {
            // Hide all sections then restart
            sections.forEach(s => s.style.visibility = 'hidden');
            tl.restart();
        }
      });

      timelineRef.current = tl;

      // --- NOW Section ---
      tl.add(now.querySelector('[data-character="n"]'), {
        y: ['70%', 0],
        ease: cubicBezier(0, 0.43, 0, 0.98),
        duration: 1600,
        onBegin: () => {
            now.style.visibility = 'visible';
            logoLink.style.color = 'white';
            jewel.style.fill = GREEN;
            cutout.style.fill = 'white';
            menuLink.style.color = 'white';
            signInLink.style.color = 'white';
            myFirstLink.style.color = 'white';
            appLinks.querySelectorAll('a').forEach(link => {
                link.style.color = 'white';
                link.querySelector('svg').style.color = 'white';
            });
            socialLinks.querySelectorAll('a').forEach(link => link.style.color = 'white');
            disclosures.forEach(d => d.style.color = 'white');
        }
      }, 0);

      tl.add(now.querySelector('[data-character="o"]'), {
        scale: [1.3, 1],
        ease: cubicBezier(0, 0.84, 0.14, 0.99),
        duration: 1400
      }, 0);

      tl.add(now.querySelector('[data-character="w"]'), {
        y: ['-62%', 0],
        ease: cubicBezier(0, 0.43, 0, 0.98),
        duration: 1700
      }, 0);

      tl.add(now.querySelector('[data-background]'), {
        rotate: ['-22deg', '20deg'],
        ease: 'linear',
        duration: 2000
      }, 0);

      // --- YOU Section ---
      const youStartTime = 800;
      
      tl.add(you.querySelector('[data-character="y"]'), {
        y: [0, '-50%'],
        ease: cubicBezier(0, 0.56, 0.1, 0.98),
        duration: 1300,
        onBegin: () => {
            you.style.visibility = 'visible';
            now.style.visibility = 'hidden';
            logoLink.style.color = 'black';
            menuLink.style.color = 'black';
            signInLink.style.color = 'black';
            myFirstLink.style.color = 'black';
            appLinks.querySelectorAll('a').forEach(link => {
              link.style.color = 'black';
              link.style.borderColor = 'black';
              link.querySelector('svg').style.color = GREEN;
            });
            socialLinks.querySelectorAll('a').forEach(link => link.style.color = 'black');
            disclosures.forEach(link => link.style.color = 'black');
        }
      }, youStartTime);

      tl.add(you.querySelector('[data-character="o"]'), {
        scale: [0.7, 1],
        ease: cubicBezier(0, 0.64, 0.25, 1),
        duration: 1300
      }, youStartTime);

      tl.add(you.querySelector('[data-character="u"]'), {
        y: [0, '57%'],
        ease: cubicBezier(0, 0.56, 0.1, 0.98),
        duration: 1300
      }, youStartTime);

      // Helper for complex rotates in v4 array syntax
      const blockRotate = [{ from: -30, to: 0 }];
      const stairsRotate = [{ from: 30, to: 0 }];
      const cubeRotate = [{ from: -40, to: 0 }];
      
      tl.add(you.querySelector('[data-blocks]'), {
        x: ['-50%', '-100%'],
        y: ['50%', '100%'],
        rotate: blockRotate,
        ease: cubicBezier(0, 0.74, 0.11, 1),
        duration: 1300
      }, youStartTime);

      tl.add(you.querySelector('[data-stairs]'), {
        x: ['70%', '100%'],
        y: ['-50%', '-100%'],
        rotate: stairsRotate,
        ease: cubicBezier(0, 0.74, 0.11, 1),
        duration: 1300
      }, youStartTime);

      tl.add(you.querySelector('[data-cube]'), {
        x: ['-100%', '-175%'],
        y: ['-100%', '-250%'],
        rotate: cubeRotate,
        ease: cubicBezier(0, 0.74, 0.11, 1),
        duration: 1300
      }, youStartTime);

      tl.add(you.querySelector('[data-sphere]'), {
        x: ['100%', '250%'],
        y: ['100%', '270%'],
        rotate: cubeRotate,
        ease: cubicBezier(0, 0.74, 0.11, 1),
        duration: 1300
      }, youStartTime);

      // --- CAN Section ---
      const canStartTime = 1600;

      tl.add(can.querySelector('[data-character="c"]'), {
        x: ['76%', 0],
        rotate: [30, 0],
        scale: [0.7, 1],
        opacity: [0, 1],
        ease: cubicBezier(0, 0.96, 0.06, 0.98),
        duration: 1200,
        onBegin: () => {
            can.style.visibility = 'visible';
            logoLink.style.color = 'white';
            jewel.style.fill = 'white';
            cutout.style.fill = GREEN;
            menuLink.style.color = 'white';
            signInLink.style.color = 'white';
            myFirstLink.style.color = 'white';
            appLinks.querySelectorAll('a').forEach(link => {
                link.style.color = 'white';
                link.style.borderColor = 'white';
                link.querySelector('svg').style.color = 'white';
            });
            socialLinks.querySelectorAll('a').forEach(link => link.style.color = 'white');
            disclosures.forEach(link => link.style.color = 'white');
        }
      }, canStartTime);

      tl.add(can.querySelector('[data-character="a"]'), {
        rotate: [20, 0],
        scale: [0.7, 1],
        opacity: [0, 1],
        ease: cubicBezier(0, 0.56, 0.1, 0.98),
        duration: 1200
      }, canStartTime);

      tl.add(can.querySelector('[data-character="n"]'), {
        x: ['-80%', 0],
        rotate: [-30, 0],
        scale: [0.7, 1],
        opacity: [0, 1],
        ease: cubicBezier(0, 0.56, 0.1, 0.98),
        duration: 1200
      }, canStartTime);

      tl.add(can.querySelector('[data-circle]'), {
        x: ['-50%', '-50%'],
        y: ['-50%', '-50%'],
        scale: [0, 1],
        opacity: [{ from: 0, to: 1, duration: 100, ease: cubicBezier(0.25, 0.1, 0.25, 1) }],
        ease: cubicBezier(0, 0.25, 0.04, 0.99),
        duration: 1000
      }, canStartTime);

      // --- INVEST Section ---
      const investStartTime = 2400;

      tl.add(invest.querySelector('[data-group]'), {
        rotate: [25, 0],
        scale: [1.5, 1],
        ease: cubicBezier(0.03, 0.49, 0.12, 0.98),
        y: [{
            from: '-15%', to: 0,
            duration: 1300,
            delay: 300,
            ease: cubicBezier(0.21, 0.02, 1, 1)
        }],
        duration: 1300,
        onBegin: () => {
            invest.style.visibility = 'visible';
            can.style.visibility = 'hidden';
        }
      }, investStartTime);

      // Helper for invest chars
      const investEase = cubicBezier(0.16, 0.47, 0.15, 0.98);
      const investDuration = 1500;

      tl.add(invest.querySelector('[data-characters="i"]'), {
        y: ['-30%', 0],
        ease: investEase,
        duration: investDuration
      }, investStartTime);
      tl.add(invest.querySelector('[data-characters="n"]'), {
        y: ['10%', 0],
        ease: investEase,
        duration: investDuration
      }, investStartTime);
      tl.add(invest.querySelector('[data-characters="v"]'), {
        y: ['-10%', 0],
        ease: investEase,
        duration: investDuration
      }, investStartTime);
      tl.add(invest.querySelector('[data-characters="e"]'), {
        y: ['15%', 0],
        ease: investEase,
        duration: investDuration
      }, investStartTime);
      tl.add(invest.querySelector('[data-characters="s"]'), {
        y: ['-15%', 0],
        ease: investEase,
        duration: investDuration
      }, investStartTime);
      tl.add(invest.querySelector('[data-characters="t"]'), {
        y: ['-12%', 0],
        ease: investEase,
        duration: investDuration
      }, investStartTime);


      // --- CTA Section ---
      const ctaStartTime = 3800;
      const ctaEase = cubicBezier(0, 0.99, 0.15, 0.99);

      tl.add(cta.querySelector('[data-words]'), {
        scale: [{ from: 1.3, to: 1, duration: 1000, ease: ctaEase }],
        opacity: [{ from: 0, to: 1, delay: 50, duration: 100 }],
        onBegin: () => {
            cta.style.visibility = 'visible';
            invest.style.visibility = 'hidden';
            myFirstLink.style.color = 'white';
            appLinks.querySelectorAll('a').forEach(link => {
              link.style.color = 'white';
              link.style.borderColor = 'white';
              link.querySelector('svg').style.color = 'white';
            });
            disclosures.forEach(link => link.style.color = 'white');
        }
      }, ctaStartTime);

      const words = {
          now: '-120%', you: '-50%', can: '50%', invest: '120%', 
          with: '-100%', cash: '50%', app: '100%', dot: '350%'
      };

      Object.keys(words).forEach(word => {
          tl.add(cta.querySelector(`[data-word="${word}"]`), {
              x: [words[word], '0%'],
              ease: ctaEase,
              duration: 1000
          }, ctaStartTime);
      });

      // Pad the end
      tl.add(cta, { duration: 1500 });
    };

    // Run animations after a brief delay
    setTimeout(() => {
        animateEyeball();
        initMasterAnimation();
    }, 100);

    return () => {
        // Cleanup logic if needed
        if(timelineRef.current) timelineRef.current.pause();
    }
  }, []);

  // Menu Handling
  const toggleMenu = (e) => {
    e.preventDefault();
    const newMenuState = !isMenuOpen;
    setIsMenuOpen(newMenuState);

    const modal = containerRef.current.querySelector('[data-modal]');
    const menuLink = containerRef.current.querySelector('[data-menu-link]');
    const logos = containerRef.current.querySelector('[data-logos]');
    const jewel = containerRef.current.querySelector('[data-jewel]');
    const cutout = containerRef.current.querySelector('[data-cutout]');
    const signInLink = containerRef.current.querySelector('[data-sign-in-link]');
    const myFirstLink = containerRef.current.querySelector('[data-my-first]');
    const appLinks = containerRef.current.querySelector('[data-apps]');
    const socialLinks = containerRef.current.querySelector('[data-social]');
    const disclosures = containerRef.current.querySelectorAll('[data-disclosure]');
    
    // Imperative style changes to match original script behavior
    if (newMenuState) {
        modal.style.visibility = 'visible';
        menuLink.style.transform = 'rotate(90deg)';
        if(timelineRef.current) timelineRef.current.pause();

        logos.querySelector('a').style.color = 'white';
        jewel.style.fill = 'white';
        cutout.style.fill = GREEN;
        menuLink.style.color = 'white';
        signInLink.style.color = 'white';
        myFirstLink.style.color = 'white';
        appLinks.querySelectorAll('a').forEach(link => {
            link.style.color = 'white';
            link.style.borderColor = 'white';
            link.querySelector('svg').style.color = 'white';
        });
        socialLinks.querySelectorAll('a').forEach(link => link.style.color = 'white');
        disclosures.forEach(link => link.style.color = 'white');
    } else {
        modal.style.visibility = 'hidden';
        menuLink.style.transform = '';
        
        // When closing, restart the timeline from roughly where it was or reset visible sections
        // The original script actually hides all sections and restarts the timeline from scratch on close
        // "resetMasterTimeline" function logic from original script:
        const sections = containerRef.current.querySelectorAll('section');
        sections.forEach(s => s.style.visibility = 'hidden');
        if(timelineRef.current) timelineRef.current.restart();
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
          
          <svg data-eyeball xmlns="http://www.w3.org/2000/svg" viewBox="0 0 232.93 133.02">
             <defs>
                 <clipPath id="clip-path" style={{transform: 'scaleY(0.897166)'}}>
                    <path id="mask" fill="none" clipRule="evenodd" d="M221.93,63.72C211.59,53.58,168.3,14.4,116.46,14.4S21.34,53.57,11,63.72a3.33,3.33,0,0,0,0,4.75c10.34,10.15,53.63,49.32,105.46,49.32s95.13-39.18,105.47-49.32A3.33,3.33,0,0,0,221.93,63.72Z"></path>
                 </clipPath>
             </defs>
             <g id="Layer_2" data-name="Layer 2">
                 <g id="eye">
                     <g id="eye-ball">
                         <g style={{clipPath: 'url(#clip-path)'}}>
                             <path id="ball" fill="#fff" d="M221.93,63.72C211.59,53.58,168.3,14.4,116.46,14.4S21.34,53.57,11,63.72a3.33,3.33,0,0,0,0,4.75c10.34,10.15,53.63,49.32,105.46,49.32s95.13-39.18,105.47-49.32A3.33,3.33,0,0,0,221.93,63.72Z"></path>
                             <g id="moving" style={{transform: 'translateX(-26%) translateY(-20%)'}}>
                                 <g id="iris">
                                     <path fillRule="evenodd" d="M182.84,66.51c0,5.73-5.74,10.62-7.15,15.9-1.45,5.47,1,12.57-1.74,17.36S163.74,106,159.81,110s-5.31,11.36-10.15,14.17-11.87.28-17.32,1.74c-5.28,1.41-10.16,7.16-15.88,7.16s-10.6-5.75-15.87-7.16c-5.45-1.46-12.54,1-17.32-1.74S77.05,113.89,73.11,110,61.78,104.62,59,99.77s-.28-11.89-1.74-17.36c-1.41-5.28-7.14-10.17-7.14-15.9s5.73-10.62,7.14-15.91c1.46-5.46-1-12.57,1.74-17.35S69.18,27,73.11,23.07,78.43,11.71,83.27,8.9s11.87-.28,17.32-1.74C105.86,5.75,110.75,0,116.46,0s10.6,5.75,15.88,7.16c5.45,1.46,12.54-1,17.32,1.74s6.22,10.23,10.15,14.17S171.15,28.39,174,33.25s.29,11.89,1.74,17.35C177.1,55.89,182.84,60.78,182.84,66.51Z"></path>
                                     <path fill="#00d34a" fillRule="evenodd" d="M174.37,66.61c0,5-5.4,9.18-6.62,13.77-1.27,4.75,1.27,11.09-1.13,15.25s-9.21,5.16-12.62,8.59-4.37,10.2-8.58,12.64S135,116.73,130.21,118s-8.78,6.63-13.75,6.63-9.16-5.41-13.74-6.63c-4.74-1.27-11.06,1.27-15.21-1.14s-5.16-9.22-8.58-12.64-10.19-4.38-12.62-8.59.14-10.5-1.13-15.25c-1.22-4.59-6.62-8.79-6.62-13.77s5.4-9.18,6.62-13.77c1.27-4.75-1.27-11.09,1.13-15.25s9.2-5.17,12.62-8.59,4.36-10.21,8.58-12.65,10.47.14,15.21-1.13c4.58-1.23,8.78-6.64,13.74-6.64s9.16,5.41,13.75,6.64,11.06-1.28,15.21,1.13S150.58,25.57,154,29s10.18,4.37,12.62,8.59-.14,10.5,1.13,15.25C169,57.43,174.37,61.63,174.37,66.61Z"></path>
                                     <path fillRule="evenodd" d="M166.51,66.61c0,4.27-5.31,7.79-6.36,11.73s1.72,9.78-.34,13.35-8.44,4-11.37,7-3.33,9.3-6.95,11.39-9.25-.74-13.32.35-7.44,6.36-11.71,6.36-7.77-5.31-11.71-6.36S95,112.11,91.44,110s-4-8.45-7-11.39-9.28-3.34-11.37-7,.74-9.27-.34-13.35-6.36-7.46-6.36-11.73,5.3-7.79,6.36-11.73-1.72-9.78.34-13.35,8.44-4,11.37-7,3.33-9.3,7-11.4,9.25.75,13.31-.34,7.45-6.37,11.71-6.37,7.78,5.32,11.71,6.37,9.76-1.72,13.32.34,4,8.46,6.95,11.4,9.28,3.34,11.37,7-.75,9.27.34,13.35S166.51,62.33,166.51,66.61Z"></path>
                                     <path fill="#00d34a" fillRule="evenodd" d="M159.64,66.61c0,3.65-5.22,6.57-6.12,10s2.11,8.63.34,11.68-7.77,3-10.28,5.54-2.43,8.51-5.52,10.3-8.18-1.28-11.67-.34-6.28,6.13-9.93,6.13-6.56-5.23-9.93-6.13-8.61,2.11-11.66.34-3-7.78-5.52-10.3-8.49-2.44-10.28-5.54,1.27-8.19.34-11.68-6.12-6.3-6.12-10,5.22-6.58,6.12-10S77.3,48,79.07,45s7.76-3,10.28-5.54,2.43-8.5,5.52-10.3,8.18,1.28,11.66.35,6.28-6.14,9.93-6.14,6.57,5.24,9.93,6.14,8.62-2.12,11.67-.35,3,7.79,5.52,10.3,8.49,2.44,10.28,5.54-1.27,8.2-.34,11.69S159.64,63,159.64,66.61Z"></path>
                                     <path fillRule="evenodd" d="M152.55,66.61c0,3-5.14,5.32-5.89,8.11s2.51,7.45,1.06,10-7.08,2-9.15,4.06-1.51,7.69-4.06,9.17-7.08-1.82-9.95-1-5.08,5.9-8.1,5.9-5.31-5.16-8.09-5.9-7.43,2.52-10,1-2-7.09-4.06-9.17-7.67-1.5-9.15-4.06,1.82-7.09,1.05-10-5.88-5.09-5.88-8.11,5.14-5.33,5.88-8.11-2.51-7.45-1.05-10,7.08-2,9.15-4.06,1.5-7.69,4.06-9.17,7.07,1.83,10,1.06,5.08-5.9,8.09-5.9,5.32,5.15,8.1,5.9,7.43-2.52,9.95-1.06,2,7.09,4.06,9.17,7.67,1.5,9.15,4.06-1.83,7.09-1.06,10S152.55,63.59,152.55,66.61Z"></path>
                                     <path fill="#00d34a" fillRule="evenodd" d="M145.06,66.61c0,2.39-4.08,4.22-4.67,6.42s2,5.91.84,7.91-5.61,1.57-7.25,3.22-1.19,6.09-3.22,7.26-5.6-1.44-7.88-.83-4,4.67-6.42,4.67-4.21-4.08-6.41-4.67-5.89,2-7.89.83S100.59,85.8,99,84.16,92.87,83,91.7,80.94s1.44-5.62.83-7.91-4.66-4-4.66-6.42,4.07-4.22,4.66-6.43-2-5.9-.83-7.9S97.31,50.7,99,49.06s1.19-6.1,3.21-7.27,5.61,1.45,7.89.84,4-4.68,6.41-4.68,4.21,4.09,6.42,4.68,5.89-2,7.88-.84,1.57,5.62,3.22,7.27,6.08,1.19,7.25,3.22-1.44,5.62-.84,7.9S145.06,64.21,145.06,66.61Z"></path>
                                 </g>
                                 <g id="pupil" style={{transform: 'scale(0.977383)'}}>
                                     <path id="pupil-2" data-name="pupil" fillRule="evenodd" d="M116.46,85.15a18.64,18.64,0,1,1,18.6-18.64A18.64,18.64,0,0,1,116.46,85.15Z"></path>
                                     <path id="reflection" fill="#fff" fillRule="evenodd" d="M121.74,68.05a6.83,6.83,0,1,1,6.81-6.82A6.82,6.82,0,0,1,121.74,68.05Z"></path>
                                 </g>
                             </g>
                         </g>
                     </g>
                 </g>
                 <g id="outer-lid" style={{transform: 'scaleY(0.897166)'}}>
                     <path d="M116.46,14.4c51.84,0,95.13,39.18,105.47,49.32a3.33,3.33,0,0,1,0,4.75c-10.34,10.14-53.63,49.32-105.47,49.32S21.34,78.62,11,68.47a3.33,3.33,0,0,1,0-4.75C21.34,53.57,64.63,14.4,116.46,14.4m0-10c-55,0-100,39.94-112.46,52.18a13.32,13.32,0,0,0,0,19c12.47,12.24,57.46,52.18,112.46,52.18s100-39.94,112.47-52.18a13.32,13.32,0,0,0,0-19C216.45,44.34,171.46,4.4,116.46,4.4Z"></path>
                 </g>
             </g>
          </svg>
          <div data-links>
            <a data-sign-in-link href="/account">Sign In</a>
            <a data-menu-link href="#" onClick={toggleMenu}>
              <svg data-menu-svg width="31" height="17" viewBox="0 0 31 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect y="0.399902" width="30.4" height="3" fill="currentColor"/>
                <rect y="13.2" width="30" height="3" fill="currentColor"/>
              </svg>
            </a>
          </div>
        </header>

        <section data-chapter="loader" style={{height: '100vh', height: 'var(--vh)', zIndex: 5}}>
          <svg data-logo xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30.19 44.03" style={{opacity: 1}}>
             <path fill="white" d="M25.51,13.79a1.27,1.27,0,0,0,1.8,0l2.5-2.6a1.36,1.36,0,0,0-.06-1.94A19.75,19.75,0,0,0,23,5.41l.79-3.8A1.33,1.33,0,0,0,22.54,0H17.7a1.32,1.32,0,0,0-1.28,1.06l-.7,3.38C9.28,4.77,3.82,8,3.82,14.74c0,5.8,4.51,8.29,9.28,10,4.51,1.72,6.9,2.36,6.9,4.78s-2.38,3.95-5.9,3.95a12.76,12.76,0,0,1-9.16-3.68,1.3,1.3,0,0,0-1.84,0h0L.4,32.49a1.36,1.36,0,0,0,0,1.92,17.64,17.64,0,0,0,7.79,4.4l-.74,3.57A1.33,1.33,0,0,0,8.72,44l4.85,0A1.33,1.33,0,0,0,14.87,43l.7-3.39c7.75-.52,12.47-4.79,12.47-11,0-5.74-4.7-8.16-10.4-10.13-3.26-1.21-6.08-2-6.08-4.53s2.63-3.38,5.27-3.38a13.39,13.39,0,0,1,8.7,3.29Z"/>
          </svg>
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
            {['w','a','l','l','e','t'].map(char => (
              <figcaption key={char} data-characters={char}>
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
            <svg data-arrow width="33" height="26" viewBox="0 0 33 26" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M28.0288 14.2877H0L0 11.7123H28.0288L18.5591 2.32111L20.3955 0.5L33 13L20.3955 25.5L18.5591 23.6789L28.0288 14.2877Z" fill="currentColor"/>
            </svg>
            <h3>Learn more with <br/>My First Stock</h3>
          </a>
          <div data-apps>
            <a href="https://itunes.apple.com/us/app/square-cash/id711923939?pt=302818&mt=8&ct=cash-web-home">
              <svg width="20" height="24" viewBox="0 0 20 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M13.4566 4.12535C14.2876 3.13909 14.7045 2.07355 14.7045 0.932337V0.932323C14.7045 0.780961 14.6975 0.628389 14.6806 0.47583C14.1017 0.50586 13.4861 0.681251 12.8354 0.998397C12.1832 1.32035 11.6455 1.72393 11.2226 2.20932C10.3757 3.16797 9.89873 4.34043 9.89873 5.43599C9.89873 5.58741 9.90845 5.7315 9.92521 5.86841C11.2406 5.97532 12.4537 5.29781 13.4566 4.12535ZM17.8808 20.4645C18.354 19.7898 18.7625 19.056 19.1076 18.2587C19.2499 17.9207 19.3837 17.5686 19.5104 17.2009C18.9259 16.9558 18.4005 16.6108 17.9301 16.1643C16.892 15.2022 16.3638 13.9906 16.3483 12.5346C16.3314 10.6653 17.1807 9.20819 18.8977 8.16785C17.9385 6.80439 16.4962 6.04758 14.5763 5.89264C13.8678 5.83249 13.003 5.98518 11.9783 6.35393C10.8947 6.75156 10.2555 6.95101 10.0669 6.95101C9.81464 6.95101 9.23925 6.78044 8.34314 6.44408C7.44449 6.10885 6.72135 5.93828 6.16991 5.93828C5.1621 5.95504 4.22627 6.21703 3.36016 6.73114C2.49405 7.24526 1.80204 7.94558 1.28186 8.83338C0.619993 9.93866 0.289551 11.2576 0.289551 12.7869C0.289551 14.1219 0.534636 15.5008 1.02354 16.9249C1.48005 18.2433 2.06276 19.3997 2.77153 20.3969C3.43214 21.3308 3.98358 21.99 4.42445 22.3745C5.1152 23.0168 5.80721 23.3224 6.50148 23.2929C6.95799 23.2774 7.55506 23.121 8.29624 22.821C9.03628 22.5224 9.72815 22.3745 10.3733 22.3745C10.9884 22.3745 11.6611 22.5224 12.3931 22.821C13.1227 23.121 13.7495 23.2689 14.2693 23.2689C14.9933 23.252 15.6694 22.9548 16.3004 22.3745C16.7075 22.0209 17.2357 21.3843 17.8808 20.4645Z" fill="currentColor"/>
              </svg>
              <span>App Store</span>
            </a>
            <a href="https://play.google.com/store/apps/details?id=com.squareup.cash&utm_source=cash-web-home&utm_medium=web">
              <svg width="21" height="22" viewBox="0 0 21 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M1.22455 21.2295L10.5372 11.9433L13.8198 15.2161L2.7491 21.3541C2.32817 21.5876 1.81261 21.5841 1.39433 21.3444L1.22455 21.2295ZM9.59809 11.0068L0.719604 19.8597V2.15399L9.59809 11.0068ZM15.1463 7.34843L19.4838 9.75287C19.91 9.98987 20.1744 10.4338 20.1744 10.9149C20.1744 11.3959 19.91 11.8398 19.4838 12.0768L15.0278 14.5467L11.4772 11.0068L15.1463 7.34843ZM1.12639 0.686031C1.20598 0.609095 1.29529 0.541888 1.39433 0.485292C1.81261 0.245644 2.32817 0.242106 2.7491 0.475565L13.9383 6.67901L10.5372 10.0703L1.12639 0.686031Z" fill="currentColor"/>
              </svg>
              <span>Google Play</span>
            </a>
          </div>
          <div data-social>
            <a data-twitter href="https://twitter.com/cashapp">
              <svg width="21" height="17" viewBox="0 0 21 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6.55646 16.9431C14.4241 16.9431 18.7262 10.4252 18.7262 4.77335C18.7262 4.58822 18.7225 4.40392 18.7142 4.22046C19.5493 3.6167 20.2753 2.86326 20.8477 2.00557C20.0814 2.34623 19.2566 2.57556 18.3914 2.67896C19.2746 2.14942 19.9525 1.31175 20.2723 0.313136C19.4459 0.803062 18.5307 1.15915 17.5563 1.35136C16.7757 0.519947 15.6645 0 14.4341 0C12.072 0 10.1565 1.91551 10.1565 4.27675C10.1565 4.6124 10.194 4.93888 10.2674 5.25201C6.71242 5.07314 3.56021 3.37111 1.45081 0.783049C1.08347 1.41516 0.871657 2.14942 0.871657 2.93289C0.871657 4.41685 1.62677 5.72693 2.77507 6.4933C2.07333 6.47162 1.41412 6.27898 0.837882 5.95834C0.837253 5.97629 0.837253 5.99378 0.837253 6.01296C0.837253 8.08442 2.31162 9.81396 4.26883 10.2059C3.90941 10.3039 3.53122 10.3564 3.14095 10.3564C2.86576 10.3564 2.59765 10.3293 2.33705 10.2793C2.8816 11.9788 4.46063 13.2155 6.33277 13.2501C4.86883 14.3976 3.02462 15.081 1.0203 15.081C0.675473 15.081 0.334818 15.0614 0 15.0218C1.89299 16.2351 4.14082 16.9431 6.55668 16.9431" fill="currentColor"/>
              </svg>
            </a>
            <a data-ig href="https://instagram.com/cashapp">
              <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M6.4273 0.563312C7.49265 0.515787 7.83324 0.503906 10.5422 0.503906C13.2511 0.503906 13.5917 0.515787 14.661 0.559352C15.7263 0.606877 16.4511 0.777174 17.0847 1.02272C17.7382 1.28014 18.2966 1.62074 18.8511 2.17519C19.4055 2.72965 19.7501 3.2841 20.0035 3.94153C20.2491 4.57915 20.4194 5.30391 20.4669 6.36529C20.5144 7.43064 20.5263 7.76727 20.5263 10.4801C20.5263 13.193 20.5144 13.5296 20.4669 14.595C20.4194 15.6603 20.2491 16.3851 20.0035 17.0188C19.7461 17.6722 19.4055 18.2306 18.8511 18.7851C18.2966 19.3396 17.7422 19.6841 17.0847 19.9376C16.4471 20.1831 15.7224 20.3534 14.661 20.4009C13.5956 20.4485 13.259 20.4603 10.5461 20.4603C7.83324 20.4603 7.49661 20.4485 6.43126 20.4009C5.36592 20.3534 4.64117 20.1831 4.0075 19.9376C3.35404 19.6801 2.79562 19.3396 2.24117 18.7851C1.68671 18.2306 1.34216 17.6762 1.08869 17.0188C0.843146 16.3811 0.672849 15.6564 0.625324 14.595C0.577799 13.5296 0.565918 13.1891 0.565918 10.4801C0.565918 7.77123 0.577799 7.43064 0.625324 6.36925C0.672849 5.30391 0.843146 4.57915 1.08869 3.94549C1.34612 3.29203 1.68671 2.73361 2.24117 2.17915C2.79562 1.6247 3.35008 1.28014 4.0075 1.02668C4.64117 0.781134 5.36592 0.610837 6.4273 0.563312ZM14.5738 2.36133C13.5204 2.31381 13.2075 2.30193 10.5422 2.30193C7.87681 2.30193 7.56394 2.30985 6.51047 2.36133C5.53621 2.4049 5.00948 2.57123 4.65701 2.70589C4.18968 2.8841 3.85701 3.10193 3.50849 3.45044C3.15998 3.79896 2.94612 4.13163 2.76394 4.59896C2.62532 4.95143 2.46295 5.47816 2.41938 6.45242C2.37186 7.50589 2.35998 7.81876 2.35998 10.4841C2.35998 13.1495 2.37186 13.4623 2.41938 14.5158C2.46295 15.49 2.62928 16.0168 2.76394 16.3693C2.94216 16.8366 3.15998 17.1693 3.50849 17.5178C3.85701 17.8663 4.18968 18.0801 4.65701 18.2623C5.00948 18.4009 5.53621 18.5633 6.51047 18.6069C7.56394 18.6544 7.87681 18.6663 10.5422 18.6663C13.2075 18.6663 13.5204 18.6544 14.5738 18.6069C15.5481 18.5633 16.0748 18.397 16.4273 18.2623C16.8946 18.0841 17.2273 17.8663 17.5758 17.5178C17.9243 17.1693 18.1382 16.8366 18.3204 16.3693C18.459 16.0168 18.6214 15.49 18.6649 14.5158C18.7125 13.4623 18.7243 13.1495 18.7243 10.4841C18.7243 7.81876 18.7125 7.50589 18.6649 6.45242C18.6214 5.47816 18.455 4.95143 18.3204 4.59896C18.1422 4.13163 17.9243 3.79896 17.5758 3.45044C17.2273 3.10193 16.8946 2.88806 16.4273 2.70589C16.0748 2.56727 15.5481 2.4049 14.5738 2.36133Z" fill="currentColor"/>
                <path fillRule="evenodd" clipRule="evenodd" d="M5.41739 10.4802C5.41739 7.64854 7.71442 5.35547 10.5421 5.35547C13.3699 5.35547 15.6669 7.6525 15.6669 10.4802C15.6669 13.3079 13.3699 15.605 10.5421 15.605C7.71442 15.605 5.41739 13.3119 5.41739 10.4802ZM7.21541 10.4802C7.21541 12.3178 8.70452 13.807 10.5421 13.807C12.3798 13.807 13.8689 12.3178 13.8689 10.4802C13.8689 8.6426 12.3798 7.15349 10.5421 7.15349C8.70452 7.15349 7.21541 8.6426 7.21541 10.4802Z" fill="currentColor"/>
                <path d="M15.8689 6.3496C16.5294 6.3496 17.0649 5.81411 17.0649 5.15356C17.0649 4.493 16.5294 3.95752 15.8689 3.95752C15.2083 3.95752 14.6729 4.493 14.6729 5.15356C14.6729 5.81411 15.2083 6.3496 15.8689 6.3496Z" fill="currentColor"/>
              </svg>
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