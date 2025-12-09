import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bearo | Bearified Instant Payments",
  description: "Bearified Instant Payments. Send money instantly to anyone, anywhere. The future of payments is here.",
  keywords: ["Bearo", "BIP", "Bearified Instant Payments", "money transfer", "crypto payments", "digital wallet", "fintech"],
  authors: [{ name: "Bearo Inc." }],
  robots: "index, follow",
  metadataBase: new URL("https://bearo.cash"),
  alternates: {
    canonical: "https://bearo.cash",
  },
  openGraph: {
    type: "website",
    url: "https://bearo.cash",
    siteName: "Bearo",
    title: "Bearo | Bearified Instant Payments",
    description: "Bearified Instant Payments. Send money instantly to anyone, anywhere. The future of payments is here.",
    images: [
      {
        url: "https://bearo.cash/images/BearoApp.png",
        secureUrl: "https://bearo.cash/images/BearoApp.png",
        width: 1024,
        height: 1024,
        alt: "Bearo - Bearified Instant Payments",
        type: "image/png",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    site: "@BearifiedCo",
    creator: "@BearifiedCo",
    title: "Bearo | Bearified Instant Payments",
    description: "Bearified Instant Payments. Send money instantly to anyone, anywhere. The future of payments is here.",
    images: [
      {
        url: "https://bearo.cash/images/BearoApp.png",
        alt: "Bearo - Bearified Instant Payments",
      },
    ],
  },
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
  themeColor: "#0a0a0b",
  other: {
    "msapplication-TileColor": "#0a0a0b",
    "msapplication-TileImage": "/images/BearoApp.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0a0a0b]`}
      >
        {children}
      </body>
    </html>
  );
}
