import "server-only";

import { createHmac, randomBytes, timingSafeEqual, createHash } from "node:crypto";
import { jwtVerify, createRemoteJWKSet } from "jose";
import type { NextRequest } from "next/server";
import type { BearcoSocialProvider } from "./bearco-server";

export const SOCIAL_AUTH_COOKIE = "bearco_social_auth";
const SOCIAL_AUTH_MAX_AGE_SECONDS = 10 * 60;
const TELEGRAM_ISSUER = "https://oauth.telegram.org";

interface SocialAuthState {
  codeVerifier: string;
  issuedAt: number;
  provider: BearcoSocialProvider;
  returnTo: string;
  state: string;
  walletAddress: string;
}

interface SocialAuthConfig {
  authorizeUrl: string;
  clientId: string;
  clientSecret: string | null;
  provider: BearcoSocialProvider;
  redirectUri: string;
  scopes: string[];
  tokenUrl: string;
}

export interface SocialAuthProviderStatus {
  callbackUrl: string;
  configured: boolean;
  missingRequiredEnv: string[];
  optionalEnv: string[];
}

export interface SocialAuthIdentity {
  displayName: string | null;
  provider: BearcoSocialProvider;
  providerUserId: string;
  username: string | null;
}

interface XUserResponse {
  data?: {
    id?: string;
    name?: string;
    username?: string;
  };
}

interface DiscordUserResponse {
  global_name?: string | null;
  id?: string;
  username?: string;
}

interface TokenResponse {
  access_token?: string;
  id_token?: string;
  token_type?: string;
}

function getSocialAuthSecret(): string | null {
  if (process.env.BEARCO_SOCIAL_AUTH_SECRET) {
    return process.env.BEARCO_SOCIAL_AUTH_SECRET;
  }
  if (process.env.BEARCO_SESSION_SECRET) {
    return process.env.BEARCO_SESSION_SECRET;
  }
  if (process.env.NODE_ENV === "production") {
    return null;
  }
  return process.env.SUPABASE_SERVICE_ROLE_KEY || "bearco-local-social-auth";
}

