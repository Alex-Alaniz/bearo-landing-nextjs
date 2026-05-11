import { NextRequest, NextResponse } from 'next/server';
import { addBetaTester, isConfigured } from '../../../lib/appStoreConnect';
import { createClient } from '@supabase/supabase-js';
import type { Platform } from '../../../lib/deviceDetection';

// Use service role key - only available on server
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!url || !serviceKey) {
    return null;
  }

  return createClient(url, serviceKey);
}

const VALID_PLATFORMS = new Set<Platform>(['ios', 'android', 'desktop', 'unknown']);

function normalizePlatform(platform: unknown): Platform {
  return typeof platform === 'string' && VALID_PLATFORMS.has(platform as Platform)
    ? platform as Platform
    : 'unknown';
}

function mergeInviteMetadata(
  previousMetadata: Record<string, unknown> | null,
  result: Awaited<ReturnType<typeof addBetaTester>>
) {
  const metadata: Record<string, unknown> = {
    ...(previousMetadata || {}),
    testflight_invited: result.success,
    testflight_invited_at: new Date().toISOString(),
    testflight_already_invited: result.alreadyInvited || false,
  };

  if (!result.success && result.error) {
    metadata.testflight_error = result.error;
  } else {
    delete metadata.testflight_error;
    delete metadata.testflight_skipped_reason;
  }

  return metadata;
}

/**
 * POST /api/testflight-invite
 *
 * Sends a TestFlight invite to an iOS user.
 * Called automatically after signup for iOS users, or manually for existing users.
 *
 * Body: { email: string }
 *
 * Security: Only invites users who:
 * 1. Are in the waitlist
 * 2. Have platform = 'ios'
 * 3. Have verified = true
 */
export async function POST(req: NextRequest) {
  try {
    // Check if TestFlight integration is configured
    if (!isConfigured()) {
      console.warn('⚠️ TestFlight not configured - skipping invite');
      return NextResponse.json({
        success: false,
        error: 'TestFlight integration not configured',
        skipped: true,
      });
    }

    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verify user is in waitlist and is iOS
    const supabase = getSupabase();
    if (supabase) {
      const { data: user } = await supabase
        .from('waitlist')
        .select('email, platform, verified, metadata')
        .eq('email', normalizedEmail)
        .maybeSingle<{
          email: string;
          platform: Platform | null;
          verified: boolean;
          metadata: Record<string, unknown> | null;
        }>();

      if (!user) {
        return NextResponse.json(
          { error: 'User not found in waitlist' },
          { status: 404 }
        );
      }

      if (!user.verified) {
        return NextResponse.json(
          { error: 'User not verified' },
          { status: 403 }
        );
      }

      if (normalizePlatform(user.platform) !== 'ios') {
        return NextResponse.json({
          success: false,
          skipped: true,
          reason: `User platform is ${user.platform}, not iOS`,
        });
      }

      if (user.metadata?.testflight_invited === true) {
        return NextResponse.json({
          success: true,
          alreadyInvited: true,
          message: 'User was already invited to TestFlight',
        });
      }

      // Send TestFlight invite
      const result = await addBetaTester(normalizedEmail);

      await supabase
        .from('waitlist')
        .update({ metadata: mergeInviteMetadata(user.metadata, result) })
        .eq('email', normalizedEmail);

      if (result.success) {
        return NextResponse.json({
          success: true,
          testerId: result.testerId,
          alreadyInvited: result.alreadyInvited,
          message: result.alreadyInvited
            ? 'User was already invited to TestFlight'
            : 'TestFlight invite sent successfully',
        });
      }

      return NextResponse.json({
        success: false,
        error: result.error,
      }, { status: 500 });
    }

    // Without database config, preserve the old manual behavior.
    const result = await addBetaTester(normalizedEmail);

    if (result.success) {
      return NextResponse.json({
        success: true,
        testerId: result.testerId,
        alreadyInvited: result.alreadyInvited,
        message: result.alreadyInvited
          ? 'User was already invited to TestFlight'
          : 'TestFlight invite sent successfully',
      });
    }

    return NextResponse.json({
      success: false,
      error: result.error,
    }, { status: 500 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('TestFlight invite error:', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
