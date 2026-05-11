import { NextRequest, NextResponse } from "next/server";
import {
  completeThirdwebEmailOtp,
  normalizeEmail,
  normalizePlatform,
  normalizeReferralCode,
  processVerifiedReferralClaim,
} from "../../../../lib/referralClaim";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const email = normalizeEmail(body.email);
    const code = normalizeReferralCode(body.code);
    const platform = normalizePlatform(body.platform);
    const otp = typeof body.otp === "string" ? body.otp.trim() : "";

    if (!email) {
      return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
    }
    if (!code) {
      return NextResponse.json({ error: "Invalid referral link." }, { status: 400 });
    }
    if (!/^\d{6,8}$/.test(otp)) {
      return NextResponse.json({ error: "Enter the verification code from your email." }, { status: 400 });
    }

    const thirdweb = await completeThirdwebEmailOtp(email, otp, body.challenge);
    const claim = await processVerifiedReferralClaim({
      email,
      referrerCode: code,
      platform,
      thirdwebUserId: thirdweb.userId,
    });

    return NextResponse.json({
      success: true,
      ...claim,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to verify invite.";
    console.error("[referral-claim/verify]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
