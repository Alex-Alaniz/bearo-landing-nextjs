import { ExternalLink, LockKeyhole, ShieldCheck, TimerReset } from "lucide-react";
import {
  formatHolderPercent,
  formatTokenAmount,
} from "@/lib/bearco";
import { getBearcoLockedSupply } from "@/lib/bearco-streamflow";

type LockedSupplySnapshot = Awaited<ReturnType<typeof getBearcoLockedSupply>>;

function compactTokenAmount(value: string): string {
  return formatTokenAmount(value);
}

function dateLabel(value: string | null): string {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(value));
}

function typeLabel(type: string): string {
  return type
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function BearcoLockedSupplyPanel() {
  let snapshot: LockedSupplySnapshot | null = null;

  try {
    snapshot = await getBearcoLockedSupply();
  } catch {
    return (
      <section className="border border-white/10 bg-white/[0.045] p-5 sm:p-7">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-300">
          Live Streamflow locks
        </p>
        <h2 className="mt-4 text-4xl font-black sm:text-5xl">
          Locked supply is temporarily unavailable.
        </h2>
        <p className="mt-5 max-w-2xl text-sm leading-6 text-white/62">
          Streamflow did not return the public token dashboard snapshot. The
          source link is still available for manual verification.
        </p>
      </section>
    );
  }

  const unlockWindow =
    snapshot.unlockStartsAt && snapshot.unlockEndsAt
      ? `${dateLabel(snapshot.unlockStartsAt)} - ${dateLabel(snapshot.unlockEndsAt)}`
      : dateLabel(snapshot.unlockStartsAt);

  return (
    <section className="overflow-hidden border border-white/10 bg-white/[0.045]">
      <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="border-b border-white/10 p-5 sm:p-7 lg:border-b-0 lg:border-r">
          <div className="mb-5 inline-flex border border-orange-300/25 bg-orange-300/10 p-3 text-orange-200">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-300">
            Live Streamflow locks
          </p>
          <h2 className="mt-4 text-4xl font-black sm:text-5xl">
            Locked supply is visible.
          </h2>
          <p className="mt-5 max-w-xl text-sm leading-6 text-white/62">
            This reads the public Streamflow token dashboard for $BEARCO and
            turns the current lock state into plain holder-facing numbers.
          </p>
          <a
            href={snapshot.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center gap-2 border border-white/10 bg-black/30 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:border-orange-300/50 hover:bg-orange-300/10"
          >
            Verify on Streamflow
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        <div className="p-5 sm:p-7">
          <div className="grid gap-3 sm:grid-cols-2">
            <LockedSupplyMetric
              label="Locked now"
              value={`${compactTokenAmount(snapshot.lockedUiAmount)} $BEARCO`}
              detail={`${formatHolderPercent(snapshot.lockedPercent)} of supply`}
            />
            <LockedSupplyMetric
              label="Circulating"
              value={`${compactTokenAmount(snapshot.circulatingUiAmount)} $BEARCO`}
              detail={`${compactTokenAmount(snapshot.totalUiAmount)} total supply`}
            />
            <LockedSupplyMetric
              label="Contracts"
              value={`${snapshot.contractCount}`}
              detail="scheduled Streamflow locks"
            />
            <LockedSupplyMetric
              label="Unlock window"
              value={unlockWindow}
              detail="UTC schedule from Streamflow"
            />
          </div>

          <div className="mt-4 border border-white/10 bg-black/25 p-4">
            <div className="mb-3 flex items-center gap-2 text-white/72">
              <ShieldCheck className="h-4 w-4 text-orange-200" />
              <p className="text-xs font-semibold uppercase tracking-[0.18em]">
                Breakdown
              </p>
            </div>
            <div className="grid gap-2">
              {snapshot.typeBreakdown.map((item) => (
                <div
                  key={item.type}
                  className="flex flex-col gap-1 border border-white/10 bg-white/[0.035] p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="text-sm font-black text-white">
                    {typeLabel(item.type)}
                  </span>
                  <span className="text-xs text-white/58">
                    {compactTokenAmount(item.lockedUiAmount)} $BEARCO across{" "}
                    {item.contractCount} contracts
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-4 flex items-center gap-2 text-xs leading-5 text-white/46">
              <TimerReset className="h-4 w-4 text-orange-200" />
              Updated from Streamflow on {dateLabel(snapshot.updatedAt)}.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function LockedSupplyMetric({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <div className="min-h-32 border border-white/10 bg-black/30 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/42">
        {label}
      </p>
      <p className="mt-4 break-words text-2xl font-black leading-tight text-white">
        {value}
      </p>
      <p className="mt-3 text-xs leading-5 text-white/52">{detail}</p>
    </div>
  );
}
