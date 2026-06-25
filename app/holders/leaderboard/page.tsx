import type { Metadata } from "next";
import { BearcoHolderLeaderboard } from "@/components/BearcoHolderLeaderboard";
import { buildBearoSocialMetadata } from "@/lib/social-metadata";

export const metadata: Metadata = buildBearoSocialMetadata({
  title: "$BEARCO Holder Leaderboard | Bearo",
  description:
    "Top claimed $BEARCO holder wallets with verified X, Telegram, and Discord profiles.",
  path: "/holders/leaderboard",
  surface: "holders",
  imageAlt:
    "$BEARCO holder leaderboard with claimed profiles and verified social accounts.",
});

export const dynamic = "force-dynamic";

export default function HolderLeaderboardPage() {
  return (
    <main className="bearified-shell min-h-screen px-6 py-8 sm:px-8 lg:px-10">
      <div className="bearified-stage mx-auto max-w-6xl">
        <BearcoHolderLeaderboard showClaimLink={false} />
      </div>
    </main>
  );
}
