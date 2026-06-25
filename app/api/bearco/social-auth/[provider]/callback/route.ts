import { NextRequest, NextResponse } from "next/server";
import { readHolderSessionWallet } from "@/lib/bearco-session";
import { upsertHolderSocialIdentity } from "@/lib/bearco-server";
import {
  SOCIAL_AUTH_COOKIE,
  clearSocialAuthCookieOptions,
  exchangeSocialAuthCode,
  getSocialAuthConfig,
  isSocialProvider,
  readSocialAuthState,
  sanitizeReturnTo,
} from "@/lib/bearco-social-auth";

export const dynamic = "force-dynamic";

interface SocialAuthCallbackParams {
  params: Promise<{ provider: string }>;
}

function callbackRedirect(
  req: NextRequest,
  returnTo: string,
  status: string,
  provider?: string,
): NextResponse {
  const url = new URL(returnTo, req.nextUrl.origin);
  url.searchParams.set("socialStatus", status);
  if (provider) url.searchParams.set("social", provider);

  const response = NextResponse.redirect(url);
  response.cookies.set(
    SOCIAL_AUTH_COOKIE,
    "",
    clearSocialAuthCookieOptions(),
  );
  return response;
}

export async function GET(
  req: NextRequest,
  { params }: SocialAuthCallbackParams,
) {
  const { provider: rawProvider } = await params;
  const storedState = readSocialAuthState(
    req.cookies.get(SOCIAL_AUTH_COOKIE)?.value,
  );
  const returnTo = sanitizeReturnTo(storedState?.returnTo || null);

  if (!isSocialProvider(rawProvider) || rawProvider !== storedState?.provider) {
    return callbackRedirect(req, returnTo, "provider-mismatch");
  }

  const state = req.nextUrl.searchParams.get("state");
  const code = req.nextUrl.searchParams.get("code");
  const denied = req.nextUrl.searchParams.get("error");
  if (denied) return callbackRedirect(req, returnTo, "provider-denied", rawProvider);
  if (!state || state !== storedState.state || !code) {
    return callbackRedirect(req, returnTo, "state-mismatch", rawProvider);
  }

  const walletAddress = await readHolderSessionWallet();
  if (!walletAddress || walletAddress !== storedState.walletAddress) {
    return callbackRedirect(req, returnTo, "session-expired", rawProvider);
  }

  const config = getSocialAuthConfig(rawProvider, req);
  if (!config) {
    return callbackRedirect(req, returnTo, `${rawProvider}-not-configured`);
  }

  try {
    const identity = await exchangeSocialAuthCode({
      code,
      codeVerifier: storedState.codeVerifier,
      config,
    });
    const result = await upsertHolderSocialIdentity({
      walletAddress,
      provider: rawProvider,
      providerUserId: identity.providerUserId,
      username: identity.username,
      displayName: identity.displayName,
    });

    return callbackRedirect(
      req,
      returnTo,
      result.persisted ? "connected" : "storage-not-ready",
      rawProvider,
    );
  } catch (error) {
    console.warn("[bearco-social-auth] callback failed", {
      error: error instanceof Error ? error.message : "Unknown social auth error",
      provider: rawProvider,
    });
    return callbackRedirect(req, returnTo, "connect-failed", rawProvider);
  }
}
