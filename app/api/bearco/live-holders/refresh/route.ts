import { NextResponse } from "next/server";
import { refreshBearcoHolderRadar } from "@/lib/bearco-holder-radar";

export const dynamic = "force-dynamic";

function refreshSecret() {
  return (
    process.env.CRON_SECRET?.trim() ||
    process.env.BEARCO_RADAR_CRON_SECRET?.trim() ||
    ""
  );
}

function bearerToken(request: Request): string {
  const authorization = request.headers.get("authorization") || "";
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  return bearer || request.headers.get("x-bearco-radar-secret")?.trim() || "";
}

function isRefreshAllowed(request: Request): boolean {
  const secret = refreshSecret();
  if (!secret && process.env.NODE_ENV !== "production") return true;
  return Boolean(secret && bearerToken(request) === secret);
}

async function refresh(request: Request) {
  if (!isRefreshAllowed(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await refreshBearcoHolderRadar();
    return NextResponse.json(result, { status: result.storageReady ? 200 : 503 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Holder Radar refresh failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function GET(request: Request) {
  return refresh(request);
}

export async function POST(request: Request) {
  return refresh(request);
}
