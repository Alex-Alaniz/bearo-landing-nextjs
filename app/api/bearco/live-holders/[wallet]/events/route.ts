import { NextResponse } from "next/server";
import { getBearcoHolderRadarEvents } from "@/lib/bearco-holder-radar";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ wallet: string }> },
) {
  const { searchParams } = new URL(request.url);
  const { wallet } = await params;
  const events = await getBearcoHolderRadarEvents({
    limit: searchParams.get("limit"),
    walletAddress: wallet,
  });

  return NextResponse.json(events);
}
