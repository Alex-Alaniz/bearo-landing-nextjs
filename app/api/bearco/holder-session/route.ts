import { NextResponse } from "next/server";
import { readHolderSessionWallet } from "@/lib/bearco-session";

export const dynamic = "force-dynamic";

export async function GET() {
  const walletAddress = await readHolderSessionWallet();
  return NextResponse.json({
    authenticated: Boolean(walletAddress),
    walletAddress,
  });
}
