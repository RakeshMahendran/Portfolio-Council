"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AuthShell from "@/components/AuthShell";
import GoalProgress from "@/components/GoalProgress";
import { getSetupStatus } from "@/lib/api";
import type { SetupStatus } from "@/lib/types";

export default function Home() {
  const [status, setStatus] = useState<SetupStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await getSetupStatus();
      if (!cancelled) setStatus(s);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Loading
  if (status === null) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-500 text-sm">Loading…</div>
      </div>
    );
  }

  // New user flow
  if (!status.ready) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
        <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold tracking-tight">
              Portfolio Council
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
              powered by gitclaw
            </span>
          </div>
          <AuthShell />
        </header>

        <main className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-2xl text-center">
            <h1 className="text-5xl font-semibold tracking-tight mb-6">
              Your AI investment board.
            </h1>
            <p className="text-zinc-400 text-lg leading-relaxed mb-10">
              Five specialized agents review every portfolio decision. They
              argue. They commit. They keep an audit trail forever — so
              six months later, you can see exactly why you bought what you
              bought.
            </p>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-base font-semibold transition"
            >
              Get started →
            </Link>
            <div className="mt-12 text-xs text-zinc-600">
              5-minute setup · Self-hosted · Your data stays in your repo
            </div>
          </div>
        </main>

        <footer className="border-t border-zinc-900 px-6 py-3 text-xs text-zinc-600 flex items-center justify-between">
          <span>Open source · MIT</span>
          <Link href="/dev" className="hover:text-zinc-400 transition">
            Sessions &amp; git log →
          </Link>
        </footer>
      </div>
    );
  }

  // Returning user dashboard
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold tracking-tight">
            Portfolio Council
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
            powered by gitclaw
          </span>
        </div>
        <AuthShell />
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10 space-y-10">
        {/* Goal progress widget */}
        <section>
          <div className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
            Your goal
          </div>
          <GoalProgress
            targetAmount={4000000}
            currentValue={684000}
            targetDate="May 2027"
          />
        </section>

        {/* Quick actions */}
        <section>
          <div className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
            Actions
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ActionCard
              href="/session?prompt=Run+a+complete+portfolio+review+session+for+today."
              icon="▶"
              title="Run portfolio review"
              description="Full debate: Analyst → Strategist → Risk → Execution"
              primary
            />
            <ActionCard
              href="/session?prompt=Check+my+progress+toward+the+₹40L+goal+by+May+2027.+Show+projected+vs+required+returns."
              icon="📊"
              title="Check goal progress"
              description="Compare current trajectory with target milestone"
            />
            <ActionCard
              href="/onboarding?mode=update"
              icon="🔧"
              title="Update plan"
              description="Re-run onboarding to revise goals or constraints"
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-900 px-6 py-3 text-xs text-zinc-600 flex items-center justify-between">
        <span>Open source · MIT</span>
        <Link href="/dev" className="hover:text-zinc-400 transition">
          Sessions &amp; git log →
        </Link>
      </footer>
    </div>
  );
}

function ActionCard({
  href,
  icon,
  title,
  description,
  primary = false,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block p-5 rounded-lg border transition group ${
        primary
          ? "border-emerald-700/60 bg-emerald-900/20 hover:bg-emerald-900/30"
          : "border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl">{icon}</div>
        <div className="flex-1 min-w-0">
          <div
            className={`text-base font-semibold mb-1 ${
              primary ? "text-emerald-300" : "text-zinc-100"
            }`}
          >
            {title}
          </div>
          <div className="text-sm text-zinc-400 leading-snug">
            {description}
          </div>
        </div>
        <div
          className={`text-xl transition group-hover:translate-x-0.5 ${
            primary ? "text-emerald-400" : "text-zinc-600"
          }`}
        >
          →
        </div>
      </div>
    </Link>
  );
}
