import { NextRequest, NextResponse } from "next/server";
import {
  getSocialAuthConfig,
  type SocialAuthProviderStatus,
} from "@/lib/bearco-social-auth";
import type { BearcoSocialProvider } from "@/lib/bearco-server";

export const dynamic = "force-dynamic";

const PROVIDERS: BearcoSocialProvider[] = ["x", "telegram", "discord"];

const REQUIRED_ENV: Record<BearcoSocialProvider, string[]> = {
  discord: ["BEARCO_DISCORD_CLIENT_ID", "BEARCO_DISCORD_CLIENT_SECRET"],
  telegram: ["BEARCO_TELEGRAM_CLIENT_ID", "BEARCO_TELEGRAM_CLIENT_SECRET"],
  x: ["BEARCO_X_CLIENT_ID"],
};

const OPTIONAL_ENV: Record<BearcoSocialProvider, string[]> = {
  discord: [],
  telegram: ["BEARCO_TELEGRAM_BOT_TOKEN"],
  x: ["BEARCO_X_CLIENT_SECRET"],
};

function siteOrigin(req: NextRequest): string {
  return (
    process.env.BEARCO_SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    req.nextUrl.origin
  ).replace(/\/+$/, "");
}

function providerStatus(
  provider: BearcoSocialProvider,
  req: NextRequest,
): SocialAuthProviderStatus {
  const missingRequiredEnv = REQUIRED_ENV[provider].filter(
    (name) => !process.env[name]?.trim(),
  );
  const configured = Boolean(getSocialAuthConfig(provider, req));

  return {
    callbackUrl: `${siteOrigin(req)}/api/bearco/social-auth/${provider}/callback`,
    configured,
    missingRequiredEnv,
    optionalEnv: OPTIONAL_ENV[provider],
  };
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    directProviders: Object.fromEntries(
      PROVIDERS.map((provider) => [provider, providerStatus(provider, req)]),
    ),
    privy: {
      configured: Boolean(
        process.env.PRIVY_APP_ID?.trim() ||
          process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim(),
      ),
      identitySyncEndpoint: "/api/bearco/privy-social-sync",
    },
    updatedAt: new Date().toISOString(),
  });
}
