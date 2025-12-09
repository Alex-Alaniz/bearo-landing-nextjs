import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';

// Chain logo SVGs from actual supported chains
const ChainLogos = {
  base: (
    <svg viewBox="0 0 111 111" fill="none" className="w-full h-full">
      <path d="M54.921 110.034C85.359 110.034 110.034 85.402 110.034 55.017C110.034 24.6319 85.359 0 54.921 0C26.0432 0 2.35281 22.1714 0 50.3923H72.8467V59.6416H0C2.35281 87.8625 26.0432 110.034 54.921 110.034Z" fill="#0052FF"/>
    </svg>
  ),
  ethereum: (
    <svg viewBox="0 0 784.37 1277.39" fill="none" className="w-full h-full">
      <g>
        <polygon fill="#343434" points="392.07,0 383.5,29.11 383.5,873.74 392.07,882.29 784.13,650.54"/>
        <polygon fill="#8C8C8C" points="392.07,0 0,650.54 392.07,882.29 392.07,472.33"/>
        <polygon fill="#3C3C3B" points="392.07,956.52 387.24,962.41 387.24,1263.28 392.07,1277.38 784.37,724.89"/>
        <polygon fill="#8C8C8C" points="392.07,1277.38 392.07,956.52 0,724.89"/>
        <polygon fill="#141414" points="392.07,882.29 784.13,650.54 392.07,472.33"/>
        <polygon fill="#393939" points="0,650.54 392.07,882.29 392.07,472.33"/>
      </g>
    </svg>
  ),
  polygon: (
    <svg viewBox="0 0 38.4 33.5" fill="none" className="w-full h-full">
      <path fill="#8247E5" d="M29,10.2c-0.7-0.4-1.6-0.4-2.4,0L21,13.5l-3.8,2.1l-5.5,3.3c-0.7,0.4-1.6,0.4-2.4,0L5,16.3 c-0.7-0.4-1.2-1.2-1.2-2.1v-5c0-0.8,0.4-1.6,1.2-2.1l4.3-2.5c0.7-0.4,1.6-0.4,2.4,0L16,7.2c0.7,0.4,1.2,1.2,1.2,2.1v3.3l3.8-2.2V7 c0-0.8-0.4-1.6-1.2-2.1l-8-4.7c-0.7-0.4-1.6-0.4-2.4,0L1.2,5C0.4,5.4,0,6.2,0,7v9.4c0,0.8,0.4,1.6,1.2,2.1l8.1,4.7 c0.7,0.4,1.6,0.4,2.4,0l5.5-3.2l3.8-2.2l5.5-3.2c0.7-0.4,1.6-0.4,2.4,0l4.3,2.5c0.7,0.4,1.2,1.2,1.2,2.1v5c0,0.8-0.4,1.6-1.2,2.1 L29,28.8c-0.7,0.4-1.6,0.4-2.4,0l-4.3-2.5c-0.7-0.4-1.2-1.2-1.2-2.1V21l-3.8,2.2v3.3c0,0.8,0.4,1.6,1.2,2.1l8.1,4.7 c0.7,0.4,1.6,0.4,2.4,0l8.1-4.7c0.7-0.4,1.2-1.2,1.2-2.1V17c0-0.8-0.4-1.6-1.2-2.1L29,10.2z"/>
    </svg>
  ),
};

