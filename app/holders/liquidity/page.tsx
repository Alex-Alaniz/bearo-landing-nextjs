import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { BearcoLiquidityDepositDesk } from "@/components/BearcoLiquidityDepositDesk";
import {
  BEARCO_MINT_ADDRESS,
  BEARCO_PUMP_URL,
  BEARCO_PUMPSWAP_LP_MINT,
  BEARCO_PUMPSWAP_POOL,
  PUMPSWAP_PROGRAM_ID,
  SOL_WRAPPED_MINT,
} from "@/lib/bearco";
import { buildBearoSocialMetadata } from "@/lib/social-metadata";

const configuredPool =
  process.env.NEXT_PUBLIC_BEARCO_PUMPSWAP_POOL?.trim() || BEARCO_PUMPSWAP_POOL;
const configuredLpMint =
  process.env.NEXT_PUBLIC_BEARCO_PUMPSWAP_LP_MINT?.trim() ||
  BEARCO_PUMPSWAP_LP_MINT;

const lpBasics = [
  "Connect the wallet that holds $BEARCO.",
  "Use Max or type either $BEARCO or SOL.",
  "Review paired amounts before building the transaction.",
];

const riskNotes = [
  "A deposit adds both $BEARCO and SOL to the AMM in the pool ratio.",
  "The wallet receives LP tokens representing its share of pool liquidity.",
  "LPs can earn fees but take price-movement and impermanent-loss risk.",
  "Marketing deposits stay paused until the dedicated-wallet E2E passes.",
];

const depositReadiness = [
  "Quote preview",
  "Slippage review",
  "Deposit instructions",
  "Wallet sign/send",
  "LP snapshot and profile persistence",
];

export const metadata: Metadata = buildBearoSocialMetadata({
  title: "$BEARCO PumpSwap Liquidity | Bearo",
  description:
    "PumpSwap liquidity planning, pool readiness, and LP provider flow for $BEARCO holders.",
  path: "/holders/liquidity",
  surface: "liquidity",
  imageAlt:
    "$BEARCO PumpSwap liquidity desk with paired SOL deposit preview and LP balance confirmation.",
});

export default function HolderLiquidityPage() {
  const poolReady = Boolean(configuredPool);

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

        <section className="mb-8 max-w-4xl">
          <p className="bearified-kicker">
            Simple LP desk
          </p>
          <h1 className="bearified-display mt-5 text-6xl leading-[0.9] sm:text-8xl">
            Add liquidity without the noise.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--bearified-muted)]">
            The important flow is simple: connect wallet, choose an amount,
            review the paired SOL and LP estimate, then decide whether to sign.
            Public deposit promotion waits for the dedicated test wallet run.
          </p>
        </section>

        <section className="mb-8 grid gap-3 sm:grid-cols-3">
          <MetricCard
            label="Pool"
            value={poolReady ? "Ready" : "Needs config"}
          />
          <MetricCard
            label="Pair"
            value="$BEARCO / SOL"
          />
          <MetricCard
            label="LP mint"
            value={`${configuredLpMint.slice(0, 6)}...${configuredLpMint.slice(-4)}`}
          />
        </section>

        <section className="mb-8 border border-[var(--bearified-border)] bg-white/[0.025] p-5 sm:p-6">
          <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
            <div>
              <p className="bearified-kicker">
                Stress lane
              </p>
              <h2 className="bearified-display mt-3 text-5xl leading-none text-white/82">
                Real deposits are Q4-gated.
              </h2>
              <p className="mt-4 text-sm leading-6 text-[var(--bearified-muted)]">
                Before Bearo markets deposits, this page needs one small-wallet
                E2E with a dedicated wallet: quote, slippage, transaction build,
                wallet approval, LP-token confirmation, and saved holder profile
                state.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-5">
              {depositReadiness.map((item, index) => (
                <div
                  key={item}
                  className="border border-[var(--bearified-border)] bg-black/25 p-3 opacity-70"
                >
                  <p className="bearified-mono text-[10px] uppercase tracking-[0.22em] text-[var(--bearified-faint)]">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <p className="mt-3 text-xs font-semibold leading-5 text-white/72">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <BearcoLiquidityDepositDesk />

        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          <RoomSection title="How to use it" items={lpBasics} />
          <RoomSection title="What deposits do" items={riskNotes} />
          <RoomSection
            title="Advanced checks"
            items={[
              `Pool ${configuredPool.slice(0, 6)}...${configuredPool.slice(-4)}`,
              `Program ${PUMPSWAP_PROGRAM_ID.slice(0, 6)}...${PUMPSWAP_PROGRAM_ID.slice(-4)}`,
              `Mints ${BEARCO_MINT_ADDRESS.slice(0, 6)}... / ${SOL_WRAPPED_MINT.slice(0, 6)}...`,
            ]}
          />
        </section>

        <section className="mt-5 grid gap-3 sm:grid-cols-2">
          <a
            href={`https://solscan.io/account/${configuredPool}`}
            target="_blank"
            rel="noreferrer"
            className="bearified-button bearified-button-secondary px-4 py-3"
          >
            View pool
            <ExternalLink className="h-4 w-4" />
          </a>
          <a
            href={BEARCO_PUMP_URL}
            target="_blank"
            rel="noreferrer"
            className="bearified-button bearified-button-secondary px-4 py-3"
          >
            Pump live stream
            <ExternalLink className="h-4 w-4" />
          </a>
        </section>
      </div>
    </main>
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
