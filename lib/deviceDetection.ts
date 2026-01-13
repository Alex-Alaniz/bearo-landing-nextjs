// Device platform detection for waitlist signups
// Detects iOS, Android, or Desktop based on User-Agent

export type Platform = 'ios' | 'android' | 'desktop' | 'unknown';

/**
 * Detect the platform from a User-Agent string
 * @param userAgent - The User-Agent string from the browser
 * @returns The detected platform
 */
export function detectPlatformFromUserAgent(userAgent: string): Platform {
  if (!userAgent) {
    return 'unknown';
  }

  const ua = userAgent.toLowerCase();

  // Check for iOS devices (iPhone, iPad, iPod)
  // Also check for Mac with touch (iPad with desktop mode)
  if (
    /iphone|ipad|ipod/.test(ua) ||
    (/macintosh/.test(ua) && 'ontouchend' in globalThis)
  ) {
    return 'ios';
  }

  // Check for Android devices
  if (/android/.test(ua)) {
    return 'android';
  }

  // Check for other mobile devices (Windows Phone, BlackBerry, etc.)
  // These are rare but we'll categorize them as 'unknown' for now
  if (/windows phone|blackberry|bb10|webos/.test(ua)) {
    return 'unknown';
  }

  // Everything else is desktop (Windows, Mac, Linux)
  return 'desktop';
}

/**
 * Detect the current platform in the browser
 * Uses navigator.userAgent when available
 * @returns The detected platform
 */
export function detectPlatform(): Platform {
  // Only run in browser environment
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'unknown';
  }

  // Modern browsers may have userAgentData
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nav = navigator as any;
  if (nav.userAgentData?.platform) {
    const platform = nav.userAgentData.platform.toLowerCase();
    if (platform === 'ios' || platform.includes('iphone') || platform.includes('ipad')) {
      return 'ios';
    }
    if (platform === 'android') {
      return 'android';
    }
  }

  // Fall back to User-Agent string
  return detectPlatformFromUserAgent(navigator.userAgent);
}

/**
 * Check if the current device is a mobile device (iOS or Android)
 * @returns true if the device is mobile
 */
export function isMobile(): boolean {
  const platform = detectPlatform();
  return platform === 'ios' || platform === 'android';
}

/**
 * Check if the current device is iOS
 * @returns true if the device is iOS
 */
export function isIOS(): boolean {
  return detectPlatform() === 'ios';
}

/**
 * Check if the current device is Android
 * @returns true if the device is Android
 */
export function isAndroid(): boolean {
  return detectPlatform() === 'android';
}
