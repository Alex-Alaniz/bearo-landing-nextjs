import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Flame,
  HandCoins,
  LockKeyhole,
  Repeat2,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";
import { BearcoLockedSupplyPanel } from "@/components/BearcoLockedSupplyPanel";
import { buildBearoSocialMetadata } from "@/lib/social-metadata";

export const metadata: Metadata = buildBearoSocialMetadata({
  title: "$BEARCO Tokenomics | Bearo",
  description:
    "A simple public overview of the $BEARCO 51%+ supply-alignment target, Streamflow locks, HoneyTrail profit routing, and holder utility.",
  path: "/tokenomics",
  surface: "tokenomics",
  imageAlt:
    "$BEARCO tokenomics overview with 51%+ supply target, Streamflow locks, and HoneyTrail treasury path.",
});

const simpleLoop = [
  {
    icon: Users,
    title: "People use Bearo",
    body: "Referrals, payments, on-ramps, and repeat app activity create real movement.",
    color: "from-sky-300 to-cyan-500",
  },
  {
    icon: ShoppingCart,
    title: "$BEARCO gets used",
    body: "Some product actions can require holding, spending, staking, or earning $BEARCO.",
    color: "from-orange-300 to-amber-500",
  },
  {
    icon: Flame,
    title: "Tokens can burn",
    body: "Part of the activity can be routed to burns, rewards, liquidity, or buybacks.",
    color: "from-rose-300 to-orange-500",
  },
];

const sinkExamples = [
  {
    icon: LockKeyhole,
    title: "Unlocks",
    body: "Use $BEARCO for premium app features, boosts, and special access.",
  },
  {
    icon: Repeat2,
    title: "Rewards",
    body: "Reward real users for referrals, loyalty, and useful activity.",
  },
  {
    icon: Flame,
    title: "Burns",
    body: "Send a portion of token flow out of circulation when the system earns.",
  },
  {
    icon: HandCoins,
    title: "Liquidity",
    body: "Support healthier markets so people can enter and exit more easily.",
  },
];

const walletPlan = [
  {
    label: "Founder / company",
    detail:
      "Long-term aligned holdings with a public 51%+ supply-alignment target.",
  },
  {
    label: "Liquidity",
    detail: "Dedicated wallet for market depth and token access.",
  },
  {
    label: "Rewards",
    detail: "Community, referral, and app incentive wallet.",
  },
  {
    label: "Burn / sink tracking",
    detail: "Clear place to show what left circulation or was routed by usage.",
  },
];

const treasuryProgress = [
  {
    label: "Current aligned supply",
    value: "15%+",
    detail: "The current public holder signal is already over 15% of supply.",
  },
  {
    label: "Target",
    value: "51%+",
    detail: "The goal is majority supply alignment under labeled wallets.",
  },
  {
    label: "Remaining path",
    value: "~35%",
    detail: "The next treasury work is to acquire and label the remaining path.",
  },
  {
    label: "Locked supply",
    value: "10%+",
    detail: "Streamflow locks are shown publicly for holder transparency.",
  },
];

const honeyTrailPlan = [
  "Join a walking challenge, hit the step goal every day, and split the prize pool with everyone who finishes.",
  "Steps come from Apple Health first, with mobile platform parity planned as the app matures.",
  "HoneyTrail profit policy target: route 100% of app profit into $BEARCO treasury buybacks and liquidity support after unavoidable operating obligations.",
];

