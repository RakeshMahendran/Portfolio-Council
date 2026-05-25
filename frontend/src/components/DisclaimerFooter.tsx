"use client";

import { AlertTriangle, ExternalLink } from "lucide-react";
import Link from "next/link";

/**
 * Global compliance footer — rendered on every page via app/layout.tsx.
 * Mirrors the verbatim disclaimer in README.md and the Orchestrator's
 * report-template rule, so the same language is visible across all four
 * surfaces (README, web UI, onboarding intro, committed report body).
 */
export function DisclaimerFooter() {
  return (
    <footer className="mt-auto border-t border-zinc-900 bg-zinc-950/80 backdrop-blur">
      <div className="max-w-5xl mx-auto px-6 py-4 text-[11px] text-zinc-500 leading-relaxed">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500/80 mt-0.5 shrink-0" />
          <p>
            <span className="text-zinc-400 font-medium">
              Not investment advice.
            </span>{" "}
            Portfolio Council is an open-source research / educational tool
            that simulates a multi-agent governance flow. It is{" "}
            <span className="text-zinc-400">not</span> a SEBI-registered
            investment adviser or research analyst. Outputs are illustrations
            of how the Council reasons, not personalized recommendations.
            Consult a SEBI RIA before making any actual investment decision.
            Past performance ≠ future results. The author accepts no
            liability for outcomes from following any output.
          </p>
        </div>
        <div className="mt-2 flex items-center justify-between gap-4 flex-wrap pl-5">
          <span>Open source · MIT · Built on gitclaw</span>
          <Link
            href="https://www.sebi.gov.in/sebiweb/other/OtherAction.do?doRecognisedFpi=yes"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-300 inline-flex items-center gap-1"
          >
            Find a SEBI-registered adviser
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </footer>
  );
}
