import React from 'react';

export const Footer: React.FC = () => {
  const footerLinks = {
    Product: ['Features', 'Pricing', 'Security', 'Business'],
    Company: ['About', 'Careers', 'Press', 'Blog'],
    Resources: ['Help Center', 'Contact', 'Privacy', 'Terms'],
    Social: ['Twitter', 'Instagram', 'LinkedIn', 'YouTube']
  };

  return (
    <footer className="bg-bearo-dark border-t border-white/5">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12 lg:gap-8">

          {/* Brand Column */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <img
                src="/images/BearoApp.png"
                alt="Bearo"
                className="w-16 h-16"
              />
            </div>
            <p className="text-white/40 text-sm leading-relaxed mb-8 max-w-xs font-body">
              Bearified Instant Payments. The simplest way to send, spend, and invest your money.
              Available on iOS and Android.
            </p>

            {/* App Store Buttons with Rainbow Border */}
            <div className="flex flex-wrap gap-3">
              <a href="#" className="group relative rounded-xl p-[2px] bg-gradient-to-r from-orange-500 via-purple-500 via-blue-500 to-green-500 bg-[length:200%_100%] animate-shimmer hover:scale-105 transition-transform duration-300">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-black rounded-[10px]">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  <span className="text-white text-sm font-medium">App Store</span>
                </div>
              </a>
              <a href="#" className="group relative rounded-xl p-[2px] bg-gradient-to-r from-orange-500 via-purple-500 via-blue-500 to-green-500 bg-[length:200%_100%] animate-shimmer hover:scale-105 transition-transform duration-300">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-black rounded-[10px]">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.5,12.92 20.16,13.19L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                  </svg>
                  <span className="text-white text-sm font-medium">Google Play</span>
                </div>
              </a>
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-white font-semibold text-sm mb-4">{category}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-white/40 text-sm hover:text-white transition-colors duration-200 font-body"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-3">
            <p className="text-white/30 text-xs font-body">
              © {new Date().getFullYear()} Bearo Inc. All rights reserved.
            </p>
            <div className="flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/30">
                <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              <a href="https://bearo.cash" className="text-white/40 text-xs hover:text-bearo-honey transition-colors">bearo.cash</a>
              <span className="text-white/20 mx-1">·</span>
              <a href="https://bearo.money" className="text-white/40 text-xs hover:text-bearo-honey transition-colors">bearo.money</a>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-white/30 text-xs font-body max-w-3xl">
              P2P payment services are provided by BearifiedCo LLC. Bearo is a decentralized protocol powered by Berachain. 
              Not a bank. Funds are held in blockchain wallets.
            </p>
            <p className="text-white/20 text-[10px] font-body">
              Roadmap: Brokerage services and FINRA/SIPC membership coming soon
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