// Stablecoin logo SVGs
const StablecoinLogos = {
  usdc: (
    <svg viewBox="0 0 2000 2000" fill="none" className="w-full h-full">
      <circle cx="1000" cy="1000" r="1000" fill="#2775CA"/>
      <path d="M1275 1158.33C1275 1016.67 1191.67 966.667 1025 941.667C908.333 925 891.667 891.667 891.667 841.667C891.667 791.667 925 758.333 991.667 758.333C1050 758.333 1083.33 783.333 1100 841.667C1100 850 1108.33 858.333 1116.67 858.333H1166.67C1175 858.333 1183.33 850 1183.33 841.667V833.333C1166.67 733.333 1091.67 666.667 991.667 658.333V558.333C991.667 550 983.333 541.667 975 541.667H925C916.667 541.667 908.333 550 908.333 558.333V658.333C783.333 675 700 766.667 700 883.333C700 1016.67 783.333 1075 950 1100C1058.33 1116.67 1083.33 1141.67 1083.33 1200C1083.33 1258.33 1033.33 1300 966.667 1300C875 1300 841.667 1258.33 825 1200C825 1191.67 816.667 1183.33 808.333 1183.33H750C741.667 1183.33 733.333 1191.67 733.333 1200V1208.33C750 1316.67 825 1391.67 916.667 1408.33V1508.33C916.667 1516.67 925 1525 933.333 1525H983.333C991.667 1525 1000 1516.67 1000 1508.33V1408.33C1125 1383.33 1208.33 1291.67 1208.33 1158.33H1275Z" fill="white"/>
      <path d="M816.667 1616.67C533.333 1525 383.333 1216.67 475 933.333C525 783.333 641.667 666.667 791.667 616.667C800 616.667 808.333 608.333 808.333 600V550C808.333 541.667 800 533.333 791.667 533.333C783.333 533.333 783.333 533.333 775 541.667C450 641.667 275 991.667 375 1316.67C433.333 1491.67 566.667 1625 741.667 1683.33C750 1683.33 758.333 1683.33 766.667 1675C775 1666.67 775 1658.33 775 1650V1600C783.333 1591.67 775 1583.33 816.667 1616.67Z" fill="white"/>
      <path d="M1225 541.667C1216.67 541.667 1208.33 541.667 1200 550C1191.67 558.333 1191.67 566.667 1191.67 575V625C1191.67 633.333 1200 641.667 1208.33 650C1491.67 741.667 1641.67 1050 1550 1333.33C1500 1483.33 1383.33 1600 1233.33 1650C1225 1650 1216.67 1658.33 1216.67 1666.67V1716.67C1216.67 1725 1225 1733.33 1233.33 1733.33C1241.67 1733.33 1241.67 1733.33 1250 1725C1575 1625 1750 1275 1650 950C1583.33 775 1458.33 641.667 1225 541.667Z" fill="white"/>
    </svg>
  ),
  usdt: (
    <svg viewBox="0 0 339.43 295.27" fill="none" className="w-full h-full">
      <path fill="#50AF95" d="M62.15,1.45l-61.89,130a2.52,2.52,0,0,0,.54,2.94L167.95,294.56a2.55,2.55,0,0,0,3.53,0L338.63,134.4a2.52,2.52,0,0,0,.54-2.94l-61.89-130A2.5,2.5,0,0,0,275,0H64.45A2.5,2.5,0,0,0,62.15,1.45Z"/>
      <path fill="#FFFFFF" d="M191.19,144.8v0c-1.2.09-7.4,0.46-21.23,0.46-11,0-18.81-.33-21.55-0.46v0c-42.51-1.87-74.24-9.27-74.24-18.13s31.73-16.25,74.24-18.15v28.91c2.78,0.2,10.74.67,21.74,0.67,13.2,0,19.81-.55,21-0.66v-28.9c42.42,1.89,74.08,9.29,74.08,18.13s-31.65,16.24-74.08,18.12h0Zm0-39.25V79.68h59.2V40.23H89.21V79.68H148.4v25.86c-48.11,2.21-84.29,11.74-84.29,23.16s36.18,20.94,84.29,23.16v82.9h42.78V151.83c48-2.21,84.12-11.73,84.12-23.14s-36.09-20.93-84.12-23.15h0Z"/>
    </svg>
  ),
  honey: (
    <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
      <defs>
        <linearGradient id="honeyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{stopColor:'#F59E0B'}}/>
          <stop offset="100%" style={{stopColor:'#D97706'}}/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#honeyGrad)"/>
      <text x="50" y="65" textAnchor="middle" fill="white" fontSize="40">🍯</text>
    </svg>
  ),
};

