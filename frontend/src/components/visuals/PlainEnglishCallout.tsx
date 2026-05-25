"use client";

import { MessageSquareText } from "lucide-react";
import { AgentIcon, AGENT_META, type AgentKey } from "@/components/AgentIcon";

/**
 * The agent's own layperson summary, surfaced prominently above the charts.
 * Every agent leads its artifact with an "In plain English" section; this
 * pulls it out of the collapsed markdown so a non-expert reads it first.
 */
export function PlainEnglishCallout({
  agent,
  summary,
}: {
  agent: AgentKey;
  summary: string | null;
}) {
  if (!summary) return null;
  return (
    <div className="rounded-xl border border-teal-500/25 bg-teal-500/[0.06] p-5">
      <div className="flex items-center gap-2 mb-2">
        <MessageSquareText className="w-3.5 h-3.5 text-teal-300" />
        <h3 className="text-xs uppercase tracking-wider text-teal-300/90">
          {AGENT_META[agent].name} — in plain English
        </h3>
      </div>
      <p className="text-sm leading-relaxed text-zinc-200">{summary}</p>
    </div>
  );
}
