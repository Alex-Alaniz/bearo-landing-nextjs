// Supabase client setup
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
// Use anon key only - service key should never be exposed on frontend
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('⚠️ Supabase credentials not found. Using localStorage fallback.');
}

export const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

// Database table types
export interface WaitlistEntry {
  id?: string;
  email: string;
  tier_name: string;
  tier_number: number;
  signup_position: number;
  thirdweb_user_id?: string;
  verified: boolean;
  claimed_at?: string;
  metadata?: Record<string, any>;
}

export interface TierAvailability {
  tier_number: number;
  max_spots: number;
  claimed_spots: number;
  available_spots: number;
}

