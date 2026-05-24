"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Eye,
  GitBranch,
  Play,
  Settings,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import GoalProgress from "@/components/GoalProgress";
import SiteHeader from "@/components/SiteHeader";
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
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
        <SiteHeader />
        <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10 space-y-10">
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
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
        <SiteHeader />

        <main className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-2xl text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/30 border border-emerald-800/50 text-emerald-300 text-xs">
              <Sparkles className="w-3 h-3" />
              5-agent adversarial review
            </div>

            <h1 className="text-5xl font-semibold tracking-tight leading-tight">
              Your AI investment board.
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
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-900 rounded-md text-base text-zinc-200 transition"
              >
                Start onboarding
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="text-xs text-zinc-500 max-w-md mx-auto pt-2">
              <span className="text-emerald-400">Try with sample data</span> seeds a generic plan + 10
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
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Self-hosted
              </span>
              <span>·</span>
              <span>Your data, your repo</span>
              <span>·</span>
              <span>Open source · MIT</span>
            </div>
          </div>
        </main>

        <SiteFooter />
      </div>
    );
  }

  // ─── Returning user — Dashboard ───
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <SiteHeader />

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10 space-y-10">
        {/* Holdings-pending banner — only for users who deferred upload, NOT
            for users whose portfolio is explicitly FD/cash-only (where the
            onboarding agent marked holdings as empty by design). */}
        {!status.hasHoldings && !holdingsAbsentByDesign && (
          <div className="rounded-xl border border-amber-700/40 bg-amber-950/20 px-5 py-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-amber-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  One step left — upload your holdings
                </h3>
                <p className="text-xs text-amber-100/70 mt-1 leading-relaxed max-w-xl">
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
                <Link
                  href="/profile"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium transition"
                >
                  Upload holdings
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Goal section */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-zinc-500" />
            <h2 className="text-xs uppercase tracking-wider text-zinc-500">
              Your goal
            </h2>
          </div>
          <GoalProgress
            targetAmount={goal?.target}
            currentValue={goal?.current}
            targetDate={goal?.date ?? "—"}
            loading={!goal || Object.keys(goal).length === 0}
          />
        </section>

        {/* Quick actions */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs uppercase tracking-wider text-zinc-500">
              Quick actions
            </h2>
            {!status.hasHoldings && !holdingsAbsentByDesign && (
              <StatusBadge variant="warning">holdings needed</StatusBadge>
            )}
            {holdingsAbsentByDesign && (
              <StatusBadge variant="neutral">portfolio is cash/FD only</StatusBadge>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ActionCard
              href="/session?prompt=Run+a+complete+portfolio+review+session+for+today."
              icon={Play}
              title="Run portfolio review"
              description="Full debate: Analyst → Strategist → Risk → Execution"
              primary
              disabled={!status.hasHoldings && !holdingsAbsentByDesign}
            />
            <ActionCard
              href="/session?prompt=Check+my+progress+toward+the+goal.+Show+projected+vs+required+returns."
              icon={Eye}
              title="Check goal progress"
              description="Compare current trajectory with target milestone"
            />
            <ActionCard
              href="/profile"
              icon={Settings}
              title="Profile & data"
              description="View, edit, or replace your plan, holdings, and rules"
            />
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────


function SiteFooter() {
  return (
    <footer className="border-t border-zinc-900 px-6 py-3 text-xs text-zinc-600 flex items-center justify-between">
      <span>Open source · MIT · Built with gitclaw</span>
      <Link
        href="/dev"
        className="hover:text-zinc-400 transition flex items-center gap-1"
      >
        <GitBranch className="w-3 h-3" />
        Developer view
      </Link>
    </footer>
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
