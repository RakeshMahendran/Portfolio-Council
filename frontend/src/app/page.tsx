"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Eye,
  GitBranch,
  MessageSquare,
  Play,
  Settings,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import GoalProgress from "@/components/GoalProgress";
import SiteHeader from "@/components/SiteHeader";
import { BrandMark } from "@/components/BrandMark";
import { AgentSummaryGrid } from "@/components/visuals/AgentSummaryGrid";
import { MilestoneTable } from "@/components/visuals/MilestoneTable";
import { PrescriptionCard } from "@/components/visuals/PrescriptionCard";
import { TodaysActionHero } from "@/components/visuals/TodaysActionHero";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card } from "@/components/ui/Card";
import {
  getProviderStatus,
  getSetupStatus,
  getUserPlan,
  seedDemo,
} from "@/lib/api";
import type { SetupStatus } from "@/lib/types";

function parseInr(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const cleaned = s.replace(/[,₹\s]/g, "");
  const n = Number(cleaned);
  return isNaN(n) ? undefined : n;
}

/**
 * Detects whether the user's plan explicitly declares they have NO tradeable
 * holdings (FD-only, cash-only, or starting from scratch). Used to suppress
 * the "Upload your holdings" banner — that nag is for users who deferred
 * upload, not for users whose portfolio is genuinely 100% FD or cash.
 */
function holdingsEmptyByDesign(planText: string | undefined): boolean {
  if (!planText) return false;
  const t = planText.toLowerCase();
  return (
    t.includes("no tradeable holdings") ||
    t.includes("portfolio is fd only") ||
    t.includes("portfolio is cash") ||
    t.includes("starting from scratch") ||
    t.includes("no equity holdings") ||
    t.includes("no holdings yet") ||
    t.includes("cash-fd only")
  );
}

