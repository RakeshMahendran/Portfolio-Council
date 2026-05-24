"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import AuthShell from "@/components/AuthShell";
import MarkdownView from "@/components/MarkdownView";
import { getLatestSession, getWorkspaceFile } from "@/lib/api";

const AGENT_META = {
  analyst: {
    name: "Analyst",
    icon: "📊",
    description: "Observes facts. Never recommends.",
    artifactPrefix: "analysis",
  },
  strategist: {
    name: "Strategist",
    icon: "💡",
    description: "Proposes rebalance actions. Cites RULES.",
    artifactPrefix: "proposal",
  },
  risk: {
    name: "Risk Officer",
    icon: "🛑",
    description: "Adversarial review. APPROVE / VETO / AMEND.",
    artifactPrefix: "verdict",
  },
  execution: {
    name: "Execution",
    icon: "✅",
    description: "Translates approved strategy to price-targeted orders.",
    artifactPrefix: "orders",
  },
} as const;

type AgentKey = keyof typeof AGENT_META;

export default function AgentDetailPage() {
  return (
    <Suspense fallback={null}>
      <AgentDetailInner />
    </Suspense>
  );
}

function AgentDetailInner() {
  const params = useParams();
  const search = useSearchParams();
  const agentParam = (params?.agent as string) ?? "";
  const agent = agentParam as AgentKey;
  const meta = AGENT_META[agent];

  const fileFromQuery = search.get("file");

  const [content, setContent] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        let f = fileFromQuery;
        if (!f) {
          // Fall back to latest session
          const session = await getLatestSession();
          const agentSummary = session.agents[agent];
          if (!agentSummary?.exists || !agentSummary.filename) {
            throw new Error(
              `${meta?.name ?? agentParam} has no artifact in the latest session`,
            );
          }
          f = agentSummary.filename;
          if (!cancelled) setDate(session.date);
        }
        const { raw } = await getWorkspaceFile(f);
        if (!cancelled) {
          setContent(raw);
          setFilename(f);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [agent, fileFromQuery, agentParam, meta?.name]);

  if (!meta) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-2">Unknown agent: {agentParam}</div>
          <Link href="/session" className="text-emerald-400 hover:text-emerald-300 text-sm">
            ← Back to session
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/session"
            className="text-zinc-400 hover:text-zinc-100 transition text-sm"
          >
            ← Back to session
          </Link>
          <span className="text-lg font-semibold tracking-tight">
            {meta.icon} {meta.name}
          </span>
        </div>
        <AuthShell />
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-4">
        <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-900/40">
          <div className="text-xs text-zinc-500">{meta.description}</div>
          {filename && (
            <div className="text-[11px] text-zinc-600 mt-1 font-mono">
              workspace/{filename}
              {date && <span className="ml-2 text-zinc-500">· {date}</span>}
            </div>
          )}
        </div>

        {loading && (
          <div className="text-sm text-zinc-500 italic">Loading…</div>
        )}

        {error && !loading && (
          <div className="border border-red-900/60 bg-red-950/30 rounded-lg p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {content && !loading && (
          <div className="border border-zinc-800 rounded-lg p-6 bg-zinc-900/30">
            <MarkdownView content={content} />
          </div>
        )}
      </main>
    </div>
  );
}
