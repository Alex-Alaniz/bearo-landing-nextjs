import { NextRequest, NextResponse } from 'next/server';
import { addBetaTester, isConfigured } from '../../../../lib/appStoreConnect';
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

interface WaitlistUser {
  email: string;
  platform: string | null;
  verified: boolean;
  metadata: Record<string, unknown> | null;
}

/**
 * POST /api/admin/retry-testflight
 *
 * Retries TestFlight invites for iOS users who didn't receive one.
 * Only processes users with platform='ios' who haven't been successfully invited.
 *
 * Body: { adminKey: string, dryRun?: boolean, email?: string }
 *
 * - If email is provided, only retries for that specific user
 * - Otherwise, retries for all eligible iOS users
 *
 * Security: Requires ADMIN_API_KEY environment variable
 */
export async function POST(req: NextRequest) {
  try {
    // Check if TestFlight integration is configured
    if (!isConfigured()) {
      return NextResponse.json({
        success: false,
        error: 'TestFlight integration not configured',
      }, { status: 500 });
    }

    const body = await req.json();
    const { adminKey, dryRun = false, email } = body;

    // Security: Verify admin key
    const expectedKey = process.env.ADMIN_API_KEY?.trim();
    if (!expectedKey || adminKey !== expectedKey) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Build query for iOS users who need invites
    let query = supabase
      .from('waitlist')
      .select('email, platform, verified, metadata')
      .eq('verified', true)
      .eq('platform', 'ios');

    // If specific email provided, filter to just that user
    if (email) {
      query = query.eq('email', email.toLowerCase().trim());
    }

    const { data: users, error: fetchError } = await query;

    if (fetchError) {
      return NextResponse.json(
        { error: `Database error: ${fetchError.message}` },
        { status: 500 }
      );
    }

    // Filter to users who haven't been successfully invited
    const usersToInvite = (users || []).filter((u: WaitlistUser) => {
      const metadata = u.metadata;
      // Invite if: no metadata, or testflight_invited is not true
      return !metadata || metadata.testflight_invited !== true;
    });

    if (usersToInvite.length === 0) {
      return NextResponse.json({
        success: true,
        message: email ? `User ${email} has already been invited` : 'No iOS users need TestFlight invites',
        summary: { total: 0, newInvites: 0, alreadyInvited: 0, failed: 0 },
      });
    }

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        message: `Would invite ${usersToInvite.length} iOS user(s)`,
        users: usersToInvite.map((u: WaitlistUser) => ({
          email: u.email,
          currentMetadata: u.metadata,
        })),
      });
    }

    // Send invites
    const results: Array<{ email: string; success: boolean; error?: string; alreadyInvited?: boolean }> = [];

    for (const user of usersToInvite) {
      try {
        const result = await addBetaTester(user.email);

        // Update metadata with invite status
        const currentMetadata = user.metadata || {};
        await supabase
          .from('waitlist')
          .update({
            metadata: {
              ...currentMetadata,
              testflight_invited: result.success,
              testflight_invited_at: new Date().toISOString(),
              testflight_already_invited: result.alreadyInvited || false,
              testflight_retry: true, // Mark that this was a retry
              ...(result.error ? { testflight_error: result.error } : {}),
            }
          })
          .eq('email', user.email);

        results.push({
          email: user.email,
          success: result.success,
          alreadyInvited: result.alreadyInvited,
          error: result.error,
        });

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        results.push({
          email: user.email,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const alreadyInvitedCount = results.filter(r => r.alreadyInvited).length;
    const failedCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      summary: {
        total: results.length,
        newInvites: successCount - alreadyInvitedCount,
        alreadyInvited: alreadyInvitedCount,
        failed: failedCount,
      },
      results,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Retry TestFlight error:', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
