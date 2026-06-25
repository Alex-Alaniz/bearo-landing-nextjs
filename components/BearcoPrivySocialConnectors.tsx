"use client";

import { useCallback, useMemo, useState } from "react";
import {
  getIdentityToken,
  useLinkAccount,
  useLogin,
  usePrivy,
  useUser,
} from "@privy-io/react-auth";
import { ExternalLink } from "lucide-react";
import type { useBearcoHolder } from "@/components/BearcoHolderAccess";

type SocialProvider = "x" | "telegram" | "discord";
type PrivySocialLoginMethod = "twitter" | "telegram" | "discord";

interface SocialConnector {
  connected: boolean;
  label: string;
  provider: SocialProvider;
  shortLabel: string;
  statusLabel: string;
}

interface BearcoPrivySocialConnectorsProps {
  canConnect: boolean;
  connectors: SocialConnector[];
  holder: ReturnType<typeof useBearcoHolder>;
}

function providerLabel(provider: SocialProvider): string {
  return provider === "x"
    ? "X"
    : provider === "telegram"
      ? "Telegram"
      : "Discord";
}

function providerFromLinkedAccountType(type: string): SocialProvider | null {
  if (type === "twitter_oauth") return "x";
  if (type === "telegram") return "telegram";
  if (type === "discord_oauth") return "discord";
  return null;
}

function providerLoginMethod(provider: SocialProvider): PrivySocialLoginMethod {
  return provider === "x" ? "twitter" : provider;
}

function providerFromLoginMethod(method: string | null): SocialProvider | null {
  if (method === "twitter") return "x";
  if (method === "telegram") return "telegram";
  if (method === "discord") return "discord";
  return null;
}

function errorCode(error: unknown): string {
  if (typeof error === "string") return error.trim().toLowerCase();
  if (typeof error === "object" && error) {
    const record = error as {
      code?: unknown;
      error?: unknown;
      errorCode?: unknown;
      privyErrorCode?: unknown;
    };
    const code =
      record.privyErrorCode || record.errorCode || record.code || record.error;
    if (typeof code === "string") return code.trim().toLowerCase();
  }
  return "";
}

function providerFailureMessage(
  provider: SocialProvider | null,
  error: unknown,
): string {
  const label = provider ? providerLabel(provider) : "Privy";
  const code = errorCode(error);

  if (code === "invalid_credentials") {
    return `${label} returned an invalid-credentials error from Privy before the profile could sync. Check the production Privy app's ${label} login settings, OAuth credentials, and allowed origins, then retry.`;
  }
  if (code === "linked_to_another_user") {
    return `${label} is already linked to another Privy user. Sign into that Privy account or transfer/unlink it in Privy before retrying.`;
  }
  if (code === "oauth_user_denied") {
    return `${label} authorization was canceled before it completed. Retry and finish the provider approval screen.`;
  }
  if (code === "too_many_requests") {
    return `${label} is rate-limited right now. Wait a moment and retry.`;
  }

  return `${label} linking did not complete. Retry from this holder profile after the Privy popup closes.`;
}

