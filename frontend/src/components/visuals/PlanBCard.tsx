"use client";

import { ChevronDown, ShieldCheck } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import MarkdownView from "@/components/MarkdownView";

/**
 * Plan B excerpt + expand-for-full. Risk Officer policy: always offer Plan B
 * even when Plan A is approved. This card surfaces the alternative.
 */
export function PlanBCard({ planB }: { planB: string | null }) {
  const [expanded, setExpanded] = useState(false);
  if (!planB) return null;

  const isLong = planB.length > 280;
  const preview = isLong ? planB.slice(0, 280) + "…" : planB;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck className="w-4 h-4 text-zinc-400" />
        <h3 className="text-xs uppercase tracking-wider text-zinc-500">
          If Plan A doesn't work — Risk Officer's Plan B
        </h3>
      </div>
      {!expanded ? (
        <p className="text-sm text-zinc-300 leading-relaxed italic whitespace-pre-line">
          {preview}
        </p>
      ) : (
        <div className="text-sm text-zinc-300 leading-relaxed prose-zinc">
          <MarkdownView content={planB} />
        </div>
      )}
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 inline-flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300"
        >
          {expanded ? "Show less" : "Show full alternative"}
          <ChevronDown
            className={clsx("w-3 h-3 transition-transform", expanded && "rotate-180")}
          />
        </button>
      )}
    </div>
  );
}
