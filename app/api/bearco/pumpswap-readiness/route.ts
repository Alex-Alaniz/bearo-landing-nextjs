import { NextResponse } from "next/server";
import { getBearcoPumpSwapReadiness } from "@/lib/bearco-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const readiness = await getBearcoPumpSwapReadiness();
    return NextResponse.json(readiness);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load PumpSwap pool";
    const status = message.includes("rate limiting") ? 429 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
