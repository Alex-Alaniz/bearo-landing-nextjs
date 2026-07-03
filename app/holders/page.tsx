import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BarChart3 } from "lucide-react";
import {
  BearcoHolderPortal,
  HolderRoomLinks,
} from "@/components/BearcoHolderAccess";
import { BearcoHolderLeaderboard } from "@/components/BearcoHolderLeaderboard";
import { BearcoLockedSupplyPanel } from "@/components/BearcoLockedSupplyPanel";
import { buildBearoSocialMetadata } from "@/lib/social-metadata";

export const metadata: Metadata = buildBearoSocialMetadata({
  title: "$BEARCO Holder Profiles | Bearo",
  description:
    "Connect a Solana wallet, claim a $BEARCO profile, verify socials, view live holdings, and open holder-gated Bearo rooms.",
  path: "/holders",
  surface: "holders",
  imageAlt:
    "$BEARCO holder profiles with wallet claims, authenticated socials, and supply-gated Bearo rooms.",
});

export const dynamic = "force-dynamic";

const supplyProgressCards = [
  {
    label: "Current path",
    value: "15%+",
    body: "Claimed holder supply is already above 15% for the aligned top wallet.",
  },
  {
    label: "Target",
    value: "51%+",
    body: "The treasury goal is majority $BEARCO supply alignment, with labeled wallets.",
  },
  {
    label: "Remaining",
    value: "~35%",
    body: "HoneyTrail and Bearo rewards are planned to support the remaining path.",
  },
];

export default function HoldersPage() {
  return (
    <main className="bearified-shell min-h-screen px-6 py-8 sm:px-8 lg:px-10">
      <div className="bearified-stage mx-auto max-w-7xl">
        <nav className="mb-12 flex items-center justify-between gap-4">
          <Link
            href="/tokenomics"
            className="bearified-mono inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--bearified-muted)] transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Tokenomics
          </Link>
          <Link
            href="/"
            className="bearified-mono border border-[var(--bearified-border)] bg-white/[0.035] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[var(--bearified-muted)] transition-colors hover:border-[var(--bearified-accent)] hover:text-white"
          >
            Bearo
          </Link>
        </nav>

        <section className="mb-10 max-w-4xl">
          <p className="bearified-kicker">
            00 / $BEARCO holder access
          </p>
          <h1 className="bearified-display mt-5 text-6xl leading-[0.9] sm:text-8xl">
            Wallets unlock the next layer.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--bearified-muted)]">
            Claim a public holder profile, check live $BEARCO supply share, and
            connect authenticated X, Telegram, and Discord identities to
            holder-gated rooms for 1%, 2%, 3%, 5%, and 10% holders.
          </p>
        </section>

        <section className="mb-8 bearified-panel-soft p-5 sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="bearified-kicker">
                New / Holder Radar
              </p>
              <h2 className="bearified-display mt-3 text-5xl leading-none">
                See holders, flows, and watch scores.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--bearified-muted)]">
                The new public analytics page keeps profile claiming optional
                while showing ranked wallets, holding age, indexed transfers,
                and the non-binding 50%+ airdrop watch signal.
              </p>
            </div>
            <Link
              href="/holders/live"
              className="bearified-button w-fit px-5 py-4"
            >
              <BarChart3 className="h-4 w-4" />
              Open radar
            </Link>
          </div>
        </section>

        <BearcoHolderPortal />

        <section className="mt-8">
          <BearcoLockedSupplyPanel />
        </section>

        <section className="mt-8 bearified-panel-soft p-5 sm:p-6">
          <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
            <div>
              <p className="bearified-kicker">
                03 / Supply objective
              </p>
              <h2 className="bearified-display mt-3 text-5xl leading-none">
                51%+ is the treasury target.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--bearified-muted)]">
                The public holder site tracks the path: current aligned supply,
                live locks, and future product loops like HoneyTrail that route
                app profit toward $BEARCO buybacks and liquidity support.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {supplyProgressCards.map((card) => (
                <div
                  key={card.label}
                  className="border border-[var(--bearified-border)] bg-black/25 p-4"
                >
                  <p className="bearified-mono text-[10px] uppercase tracking-[0.22em] text-[var(--bearified-faint)]">
                    {card.label}
                  </p>
                  <p className="bearified-display mt-3 text-4xl leading-none text-white">
                    {card.value}
                  </p>
                  <p className="mt-3 text-xs leading-5 text-[var(--bearified-muted)]">
                    {card.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8">
          <BearcoHolderLeaderboard />
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          <Link
            href="/holders/dashboard"
            className="group border border-[var(--bearified-accent)] bg-[rgb(254_106_0_/_0.08)] p-5 transition hover:bg-[rgb(254_106_0_/_0.12)] sm:p-6"
          >
            <p className="bearified-kicker">
              Holder dashboard
            </p>
            <h2 className="bearified-display mt-3 text-5xl leading-none">
              Post feedback, check socials.
            </h2>
            <p className="mt-4 text-sm leading-6 text-[var(--bearified-muted)]">
              A simple utility surface for provider-authenticated socials,
              holder status, room access, and product/community feedback.
            </p>
          </Link>
          <Link
            href="/holders/liquidity"
            className="group bearified-panel-soft p-5 transition hover:border-[var(--bearified-accent)] hover:bg-[rgb(254_106_0_/_0.08)] sm:p-6"
          >
            <p className="bearified-kicker">
              Liquidity
            </p>
            <h2 className="bearified-display mt-3 text-5xl leading-none">
              Preview LP deposits.
            </h2>
            <p className="mt-4 text-sm leading-6 text-[var(--bearified-muted)]">
              Advanced flow for pairing $BEARCO and SOL, previewing LP tokens,
              and signing a PumpSwap deposit.
            </p>
          </Link>
        </section>

        <section className="mt-14">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="bearified-kicker">
                04 / Holder rooms
              </p>
              <h2 className="bearified-display mt-3 text-5xl leading-none">
                Supply-gated pages.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--bearified-muted)]">
                Public cards open the gated room pages first. Live Telegram and
                Discord links appear only after the server verifies a signed
                holder session for the required tier.
              </p>
            </div>
          </div>
          <HolderRoomLinks showCommunityLinks={false} />
        </section>
      </div>
    </main>
  );
}