function signPayload(payload: string): string | null {
  const secret = getSocialAuthSecret();
  if (!secret) return null;
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function signaturesMatch(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function createPkcePair(): {
  codeChallenge: string;
  codeVerifier: string;
} {
  const codeVerifier = randomToken(48);
  const codeChallenge = createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  return { codeChallenge, codeVerifier };
}

export function createSocialAuthState(input: {
  codeVerifier: string;
  provider: BearcoSocialProvider;
  returnTo: string;
  walletAddress: string;
}): { cookieValue: string; state: string } | null {
  const state = randomToken(24);
  const payload = Buffer.from(
    JSON.stringify({
      ...input,
      issuedAt: Date.now(),
      state,
    } satisfies SocialAuthState),
  ).toString("base64url");
  const signature = signPayload(payload);
  if (!signature) return null;

  return { cookieValue: `${payload}.${signature}`, state };
}

export function readSocialAuthState(value: string | undefined): SocialAuthState | null {
  if (!value) return null;

  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = signPayload(payload);
  if (!expected || !signaturesMatch(signature, expected)) return null;

  try {
    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Partial<SocialAuthState>;

    if (!isSocialProvider(decoded.provider)) return null;
    if (typeof decoded.state !== "string") return null;
    if (typeof decoded.codeVerifier !== "string") return null;
    if (typeof decoded.returnTo !== "string") return null;
    if (typeof decoded.walletAddress !== "string") return null;
    if (typeof decoded.issuedAt !== "number") return null;

    const ageMs = Date.now() - decoded.issuedAt;
    if (ageMs < 0 || ageMs > SOCIAL_AUTH_MAX_AGE_SECONDS * 1000) return null;

    return decoded as SocialAuthState;
  } catch {
    return null;
  }
}

export function socialAuthCookieOptions() {
  return {
    httpOnly: true,
    maxAge: SOCIAL_AUTH_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export function clearSocialAuthCookieOptions() {
  return {
    ...socialAuthCookieOptions(),
    maxAge: 0,
  };
}

export function isSocialProvider(value: unknown): value is BearcoSocialProvider {
  return value === "x" || value === "telegram" || value === "discord";
}

function siteOrigin(req: NextRequest): string {
  return (
    process.env.BEARCO_SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    req.nextUrl.origin
  ).replace(/\/+$/, "");
}

function socialEnv(provider: BearcoSocialProvider, name: string): string {
  const prefix =
    provider === "x"
      ? "BEARCO_X"
      : provider === "telegram"
        ? "BEARCO_TELEGRAM"
        : "BEARCO_DISCORD";
  return process.env[`${prefix}_${name}`]?.trim() || "";
}

export function getSocialAuthConfig(
  provider: BearcoSocialProvider,
  req: NextRequest,
): SocialAuthConfig | null {
  const clientId = socialEnv(provider, "CLIENT_ID");
  const clientSecret = socialEnv(provider, "CLIENT_SECRET") || null;
  if (!clientId) return null;
  if ((provider === "discord" || provider === "telegram") && !clientSecret) {
    return null;
  }

  const origin = siteOrigin(req);
  const redirectUri = `${origin}/api/bearco/social-auth/${provider}/callback`;

  if (provider === "x") {
    return {
      authorizeUrl: "https://x.com/i/oauth2/authorize",
      clientId,
      clientSecret,
      provider,
      redirectUri,
      scopes: ["tweet.read", "users.read"],
      tokenUrl: "https://api.x.com/2/oauth2/token",
    };
  }

  if (provider === "telegram") {
    return {
      authorizeUrl: "https://oauth.telegram.org/auth",
      clientId,
      clientSecret,
      provider,
      redirectUri,
      scopes: ["openid", "profile"],
      tokenUrl: "https://oauth.telegram.org/token",
    };
  }

  return {
    authorizeUrl: "https://discord.com/oauth2/authorize",
    clientId,
    clientSecret,
    provider,
    redirectUri,
    scopes: ["identify"],
    tokenUrl: "https://discord.com/api/oauth2/token",
  };
}

export function buildAuthorizeUrl(input: {
  codeChallenge: string;
  config: SocialAuthConfig;
  state: string;
}): string {
  const url = new URL(input.config.authorizeUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", input.config.clientId);
  url.searchParams.set("redirect_uri", input.config.redirectUri);
  url.searchParams.set("scope", input.config.scopes.join(" "));
  url.searchParams.set("state", input.state);

  if (input.config.provider !== "discord") {
    url.searchParams.set("code_challenge", input.codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
  }

  return url.toString();
}

function tokenAuthorizationHeader(config: SocialAuthConfig): string | null {
  if (!config.clientSecret) return null;
  return `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`;
}

async function exchangeCode(input: {
  code: string;
  codeVerifier: string;
  config: SocialAuthConfig;
}): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: input.config.redirectUri,
    client_id: input.config.clientId,
  });

  if (input.config.provider !== "discord") {
    body.set("code_verifier", input.codeVerifier);
  }

  if (input.config.provider === "discord" && input.config.clientSecret) {
    body.set("client_secret", input.config.clientSecret);
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };
  const authHeader = tokenAuthorizationHeader(input.config);
  if (authHeader && input.config.provider !== "discord") {
    headers.Authorization = authHeader;
  }

  const response = await fetch(input.config.tokenUrl, {
    method: "POST",
    headers,
    body,
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as TokenResponse & {
    error?: string;
    error_description?: string;
  };

  if (!response.ok) {
    throw new Error(
      payload.error_description || payload.error || "Social token exchange failed",
    );
  }

  return payload;
}

async function getXIdentity(accessToken: string): Promise<SocialAuthIdentity> {
  const response = await fetch("https://api.x.com/2/users/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as XUserResponse;
  if (!response.ok || !payload.data?.id) {
    throw new Error("Unable to load authenticated X profile");
  }

  return {
    displayName: payload.data.name || null,
    provider: "x",
    providerUserId: payload.data.id,
    username: payload.data.username || null,
  };
}

async function getDiscordIdentity(
  accessToken: string,
): Promise<SocialAuthIdentity> {
  const response = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as DiscordUserResponse;
  if (!response.ok || !payload.id) {
    throw new Error("Unable to load authenticated Discord profile");
  }

  return {
    displayName: payload.global_name || payload.username || null,
    provider: "discord",
    providerUserId: payload.id,
    username: payload.username || null,
  };
}

async function getTelegramIdentity(
  idToken: string,
  clientId: string,
): Promise<SocialAuthIdentity> {
  const jwks = createRemoteJWKSet(
    new URL("https://oauth.telegram.org/.well-known/jwks.json"),
  );
  const { payload } = await jwtVerify(idToken, jwks, {
    audience: clientId,
    issuer: TELEGRAM_ISSUER,
  });

  if (typeof payload.sub !== "string") {
    throw new Error("Telegram identity token did not include a user id");
  }

  const username =
    typeof payload.preferred_username === "string"
      ? payload.preferred_username
      : null;
  const displayName = typeof payload.name === "string" ? payload.name : null;

  return {
    displayName,
    provider: "telegram",
    providerUserId: payload.sub,
    username,
  };
}

export async function exchangeSocialAuthCode(input: {
  code: string;
  codeVerifier: string;
  config: SocialAuthConfig;
}): Promise<SocialAuthIdentity> {
  const token = await exchangeCode(input);

  if (input.config.provider === "telegram") {
    if (!token.id_token) {
      throw new Error("Telegram did not return an identity token");
    }
    return getTelegramIdentity(token.id_token, input.config.clientId);
  }

  if (!token.access_token) {
    throw new Error("Social provider did not return an access token");
  }

  return input.config.provider === "x"
    ? getXIdentity(token.access_token)
    : getDiscordIdentity(token.access_token);
}

export function sanitizeReturnTo(value: string | null): string {
  if (!value) return "/holders/dashboard";
  if (!value.startsWith("/holders")) return "/holders/dashboard";
  if (value.startsWith("//")) return "/holders/dashboard";
  return value;
}
