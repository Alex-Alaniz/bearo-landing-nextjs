"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  ShieldCheck,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import {
  BEARCO_PUMP_URL,
  BEARCO_STREAMFLOW_DASHBOARD_URL,
} from "@/lib/bearco";
import {
  formatRadarCurrency,
  formatRadarTokenAmount,
  type BearcoHolderRadarAction,
  type BearcoHolderRadarEntry,
  type BearcoHolderRadarEvent,
  type BearcoHolderRadarList,
} from "@/lib/bearco-holder-radar";

type SortKey =
  | "rank"
  | "holderPercent"
  | "holdingAgeDays"
  | "airdropWatchScore"
  | "lastActionAt";

interface BearcoHolderRadarProps {
  initialData: BearcoHolderRadarList;
}

interface EventResponse {
  events?: BearcoHolderRadarEvent[];
}

const actionLabels: Record<BearcoHolderRadarAction, string> = {
  buy: "Bought",
  sell: "Sold",
  transfer_in: "Transfer in",
  transfer_out: "Transfer out",
};

function shortWallet(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "0%";
  if (value >= 1) return `${value.toFixed(2).replace(/\.?0+$/, "")}%`;
  return `${value.toFixed(4).replace(/\.?0+$/, "")}%`;
}

function formatAge(days: number): string {
  if (days >= 365) return `${Math.floor(days / 365)}y ${days % 365}d`;
  if (days > 0) return `${days}d`;
  return "New";
}

