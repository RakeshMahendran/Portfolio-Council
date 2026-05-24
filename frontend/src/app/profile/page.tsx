"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import AuthShell from "@/components/AuthShell";
import MarkdownView from "@/components/MarkdownView";
import {
  deleteHoldings,
  deleteUserPlan,
  getDataFiles,
  getHoldings,
  getRules,
  getUserPlan,
  putUserPlan,
  stripAnsi,
  streamUpdateViaChat,
  uploadHoldings,
  type DataFileStatus,
  type Holding,
  type ParsedUserPlan,
} from "@/lib/api";
import type { StreamMsg } from "@/lib/types";

export default function ProfilePage() {
  const [files, setFiles] = useState<DataFileStatus | null>(null);
  const [plan, setPlan] = useState<{ raw: string; parsed: ParsedUserPlan } | null>(null);
  const [rules, setRules] = useState<string | null>(null);
  const [holdings, setHoldings] = useState<Holding[] | null>(null);

  const [planRawVisible, setPlanRawVisible] = useState(false);
  const [rulesRawVisible, setRulesRawVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState(false);
  const [editingPlanText, setEditingPlanText] = useState("");

  const [updateTarget, setUpdateTarget] = useState<"user_plan" | "holdings" | "rules">("user_plan");
  const [updateInstruction, setUpdateInstruction] = useState("");
  const [updateRunning, setUpdateRunning] = useState(false);
  const [updateLog, setUpdateLog] = useState<StreamMsg[]>([]);

  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const pushError = (msg: string) => setErrors((prev) => [...prev, msg]);

  const refreshAll = useCallback(async () => {
    try {
      const f = await getDataFiles();
      setFiles(f);
      if (f.user_plan) setPlan(await getUserPlan()); else setPlan(null);
      if (f.rules) setRules((await getRules()).raw); else setRules(null);
      if (f.holdings) setHoldings((await getHoldings()).holdings); else setHoldings(null);
    } catch (e) {
      pushError(`Refresh failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // ─── Actions ───────────────────────────────────────────────────

  const onEditPlanClick = () => {
    if (!plan) return;
    setEditingPlanText(plan.raw);
    setEditingPlan(true);
  };

  const onSavePlan = async () => {
    try {
      await putUserPlan(editingPlanText);
      setEditingPlan(false);
      await refreshAll();
    } catch (e) {
      pushError(`Save plan: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const onDeletePlan = async () => {
    if (
      !window.confirm(
        "Delete user_plan.md AND RULES.md? You will need to re-run onboarding. This cannot be undone.",
      )
    )
      return;
    try {
      await deleteUserPlan();
      await refreshAll();
    } catch (e) {
      pushError(`Delete plan: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const onDeleteHoldings = async () => {
    if (!window.confirm("Delete data/holdings.json? You will need to upload again."))
      return;
    try {
      await deleteHoldings();
      await refreshAll();
    } catch (e) {
      pushError(`Delete holdings: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const onUploadClick = () => fileInputRef.current?.click();

  const onFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const f = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file
    if (!f) return;
    try {
      await uploadHoldings(f);
      await refreshAll();
    } catch (e) {
      pushError(`Upload: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const onSendUpdate = async () => {
    const text = updateInstruction.trim();
    if (!text || updateRunning) return;
    setUpdateRunning(true);
    setUpdateLog([]);
    try {
      for await (const msg of streamUpdateViaChat(updateTarget, text)) {
        setUpdateLog((prev) => [...prev, msg]);
      }
      await refreshAll();
      setUpdateInstruction("");
    } catch (e) {
      pushError(`Update via chat: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setUpdateRunning(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-zinc-400 hover:text-zinc-100 transition text-sm">
            ←
          </Link>
          <span className="text-lg font-semibold tracking-tight">Portfolio Council</span>
          <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
            powered by gitclaw
          </span>
        </div>
        <AuthShell />
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Your Profile</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Goals, holdings, and governance — your local repo&apos;s source of
            truth. Files live in{" "}
            <code className="text-zinc-400">memory/</code>,{" "}
            <code className="text-zinc-400">data/</code>, and{" "}
            <code className="text-zinc-400">RULES.md</code>.
          </p>
        </div>

        {errors.length > 0 && (
          <div className="border border-red-900/60 bg-red-950/40 rounded-lg p-3 text-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-red-400 font-medium">Errors</span>
              <button
                onClick={() => setErrors([])}
                className="text-red-500 hover:text-red-300 text-xs"
              >
                clear
              </button>
            </div>
            <ul className="text-red-300 text-xs space-y-1">
              {errors.map((e, i) => (
                <li key={i}>• {e}</li>
              ))}
            </ul>
          </div>
        )}

        {/* PLAN SECTION */}
        <Section
          title="Plan"
          status={files?.user_plan ? "ok" : "missing"}
          missingMessage="No plan yet — run onboarding first."
          missingAction={
            <Link
              href="/onboarding"
              className="text-emerald-400 hover:text-emerald-300 text-sm"
            >
              → Start onboarding
            </Link>
          }
          actions={
            plan && (
              <>
                <button
                  onClick={onEditPlanClick}
                  disabled={editingPlan}
                  className="px-2.5 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700 disabled:opacity-50"
                >
                  Edit raw
                </button>
                <button
                  onClick={onDeletePlan}
                  className="px-2.5 py-1 text-xs bg-red-900/40 hover:bg-red-900/60 rounded border border-red-800 text-red-300"
                >
                  Delete + Re-onboard
                </button>
              </>
            )
          }
        >
          {plan && !editingPlan && (
            <div className="space-y-3">
              <ParsedPlanGrid parsed={plan.parsed} />

              <button
                onClick={() => setPlanRawVisible((v) => !v)}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                {planRawVisible ? "▾" : "▸"} Raw markdown ({plan.raw.length} chars)
              </button>
              {planRawVisible && (
                <div className="border border-zinc-800 rounded p-3 bg-zinc-900">
                  <MarkdownView content={plan.raw} />
                </div>
              )}
            </div>
          )}

          {editingPlan && (
            <div className="space-y-2">
              <textarea
                value={editingPlanText}
                onChange={(e) => setEditingPlanText(e.target.value)}
                className="w-full h-96 bg-zinc-950 border border-zinc-800 rounded p-3 text-xs font-mono"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setEditingPlan(false)}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-100"
                >
                  Cancel
                </button>
                <button
                  onClick={onSavePlan}
                  className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 rounded font-semibold"
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </Section>

        {/* HOLDINGS SECTION */}
        <Section
          title="Holdings"
          status={files?.holdings ? "ok" : "missing"}
          missingMessage="No holdings uploaded. The agents need this to run a review."
          missingAction={
            <button
              onClick={onUploadClick}
              className="text-emerald-400 hover:text-emerald-300 text-sm"
            >
              → Upload CSV / Excel / JSON
            </button>
          }
          actions={
            holdings && (
              <>
                <button
                  onClick={onUploadClick}
                  className="px-2.5 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700"
                >
                  Replace
                </button>
                <button
                  onClick={onDeleteHoldings}
                  className="px-2.5 py-1 text-xs bg-red-900/40 hover:bg-red-900/60 rounded border border-red-800 text-red-300"
                >
                  Delete
                </button>
              </>
            )
          }
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={onFileSelected}
            accept=".csv,.xlsx,.xls,.json"
            className="hidden"
          />
          {holdings && <HoldingsTable holdings={holdings} />}
        </Section>

        {/* RULES SECTION */}
        <Section
          title="Rules"
          status={files?.rules ? "ok" : "missing"}
          missingMessage="No rules — these are auto-generated from your plan. Run onboarding."
          subtitle="Generated from your plan by the Onboarding agent. Modify the plan above to regenerate rules. Risk Officer enforces these on every session."
        >
          {rules && (
            <>
              <button
                onClick={() => setRulesRawVisible((v) => !v)}
                className="text-xs text-zinc-500 hover:text-zinc-300 mb-2"
              >
                {rulesRawVisible ? "▾" : "▸"} View rules ({rules.length} chars)
              </button>
              {rulesRawVisible && (
                <div className="border border-zinc-800 rounded p-3 bg-zinc-900">
                  <MarkdownView content={rules} />
                </div>
              )}
            </>
          )}
        </Section>

        {/* ASK AGENT TO UPDATE */}
        <section className="border border-emerald-900/40 bg-emerald-950/10 rounded-lg p-5">
          <h2 className="text-base font-semibold mb-2">
            Ask the agent to update
          </h2>
          <p className="text-xs text-zinc-500 mb-3">
            Natural-language modifications. Examples:{" "}
            <span className="text-zinc-400">
              &quot;Change my target to ₹50L by 2028&quot;
            </span>
            ,{" "}
            <span className="text-zinc-400">
              &quot;Add bought 10 RELIANCE at ₹2,500&quot;
            </span>
            .
          </p>

          <div className="flex gap-2 mb-2">
            <select
              value={updateTarget}
              onChange={(e) =>
                setUpdateTarget(e.target.value as typeof updateTarget)
              }
              disabled={updateRunning}
              className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs"
            >
              <option value="user_plan">user_plan.md</option>
              <option value="holdings">holdings.json</option>
              <option value="rules">RULES.md</option>
            </select>
            <input
              type="text"
              value={updateInstruction}
              onChange={(e) => setUpdateInstruction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !updateRunning) onSendUpdate();
              }}
              placeholder="Type your change request…"
              disabled={updateRunning}
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-zinc-600"
            />
            <button
              onClick={onSendUpdate}
              disabled={updateRunning || !updateInstruction.trim()}
              className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 rounded font-semibold"
            >
              {updateRunning ? "Running…" : "Send to gitclaw"}
            </button>
          </div>

          {updateLog.length > 0 && (
            <div className="mt-3 border border-zinc-800 rounded p-3 bg-zinc-950 text-xs font-mono max-h-60 overflow-y-auto space-y-1">
              {updateLog.map((m, i) => (
                <UpdateEvent key={i} msg={m} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

// ─── Helper components ─────────────────────────────────────────────────

function Section({
  title,
  status,
  subtitle,
  missingMessage,
  missingAction,
  actions,
  children,
}: {
  title: string;
  status: "ok" | "missing";
  subtitle?: string;
  missingMessage?: string;
  missingAction?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="border border-zinc-800 rounded-lg p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">{title}</h2>
            {status === "missing" && (
              <span className="text-xs px-1.5 rounded bg-red-900/40 text-red-300">
                missing
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-zinc-500 mt-1 max-w-prose">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex gap-2 shrink-0">{actions}</div>}
      </div>

      {status === "missing" ? (
        <div className="text-sm text-zinc-500">
          {missingMessage}
          <div className="mt-2">{missingAction}</div>
        </div>
      ) : (
        children
      )}
    </section>
  );
}

function ParsedPlanGrid({ parsed }: { parsed: ParsedUserPlan }) {
  const fields: Array<{ label: string; value?: string }> = [
    { label: "Goal", value: parsed.goalType },
    { label: "Target", value: parsed.targetAmount ? `₹${parsed.targetAmount}` : undefined },
    { label: "By", value: parsed.targetDate },
    { label: "Horizon", value: parsed.timeHorizon },
    { label: "Portfolio Value", value: parsed.portfolioValue ? `₹${parsed.portfolioValue}` : undefined },
    { label: "Monthly Income", value: parsed.monthlyIncome ? `₹${parsed.monthlyIncome}` : undefined },
    { label: "Net Investable", value: parsed.netInvestable ? `₹${parsed.netInvestable}` : undefined },
    { label: "Risk Tolerance", value: parsed.riskTolerance },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {fields.map((f) => (
          <div key={f.label} className="border border-zinc-800 rounded p-2.5 bg-zinc-900/40">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">
              {f.label}
            </div>
            <div className="text-sm text-zinc-100 mt-0.5">
              {f.value ?? <span className="text-zinc-600">—</span>}
            </div>
          </div>
        ))}
      </div>

      {parsed.hardConstraints && parsed.hardConstraints.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">
            Hard Constraints
          </div>
          <div className="flex flex-wrap gap-1.5">
            {parsed.hardConstraints.map((c, i) => (
              <span
                key={i}
                className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HoldingsTable({ holdings }: { holdings: Holding[] }) {
  const totalCost = holdings.reduce((sum, h) => sum + h.qty * h.avg_price, 0);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wider text-zinc-500">
              <th className="py-2 pr-3 font-medium">Symbol</th>
              <th className="py-2 px-3 font-medium text-right">Qty</th>
              <th className="py-2 px-3 font-medium text-right">Avg Price</th>
              <th className="py-2 pl-3 font-medium text-right">Cost Basis</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((h, i) => (
              <tr key={`${h.symbol}-${i}`} className="border-b border-zinc-900">
                <td className="py-2 pr-3 font-medium">{h.symbol}</td>
                <td className="py-2 px-3 text-right text-zinc-300">{h.qty}</td>
                <td className="py-2 px-3 text-right text-zinc-300">
                  ₹{h.avg_price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </td>
                <td className="py-2 pl-3 text-right text-zinc-300">
                  ₹{(h.qty * h.avg_price).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="text-xs">
              <td className="pt-2 text-zinc-500">{holdings.length} positions</td>
              <td colSpan={2} className="pt-2 text-right text-zinc-500">
                Total cost basis
              </td>
              <td className="pt-2 pl-3 text-right text-zinc-100 font-semibold">
                ₹{totalCost.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function UpdateEvent({ msg }: { msg: StreamMsg }) {
  const t = msg.type;
  const text = stripAnsi(String((msg as { text?: string }).text ?? ""));
  if (t === "tool_use") return <div className="text-amber-400">{text}</div>;
  if (t === "session_start") return <div className="text-emerald-500">▶ session start</div>;
  if (t === "session_end") return <div className="text-emerald-500">✓ done</div>;
  if (t === "error" || t === "error_line")
    return (
      <div className="text-red-400">
        {"message" in msg
          ? String((msg as { message: string }).message)
          : text}
      </div>
    );
  if (t === "output" && text.trim()) return <div className="text-zinc-400">{text}</div>;
  return null;
}