// Actual stablecoins supported by Bearo-iOS
const STABLECOINS = [
  {
    id: 'honey',
    symbol: 'HONEY',
    name: 'Bearo Honey',
    logo: StablecoinLogos.honey,
    color: 'from-bearo-honey to-bearo-amber',
    value: '$1.00',
    issuer: 'Bearo',
    explanation: 'Your money in Bearo. We handle which stablecoin to use so you never have to think about it.',
    funFact: 'Auto-converts for you',
    trustLevel: 'Your Money',
    isMain: true,
  },
  {
    id: 'usdc',
    symbol: 'USDC',
    name: 'USD Coin',
    logo: StablecoinLogos.usdc,
    color: 'from-blue-500 to-blue-600',
    value: '$1.00',
    issuer: 'Circle',
    explanation: 'Digital dollars backed by real US dollars in a bank. The most trusted stablecoin.',
    funFact: 'Used by millions daily',
    trustLevel: 'Very High',
    addresses: {
      base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      polygon: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    },
  },
  {
    id: 'usdt',
    symbol: 'USDT',
    name: 'Tether',
    logo: StablecoinLogos.usdt,
    color: 'from-green-500 to-emerald-500',
    value: '$1.00',
    issuer: 'Tether',
    explanation: 'The original digital dollar. Been around since 2014 and most traded globally.',
    funFact: 'Most traded globally',
    trustLevel: 'High',
    addresses: {
      base: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
      ethereum: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      polygon: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    },
  },
];

// Actual supported networks from Bearo-iOS chains.ts
const NETWORKS = [
  { 
    id: 'base', 
    name: 'Base', 
    chainId: 8453,
    logo: ChainLogos.base, 
    color: 'bg-[#0052FF]',
    description: 'Coinbase\'s fast & cheap network',
    isDefault: true,
  },
  { 
    id: 'ethereum', 
    name: 'Ethereum', 
    chainId: 1,
    logo: ChainLogos.ethereum, 
    color: 'bg-[#627EEA]',
    description: 'The original blockchain',
  },
  { 
    id: 'polygon', 
    name: 'Polygon', 
    chainId: 137,
    logo: ChainLogos.polygon, 
    color: 'bg-[#8247E5]',
    description: 'Fast & eco-friendly',
  },
];

