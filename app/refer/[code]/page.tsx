import type { Metadata } from "next";
import Link from "next/link";
import { ReferralClient } from "./referral-client";

interface ReferPageProps {
  params: Promise<{ code: string }>;
}

const REFERRAL_CODE_PATTERN = /^BEAR[A-Z0-9]{4}$/;

export async function generateMetadata({
  params,
}: ReferPageProps): Promise<Metadata> {
  const { code } = await params;
  const displayCode = code.toUpperCase();

  return {
    title: `Claim Bearo Invite - ${displayCode}`,
    description: "Claim your Bearo beta invite.",
    openGraph: {
      type: "website",
      url: `https://bearo.cash/refer/${displayCode}`,
      siteName: "Bearo",
      title: "Claim your Bearo invite",
      description: "You were invited to join the Bearo beta.",
      images: [
        {
          url: "https://bearo.cash/images/BearoApp.png",
          width: 1024,
          height: 1024,
          alt: "Bearo",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: "@BearifiedCo",
      title: "Claim your Bearo invite",
      description: "You were invited to join the Bearo beta.",
      images: ["https://bearo.cash/images/BearoApp.png"],
    },
  };
}

export default async function ReferPage({ params }: ReferPageProps) {
  const { code } = await params;
  const displayCode = code.toUpperCase();
  const isValidCode = REFERRAL_CODE_PATTERN.test(displayCode);

  return (
    <main className="min-h-screen bg-[#0a0a0b] text-white">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-8">
        <Link href="/" aria-label="Bearo home" className="inline-flex items-center gap-3">
          <img
            src="/images/BearoApp.png"
            alt="Bearo"
            className="h-12 w-12 rounded-2xl"
          />
          <span className="text-lg font-bold">Bearo</span>
        </Link>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-112px)] w-full max-w-5xl flex-col items-center justify-center px-6 pb-16 pt-4">
        <div className="mb-8">
          <img
            src="/images/BearoApp.png"
            alt="Bearo"
            className="h-28 w-28 rounded-3xl shadow-lg shadow-orange-500/20"
          />
        </div>

        <div className="mb-7 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-center">
          <p className="text-xs font-medium uppercase text-white/40">Referral Code</p>
          <p className="mt-1 font-mono text-2xl font-bold tracking-wide text-[#f97316]">
            {displayCode}
          </p>
        </div>

        {isValidCode ? (
          <>
            <h1 className="max-w-xl text-center text-4xl font-bold leading-tight sm:text-5xl">
              Claim your Bearo beta invite
            </h1>
            <p className="mt-4 max-w-md text-center text-base leading-7 text-white/55">
              Enter your email, verify it, and we will save the referral before sending you to the beta.
            </p>

            <div className="mt-8 w-full max-w-md">
              <ReferralClient code={displayCode} />
            </div>
          </>
        ) : (
          <div className="w-full max-w-md rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-center">
            <h1 className="text-2xl font-bold">Invalid invite link</h1>
            <p className="mt-3 text-sm leading-6 text-white/60">
              Ask your friend to share their Bearo referral link again.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex rounded-2xl bg-[#f97316] px-6 py-3 font-semibold text-white"
            >
              Go to Bearo
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
