import type { Metadata } from "next";
import { BearcoHolderRadar } from "@/components/BearcoHolderRadar";
import { listBearcoHolderRadar } from "@/lib/bearco-holder-radar";
import { buildBearoSocialMetadata } from "@/lib/social-metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildBearoSocialMetadata({
  title: "$BEARCO Holder Radar | Bearo",
  description:
    "Track public $BEARCO holders, flows, holding age, estimated P&L status, and a non-binding airdrop watch signal.",
  imageAlt:
    "$BEARCO Holder Radar with ranked wallets, trade flow, P&L status, and airdrop watch signals.",
  path: "/holders/live",
  surface: "holder-radar",
});

export default async function BearcoHolderRadarPage() {
  const data = await listBearcoHolderRadar({ limit: 50 });

  return (
    <main className="bearified-shell min-h-screen px-5 py-6 sm:px-8 lg:px-10">
      <BearcoHolderRadar initialData={data} />
    </main>
  );
}