export function BearcoPrivySocialConnectors({
  canConnect,
  connectors,
  holder,
}: BearcoPrivySocialConnectorsProps) {
  const { authenticated, ready } = usePrivy();
  const { refreshUser } = useUser();
  const [syncingProvider, setSyncingProvider] = useState<
    SocialProvider | "all" | null
  >(null);
  const [loginProvider, setLoginProvider] = useState<SocialProvider | null>(
    null,
  );
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connectedCount = useMemo(
    () => connectors.filter((connector) => connector.connected).length,
    [connectors],
  );

  const syncPrivySocials = useCallback(
    async (provider?: SocialProvider) => {
      setSyncingProvider(provider || "all");
      setStatus(null);
      setError(null);

      try {
        await refreshUser();
        const identityToken = await getIdentityToken();
        if (!identityToken) {
          throw new Error(
            "Privy identity tokens are not enabled for this app yet.",
          );
        }

        const response = await fetch("/api/bearco/privy-social-sync", {
          body: JSON.stringify({ identityToken }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(result.error || "Unable to sync Privy socials.");
        }

        const persisted = Array.isArray(result.persisted)
          ? (result.persisted as SocialProvider[])
          : [];
        const providerList = persisted
          .map((item) => providerLabel(item))
          .join(", ");
        const statusPrefix =
          providerList || (provider ? providerLabel(provider) : "Privy");
        const accountNoun =
          persisted.length > 1 || (!provider && persisted.length !== 1)
            ? "accounts"
            : "account";
        setStatus(`${statusPrefix} ${accountNoun} verified and saved.`);
        await holder.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to sync Privy.");
      } finally {
        setSyncingProvider(null);
      }
    },
    [holder, refreshUser],
  );

  const { linkDiscord, linkTelegram, linkTwitter } = useLinkAccount({
    onError: (linkError, details) => {
      const provider =
        details.linkMethod === "twitter"
          ? "x"
          : details.linkMethod === "telegram"
            ? "telegram"
            : details.linkMethod === "discord"
              ? "discord"
              : null;
      setError(providerFailureMessage(provider, linkError));
    },
    onSuccess: ({ linkedAccount }) => {
      const provider = providerFromLinkedAccountType(linkedAccount.type);
      if (provider) void syncPrivySocials(provider);
    },
  });

  const startProviderLink = useCallback(
    (provider: SocialProvider) => {
      if (provider === "x") {
        linkTwitter();
        return;
      }
      if (provider === "telegram") {
        linkTelegram();
        return;
      }
      linkDiscord();
    },
    [linkDiscord, linkTelegram, linkTwitter],
  );

  const { login } = useLogin({
    onComplete: ({ loginMethod }) => {
      const provider = providerFromLoginMethod(loginMethod) || loginProvider;
      setLoginProvider(null);
      if (provider) {
        setStatus(`${providerLabel(provider)} sign-in complete. Saving...`);
        void syncPrivySocials(provider);
        return;
      }

      setStatus(
        "Privy sign-in is ready. Choose X, Telegram, or Discord to link that verified account.",
      );
    },
    onError: (loginError) => {
      setError(providerFailureMessage(loginProvider, loginError));
      setLoginProvider(null);
    },
  });

  function connect(provider: SocialProvider) {
    setStatus(null);
    setError(null);

    if (!ready || !canConnect) return;
    if (!authenticated) {
      setLoginProvider(provider);
      login({ loginMethods: [providerLoginMethod(provider)] });
      return;
    }

    startProviderLink(provider);
  }

  function signIntoPrivy() {
    setStatus(null);
    setError(null);
    if (!ready || !canConnect) return;
    setLoginProvider(null);
    login({ loginMethods: ["email"] });
  }

  return (
    <>
      <div className="grid gap-3">
        {connectors.map((connector) => {
          const syncing = syncingProvider === connector.provider;
          const loggingIn = loginProvider === connector.provider;
          const disabled =
            !canConnect ||
            Boolean(loginProvider) ||
            Boolean(syncingProvider) ||
            !ready;
          const actionLabel = !canConnect
            ? "Sign profile first"
            : !ready
                ? "Loading Privy"
                : loggingIn
                  ? `Opening ${connector.shortLabel}`
                  : connector.connected
                    ? `Reconnect ${connector.shortLabel}`
                    : `Connect ${connector.shortLabel}`;

          return (
            <div
              key={connector.provider}
              className="grid gap-3 border border-[var(--bearified-border-muted)] bg-white/[0.025] p-3 sm:grid-cols-[1fr_auto] sm:items-center"
            >
              <div>
                <p className="bearified-mono text-[10px] uppercase tracking-[0.2em] text-[var(--bearified-faint)]">
                  {connector.label}
                </p>
                <p className="bearified-mono mt-1 text-sm text-white">
                  {connector.statusLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => connect(connector.provider)}
                disabled={disabled}
                className={`bearified-button bearified-button-secondary justify-center px-4 py-3 ${
                  disabled ? "opacity-45" : ""
                }`}
              >
                {syncing ? "Saving..." : actionLabel}
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      {authenticated && canConnect && (
        <div className="mt-3 border border-[var(--bearified-border-muted)] bg-white/[0.025] p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-[var(--bearified-muted)]">
              Privy is signed in. Sync pulls any already-linked X, Telegram,
              or Discord accounts into this holder profile.
            </p>
            <button
              type="button"
              onClick={() => void syncPrivySocials()}
              disabled={Boolean(syncingProvider)}
              className={`bearified-button bearified-button-secondary justify-center px-4 py-3 ${
                syncingProvider ? "opacity-45" : ""
              }`}
            >
              {syncingProvider === "all"
                ? "Syncing..."
                : `Sync linked socials (${connectedCount}/3)`}
            </button>
          </div>
        </div>
      )}

      {!authenticated && canConnect && (
        <div className="mt-3 border border-[var(--bearified-border-muted)] bg-white/[0.025] p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-[var(--bearified-muted)]">
              Connect X, Telegram, or Discord directly to create a verified
              Privy session for this holder profile. Email remains available as
              a backup login method.
            </p>
            <button
              type="button"
              onClick={signIntoPrivy}
              disabled={!ready || !canConnect}
              className={`bearified-button bearified-button-secondary justify-center px-4 py-3 ${
                !ready || !canConnect ? "opacity-45" : ""
              }`}
            >
              Sign into Privy
              <ExternalLink className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {status && (
        <p className="bearified-panel-soft mt-3 p-3 text-xs leading-5 text-emerald-200">
          {status}
        </p>
      )}
      {error && (
        <p className="bearified-panel-soft mt-3 p-3 text-xs leading-5 text-red-200">
          {error}
        </p>
      )}
    </>
  );
}
