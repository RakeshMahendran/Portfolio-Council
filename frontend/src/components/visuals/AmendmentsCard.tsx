"use client";

import clsx from "clsx";
import { GitPullRequestArrow } from "lucide-react";
import { type Amendment } from "@/lib/parse-artifacts";

const CATEGORY_COLOR: Record<NonNullable<Amendment["category"]>, string> = {
  MANDATORY: "bg-red-950/40 text-red-300 border-red-800/50",
  RECOMMENDED: "bg-amber-950/30 text-amber-300 border-amber-800/40",
  OPTIONAL: "bg-zinc-800 text-zinc-300 border-zinc-700",
};

/**
 * Amendments delta — answers Q4: "What did Risk ask Strategist to change?"
 * Each amendment as a row with category badge + title + summary.
 * Shown only on AMEND→APPROVE sessions; hidden on first-pass APPROVE.
 */
export function AmendmentsCard({ amendments }: { amendments: Amendment[] }) {
  if (amendments.length === 0) return null;
  const mandatoryCount = amendments.filter((a) => a.category === "MANDATORY").length;
  return (
    <div className="rounded-xl border border-amber-800/40 bg-gradient-to-br from-amber-950/20 to-zinc-900/40 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
          <GitPullRequestArrow className="w-3.5 h-3.5 text-amber-400" />
          What Risk Officer asked Strategist to change
        </h3>
        <span className="text-[11px] text-zinc-500">
          {amendments.length} amendment{amendments.length === 1 ? "" : "s"}
          {mandatoryCount > 0 && (
            <span className="text-red-300 ml-1">· {mandatoryCount} mandatory</span>
          )}
        </span>
      </div>
      <ol className="space-y-3">
        {amendments.map((a, i) => (
          <li key={i} className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-zinc-800 text-xs text-zinc-300 flex items-center justify-center font-medium tabular-nums">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-sm font-medium text-zinc-100">{a.title}</span>
                {a.category && (
                  <span
                    className={clsx(
                      "text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border font-medium",
                      CATEGORY_COLOR[a.category],
                    )}
                  >
                    {a.category}
                  </span>
                )}
              </div>
              {a.description && (
                <p className="text-xs text-zinc-400 leading-relaxed">{a.description}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
