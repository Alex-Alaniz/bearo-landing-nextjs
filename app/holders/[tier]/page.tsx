import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck } from "lucide-react";
import {
  BearcoHolderGate,
  CommunityLinkButtons,
} from "@/components/BearcoHolderAccess";
import {
  formatHolderPercent,
  formatTokenAmount,
  getHolderTierByKey,
} from "@/lib/bearco";
import { readHolderSessionWallet } from "@/lib/bearco-session";
import { getBearcoHolderProfile } from "@/lib/bearco-server";
import { buildBearoSocialMetadata } from "@/lib/social-metadata";

interface HolderRoomPageProps {
  params: Promise<{ tier: string }>;
}

export const dynamic = "force-dynamic";

const roomCopy: Record<
  string,
  {
    eyebrow: string;
    headline: string;
    body: string;
    bullets: string[];
    utility: string[];
    next: string[];
  }
> = {
  "1": {
    eyebrow: "Community layer",
    headline: "Early access and roadmap context.",
    body: "This room is for holders who should see the product path before it becomes public marketing copy.",
    bullets: [
      "Bearo rewards roadmap snapshots",
      "Community campaign notes",
      "Early holder profile experiments",
    ],
    utility: [
      "Claimed profiles become the identity layer for holder acknowledgements, allowlists, and early rooms.",
      "Authenticated X, Telegram, and Discord accounts let the team map public community energy back to verified wallets without exposing balances by default.",
    ],
    next: [
      "Profile badges",
      "Read-only holder directory",
      "Telegram and Discord announcement preferences",
    ],
  },
  "2": {
    eyebrow: "Builder layer",
    headline: "Campaigns, integrations, and launch prep.",
    body: "This room is for holders who can help pressure-test the next growth loops before they go wide.",
    bullets: [
      "Partner campaign briefs",
      "Token-gated page drafts",
      "OpenClaw and Bearo integration notes",
    ],
    utility: [
      "Coordinate campaigns with wallet-verified contributors before opening broader public calls.",
      "Use authenticated socials to route launch tasks, moderation checks, and partner intros to the right holders.",
    ],
    next: [
      "Campaign claim queue",
      "Partner-intro request form",
      "Contributor role tags",
    ],
  },
  "3": {
    eyebrow: "Liquidity layer",
    headline: "Liquidity planning without the noise.",
    body: "This room is for serious holders reviewing LP, staking, and incentive assumptions before implementation.",
    bullets: [
      "LP venue comparison notes",
      "Emissions and incentive assumptions",
      "Risk register for liquidity provisioning",
    ],
    utility: [
      "Evaluate PumpSwap against other Solana LP venues before selecting pool ownership, fee handling, and operator custody.",
      "Model staking only after reward source, lock terms, unstake policy, and anti-sybil assumptions are explicit.",
    ],
    next: [
      "PumpSwap pool-read dashboard",
      "LP decision matrix",
      "Staking rewards source memo",
    ],
  },
  "5": {
    eyebrow: "Treasury layer",
    headline: "Treasury, staking, and holder alignment.",
    body: "This room is for supply-scale holders reviewing treasury structure and the staking path before contracts ship.",
    bullets: [
      "Staking phase plan",
      "Rewards wallet and sink policy",
      "PumpSwap or alternate LP decision matrix",
    ],
    utility: [
      "Give large holders a private place to review treasury mechanics before public policy lands.",
      "Turn staking and LP discussions into concrete contract, custody, and disclosure requirements.",
    ],
    next: [
      "Treasury wallet disclosure page",
      "LP provisioning checklist",
      "Rewards phase simulator",
    ],
  },
  "10": {
    eyebrow: "Creator layer",
    headline: "Creator-scale governance and allocation policy.",
    body: "This room is reserved for wallets with enough supply to materially shape policy, treasury, and governance proposals.",
    bullets: [
      "Founder and creator allocation policy",
      "Deep treasury commitments",
      "Governance model before on-chain voting",
    ],
    utility: [
      "Reserve creator-scale planning for wallets that can materially affect supply, governance, and liquidity risk.",
      "Use authenticated social identity to separate real decision-makers from public-room noise before governance tooling exists.",
    ],
    next: [
      "Allocation policy review",
      "Governance proposal template",
      "Treasury veto and disclosure rules",
    ],
  },
};

export async function generateMetadata({
  params,
}: HolderRoomPageProps): Promise<Metadata> {
  const { tier: tierKey } = await params;
  const tier = getHolderTierByKey(tierKey);
  if (!tier) return {};

  return buildBearoSocialMetadata({
    title: `${tier.title} | Bearo`,
    description: tier.description,
    path: tier.path,
    surface: "tier",
    imageAlt: `${tier.title} supply-gated Bearo room for verified $BEARCO holders.`,
    imageParams: {
      tier: tier.key,
    },
  });
}