export default function Home() {
  const router = useRouter();
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [goal, setGoal] = useState<{
    target?: number;
    current?: number;
    date?: string;
  } | null>(null);
  const [planRaw, setPlanRaw] = useState<string | null>(null);
  const [holdingsAbsentByDesign, setHoldingsAbsentByDesign] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const onTryDemo = async () => {
    setSeeding(true);
    const tid = toast.loading("Seeding demo data…");
    try {
      await seedDemo();
      toast.success("Demo loaded · Plan, rules, and 10 sample holdings ready", {
        id: tid,
      });
      // Small delay so the toast is visible before navigation
      setTimeout(() => router.push("/session"), 500);
    } catch (e) {
      toast.error(
        `Seed failed: ${e instanceof Error ? e.message : String(e)}`,
        { id: tid },
      );
      setSeeding(false);
    }
  };

  // ── Provider-credentials gate ───────────────────────────────────────
  // If no LLM provider is configured, the agents can't run. Send the
  // user to /setup/credentials before anything else loads. This is the
  // "first thing a fresh-clone judge sees" guarantee.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await getProviderStatus();
        if (!cancelled && !p.ready) router.replace("/setup/credentials");
      } catch {
        // If the endpoint itself is unreachable, leave the user on the
        // landing page — they'll see the empty-state copy.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await getSetupStatus();
      if (cancelled) return;
      setStatus(s);
      // Fetch user_plan whenever it exists, not just when everything is
      // "ready" — we need its content to tell "holdings empty by design"
      // from "holdings pending upload".
      if (s.hasUserPlan && s.hasRules) {
        try {
          const p = await getUserPlan();
          if (cancelled) return;
          setGoal({
            target: parseInr(p.parsed.targetAmount),
            current: parseInr(p.parsed.portfolioValue),
            date: p.parsed.targetDate,
          });
          setPlanRaw(p.raw);
          setHoldingsAbsentByDesign(holdingsEmptyByDesign(p.raw));
        } catch {
          if (!cancelled) setGoal({});
        }
      } else {
        setGoal({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Loading ───
  if (status === null) {
    return (
      <div className="flex-1 brand-aura text-zinc-100 flex flex-col">
        <SiteHeader />
        <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-7 space-y-7 relative z-10">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </main>
      </div>
    );
  }

  // "Onboarded" = plan + rules exist. Holdings is optional — the user can
  // upload it later from the profile page. Previously this gate was
  // `status.ready` (all three files), which sent users with a saved plan
  // but no holdings back through onboarding on every home-page visit.
  const onboarded = status.hasUserPlan && status.hasRules;

  // ─── New user — Welcome hero ───
  if (!onboarded) {
    return (
      <div className="flex-1 brand-aura text-zinc-100 flex flex-col">
        <SiteHeader />

        <main className="flex-1 flex items-center justify-center px-6 relative z-10">
          <div className="max-w-2xl text-center space-y-8">
            <div className="flex justify-center">
              <BrandMark size={64} className="brand-ring rounded-2xl" />
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-400/20 text-teal-200 text-xs">
              <Sparkles className="w-3 h-3" />
              5-agent adversarial review
            </div>

            <h1 className="text-5xl font-semibold tracking-tight leading-tight">
              Your <span className="brand-text">AI investment board</span>.
            </h1>

            <p className="text-zinc-400 text-lg leading-relaxed max-w-xl mx-auto">
              Five specialized agents review every portfolio decision. They
              argue. They commit. They keep an audit trail forever — so six
              months later, you can see exactly why you bought what you bought.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-lg mx-auto">
              <Button
                variant="primary"
                size="lg"
                onClick={onTryDemo}
                loading={seeding}
                className="flex-1 justify-center"
              >
                {!seeding && <Zap className="w-4 h-4" />}
                {seeding ? "Loading demo…" : "Try with sample data"}
              </Button>
              <Link
                href="/onboarding"
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-white/10 hover:border-white/25 hover:bg-white/[0.04] rounded-lg text-base text-zinc-200 transition"
              >
                Start onboarding
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="text-xs text-zinc-500 max-w-md mx-auto pt-2">
              <span className="text-teal-300">Try with sample data</span> seeds a generic plan + 10
              demo holdings so you can run a portfolio review in seconds without
              entering personal info.{" "}
              <Link
                href="/dev"
                className="text-zinc-500 hover:text-zinc-300 underline underline-offset-2"
              >
                Or jump straight to the git log →
              </Link>
            </div>

            <div className="text-xs text-zinc-600 flex items-center justify-center gap-4 pt-4">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                Self-hosted
              </span>
              <span>·</span>
              <span>Your data, your repo</span>
              <span>·</span>
              <span>Open source · MIT</span>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ─── Returning user — Dashboard ───
  return (
    <div className="flex-1 brand-aura text-zinc-100 flex flex-col">
      <SiteHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-7 space-y-7 relative z-10">
        {/* ── Product intro — make the dashboard self-explanatory ──────── */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <BrandMark size={30} />
                <h1 className="text-lg font-semibold tracking-tight">Portfolio Council</h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-400/20 text-teal-300 font-medium">
                  5-agent board
                </span>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed mt-2 max-w-3xl">
                Your AI investment board. Five specialist agents{" "}
                <span className="text-zinc-200 font-medium">analyze, debate, and govern</span>{" "}
                every portfolio decision — the whole deliberation is committed to git as an
                immutable audit trail.
              </p>
            </div>
            {/* Entry point to the conversational Onboarding agent. */}
            <Link
              href="/onboarding"
              className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-teal-400/30 bg-teal-500/10 hover:bg-teal-500/20 px-4 py-2 text-sm font-medium text-teal-200 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Talk to Onboarding agent
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
            {["Onboarding", "Analyst", "Strategist", "Risk Officer", "Execution"].map(
              (a, i) => (
                <span key={a} className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/10 text-zinc-300">
                    {a}
                  </span>
                  {i < 4 && <span className="text-zinc-600">→</span>}
                </span>
              ),
            )}
          </div>
        </section>

        {/* Holdings-pending banner — only for users who deferred upload, NOT
            for users whose portfolio is explicitly FD/cash-only (where the
            onboarding agent marked holdings as empty by design). */}
        {!status.hasHoldings && !holdingsAbsentByDesign && (
          <div className="rounded-xl border border-teal-500/25 bg-teal-500/[0.06] px-5 py-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-teal-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  One step left — upload your holdings
                </h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed max-w-xl">
                  Your plan and governance rules are saved. Before the Council
                  can run its first portfolio review, it needs to see what you
                  currently hold — upload a CSV from your broker, or seed
                  sample data to explore the flow.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="secondary" size="sm" onClick={onTryDemo} loading={seeding}>
                  Seed sample
                </Button>
                <Button variant="primary" size="sm" onClick={() => router.push("/profile")}>
                  Upload holdings
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Today's action — the highest-priority signal ────────────── */}
        <TodaysActionHero />

        {/* ── The investment prescription — where/how-much/how-long/when ── */}
        <PrescriptionCard />

        {/* ── Goal at a glance ────────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-zinc-500" />
            <h2 className="text-xs uppercase tracking-wider text-zinc-500">
              Your goal
            </h2>
            {holdingsAbsentByDesign && (
              <StatusBadge variant="neutral">portfolio is cash/FD only</StatusBadge>
            )}
          </div>
          <GoalProgress
            targetAmount={goal?.target}
            currentValue={goal?.current}
            targetDate={goal?.date ?? "—"}
            planText={planRaw}
            loading={!goal || Object.keys(goal).length === 0}
          />
        </section>

        {/* ── Long-horizon milestones ─────────────────────────────────── */}
        <section>
          <MilestoneTable planText={planRaw} />
        </section>

        {/* ── 4 agents' decision at a glance (replaces /session 2×2 grid) ─ */}
        <AgentSummaryGrid />

        {/* ── Secondary actions ───────────────────────────────────────── */}
        <section className="border-t border-zinc-900 pt-6">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <SecondaryLink
              href="/onboarding"
              icon={MessageSquare}
              label="Onboarding agent"
            />
            <SecondaryLink
              href="/profile"
              icon={Settings}
              label="Profile & data"
            />
            <SecondaryLink href="/dev" icon={GitBranch} label="Git log" />
            <SecondaryLink
              href="/session"
              icon={Eye}
              label="Session viewer"
            />
            <SecondaryLink
              href="/session?prompt=Run+a+complete+portfolio+review+session+for+today."
              icon={Play}
              label="Run new review"
            />
          </div>
        </section>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────


function SecondaryLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-white/[0.06] hover:border-teal-500/40 bg-white/[0.02] hover:bg-teal-500/[0.04] px-3.5 py-3 text-sm text-zinc-300 hover:text-zinc-100 transition"
    >
      <span className="w-8 h-8 rounded-lg inline-flex items-center justify-center border border-teal-400/20 bg-teal-500/10 text-teal-300 group-hover:bg-teal-500/20 transition shrink-0">
        <Icon className="w-4 h-4" />
      </span>
      <span className="font-medium">{label}</span>
    </Link>
  );
}

function ActionCard({
  href,
  icon: Icon,
  title,
  description,
  primary = false,
  disabled = false,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  primary?: boolean;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <Card className="p-5 opacity-50 cursor-not-allowed">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-zinc-400">{title}</div>
            <div className="text-xs text-zinc-600 leading-snug mt-1">
              {description}
            </div>
            <div className="text-[10px] text-amber-400 mt-2">
              Upload holdings first
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Link
      href={href}
      className={`block p-5 rounded-lg border transition-colors group ${
        primary
          ? "border-emerald-700/60 bg-emerald-900/20 hover:bg-emerald-900/30"
          : "border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-700"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            primary
              ? "bg-emerald-800/40 border border-emerald-700/60"
              : "bg-zinc-800 border border-zinc-700"
          }`}
        >
          <Icon
            className={`w-4 h-4 ${primary ? "text-emerald-300" : "text-zinc-400"}`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className={`text-sm font-semibold ${
              primary ? "text-emerald-100" : "text-zinc-100"
            }`}
          >
            {title}
          </div>
          <div className="text-xs text-zinc-400 leading-snug mt-1">
            {description}
          </div>
        </div>
        <ArrowRight
          className={`w-4 h-4 transition group-hover:translate-x-0.5 ${
            primary ? "text-emerald-400" : "text-zinc-600"
          }`}
        />
      </div>
    </Link>
  );
}
