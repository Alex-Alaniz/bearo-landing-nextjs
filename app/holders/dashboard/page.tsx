import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BearcoHolderDashboard } from "@/components/BearcoHolderDashboard";
import { buildBearoSocialMetadata } from "@/lib/social-metadata";

export const metadata: Metadata = buildBearoSocialMetadata({
  title: "$BEARCO Holder Dashboard | Bearo",
  description:
    "A simple $BEARCO holder dashboard for authenticated socials, unlocked room status, and holder feedback.",
  path: "/holders/dashboard",
  surface: "dashboard",
  imageAlt:
    "$BEARCO holder dashboard with authenticated socials, room status, and feedback.",
});

export default function HolderDashboardPage() {
  return (
    <main className="bearified-shell min-h-screen px-6 py-8 sm:px-8 lg:px-10">
      <div className="bearified-stage mx-auto max-w-7xl">
        <nav className="mb-12 flex items-center justify-between gap-4">
          <Link
            href="/holders"
            className="bearified-mono inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--bearified-muted)] transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Holder profiles
          </Link>
          <Link
            href="/holders/liquidity"
            className="bearified-mono border border-[var(--bearified-border)] bg-white/[0.035] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[var(--bearified-muted)] transition-colors hover:border-[var(--bearified-accent)] hover:text-white"
          >
            Liquidity
          </Link>
        </nav>

        <section className="mb-10 max-w-4xl">
          <p className="bearified-kicker">
            Holder utility
          </p>
          <h1 className="bearified-display mt-5 text-6xl leading-[0.9] sm:text-8xl">
            One place for holder signals.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--bearified-muted)]">
            Connect a wallet, authenticate X, Telegram, and Discord accounts,
            and leave feedback that the team can route into product, community,
            and liquidity work.
          </p>
        </section>

        <BearcoHolderDashboard />
      </div>
    </main>
  );
}
