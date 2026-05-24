"use client";

import clsx from "clsx";
import { CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import { formatInr } from "@/lib/parse-artifacts";

type Status = "ADEQUATE" | "TIGHT" | "DEFICIENT";

/**
 * Emergency-cash gauge — shows current liquid vs the required buffer
 * (3× monthly outflows) as a horizontal bar. The whole point: at-a-glance
 * "do I have enough cash for emergencies?".
 */
export function LiquidityGauge({
  required,
  current,
  status,
}: {
  required: number | null;
  current: number | null;
  status: Status | null;
}) {
  if (required === null || current === null) return null;

  // Cap the visual at 200% of required so a 13× buffer doesn't dwarf the bar.
  const pct = Math.min(200, (current / required) * 100);
  const requiredPct = Math.min(100, (required / Math.max(current, required)) * 100);

  const ui = (() => {
    switch (status) {
      case "ADEQUATE":
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
          label: "ADEQUATE",
          color: "text-emerald-300",
          bar: "bg-emerald-500",
        };
      case "TIGHT":
        return {
          icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
          label: "TIGHT",
          color: "text-amber-300",
          bar: "bg-amber-500",
        };
      case "DEFICIENT":
        return {
          icon: <AlertCircle className="w-4 h-4 text-red-400" />,
          label: "DEFICIENT",
          color: "text-red-300",
          bar: "bg-red-500",
        };
      default:
        // Default to status inferred from the ratio if SOUL didn't emit one.
        if (current >= required)
          return {
            icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
            label: "ADEQUATE",
            color: "text-emerald-300",
            bar: "bg-emerald-500",
          };
        return {
          icon: <AlertCircle className="w-4 h-4 text-red-400" />,
          label: "BELOW REQUIRED",
          color: "text-red-300",
          bar: "bg-red-500",
        };
    }
  })();

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
        Emergency cash reserve
      </h3>
      <div className="flex items-center gap-2 mb-3">
        {ui.icon}
        <span className={clsx("text-sm font-medium", ui.color)}>{ui.label}</span>
      </div>

      <div className="relative h-7 rounded-md bg-zinc-950 border border-zinc-800 overflow-hidden">
        {/* Required-buffer threshold line */}
        <div
          className="absolute inset-y-0 border-r-2 border-dashed border-zinc-500"
          style={{ width: `${requiredPct}%` }}
          aria-hidden
        />
        {/* Current liquid bar */}
        <div
          className={clsx("absolute inset-y-0 left-0 transition-all", ui.bar)}
          style={{ width: `${(pct / 200) * 100}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs mt-2">
        <span className="text-zinc-500">
          Required (3× monthly outflows):{" "}
          <span className="text-zinc-200 font-medium">
            {formatInr(required, { short: true })}
          </span>
        </span>
        <span className="text-zinc-500">
          You have:{" "}
          <span className="text-zinc-100 font-medium">
            {formatInr(current, { short: true })}
          </span>
          {current >= required && (
            <span className="text-emerald-400 ml-1">
              ({(current / required).toFixed(1)}×)
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
