import React, { useRef, useEffect, useState } from 'react';
import Lottie from 'lottie-react';
import { PhoneFrame } from './PhoneFrame';
import { FeatureProps } from '../types';

type AnimationData = Record<string, unknown>;

interface CryptoToken {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  image: string;
}

export const FeatureSection: React.FC<FeatureProps> = ({
  title,
  description,
  imageType,
  align = 'left',
  theme = 'black',
  comingSoon = false
}) => {
  const sectionRef = useRef<HTMLElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [cryptoData, setCryptoData] = useState<CryptoToken[]>([]);
  const [loadingCrypto, setLoadingCrypto] = useState(true);
  const [bitcoinTouchAnimation, setBitcoinTouchAnimation] = useState<AnimationData | null>(null);

  // Load BitcoinTouch animation for payments section
  useEffect(() => {
    if (imageType === 'payments') {
      fetch('/animations/BitcoinTouch.json')
        .then(res => res.json())
        .then(data => setBitcoinTouchAnimation(data))
        .catch(() => console.log('BitcoinTouch animation loading...'));
    }
  }, [imageType]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.2 }
    );

    const handleScroll = () => {
      if (sectionRef.current) {
        const rect = sectionRef.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const progress = Math.max(0, Math.min(1, 1 - (rect.top / windowHeight)));
        setScrollProgress(progress);
      }
    };

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Fetch real cryptocurrency data from CoinGecko
  useEffect(() => {
    if (imageType === 'trading') {
      const fetchCryptoData = async () => {
        try {
          // Fetch data for popular memecoins and relevant tokens
          const response = await fetch(
            'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=berachain-bera,dogecoin,pepe,shiba-inu,bonk,floki&order=market_cap_desc&sparkline=false&price_change_percentage=24h'
          );
          
          if (!response.ok) throw new Error('Failed to fetch');
          
          const data = await response.json();
          
          const formattedData: CryptoToken[] = data.map((coin: any) => ({
            id: coin.id,
            symbol: coin.symbol.toUpperCase(),
            name: coin.name,
            price: coin.current_price,
            change24h: coin.price_change_percentage_24h || 0,
            image: coin.image
          }));
          
          setCryptoData(formattedData);
          setLoadingCrypto(false);
        } catch (error) {
          console.error('Error fetching crypto data:', error);
          // Fallback to default data if API fails
          setCryptoData([
            { id: 'berachain-bera', symbol: 'BERA', name: 'Berachain', price: 4.20, change24h: 15.2, image: 'https://assets.coingecko.com/coins/images/43596/small/berachain-bera-logo.png' },
            { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', price: 0.42, change24h: -2.1, image: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png' },
            { id: 'pepe', symbol: 'PEPE', name: 'Pepe', price: 0.00001242, change24h: 12.4, image: 'https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg' },
            { id: 'shiba-inu', symbol: 'SHIB', name: 'Shiba Inu', price: 0.00002451, change24h: 5.3, image: 'https://assets.coingecko.com/coins/images/11939/small/shiba.png' },
          ]);
          setLoadingCrypto(false);
        }
      };

      fetchCryptoData();
      // Refresh data every 30 seconds
      const interval = setInterval(fetchCryptoData, 30000);
      return () => clearInterval(interval);
    }
  }, [imageType]);

  const themes = {
    black: {
      bg: 'bg-bearo-dark',
      text: 'text-white',
      accent: 'text-gradient',
      muted: 'text-white/50'
    },
    white: {
      bg: 'bg-[#fafafa]',
      text: 'text-black',
      accent: 'text-bearo-honey',
      muted: 'text-black/50'
    },
    green: {
      bg: 'bg-gradient-to-br from-bearo-honey to-bearo-amber',
      text: 'text-black',
      accent: 'text-black',
      muted: 'text-black/60'
    }
  };

  const t = themes[theme];

  // Cash App style transforms based on scroll
  const phoneScale = 0.95 + (scrollProgress * 0.05);
  const phoneOpacity = 0.7 + (scrollProgress * 0.3);
  const textTranslate = isInView ? 0 : 30;

  const renderPhoneContent = () => {
    if (imageType === 'payments') {
      return (
        <div className="flex flex-col h-full bg-gradient-to-b from-[#0a0a0a] to-[#0f0f0f] scale-[0.9] origin-top">
          {/* BitcoinTouch Animation */}
          {bitcoinTouchAnimation && (
            <div className="flex justify-center pt-4 pb-2">
              <div className="w-20 h-20">
                <Lottie
                  animationData={bitcoinTouchAnimation}
                  loop={true}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            </div>
          )}

          {/* Recipient - Compact */}
          <div className={`${bitcoinTouchAnimation ? 'pt-2' : 'pt-5'} text-center`}>
            <div className="w-14 h-14 mx-auto mb-2 rounded-xl bg-gradient-to-br from-rose-400 to-pink-600 flex items-center justify-center shadow-lg shadow-pink-500/20">
              <span className="text-xl font-display font-bold text-white">S</span>
            </div>
            <h3 className="text-base font-display font-semibold text-white">Sarah Mitchell</h3>
            <p className="text-bearo-honey text-xs font-medium mt-0.5">@sarahmitchell</p>
          </div>

          {/* Amount - Compact */}
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Sending</p>
            <div className="text-4xl font-display font-bold text-white tracking-tight">$50</div>
            <p className="text-white/40 mt-2 text-xs">for dinner</p>
          </div>

          {/* Pay Button - Compact */}
          <div className="p-4">
            <div className="relative rounded-xl p-[2px] bg-gradient-to-r from-orange-500 via-purple-500 via-blue-500 to-green-500 bg-[length:200%_100%] animate-shimmer">
              <button className="w-full py-3 bg-black text-white font-semibold rounded-[10px] text-sm">
                Pay $50.00
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (imageType === 'card') {
      return (
        <div className="flex flex-col h-full bg-gradient-to-b from-[#fafafa] to-[#f0f0f0] relative overflow-hidden scale-[0.9] origin-top">
          {/* Subtle pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, black 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }} />

          {/* Card - Compact */}
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="w-full aspect-[1.586] relative">
              {/* Card Shadow */}
              <div className="absolute inset-0 bg-black/20 rounded-xl blur-xl translate-y-3" />

              {/* Card Body */}
              <div className="relative w-full h-full bg-gradient-to-br from-[#1a1a1a] via-[#2a2a2a] to-[#1a1a1a] rounded-xl p-4 flex flex-col justify-between overflow-hidden">
                {/* Card Shine */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent" />

                {/* Top Row */}
                <div className="flex justify-between items-start relative z-10">
                  <div className="flex flex-col">
                    <span className="text-white/40 text-[8px] uppercase tracking-widest">Bearo</span>
                    <span className="text-white font-display font-bold text-sm tracking-tight">Card</span>
                  </div>
                  <div className="w-8 h-5 bg-gradient-to-br from-amber-300 to-amber-500 rounded" />
                </div>

                {/* Card Number */}
                <div className="relative z-10">
                  <p className="text-white/60 font-mono text-xs tracking-[0.2em]">•••• •••• •••• 4242</p>
                </div>

                {/* Bottom Row */}
                <div className="flex justify-between items-end relative z-10">
                  <div>
                    <p className="text-white/40 text-[6px] uppercase tracking-wider">Valid Thru</p>
                    <p className="text-white text-xs font-medium">12/28</p>
                  </div>
                  <div className="w-10 h-6 rounded border border-bearo-honey/50 flex items-center justify-center">
                    <span className="text-bearo-honey font-display font-bold text-xs">B</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card Controls - Compact */}
          <div className="p-4 bg-white border-t border-black/5">
            <div className="flex justify-around">
              {[
                { name: 'Lock', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> },
                { name: 'Details', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
                { name: 'Settings', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> }
              ].map((item) => (
                <button key={item.name} className="flex flex-col items-center gap-1">
                  <div className="w-9 h-9 rounded-lg bg-black/5 flex items-center justify-center text-black/60">
                    {item.icon}
                  </div>
                  <span className="text-[10px] font-medium text-black/60">{item.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (imageType === 'investing') {
      return (
        <div className="flex flex-col h-full bg-gradient-to-b from-[#0a0a0a] to-[#0f0f0f] scale-[0.9] origin-top">
          {/* Header - HONEY Wallet */}
          <div className="p-4 pb-2">
            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Your Balance</p>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-3xl font-display font-bold text-white">1,250.00</span>
              <span className="text-lg font-bold text-bearo-honey">HONEY</span>
            </div>
            <p className="text-xs text-white/50">≈ $1,250.00 USD</p>
          </div>

          {/* Stablecoin Options */}
          <div className="px-4 py-3">
            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2">Select Currency</p>
            <div className="space-y-2">
              {[
                { symbol: 'HONEY', name: 'Berachain USDC', icon: <div className="w-6 h-6 rounded-full bg-gradient-to-br from-bearo-honey to-bearo-amber flex items-center justify-center"><span className="text-[10px] font-bold text-black">H</span></div>, active: true },
                { symbol: 'USD', name: 'US Dollar', icon: <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center"><span className="text-[10px] font-bold text-white">$</span></div>, active: false },
                { symbol: 'EUR', name: 'Euro', icon: <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center"><span className="text-[10px] font-bold text-white">€</span></div>, active: false },
                { symbol: 'GBP', name: 'British Pound', icon: <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center"><span className="text-[10px] font-bold text-white">£</span></div>, active: false },
              ].map((currency) => (
                <div
                  key={currency.symbol}
                  className={`flex items-center justify-between p-2.5 rounded-xl transition-all ${
                    currency.active
                      ? 'bg-bearo-honey/20 border border-bearo-honey/30'
                      : 'bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {currency.icon}
                    <div>
                      <p className={`text-xs font-semibold ${currency.active ? 'text-bearo-honey' : 'text-white'}`}>
                        {currency.symbol}
                      </p>
                      <p className="text-[9px] text-white/40">{currency.name}</p>
                    </div>
                  </div>
                  {currency.active && (
                    <svg className="w-4 h-4 text-bearo-honey" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions - Compact */}
          <div className="p-4 pt-2 mt-auto grid grid-cols-2 gap-2">
            <button className="py-2.5 rounded-lg bg-white/10 text-white font-semibold text-xs">
              Withdraw
            </button>
            <div className="relative rounded-lg p-[2px] bg-gradient-to-r from-orange-500 via-purple-500 via-blue-500 to-green-500 bg-[length:200%_100%] animate-shimmer">
              <button className="w-full py-2.5 rounded-[6px] bg-black text-white font-semibold text-xs">
                Add Money
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (imageType === 'rewards') {
      return (
        <div className="flex flex-col h-full bg-gradient-to-b from-[#0a0a0a] to-[#0f0f0f] scale-[0.9] origin-top">
          {/* Header - BEARCO Points */}
          <div className="p-4 pb-2 text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-bearo-honey to-bearo-amber flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </div>
            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Your BEARCO Points</p>
            <div className="flex items-baseline justify-center gap-1 mb-1">
              <span className="text-3xl font-display font-bold text-white">2,450</span>
              <span className="text-sm font-bold text-bearo-honey">BEARCO</span>
            </div>
            <p className="text-xs text-white/50">≈ $24.50 in rewards</p>
          </div>

          {/* How to Earn */}
          <div className="px-4 py-3 flex-1">
            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2">Earn More</p>
            <div className="space-y-2">
              {[
                { action: 'Send Money', points: '+10', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
                { action: 'Refer a Friend', points: '+500', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
                { action: 'First Purchase', points: '+100', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg> },
                { action: 'Weekly Streak', points: '+50', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> },
              ].map((item) => (
                <div
                  key={item.action}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/5"
                >
                  <div className="flex items-center gap-2 text-white/60">
                    {item.icon}
                    <span className="text-xs text-white">{item.action}</span>
                  </div>
                  <span className="text-xs font-bold text-bearo-honey">{item.points}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Redeem Button */}
          <div className="p-4 pt-2">
            <div className="relative rounded-lg p-[2px] bg-gradient-to-r from-orange-500 via-purple-500 via-blue-500 to-green-500 bg-[length:200%_100%] animate-shimmer">
              <button className="w-full py-2.5 rounded-[6px] bg-black text-white font-semibold text-xs">
                Redeem Rewards
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (imageType === 'trading') {
      const formatPrice = (price: number) => {
        if (price < 0.01) {
          return `$${price.toFixed(8)}`;
        } else if (price < 1) {
          return `$${price.toFixed(5)}`;
        } else {
          return `$${price.toFixed(2)}`;
        }
      };

      const formatChange = (change: number) => {
        const sign = change >= 0 ? '+' : '';
        return `${sign}${change.toFixed(1)}%`;
      };

      return (
        <div className="flex flex-col h-full bg-gradient-to-b from-[#fafafa] to-[#f0f0f0] scale-[0.9] origin-top relative overflow-hidden">
          {/* Subtle pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, black 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }} />

          {/* Header */}
          <div className="p-4 pb-2 relative z-10">
            <p className="text-[10px] text-black/40 uppercase tracking-widest mb-2">Trending Memecoins</p>
          </div>

          {/* Token List */}
          <div className="px-4 py-2 flex-1 relative z-10">
            {loadingCrypto ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
              </div>
            ) : (
              <div className="space-y-2">
                {cryptoData.slice(0, 4).map((token) => (
                  <div
                    key={token.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-black/5 hover:border-black/10 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <img 
                        src={token.image} 
                        alt={token.name}
                        className="w-7 h-7 rounded-full"
                        onError={(e) => {
                          // Fallback if image fails to load
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <div>
                        <p className="text-xs font-semibold text-black">{token.symbol}</p>
                        <p className="text-[9px] text-black/40">{token.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-black">{formatPrice(token.price)}</p>
                      <p className={`text-[9px] font-medium ${token.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {formatChange(token.change24h)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Trade Button */}
          <div className="p-4 pt-2 relative z-10">
            <div className="relative rounded-lg p-[2px] bg-gradient-to-r from-orange-500 via-purple-500 via-blue-500 to-green-500 bg-[length:200%_100%] animate-shimmer">
              <button className="w-full py-2.5 rounded-[6px] bg-black text-white font-semibold text-xs hover:bg-black/90 transition-colors">
                Start Trading
              </button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <section
      ref={sectionRef}
      className={`py-24 min-h-screen flex items-center relative overflow-hidden ${t.bg}`}
    >
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        {theme === 'black' && (
          <>
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-bearo-honey/5 rounded-full blur-[150px]" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-900/10 rounded-full blur-[100px]" />
          </>
        )}
        {theme === 'white' && (
          <div className="absolute inset-0 opacity-[0.02]" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, black 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }} />
        )}
        {theme === 'green' && (
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/10" />
        )}
      </div>

      <div className="max-w-7xl mx-auto px-8 relative z-10">
        <div className={`flex flex-col lg:flex-row items-center gap-12 lg:gap-20 ${align === 'right' ? 'lg:flex-row-reverse' : ''}`}>

          {/* Text Content - with scroll animation */}
          <div
            className="flex-1 text-center lg:text-left max-w-xl transition-all duration-700"
            style={{
              transform: `translateY(${textTranslate}px)`,
              opacity: isInView ? 1 : 0
            }}
          >
            {comingSoon && (
              <div className="inline-flex items-center gap-3 mb-6">
                <span className="px-4 py-1.5 rounded-full text-sm font-semibold coming-soon-shimmer border border-white/10 text-white/90 flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  Coming Soon
                </span>
                <span className="px-4 py-1.5 rounded-full text-sm font-medium bg-bearo-honey/10 border border-bearo-honey/20 text-bearo-honey flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                  On Roadmap
                </span>
              </div>
            )}
            <h2 className={`font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-[0.95] mb-6 tracking-tight ${t.accent}`}>
              {title}
            </h2>
            <p className={`text-base md:text-lg font-body font-light leading-relaxed ${t.muted}`}>
              {description}
            </p>

            {/* Learn More Link */}
            <a href="#" className={`inline-flex items-center gap-2 mt-8 text-base font-medium ${theme === 'green' ? 'text-black' : 'text-bearo-honey'} group`}>
              {comingSoon ? 'Get notified' : 'Learn more'}
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
              </svg>
            </a>
          </div>

          {/* Phone Visual - Cash App style scroll focus */}
          <div className="flex-1 flex justify-center">
            <div
              className="relative group transition-all duration-500"
              style={{
                transform: `scale(${phoneScale})`,
                opacity: phoneOpacity
              }}
            >
              {/* Glow Effect */}
              <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[450px] rounded-full blur-[80px] transition-opacity duration-700 ${
                isInView ? 'opacity-60' : 'opacity-0'
              } ${
                theme === 'white' ? 'bg-bearo-honey/20' : 'bg-bearo-honey/15'
              }`} />

              <div className={`transition-all duration-700 ease-out ${isInView ? 'translate-y-0' : 'translate-y-8'}`}>
                <PhoneFrame>
                  {renderPhoneContent()}
                </PhoneFrame>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
