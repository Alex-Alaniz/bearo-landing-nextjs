"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Crown,
  ExternalLink,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import {
  BEARCO_LIQUIDITY_PATH,
  BEARCO_MINT_ADDRESS,
  HOLDER_TIERS,
  formatHolderPercent,
  formatTokenAmount,
  isValidSolanaAddress,
  type HolderRoomCommunityLink,
  type HolderTier,
} from "@/lib/bearco";
import { isBearcoPrivyEnabled } from "@/components/BearcoPrivyProvider";
import { BearcoDisconnectedClaimPanel } from "@/components/BearcoDisconnectedClaimPanel";
import { createBearcoClaimMessage } from "@/lib/bearco-client-claim";

const BearcoPrivySocialConnectors = dynamic(
  () =>
    import("@/components/BearcoPrivySocialConnectors").then(
      (mod) => mod.BearcoPrivySocialConnectors,
    ),
  { ssr: false },
);

interface SolanaWalletProvider {
  isPhantom?: boolean;
  isSolflare?: boolean;
  publicKey?: { toString(): string };
  connect: (options?: { onlyIfTrusted?: boolean }) => Promise<{
    publicKey: { toString(): string };
  }>;
  disconnect?: () => Promise<void>;
  signMessage?: (
    message: Uint8Array,
    encoding?: "utf8",
  ) => Promise<{ signature: Uint8Array } | Uint8Array>;
}

declare global {
  interface Window {
    solana?: SolanaWalletProvider;
    phantom?: { solana?: SolanaWalletProvider };
    solflare?: SolanaWalletProvider;
  }
}

interface HolderProfileResponse {
  walletAddress: string;
  mintAddress: string;
  balance: {
    amountAtomic: string;
    uiAmountString: string;
  };
  effectiveBalance: {
    amountAtomic: string;
    holderPercent: number;
    uiAmountString: string;
  };
  liquidHolderPercent: number;
  lockedBalance: {
    amountAtomic: string;
    contractCount: number;
    holderPercent: number;
    sourceUrl: string;
    sourceWallets: string[];
    uiAmountString: string;
  };
  supply: {
    amountAtomic: string;
    decimals: number;
    uiAmountString: string;
  };
  holderPercent: number;
  unlockedTiers: HolderTier[];
  highestTier: HolderTier | null;
  profile: {
    wallet_address: string;
    display_name: string | null;
    profile_slug: string | null;
    x_username: string | null;
    x_user_id?: string | null;
    x_display_name?: string | null;
    x_authenticated_at?: string | null;
    telegram_username: string | null;
    telegram_user_id?: string | null;
    telegram_display_name?: string | null;
    telegram_authenticated_at?: string | null;
    discord_user_id?: string | null;
    discord_username?: string | null;
    discord_display_name?: string | null;
    discord_authenticated_at?: string | null;
    lp_token_balance_snapshot: string | null;
    lp_token_account: string | null;
    lp_snapshot_at: string | null;
    claimed_at: string;
    social_claimed_at: string | null;
    updated_at: string;
  } | null;
  updatedAt: string;
}

interface HolderSessionResponse {
  authenticated: boolean;
  walletAddress: string | null;
}

const STORAGE_KEY = "bearco:last-holder-wallet";

