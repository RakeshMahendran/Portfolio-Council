"use client";

import clsx from "clsx";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

type Verdict = "APPROVE" | "AMEND" | "VETO";

/**
 * Headline verdict for the Risk Officer's review. Big, color-coded, can't
 * be missed. The pre-commit hook checks for the literal "Verdict: APPROVE"
 * line in markdown — this badge is the human-facing render of that.
 */
export function VerdictBadge({
  verdict,
  confidence,
}: {
  verdict: Verdict | null;
  confidence: number | null;
}) {
  if (!verdict) return null;

  const ui = (() => {
    switch (verdict) {
      case "APPROVE":
        return {
          icon: <CheckCircle2 className="w-8 h-8" />,
          label: "APPROVED",
          subtitle: "Risk Officer cleared this proposal",
          bg: "bg-emerald-950/40",
          border: "border-emerald-700/50",
          color: "text-emerald-300",
          accent: "bg-emerald-500",
        };
      case "AMEND":
        return {
          icon: <AlertTriangle className="w-8 h-8" />,
          label: "AMEND REQUIRED",
          subtitle: "Risk Officer asked Strategist to revise",
          bg: "bg-amber-950/40",
          border: "border-amber-700/50",
          color: "text-amber-300",
          accent: "bg-amber-500",
        };
      case "VETO":
        return {
          icon: <XCircle className="w-8 h-8" />,
          label: "VETOED",
          subtitle: "Risk Officer blocked this proposal",
          bg: "bg-red-950/40",
          border: "border-red-700/50",
          color: "text-red-300",
          accent: "bg-red-500",
        };
    }
  })();

  return (
    <div
      className={clsx(
        "rounded-xl border-2 p-5 flex items-center gap-4",
        ui.bg,
        ui.border,
      )}
    >
      <div className={clsx("shrink-0", ui.color)}>{ui.icon}</div>
      <div className="flex-1">
        <div className={clsx("text-xl font-bold tracking-tight", ui.color)}>
          {ui.label}
        </div>
        <div className="text-xs text-zinc-400 mt-0.5">{ui.subtitle}</div>
      </div>
      {confidence !== null && (
        <div className="text-right shrink-0">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
            Confidence
          </div>
          <div className={clsx("text-2xl font-semibold tabular-nums", ui.color)}>
            {confidence}%
          </div>
        </div>
      )}
    </div>
  );
}
