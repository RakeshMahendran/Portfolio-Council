"use client";

import { HelpCircle } from "lucide-react";

/**
 * Why isn't the Risk Officer 100% confident? — answers Q8 by surfacing
 * the rationale text that follows the "Confidence: N%" line.
 */
export function ConfidenceRationale({
  confidence,
  rationale,
}: {
  confidence: number | null;
  rationale: string | null;
}) {
  if (confidence === null || !rationale) return null;
  const gap = 100 - confidence;
  if (gap <= 0) return null;
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex items-center gap-2 mb-3">
        <HelpCircle className="w-4 h-4 text-zinc-400" />
        <h3 className="text-xs uppercase tracking-wider text-zinc-500">
          Why not 100% confident? — the remaining {gap.toFixed(0)}%
        </h3>
      </div>
      <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
        {rationale}
      </p>
    </div>
  );
}
