import type { Metadata, Viewport } from "next";
import { Bebas_Neue, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import {
  BEARO_SITE_URL,
  buildBearoSocialMetadata,
} from "@/lib/social-metadata";
import { BearcoPrivyProvider } from "@/components/BearcoPrivyProvider";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
});

const bebasNeue = Bebas_Neue({
  weight: "400",
  variable: "--font-bebas",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  ...buildBearoSocialMetadata({
    title: "Bearo | Bearified Instant Payments",
    description:
      "Bearified Instant Payments. Send money instantly to anyone, anywhere. The future of payments is here.",
    path: "/",
    surface: "home",
    imageAlt: "Bearo social sharing card for Bearified instant payments.",
  }),
  keywords: ["Bearo", "BIP", "Bearified Instant Payments", "money transfer", "crypto payments", "digital wallet", "fintech"],
  authors: [{ name: "Bearo Inc." }],
  robots: "index, follow",
  metadataBase: new URL(BEARO_SITE_URL),
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Bearo",
  },
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
      { url: "/images/BearoApp.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [
      { url: "/apple-icon.png", type: "image/png", sizes: "180x180" },
    ],
  },
  manifest: "/manifest.json",
  other: {
    "msapplication-TileColor": "#0a0a0b",
    "msapplication-TileImage": "/images/BearoApp.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} ${bebasNeue.variable} antialiased bg-[#0a0a0b]`}
      >
        <BearcoPrivyProvider>{children}</BearcoPrivyProvider>
      </body>
    </html>
  );
}
