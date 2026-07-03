"use client";

import { useEffect } from "react";

interface PayClientProps {
  deepLink: string;
}

/**
 * Client-side component for the payment request page.
 * Attempts to open the app via the bearo://pay deep link for users who
 * already have Bearo installed (same approach as the referral page). If the
 * app is not installed, nothing visible happens and the user stays on the
 * download page.
 */
export function PayClient({ deepLink }: PayClientProps) {
  useEffect(() => {
    // Small delay so the page renders before the deep-link attempt
    const timer = setTimeout(() => {
      try {
        window.location.href = deepLink;
      } catch {
        // Deep link failed silently — user stays on the pay page
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [deepLink]);

  // Renders nothing — side effect only
  return null;
}
