import { NextRequest, NextResponse } from 'next/server';
import { addBetaTester, isConfigured } from '../../../lib/appStoreConnect';
import { createClient } from '@supabase/supabase-js';

// Use service role key - only available on server
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!url || !serviceKey) {
    return null;
  }

  return createClient(url, serviceKey);
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
        .select('email, platform, verified')
        .eq('email', normalizedEmail)
        .maybeSingle();

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

      if (user.platform !== 'ios') {
        return NextResponse.json({
          success: false,
          skipped: true,
          reason: `User platform is ${user.platform}, not iOS`,
        });
      }
    }

    // Send TestFlight invite
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
