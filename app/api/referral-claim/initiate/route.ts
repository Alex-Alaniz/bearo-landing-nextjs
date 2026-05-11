import { NextRequest, NextResponse } from "next/server";
import {
  enforceOtpRateLimit,
  getClientIp,
  getSupabaseServiceClient,
  initiateThirdwebEmailOtp,
  normalizeEmail,
  normalizeReferralCode,
  verifyCaptchaToken,
} from "../../../../lib/referralClaim";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const email = normalizeEmail(body.email);
    const code = normalizeReferralCode(body.code);
    const ip = getClientIp(req);

    if (!email) {
      return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
    }
    if (!code) {
      return NextResponse.json({ error: "Invalid referral link." }, { status: 400 });
    }

    const captchaOk = await verifyCaptchaToken(body.captchaToken, ip);
    if (!captchaOk) {
      return NextResponse.json({ error: "Please complete the security check." }, { status: 403 });
    }

    const supabase = getSupabaseServiceClient();
    const limit = await enforceOtpRateLimit(supabase, { email, ip });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many verification attempts. Please try again later.", reason: limit.reason },
        { status: 429 }
      );
    }

    const result = await initiateThirdwebEmailOtp(email);

    return NextResponse.json({
      success: true,
      email,
      code,
      challenge: result.challenge ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send verification email.";
    console.error("[referral-claim/initiate]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