export default async function HolderRoomPage({ params }: HolderRoomPageProps) {
  const { tier: tierKey } = await params;
  const tier = getHolderTierByKey(tierKey);
  const copy = tier ? roomCopy[tier.key] : null;

  if (!tier || !copy) notFound();

  const sessionWallet = await readHolderSessionWallet();
  const holderProfile = sessionWallet
    ? await getBearcoHolderProfile(sessionWallet).catch(() => null)
    : null;
  const serverUnlocked =
    holderProfile !== null && holderProfile.holderPercent >= tier.thresholdPercent;
  const unlockedRoom = (
    <HolderRoomUnlockedContent
      copy={copy}
      holderProfile={holderProfile}
      tier={tier}
    />
  );

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
            href="/tokenomics"
            className="bearified-mono border border-[var(--bearified-border)] bg-white/[0.035] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[var(--bearified-muted)] transition-colors hover:border-[var(--bearified-accent)] hover:text-white"
          >
            Tokenomics
          </Link>
        </nav>

        <section className="mb-10 max-w-4xl">
          <p className="bearified-kicker">
            {tier.shortTitle} / {copy.eyebrow}
          </p>
          <h1 className="bearified-display mt-5 text-6xl leading-[0.9] sm:text-8xl">
            {tier.title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--bearified-muted)]">
            {tier.description}
          </p>
        </section>

        {serverUnlocked ? (
          unlockedRoom
        ) : (
          <BearcoHolderGate
            requiredPercent={tier.thresholdPercent}
            title={tier.title}
          >
            {unlockedRoom}
          </BearcoHolderGate>
        )}
      </div>
    </main>
  );
}

function HolderRoomUnlockedContent({
  copy,
  holderProfile,
  tier,
}: {
  copy: (typeof roomCopy)[keyof typeof roomCopy];
  holderProfile: Awaited<ReturnType<typeof getBearcoHolderProfile>> | null;
  tier: NonNullable<ReturnType<typeof getHolderTierByKey>>;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
      <section className="border border-[var(--bearified-accent)] bg-[rgb(254_106_0_/_0.08)] p-5 sm:p-7">
        <p className="bearified-kicker">
          Unlocked
        </p>
        <h2 className="bearified-display mt-4 text-6xl leading-none">
          {copy.headline}
        </h2>
        <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--bearified-muted)]">
          {copy.body}
        </p>

        <div className="mt-8 grid gap-3">
          {copy.bullets.map((item) => (
            <div
              key={item}
              className="bearified-panel-soft flex items-start gap-3 p-4"
            >
              <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--bearified-accent)]" />
              <p className="text-sm leading-6 text-white/74">{item}</p>
            </div>
          ))}
        </div>

        <Link
          href="/holders/dashboard"
          className="bearified-button mt-6 w-full px-4 py-3 sm:w-fit"
        >
          Post feedback from this room
          <BadgeCheck className="h-4 w-4" />
        </Link>

        <div className="bearified-panel-soft mt-6 p-4">
          <p className="bearified-kicker">
            Community channels
          </p>
          <p className="mt-3 text-sm leading-6 text-[var(--bearified-muted)]">
            Use these links for the live Telegram and Discord surfaces attached
            to this holder room.
          </p>
          <div className="mt-4">
            <CommunityLinkButtons links={tier.communityLinks} />
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <RoomSection title="Room utility" items={copy.utility} />
          <RoomSection title="Build queue" items={copy.next} />
        </div>
      </section>

      <aside className="bearified-panel p-5 sm:p-7">
        <p className="bearified-kicker">
          Session wallet
        </p>
        <div className="mt-5 grid gap-3">
          {holderProfile ? (
            <>
              <MetricCard
                label="Wallet"
                value={`${holderProfile.walletAddress.slice(0, 6)}...${holderProfile.walletAddress.slice(-4)}`}
              />
              <MetricCard
                label="Effective holding"
                value={formatHolderPercent(holderProfile.holderPercent)}
              />
              <MetricCard
                label="Liquid $BEARCO"
                value={formatTokenAmount(holderProfile.balance.uiAmountString)}
              />
              <MetricCard
                label="Streamflow locked"
                value={
                  holderProfile.lockedBalance.amountAtomic !== "0"
                    ? `${formatTokenAmount(holderProfile.lockedBalance.uiAmountString)} / ${formatHolderPercent(holderProfile.lockedBalance.holderPercent)}`
                    : "0"
                }
              />
            </>
          ) : (
            <>
              <MetricCard label="Room" value={tier.shortTitle} />
              <MetricCard label="Access" value="Signed holder session" />
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bearified-panel-soft p-4">
      <p className="bearified-mono text-[10px] uppercase tracking-[0.22em] text-[var(--bearified-faint)]">
        {label}
      </p>
      <p className="bearified-mono mt-2 break-words text-lg font-medium text-white">
        {value}
      </p>
    </div>
  );
}

function RoomSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="bearified-panel-soft p-4">
      <p className="bearified-mono text-[10px] uppercase tracking-[0.22em] text-[var(--bearified-faint)]">
        {title}
      </p>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li
            key={item}
            className="text-sm leading-6 text-[var(--bearified-muted)]"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
