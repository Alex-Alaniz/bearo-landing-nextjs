import { NextRequest, NextResponse } from "next/server";
import { quoteBearcoPumpSwapDeposit } from "@/lib/bearco-pumpswap-server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  try {
    const quote = await quoteBearcoPumpSwapDeposit({
      walletAddress: body.walletAddress,
      inputSide: body.inputSide,
      amount: body.amount,
      slippagePercent: body.slippagePercent,
    });

    return NextResponse.json(quote);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to quote deposit";
    const status = message.includes("rate") ? 429 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
