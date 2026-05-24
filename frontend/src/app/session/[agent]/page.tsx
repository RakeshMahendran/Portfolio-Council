"use client";

import clsx from "clsx";
import {
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  FileWarning,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import MarkdownView from "@/components/MarkdownView";
import SiteHeader from "@/components/SiteHeader";
import { AgentVisuals } from "@/components/visuals/AgentVisuals";
import {
  getLatestSession,
  getUserPlan,
  getWorkspaceFile,
  type SessionData,
} from "@/lib/api";

// ─── Agent catalog ────────────────────────────────────────────────────────

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

const AGENT_ORDER: AgentKey[] = ["analyst", "strategist", "risk", "execution"];

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
  const [session, setSession] = useState<SessionData | null>(null);
  const [userPlanContent, setUserPlanContent] = useState<string | null>(null);
  const [showTechnical, setShowTechnical] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch session + this agent's artifact content.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // Always fetch the session — the sidebar needs it to show artifact
        // status across all four agents.
        const sess = await getLatestSession();
        if (!cancelled) setSession(sess);

        let f = fileFromQuery;
        if (!f) {
          const agentSummary = sess.agents[agent];
          if (!agentSummary?.exists || !agentSummary.filename) {
            throw new Error(
              `${meta?.name ?? agentParam} has no artifact in the latest session`,
            );
          }
          f = agentSummary.filename;
        }
        const { raw } = await getWorkspaceFile(f);
        if (!cancelled) {
          setContent(raw);
          setFilename(f);
        }

        // Analyst card needs Goal Progress, which lives in user_plan.md
        // (not in the analysis artifact). Fetch only for that agent.
        if (agent === "analyst" && !cancelled) {
          try {
            const plan = await getUserPlan();
            if (!cancelled) setUserPlanContent(plan.raw);
          } catch {
            if (!cancelled) setUserPlanContent(null);
          }
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
          <Link
            href="/session"
            className="text-emerald-400 hover:text-emerald-300 text-sm"
          >
            ← Back to session
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteHeader
        backHref="/session"
        pageContext={
          <span className="text-sm text-zinc-400">
            {meta.icon} {meta.name}
          </span>
        }
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] gap-6">
        {/* ─── Left sidebar — agent nav ──────────────────────────── */}
        <AgentNav
          currentAgent={agent}
          session={session}
          loading={loading && !session}
        />

        {/* ─── Right column — artifact body ──────────────────────── */}
        <div className="space-y-4 min-w-0">
          <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-900/40">
            <div className="text-xs text-zinc-500">{meta.description}</div>
            {filename && (
              <div className="text-[11px] text-zinc-600 mt-1 font-mono break-all">
                workspace/{filename}
                {session?.date && (
                  <span className="ml-2 text-zinc-500">· {session.date}</span>
                )}
              </div>
            )}
          </div>

          {loading && (
            <div className="text-sm text-zinc-500 italic flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Loading…
            </div>
          )}

          {error && !loading && (
            <div className="border border-red-900/60 bg-red-950/30 rounded-lg p-4 text-sm text-red-300 flex items-start gap-2">
              <FileWarning className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <div className="font-medium mb-1">Couldn't load artifact</div>
                <div className="text-xs text-red-300/80">{error}</div>
              </div>
            </div>
          )}

          {content && !loading && (
            <>
              {/* Visual layer is the PRIMARY view for the layperson */}
              <AgentVisuals
                agent={agent}
                content={content}
                userPlanContent={userPlanContent}
              />

              {/* The full markdown is the audit-trail / for-the-next-agent
                  content. Collapsed by default so it doesn't dominate the
                  visual story. */}
              <div className="border border-zinc-800 rounded-lg bg-zinc-900/30">
                <button
                  type="button"
                  onClick={() => setShowTechnical((v) => !v)}
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-zinc-900/50 transition rounded-t-lg"
                  aria-expanded={showTechnical}
                >
                  <span className="flex items-center gap-2 text-sm text-zinc-300">
                    <FileText className="w-4 h-4 text-zinc-500" />
                    <span className="font-medium">Full audit-trail report</span>
                    <span className="text-xs text-zinc-500 ml-1">
                      ({content.split("\n").length.toLocaleString()} lines · for {meta.name} agent's full reasoning)
                    </span>
                  </span>
                  <ChevronDown
                    className={clsx(
                      "w-4 h-4 text-zinc-500 transition-transform",
                      showTechnical && "rotate-180",
                    )}
                  />
                </button>
                {showTechnical && (
                  <div className="px-6 pb-6 pt-2 border-t border-zinc-800/50">
                    <MarkdownView content={content} />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────

function AgentNav({
  currentAgent,
  session,
  loading,
}: {
  currentAgent: AgentKey;
  session: SessionData | null;
  loading: boolean;
}) {
  return (
    <aside className="md:sticky md:top-6 md:self-start space-y-1">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2 px-2">
        Session agents
      </div>
      {AGENT_ORDER.map((key) => {
        const meta = AGENT_META[key];
        const agentSummary = session?.agents[key];
        const hasArtifact = Boolean(agentSummary?.exists);
        const isActive = key === currentAgent;
        const filename = agentSummary?.filename;
        const href = filename
          ? `/session/${key}?file=${encodeURIComponent(filename)}`
          : `/session/${key}`;

        return (
          <Link
            key={key}
            href={href}
            className={clsx(
              "group flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition border",
              isActive
                ? "bg-zinc-800/80 border-zinc-700 text-zinc-100"
                : hasArtifact
                  ? "bg-zinc-900/40 border-zinc-800 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-900/70"
                  : "bg-zinc-950/40 border-zinc-900 text-zinc-500 hover:border-zinc-700",
            )}
          >
            <span className="text-base leading-none shrink-0" aria-hidden>
              {meta.icon}
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-medium leading-tight">{meta.name}</div>
              <div
                className={clsx(
                  "text-[10px] mt-0.5 leading-tight",
                  isActive ? "text-zinc-400" : "text-zinc-600",
                )}
              >
                {hasArtifact ? agentSummary?.filename : "no artifact"}
              </div>
            </div>
            <div className="shrink-0">
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-600" />
              ) : hasArtifact ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-zinc-700 block"
                  aria-label="no artifact"
                />
              )}
            </div>
            {!isActive && (
              <ChevronRight
                className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-500 shrink-0 transition"
                aria-hidden
              />
            )}
          </Link>
        );
      })}

      {session?.date && (
        <div className="mt-4 px-3 py-2 rounded-lg border border-zinc-800/60 bg-zinc-950/50 text-[11px] text-zinc-500">
          Session date:{" "}
          <span className="text-zinc-300 font-mono">{session.date}</span>
        </div>
      )}
      <Link
        href="/session"
        className="block mt-2 px-3 py-2 rounded-lg text-[11px] text-zinc-500 hover:text-zinc-300 transition"
      >
        ← Back to session overview
      </Link>
    </aside>
  );
}