export default function TokenomicsPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(249,115,22,0.18),transparent_34%),linear-gradient(225deg,rgba(14,165,233,0.14),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.06),transparent_58%)]" />

        <div className="relative mx-auto flex min-h-[86vh] max-w-7xl flex-col px-6 py-8 sm:px-8 lg:px-10">
          <nav className="flex items-center justify-between gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Bearo
            </Link>
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase text-white/70">
              Simple tokenomics
            </div>
          </nav>

          <div className="grid flex-1 items-center gap-12 py-14 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="max-w-2xl">
              <p className="mb-5 text-sm font-semibold uppercase tracking-[0.24em] text-orange-300">
                $BEARCO
              </p>
              <h1 className="text-5xl font-black leading-[0.96] tracking-normal sm:text-7xl">
                Use the app. Fuel the token.
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-white/70">
                The idea is simple: Bearo should create real reasons for
                $BEARCO to be used, rewarded, locked, or burned.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Badge icon={ShieldCheck}>No price promises</Badge>
                <Badge icon={WalletCards}>Clear wallet structure</Badge>
                <Badge icon={Flame}>Burns visible over time</Badge>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/holders"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-300 to-amber-500 px-6 py-3 text-sm font-black text-black transition hover:brightness-110"
                >
                  Claim holder profile
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/holders/5"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-6 py-3 text-sm font-black text-white transition hover:bg-white/[0.08]"
                >
                  5% holder room
                  <LockKeyhole className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <SimpleLoopVisual />
          </div>
        </div>
      </section>

      <section className="px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <BearcoLockedSupplyPanel />
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.03] px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-300">
              Treasury objective
            </p>
            <h2 className="mt-4 text-4xl font-black sm:text-5xl">
              Buy toward 51%+. Show the path.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/62">
              The public objective is simple: keep growing labeled, aligned
              $BEARCO supply until the treasury and founder-side position clears
              51%+. This is a supply-alignment target, not a price promise.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {treasuryProgress.map((item) => (
              <ProgressCard key={item.label} item={item} />
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-300">
              The whole story
            </p>
            <h2 className="mt-4 text-4xl font-black sm:text-5xl">
              Three things need to be obvious.
            </h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {simpleLoop.map((step, index) => (
              <StepCard key={step.title} step={step} index={index + 1} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.03] px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-300">
              Token sinks
            </p>
            <h2 className="mt-4 text-4xl font-black sm:text-5xl">
              Where $BEARCO can go.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/62">
              Normal users do not need a finance diagram. They need to see that
              the token has places to be used inside the product.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {sinkExamples.map((sink) => (
              <InfoCard key={sink.title} item={sink} />
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-300">
              HoneyTrail
            </p>
            <h2 className="mt-4 text-4xl font-black sm:text-5xl">
              Walk. Win cash. Feed $BEARCO.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/62">
              HoneyTrail is the cleanest product loop for the next phase:
              challenges people understand, rewards they can feel, and a
              treasury policy that routes app profit back into $BEARCO.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5 sm:p-7">
            <div className="mb-6 flex items-center gap-4">
              <div className="rounded-xl bg-orange-400/12 p-3 text-orange-200">
                <HandCoins className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/42">
                  Q4 stress lane
                </p>
                <h3 className="mt-1 text-2xl font-black">
                  Real cash walking challenges
                </h3>
              </div>
            </div>

            <div className="grid gap-3">
              {honeyTrailPlan.map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-white/10 bg-black/35 p-4 text-sm leading-6 text-white/68"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-300">
              Wallet transparency
            </p>
            <h2 className="mt-4 text-4xl font-black sm:text-5xl">
              Fewer assumptions. Cleaner wallets.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/62">
              If the community wants holdings spread across purpose-built
              wallets, that can make sense. The point is to label what each
              wallet is for so people are not guessing.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5 sm:p-7">
            <div className="mb-6 flex items-center gap-4">
              <div className="rounded-xl bg-orange-400/12 p-3 text-orange-200">
                <WalletCards className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/42">
                  Proposed structure
                </p>
                <h3 className="mt-1 text-2xl font-black">
                  Separate wallets by job
                </h3>
              </div>
            </div>

            <div className="grid gap-3">
              {walletPlan.map((wallet) => (
                <div
                  key={wallet.label}
                  className="rounded-xl border border-white/10 bg-black/35 p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-orange-300" />
                    <div>
                      <h4 className="font-black">{wallet.label}</h4>
                      <p className="mt-1 text-sm leading-5 text-white/62">
                        {wallet.detail}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-white/[0.03] px-6 py-12 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-300">
              Guardrail
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/68">
              Public product goals only. No return promise, no price prediction,
              and not a complete legal disclosure. Details can change as Bearo
              ships.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-4 py-2 text-sm text-white/58">
            <Sparkles className="h-4 w-4 text-orange-200" />
            Product first
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-300">
              Holder access
            </p>
            <h2 className="mt-4 text-4xl font-black sm:text-5xl">
              Supply share can unlock pages.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/62">
              Connect a Solana wallet, claim a public profile, and let the app
              check live $BEARCO holdings before opening 1%, 2%, 3%, 5%, and
              10% rooms.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-5">
            {["1", "2", "3", "5", "10"].map((tier) => (
              <Link
                key={tier}
                href={`/holders/${tier}`}
                className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 transition hover:border-orange-300/40 hover:bg-orange-300/10"
              >
                <p className="text-3xl font-black">{tier}%</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/42">
                  holders
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function SimpleLoopVisual() {
  return (
    <div className="relative min-h-[31rem]">
      <div className="absolute inset-x-4 top-10 h-72 rounded-full bg-gradient-to-r from-orange-500/20 via-sky-400/10 to-rose-400/20 blur-3xl" />
      <div className="relative mx-auto flex h-[31rem] max-w-[36rem] items-center justify-center">
        <div className="absolute h-[28rem] w-[28rem] rounded-full border border-white/10" />
        <div className="absolute h-[21rem] w-[21rem] rounded-full border border-dashed border-white/14" />

        <div className="relative z-10 flex h-44 w-44 items-center justify-center rounded-full border border-orange-200/30 bg-gradient-to-br from-orange-300 to-amber-500 shadow-2xl shadow-orange-950/50">
          <Image
            src="/images/BearoApp.png"
            alt="Bearo"
            width={112}
            height={112}
            className="h-28 w-28 object-contain"
            priority
          />
        </div>

        <VisualNode
          className="left-0 top-14"
          icon={Users}
          label="Use Bearo"
        />
        <VisualNode
          className="right-0 top-24 text-right"
          icon={ShoppingCart}
          label="Use $BEARCO"
        />
        <VisualNode
          className="bottom-8 left-1/2 -translate-x-1/2"
          icon={Flame}
          label="Burn / reward"
        />
      </div>
    </div>
  );
}

function VisualNode({
  className,
  icon: Icon,
  label,
}: {
  className: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <div
      className={`absolute rounded-2xl border border-white/10 bg-black/72 p-4 backdrop-blur-xl ${className}`}
    >
      <div className="mb-3 inline-flex rounded-xl bg-white/8 p-2 text-orange-200">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xl font-black text-white">{label}</p>
    </div>
  );
}

function StepCard({
  step,
  index,
}: {
  step: (typeof simpleLoop)[number];
  index: number;
}) {
  const Icon = step.icon;

  return (
    <article className="relative min-h-72 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045] p-6">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${step.color}`} />
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className={`rounded-xl bg-gradient-to-br ${step.color} p-3 text-black`}>
          <Icon className="h-7 w-7" />
        </div>
        <span className="text-6xl font-black text-white/10">0{index}</span>
      </div>
      <h3 className="text-3xl font-black leading-tight">{step.title}</h3>
      <p className="mt-4 text-base leading-7 text-white/64">{step.body}</p>
      {index < simpleLoop.length && (
        <ArrowRight className="absolute bottom-6 right-6 h-6 w-6 text-white/22" />
      )}
    </article>
  );
}

function InfoCard({
  item,
}: {
  item: {
    icon: LucideIcon;
    title: string;
    body: string;
  };
}) {
  const Icon = item.icon;

  return (
    <article className="rounded-2xl border border-white/10 bg-black/35 p-5">
      <div className="mb-6 inline-flex rounded-xl bg-orange-400/12 p-3 text-orange-200">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-2xl font-black">{item.title}</h3>
      <p className="mt-3 text-sm leading-6 text-white/62">{item.body}</p>
    </article>
  );
}

function ProgressCard({
  item,
}: {
  item: {
    label: string;
    value: string;
    detail: string;
  };
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-black/35 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/42">
        {item.label}
      </p>
      <p className="mt-3 text-5xl font-black text-white">{item.value}</p>
      <p className="mt-4 text-sm leading-6 text-white/62">{item.detail}</p>
    </article>
  );
}

function Badge({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-4 py-2 text-sm text-white/68">
      <Icon className="h-4 w-4 text-orange-200" />
      {children}
    </div>
  );
}
