import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Action = "count" | "tier-availability";

const TIER_MAX_SPOTS: Record<number, number> = {
  1: 10, // OG Founder
  2: 40, // Alpha Insider
  3: 50, // Beta Crew
  4: 400, // Early Adopter
  5: 500, // Pioneer Wave
  6: 4000, // Community
};

function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  // Prefer service role on the server if available (supports RLS-protected tables).
  const keyToUse = serviceKey || anonKey;
  if (!url || !keyToUse) return null;

  return createClient(url, keyToUse);
}

async function getVerifiedCount(): Promise<number> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from("waitlist")
    .select("*", { count: "exact", head: true })
    .eq("verified", true);

  if (error || count == null) return 0;
  return count;
}

async function getTierAvailability(): Promise<Record<number, { maxSpots: number; claimed: number; available: number }>> {
  const supabase = getSupabaseServerClient();
  const availability: Record<number, { maxSpots: number; claimed: number; available: number }> = {};

  // Default: optimistic availability (used when Supabase isn't configured)
  for (const [tierStr, maxSpots] of Object.entries(TIER_MAX_SPOTS)) {
    const tierNumber = Number(tierStr);
    availability[tierNumber] = { maxSpots, claimed: 0, available: maxSpots };
  }

  if (!supabase) return availability;

  // Populate claimed/available from DB
  await Promise.all(
    Object.entries(TIER_MAX_SPOTS).map(async ([tierStr, maxSpots]) => {
      const tierNumber = Number(tierStr);
      const { count, error } = await supabase
        .from("waitlist")
        .select("*", { count: "exact", head: true })
        .eq("tier_number", tierNumber)
        .eq("verified", true);

      if (error) return;
      const claimed = count || 0;
      availability[tierNumber] = {
        maxSpots,
        claimed,
        available: Math.max(0, maxSpots - claimed),
      };
    }),
  );

  return availability;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));
  const action = body?.action as Action | undefined;

  if (!action) {
    return NextResponse.json({ error: "Missing action" }, { status: 400 });
  }

  if (action === "count") {
    const count = await getVerifiedCount();
    return NextResponse.json({ count });
  }

  if (action === "tier-availability") {
    const availability = await getTierAvailability();
    return NextResponse.json({ availability });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}


