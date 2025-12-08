import { useEffect, useRef } from 'react';
import { createTimeline, cubicBezier } from 'animejs';

export const useCashAppAnimations = (containerRef: React.RefObject<HTMLElement | null>) => {
  const timelineRef = useRef<any>(null);

  // Constants for colors
  const BRAND_COLOR = '#f97316';

  useEffect(() => {
    if (!containerRef.current) return;

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

    const handleResize = () => {
      setViewPort();
      computeMaskSize();
    };

    window.addEventListener('resize', handleResize);

    // 2. Select Elements Helper (scoped to this component)
    const $ = (selector: string) => {
      return containerRef.current?.querySelector(selector) as HTMLElement;
    };
    const $$ = (selector: string) => containerRef.current?.querySelectorAll(selector);

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

      if (!mask || !eyeBall || !iris) return;

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
            if (sections) {
              sections.forEach((s: any) => s.style.visibility = 'hidden');
            }
            tl.restart();
        }
      });

      timelineRef.current = tl;

      // --- NOW Section ---
      if (now) {
        tl.add(now.querySelector('[data-character="n"]')!, {
          y: ['70%', 0],
          ease: cubicBezier(0, 0.43, 0, 0.98),
          duration: 1600,
          onBegin: () => {
              now.style.visibility = 'visible';
              if (logoLink) logoLink.style.color = 'white';
              if (jewel) jewel.style.fill = BRAND_COLOR;
              if (cutout) cutout.style.fill = 'white';
              if (menuLink) menuLink.style.color = 'white';
              if (signInLink) signInLink.style.color = 'white';
              if (myFirstLink) myFirstLink.style.color = 'white';
              if (appLinks) {
                appLinks.querySelectorAll('a').forEach((link: any) => {
                    link.style.color = 'white';
                    link.querySelector('svg')!.style.color = 'white';
                });
              }
              if (socialLinks) socialLinks.querySelectorAll('a').forEach((link: any) => link.style.color = 'white');
              if (disclosures) disclosures.forEach((d: any) => d.style.color = 'white');
          }
        }, 0);

        tl.add(now.querySelector('[data-character="o"]')!, {
          scale: [1.3, 1],
          ease: cubicBezier(0, 0.84, 0.14, 0.99),
          duration: 1400
        }, 0);

        tl.add(now.querySelector('[data-character="w"]')!, {
          y: ['-62%', 0],
          ease: cubicBezier(0, 0.43, 0, 0.98),
          duration: 1700
        }, 0);

        tl.add(now.querySelector('[data-background]')!, {
          rotate: ['-22deg', '20deg'],
          ease: 'linear',
          duration: 2000
        }, 0);
      }

      // --- YOU Section ---
      const youStartTime = 800;
      
      if (you) {
        tl.add(you.querySelector('[data-character="y"]')!, {
          y: [0, '-50%'],
          ease: cubicBezier(0, 0.56, 0.1, 0.98),
          duration: 1300,
          onBegin: () => {
              you.style.visibility = 'visible';
              if (now) now.style.visibility = 'hidden';
              if (logoLink) logoLink.style.color = 'black';
              if (menuLink) menuLink.style.color = 'black';
              if (signInLink) signInLink.style.color = 'black';
              if (myFirstLink) myFirstLink.style.color = 'black';
              if (appLinks) {
                appLinks.querySelectorAll('a').forEach((link: any) => {
                  link.style.color = 'black';
                  link.style.borderColor = 'black';
                  link.querySelector('svg')!.style.color = BRAND_COLOR;
                });
              }
              if (socialLinks) socialLinks.querySelectorAll('a').forEach((link: any) => link.style.color = 'black');
              if (disclosures) disclosures.forEach((link: any) => link.style.color = 'black');
          }
        }, youStartTime);

        tl.add(you.querySelector('[data-character="o"]')!, {
          scale: [0.7, 1],
          ease: cubicBezier(0, 0.64, 0.25, 1),
          duration: 1300
        }, youStartTime);

        tl.add(you.querySelector('[data-character="u"]')!, {
          y: [0, '57%'],
          ease: cubicBezier(0, 0.56, 0.1, 0.98),
          duration: 1300
        }, youStartTime);

        // Helper for complex rotates in v4 array syntax
        const blockRotate = [{ from: -30, to: 0 }];
        const stairsRotate = [{ from: 30, to: 0 }];
        const cubeRotate = [{ from: -40, to: 0 }];
        
        tl.add(you.querySelector('[data-blocks]')!, {
          x: ['-50%', '-100%'],
          y: ['50%', '100%'],
          rotate: blockRotate,
          ease: cubicBezier(0, 0.74, 0.11, 1),
          duration: 1300
        }, youStartTime);

        tl.add(you.querySelector('[data-stairs]')!, {
          x: ['70%', '100%'],
          y: ['-50%', '-100%'],
          rotate: stairsRotate,
          ease: cubicBezier(0, 0.74, 0.11, 1),
          duration: 1300
        }, youStartTime);

        tl.add(you.querySelector('[data-cube]')!, {
          x: ['-100%', '-175%'],
          y: ['-100%', '-250%'],
          rotate: cubeRotate,
          ease: cubicBezier(0, 0.74, 0.11, 1),
          duration: 1300
        }, youStartTime);

        tl.add(you.querySelector('[data-sphere]')!, {
          x: ['100%', '250%'],
          y: ['100%', '270%'],
          rotate: cubeRotate,
          ease: cubicBezier(0, 0.74, 0.11, 1),
          duration: 1300
        }, youStartTime);
      }

      // --- CAN Section ---
      const canStartTime = 1600;

      if (can) {
        tl.add(can.querySelector('[data-character="c"]')!, {
          x: ['76%', 0],
          rotate: [30, 0],
          scale: [0.7, 1],
          opacity: [0, 1],
          ease: cubicBezier(0, 0.96, 0.06, 0.98),
          duration: 1200,
          onBegin: () => {
              can.style.visibility = 'visible';
              if (logoLink) logoLink.style.color = 'white';
              if (jewel) jewel.style.fill = 'white';
              if (cutout) cutout.style.fill = BRAND_COLOR;
              if (menuLink) menuLink.style.color = 'white';
              if (signInLink) signInLink.style.color = 'white';
              if (myFirstLink) myFirstLink.style.color = 'white';
              if (appLinks) {
                appLinks.querySelectorAll('a').forEach((link: any) => {
                    link.style.color = 'white';
                    link.style.borderColor = 'white';
                    link.querySelector('svg')!.style.color = 'white';
                });
              }
              if (socialLinks) socialLinks.querySelectorAll('a').forEach((link: any) => link.style.color = 'white');
              if (disclosures) disclosures.forEach((link: any) => link.style.color = 'white');
          }
        }, canStartTime);

        tl.add(can.querySelector('[data-character="a"]')!, {
          rotate: [20, 0],
          scale: [0.7, 1],
          opacity: [0, 1],
          ease: cubicBezier(0, 0.56, 0.1, 0.98),
          duration: 1200
        }, canStartTime);

        tl.add(can.querySelector('[data-character="n"]')!, {
          x: ['-80%', 0],
          rotate: [-30, 0],
          scale: [0.7, 1],
          opacity: [0, 1],
          ease: cubicBezier(0, 0.56, 0.1, 0.98),
          duration: 1200
        }, canStartTime);

        tl.add(can.querySelector('[data-circle]')!, {
          x: ['-50%', '-50%'],
          y: ['-50%', '-50%'],
          scale: [0, 1],
          opacity: [{ from: 0, to: 1, duration: 100, ease: cubicBezier(0.25, 0.1, 0.25, 1) }],
          ease: cubicBezier(0, 0.25, 0.04, 0.99),
          duration: 1000
        }, canStartTime);
      }

      // --- INVEST Section ---
      const investStartTime = 2400;

      if (invest) {
        tl.add(invest.querySelector('[data-group]')!, {
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
              if (can) can.style.visibility = 'hidden';
          }
        }, investStartTime);

        // Helper for invest chars
        const investEase = cubicBezier(0.16, 0.47, 0.15, 0.98);
        const investDuration = 1500;

        tl.add(invest.querySelector('[data-characters="i"]')!, {
          y: ['-30%', 0],
          ease: investEase,
          duration: investDuration
        }, investStartTime);
        tl.add(invest.querySelector('[data-characters="n"]')!, {
          y: ['10%', 0],
          ease: investEase,
          duration: investDuration
        }, investStartTime);
        tl.add(invest.querySelector('[data-characters="v"]')!, {
          y: ['-10%', 0],
          ease: investEase,
          duration: investDuration
        }, investStartTime);
        tl.add(invest.querySelector('[data-characters="e"]')!, {
          y: ['15%', 0],
          ease: investEase,
          duration: investDuration
        }, investStartTime);
        tl.add(invest.querySelector('[data-characters="s"]')!, {
          y: ['-15%', 0],
          ease: investEase,
          duration: investDuration
        }, investStartTime);
        tl.add(invest.querySelector('[data-characters="t"]')!, {
          y: ['-12%', 0],
          ease: investEase,
          duration: investDuration
        }, investStartTime);
      }


      // --- CTA Section ---
      const ctaStartTime = 3800;
      const ctaEase = cubicBezier(0, 0.99, 0.15, 0.99);

      if (cta) {
        tl.add(cta.querySelector('[data-words]')!, {
          scale: [{ from: 1.3, to: 1, duration: 1000, ease: ctaEase }],
          opacity: [{ from: 0, to: 1, delay: 50, duration: 100 }],
          onBegin: () => {
              cta.style.visibility = 'visible';
              if (invest) invest.style.visibility = 'hidden';
              if (myFirstLink) myFirstLink.style.color = 'white';
              if (appLinks) {
                appLinks.querySelectorAll('a').forEach((link: any) => {
                  link.style.color = 'white';
                  link.style.borderColor = 'white';
                  link.querySelector('svg')!.style.color = 'white';
                });
              }
              if (disclosures) disclosures.forEach((link: any) => link.style.color = 'white');
          }
        }, ctaStartTime);

        const words: { [key: string]: string } = {
            now: '-120%', you: '-50%', can: '50%', invest: '120%', 
            with: '-100%', cash: '50%', app: '100%', dot: '350%'
        };

        Object.keys(words).forEach(word => {
            tl.add(cta.querySelector(`[data-word="${word}"]`)!, {
                x: [words[word], '0%'],
                ease: ctaEase,
                duration: 1000
            }, ctaStartTime);
        });

        // Pad the end
        tl.add(cta, { duration: 1500 });
      }
    };

    // Run animations after a brief delay
    const timeout = setTimeout(() => {
        animateEyeball();
        initMasterAnimation();
    }, 100);

    return () => {
        clearTimeout(timeout);
        window.removeEventListener('resize', handleResize);
        if(timelineRef.current) timelineRef.current.pause();
    }
  }, [containerRef]);

  return timelineRef;
};