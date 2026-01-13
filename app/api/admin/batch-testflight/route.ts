import { NextRequest, NextResponse } from 'next/server';
import { addBetaTester, isConfigured } from '../../../../lib/appStoreConnect';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

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

async function processInvites(
  supabase: SupabaseClient,
  users: WaitlistUser[],
  dryRun: boolean
): Promise<Response> {
  if (dryRun) {
    return NextResponse.json({
      success: true,
      dryRun: true,
      message: `Would invite ${users.length} users`,
      users: users.map(u => ({ email: u.email, platform: u.platform })),
    });
  }

  // Send invites
  const results: Array<{ email: string; success: boolean; error?: string; alreadyInvited?: boolean }> = [];

  for (const user of users) {
    try {
      const result = await addBetaTester(user.email);

      // Mark as batch-invited in metadata
      const currentMetadata = user.metadata || {};
      await supabase
        .from('waitlist')
        .update({
          metadata: {
            ...currentMetadata,
            testflight_batch_invited: true,
            testflight_batch_invited_at: new Date().toISOString(),
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
}

/**
 * POST /api/admin/batch-testflight
 *
 * Sends TestFlight invites to all verified waitlist users.
 * Used for backfilling invites to users who signed up before platform detection.
 *
 * Body: { adminKey: string, dryRun?: boolean, limit?: number }
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
    const { adminKey, dryRun = false, limit = 50 } = body;

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

    // Fetch more users than needed to account for already-invited ones
    const fetchLimit = limit * 5;
    const { data: allUsers, error: fetchError } = await supabase
      .from('waitlist')
      .select('email, platform, verified, metadata')
      .eq('verified', true)
      .order('signup_position', { ascending: true })
      .limit(fetchLimit);

    if (fetchError) {
      return NextResponse.json(
        { error: `Database error: ${fetchError.message}` },
        { status: 500 }
      );
    }

    // Filter out users who have already been batch-invited
    const usersToInvite = (allUsers || []).filter(u => {
      const metadata = u.metadata as Record<string, unknown> | null;
      return !metadata?.testflight_batch_invited;
    }).slice(0, limit);

    if (usersToInvite.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users to invite',
        summary: { total: 0, newInvites: 0, alreadyInvited: 0, failed: 0 },
        results: [],
      });
    }

    return await processInvites(supabase, usersToInvite, dryRun);

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Batch TestFlight error:', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
