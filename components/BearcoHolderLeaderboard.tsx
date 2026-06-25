import Link from "next/link";
import {
  BadgeCheck,
  ExternalLink,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import {
  formatHolderPercent,
  formatTokenAmount,
} from "@/lib/bearco";
import {
  listBearcoHolderLeaderboard,
  type BearcoHolderLeaderboardEntry,
  type BearcoHolderLeaderboardIdentity,
} from "@/lib/bearco-server";

function shortWallet(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function socialHref(
  provider: "x" | "telegram" | "discord",
  username: string,
): string | null {
  if (provider === "x") return `https://x.com/${encodeURIComponent(username)}`;
  if (provider === "telegram") {
    return `https://t.me/${encodeURIComponent(username)}`;
  }
  return null;
}

function claimDateLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Claimed profile";
  return `Claimed profile - ${new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)}`;
}

function SocialBadge({
  identity,
  label,
  provider,
}: {
  identity: BearcoHolderLeaderboardIdentity;
  label: string;
  provider: "x" | "telegram" | "discord";
}) {
  const handle = identity.username || identity.displayName;
  if (!handle) return null;

  const href = identity.username ? socialHref(provider, identity.username) : null;
  const content = (
    <>
      <ShieldCheck className="h-3.5 w-3.5 text-[var(--bearified-accent)]" />
      <span className="truncate">
        {label}: {identity.username ? `@${identity.username}` : handle}
      </span>
      {href && <ExternalLink className="h-3 w-3 text-[var(--bearified-faint)]" />}
    </>
  );

  if (!href) {
    return (
      <span className="bearified-mono inline-flex min-w-0 items-center gap-1.5 border border-[var(--bearified-border-muted)] bg-white/[0.025] px-2 py-1.5 text-[10px] uppercase tracking-[0.12em] text-white">
        {content}
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="bearified-mono inline-flex min-w-0 items-center gap-1.5 border border-[var(--bearified-border-muted)] bg-white/[0.025] px-2 py-1.5 text-[10px] uppercase tracking-[0.12em] text-white transition hover:border-[var(--bearified-accent)]"
    >
      {content}
    </a>
  );
}

function SocialBadges({ entry }: { entry: BearcoHolderLeaderboardEntry }) {
  const hasSocials = Boolean(
    entry.socials.x.username ||
      entry.socials.x.displayName ||
      entry.socials.telegram.username ||
      entry.socials.telegram.displayName ||
      entry.socials.discord.username ||
      entry.socials.discord.displayName,
  );

  if (!hasSocials) {
    return (
      <span className="bearified-mono text-[10px] uppercase tracking-[0.14em] text-[var(--bearified-faint)]">
        No verified socials yet
      </span>
    );
  }

  return (
    <div className="flex min-w-0 flex-wrap gap-1.5">
      <SocialBadge
        identity={entry.socials.x}
        label="X"
        provider="x"
      />
      <SocialBadge
        identity={entry.socials.telegram}
        label="TG"
        provider="telegram"
      />
      <SocialBadge
        identity={entry.socials.discord}
        label="DC"
        provider="discord"
      />
    </div>
  );
}

function LeaderboardRow({ entry }: { entry: BearcoHolderLeaderboardEntry }) {
  return (
    <tr className="border-t border-[var(--bearified-border-muted)] align-top transition hover:bg-white/[0.035]">
      <td className="min-w-[18rem] px-4 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="bearified-mono mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center border border-[var(--bearified-accent)] bg-[rgb(254_106_0_/_0.1)] text-[10px] text-white">
            #{entry.rank}
          </span>
          <div className="min-w-0">
            <p className="bearified-mono truncate text-sm text-white">
              {entry.displayName || shortWallet(entry.walletAddress)}
            </p>
            <p className="bearified-mono mt-1 truncate text-[10px] uppercase tracking-[0.12em] text-[var(--bearified-faint)]">
              {shortWallet(entry.walletAddress)}
            </p>
            <p className="bearified-mono mt-2 inline-flex items-center gap-1.5 border border-[var(--bearified-border-muted)] bg-[rgb(254_106_0_/_0.08)] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--bearified-accent)]">
              <BadgeCheck className="h-3.5 w-3.5" />
              {claimDateLabel(entry.claimedAt)}
            </p>
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-4">
        <p className="bearified-mono text-sm text-white">
          {formatHolderPercent(entry.holderPercent)}
        </p>
        <p className="bearified-mono mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--bearified-accent)]">
          {entry.highestTier?.shortTitle || "Below 1%"}
        </p>
      </td>
      <td className="whitespace-nowrap px-4 py-4">
        <p className="bearified-mono text-sm text-white">
          {formatTokenAmount(entry.tokenBalance || "0")}
        </p>
        <p className="bearified-mono mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--bearified-faint)]">
          effective $BEARCO
        </p>
      </td>
      <td className="min-w-[16rem] px-4 py-4">
        <SocialBadges entry={entry} />
      </td>
    </tr>
  );
}

export async function BearcoHolderLeaderboard({
  showClaimLink = true,
}: {
  showClaimLink?: boolean;
}) {
  const { entries, storageReady } = await listBearcoHolderLeaderboard(25);
  const countLabel = new Intl.NumberFormat("en").format(entries.length);

  return (
    <section
      id="holder-leaderboard"
      className="bearified-panel scroll-mt-8 overflow-hidden"
    >
      <div className="border-b border-[var(--bearified-border-muted)] p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex border border-[var(--bearified-border-muted)] p-1">
              <span className="bearified-mono bg-[rgb(254_106_0_/_0.14)] px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white">
                Holders
              </span>
              <span className="bearified-mono px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--bearified-faint)]">
                Claimed
              </span>
            </div>
            <div className="mt-5 flex items-end gap-3">
              <h2 className="bearified-mono text-2xl uppercase tracking-[0.05em] text-white">
                Holders
              </h2>
              <span className="bearified-mono pb-1 text-sm text-[var(--bearified-accent)]">
                {countLabel}
              </span>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--bearified-muted)]">
              Wallets ranked by effective $BEARCO balance for this holder
              portal. Claimed profiles show verified social accounts after
              Privy sync saves them to the wallet.
            </p>
          </div>

          {showClaimLink && (
            <Link
              href="/holders/dashboard"
              className="bearified-button bearified-button-secondary w-fit px-4 py-3"
            >
              <WalletCards className="h-4 w-4" />
              Claim profile
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-b border-[var(--bearified-border-muted)] bg-white/[0.018] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="bearified-mono inline-flex border border-[var(--bearified-border-muted)] px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-white">
            All claimed holders
          </span>
        </div>
        <span className="bearified-mono text-[10px] uppercase tracking-[0.16em] text-[var(--bearified-faint)]">
          Ranked from stored wallet snapshots
        </span>
      </div>

      {!storageReady && (
        <p className="m-5 border border-yellow-400/30 bg-yellow-400/10 p-4 text-sm leading-6 text-yellow-100/90">
          Leaderboard storage is not ready yet. Apply the holder Supabase
          migration and refresh after the first wallet claim.
        </p>
      )}

      {storageReady && entries.length === 0 && (
        <p className="m-5 border border-[var(--bearified-border-muted)] bg-white/[0.025] p-4 text-sm leading-6 text-[var(--bearified-muted)]">
          No claimed holder snapshots yet. Connect a wallet and claim a profile
          to start the leaderboard.
        </p>
      )}

      {entries.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse text-left">
            <thead>
              <tr className="bearified-mono text-[10px] uppercase tracking-[0.16em] text-[var(--bearified-faint)]">
                <th className="px-4 py-3 font-normal">Holder</th>
                <th className="px-4 py-3 font-normal">% of supply</th>
                <th className="px-4 py-3 font-normal">Balance</th>
                <th className="px-4 py-3 font-normal">Profile</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <LeaderboardRow key={entry.walletAddress} entry={entry} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
