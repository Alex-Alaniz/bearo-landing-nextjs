import type { Metadata } from "next";

export const BEARO_SITE_URL = "https://bearo.cash";
export const BEARO_SOCIAL_HANDLE = "@BearifiedCo";

type SocialSurface =
  | "home"
  | "tokenomics"
  | "holders"
  | "dashboard"
  | "liquidity"
  | "tier"
  | "refer"
  | "pay";

interface BearoSocialMetadataOptions {
  title: string;
  description: string;
  path: string;
  surface: SocialSurface;
  imageAlt: string;
  imageParams?: Record<string, string | undefined>;
}

export function buildBearoSocialMetadata({
  title,
  description,
  path,
  surface,
  imageAlt,
  imageParams = {},
}: BearoSocialMetadataOptions): Metadata {
  const url = buildBearoUrl(path);
  const imageUrl = buildSocialCardUrl(surface, imageParams);

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "website",
      url,
      siteName: "Bearo",
      title,
      description,
      images: [
        {
          url: imageUrl,
          secureUrl: imageUrl,
          width: 1200,
          height: 630,
          alt: imageAlt,
          type: "image/png",
        },
      ],
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      site: BEARO_SOCIAL_HANDLE,
      creator: BEARO_SOCIAL_HANDLE,
      title,
      description,
      images: [
        {
          url: imageUrl,
          alt: imageAlt,
        },
      ],
    },
  };
}

function buildBearoUrl(path: string) {
  if (path === "/") return BEARO_SITE_URL;
  return `${BEARO_SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function buildSocialCardUrl(
  surface: SocialSurface,
  params: Record<string, string | undefined>,
) {
  const url = new URL("/api/social-card", BEARO_SITE_URL);
  url.searchParams.set("surface", surface);

  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }

  return url.toString();
}
