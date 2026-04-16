"use client";

import { useEffect } from "react";

interface ReferralClientProps {
  code: string;
}

/**
 * Client-side component for the referral page.
 * Handles:
 * 1. Storing the referral code in a cookie (persists through app download)
 * 2. Attempting to open the app via deep link (for users who already have it)
 */
export function ReferralClient({ code }: ReferralClientProps) {
  useEffect(() => {
    // Store referral code in a cookie (30-day expiry)
    // This persists through the app download flow so the code can be
    // retrieved if the user comes back to the web after installing
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);
    document.cookie = `bearo_referral_code=${encodeURIComponent(code)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;

    // Attempt to open the app via deep link for users who already have it installed.
    // This uses a hidden iframe to avoid navigating away from the page if the app
    // is not installed. On iOS, the bearo:// scheme will trigger the app if present.
    // If the app is not installed, nothing visible happens.
    const deepLinkUrl = `bearo://refer?code=${encodeURIComponent(code)}`;

    // Use a small delay to ensure the page has rendered before attempting deep link
    const timer = setTimeout(() => {
      try {
        // Try window.location for mobile Safari (iframe approach is unreliable on iOS 15+)
        // We set location but if the app doesn't open within 2s, the user stays on this page
        const now = Date.now();
        window.location.href = deepLinkUrl;

        // If we're still here after 1.5s, the app didn't open - that's fine,
        // the user sees the download page
        setTimeout(() => {
          // Only restore if we haven't navigated away
          if (Date.now() - now < 3000) {
            // App didn't open, user stays on page - no action needed
          }
        }, 1500);
      } catch {
        // Deep link failed silently - user stays on the referral page
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [code]);

  // This component renders nothing - it only runs side effects
  return null;
}
