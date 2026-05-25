"use client";

import clsx from "clsx";
import { Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import SiteHeader from "@/components/SiteHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getSetupStatus } from "@/lib/api";
import type { SetupStatus } from "@/lib/types";

const POLL_MS = 1500;
// Cap how long we wait before assuming something went wrong. The agent's
// final commits should land within a few seconds — anything past 60s usually
// means a write was skipped or the agent crashed mid-flight.
const MAX_WAIT_MS = 60_000;

type StageId = "user_plan" | "rules" | "holdings";

const STAGES: { id: StageId; label: string; check: (s: SetupStatus) => boolean }[] = [
  {
    id: "user_plan",
    label: "Capturing your plan (memory/user_plan.md)",
    check: (s) => s.hasUserPlan,
  },
  {
    id: "rules",
    label: "Generating governance rules (RULES.md)",
    check: (s) => s.hasRules,
  },
  {
    id: "holdings",
    label: "Loading your holdings (data/holdings.json)",
    check: (s) => s.hasHoldings,
  },
];

/**
 * Post-onboarding processing page. Polls the data-file status endpoint and
 * shows which artifacts have landed. Once everything's ready it auto-forwards
 * to the profile page; if holdings are still missing after the deadline, it
 * forwards anyway with a note (the user can still upload them later).
 */
export default function ProcessingPage() {
  const router = useRouter();
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const startedAt = Date.now();
    let cancelled = false;

    const tick = async () => {
      try {
        const s = await getSetupStatus();
        if (cancelled) return;
        setStatus(s);
        // Plan + rules being present is "good enough" — holdings can land
        // asynchronously after the user uploads via the dashboard.
        if (s.hasUserPlan && s.hasRules) {
          window.setTimeout(() => {
            if (!cancelled) router.replace("/profile");
          }, 800);
          return; // stop polling
        }
        if (Date.now() - startedAt > MAX_WAIT_MS) {
          setTimedOut(true);
          return; // stop polling — show fallback CTA
        }
        window.setTimeout(tick, POLL_MS);
      } catch (e) {
        if (cancelled) return;
        setError(String(e));
        window.setTimeout(tick, POLL_MS * 2); // back off on error
      }
    };

    void tick();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const overallReady = status?.hasUserPlan && status?.hasRules;

  return (
    <div className="flex-1 brand-aura text-zinc-100 font-sans flex flex-col">
      <SiteHeader
        backHref="/"
        pageContext={
          <>
            <span className="text-sm text-zinc-400">Post-onboarding</span>
            <StatusBadge variant={overallReady ? "success" : "info"}>
              {overallReady ? "ready" : "processing"}
            </StatusBadge>
          </>
        }
      />

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-xl">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-7 shadow-xl">
            <div className="flex items-center gap-3 mb-1">
              {overallReady ? (
                <div className="w-9 h-9 rounded-full bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center">
                  <Check className="w-5 h-5 text-emerald-400" />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full bg-teal-600/20 border border-teal-500/40 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-teal-400 animate-spin" />
                </div>
              )}
              <h1 className="text-xl font-semibold">
                {overallReady
                  ? "Setup complete"
                  : "Setting up your portfolio governance…"}
              </h1>
            </div>
            <p className="text-sm text-zinc-400 ml-12 mb-5">
              {overallReady
                ? "Forwarding you to your profile."
                : "The onboarding agent is committing your plan and generating governance rules. This usually takes 5–20 seconds."}
            </p>

            <ul className="space-y-2.5">
              {STAGES.map((stage) => {
                const done = status ? stage.check(status) : false;
                return (
                  <li
                    key={stage.id}
                    className={clsx(
                      "flex items-start gap-3 p-3 rounded-lg border transition",
                      done
                        ? "border-emerald-700/50 bg-emerald-950/20"
                        : "border-zinc-800 bg-zinc-950/40",
                    )}
                  >
                    {done ? (
                      <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    ) : (
                      <Loader2 className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0 animate-spin" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p
                        className={clsx(
                          "text-sm",
                          done ? "text-zinc-100" : "text-zinc-400",
                        )}
                      >
                        {stage.label}
                      </p>
                      {!done && stage.id === "holdings" && (
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          Optional — you can upload later from your profile.
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            {error && (
              <p className="mt-4 text-xs text-amber-400">
                Status check failed — retrying. ({error})
              </p>
            )}

            {timedOut && !overallReady && (
              <div className="mt-5 p-3 rounded-lg border border-amber-700/50 bg-amber-950/20 text-sm text-amber-200">
                <p className="font-medium mb-1">
                  Still waiting on the agent to finalise.
                </p>
                <p className="text-xs text-amber-300/80">
                  Onboarding can take a minute on first run. You can also head
                  straight to your dashboard and check back later.
                </p>
                <div className="flex gap-2 mt-3">
                  <Link
                    href="/profile"
                    className="text-xs rounded-md px-3 py-1.5 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
                  >
                    Go to profile
                  </Link>
                  <Link
                    href="/onboarding"
                    className="text-xs rounded-md px-3 py-1.5 border border-zinc-700 text-zinc-300 hover:border-zinc-500"
                  >
                    Back to onboarding
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
