import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PhoneFrame } from './PhoneFrame';

// Clean SVG icons for neobank aesthetic
const Icons = {
  food: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>
    </svg>
  ),
  shopping: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  ),
  travel: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
    </svg>
  ),
  bills: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  ),
  global: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  coffee: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
    </svg>
  ),
  burger: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
  store: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
};

// Spending categories with clean merchant names instead of emojis
const SPENDING_CATEGORIES = [
  { id: 'food', name: 'Food & Drinks', icon: Icons.food, examples: ['Starbucks', 'DoorDash', 'Chipotle'], amounts: ['$6.45', '$12.99', '$18.50'] },
  { id: 'shopping', name: 'Shopping', icon: Icons.shopping, examples: ['Amazon', 'Target', 'Apple'], amounts: ['$24.99', '$49.99', '$89.00'] },
  { id: 'travel', name: 'Travel', icon: Icons.travel, examples: ['Uber', 'Airbnb', 'Delta'], amounts: ['$15.00', '$85.00', '$165.00'] },
  { id: 'bills', name: 'Bills', icon: Icons.bills, examples: ['Netflix', 'Spotify', 'Electric'], amounts: ['$15.99', '$9.99', '$125.00'] },
  { id: 'global', name: 'Send Anywhere', icon: Icons.global, examples: ['US', 'EU', 'Asia'], amounts: ['$50.00', '$100.00', '$200.00'] },
];

export const SpendSection: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState(0);
  const [amountIndex, setAmountIndex] = useState(0);

  // Auto-rotate amounts every 2 seconds
  React.useEffect(() => {
    const interval = setInterval(() => {
      setAmountIndex(prev => (prev + 1) % 3);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="spend" className="bg-bearo-dark text-white px-6 py-20 md:py-28 relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-bearo-honey/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-12 relative z-10">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-bearo-honey">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
            <span className="text-sm font-medium text-white/80">Tap. Pay. Done.</span>
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display text-4xl font-semibold leading-[1] tracking-tight md:text-5xl"
          >
            Spend Anywhere
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-md text-base text-white/60 md:text-lg"
          >
            One app. Every store. Instant payments worldwide.
          </motion.p>
        </div>

        {/* Interactive Demo */}
        <div className="w-full flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
          
          {/* Phone */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="flex-1 flex justify-center"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-bearo-honey/20 blur-[80px] scale-125" />
              
              <PhoneFrame className="relative z-10 w-[280px] h-[580px]">
                <div className="flex flex-col h-full bg-[#0A0A0B]">
                  <div className="h-14" />
                  
                  {/* Payment UI */}
                  <div className="flex-1 flex flex-col items-center justify-center px-6">
                    <motion.div
                      key={activeCategory}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-center"
                    >
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/10 flex items-center justify-center text-bearo-honey">
                        {SPENDING_CATEGORIES[activeCategory].icon}
                      </div>
                      <motion.div
                        key={`${activeCategory}-${amountIndex}`}
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="text-3xl font-bold text-white mb-2"
                      >
                        {SPENDING_CATEGORIES[activeCategory].amounts[amountIndex]}
                      </motion.div>
                      <div className="text-white/60 text-sm">{SPENDING_CATEGORIES[activeCategory].name}</div>

                      {/* Merchant names instead of emojis */}
                      <div className="flex justify-center gap-3 mt-4">
                        {SPENDING_CATEGORIES[activeCategory].examples.map((merchant, i) => (
                          <motion.span
                            key={i}
                            initial={{ scale: 0 }}
                            animate={{ scale: i === amountIndex ? 1.05 : 1 }}
                            transition={{ delay: i * 0.1 }}
                            className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                              i === amountIndex
                                ? 'bg-bearo-honey/20 text-bearo-honey border border-bearo-honey/30'
                                : 'bg-white/5 text-white/40 border border-white/10'
                            }`}
                          >
                            {merchant}
                          </motion.span>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                  
                  {/* Category Selector */}
                  <div className="px-4 pb-4">
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {SPENDING_CATEGORIES.map((cat, i) => (
                        <button
                          key={cat.id}
                          onClick={() => setActiveCategory(i)}
                          className={`flex-shrink-0 w-11 h-11 rounded-xl transition-all flex items-center justify-center ${
                            activeCategory === i
                              ? 'bg-bearo-honey text-black'
                              : 'bg-white/5 text-white/60 hover:bg-white/10'
                          }`}
                        >
                          <div className="w-5 h-5">{cat.icon}</div>
                        </button>
                      ))}
                    </div>
                    
                    {/* Pay Button */}
                    <div className="mt-3 relative">
                      <div className="absolute inset-0 rounded-2xl rainbow-border p-[2px]" />
                      <button className="relative w-full py-4 bg-white text-black rounded-2xl font-semibold flex items-center justify-center gap-2">
                        Pay Now
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </PhoneFrame>
            </div>
          </motion.div>

          {/* Features */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="flex-1 flex flex-col gap-4 max-w-md"
          >
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-bearo-honey to-bearo-amber flex items-center justify-center">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-black">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Instant Everywhere</h3>
                  <p className="text-sm text-white/60">Pay in seconds, anywhere in the world. No delays.</p>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Always Protected</h3>
                  <p className="text-sm text-white/60">Bank-level security. Real-time notifications.</p>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Works Globally</h3>
                  <p className="text-sm text-white/60">190+ countries. Any currency. Zero hassle.</p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-3 mt-2">
              <div className="flex-1 p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                <div className="text-xl font-bold text-bearo-honey">$0</div>
                <div className="text-[10px] text-white/40">Fees</div>
              </div>
              <div className="flex-1 p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                <div className="text-xl font-bold text-bearo-honey">190+</div>
                <div className="text-[10px] text-white/40">Countries</div>
              </div>
              <div className="flex-1 p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                <div className="text-xl font-bold text-bearo-honey">&lt;3s</div>
                <div className="text-[10px] text-white/40">Speed</div>
              </div>
            </div>

            {/* Hint about the coin */}
            <div className="p-3 rounded-xl bg-bearo-honey/10 border border-bearo-honey/20 mt-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-bearo-honey/20 flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-bearo-honey">
                    <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                </div>
                <p className="text-xs text-white/70">
                  <span className="text-bearo-honey font-semibold">Curious how it works?</span> Tap the floating coin on the left!
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default SpendSection;