function getProvider(): SolanaWalletProvider | null {
  if (typeof window === "undefined") return null;
  return (
    window.phantom?.solana ||
    (window.solana?.isPhantom ? window.solana : null) ||
    window.solflare ||
    window.solana ||
    null
  );
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function walletLabel(wallet: string): string {
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

function hasStreamflowLock(profile: HolderProfileResponse): boolean {
  return profile.lockedBalance.amountAtomic !== "0";
}

function createClaimMessage(input: {
  claimCode?: string;
  issuedAt?: string;
  walletAddress: string;
  displayName: string;
}): string {
  return createBearcoClaimMessage({
    ...input,
    host: window.location.host,
  });
}

type SocialProvider = "x" | "telegram" | "discord";

const SOCIAL_PROVIDERS: Array<{
  key: SocialProvider;
  label: string;
  shortLabel: string;
}> = [
  { key: "x", label: "X", shortLabel: "X" },
  { key: "telegram", label: "Telegram", shortLabel: "TG" },
  { key: "discord", label: "Discord", shortLabel: "DC" },
];

function socialAuthHref(provider: SocialProvider, returnTo: string): string {
  return `/api/bearco/social-auth/${provider}/start?returnTo=${encodeURIComponent(returnTo)}`;
}

export function socialIdentity(
  profile: HolderProfileResponse["profile"] | null | undefined,
  provider: SocialProvider,
): {
  authenticatedAt: string | null;
  displayName: string | null;
  username: string | null;
} {
  if (!profile) {
    return { authenticatedAt: null, displayName: null, username: null };
  }

  if (provider === "x") {
    return {
      authenticatedAt: profile.x_authenticated_at || null,
      displayName: profile.x_display_name || null,
      username: profile.x_username || null,
    };
  }

  if (provider === "telegram") {
    return {
      authenticatedAt: profile.telegram_authenticated_at || null,
      displayName: profile.telegram_display_name || null,
      username: profile.telegram_username || null,
    };
  }

  return {
    authenticatedAt: profile.discord_authenticated_at || null,
    displayName: profile.discord_display_name || null,
    username: profile.discord_username || null,
  };
}

function socialStatusLabel(
  identity: ReturnType<typeof socialIdentity>,
): string {
  if (identity.authenticatedAt && identity.username) {
    return `@${identity.username}`;
  }
  if (identity.authenticatedAt && identity.displayName) {
    return identity.displayName;
  }
  if (identity.username) return "Needs auth";
  return "Not connected";
}

function socialProviderLabel(provider: string | null): string {
  return provider === "x"
    ? "X"
    : provider === "telegram"
      ? "Telegram"
      : provider === "discord"
        ? "Discord"
        : "Social";
}

function socialAuthStatusMessage(status: string, provider: string | null): {
  kind: "error" | "status";
  message: string;
} {
  const label = socialProviderLabel(provider);

  if (status === "connected") {
    return {
      kind: "status",
      message: `${label} account connected to this holder profile.`,
    };
  }

  if (status === "sign-profile-first") {
    return {
      kind: "error",
      message: "Sign the holder profile before connecting social accounts.",
    };
  }

  if (status === "x-not-configured") {
    return {
      kind: "error",
      message:
        "X direct verification is not configured yet. Add the OAuth 2.0 client ID and matching callback URL, then retry.",
    };
  }

  if (status === "telegram-not-configured") {
    return {
      kind: "error",
      message:
        "Telegram direct verification is not configured yet. Add BotFather Web Login client credentials, then retry.",
    };
  }

  if (status === "discord-not-configured") {
    return {
      kind: "error",
      message:
        "Discord direct verification is not configured yet. Add the Discord OAuth client credentials, then retry.",
    };
  }

  if (status === "connect-failed") {
    return {
      kind: "error",
      message:
        provider === "x"
          ? "X verification reached the callback but did not return a verified profile. Check the X app callback URLs and OAuth 2.0 client secret, then retry."
          : provider === "telegram"
            ? "Telegram verification reached the callback but did not return a verified profile. Check BotFather Web Login allowed URLs and client credentials, then retry."
            : `${label} verification reached the callback but did not return a verified profile. Check the provider OAuth settings, then retry.`,
    };
  }

  if (status === "provider-denied") {
    return {
      kind: "error",
      message: `${label} authorization was canceled before it completed.`,
    };
  }

  if (status === "state-mismatch" || status === "session-expired") {
    return {
      kind: "error",
      message:
        "The social login session expired. Return to the holder page and retry from the same wallet session.",
    };
  }

  return {
    kind: "error",
    message: `${label} authentication did not complete. Try the provider again.`,
  };
}

export function useBearcoHolder() {
  const [walletAddress, setWalletAddress] = useState("");
  const [lookupWallet, setLookupWallet] = useState("");
  const [connected, setConnected] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionWalletAddress, setSessionWalletAddress] = useState("");
  const [providerReady, setProviderReady] = useState(false);
  const [profile, setProfile] = useState<HolderProfileResponse | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const loadProfile = useCallback(async (wallet: string) => {
    const trimmed = wallet.trim();
    if (!isValidSolanaAddress(trimmed)) {
      setError("Enter a valid Solana wallet address.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/bearco/holder-profile?wallet=${encodeURIComponent(trimmed)}`,
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Unable to load holder profile.");
      }
      setProfile(result);
      setDisplayName(result.profile?.display_name || "");
      setLookupWallet(trimmed);
      window.localStorage.setItem(STORAGE_KEY, trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load wallet.");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setProviderReady(Boolean(getProvider()));
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && isValidSolanaAddress(stored)) {
      setWalletAddress(stored);
      setLookupWallet(stored);
      void loadProfile(stored);
    }
  }, [loadProfile]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const socialStatus = params.get("socialStatus");
    const social = params.get("social");
    if (!socialStatus) return;

    const message = socialAuthStatusMessage(socialStatus, social);
    if (message.kind === "status") setStatus(message.message);
    else setError(message.message);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadSession() {
      try {
        const response = await fetch("/api/bearco/holder-session");
        const result = (await response.json()) as HolderSessionResponse;
        if (!active) return;
        setSessionReady(result.authenticated);
        if (result.walletAddress && isValidSolanaAddress(result.walletAddress)) {
          setSessionWalletAddress(result.walletAddress);
          setWalletAddress(result.walletAddress);
          setLookupWallet(result.walletAddress);
          window.localStorage.setItem(STORAGE_KEY, result.walletAddress);
          await loadProfile(result.walletAddress);
        } else {
          setSessionWalletAddress("");
        }
      } catch {
        if (active) {
          setSessionReady(false);
          setSessionWalletAddress("");
        }
      }
    }

    void loadSession();
    return () => {
      active = false;
    };
  }, [loadProfile]);

  const connectWallet = useCallback(async () => {
    const provider = getProvider();
    if (!provider) {
      setError("No Solana wallet extension detected in this Chrome profile.");
      return;
    }

    setLoading(true);
    setError(null);
    setStatus(null);

    try {
      const response = await provider.connect();
      const wallet = response.publicKey.toString();
      setWalletAddress(wallet);
      setLookupWallet(wallet);
      setConnected(true);
      window.localStorage.setItem(STORAGE_KEY, wallet);
      await loadProfile(wallet);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wallet connection failed.");
    } finally {
      setLoading(false);
    }
  }, [loadProfile]);

  const refresh = useCallback(async () => {
    const wallet = walletAddress || lookupWallet;
    if (wallet) await loadProfile(wallet);
  }, [loadProfile, lookupWallet, walletAddress]);

  const claimProfileWithSignature = useCallback(async (input: {
    displayName: string;
    message: string;
    signature: string;
    successMessage: string;
    walletAddress: string;
  }) => {
    if (!isValidSolanaAddress(input.walletAddress)) {
      setError("Enter a valid Solana wallet address.");
      return;
    }
    if (!input.message.trim() || !input.signature.trim()) {
      setError("Paste the signed message proof before claiming.");
      return;
    }

    setClaiming(true);
    setError(null);
    setStatus(null);

    try {
      const response = await fetch("/api/bearco/claim-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: input.walletAddress,
          message: input.message,
          signature: input.signature,
          displayName: input.displayName,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Profile claim failed.");
      }

      if (result.sessionIssued && result.persisted) {
        setStatus(input.successMessage);
      } else if (result.sessionIssued) {
        setStatus("Signature verified for this browser session.");
        setError(
          "Profile storage is not ready yet. Apply the Supabase holder migration before linking socials or posting feedback.",
        );
      } else {
        setStatus(
          "Signature verified. Add a session secret to unlock holder rooms and social auth.",
        );
      }
      setSessionReady(Boolean(result.sessionIssued));
      setSessionWalletAddress(result.sessionIssued ? input.walletAddress : "");
      setWalletAddress(input.walletAddress);
      setLookupWallet(input.walletAddress);
      window.localStorage.setItem(STORAGE_KEY, input.walletAddress);
      await loadProfile(input.walletAddress);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Profile claim failed.");
    } finally {
      setClaiming(false);
    }
  }, [loadProfile]);

  const claimProfileWithMemo = useCallback(async (input: {
    displayName: string;
    message: string;
    transactionSignature: string;
    walletAddress: string;
  }) => {
    if (!isValidSolanaAddress(input.walletAddress)) {
      setError("Enter a valid Solana wallet address.");
      return;
    }
    if (!input.message.trim() || !input.transactionSignature.trim()) {
      setError("Paste the Solana Memo transaction signature before claiming.");
      return;
    }

    setClaiming(true);
    setError(null);
    setStatus(null);

    try {
      const response = await fetch("/api/bearco/claim-profile/memo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Memo claim failed.");
      }

      setStatus(
        result.persisted
          ? "Memo proof verified and the public holder profile is claimed. Use offline signed-message proof to open private rooms in this browser."
          : "Memo proof verified. Holder storage is not ready yet, so the profile was not persisted.",
      );
      setSessionReady(false);
      setSessionWalletAddress("");
      setWalletAddress(input.walletAddress);
      setLookupWallet(input.walletAddress);
      window.localStorage.setItem(STORAGE_KEY, input.walletAddress);
      await loadProfile(input.walletAddress);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Memo claim failed.");
    } finally {
      setClaiming(false);
    }
  }, [loadProfile]);

  const claimProfile = useCallback(async () => {
    const provider = getProvider();
    if (!provider || !walletAddress || !connected) {
      setError("Connect the wallet before claiming the profile.");
      return;
    }
    if (!provider.signMessage) {
      setError("This wallet does not support message signing.");
      return;
    }

    setClaiming(true);
    setError(null);
    setStatus(null);

    try {
      const message = createClaimMessage({
        walletAddress,
        displayName,
      });
      const signed = await provider.signMessage(
        new TextEncoder().encode(message),
        "utf8",
      );
      const signature =
        signed instanceof Uint8Array ? signed : signed.signature;

      await claimProfileWithSignature({
        walletAddress,
        message,
        signature: bytesToBase64(signature),
        displayName,
        successMessage:
          "Profile signed. Social auth and holder rooms are unlocked for this browser session.",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Profile claim failed.");
    } finally {
      setClaiming(false);
    }
  }, [
    claimProfileWithSignature,
    connected,
    displayName,
    walletAddress,
  ]);

  return {
    walletAddress,
    lookupWallet,
    setLookupWallet,
    connected,
    sessionReady,
    sessionWalletAddress,
    providerReady,
    profile,
    displayName,
    setDisplayName,
    status,
    error,
    loading,
    claiming,
    connectWallet,
    refresh,
    loadProfile,
    claimProfile,
    claimProfileWithMemo,
    claimProfileWithSignature,
  };
}

export function SocialAuthPanel({
  holder,
  returnTo,
  title = "Authenticated socials",
}: {
  holder: ReturnType<typeof useBearcoHolder>;
  returnTo: string;
  title?: string;
}) {
  const storedProfile = holder.profile?.profile;
  const canConnect = holder.sessionReady;
  const connectors = SOCIAL_PROVIDERS.map((provider) => {
    const identity = socialIdentity(storedProfile, provider.key);
    return {
      connected: Boolean(identity.authenticatedAt),
      label: provider.label,
      provider: provider.key,
      shortLabel: provider.shortLabel,
      statusLabel: socialStatusLabel(identity),
    };
  });

  return (
    <div className="bearified-panel-soft mt-4 p-4">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="bearified-mono text-[10px] uppercase tracking-[0.22em] text-[var(--bearified-faint)]">
            {title}
          </p>
          <p className="mt-2 text-xs leading-5 text-[var(--bearified-muted)]">
            Usernames come from provider auth. They are not typed into the
            profile form.
          </p>
        </div>
        <ShieldCheck className="h-5 w-5 text-[var(--bearified-accent)]" />
      </div>

      {isBearcoPrivyEnabled() ? (
        <BearcoPrivySocialConnectors
          canConnect={canConnect}
          connectors={connectors}
          holder={holder}
        />
      ) : (
        <div className="grid gap-3">
          {SOCIAL_PROVIDERS.map((provider) => {
            const identity = socialIdentity(storedProfile, provider.key);
            const connected = Boolean(identity.authenticatedAt);
            return (
              <div
                key={provider.key}
                className="grid gap-3 border border-[var(--bearified-border-muted)] bg-white/[0.025] p-3 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div>
                  <p className="bearified-mono text-[10px] uppercase tracking-[0.2em] text-[var(--bearified-faint)]">
                    {provider.label}
                  </p>
                  <p className="bearified-mono mt-1 text-sm text-white">
                    {socialStatusLabel(identity)}
                  </p>
                  {identity.username && !identity.authenticatedAt && (
                    <p className="mt-1 text-xs leading-5 text-yellow-100/78">
                      Legacy typed value. Reconnect to verify it.
                    </p>
                  )}
                </div>
                <a
                  href={socialAuthHref(provider.key, returnTo)}
                  onClick={(event) => {
                    if (!canConnect) event.preventDefault();
                  }}
                  aria-disabled={!canConnect}
                  className={`bearified-button bearified-button-secondary justify-center px-4 py-3 ${
                    canConnect
                      ? ""
                      : "pointer-events-none opacity-45"
                  }`}
                >
                  {connected ? `Reconnect ${provider.shortLabel}` : `Connect ${provider.shortLabel}`}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            );
          })}
        </div>
      )}

      {!canConnect && (
        <p className="mt-3 text-xs leading-5 text-[var(--bearified-muted)]">
          Sign the holder profile with a connected wallet or offline signature
          before linking X, Telegram, or Discord.
        </p>
      )}
    </div>
  );
}

export function BearcoHolderPortal() {
  const holder = useBearcoHolder();
  const profile = holder.profile;

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
      <section className="bearified-panel p-5 sm:p-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="bearified-kicker">
              01 / Holder profile
            </p>
            <h2 className="bearified-display mt-3 text-5xl leading-none sm:text-6xl">
              Claim with your wallet.
            </h2>
          </div>
          <div className="border border-[var(--bearified-border)] bg-[rgb(254_106_0_/_0.08)] p-3 text-[var(--bearified-accent)]">
            <Wallet className="h-6 w-6" />
          </div>
        </div>

        <div className="space-y-5">
          <button
            onClick={holder.connectWallet}
            disabled={holder.loading}
            className="bearified-button w-full px-5 py-4"
          >
            <Wallet className="h-5 w-5" />
            {holder.connected ? "Wallet connected" : "Connect Solana wallet"}
          </button>

          {!holder.providerReady && (
            <p className="bearified-panel-soft bearified-mono p-4 text-xs leading-6 text-[var(--bearified-muted)]">
              No injected Solana wallet was detected in this Chrome profile.
              You can still inspect a public wallet below or claim without
              connecting by using offline proof.
            </p>
          )}

          <div className="bearified-panel-soft p-4">
            <label className="bearified-mono mb-2 block text-[10px] uppercase tracking-[0.24em] text-[var(--bearified-faint)]">
              Wallet lookup
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={holder.lookupWallet}
                onChange={(event) => holder.setLookupWallet(event.target.value)}
                placeholder="Solana wallet address"
                className="bearified-input bearified-mono min-w-0 flex-1 px-4 py-3 text-sm"
              />
              <button
                onClick={() => holder.loadProfile(holder.lookupWallet)}
                disabled={holder.loading}
                className="bearified-button bearified-button-secondary px-5 py-3"
              >
                Check
              </button>
            </div>
          </div>

          <div className="bearified-panel-soft p-4">
            <label className="bearified-mono mb-2 block text-[10px] uppercase tracking-[0.24em] text-[var(--bearified-faint)]">
              Public profile name
            </label>
            <input
              value={holder.displayName}
              onChange={(event) => holder.setDisplayName(event.target.value)}
              placeholder="Alex / Bearified Founder"
              className="bearified-input px-4 py-3 text-sm"
            />

            <p className="bearified-mono mt-3 text-[11px] leading-5 text-[var(--bearified-muted)]">
              This wallet signature creates the holder session. Social
              usernames are verified separately through X, Telegram, or Discord
              auth.
            </p>
            <button
              onClick={holder.claimProfile}
              disabled={!holder.connected || holder.claiming}
              className="bearified-button bearified-button-secondary mt-4 w-full px-4 py-3"
            >
              <BadgeCheck className="h-4 w-4" />
              {holder.claiming ? "Waiting for signature..." : "Sign profile"}
            </button>
          </div>

          <BearcoDisconnectedClaimPanel holder={holder} />

          <SocialAuthPanel holder={holder} returnTo="/holders" />
        </div>
      </section>

      <section className="bearified-panel p-5 sm:p-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="bearified-kicker">
              02 / Live holdings
            </p>
            <h2 className="bearified-display mt-3 text-5xl leading-none sm:text-6xl">
              {profile
                ? formatHolderPercent(profile.holderPercent)
                : "Connect to view"}
            </h2>
          </div>
          <button
            onClick={holder.refresh}
            disabled={!profile || holder.loading}
            className="bearified-button bearified-button-secondary p-3"
            aria-label="Refresh holder profile"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>

        {holder.error && (
          <p className="bearified-panel-soft mb-4 p-3 text-sm text-red-200">
            {holder.error}
          </p>
        )}
        {holder.status && (
          <p className="bearified-panel-soft mb-4 p-3 text-sm text-emerald-200">
            {holder.status}
          </p>
        )}

        {profile ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard
                label="Wallet"
                value={walletLabel(profile.walletAddress)}
              />
              <MetricCard
                label="Liquid $BEARCO"
                value={formatTokenAmount(profile.balance.uiAmountString)}
              />
              <MetricCard
                label="Streamflow locked"
                value={
                  hasStreamflowLock(profile)
                    ? `${formatTokenAmount(profile.lockedBalance.uiAmountString)} / ${formatHolderPercent(profile.lockedBalance.holderPercent)}`
                    : "0"
                }
              />
              <MetricCard
                label="Effective $BEARCO"
                value={formatTokenAmount(profile.effectiveBalance.uiAmountString)}
              />
              <MetricCard
                label="Supply"
                value={formatTokenAmount(profile.supply.uiAmountString)}
              />
              <MetricCard
                label="Highest room"
                value={profile.highestTier?.shortTitle || "Locked"}
              />
              <MetricCard
                label="LP tokens"
                value={
                  profile.profile?.lp_token_balance_snapshot
                    ? formatTokenAmount(profile.profile.lp_token_balance_snapshot)
                    : "Not provided"
                }
              />
              <MetricCard
                label="X auth"
                value={socialStatusLabel(socialIdentity(profile.profile, "x"))}
              />
              <MetricCard
                label="Telegram auth"
                value={socialStatusLabel(
                  socialIdentity(profile.profile, "telegram"),
                )}
              />
              <MetricCard
                label="Discord auth"
                value={socialStatusLabel(
                  socialIdentity(profile.profile, "discord"),
                )}
              />
            </div>

            <div className="bearified-panel-soft p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="bearified-mono text-xs uppercase tracking-[0.18em] text-white">
                  Unlocked rooms
                </p>
                <p className="bearified-mono text-[10px] text-[var(--bearified-faint)]">
                  Mint {BEARCO_MINT_ADDRESS.slice(0, 6)}...
                  {BEARCO_MINT_ADDRESS.slice(-4)}
                </p>
              </div>
              <p className="mb-3 text-xs leading-5 text-[var(--bearified-muted)]">
                Room access uses liquid wallet tokens plus credited Streamflow
                locks.
              </p>
              <div className="grid gap-2">
                {HOLDER_TIERS.map((tier) => {
                  const unlocked =
                    profile.holderPercent >= tier.thresholdPercent;
                  return (
                    <Link
                      key={tier.key}
                      href={tier.path}
                      className={`flex items-center justify-between gap-3 border px-4 py-3 transition ${
                        unlocked
                          ? "border-[var(--bearified-accent)] bg-[rgb(254_106_0_/_0.08)] text-white hover:bg-[rgb(254_106_0_/_0.12)]"
                          : "border-[var(--bearified-border-muted)] bg-white/[0.025] text-white/42"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        {unlocked ? (
                          <ShieldCheck className="h-4 w-4 text-orange-200" />
                        ) : (
                          <LockKeyhole className="h-4 w-4" />
                        )}
                        <span className="bearified-mono text-xs uppercase tracking-[0.12em]">
                          {tier.title}
                        </span>
                      </span>
                      <span className="bearified-mono text-xs">
                        {tier.shortTitle}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="bearified-panel-soft p-6 text-[var(--bearified-muted)]">
            <p className="bearified-mono text-sm leading-7">
              Connect or check a wallet to see its $BEARCO balance, supply
              percentage, authenticated socials, and unlocked holder rooms.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

export function BearcoHolderGate({
  requiredPercent,
  title,
  children,
}: {
  requiredPercent: number;
  title: string;
  children?: React.ReactNode;
}) {
  const holder = useBearcoHolder();
  const profile = holder.profile;
  const sessionMatchesProfile =
    holder.sessionReady &&
    holder.sessionWalletAddress === profile?.walletAddress;
  const qualifies = Boolean(profile && profile.holderPercent >= requiredPercent);
  const canSignRoomSession = qualifies && holder.connected && !sessionMatchesProfile;
  const unlocked = sessionMatchesProfile && qualifies;

  return (
    <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
      <section className="bearified-panel p-5 sm:p-7">
        <div className="mb-5 flex items-start gap-4">
          <div className="border border-[var(--bearified-border)] bg-[rgb(254_106_0_/_0.08)] p-3 text-[var(--bearified-accent)]">
            {unlocked ? (
              <Crown className="h-6 w-6" />
            ) : (
              <KeyRound className="h-6 w-6" />
            )}
          </div>
          <div>
            <p className="bearified-kicker">
              Requires {requiredPercent}%+
            </p>
            <h2 className="bearified-display mt-3 text-5xl leading-none">
              {title}
            </h2>
          </div>
        </div>

        <button
          onClick={holder.connectWallet}
          disabled={holder.loading}
          className="bearified-button w-full px-5 py-3"
        >
          <Wallet className="h-5 w-5" />
          {sessionMatchesProfile ? "Holder session ready" : "Connect Solana wallet"}
        </button>

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

        {profile && (
          <div className="mt-4 grid gap-3">
            <MetricCard
              label="Connected wallet"
              value={walletLabel(profile.walletAddress)}
            />
            <MetricCard
              label="Effective holding"
              value={formatHolderPercent(profile.holderPercent)}
            />
            <MetricCard
              label="Liquid $BEARCO"
              value={formatTokenAmount(profile.balance.uiAmountString)}
            />
            <MetricCard
              label="Streamflow locked"
              value={
                hasStreamflowLock(profile)
                  ? `${formatTokenAmount(profile.lockedBalance.uiAmountString)} / ${formatHolderPercent(profile.lockedBalance.holderPercent)}`
                  : "0"
              }
            />
          </div>
        )}

        {qualifies && !sessionMatchesProfile && (
          <div className="bearified-panel-soft mt-4 p-4">
            <p className="text-sm leading-6 text-orange-100">
              This wallet meets the {requiredPercent}% room threshold. Sign the
              holder profile once to create the secure browser session that
              opens room links.
            </p>
            {canSignRoomSession ? (
              <button
                onClick={holder.claimProfile}
                disabled={holder.claiming}
                className="bearified-button bearified-button-secondary mt-4 w-full justify-center px-4 py-3"
              >
                {holder.claiming ? "Waiting for signature..." : "Sign room session"}
                <BadgeCheck className="h-4 w-4" />
              </button>
            ) : (
              <Link
                href="/holders"
                className="bearified-button bearified-button-secondary mt-4 w-full justify-center px-4 py-3"
              >
                Sign holder profile
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        )}

        {!unlocked && !qualifies && (
          <p className="bearified-panel-soft mt-4 p-4 text-sm leading-6 text-[var(--bearified-muted)]">
            This room opens when the connected wallet holds at least{" "}
            {requiredPercent}% of the $BEARCO supply, counting credited
            Streamflow locks. Public wallet lookup can show balances, but room
            links require a signed holder session.
          </p>
        )}
      </section>

      <section
        className={`border p-5 sm:p-7 ${
          unlocked
            ? "border-[var(--bearified-accent)] bg-[rgb(254_106_0_/_0.08)]"
            : "border-[var(--bearified-border-muted)] bg-white/[0.035]"
        }`}
      >
        {unlocked && children ? (
          children
        ) : (
          <div className="flex min-h-80 flex-col items-center justify-center text-center">
            <LockKeyhole className="mb-5 h-10 w-10 text-[var(--bearified-faint)]" />
            <h3 className="bearified-display text-5xl leading-none">
              {qualifies ? "Sign profile to open this room." : "Locked for this wallet."}
            </h3>
            <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--bearified-muted)]">
              {qualifies
                ? "This wallet meets the holder threshold. Use the holder profile page to sign a claim and start a secure room session."
                : "The gate checks the signed holder session, live $BEARCO token accounts on Solana, and credited Streamflow locks. Reconnect or sign the profile again, then refresh after the chain catches up."}
            </p>
            {qualifies && (
              <Link
                href="/holders"
                className="bearified-button bearified-button-secondary mt-6 px-4 py-3"
              >
                Sign holder profile
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        )}
      </section>
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

export function CommunityLinkButtons({
  links,
}: {
  links: HolderRoomCommunityLink[];
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {links.map((link) =>
        link.href ? (
          <a
            key={link.provider}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="bearified-button bearified-button-secondary justify-center px-3 py-3"
          >
            {link.label}
            <ExternalLink className="h-4 w-4" />
          </a>
        ) : (
          <span
            key={link.provider}
            className="bearified-mono inline-flex items-center justify-center border border-[var(--bearified-border-muted)] bg-white/[0.025] px-3 py-3 text-center text-[10px] uppercase tracking-[0.14em] text-[var(--bearified-faint)]"
          >
            Configure {link.label}
          </span>
        ),
      )}
    </div>
  );
}

export function HolderRoomLinks({
  showCommunityLinks = true,
}: {
  showCommunityLinks?: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {HOLDER_TIERS.map((tier) => (
        <article
          key={tier.key}
          className="group bearified-panel-soft p-4 transition hover:border-[var(--bearified-accent)] hover:bg-[rgb(254_106_0_/_0.08)]"
        >
          <p className="bearified-display text-4xl leading-none text-white">
            {tier.shortTitle}
          </p>
          <p className="mt-2 text-sm leading-5 text-[var(--bearified-muted)]">
            {tier.description}
          </p>
          <Link
            href={tier.path}
            className="bearified-mono mt-4 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--bearified-accent)]"
          >
            Open room
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </Link>
          {showCommunityLinks && (
            <div className="mt-4">
              <CommunityLinkButtons links={tier.communityLinks} />
            </div>
          )}
        </article>
      ))}
      <Link
        href={BEARCO_LIQUIDITY_PATH}
        className="group bearified-panel-soft p-4 transition hover:border-[var(--bearified-accent)] hover:bg-[rgb(254_106_0_/_0.08)]"
      >
        <p className="bearified-display text-4xl leading-none text-white">
          LP
        </p>
        <p className="mt-2 text-sm leading-5 text-[var(--bearified-muted)]">
          PumpSwap liquidity desk, pool readiness, and deposit flow planning.
        </p>
        <span className="bearified-mono mt-4 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--bearified-accent)]">
          Open desk
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
        </span>
      </Link>
      <Link
        href="/holders/dashboard"
        className="group bearified-panel-soft p-4 transition hover:border-[var(--bearified-accent)] hover:bg-[rgb(254_106_0_/_0.08)]"
      >
        <p className="bearified-display text-4xl leading-none text-white">
          Board
        </p>
        <p className="mt-2 text-sm leading-5 text-[var(--bearified-muted)]">
          Holder dashboard, authenticated socials, and feedback posts.
        </p>
        <span className="bearified-mono mt-4 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--bearified-accent)]">
          Open board
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
        </span>
      </Link>
    </div>
  );
}
