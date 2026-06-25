import { NextRequest, NextResponse } from "next/server";
import { getBearcoHolderProfile } from "@/lib/bearco-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet") || "";

  try {
    const profile = await getBearcoHolderProfile(wallet);
    return NextResponse.json(profile);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load holder profile";
    const status = message.includes("rate limiting") ? 429 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
