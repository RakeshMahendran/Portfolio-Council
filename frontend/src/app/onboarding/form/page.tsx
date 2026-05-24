"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  MessageSquare,
  Minus,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import SiteHeader from "@/components/SiteHeader";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  humanizeError,
  onboardFromForm,
  type OnboardFormPayload,
} from "@/lib/api";

const GOAL_TYPES = [
  "House down payment",
  "Retirement corpus",
  "Child's education",
  "Emergency fund",
  "Wealth accumulation",
  "Wedding fund",
  "Business capital",
];

const CONSTRAINT_OPTIONS = [
  "No cryptocurrency",
  "No forex trading",
  "No F&O (futures & options)",
  "No penny stocks",
  "No illiquid small-cap stocks",
  "No tobacco/alcohol companies",
  "No leveraged products",
  "Max 15% in any single stock",
];

type Outflow = { id: string; label: string; amount: number };

export default function OnboardingFormPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [goalType, setGoalType] = useState(GOAL_TYPES[0]);
  const [targetAmount, setTargetAmount] = useState<string>("4000000");
  const [targetDate, setTargetDate] = useState<string>("May 2027");
  const [stocksValue, setStocksValue] = useState<string>("500000");
  const [cashValue, setCashValue] = useState<string>("200000");
  const [otherValue, setOtherValue] = useState<string>("100000");
  const [monthlyIncome, setMonthlyIncome] = useState<string>("200000");
  const [outflows, setOutflows] = useState<Outflow[]>([
    { id: "1", label: "Rent", amount: 25000 },
    { id: "2", label: "Groceries & household", amount: 15000 },
    { id: "3", label: "Utilities", amount: 8000 },
  ]);
  const [riskTolerance, setRiskTolerance] = useState<"low" | "medium" | "high">(
    "medium",
  );
  const [selectedConstraints, setSelectedConstraints] = useState<Set<string>>(
    new Set(["No cryptocurrency", "No F&O (futures & options)", "No penny stocks"]),
  );

  // Derived values
  const portfolioValue =
    (Number(stocksValue) || 0) +
    (Number(cashValue) || 0) +
    (Number(otherValue) || 0);
  const totalOutflows = outflows.reduce((s, o) => s + (o.amount || 0), 0);
  const netInvestable = Math.max(0, (Number(monthlyIncome) || 0) - totalOutflows);

  const fmtInr = (n: number) => {
    if (!n || isNaN(n)) return "—";
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
    return `₹${n.toLocaleString("en-IN")}`;
  };

  const addOutflow = () =>
    setOutflows((prev) => [
      ...prev,
      { id: String(Date.now()), label: "", amount: 0 },
    ]);

  const updateOutflow = (id: string, patch: Partial<Outflow>) =>
    setOutflows((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    );

  const removeOutflow = (id: string) =>
    setOutflows((prev) => prev.filter((o) => o.id !== id));

  const toggleConstraint = (c: string) =>
    setSelectedConstraints((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });

  const validate = (): string | null => {
    if (!goalType) return "Pick your primary financial goal.";
    if (!Number(targetAmount) || Number(targetAmount) < 10000)
      return "Target amount looks too small. Enter your goal in INR (e.g., 4000000 for ₹40 lakh).";
    if (!targetDate.trim()) return "Add a target date.";
    if (portfolioValue < 0)
      return "Portfolio values can't be negative.";
    if (!Number(monthlyIncome))
      return "Monthly income is required so we can compute net investable.";
    if (selectedConstraints.size === 0)
      return "Pick at least one hard constraint (the Risk Officer needs something to enforce).";
    return null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setSubmitting(true);
    const tid = toast.loading("Saving plan & generating rules…");
    try {
      const payload: OnboardFormPayload = {
        goal_type: goalType,
        target_amount: Number(targetAmount),
        target_date: targetDate,
        portfolio_value: portfolioValue,
        stocks_value: Number(stocksValue) || 0,
        cash_value: Number(cashValue) || 0,
        other_value: Number(otherValue) || 0,
        monthly_income: Number(monthlyIncome),
        monthly_outflows: outflows
          .filter((o) => o.label.trim() && o.amount > 0)
          .map((o) => ({ label: o.label, amount: o.amount })),
        risk_tolerance: riskTolerance,
        hard_constraints: Array.from(selectedConstraints),
      };
      const result = await onboardFromForm(payload);
      toast.success("Setup complete!", {
        id: tid,
        description: `Net investable: ${fmtInr(result.net_investable)}/mo. Upload holdings next.`,
      });
      setTimeout(() => router.push("/profile"), 600);
    } catch (e) {
      toast.error(humanizeError(e, "Setup"), { id: tid });
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteHeader
        backHref="/"
        pageContext={
          <>
            <span className="text-sm text-zinc-400">Setup</span>
            <StatusBadge variant="info">onboarding</StatusBadge>
          </>
        }
      />

      <form onSubmit={onSubmit} className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {/* Intro */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">
              Welcome
            </span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Tell us about your goals
          </h1>
          <p className="text-zinc-400 text-sm mt-2 max-w-prose leading-relaxed">
            This builds the rulebook the agent team enforces on every session.
            Takes 2 minutes. Prefer a conversation?{" "}
            <Link
              href="/onboarding/chat"
              className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 inline-flex items-center gap-1"
            >
              Use the chatbot version
              <MessageSquare className="w-3 h-3" />
            </Link>
            .
          </p>
        </div>

        {/* ─── GOAL ─── */}
        <FormSection icon={Target} title="Your goal" description="What you're saving for and by when.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Goal type">
              <select
                value={goalType}
                onChange={(e) => setGoalType(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-zinc-600"
              >
                {GOAL_TYPES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Target date">
              <input
                type="text"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                placeholder="e.g. May 2027"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-zinc-600"
              />
            </Field>
            <Field label="Target amount (₹)" hint={`= ${fmtInr(Number(targetAmount))}`}>
              <InrInput value={targetAmount} onChange={setTargetAmount} />
            </Field>
          </div>
        </FormSection>

        {/* ─── FINANCIAL POSITION ─── */}
        <FormSection
          icon={Wallet}
          title="Current financial position"
          description="Your portfolio is the sum of stocks + cash + other (FDs, gold, etc.)."
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Stocks (₹)">
              <InrInput value={stocksValue} onChange={setStocksValue} />
            </Field>
            <Field label="Cash (₹)">
              <InrInput value={cashValue} onChange={setCashValue} />
            </Field>
            <Field label="Other / FDs / gold (₹)">
              <InrInput value={otherValue} onChange={setOtherValue} />
            </Field>
          </div>
          <div className="mt-3 px-3 py-2 rounded-md bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-400 flex justify-between">
            <span>Total portfolio value</span>
            <span className="text-zinc-100 font-semibold tabular-nums">
              {fmtInr(portfolioValue)}
            </span>
          </div>
        </FormSection>

        {/* ─── INCOME & OUTFLOWS ─── */}
        <FormSection
          icon={TrendingUp}
          title="Monthly cash flow"
          description="We compute your net investable so the agents only suggest what's actually affordable."
        >
          <Field label="Monthly take-home income (₹)">
            <InrInput value={monthlyIncome} onChange={setMonthlyIncome} />
          </Field>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs uppercase tracking-wider text-zinc-500">
                Fixed monthly outflows
              </label>
              <button
                type="button"
                onClick={addOutflow}
                className="text-xs text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add row
              </button>
            </div>
            <div className="space-y-2">
              {outflows.map((o) => (
                <div key={o.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={o.label}
                    onChange={(e) =>
                      updateOutflow(o.id, { label: e.target.value })
                    }
                    placeholder="e.g. Rent, EMI, SIPs"
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-zinc-600"
                  />
                  <input
                    type="number"
                    value={o.amount || ""}
                    onChange={(e) =>
                      updateOutflow(o.id, {
                        amount: Number(e.target.value) || 0,
                      })
                    }
                    placeholder="0"
                    className="w-32 bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-zinc-600 tabular-nums text-right"
                  />
                  <button
                    type="button"
                    onClick={() => removeOutflow(o.id)}
                    className="text-zinc-500 hover:text-red-400 p-1.5"
                    aria-label="Remove row"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="px-3 py-2 rounded-md bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-400 flex justify-between">
              <span>Total outflows</span>
              <span className="text-zinc-100 font-semibold tabular-nums">
                {fmtInr(totalOutflows)}
              </span>
            </div>
            <div className="px-3 py-2 rounded-md bg-emerald-950/30 border border-emerald-900/50 text-xs text-emerald-300 flex justify-between">
              <span>Net investable / month</span>
              <span className="font-semibold tabular-nums">
                {fmtInr(netInvestable)}
              </span>
            </div>
          </div>
        </FormSection>

        {/* ─── RISK + CONSTRAINTS ─── */}
        <FormSection
          icon={Sparkles}
          title="Risk profile & constraints"
          description="The Risk Officer enforces these as hard rules. Veto any proposal that breaks one."
        >
          <Field label="Risk tolerance">
            <div className="grid grid-cols-3 gap-2">
              {(["low", "medium", "high"] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setRiskTolerance(level)}
                  className={`px-4 py-2.5 rounded-md border text-sm font-medium transition ${
                    riskTolerance === level
                      ? level === "low"
                        ? "border-emerald-700/60 bg-emerald-950/40 text-emerald-300"
                        : level === "medium"
                          ? "border-amber-700/60 bg-amber-950/40 text-amber-300"
                          : "border-red-700/60 bg-red-950/40 text-red-300"
                      : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <div className="capitalize">{level}</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">
                    {level === "low"
                      ? "max -10% drawdown OK"
                      : level === "medium"
                        ? "max -20% OK"
                        : ">-20% OK"}
                  </div>
                </button>
              ))}
            </div>
          </Field>

          <div className="mt-4">
            <label className="text-xs uppercase tracking-wider text-zinc-500 mb-2 block">
              Hard constraints (Risk Officer will veto violations)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CONSTRAINT_OPTIONS.map((c) => {
                const selected = selectedConstraints.has(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleConstraint(c)}
                    className={`text-left px-3 py-2.5 rounded-md border text-sm transition flex items-center justify-between gap-2 ${
                      selected
                        ? "border-red-800/60 bg-red-950/30 text-red-200"
                        : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    <span>{c}</span>
                    {selected && <Check className="w-4 h-4 text-red-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </FormSection>

        {/* ─── SUBMIT ─── */}
        <div className="flex items-center justify-between gap-4 pt-4 border-t border-zinc-800/60">
          <div className="text-xs text-zinc-500 max-w-md leading-relaxed">
            Submitting writes <code className="text-zinc-400">memory/user_plan.md</code>{" "}
            and <code className="text-zinc-400">RULES.md</code> in your local repo.
            Holdings come next (you can upload or use demo data).
          </div>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={submitting}
            disabled={submitting}
          >
            {!submitting && <ArrowRight className="w-4 h-4" />}
            {submitting ? "Saving" : "Save & continue"}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────

function FormSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-zinc-800 rounded-lg bg-zinc-900/20 overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800/60 flex items-start gap-3">
        <div className="w-8 h-8 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
          <Icon className="w-4 h-4 text-zinc-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {description && (
            <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-xs uppercase tracking-wider text-zinc-500">
          {label}
        </label>
        {hint && <span className="text-[10px] text-zinc-500">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function InrInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">
        ₹
      </span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="w-full bg-zinc-900 border border-zinc-800 rounded-md pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:border-zinc-600 tabular-nums"
      />
    </div>
  );
}