export const StablecoinExplorer: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState<typeof STABLECOINS[0] | null>(null);
  const [showNetworks, setShowNetworks] = useState(false);
  const [showLearnMore, setShowLearnMore] = useState(false);
  const [activeNetwork, setActiveNetwork] = useState(NETWORKS[0]);
  const [beeAnimation, setBeeAnimation] = useState<any>(null);
  const [cryptoAnimation, setCryptoAnimation] = useState<any>(null);

  // Load animations
  useEffect(() => {
    // Load BEE-lieve animation for HONEY icon
    fetch('/animations/BEE-lieve.json')
      .then(res => res.json())
      .then(data => setBeeAnimation(data))
      .catch(() => console.log('BEE-lieve animation loading...'));

    // Load crypto animation overlay
    fetch('/animations/Crypto-animation.json')
      .then(res => res.json())
      .then(data => setCryptoAnimation(data))
      .catch(() => console.log('Crypto animation loading...'));
  }, []);

  return (
    <>
      {/* Floating Coin Button (Minimized State) */}
      {!isExpanded && (
        <motion.button
          onClick={() => setIsExpanded(true)}
          className="fixed bottom-6 left-6 z-50 group"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          {/* Crypto Animation Overlay - behind everything */}
          {cryptoAnimation && (
            <div className="absolute -inset-8 pointer-events-none opacity-60">
              <Lottie
                animationData={cryptoAnimation}
                loop={true}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          )}
          
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-bearo-honey to-bearo-amber rounded-full blur-xl opacity-50 group-hover:opacity-80 transition-opacity" />
          
          {/* Coin */}
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-bearo-honey via-yellow-400 to-bearo-amber flex items-center justify-center shadow-2xl border-4 border-yellow-300/50 overflow-hidden">
              {beeAnimation ? (
                <Lottie
                  animationData={beeAnimation}
                  loop={true}
                  style={{ width: '120%', height: '120%' }}
                />
              ) : (
                <span className="text-3xl">🍯</span>
              )}
            </div>
            
            {/* Orbiting stablecoin logos */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
              className="absolute inset-0"
            >
              <div className="absolute -top-1 left-1/2 w-5 h-5 -translate-x-1/2 rounded-full overflow-hidden shadow-lg bg-white">
                {/* USDC Logo */}
                <svg viewBox="0 0 2000 2000" className="w-full h-full">
                  <circle cx="1000" cy="1000" r="1000" fill="#2775CA"/>
                  <path d="M1275 1158.33C1275 1016.67 1191.67 966.667 1025 941.667C908.333 925 891.667 891.667 891.667 841.667C891.667 791.667 925 758.333 991.667 758.333C1050 758.333 1083.33 783.333 1100 841.667C1100 850 1108.33 858.333 1116.67 858.333H1166.67C1175 858.333 1183.33 850 1183.33 841.667V833.333C1166.67 733.333 1091.67 666.667 991.667 658.333V558.333C991.667 550 983.333 541.667 975 541.667H925C916.667 541.667 908.333 550 908.333 558.333V658.333C783.333 675 700 766.667 700 883.333C700 1016.67 783.333 1075 950 1100C1058.33 1116.67 1083.33 1141.67 1083.33 1200C1083.33 1258.33 1033.33 1300 966.667 1300C875 1300 841.667 1258.33 825 1200C825 1191.67 816.667 1183.33 808.333 1183.33H750C741.667 1183.33 733.333 1191.67 733.333 1200V1208.33C750 1316.67 825 1391.67 916.667 1408.33V1508.33C916.667 1516.67 925 1525 933.333 1525H983.333C991.667 1525 1000 1516.67 1000 1508.33V1408.33C1125 1383.33 1208.33 1291.67 1208.33 1158.33H1275Z" fill="white"/>
                </svg>
              </div>
            </motion.div>
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 10, ease: 'linear' }}
              className="absolute inset-0"
            >
              <div className="absolute -bottom-1 left-1/2 w-4 h-4 -translate-x-1/2 rounded-full overflow-hidden shadow-lg">
                {/* USDT Logo */}
                <svg viewBox="0 0 339.43 295.27" className="w-full h-full">
                  <path fill="#50AF95" d="M62.15,1.45l-61.89,130a2.52,2.52,0,0,0,.54,2.94L167.95,294.56a2.55,2.55,0,0,0,3.53,0L338.63,134.4a2.52,2.52,0,0,0,.54-2.94l-61.89-130A2.5,2.5,0,0,0,275,0H64.45A2.5,2.5,0,0,0,62.15,1.45Z"/>
                  <path fill="#FFFFFF" d="M191.19,144.8v0c-1.2.09-7.4,0.46-21.23,0.46-11,0-18.81-.33-21.55-0.46v0c-42.51-1.87-74.24-9.27-74.24-18.13s31.73-16.25,74.24-18.15v28.91c2.78,0.2,10.74.67,21.74,0.67,13.2,0,19.81-.55,21-0.66v-28.9c42.42,1.89,74.08,9.29,74.08,18.13s-31.65,16.24-74.08,18.12h0Zm0-39.25V79.68h59.2V40.23H89.21V79.68H148.4v25.86c-48.11,2.21-84.29,11.74-84.29,23.16s36.18,20.94,84.29,23.16v82.9h42.78V151.83c48-2.21,84.12-11.73,84.12-23.14s-36.09-20.93-84.12-23.15h0Z"/>
                </svg>
              </div>
            </motion.div>
            
            {/* Pulse ring */}
            <div className="absolute inset-0 rounded-full border-2 border-bearo-honey animate-ping opacity-50" />
            
            {/* Badge */}
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white text-black text-xs font-bold flex items-center justify-center shadow-lg">
              $1
            </div>
          </div>
          
          {/* Label */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <span className="text-[10px] text-white/60 bg-black/50 px-2 py-1 rounded-full backdrop-blur-sm">
              What is HONEY?
            </span>
          </div>
        </motion.button>
      )}

      {/* Expanded Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-6 left-6 z-50"
          >
            <div className="relative group">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-bearo-honey/20 to-bearo-amber/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500" />
              
              {/* Card */}
              <div className="relative backdrop-blur-2xl bg-gradient-to-br from-black/90 via-black/85 to-black/90 border border-white/10 rounded-3xl shadow-2xl w-80 max-h-[600px] overflow-hidden">
                
                {/* Header */}
                <div className="p-4 border-b border-white/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="w-8 h-8"
                      >
                        {beeAnimation ? (
                          <Lottie
                            animationData={beeAnimation}
                            loop={true}
                            style={{ width: '100%', height: '100%' }}
                          />
                        ) : (
                          <span className="text-2xl">🍯</span>
                        )}
                      </motion.div>
                      <div>
                        <div className="text-white font-bold text-sm">What is HONEY?</div>
                        <div className="text-white/50 text-xs">Your digital dollars explained</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsExpanded(false)}
                      className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                    >
                      <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Main Explanation */}
                <div className="p-4 space-y-4 max-h-[480px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                  
                  {/* Hero Card - HONEY */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl bg-gradient-to-br from-bearo-honey/20 to-bearo-amber/10 border border-bearo-honey/30"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-bearo-honey to-bearo-amber flex items-center justify-center shadow-lg overflow-hidden">
                        {beeAnimation ? (
                          <Lottie
                            animationData={beeAnimation}
                            loop={true}
                            style={{ width: '130%', height: '130%' }}
                          />
                        ) : (
                          <span className="text-2xl">🍯</span>
                        )}
                      </div>
                      <div>
                        <div className="text-white font-bold">Your Money = HONEY</div>
                        <div className="text-bearo-honey text-sm font-semibold">Always worth $1.00</div>
                      </div>
                    </div>
                    <p className="text-white/70 text-sm leading-relaxed">
                      When you add money to Bearo, it becomes <span className="text-bearo-honey font-semibold">HONEY</span>. 
                      Think of it like your digital wallet balance—always worth exactly $1 per HONEY.
                    </p>
                  </motion.div>

                  {/* The Secret */}
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-bearo-honey">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                      <span className="text-white/80 text-sm font-semibold">The Magic Behind HONEY</span>
                    </div>
                    <p className="text-white/60 text-xs leading-relaxed">
                      Behind the scenes, we use "stablecoins"—digital dollars that are always worth $1. 
                      We automatically pick the best one for each transaction so you don't have to think about it.
                    </p>
                  </div>

                  {/* Learn More Collapsible - Stablecoins */}
                  <div>
                    <button
                      onClick={() => setShowLearnMore(!showLearnMore)}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                          <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                        </svg>
                        <span className="text-white/80 text-sm font-medium">Stablecoins we use</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          <div className="w-5 h-5 rounded-full overflow-hidden border border-black/50">
                            {StablecoinLogos.usdc}
                          </div>
                          <div className="w-5 h-5 rounded-full overflow-hidden border border-black/50">
                            {StablecoinLogos.usdt}
                          </div>
                        </div>
                        <motion.svg 
                          animate={{ rotate: showLearnMore ? 180 : 0 }}
                          className="w-4 h-4 text-white/40"
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </motion.svg>
                      </div>
                    </button>
                    
                    <AnimatePresence>
                      {showLearnMore && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-3 space-y-2">
                            {STABLECOINS.filter(c => !c.isMain).map((coin, i) => (
                              <motion.button
                                key={coin.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                onClick={() => setSelectedCoin(selectedCoin?.id === coin.id ? null : coin)}
                                className={`w-full p-3 rounded-xl transition-all ${
                                  selectedCoin?.id === coin.id 
                                    ? 'bg-white/10 border border-white/20' 
                                    : 'bg-white/5 border border-transparent hover:bg-white/10'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-lg overflow-hidden bg-gradient-to-br ${coin.color} flex items-center justify-center shadow-lg p-1`}>
                                    {coin.logo}
                                  </div>
                                  <div className="flex-1 text-left">
                                    <div className="flex items-center gap-2">
                                      <span className="text-white font-semibold text-sm">{coin.symbol}</span>
                                      <span className="text-white/40 text-xs">{coin.name}</span>
                                    </div>
                                    <div className="text-bearo-honey text-xs font-medium">{coin.value}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-[10px] text-white/40">{coin.issuer}</div>
                                  </div>
                                </div>
                                
                                {/* Expanded details */}
                                <AnimatePresence>
                                  {selectedCoin?.id === coin.id && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="mt-3 pt-3 border-t border-white/10">
                                        <p className="text-white/60 text-xs mb-2">{coin.explanation}</p>
                                        <div className="flex items-center justify-between">
                                          <span className="text-[10px] text-white/40">{coin.funFact}</span>
                                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                                            {coin.trustLevel}
                                          </span>
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </motion.button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Networks Collapsible */}
                  <div>
                    <button
                      onClick={() => setShowNetworks(!showNetworks)}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                          <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                        </svg>
                        <span className="text-white/80 text-sm font-medium">Works on {NETWORKS.length} networks</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {NETWORKS.map((n) => (
                            <div key={n.id} className={`w-5 h-5 rounded-full overflow-hidden ${n.color} flex items-center justify-center border border-black/50 p-0.5`}>
                              {n.logo}
                            </div>
                          ))}
                        </div>
                        <motion.svg 
                          animate={{ rotate: showNetworks ? 180 : 0 }}
                          className="w-4 h-4 text-white/40"
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </motion.svg>
                      </div>
                    </button>
                    
                    <AnimatePresence>
                      {showNetworks && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-3 space-y-2">
                            {NETWORKS.map((network, i) => (
                              <motion.button
                                key={network.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                onClick={() => setActiveNetwork(network)}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                                  activeNetwork.id === network.id 
                                    ? 'bg-white/10 border border-white/20' 
                                    : 'bg-white/5 border border-transparent hover:bg-white/10'
                                }`}
                              >
                                <div className={`w-10 h-10 rounded-lg ${network.color} flex items-center justify-center shadow-lg overflow-hidden p-1.5`}>
                                  {network.logo}
                                </div>
                                <div className="flex-1 text-left">
                                  <div className="flex items-center gap-2">
                                    <span className="text-white font-semibold text-sm">{network.name}</span>
                                    {network.isDefault && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-bearo-honey/20 text-bearo-honey font-medium">
                                        DEFAULT
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-white/40 text-xs">{network.description}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-[10px] text-white/30">Chain {network.chainId}</div>
                                </div>
                              </motion.button>
                            ))}
                          </div>
                          <p className="text-white/40 text-[10px] text-center mt-3 px-2">
                            We auto-pick the fastest & cheapest network for you
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Bottom Message */}
                  <div className="p-3 rounded-xl bg-gradient-to-r from-bearo-honey/10 to-transparent border border-bearo-honey/20">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-bearo-honey/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-bearo-honey">
                          <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-white/80 text-xs font-medium mb-1">You don't need to understand any of this!</p>
                        <p className="text-white/50 text-[11px] leading-relaxed">
                          Bearo handles all the technical stuff. Just add money, and spend it anywhere. That's it.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Footer hint */}
                  <div className="flex items-center justify-center gap-2 text-white/30 text-[10px] pt-2">
                    <div className="w-1 h-1 rounded-full bg-bearo-honey animate-pulse" />
                    <span>HONEY = Your money, simplified</span>
                    <div className="w-1 h-1 rounded-full bg-bearo-honey animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        .scrollbar-thumb-white\/10::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
        }
        .scrollbar-track-transparent::-webkit-scrollbar-track {
          background-color: transparent;
        }
      `}</style>
    </>
  );
};

export default StablecoinExplorer;
