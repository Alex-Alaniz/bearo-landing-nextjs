import { NextRequest, NextResponse } from "next/server";
import { refreshBearcoLpSnapshot } from "@/lib/bearco-pumpswap-server";
import { readHolderSessionWallet } from "@/lib/bearco-session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const sessionWallet = await readHolderSessionWallet();
  if (!sessionWallet) {
    return NextResponse.json(
      { error: "Sign a holder profile before saving LP balances." },
      { status: 401 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const requestedWallet =
    typeof body.walletAddress === "string" ? body.walletAddress.trim() : null;
  if (requestedWallet && requestedWallet !== sessionWallet) {
    return NextResponse.json(
      { error: "LP balance snapshots can only be saved for the signed wallet." },
      { status: 403 },
    );
  }

  try {
    const snapshot = await refreshBearcoLpSnapshot({
      walletAddress: sessionWallet,
      transactionSignature: body.transactionSignature,
    });

    return NextResponse.json(snapshot);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to refresh LP balance";
    const status = message.includes("rate") ? 429 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