function formatDate(value: string | null): string {
  if (!value) return "Not synced";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not synced";
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function sortValue(entry: BearcoHolderRadarEntry, key: SortKey): number {
  if (key === "rank") return -entry.rank;
  if (key === "holderPercent") return entry.holderPercent;
  if (key === "holdingAgeDays") return entry.holdingAgeDays;
  if (key === "airdropWatchScore") return entry.airdropWatchScore;
  return entry.lastActionAt ? Date.parse(entry.lastActionAt) : 0;
}

function actionClass(action: BearcoHolderRadarAction | null): string {
  if (action === "buy" || action === "transfer_in") {
    return "text-emerald-300";
  }
  if (action === "sell" || action === "transfer_out") {
    return "text-orange-300";
  }
  return "text-[var(--bearified-faint)]";
}

function Sparkline({
  tone = "green",
  values,
}: {
  tone?: "green" | "orange";
  values: number[];
}) {
  const points = values.length > 0 ? values : [42, 42, 42, 42, 42, 42, 42];
  const max = Math.max(...points);
  const min = Math.min(...points);
  const path = points
    .map((value, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * 92 + 4;
      const y =
        40 -
        ((value - min) / Math.max(max - min, 1)) * 28;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg
      aria-hidden="true"
      className="h-10 w-28"
      role="img"
      viewBox="0 0 100 48"
    >
      <path
        d="M4 40H96"
        fill="none"
        stroke="currentColor"
        strokeDasharray="3 5"
        strokeOpacity="0.16"
      />
      <path
        d={path}
        fill="none"
        stroke={tone === "green" ? "#58d36e" : "#fe6a00"}
        strokeLinecap="square"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function SocialLinks({ entry }: { entry: BearcoHolderRadarEntry }) {
  const xUsername = entry.socials.x.username;
  const telegramUsername = entry.socials.telegram.username;
  const discordName =
    entry.socials.discord.username || entry.socials.discord.displayName;

  if (!xUsername && !telegramUsername && !discordName) {
    return (
      <span className="bearified-mono text-[10px] uppercase tracking-[0.14em] text-[var(--bearified-faint)]">
        Unclaimed
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2 text-[var(--bearified-muted)]">
      {xUsername && (
        <a
          aria-label={`Open X profile for ${xUsername}`}
          className="transition hover:text-white"
          href={`https://x.com/${encodeURIComponent(xUsername)}`}
          rel="noreferrer"
          target="_blank"
        >
          X
        </a>
      )}
      {telegramUsername && (
        <a
          aria-label={`Open Telegram profile for ${telegramUsername}`}
          className="transition hover:text-sky-300"
          href={`https://t.me/${encodeURIComponent(telegramUsername)}`}
          rel="noreferrer"
          target="_blank"
        >
          TG
        </a>
      )}
      {discordName && (
        <span
          aria-label={`Verified Discord profile ${discordName}`}
          className="text-indigo-300"
        >
          DC
        </span>
      )}
    </div>
  );
}

function PnlCell({
  label,
  status,
  value,
}: {
  label: string;
  status: BearcoHolderRadarEntry["pnlStatus"];
  value: number | null;
}) {
  const positive = value !== null && value >= 0;

  return (
    <div>
      <p
        className={`bearified-mono text-sm ${
          value === null
            ? "text-[var(--bearified-faint)]"
            : positive
              ? "text-emerald-300"
              : "text-orange-300"
        }`}
      >
        {formatRadarCurrency(value)}
      </p>
      <p className="bearified-mono mt-1 text-[9px] uppercase tracking-[0.14em] text-[var(--bearified-faint)]">
        {value === null ? status.replaceAll("_", " ") : label}
      </p>
    </div>
  );
}

function HolderRow({
  entry,
  isSelected,
  onSelect,
}: {
  entry: BearcoHolderRadarEntry;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={`grid w-full min-w-[58rem] grid-cols-[3rem_1.08fr_0.76fr_0.72fr_0.82fr_0.78fr_0.78fr_6.5rem_5rem] items-center border-t border-[var(--bearified-border-muted)] px-4 py-3 text-left transition ${
        isSelected ? "bg-[rgb(254_106_0_/_0.08)]" : "hover:bg-white/[0.035]"
      }`}
      onClick={onSelect}
      type="button"
    >
      <span className="bearified-mono text-xs text-white">#{entry.rank}</span>
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="bearified-mono truncate text-sm text-white">
            {entry.displayName || shortWallet(entry.walletAddress)}
          </span>
          {entry.isClaimed && (
            <BadgeCheck className="h-3.5 w-3.5 text-[var(--bearified-accent)]" />
          )}
        </span>
        <span className="bearified-mono mt-1 block truncate text-[10px] uppercase tracking-[0.12em] text-[var(--bearified-faint)]">
          {shortWallet(entry.walletAddress)}
        </span>
      </span>
      <span>
        <span className="bearified-mono block text-sm text-white">
          {formatPercent(entry.holderPercent)}
        </span>
        <span className="bearified-mono mt-1 block text-[10px] uppercase tracking-[0.12em] text-[var(--bearified-faint)]">
          {formatRadarTokenAmount(entry.balanceUi)}
        </span>
      </span>
      <span className="bearified-mono text-sm text-white">
        {formatAge(entry.holdingAgeDays)}
      </span>
      <span className={`bearified-mono text-xs uppercase ${actionClass(entry.lastAction)}`}>
        {entry.lastAction ? actionLabels[entry.lastAction] : "Syncing"}
      </span>
      <PnlCell
        label="realized"
        status={entry.pnlStatus}
        value={entry.realizedPnlUsd}
      />
      <PnlCell
        label="unrealized"
        status={entry.pnlStatus}
        value={entry.unrealizedPnlUsd}
      />
      <Sparkline
        tone={
          entry.lastAction === "sell" || entry.lastAction === "transfer_out"
            ? "orange"
            : "green"
        }
        values={entry.sparkline}
      />
      <SocialLinks entry={entry} />
    </button>
  );
}

function HolderMobileCard({
  entry,
  onSelect,
}: {
  entry: BearcoHolderRadarEntry;
  onSelect: () => void;
}) {
  return (
    <button
      className="border-t border-[var(--bearified-border-muted)] p-4 text-left transition hover:bg-white/[0.035] lg:hidden"
      onClick={onSelect}
      type="button"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="bearified-mono text-xs text-[var(--bearified-accent)]">
            #{entry.rank}
          </p>
          <p className="mt-2 truncate text-base font-semibold text-white">
            {entry.displayName || shortWallet(entry.walletAddress)}
          </p>
          <p className="bearified-mono mt-1 text-[10px] uppercase tracking-[0.12em] text-[var(--bearified-faint)]">
            {formatPercent(entry.holderPercent)} / {formatAge(entry.holdingAgeDays)}
          </p>
        </div>
        <div className="text-right">
          <p className="bearified-mono text-sm text-white">
            {entry.airdropWatchScore}
          </p>
          <p className="bearified-mono mt-1 text-[9px] uppercase tracking-[0.14em] text-[var(--bearified-faint)]">
            watch score
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-4">
        <span className={`bearified-mono text-xs uppercase ${actionClass(entry.lastAction)}`}>
          {entry.lastAction ? actionLabels[entry.lastAction] : "Syncing"}
        </span>
        <Sparkline values={entry.sparkline} />
      </div>
    </button>
  );
}

function HolderDetail({
  entry,
  events,
  loading,
  onClose,
}: {
  entry: BearcoHolderRadarEntry | null;
  events: BearcoHolderRadarEvent[];
  loading: boolean;
  onClose: () => void;
}) {
  if (!entry) return null;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex justify-end bg-black/55 backdrop-blur-sm"
      role="dialog"
    >
      <button
        aria-label="Close wallet detail backdrop"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <aside className="bearified-panel-soft relative h-full w-full max-w-xl overflow-y-auto border-y-0 border-r-0 p-5 shadow-2xl shadow-black/50">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="bearified-kicker">Wallet detail</p>
          <h2 className="bearified-mono mt-3 truncate text-xl uppercase tracking-[0.05em] text-white">
            {entry.displayName || shortWallet(entry.walletAddress)}
          </h2>
          <p className="bearified-mono mt-1 break-all text-[10px] uppercase tracking-[0.12em] text-[var(--bearified-faint)]">
            {entry.walletAddress}
          </p>
        </div>
        <button
          aria-label="Close wallet detail"
          className="inline-flex h-9 w-9 items-center justify-center border border-[var(--bearified-border-muted)] text-[var(--bearified-muted)] transition hover:border-[var(--bearified-accent)] hover:text-white"
          onClick={onClose}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="border border-[var(--bearified-border-muted)] bg-black/20 p-3">
          <p className="bearified-mono text-[9px] uppercase tracking-[0.14em] text-[var(--bearified-faint)]">
            Balance %
          </p>
          <p className="bearified-mono mt-2 text-lg text-white">
            {formatPercent(entry.holderPercent)}
          </p>
        </div>
        <div className="border border-[var(--bearified-border-muted)] bg-black/20 p-3">
          <p className="bearified-mono text-[9px] uppercase tracking-[0.14em] text-[var(--bearified-faint)]">
            Watch score
          </p>
          <p className="bearified-mono mt-2 text-lg text-[var(--bearified-accent)]">
            {entry.airdropWatchScore}/100
          </p>
        </div>
        <div className="border border-[var(--bearified-border-muted)] bg-black/20 p-3">
          <p className="bearified-mono text-[9px] uppercase tracking-[0.14em] text-[var(--bearified-faint)]">
            Holding age
          </p>
          <p className="bearified-mono mt-2 text-lg text-white">
            {formatAge(entry.holdingAgeDays)}
          </p>
        </div>
        <div className="border border-[var(--bearified-border-muted)] bg-black/20 p-3">
          <p className="bearified-mono text-[9px] uppercase tracking-[0.14em] text-[var(--bearified-faint)]">
            Multiplier
          </p>
          <p className="bearified-mono mt-2 text-lg text-white">
            {entry.airdropMultiplier}x
          </p>
        </div>
      </div>

      <div className="mt-5 border border-[var(--bearified-border-muted)] bg-black/20 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="bearified-mono text-xs uppercase tracking-[0.12em] text-white">
            Trades, transfers, P&L
          </p>
          {loading && (
            <Loader2 className="h-4 w-4 animate-spin text-[var(--bearified-accent)]" />
          )}
        </div>
        <p className="mt-2 text-xs leading-5 text-[var(--bearified-muted)]">
          P&L stays pending until each trade has a complete quote basis. Plain
          transfers affect custody and holding age, not profit or loss.
        </p>

        <div className="mt-4 max-h-[24rem] space-y-3 overflow-y-auto pr-1">
          {!loading && events.length === 0 && (
            <p className="border border-[var(--bearified-border-muted)] bg-white/[0.025] p-3 text-xs leading-5 text-[var(--bearified-muted)]">
              No indexed transfer history yet. Run the Holder Radar refresh
              after applying the analytics migration.
            </p>
          )}
          {events.map((event) => (
            <div
              className="border border-[var(--bearified-border-muted)] bg-white/[0.025] p-3"
              key={`${event.signature}-${event.actionType}-${event.amountAtomic}`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className={`bearified-mono text-xs uppercase ${actionClass(event.actionType)}`}>
                  {actionLabels[event.actionType]}
                </p>
                <p className="bearified-mono text-xs text-white">
                  {formatRadarTokenAmount(event.amountUi)}
                </p>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="bearified-mono truncate text-[10px] uppercase tracking-[0.12em] text-[var(--bearified-faint)]">
                  {formatDate(event.blockTime)}
                </p>
                <a
                  className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-[var(--bearified-accent)]"
                  href={`https://solscan.io/tx/${event.signature}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  Tx <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
      </aside>
    </div>
  );
}

export function BearcoHolderRadar({ initialData }: BearcoHolderRadarProps) {
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [selectedWallet, setSelectedWallet] = useState("");
  const [events, setEvents] = useState<BearcoHolderRadarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const selectedEntry = selectedWallet
    ? initialData.entries.find((entry) => entry.walletAddress === selectedWallet) ||
      null
    : null;

  useEffect(() => {
    if (!selectedEntry) return;

    let cancelled = false;
    fetch(`/api/bearco/live-holders/${selectedEntry.walletAddress}/events?limit=25`)
      .then((response) => (response.ok ? response.json() : { events: [] }))
      .then((payload: EventResponse) => {
        if (!cancelled) setEvents(payload.events || []);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      })
      .finally(() => {
        if (!cancelled) setEventsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedEntry]);

  function selectWallet(walletAddress: string) {
    setSelectedWallet(walletAddress);
    setEvents([]);
    setEventsLoading(true);
  }

  const sortedEntries = useMemo(
    () =>
      [...initialData.entries].sort((left, right) => {
        const leftValue = sortValue(left, sortKey);
        const rightValue = sortValue(right, sortKey);
        return sortKey === "rank" ? rightValue - leftValue : rightValue - leftValue;
      }),
    [initialData.entries, sortKey],
  );

  const alignedSupply = Math.min(
    50,
    initialData.entries
      .filter((entry) => entry.isClaimed)
      .reduce((total, entry) => total + entry.holderPercent, 0),
  );
  const alignedProgress = Math.min((alignedSupply / 50) * 100, 100);
  const totalHolders = new Intl.NumberFormat("en-US").format(initialData.total);

  return (
    <div className="bearified-stage mx-auto max-w-[94rem]">
      <nav className="mb-8 flex items-center justify-between border-b border-[var(--bearified-border-muted)] pb-4">
        <Link
          className="bearified-mono text-lg uppercase tracking-[0.12em] text-white"
          href="/"
        >
          Bearo.cash
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          <Link
            className="bearified-mono text-xs uppercase tracking-[0.18em] text-[var(--bearified-muted)] transition hover:text-white"
            href="/tokenomics"
          >
            Tokenomics
          </Link>
          <Link
            className="bearified-mono text-xs uppercase tracking-[0.18em] text-[var(--bearified-accent)]"
            href="/holders"
          >
            Holders
          </Link>
          <Link
            className="bearified-mono text-xs uppercase tracking-[0.18em] text-[var(--bearified-muted)] transition hover:text-white"
            href="/holders/dashboard"
          >
            Dashboard
          </Link>
        </div>
        <Link
          className="bearified-button px-4 py-3"
          href="/holders/dashboard"
        >
          Claim profile <ArrowUpRight className="h-4 w-4" />
        </Link>
      </nav>

      <section className="grid gap-8 lg:grid-cols-[0.84fr_1.46fr] lg:items-start">
        <div className="pt-2">
          <p className="bearified-kicker">$BEARCO Holder Radar</p>
          <h1 className="bearified-display mt-6 max-w-2xl text-6xl leading-[0.9] text-white sm:text-8xl xl:text-9xl">
            See the holders. Read the flow.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--bearified-muted)]">
            Wallet profiles are optional. On-chain activity is not. Explore
            holder rank, flow, holding age, and a non-binding airdrop watch
            signal as the supply path moves toward 50%+.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              className="bearified-button px-5 py-4"
              href="#holder-radar-table"
            >
              Explore holders <ArrowUpRight className="h-4 w-4" />
            </a>
            <Link
              className="bearified-button bearified-button-secondary px-5 py-4"
              href="/holders/dashboard"
            >
              <UserRound className="h-4 w-4" /> Claim profile
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-4">
            {[
              ["Live data", initialData.storageReady ? "Synced" : "Pending"],
              ["Coverage", initialData.source === "snapshot" ? "All holders" : "Claimed fallback"],
              ["Source", "Helius + Supabase"],
              ["Updated", formatDate(initialData.updatedAt)],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="bearified-kicker text-[9px]">{label}</p>
                <p className="mt-2 text-sm text-[var(--bearified-muted)]">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-16 border border-[var(--bearified-border-muted)] bg-white/[0.025] px-5 py-4">
            <p className="bearified-mono text-[10px] uppercase tracking-[0.14em] text-[var(--bearified-faint)]">
              This is data. Not financial advice. Airdrop watch is an
              eligibility signal, not a reward promise.
            </p>
          </div>
        </div>

        <section
          className="bearified-panel overflow-hidden"
          id="holder-radar-table"
        >
          <div className="border-b border-[var(--bearified-border-muted)] p-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-4 w-4 text-[var(--bearified-accent)]" />
                <h2 className="bearified-mono text-sm uppercase tracking-[0.12em] text-white">
                  Holders leaderboard
                </h2>
                <span className="bearified-mono inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-emerald-300">
                  <span className="h-1.5 w-1.5 bg-emerald-300" />
                  Live
                </span>
              </div>
              <div className="flex items-center gap-3">
                <p className="bearified-mono text-[10px] uppercase tracking-[0.14em] text-[var(--bearified-faint)]">
                  Total holders: {totalHolders}
                </p>
                <a
                  className="bearified-button bearified-button-secondary px-3 py-2"
                  href={BEARCO_PUMP_URL}
                  rel="noreferrer"
                  target="_blank"
                >
                  Pump.fun <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>

          <div className="hidden min-w-full overflow-x-auto lg:block">
            <div className="grid min-w-[58rem] grid-cols-[3rem_1.08fr_0.76fr_0.72fr_0.82fr_0.78fr_0.78fr_6.5rem_5rem] px-4 py-3">
              {[
                ["#", "rank"],
                ["Wallet", "rank"],
                ["Balance %", "holderPercent"],
                ["Holding age", "holdingAgeDays"],
                ["Last action", "lastActionAt"],
                ["Realized P&L", "airdropWatchScore"],
                ["Unrealized P&L", "airdropWatchScore"],
                ["7D flow", "lastActionAt"],
                ["Social", "rank"],
              ].map(([label, key]) => (
                <button
                  className="bearified-mono text-left text-[10px] uppercase tracking-[0.16em] text-[var(--bearified-faint)] transition hover:text-white"
                  key={label}
                  onClick={() => setSortKey(key as SortKey)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
            {sortedEntries.map((entry) => (
              <HolderRow
                entry={entry}
                isSelected={selectedEntry?.walletAddress === entry.walletAddress}
                key={entry.walletAddress}
                onSelect={() => selectWallet(entry.walletAddress)}
              />
            ))}
          </div>

          <div className="lg:hidden">
            {sortedEntries.map((entry) => (
              <HolderMobileCard
                entry={entry}
                key={entry.walletAddress}
                onSelect={() => selectWallet(entry.walletAddress)}
              />
            ))}
          </div>

          {sortedEntries.length === 0 && (
            <div className="p-5">
              <p className="border border-[var(--bearified-border-muted)] bg-white/[0.025] p-4 text-sm leading-6 text-[var(--bearified-muted)]">
                Holder Radar has not synced yet. Apply the Supabase migration,
                set Helius credentials, then run the protected refresh endpoint.
              </p>
            </div>
          )}
        </section>
      </section>

      <HolderDetail
        entry={selectedEntry}
        events={events}
        loading={eventsLoading}
        onClose={() => {
          setSelectedWallet("");
          setEvents([]);
          setEventsLoading(false);
        }}
      />

      <section className="mt-5 grid items-start gap-5 xl:grid-cols-2">
        <div className="bearified-panel-soft p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[var(--bearified-accent)]" />
            <h2 className="bearified-mono text-sm uppercase tracking-[0.12em] text-white">
              50%+ unlocks airdrop watch
            </h2>
          </div>
          <div className="mt-6 h-2 border border-[var(--bearified-border-muted)] bg-black/40">
            <div
              className="h-full bg-[var(--bearified-accent)]"
              style={{ width: `${alignedProgress}%` }}
            />
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <p className="bearified-mono text-2xl text-[var(--bearified-accent)]">
              {formatPercent(alignedSupply)}
            </p>
            <p className="bearified-mono text-lg text-white">50%+ target</p>
          </div>
          <p className="mt-4 text-xs leading-5 text-[var(--bearified-muted)]">
            Claimed/aligned holder supply feeds the watch signal. The eventual
            snapshot rules may change and must be published before any reward
            decision.
          </p>
        </div>

        <div className="bearified-panel-soft p-5">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-[var(--bearified-accent)]" />
            <h2 className="bearified-mono text-sm uppercase tracking-[0.12em] text-white">
              Hold time multiplier
            </h2>
          </div>
          <div className="mt-5 grid grid-cols-4 border border-[var(--bearified-border-muted)] text-center">
            {[
              ["< 7D", "1x"],
              ["7D-30D", "1.25x"],
              ["30D-90D", "1.5x"],
              ["180D+", "2x"],
            ].map(([label, value]) => (
              <div
                className="border-r border-[var(--bearified-border-muted)] p-3 last:border-r-0"
                key={label}
              >
                <p className="bearified-mono text-[10px] uppercase tracking-[0.12em] text-[var(--bearified-faint)]">
                  {label}
                </p>
                <p className="bearified-mono mt-2 text-sm text-white">
                  {value}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-5 text-[var(--bearified-muted)]">
            Longer holding creates a stronger eligibility signal. Transfers may
            reset or complicate the signal if the final policy requires
            continuous custody.
          </p>
        </div>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.6fr]">
        <div className="bearified-panel-soft p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="bearified-kicker">Data partners</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Indexer first, proof first.
              </h2>
            </div>
            <Copy className="h-4 w-4 text-[var(--bearified-faint)]" />
          </div>
          <p className="max-w-3xl text-sm leading-6 text-[var(--bearified-muted)]">
            Holder Radar stores public snapshots from Helius and profile overlays
            from verified Bearo claims. Profile claiming adds social context, but
            the holder table stays readable without requiring a wallet connection.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              className="bearified-button bearified-button-secondary px-4 py-3"
              href={BEARCO_STREAMFLOW_DASHBOARD_URL}
              rel="noreferrer"
              target="_blank"
            >
              Streamflow locks <ExternalLink className="h-4 w-4" />
            </a>
            <Link
              className="bearified-button bearified-button-secondary px-4 py-3"
              href="/holders"
            >
              Current portal <WalletCards className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="bearified-panel-soft p-5">
          <p className="bearified-kicker">Airdrop watchlist</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            Still holding matters.
          </h2>
          <div className="mt-5 space-y-3">
            {sortedEntries.slice(0, 5).map((entry) => (
              <div
                className="grid grid-cols-[2rem_1fr_4rem] items-center gap-3"
                key={`watch-${entry.walletAddress}`}
              >
                <p className="bearified-mono text-xs text-[var(--bearified-faint)]">
                  #{entry.rank}
                </p>
                <div className="min-w-0">
                  <p className="truncate text-sm text-white">
                    {entry.displayName || shortWallet(entry.walletAddress)}
                  </p>
                  <p className="bearified-mono text-[10px] uppercase tracking-[0.12em] text-[var(--bearified-faint)]">
                    {formatAge(entry.holdingAgeDays)} / {entry.airdropMultiplier}x
                  </p>
                </div>
                <p className="bearified-mono text-right text-sm text-emerald-300">
                  {entry.airdropWatchScore}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs leading-5 text-[var(--bearified-muted)]">
            Must still hold through a future published snapshot to be considered.
            No promises. Rules and details may change.
          </p>
        </div>
      </section>
    </div>
  );
}
