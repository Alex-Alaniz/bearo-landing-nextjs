"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { detectPlatform, Platform } from "../../../lib/deviceDetection";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
          theme?: "dark" | "light" | "auto";
        }
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

interface ReferralClientProps {
  code: string;
}

interface ClaimResult {
  platform: Platform;
  effectiveReferrerCode: string;
  attributionStatus: "new" | "repeat_same_referrer" | "different_referrer_exists";
  ctaUrl: string | null;
  invite?: {
    attempted: boolean;
    skippedReason?: string;
    success?: boolean;
    alreadyInvited?: boolean;
    error?: string;
  };
}

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

export function ReferralClient({ code }: ReferralClientProps) {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [challenge, setChallenge] = useState<unknown>(null);
  const [step, setStep] = useState<"email" | "otp" | "done">("email");
  const [captchaToken, setCaptchaToken] = useState("");
  const [claim, setClaim] = useState<ClaimResult | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);

  useEffect(() => {
    setPlatform(detectPlatform());
    document.cookie = `bearo_referral_code=${encodeURIComponent(code)}; max-age=${60 * 60 * 24 * 30}; path=/; SameSite=Lax`;
  }, [code]);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !turnstileRef.current || turnstileWidgetId.current) return;

    const renderTurnstile = () => {
      if (!window.turnstile || !turnstileRef.current || turnstileWidgetId.current) return;
      turnstileWidgetId.current = window.turnstile.render(turnstileRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: "dark",
        callback: setCaptchaToken,
        "expired-callback": () => setCaptchaToken(""),
        "error-callback": () => setCaptchaToken(""),
      });
    };

    if (window.turnstile) {
      renderTurnstile();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = renderTurnstile;
    document.head.appendChild(script);
  }, []);

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;

    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/referral-claim/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          code,
          platform,
          captchaToken,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not send verification code.");
      }
      setChallenge(data.challenge ?? null);
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send verification code.");
      window.turnstile?.reset(turnstileWidgetId.current ?? undefined);
      setCaptchaToken("");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleOtpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;

    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/referral-claim/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          code,
          otp,
          platform,
          challenge,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not verify invite.");
      }
      setClaim(data);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify invite.");
    } finally {
      setIsLoading(false);
    }
  }

  const isAndroidQueued = claim?.platform === "android" && !claim.ctaUrl;
  const ctaLabel = claim?.platform === "android" ? "Open Android beta" : "Open in TestFlight";

  return (
    <div className="w-full max-w-md">
      {step === "email" && (
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-white/70">
              Email
            </label>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-base font-medium text-white outline-none transition focus:border-[#f97316]/60"
              required
            />
          </div>

          {TURNSTILE_SITE_KEY && <div ref={turnstileRef} className="min-h-[65px]" />}

          {error && (
            <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading || (TURNSTILE_SITE_KEY ? !captchaToken : false)}
            className="w-full rounded-2xl bg-[#f97316] px-6 py-4 text-base font-semibold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Sending code..." : "Claim beta invite"}
          </button>

          <p className="text-center text-xs leading-5 text-white/45">
            By continuing, you agree that Bearo may use your email and referral attribution for beta access.{" "}
            <Link href="/privacy" className="text-white/70 underline">
              Privacy Policy
            </Link>
          </p>
        </form>
      )}

      {step === "otp" && (
        <form onSubmit={handleOtpSubmit} className="space-y-4">
          <div>
            <label htmlFor="otp" className="mb-2 block text-sm font-medium text-white/70">
              Verification code
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="123456"
              className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-center font-mono text-2xl font-bold text-white outline-none transition focus:border-[#f97316]/60"
              required
            />
          </div>

          {error && (
            <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading || otp.length < 6}
            className="w-full rounded-2xl bg-[#f97316] px-6 py-4 text-base font-semibold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Verifying..." : "Verify and continue"}
          </button>

          <button
            type="button"
            onClick={() => {
              setStep("email");
              setOtp("");
              setError("");
            }}
            className="w-full py-2 text-sm font-medium text-white/50 transition hover:text-white/75"
          >
            Use a different email
          </button>
        </form>
      )}

      {step === "done" && claim && (
        <div className="space-y-4 text-center">
          <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-6">
            <p className="text-sm font-medium text-white/50">Referral linked</p>
            <p className="mt-2 font-mono text-2xl font-bold text-[#f97316]">
              {claim.effectiveReferrerCode}
            </p>
            {claim.attributionStatus === "different_referrer_exists" && (
              <p className="mt-3 text-sm leading-5 text-white/55">
                Your first referral is already saved, so this invite keeps that original attribution.
              </p>
            )}
          </div>

          {isAndroidQueued ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-5">
              <p className="font-semibold text-white">Android beta saved</p>
              <p className="mt-2 text-sm leading-6 text-white/55">
                Your invite is recorded. We will open Android installs as soon as the Play testing link is ready.
              </p>
            </div>
          ) : (
            <a
              href={claim.ctaUrl || "https://testflight.apple.com/join/E4tST7zJ"}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-2xl bg-[#f97316] px-6 py-4 text-base font-semibold text-white transition active:scale-[0.98]"
            >
              {ctaLabel}
            </a>
          )}

          {claim.platform === "ios" && (
            <p className="text-sm leading-6 text-white/50">
              We also sent a TestFlight invite when available. Did not get the email? Open TestFlight with the button above.
            </p>
          )}

          {claim.platform !== "android" && claim.platform !== "ios" && (
            <p className="text-sm leading-6 text-white/50">
              Open the iOS TestFlight link now, or come back from your phone with this same invite.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
