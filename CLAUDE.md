# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bearo is a crypto payments landing page built with Next.js 16 and React 19. It features an animated hero section (anime.js), a waitlist signup flow with thirdweb email authentication, and Supabase as the backend database.

## Commands

```bash
pnpm dev      # Start development server (localhost:3000)
pnpm build    # Production build
pnpm lint     # Run ESLint
```

## Architecture

### Page Structure
- `app/page.tsx` - Main landing page with animated hero (CashAppInvest component)
- `components/BearoContent.tsx` - Content shown after user scrolls past animated hero
- `hooks/useCashAppAnimations.ts` - anime.js timeline animations for hero section

### Authentication & Waitlist Flow
1. User enters email in `components/Hero.tsx`
2. thirdweb email authentication initiated via `lib/api.ts` (calls thirdweb API)
3. On verification, secure API route `app/api/signup/route.ts` writes to Supabase using service role key
4. Direct Supabase writes are blocked by RLS policies - all mutations go through API routes

### Key Files
- `lib/supabase.ts` - Frontend Supabase client (anon key only, read access)
- `lib/api.ts` - Frontend API client for thirdweb auth + waitlist operations
- `app/api/signup/route.ts` - Secure signup endpoint (service role key)
- `app/api/link-wallet/route.ts` - Wallet linking endpoint
- `supabase/setup.sql` - Database schema
- `supabase/security_hardening.sql` - RLS policies blocking direct writes

### Tier System
Six waitlist tiers with limited spots:
- Tier 1 (OG Founder): 10 spots, 50,000 tokens
- Tier 2 (Alpha Insider): 40 spots, 10,000 tokens
- Tier 3 (Beta Crew): 50 spots, 2,500 tokens
- Tier 4 (Early Adopter): 400 spots, 1,000 tokens
- Tier 5 (Pioneer Wave): 500 spots, 500 tokens
- Tier 6 (Community): 4,000 spots, 100 tokens

### Animation System
The hero uses anime.js v4 with `createTimeline` for orchestrated animations. The `useCashAppAnimations` hook manages the main timeline which loops through sections (NOW/BEARO, YOU/PAYMENTS, CAN/APP, INVEST/WALLET, CTA).

### Styling
- Tailwind CSS 4 with `@tailwindcss/postcss`
- Brand color: `#f97316` (orange)
- Dark background: `#0a0a0b`
- `app/CashAppInvest.css` - Scoped styles for animated hero
- `app/globals.css` - Global styles and CSS variables

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=
```

## Security Notes

- Never use service role key on frontend - only in API routes
- All database mutations must go through `/api/*` routes
- RLS policies block direct inserts to `waitlist` and `airdrop_allocations` tables
- Referral codes are validated server-side before crediting referrers
