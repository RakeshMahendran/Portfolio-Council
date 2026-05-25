"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Send,
  ScrollText,
  Shield,
  Sparkles,
  Target,
  Trash2,
  Upload,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import MarkdownView from "@/components/MarkdownView";
import SiteHeader from "@/components/SiteHeader";
import { Button } from "@/components/ui/Button";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  HOLDINGS_EXAMPLE_URL,
  deleteHoldings,
  deleteUserPlan,
  getDataFiles,
  getHoldings,
  getRules,
  getUserPlan,
  humanizeError,
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

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refreshAll = useCallback(async () => {
    try {
      const f = await getDataFiles();
      setFiles(f);
      if (f.user_plan) setPlan(await getUserPlan()); else setPlan(null);
      if (f.rules) setRules((await getRules()).raw); else setRules(null);
      if (f.holdings) setHoldings((await getHoldings()).holdings); else setHoldings(null);
    } catch (e) {
      toast.error(humanizeError(e, "Refresh"));
    } finally {
      setLoading(false);
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
      toast.success("Plan saved");
    } catch (e) {
      toast.error(humanizeError(e, "Save"));
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
      toast.success("Plan deleted. Re-onboard from the home page.");
    } catch (e) {
      toast.error(humanizeError(e, "Delete"));
    }
  };

  const onDeleteHoldings = async () => {
    if (!window.confirm("Delete data/holdings.json? You will need to upload again."))
      return;
    try {
      await deleteHoldings();
      await refreshAll();
      toast.success("Holdings deleted");
    } catch (e) {
      toast.error(humanizeError(e, "Delete"));
    }
  };

  const onUploadClick = () => fileInputRef.current?.click();

  const onFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const f = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file
    if (!f) return;
    setUploading(true);
    const tid = toast.loading(`Parsing ${f.name}…`, {
      description: "Trying fast path, falling back to AI if needed.",
    });
    try {
      const result = await uploadHoldings(f);
      await refreshAll();
      const via =
        result.mapped_via && result.mapped_via.includes("LLM")
          ? "AI column inference"
          : "deterministic parser";
      toast.success(`Imported ${result.count} positions`, {
        id: tid,
        description: `Mapped via ${via}.`,
      });
    } catch (e) {
      toast.error(humanizeError(e, "Upload"), { id: tid });
    } finally {
      setUploading(false);
    }
  };

  const onSendUpdate = async () => {
    const text = updateInstruction.trim();
    if (!text || updateRunning) return;
    setUpdateRunning(true);
    setUpdateLog([]);
    const tid = toast.loading("Agent is updating your file…");
    try {
      for await (const msg of streamUpdateViaChat(updateTarget, text)) {
        setUpdateLog((prev) => [...prev, msg]);
      }
      await refreshAll();
      setUpdateInstruction("");
      toast.success("File updated", { id: tid });
    } catch (e) {
      toast.error(humanizeError(e, "Update"), { id: tid });
    } finally {
      setUpdateRunning(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex-1 brand-aura text-zinc-100">
        <SiteHeader backHref="/" />
        <main className="max-w-7xl mx-auto px-6 py-7 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24" />
          <Skeleton className="h-48" />
          <Skeleton className="h-32" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 brand-aura text-zinc-100">
      <SiteHeader backHref="/" />

      <main className="max-w-7xl mx-auto px-6 py-7 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">
              Profile
            </span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Your data</h1>
          <p className="text-zinc-500 text-sm mt-1.5 max-w-prose">
            Goals, holdings, and governance — your local repo&apos;s source of
            truth. Stored at{" "}
            <code className="text-zinc-400 text-xs">memory/user_plan.md</code>,{" "}
            <code className="text-zinc-400 text-xs">data/holdings.json</code>,
            and <code className="text-zinc-400 text-xs">RULES.md</code> in your
            cloned repo.
          </p>
        </div>

        {/* PLAN SECTION */}
        <Section
          title="Plan"
          icon={Target}
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
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onEditPlanClick}
                  disabled={editingPlan}
                >
                  <FileText className="w-3 h-3" />
                  Edit raw
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={onDeletePlan}
                >
                  <Trash2 className="w-3 h-3" />
                  Re-onboard
                </Button>
              </>
            )
          }
        >
          {plan && !editingPlan && (
            <div className="space-y-3">
              <ParsedPlanGrid parsed={plan.parsed} />

              <button
                onClick={() => setPlanRawVisible((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                {planRawVisible ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
                <FileText className="w-3.5 h-3.5" />
                {planRawVisible ? "Hide" : "View"} raw markdown
                <span className="text-zinc-600">· {plan.raw.length} chars</span>
              </button>
              {planRawVisible && (
                <div className="border border-zinc-800 rounded-lg p-5 bg-zinc-950/50">
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
          icon={Wallet}
          status={files?.holdings ? "ok" : "missing"}
          subtitle={
            <>
              Accepts <code className="text-zinc-400">.csv</code>,{" "}
              <code className="text-zinc-400">.xlsx</code>, or{" "}
              <code className="text-zinc-400">.json</code>. Required columns:{" "}
              <code className="text-zinc-400">symbol</code>,{" "}
              <code className="text-zinc-400">qty</code>,{" "}
              <code className="text-zinc-400">avg_price</code>{" "}
              (flexible naming — &quot;ticker&quot;, &quot;quantity&quot;,
              &quot;avg price&quot; also work).{" "}
              <a
                href={HOLDINGS_EXAMPLE_URL}
                download
                className="text-emerald-400 hover:text-emerald-300 underline"
              >
                Download example CSV ↓
              </a>
            </>
          }
          missingMessage="No holdings uploaded. The agents need this to run a review."
          missingAction={
            <div className="flex flex-wrap gap-3 items-center">
              <Button
                variant="primary"
                onClick={onUploadClick}
                loading={uploading}
              >
                <Upload className="w-3.5 h-3.5" />
                Upload file
              </Button>
              <a
                href={HOLDINGS_EXAMPLE_URL}
                download
                className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 text-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Download template
              </a>
            </div>
          }
          actions={
            holdings && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onUploadClick}
                  loading={uploading}
                >
                  <RefreshCw className="w-3 h-3" />
                  Replace
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={onDeleteHoldings}
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </Button>
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
          icon={Shield}
          status={files?.rules ? "ok" : "missing"}
          missingMessage="No rules — these are auto-generated from your plan. Run onboarding."
          subtitle="Generated from your plan by the Onboarding agent. Modify the plan above to regenerate rules. Risk Officer enforces these on every session."
        >
          {rules && (
            <div>
              <button
                onClick={() => setRulesRawVisible((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 transition-colors mb-3"
              >
                {rulesRawVisible ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
                <ScrollText className="w-3.5 h-3.5" />
                {rulesRawVisible ? "Hide" : "View"} full ruleset
                <span className="text-zinc-600">· {rules.length} chars</span>
              </button>
              {rulesRawVisible && (
                <div className="border border-zinc-800 rounded-lg p-5 bg-zinc-950/50">
                  <MarkdownView content={rules} />
                </div>
              )}
            </div>
          )}
        </Section>

        {/* ASK AGENT TO UPDATE */}
        <section className="border border-emerald-900/40 bg-gradient-to-br from-emerald-950/20 to-zinc-950 rounded-lg p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-emerald-900/40 border border-emerald-800/60 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-emerald-300" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold">
                Ask the agent to update
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Natural language → agent modifies the right file. Try:{" "}
                <span className="text-zinc-400">
                  &quot;Change my target to ₹50L by 2028&quot;
                </span>
                {" or "}
                <span className="text-zinc-400">
                  &quot;Bought 10 RELIANCE at ₹2,500&quot;
                </span>
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <select
              value={updateTarget}
              onChange={(e) =>
                setUpdateTarget(e.target.value as typeof updateTarget)
              }
              disabled={updateRunning}
              className="bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-2 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600 disabled:opacity-50"
            >
              <option value="user_plan">user_plan</option>
              <option value="holdings">holdings</option>
              <option value="rules">RULES</option>
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
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-zinc-600 disabled:opacity-50"
            />
            <Button
              variant="primary"
              onClick={onSendUpdate}
              disabled={!updateInstruction.trim()}
              loading={updateRunning}
            >
              {!updateRunning && <Send className="w-3.5 h-3.5" />}
              {updateRunning ? "Working" : "Send"}
            </Button>
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
  icon: Icon,
  status,
  subtitle,
  missingMessage,
  missingAction,
  actions,
  children,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  status: "ok" | "missing";
  subtitle?: React.ReactNode;
  missingMessage?: string;
  missingAction?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="border border-zinc-800 rounded-lg bg-zinc-900/20 overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800/60 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 flex items-start gap-3">
          {Icon && (
            <div className="w-8 h-8 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
              <Icon className="w-4 h-4 text-zinc-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">{title}</h2>
              {status === "missing" && (
                <StatusBadge variant="warning">missing</StatusBadge>
              )}
              {status === "ok" && (
                <StatusBadge variant="success">ready</StatusBadge>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-zinc-500 mt-1.5 max-w-prose leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex gap-2 shrink-0 self-start pt-0.5">{actions}</div>
        )}
      </div>

      <div className="p-5">
        {status === "missing" ? (
          <div className="text-sm text-zinc-500">
            {missingMessage}
            <div className="mt-3">{missingAction}</div>
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

function ParsedPlanGrid({ parsed }: { parsed: ParsedUserPlan }) {
  // Format INR values into Indian numbering (lakhs/crores)
  const fmtInr = (s?: string) => {
    if (!s) return undefined;
    const n = Number(s.replace(/[,₹\s]/g, ""));
    if (isNaN(n)) return s;
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
    return `₹${n.toLocaleString("en-IN")}`;
  };

  return (
    <div className="space-y-5">
      {/* HERO: Goal */}
      <div className="border border-emerald-900/40 bg-gradient-to-br from-emerald-950/20 to-zinc-950 rounded-lg p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-emerald-400/80 mb-1.5">
              Primary goal
            </div>
            <div className="text-2xl font-semibold tracking-tight">
              {parsed.goalType ?? "—"}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-emerald-300 tabular-nums">
              {fmtInr(parsed.targetAmount) ?? "—"}
            </div>
            <div className="text-xs text-zinc-400 mt-0.5">
              by {parsed.targetDate ?? "—"}
              {parsed.timeHorizon && (
                <span className="text-zinc-500"> · {parsed.timeHorizon}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* STATS GRID */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
          Financial position
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatTile label="Current portfolio" value={fmtInr(parsed.portfolioValue)} />
          <StatTile label="Monthly income" value={fmtInr(parsed.monthlyIncome)} />
          <StatTile
            label="Net investable / mo"
            value={fmtInr(parsed.netInvestable)}
            emphasis
          />
        </div>
      </div>

      {/* RISK */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-900/40">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">
            Risk tolerance
          </div>
          <div className="text-base font-medium">
            <RiskBadge level={parsed.riskTolerance} />
          </div>
        </div>
        <div className="md:col-span-2 border border-zinc-800 rounded-lg p-4 bg-zinc-900/40">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
            Hard constraints
          </div>
          {parsed.hardConstraints && parsed.hardConstraints.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {parsed.hardConstraints.map((c, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-red-950/40 border border-red-900/50 text-red-300/90"
                >
                  <X className="w-3 h-3" />
                  {c.replace(/^no /i, "")}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-xs text-zinc-600 italic">None specified</span>
          )}
        </div>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  emphasis,
}: {
  label: string;
  value?: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`border rounded-lg p-4 ${
        emphasis
          ? "border-emerald-800/60 bg-emerald-950/20"
          : "border-zinc-800 bg-zinc-900/40"
      }`}
    >
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">
        {label}
      </div>
      <div
        className={`text-xl font-semibold tabular-nums ${
          emphasis ? "text-emerald-300" : "text-zinc-100"
        }`}
      >
        {value ?? <span className="text-zinc-600">—</span>}
      </div>
    </div>
  );
}

function RiskBadge({ level }: { level?: string }) {
  const norm = level?.toLowerCase();
  const config =
    norm === "high"
      ? { color: "text-red-300 bg-red-950/40 border-red-900/50", label: "High" }
      : norm === "medium" || norm === "moderate"
        ? { color: "text-amber-300 bg-amber-950/40 border-amber-900/50", label: "Medium" }
        : norm === "low"
          ? { color: "text-emerald-300 bg-emerald-950/40 border-emerald-900/50", label: "Low" }
          : { color: "text-zinc-400 bg-zinc-800 border-zinc-700", label: level ?? "—" };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-sm ${config.color}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
}

function HoldingsTable({ holdings }: { holdings: Holding[] }) {
  const totalCost = holdings.reduce((sum, h) => sum + h.qty * h.avg_price, 0);

  // Indian INR formatting — always 2 decimal places, Indian comma grouping
  const fmtInr = (n: number) =>
    n.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-900/60 text-left text-[10px] uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
              <th className="py-3 px-4 font-medium">Symbol</th>
              <th className="py-3 px-4 font-medium text-right tabular-nums">Qty</th>
              <th className="py-3 px-4 font-medium text-right tabular-nums">
                Avg Price
              </th>
              <th className="py-3 px-4 font-medium text-right tabular-nums">
                Cost Basis
              </th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((h, i) => (
              <tr
                key={`${h.symbol}-${i}`}
                className="border-b border-zinc-900/60 hover:bg-zinc-900/40 transition-colors last:border-b-0"
              >
                <td className="py-3 px-4 font-medium text-zinc-100">
                  {h.symbol}
                </td>
                <td className="py-3 px-4 text-right text-zinc-300 tabular-nums">
                  {h.qty.toLocaleString("en-IN")}
                </td>
                <td className="py-3 px-4 text-right text-zinc-300 tabular-nums">
                  ₹{fmtInr(h.avg_price)}
                </td>
                <td className="py-3 px-4 text-right text-zinc-100 tabular-nums font-medium">
                  ₹{fmtInr(h.qty * h.avg_price)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-zinc-900/60 border-t border-zinc-800">
              <td className="py-3 px-4 text-xs text-zinc-500">
                {holdings.length} {holdings.length === 1 ? "position" : "positions"}
              </td>
              <td colSpan={2} className="py-3 px-4 text-right text-xs text-zinc-500">
                Total cost basis
              </td>
              <td className="py-3 px-4 text-right text-zinc-100 font-semibold tabular-nums">
                ₹{fmtInr(totalCost)}
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
