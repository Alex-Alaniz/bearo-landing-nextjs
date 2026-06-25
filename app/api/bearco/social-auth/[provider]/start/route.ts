import { NextRequest, NextResponse } from "next/server";
import { readHolderSessionWallet } from "@/lib/bearco-session";
import {
  SOCIAL_AUTH_COOKIE,
  buildAuthorizeUrl,
  createPkcePair,
  createSocialAuthState,
  getSocialAuthConfig,
  isSocialProvider,
  sanitizeReturnTo,
  socialAuthCookieOptions,
} from "@/lib/bearco-social-auth";

export const dynamic = "force-dynamic";

interface SocialAuthStartParams {
  params: Promise<{ provider: string }>;
}

function redirectWithStatus(
  req: NextRequest,
  returnTo: string,
  status: string,
): NextResponse {
  const url = new URL(returnTo, req.nextUrl.origin);
  url.searchParams.set("socialStatus", status);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest, { params }: SocialAuthStartParams) {
  const { provider: rawProvider } = await params;
  const returnTo = sanitizeReturnTo(req.nextUrl.searchParams.get("returnTo"));

  if (!isSocialProvider(rawProvider)) {
    return redirectWithStatus(req, returnTo, "unknown-provider");
  }

  const walletAddress = await readHolderSessionWallet();
  if (!walletAddress) {
    return redirectWithStatus(req, returnTo, "sign-profile-first");
  }

  const config = getSocialAuthConfig(rawProvider, req);
  if (!config) {
    return redirectWithStatus(req, returnTo, `${rawProvider}-not-configured`);
  }

  const { codeChallenge, codeVerifier } = createPkcePair();
  const socialState = createSocialAuthState({
    codeVerifier,
    provider: rawProvider,
    returnTo,
    walletAddress,
  });
  if (!socialState) {
    return redirectWithStatus(req, returnTo, "social-auth-not-configured");
  }

  const response = NextResponse.redirect(
    buildAuthorizeUrl({ codeChallenge, config, state: socialState.state }),
  );
  response.cookies.set(
    SOCIAL_AUTH_COOKIE,
    socialState.cookieValue,
    socialAuthCookieOptions(),
  );
  return response;
}
