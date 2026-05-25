"use client";

import clsx from "clsx";
import { Check, CheckCircle2, Loader2, Sparkles, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import SiteHeader from "@/components/SiteHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  getProviderCatalog,
  getProviderStatus,
  humanizeError,
  saveCredentials,
  testProvider,
  type ProviderCatalog,
  type ProviderSpec,
  type ProviderStatus,
} from "@/lib/api";

type TestResult =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "success"; latency_ms: number; sample_text: string }
  | { kind: "failure"; message: string };

// Provider keys we surface in order; matches the spec the backend ships.
const PROVIDER_ORDER = [
  "amazon-bedrock",
  "anthropic",
  "openai",
  "azure-openai-responses",
] as const;

export default function CredentialsSetupPage() {
  const router = useRouter();

  const [catalog, setCatalog] = useState<ProviderCatalog | null>(null);
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [selected, setSelected] = useState<string>("amazon-bedrock");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [test, setTest] = useState<TestResult>({ kind: "idle" });
  const [saving, setSaving] = useState(false);

  // Load catalog + current status once.
  useEffect(() => {
    (async () => {
      try {
        const [cat, stat] = await Promise.all([
          getProviderCatalog(),
          getProviderStatus(),
        ]);
        setCatalog(cat);
        setStatus(stat);
        // Default selection: if a provider is already configured AND active, pick it;
        // otherwise pick Bedrock (the documented default).
        if (stat.active_provider && cat.providers[stat.active_provider]) {
          setSelected(stat.active_provider);
        }
      } catch (err) {
        toast.error("Couldn't load provider catalog", {
          description: humanizeError(err, "GET /api/setup/providers"),
        });
      }
    })();
  }, []);

  const currentSpec: ProviderSpec | undefined = catalog?.providers[selected];

  // Seed `fields` with defaults whenever the selected provider changes.
  useEffect(() => {
    if (!currentSpec) return;
    const next: Record<string, string> = {};
    for (const f of currentSpec.fields) {
      next[f.name] = f.default ?? "";
    }
    setFields(next);
    setTest({ kind: "idle" });
  }, [selected, currentSpec]);

  const allRequiredFilled = useMemo(() => {
    if (!currentSpec) return false;
    return currentSpec.fields.every(
      (f) => !f.required || (fields[f.name] ?? "").trim() !== "",
    );
  }, [currentSpec, fields]);

  const handleTest = useCallback(async () => {
    if (!currentSpec || !allRequiredFilled) return;
    setTest({ kind: "running" });
    try {
      const result = await testProvider(selected, fields);
      setTest({
        kind: "success",
        latency_ms: result.latency_ms,
        sample_text: result.sample_text,
      });
      toast.success("Provider responded", {
        description: `${result.latency_ms}ms · "${result.sample_text.slice(0, 60)}"`,
      });
    } catch (err) {
      const message = humanizeError(err, "Testing provider");
      setTest({ kind: "failure", message });
      toast.error("Test failed", { description: message });
    }
  }, [currentSpec, allRequiredFilled, selected, fields]);

  const handleSave = useCallback(async () => {
    if (!allRequiredFilled) return;
    setSaving(true);
    try {
      await saveCredentials(selected, fields, true);
      toast.success("Credentials saved", {
        description: "Heading to onboarding…",
      });
      // Tiny delay so the toast is visible before the route change.
      setTimeout(() => router.push("/onboarding"), 600);
    } catch (err) {
      toast.error("Save failed", {
        description: humanizeError(err, "POST /api/setup/credentials"),
      });
      setSaving(false);
    }
  }, [allRequiredFilled, selected, fields, router]);

  return (
    <div className="flex-1 brand-aura text-zinc-100 font-sans flex flex-col">
      <SiteHeader
        backHref="/"
        pageContext={
          <>
            <span className="text-sm text-zinc-400">First-run setup</span>
            <StatusBadge variant={status?.ready ? "success" : "info"}>
              {status?.ready ? "configured" : "needs setup"}
            </StatusBadge>
          </>
        }
      />

      <main className="flex-1 px-4 py-7">
        <div className="max-w-3xl mx-auto">
          <header className="mb-6">
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-400" />
              Connect a model
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              The 5 agents need an LLM behind them. Pick whichever provider you
              already have access to — Anthropic, OpenAI, AWS Bedrock, or
              Azure AI Foundry — paste the credentials, and we'll wire it
              through every agent.yaml in this repo.
            </p>
          </header>

          {!catalog && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-400">
              Loading provider catalog…
            </div>
          )}

          {catalog && (
            <div className="space-y-6">
              {/* Provider selector */}
              <fieldset className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
                <legend className="px-2 text-sm font-medium text-zinc-200">
                  Provider
                </legend>
                <div className="grid sm:grid-cols-2 gap-2 mt-2">
                  {PROVIDER_ORDER.filter((k) => catalog.providers[k]).map(
                    (key) => {
                      const spec = catalog.providers[key];
                      const isSelected = selected === key;
                      const isConfigured = status?.configured?.[key] ?? false;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSelected(key)}
                          className={clsx(
                            "text-left rounded-lg border px-4 py-3 transition",
                            isSelected
                              ? "border-teal-500/60 bg-teal-950/30"
                              : "border-zinc-800 bg-zinc-950/40 hover:border-zinc-600",
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-medium text-sm">
                              {spec.label}
                            </span>
                            {isConfigured && (
                              <span title="Already configured">
                                <Check className="w-4 h-4 text-emerald-400" />
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500 mt-1 leading-snug">
                            {spec.description}
                          </p>
                        </button>
                      );
                    },
                  )}
                </div>
              </fieldset>

              {/* Field inputs */}
              {currentSpec && (
                <fieldset className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
                  <legend className="px-2 text-sm font-medium text-zinc-200">
                    Credentials
                  </legend>
                  {currentSpec.fields.map((field) => (
                    <div key={field.name} className="space-y-1.5">
                      <label
                        htmlFor={field.name}
                        className="block text-xs font-medium text-zinc-300"
                      >
                        {field.label}
                        {field.required && (
                          <span className="text-red-400 ml-0.5">*</span>
                        )}
                      </label>
                      <input
                        id={field.name}
                        type={field.type}
                        value={fields[field.name] ?? ""}
                        onChange={(e) =>
                          setFields((prev) => ({
                            ...prev,
                            [field.name]: e.target.value,
                          }))
                        }
                        placeholder={field.default ?? ""}
                        autoComplete="off"
                        spellCheck={false}
                        className={clsx(
                          "w-full rounded-lg px-3 py-2 text-sm font-mono",
                          "bg-zinc-950 border border-zinc-800",
                          "focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-zinc-700",
                          "text-zinc-100 placeholder:text-zinc-600",
                        )}
                      />
                      {field.help && (
                        <p className="text-[11px] text-zinc-500 leading-relaxed">
                          {field.help}
                        </p>
                      )}
                    </div>
                  ))}
                </fieldset>
              )}

              {/* Test result */}
              {test.kind !== "idle" && (
                <div
                  className={clsx(
                    "rounded-xl border px-4 py-3 text-sm",
                    test.kind === "running" &&
                      "border-teal-700/50 bg-teal-950/20 text-teal-200",
                    test.kind === "success" &&
                      "border-emerald-700/50 bg-emerald-950/20 text-emerald-200",
                    test.kind === "failure" &&
                      "border-red-700/50 bg-red-950/20 text-red-200",
                  )}
                >
                  {test.kind === "running" && (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>
                        Calling the provider with a 1-token prompt… can take
                        up to 25 seconds on Bedrock cold start.
                      </span>
                    </div>
                  )}
                  {test.kind === "success" && (
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium">
                          Connection works ({test.latency_ms} ms)
                        </p>
                        <p className="text-xs text-emerald-300/80 mt-0.5 font-mono">
                          Reply: {test.sample_text || "(empty)"}
                        </p>
                      </div>
                    </div>
                  )}
                  {test.kind === "failure" && (
                    <div className="flex items-start gap-2">
                      <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium">Provider rejected the call</p>
                        <p className="text-xs text-red-300/80 mt-0.5">
                          {test.message}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={!allRequiredFilled || test.kind === "running"}
                  onClick={handleTest}
                  className={clsx(
                    "rounded-lg px-4 py-2 text-sm font-medium transition",
                    "border border-zinc-700 text-zinc-200 hover:border-zinc-500",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                  )}
                >
                  {test.kind === "running" ? "Testing…" : "Test connection"}
                </button>
                <button
                  type="button"
                  disabled={!allRequiredFilled || saving}
                  onClick={handleSave}
                  className={clsx(
                    "rounded-lg px-4 py-2 text-sm font-medium transition",
                    "bg-teal-600 text-white hover:bg-teal-500",
                    "disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed",
                  )}
                >
                  {saving ? "Saving…" : "Save & continue to onboarding"}
                </button>
                <p className="text-[11px] text-zinc-600 ml-1">
                  Credentials are stored in <code>.env</code> on this machine
                  only. Nothing leaves your laptop.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
