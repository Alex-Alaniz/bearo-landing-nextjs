import { NextResponse } from "next/server";
import { getBearcoLockedSupply } from "@/lib/bearco-streamflow";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getBearcoLockedSupply();
    return NextResponse.json(snapshot);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load locked supply";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
