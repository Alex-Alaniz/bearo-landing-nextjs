import { NextResponse } from "next/server";
import { listBearcoHolderLeaderboard } from "@/lib/bearco-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const leaderboard = await listBearcoHolderLeaderboard(50);
  return NextResponse.json(leaderboard);
}
