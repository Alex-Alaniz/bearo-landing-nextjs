import { NextResponse } from "next/server";
import { getBearcoHolderRadarWallet } from "@/lib/bearco-holder-radar";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ wallet: string }> },
) {
  const { wallet } = await params;
  const holder = await getBearcoHolderRadarWallet(wallet);

  if (!holder.entry) {
    return NextResponse.json(holder, { status: holder.storageReady ? 404 : 200 });
  }

  return NextResponse.json(holder);
}
