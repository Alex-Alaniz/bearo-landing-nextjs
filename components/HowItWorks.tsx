import React from 'react';
import { IphoneShowcase } from './IphoneShowcase';

type Step = {
  title: string;
  description: string;
  mediaSrc: string;
  imagePosition: 'left' | 'right';
};

const steps: Step[] = [
  {
    title: 'Bearified Instant Payments',
    description:
      'Send money to anyone, anywhere, in seconds. No fees, no waiting. Just pure instant transfers powered by blockchain tech.',
    mediaSrc: '/screen1.jpg',
    imagePosition: 'left',
  },
  {
    title: 'Your Money. Your Honey.',
    description:
      'HONEY is your local currency, powered by stablecoins. Bearo abstracts the crypto layer so it feels like the payment apps you know.',
    mediaSrc: '/screen3.jpg',
    imagePosition: 'right',
  },
  {
    title: 'Earn BEARCO Points.',
    description:
      'Every send, spend, and friend earns you points. Redeem for perks and boosts—the more you use Bearo, the sweeter it gets.',
    mediaSrc: '/screen4.jpg',
    imagePosition: 'left',
  },
  {
    title: 'The Bearo Card',
    description:
      'Premium notifications, real-time spending insights, and exclusive rewards. Designed for the future of money.',
    mediaSrc: '/screen2.jpg',
    imagePosition: 'right',
  },
  {
    title: 'Trade Memecoins.',
    description:
      'Buy, sell, and trade the hottest memecoins directly in Bearo. Zero complexity, maximum degen energy.',
    mediaSrc: '/screen5.jpg',
    imagePosition: 'left',
  },
];

export const HowItWorks: React.FC = () => {
  return (
    <section id="money" className="bg-bearo-dark text-white px-6 py-20 md:py-28">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-12">
        <div className="flex flex-col items-center gap-4 text-center">
          <h2 className="font-display text-4xl font-semibold leading-[1] tracking-tight md:text-5xl">
            Bearo&apos;s experience at a glance
          </h2>
          <p className="max-w-2xl text-base text-white/60 md:text-lg">
            Experience the future of payments with Bearified Instant Payments, HONEY currency, and exclusive rewards.
          </p>
        </div>

        <div className="flex flex-col gap-16 md:gap-20">
          {steps.map((step, index) => (
            <div
              key={step.title}
              id={step.title === 'Your Money. Your Honey.' ? 'money' : undefined}
              className={`relative flex flex-col items-center gap-10 rounded-3xl border border-bearo-honey/20 bg-black/50 p-6 backdrop-blur-md md:p-10 ${
                step.imagePosition === 'right' ? 'lg:flex-row-reverse' : 'lg:flex-row'
              }`}
              style={{
                boxShadow: '0 20px 60px rgba(249,115,22,0.15), 0 0 100px rgba(249,115,22,0.05)'
              }}
            >
              {/* Orange shadow glow */}
              <div className="absolute inset-0 rounded-3xl bg-bearo-honey/5 blur-2xl -z-10" />
              
              <IphoneShowcase screenSrc={step.mediaSrc} alt={step.title} />
              <div className="flex max-w-xl flex-col gap-4 text-center lg:text-left">
                <p className="text-sm uppercase tracking-[0.24em] text-bearo-honey/60">Step {index + 1}</p>
                <h3 className="font-display text-3xl font-semibold leading-[1.05] tracking-tight md:text-4xl text-white">
                  {step.title}
                </h3>
                <p className="text-base text-white/70 md:text-lg">{step.description}</p>
                {/* Roadmap notes */}
                {index === 0 && (
                  <p className="text-sm text-bearo-honey/80 mt-2 italic border-l-2 border-bearo-honey/30 pl-3">
                    <strong>Ready at Beta and Launch</strong> - Step 1 & 2 will be available from day one.
                  </p>
                )}
                {index === 1 && (
                  <p className="text-sm text-bearo-honey/80 mt-2 italic border-l-2 border-bearo-honey/30 pl-3">
                    <strong>Ready at Beta and Launch</strong> - Step 1 & 2 will be available from day one. This is just branding and we have the rails to support users at beta and launch.
                  </p>
                )}
                {index === 2 && (
                  <p className="text-sm text-bearo-honey/80 mt-2 italic border-l-2 border-bearo-honey/30 pl-3">
                    <strong>Roll out after Beta</strong> - Entering launch officially on the App Store.
                  </p>
                )}
                {index === 3 && (
                  <p className="text-sm text-bearo-honey/80 mt-2 italic border-l-2 border-bearo-honey/30 pl-3">
                    <strong>Post-Launch Roadmap</strong> - Card integration coming after official App Store launch.
                  </p>
                )}
                {index === 4 && (
                  <p className="text-sm text-bearo-honey/80 mt-2 italic border-l-2 border-bearo-honey/30 pl-3">
                    <strong>Roadmap</strong> - Memecoins integration coming after Card integration.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
