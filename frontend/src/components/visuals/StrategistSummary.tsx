"use client";

import { Layers, ShieldQuestion } from "lucide-react";
import { type StrategistParsed } from "@/lib/parse-artifacts";

/**
 * Compact stat card for the Strategist artifact — surfaces what's structurally
 * detectable (tranche count, Plan B availability) plus the proposal's own
 * summary paragraph. The full 13-section proposal stays in markdown below.
 */
export function StrategistSummary({ s }: { s: StrategistParsed }) {
  const hasNothing =
    !s.proposalSummary && s.trancheCount === 0 && !s.hasPlanB;
  if (hasNothing) return null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
      <h3 className="text-xs uppercase tracking-wider text-zinc-500">
        Proposal at a glance
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {s.trancheCount > 0 && (
          <StatChip
            icon={<Layers className="w-4 h-4 text-blue-400" />}
            value={s.trancheCount}
            label={s.trancheCount === 1 ? "phased tranche" : "phased tranches"}
          />
        )}
        {s.hasPlanB && (
          <StatChip
            icon={<ShieldQuestion className="w-4 h-4 text-emerald-400" />}
            value="Plan B"
            label="alternative available"
          />
        )}
      </div>

      {s.proposalSummary && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">
            Strategist's summary
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
            {s.proposalSummary}
          </p>
        </div>
      )}
    </div>
  );
}

function StatChip({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2">
      <div className="shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-base font-semibold text-zinc-100 tabular-nums leading-none">
          {value}
        </div>
        <div className="text-[11px] text-zinc-500 mt-0.5">{label}</div>
      </div>
    </div>
  );
}
