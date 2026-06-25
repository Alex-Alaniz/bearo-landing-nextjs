import { NextRequest, NextResponse } from "next/server";
import {
  PrivyClient,
  verifyIdentityToken,
} from "@privy-io/node";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import {
  upsertHolderSocialIdentity,
  type BearcoSocialProvider,
} from "@/lib/bearco-server";
import { readHolderSessionWallet } from "@/lib/bearco-session";

export const dynamic = "force-dynamic";

interface BearcoPrivySocialIdentity {
  displayName: string | null;
  provider: BearcoSocialProvider;
  providerUserId: string;
  username: string | null;
}

type LinkedAccountRecord = Record<string, unknown>;

let privyJwksCache:
  | {
      appId: string;
      jwks: ReturnType<typeof createRemoteJWKSet>;
    }
  | null = null;

function privyAppId(): string {
  return (
    process.env.PRIVY_APP_ID ||
    process.env.NEXT_PUBLIC_PRIVY_APP_ID ||
    ""
  ).trim();
}

function privyVerificationKey(): string {
  return (
    process.env.PRIVY_VERIFICATION_KEY ||
    process.env.PRIVY_JWT_VERIFICATION_KEY ||
    ""
  )
    .replace(/\\n/g, "\n")
    .trim();
}

function privyJwksEndpoint(appId: string): URL {
  return new URL(
    process.env.PRIVY_JWKS_URL?.trim() ||
      `https://auth.privy.io/api/v1/apps/${encodeURIComponent(appId)}/jwks.json`,
  );
}

function privyRemoteJwks(appId: string) {
  if (!privyJwksCache || privyJwksCache.appId !== appId) {
    privyJwksCache = {
      appId,
      jwks: createRemoteJWKSet(privyJwksEndpoint(appId)),
    };
  }
  return privyJwksCache.jwks;
}

function parsedLinkedAccounts(payload: JWTPayload): LinkedAccountRecord[] {
  const raw = payload.linked_accounts;
  const accounts =
    typeof raw === "string"
      ? JSON.parse(raw)
      : Array.isArray(raw)
        ? raw
        : [];

  return Array.isArray(accounts)
    ? accounts.filter(
        (account): account is LinkedAccountRecord =>
          typeof account === "object" && account !== null,
      )
    : [];
}

async function linkedAccountsFromPrivyIdentityToken(
  identityToken: string,
): Promise<unknown[] | null> {
  const appId = privyAppId();
  if (!appId) return null;

  const verificationKey = privyVerificationKey();
  if (verificationKey) {
    const user = await verifyIdentityToken({
      app_id: appId,
      identity_token: identityToken,
      verification_key: verificationKey,
    });
    return user.linked_accounts;
  }

  const appSecret = process.env.PRIVY_APP_SECRET?.trim();
  if (appSecret) {
    const client = new PrivyClient({ appId, appSecret });
    const user = await client.users().get({ id_token: identityToken });
    return user.linked_accounts;
  }

  const { payload } = await jwtVerify(identityToken, privyRemoteJwks(appId), {
    audience: appId,
    issuer: "privy.io",
  });
  return parsedLinkedAccounts(payload);
}

function compactDisplayName(
  ...parts: Array<string | null | undefined>
): string | null {
  const value = parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return value || null;
}

function stringField(
  account: LinkedAccountRecord,
  field: string,
): string | null {
  const value = account[field];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function socialFromLinkedAccount(
  account: unknown,
): BearcoPrivySocialIdentity | null {
  if (typeof account !== "object" || !account) return null;

  const record = account as LinkedAccountRecord;
  const type = stringField(record, "type");
  if (type === "twitter_oauth") {
    const providerUserId =
      stringField(record, "subject") ||
      stringField(record, "provider_user_id") ||
      stringField(record, "id");
    if (!providerUserId) return null;

    return {
      displayName: stringField(record, "name"),
      provider: "x",
      providerUserId,
      username: stringField(record, "username"),
    };
  }

  if (type === "telegram") {
    const providerUserId =
      stringField(record, "telegram_user_id") ||
      stringField(record, "subject") ||
      stringField(record, "id");
    if (!providerUserId) return null;

    return {
      displayName: compactDisplayName(
        stringField(record, "first_name"),
        stringField(record, "last_name"),
        stringField(record, "username"),
      ),
      provider: "telegram",
      providerUserId,
      username: stringField(record, "username"),
    };
  }

  if (type === "discord_oauth") {
    const providerUserId =
      stringField(record, "subject") ||
      stringField(record, "provider_user_id") ||
      stringField(record, "id");
    if (!providerUserId) return null;

    return {
      displayName: stringField(record, "username"),
      provider: "discord",
      providerUserId,
      username: stringField(record, "username"),
    };
  }

  return null;
}

function socialIdentitiesFromLinkedAccounts(
  linkedAccounts: unknown[],
): BearcoPrivySocialIdentity[] {
  const byProvider = new Map<BearcoSocialProvider, BearcoPrivySocialIdentity>();

  for (const account of linkedAccounts) {
    const identity = socialFromLinkedAccount(account);
    if (identity) byProvider.set(identity.provider, identity);
  }

  return Array.from(byProvider.values());
}

export async function POST(req: NextRequest) {
  const walletAddress = await readHolderSessionWallet();
  if (!walletAddress) {
    return NextResponse.json(
      { error: "Sign a holder profile before syncing socials." },
      { status: 401 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const identityToken =
    typeof body.identityToken === "string" ? body.identityToken.trim() : "";
  if (!identityToken) {
    return NextResponse.json(
      { error: "Missing Privy identity token." },
      { status: 400 },
    );
  }

  let linkedAccounts: unknown[] | null = null;
  try {
    linkedAccounts = await linkedAccountsFromPrivyIdentityToken(identityToken);
  } catch {
    return NextResponse.json(
      { error: "Privy identity token could not be verified." },
      { status: 401 },
    );
  }

  if (!linkedAccounts) {
    return NextResponse.json(
      {
        error:
          "Privy verification is not configured. Add NEXT_PUBLIC_PRIVY_APP_ID and PRIVY_APP_ID.",
      },
      { status: 503 },
    );
  }

  const identities = socialIdentitiesFromLinkedAccounts(linkedAccounts);
  if (identities.length === 0) {
    return NextResponse.json(
      { error: "No linked X, Telegram, or Discord accounts found in Privy." },
      { status: 400 },
    );
  }

  const persisted: BearcoSocialProvider[] = [];
  for (const identity of identities) {
    const result = await upsertHolderSocialIdentity({
      displayName: identity.displayName,
      provider: identity.provider,
      providerUserId: identity.providerUserId,
      username: identity.username,
      walletAddress,
    });
    if (!result.persisted) {
      return NextResponse.json(
        {
          error:
            "Social identity storage is not ready. Apply the Supabase migration and retry.",
        },
        { status: 503 },
      );
    }
    persisted.push(identity.provider);
  }

  return NextResponse.json({
    persisted,
    success: true,
    updatedAt: new Date().toISOString(),
  });
}
