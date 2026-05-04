import type { Metadata } from "next";
import Link from "next/link";
import { ReferralClient } from "./referral-client";
import { ANDROID_WAITLIST_LABEL, IOS_TESTFLIGHT_URL } from "../../../lib/downloadLinks";

/**
 * ANTI-FARMING NOTES FOR $BEARCO AIRDROP (server-side enforcement):
 *
 * 1. Referral only counts if the referred user completes their first top-up
 *    (validated in Supabase Edge Function: handle-referrals -> "complete" action)
 *
 * 2. Same device/IP should not be able to create multiple referral accounts
 *    - Implement device fingerprinting on signup (deviceId from app, IP from API)
 *    - Flag accounts sharing device_id or IP within 24h window
 *    - Store device_id + IP hash in users table for cross-reference
 *
 * 3. Minimum transaction activity required for airdrop eligibility
 *    - At least 1 completed top-up (minimum $5)
 *    - At least 1 outgoing payment to a different user
 *    - Account must be >7 days old at airdrop snapshot
 *
 * 4. Referral chain depth limit
 *    - Already prevents circular referrals (A->B->A)
 *    - Consider capping referral rewards at 50 per referrer per week
 *
 * 5. Velocity checks
 *    - Rate-limit referral link visits per IP (e.g., 10/hour)
 *    - Flag referral codes with >20 signups in 24h for manual review
 */

interface ReferPageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({
  params,
}: ReferPageProps): Promise<Metadata> {
  const { code } = await params;
  const displayCode = code.toUpperCase();

  return {
    title: `Join Bearo - Invited by ${displayCode}`,
    description:
      "You have been invited to Bearo - the instant crypto payments app. Download now and send money instantly to anyone, anywhere.",
    openGraph: {
      type: "website",
      url: `https://bearo.cash/refer/${displayCode}`,
      siteName: "Bearo",
      title: `Join Bearo - Invited by ${displayCode}`,
      description:
        "You have been invited to Bearo - the instant crypto payments app. Download now and get started.",
      images: [
        {
          url: "https://bearo.cash/images/BearoApp.png",
          width: 1024,
          height: 1024,
          alt: "Bearo - Bearified Instant Payments",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: "@BearifiedCo",
      title: `Join Bearo - Invited by ${displayCode}`,
      description:
        "You have been invited to Bearo - the instant crypto payments app. Download now and get started.",
      images: [
        {
          url: "https://bearo.cash/images/BearoApp.png",
          alt: "Bearo - Bearified Instant Payments",
        },
      ],
    },
  };
}

export default async function ReferPage({ params }: ReferPageProps) {
  const { code } = await params;
  const displayCode = code.toUpperCase();

  return (
    <main className="min-h-screen bg-[#0a0a0b] text-white flex flex-col">
      {/* Header */}
      <header className="w-full px-6 pt-8 pb-4">
        <Link href="/" className="inline-block">
          <img
            src="/images/BearoApp.png"
            alt="Bearo"
            className="w-16 h-16 rounded-2xl"
          />
        </Link>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12 -mt-8">
        {/* Bear Logo */}
        <div className="mb-8">
          <img
            src="/images/BearoApp.png"
            alt="Bearo"
            className="w-28 h-28 rounded-3xl shadow-lg shadow-orange-500/20"
          />
        </div>

        {/* Invitation Text */}
        <h1 className="text-3xl sm:text-4xl font-bold text-center mb-3">
          You have been invited to{" "}
          <span className="text-[#f97316]">Bearo</span>!
        </h1>
        <p className="text-gray-400 text-center text-lg mb-2 max-w-md">
          Instant crypto payments. Send money to anyone, anywhere.
        </p>

        {/* Referral Code Badge */}
        <div className="mt-4 mb-8 px-5 py-3 rounded-2xl bg-white/5 border border-white/10">
          <p className="text-sm text-gray-400 text-center">Referral Code</p>
          <p className="text-2xl font-mono font-bold text-[#f97316] text-center tracking-wider">
            {displayCode}
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="w-full max-w-sm space-y-3">
          {/* Primary: App Store / TestFlight */}
          <a
            href={IOS_TESTFLIGHT_URL}
            className="block w-full text-center py-4 px-6 rounded-2xl font-semibold text-lg rainbow-border text-white transition-transform active:scale-[0.98]"
            style={{
              background:
                "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
            }}
          >
            Download Bearo
          </a>

          {/* Secondary: Google Play (coming soon) */}
          <div className="block w-full text-center py-4 px-6 rounded-2xl font-medium text-gray-500 bg-white/5 border border-white/10 cursor-default">
            {ANDROID_WAITLIST_LABEL}
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-12 w-full max-w-sm">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 text-center">
            How It Works
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-[#f97316]/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[#f97316] font-bold text-sm">1</span>
              </div>
              <div>
                <p className="text-white font-medium">Download Bearo</p>
                <p className="text-gray-500 text-sm">
                  Get the app from the App Store or TestFlight
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-[#f97316]/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[#f97316] font-bold text-sm">2</span>
              </div>
              <div>
                <p className="text-white font-medium">
                  Enter referral code{" "}
                  <span className="text-[#f97316] font-mono">
                    {displayCode}
                  </span>
                </p>
                <p className="text-gray-500 text-sm">
                  Link the code during signup to earn $BEARCO rewards
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-[#f97316]/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[#f97316] font-bold text-sm">3</span>
              </div>
              <div>
                <p className="text-white font-medium">Send your first payment</p>
                <p className="text-gray-500 text-sm">
                  Top up and pay anyone instantly with zero gas fees
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full px-6 py-6 text-center">
        <p className="text-gray-600 text-xs">
          BearifiedCo LLC. Crypto payments made simple.
        </p>
        <div className="flex justify-center gap-4 mt-2">
          <Link
            href="/privacy"
            className="text-gray-600 text-xs hover:text-gray-400 transition-colors"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="text-gray-600 text-xs hover:text-gray-400 transition-colors"
          >
            Terms
          </Link>
        </div>
      </footer>

      {/* Client component handles deep link attempt + cookie storage */}
      <ReferralClient code={displayCode} />
    </main>
  );
}
