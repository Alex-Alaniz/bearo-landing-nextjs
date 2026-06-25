"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  CircleDashed,
  MessageSquare,
  RefreshCw,
  Send,
  ShieldCheck,
  Trophy,
  UserRound,
} from "lucide-react";
import {
  SocialAuthPanel,
  socialIdentity,
  useBearcoHolder,
} from "@/components/BearcoHolderAccess";
import { formatHolderPercent, formatTokenAmount } from "@/lib/bearco";

interface HolderFeedback {
  id: string;
  wallet_address: string;
  display_name_snapshot: string | null;
  x_username_snapshot: string | null;
  telegram_username_snapshot: string | null;
  discord_username_snapshot?: string | null;
  holder_percent_snapshot: number;
  category: string;
  message: string;
  status: string;
  created_at: string;
}

const feedbackCategories = [
  { value: "product", label: "Product" },
  { value: "community", label: "Community" },
  { value: "liquidity", label: "Liquidity" },
  { value: "bug", label: "Bug" },
  { value: "other", label: "Other" },
];

function walletLabel(wallet: string): string {
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

function hasStreamflowLock(profile: NonNullable<ReturnType<typeof useBearcoHolder>["profile"]>): boolean {
  return profile.lockedBalance.amountAtomic !== "0";
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "now";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function BearcoHolderDashboard() {
  const holder = useBearcoHolder();
  const profile = holder.profile;
  const storedProfile = profile?.profile;
  const signedSession = Boolean(
    holder.sessionReady && holder.sessionWalletAddress,
  );
  const sessionMatchesProfile =
    signedSession && holder.sessionWalletAddress === profile?.walletAddress;
  const connectedSocials = (["x", "telegram", "discord"] as const).filter(
    (provider) => Boolean(socialIdentity(storedProfile, provider).authenticatedAt),
  ).length;
  const [feedback, setFeedback] = useState<HolderFeedback[]>([]);
  const [category, setCategory] = useState("product");
  const [message, setMessage] = useState("");
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [posting, setPosting] = useState(false);
  const [boardStatus, setBoardStatus] = useState<string | null>(null);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(true);

  const loadFeedback = useCallback(async () => {
    if (!signedSession) {
      setFeedback([]);
      setBoardError(null);
      setLoadingFeedback(false);
      return;
    }

    setLoadingFeedback(true);
    setBoardError(null);

    try {
      const response = await fetch("/api/bearco/holder-feedback");
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Unable to load feedback.");
      }
      setStorageReady(result.storageReady !== false);
      setFeedback(result.feedback || []);
    } catch (error) {
      setBoardError(
        error instanceof Error ? error.message : "Unable to load feedback.",
      );
    } finally {
      setLoadingFeedback(false);
    }
  }, [signedSession]);

  useEffect(() => {
    void loadFeedback();
  }, [loadFeedback]);

  const postFeedback = useCallback(async () => {
    setPosting(true);
    setBoardStatus(null);
    setBoardError(null);

    try {
      const response = await fetch("/api/bearco/holder-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, message }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Unable to post feedback.");
      }

      setMessage("");
      setBoardStatus("Posted to the holder board.");
      await loadFeedback();
    } catch (error) {
      setBoardError(
        error instanceof Error ? error.message : "Unable to post feedback.",
      );
    } finally {
      setPosting(false);
    }
  }, [category, loadFeedback, message]);

  return (
    <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
      <section className="bearified-panel p-5 sm:p-7">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="bearified-kicker">
              Profile and socials
            </p>
            <h2 className="bearified-display mt-3 text-5xl leading-none">
              Sign profile. Auth socials.
            </h2>
          </div>
          <UserRound className="h-7 w-7 text-[var(--bearified-accent)]" />
        </div>

        <button
          onClick={holder.connectWallet}
          disabled={holder.loading}
          className="bearified-button w-full px-5 py-4"
        >
          <ShieldCheck className="h-5 w-5" />
          {holder.connected
            ? "Wallet connected"
            : signedSession
              ? "Holder session ready"
              : "Connect Solana wallet"}
        </button>

        <HolderReadinessChecklist
          walletReady={holder.connected || signedSession}
          walletLabel={
            profile?.walletAddress ||
            holder.sessionWalletAddress ||
            holder.walletAddress ||
            ""
          }
          holdingsReady={Boolean(profile)}
          holdingsLabel={
            profile
              ? `${formatTokenAmount(profile.effectiveBalance.uiAmountString)} effective $BEARCO / ${formatHolderPercent(profile.holderPercent)}`
              : "Load live $BEARCO balance"
          }
          sessionReady={signedSession}
          sessionLabel={
            sessionMatchesProfile
              ? "Signed session matches this wallet"
              : signedSession
                ? `Signed as ${walletLabel(holder.sessionWalletAddress)}`
                : "Sign profile to save this wallet"
          }
          socialsReady={connectedSocials > 0}
          socialsLabel={`${connectedSocials}/3 provider accounts saved`}
        />

        {!storageReady && (
          <p className="bearified-panel-soft mt-4 p-3 text-sm leading-6 text-yellow-100/86">
            Holder storage is not ready. Wallet signatures can open a browser
            session, but wallet claims, socials, and feedback need the Supabase
            holder migration before they persist.
          </p>
        )}

        {profile && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MetricRow label="Wallet" value={walletLabel(profile.walletAddress)} />
            <MetricRow
              label="Holding"
              value={formatHolderPercent(profile.holderPercent)}
            />
            <MetricRow
              label="Liquid $BEARCO"
              value={formatTokenAmount(profile.balance.uiAmountString)}
            />
            <MetricRow
              label="Streamflow locked"
              value={
                hasStreamflowLock(profile)
                  ? `${formatTokenAmount(profile.lockedBalance.uiAmountString)} / ${formatHolderPercent(profile.lockedBalance.holderPercent)}`
                  : "0"
              }
            />
            <MetricRow
              label="Effective $BEARCO"
              value={formatTokenAmount(profile.effectiveBalance.uiAmountString)}
            />
            <MetricRow
              label="Highest room"
              value={profile.highestTier?.shortTitle || "Locked"}
            />
          </div>
        )}

        <div className="bearified-panel-soft mt-4 p-4">
          <label className="bearified-mono mb-2 block text-[10px] uppercase tracking-[0.22em] text-[var(--bearified-faint)]">
            Public profile name
          </label>
          <input
            value={holder.displayName}
            onChange={(event) => holder.setDisplayName(event.target.value)}
            placeholder="Alex / Bearified Founder"
            className="bearified-input px-4 py-3 text-sm"
          />

          <p className="mt-3 text-xs leading-5 text-[var(--bearified-muted)]">
            The wallet signature opens a holder session. X, Telegram, and
            Discord usernames come from provider-authenticated links.
          </p>
          <button
            onClick={holder.claimProfile}
            disabled={!holder.connected || holder.claiming}
            className="bearified-button bearified-button-secondary mt-4 w-full px-4 py-3"
          >
            <ShieldCheck className="h-4 w-4" />
            {holder.claiming
              ? "Waiting for signature..."
              : holder.connected && signedSession
                ? "Update signed profile"
                : signedSession
                  ? "Profile signed"
                  : "Sign profile"}
          </button>
        </div>

        <SocialAuthPanel
          holder={holder}
          returnTo="/holders/dashboard"
          title="Provider-authenticated accounts"
        />

        <Link
          href="/holders/leaderboard"
          className="bearified-button bearified-button-secondary mt-4 w-full px-4 py-3"
        >
          <Trophy className="h-4 w-4" />
          View top holders
        </Link>

        {holder.error && (
          <p className="bearified-panel-soft mt-4 p-3 text-sm text-red-200">
            {holder.error}
          </p>
        )}
        {holder.status && (
          <p className="bearified-panel-soft mt-4 p-3 text-sm text-emerald-200">
            {holder.status}
          </p>
        )}
      </section>

      <section className="bearified-panel p-5 sm:p-7">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="bearified-kicker">
              Holder board
            </p>
            <h2 className="bearified-display mt-3 text-5xl leading-none">
              Messages and feedback.
            </h2>
          </div>
          <button
            onClick={() => void loadFeedback()}
            disabled={loadingFeedback || !signedSession}
            className="bearified-button bearified-button-secondary p-3"
            aria-label="Refresh holder feedback"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>

        <div className="bearified-panel-soft p-4">
          <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="bearified-input bearified-mono px-4 py-3 text-sm"
            >
              {feedbackCategories.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Post a product idea, room request, LP question, or bug report."
              rows={4}
              className="bearified-input resize-none px-4 py-3 text-sm"
            />
          </div>
          <button
            onClick={postFeedback}
            disabled={posting || !signedSession || message.trim().length < 8}
            className="bearified-button mt-3 w-full px-4 py-3"
          >
            <Send className="h-4 w-4" />
            {posting ? "Posting..." : "Post to holder board"}
          </button>
          <p className="mt-3 text-xs leading-5 text-[var(--bearified-muted)]">
            Reading and posting require the signed holder session from the
            profile claim.
          </p>
        </div>

        {boardError && (
          <p className="bearified-panel-soft mt-4 p-3 text-sm text-red-200">
            {boardError}
          </p>
        )}
        {boardStatus && (
          <p className="bearified-panel-soft mt-4 p-3 text-sm text-emerald-200">
            {boardStatus}
          </p>
        )}

        <div className="mt-4 space-y-3">
          {feedback.length > 0 ? (
            feedback.map((item) => (
              <article key={item.id} className="bearified-panel-soft p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="bearified-mono border border-[var(--bearified-border-muted)] px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--bearified-accent)]">
                    {item.category}
                  </span>
                  <span className="bearified-mono text-[10px] uppercase tracking-[0.14em] text-[var(--bearified-faint)]">
                    {formatHolderPercent(item.holder_percent_snapshot)}
                  </span>
                  <span className="bearified-mono text-[10px] uppercase tracking-[0.14em] text-[var(--bearified-faint)]">
                    {formatDate(item.created_at)}
                  </span>
                </div>
                <p className="text-sm leading-6 text-white/82">{item.message}</p>
                <p className="bearified-mono mt-3 text-[10px] uppercase tracking-[0.16em] text-[var(--bearified-muted)]">
                  {item.display_name_snapshot ||
                    walletLabel(item.wallet_address)}
                  {item.x_username_snapshot ? ` / @${item.x_username_snapshot}` : ""}
                  {item.telegram_username_snapshot
                    ? ` / tg:${item.telegram_username_snapshot}`
                    : ""}
                  {item.discord_username_snapshot
                    ? ` / discord:${item.discord_username_snapshot}`
                    : ""}
                </p>
              </article>
            ))
          ) : (
            <div className="bearified-panel-soft flex items-start gap-3 p-4">
              <MessageSquare className="mt-0.5 h-5 w-5 text-[var(--bearified-accent)]" />
              <p className="text-sm leading-6 text-[var(--bearified-muted)]">
                No holder posts yet. The first useful posts should be roadmap
                feedback, room requests, liquidity questions, or bug reports.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function HolderReadinessChecklist({
  holdingsLabel,
  holdingsReady,
  sessionLabel,
  sessionReady,
  socialsLabel,
  socialsReady,
  walletLabel: rawWalletLabel,
  walletReady,
}: {
  holdingsLabel: string;
  holdingsReady: boolean;
  sessionLabel: string;
  sessionReady: boolean;
  socialsLabel: string;
  socialsReady: boolean;
  walletLabel: string;
  walletReady: boolean;
}) {
  const items = [
    {
      detail: rawWalletLabel ? walletLabel(rawWalletLabel) : "Connect wallet",
      label: "Wallet",
      ready: walletReady,
    },
    {
      detail: holdingsLabel,
      label: "Holdings",
      ready: holdingsReady,
    },
    {
      detail: sessionLabel,
      label: "Profile claim",
      ready: sessionReady,
    },
    {
      detail: socialsLabel,
      label: "Socials",
      ready: socialsReady,
    },
  ];

  return (
    <div className="bearified-panel-soft mt-4 grid gap-2 p-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-start gap-3 border border-[var(--bearified-border-muted)] bg-white/[0.02] p-3"
        >
          {item.ready ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" />
          ) : (
            <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-[var(--bearified-faint)]" />
          )}
          <div className="min-w-0">
            <p className="bearified-mono text-[10px] uppercase tracking-[0.18em] text-[var(--bearified-faint)]">
              {item.label}
            </p>
            <p className="mt-1 break-words text-xs leading-5 text-white/82">
              {item.detail}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="bearified-panel-soft p-4">
      <p className="bearified-mono text-[10px] uppercase tracking-[0.18em] text-[var(--bearified-faint)]">
        {label}
      </p>
      <p className="bearified-mono mt-2 break-words text-sm text-white">
        {value}
      </p>
    </div>
  );
}
