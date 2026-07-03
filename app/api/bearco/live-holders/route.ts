import { NextResponse } from "next/server";
import { listBearcoHolderRadar } from "@/lib/bearco-holder-radar";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const holders = await listBearcoHolderRadar({
    cursor: searchParams.get("cursor"),
    limit: searchParams.get("limit"),
  });

  return NextResponse.json(holders);
}
