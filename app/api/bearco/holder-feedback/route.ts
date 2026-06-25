import { NextRequest, NextResponse } from "next/server";
import {
  createHolderFeedback,
  getBearcoHolderProfile,
  listHolderFeedback,
  normalizeFeedbackCategory,
  normalizeFeedbackMessage,
} from "@/lib/bearco-server";
import { readHolderSessionWallet } from "@/lib/bearco-session";

export const dynamic = "force-dynamic";

export async function GET() {
  const sessionWallet = await readHolderSessionWallet();
  if (!sessionWallet) {
    return NextResponse.json(
      { error: "Sign a holder profile before reading the holder board." },
      { status: 401 },
    );
  }

  const { feedback, storageReady } = await listHolderFeedback();
  return NextResponse.json({
    feedback,
    storageReady,
    updatedAt: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  const sessionWallet = await readHolderSessionWallet();
  if (!sessionWallet) {
    return NextResponse.json(
      { error: "Sign a holder profile before posting feedback." },
      { status: 401 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const category = normalizeFeedbackCategory(body.category);
  const message = normalizeFeedbackMessage(body.message);

  if (message.length < 8) {
    return NextResponse.json(
      { error: "Write at least a short sentence before posting." },
      { status: 400 },
    );
  }

  try {
    const holder = await getBearcoHolderProfile(sessionWallet);
    const result = await createHolderFeedback({
      walletAddress: sessionWallet,
      category,
      message,
      holder,
    });

    if (!result.persisted) {
      return NextResponse.json(
        { error: "Feedback storage is not ready. Apply the Supabase migration." },
        { status: 503 },
      );
    }

    return NextResponse.json({
      success: true,
      feedback: result.feedback,
    });
  } catch (error) {
    const messageText =
      error instanceof Error ? error.message : "Unable to post feedback";
    const status = messageText.includes("rate limiting") ? 429 : 500;
    return NextResponse.json({ error: messageText }, { status });
  }
}
