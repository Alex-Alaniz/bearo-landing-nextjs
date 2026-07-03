import { ImageResponse } from "next/og";
import { SocialCard } from "./social-card";

export const runtime = "edge";

const size = {
  width: 1200,
  height: 630,
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const surface = searchParams.get("surface") || "home";

  return new ImageResponse(
    SocialCard(getCardCopy(surface, searchParams)),
    size,
  );
}

function getCardCopy(
  surface: string,
  searchParams: URLSearchParams,
): Parameters<typeof SocialCard>[0] {
  switch (surface) {
    case "holders":
      return {
        eyebrow: "$BEARCO HOLDER ACCESS",
        title: "$BEARCO Holders",
        body: "Wallet claims, authenticated socials, live holdings, and supply-gated Bearo rooms.",
        badges: ["Wallet verified", "X / Telegram / Discord", "1% to 10% rooms"],
        footer: "bearo.cash/holders",
      };
    case "holder-radar":
      return {
        eyebrow: "$BEARCO HOLDER RADAR",
        title: "See the Holders",
        body: "Ranked wallets, on-chain flow, holding age, and a non-binding airdrop watch signal.",
        badges: ["Public wallets", "Helius indexed", "50%+ watch"],
        footer: "bearo.cash/holders/live",
      };
    case "tokenomics":
      return {
        eyebrow: "$BEARCO TOKENOMICS",
        title: "51%+ Supply Path",
        body: "Aligned supply, Streamflow locks, and HoneyTrail profit routing for the $BEARCO treasury plan.",
        badges: ["15%+ now", "51%+ target", "HoneyTrail Q4"],
        footer: "bearo.cash/tokenomics",
      };
    case "dashboard":
      return {
        eyebrow: "HOLDER UTILITY",
        title: "Holder Dashboard",
        body: "A simple place for holder identity, room access, and product feedback.",
        badges: ["Social auth", "Feedback board", "Room status"],
        footer: "bearo.cash/holders/dashboard",
      };
    case "liquidity":
      return {
        eyebrow: "PUMPSWAP LIQUIDITY",
        title: "$BEARCO Liquidity",
        body: "Preview paired $BEARCO and SOL deposits before signing an LP transaction.",
        badges: ["SOL pair", "Slippage preview", "LP balance"],
        footer: "bearo.cash/holders/liquidity",
      };
    case "tier": {
      const tier = sanitizeCardParam(searchParams.get("tier")) || "1";
      return {
        eyebrow: `${tier}%+ HOLDER ROOM`,
        title: `${tier}% Holder Room`,
        body: "Supply-gated Bearo utility for verified $BEARCO wallets and authenticated community identities.",
        badges: ["Wallet gate", "Private room", "Community utility"],
        footer: `bearo.cash/holders/${tier}`,
      };
    }
    case "refer": {
      const code = sanitizeCardParam(searchParams.get("code"));
      return {
        eyebrow: "BEARO INVITE",
        title: "Join Bearo",
        body: code
          ? `You were invited with code ${code}. Start with Bearified instant payments.`
          : "Start with Bearified instant payments and crypto-native rewards.",
        badges: ["Instant payments", "Crypto rewards", "Mobile app"],
        footer: "bearo.cash",
      };
    }
    case "pay": {
      const to = sanitizeCardParam(searchParams.get("to"));
      const amount = sanitizeCardParam(searchParams.get("amount"));
      const token = sanitizeCardParam(searchParams.get("token")) || "USDC";
      return {
        eyebrow: "BEARO PAYMENT REQUEST",
        title: to ? `Pay @${to}` : "Pay with Bearo",
        body: amount
          ? `@${to || "someone"} is requesting $${amount} ${token} on Bearo — instant, gasless crypto payments.`
          : "You have a payment request on Bearo — instant, gasless crypto payments.",
        badges: ["Instant payments", "Zero gas fees", "Mobile app"],
        footer: "bearo.cash/pay",
      };
    }
    default:
      return {
        eyebrow: "BEARIFIED INSTANT PAYMENTS",
        title: "Bearo",
        body: "Send money instantly and build toward wallet-native community rewards.",
        badges: ["Instant payments", "Digital wallet", "$BEARCO"],
        footer: "bearo.cash",
      };
  }
}

function sanitizeCardParam(value: string | null) {
  return value?.replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 24);
}
