"use client";

import { ShieldCheck } from "lucide-react";

/**
 * Surfaces the Risk Officer's Plan B excerpt — the "what to do if Plan A
 * doesn't work" fallback. Always rendered when present, even on APPROVE,
 * because Risk Officer policy says Plan B is always offered.
 */
export function PlanBCard({ planB }: { planB: string | null }) {
  if (!planB) return null;
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck className="w-4 h-4 text-zinc-400" />
        <h3 className="text-xs uppercase tracking-wider text-zinc-500">
          If Plan A doesn't work — Risk Officer's Plan B
        </h3>
      </div>
      <p className="text-sm text-zinc-300 leading-relaxed italic whitespace-pre-line">
        {planB}
      </p>
    </div>
  );
}
