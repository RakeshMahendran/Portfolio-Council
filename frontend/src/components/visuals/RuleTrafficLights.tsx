"use client";

import clsx from "clsx";
import { Check, X, AlertTriangle, HelpCircle } from "lucide-react";
import { type RuleCompliance } from "@/lib/parse-artifacts";

/**
 * Rule-by-rule compliance grid for the Risk verdict. One chip per Hard Rule,
 * color-coded by status (PASS / FAIL / AMEND / info). Lets the user see at
 * a glance which governance rules the proposal honoured and which it didn't.
 */
export function RuleTrafficLights({ rules }: { rules: RuleCompliance[] }) {
  if (rules.length === 0) return null;

  const passes = rules.filter((r) => r.status === "pass").length;
  const fails = rules.filter((r) => r.status === "fail" || r.status === "amend").length;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs uppercase tracking-wider text-zinc-500">
          Rule-by-rule compliance
        </h3>
        <div className="text-xs text-zinc-400 tabular-nums">
          <span className="text-emerald-400">{passes} passed</span>
          {fails > 0 && (
            <>
              <span className="text-zinc-600 mx-1.5">·</span>
              <span className="text-red-400">{fails} failed</span>
            </>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {rules.map((rule) => {
          const ui = STATUS_UI[rule.status];
          return (
            <div
              key={`${rule.kind}-${rule.number}`}
              className={clsx(
                "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm",
                ui.bg,
                ui.border,
              )}
            >
              <div className={clsx("shrink-0", ui.color)}>{ui.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-zinc-200 text-xs tracking-wide">
                  {rule.kind} Rule #{rule.number}
                </div>
                <div
                  className={clsx("text-xs truncate", ui.label)}
                  title={rule.label}
                >
                  {rule.label}
                </div>
              </div>
              <span
                className={clsx(
                  "text-[10px] font-medium uppercase tracking-wider",
                  ui.color,
                )}
              >
                {ui.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const STATUS_UI: Record<
  RuleCompliance["status"],
  {
    icon: React.ReactNode;
    text: string;
    color: string;
    bg: string;
    border: string;
    label: string;
  }
> = {
  pass: {
    icon: <Check className="w-3.5 h-3.5" />,
    text: "pass",
    color: "text-emerald-400",
    bg: "bg-emerald-950/30",
    border: "border-emerald-800/40",
    label: "text-emerald-200/80",
  },
  fail: {
    icon: <X className="w-3.5 h-3.5" />,
    text: "violated",
    color: "text-red-400",
    bg: "bg-red-950/30",
    border: "border-red-800/50",
    label: "text-red-200/80",
  },
  amend: {
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    text: "amend",
    color: "text-amber-400",
    bg: "bg-amber-950/30",
    border: "border-amber-800/50",
    label: "text-amber-200/80",
  },
  info: {
    icon: <HelpCircle className="w-3.5 h-3.5" />,
    text: "pending",
    color: "text-zinc-400",
    bg: "bg-zinc-950/50",
    border: "border-zinc-800",
    label: "text-zinc-400",
  },
};
