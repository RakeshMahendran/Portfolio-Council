"use client";

import clsx from "clsx";
import {
  Calculator,
  CheckCircle2,
  Download,
  HelpCircle,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { humanizeError, uploadHoldings } from "@/lib/api";

import BrokerExportGuide from "./BrokerExportGuide";

export type AttachmentMode = "expense" | "holdings";

export type AttachmentCardProps = {
  mode: AttachmentMode;
  disabled?: boolean;
  /** Send a chat reply on the user's behalf (e.g. after upload completes). */
  onSendMessage: (text: string) => void;
};

/**
 * Detect whether the agent's latest question is asking about expenses or
 * holdings, so the right attachment card can be shown.
 *
 * We scope detection to the trailing run of `?`-ending sentences only —
 * otherwise a confirmation like "Got it, your holdings are saved. What's
 * your goal?" would falsely trigger the holdings card because the prose
 * mentions holdings in passing.
 */
export function detectAttachmentMode(agentText: string): AttachmentMode | null {
  const trimmed = agentText.trim();
  if (!trimmed.includes("?")) return null;
  const sentences = trimmed.split(/(?<=[.!?])\s+/);
  const collected: string[] = [];
  for (let i = sentences.length - 1; i >= 0; i--) {
    if (sentences[i].trimEnd().endsWith("?")) collected.unshift(sentences[i]);
    else break;
  }
  if (collected.length === 0) return null;
  const t = collected.join(" ").toLowerCase();
  const isExpenseAsk =
    /\bmonthly\s+(outflow|outflows|expense|expenses|spend|spending)\b/.test(
      t,
    ) ||
    /\bexpense\s+sheet\b/.test(t) ||
    (/\bfixed\b/.test(t) && /\bemi\b/.test(t)) ||
    /\bschool\s+fees\b/.test(t);
  if (isExpenseAsk) return "expense";

  const isHoldingsAsk =
    /\bcurrent\s+holdings?\b/.test(t) ||
    /\byour\s+holdings?\b/.test(t) ||
    /\bequity\s+holdings?\b/.test(t) ||
    /\bholdings\s+list\b/.test(t) ||
    (/\bupload\b/.test(t) && /\bholdings?\b/.test(t));
  if (isHoldingsAsk) return "holdings";

  return null;
}

export function AttachmentCard({
  mode,
  disabled,
  onSendMessage,
}: AttachmentCardProps) {
  if (mode === "expense") {
    return (
      <ExpenseCard disabled={disabled} onSendMessage={onSendMessage} />
    );
  }
  return <HoldingsCard disabled={disabled} onSendMessage={onSendMessage} />;
}

// ─── Expense card ──────────────────────────────────────────────────────────

function ExpenseCard({
  disabled,
  onSendMessage,
}: {
  disabled?: boolean;
  onSendMessage: (text: string) => void;
}) {
  return (
    <Card title="Share your monthly expenses">
      <p className="text-xs text-zinc-400 mb-3">
        Pick whichever feels easiest. You can change this later.
      </p>
      <div className="flex flex-wrap gap-2">
        <a
          href="/expense-template.csv"
          download="portfolio-council-expense-template.csv"
          className={clsx(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition",
            "bg-teal-600 text-white hover:bg-teal-500",
            disabled && "opacity-50 pointer-events-none",
          )}
        >
          <Download className="w-3.5 h-3.5" />
          Download template
        </a>
        <ActionButton
          icon={<Calculator className="w-3.5 h-3.5" />}
          label="Give an approximate total"
          disabled={disabled}
          onClick={() =>
            onSendMessage(
              "I'd rather give an approximate monthly total instead of itemising. I'll type the number next.",
            )
          }
        />
        <ActionButton
          label="I'll upload later"
          disabled={disabled}
          onClick={() =>
            onSendMessage(
              "I'll upload my expense sheet via the dashboard later. Please mark it as pending.",
            )
          }
        />
      </div>
      <p className="text-[11px] text-zinc-500 mt-3">
        Template has 16 common categories. Fill the ones that apply, leave the
        rest blank, and upload it from the Profile page once you're done.
      </p>
    </Card>
  );
}

// ─── Holdings card ─────────────────────────────────────────────────────────

function HoldingsCard({
  disabled,
  onSendMessage,
}: {
  disabled?: boolean;
  onSendMessage: (text: string) => void;
}) {
  const [guideOpen, setGuideOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedSummary, setUploadedSummary] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const result = await uploadHoldings(file);
      const count = result.holdings?.length ?? 0;
      const summary = `Uploaded ${file.name} — ${count} ${count === 1 ? "position" : "positions"} imported.`;
      setUploadedSummary(summary);
      toast.success("Holdings uploaded", {
        description: `${count} ${count === 1 ? "position" : "positions"} imported.`,
      });
      onSendMessage(
        `I just uploaded my holdings file (${file.name}) — ${count} ${count === 1 ? "position" : "positions"} parsed. You can read data/holdings.json for the details.`,
      );
    } catch (err) {
      toast.error("Upload failed", {
        description: humanizeError(err, "Uploading holdings"),
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Card title="Share your holdings">
        <p className="text-xs text-zinc-400 mb-3">
          Upload a CSV / Excel file exported from your broker, or skip and add
          them later.
        </p>

        {uploadedSummary ? (
          <div className="flex items-start gap-2 p-2.5 rounded-lg border border-emerald-800/60 bg-emerald-950/30 text-xs text-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{uploadedSummary}</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
                e.target.value = ""; // reset so picking the same file twice fires onChange
              }}
            />
            <ActionButton
              icon={
                uploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )
              }
              label={uploading ? "Uploading…" : "Upload CSV / Excel"}
              primary
              disabled={disabled || uploading}
              onClick={() => fileRef.current?.click()}
            />
            <ActionButton
              icon={<HelpCircle className="w-3.5 h-3.5" />}
              label="How do I export from my broker?"
              disabled={disabled}
              onClick={() => setGuideOpen(true)}
            />
            <ActionButton
              label="I'll upload later"
              disabled={disabled || uploading}
              onClick={() =>
                onSendMessage(
                  "I'll upload my holdings via the dashboard later. Please mark holdings as pending and continue.",
                )
              }
            />
          </div>
        )}
      </Card>

      <BrokerExportGuide
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
      />
    </>
  );
}

// ─── Shared layout primitives ──────────────────────────────────────────────

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [closed, setClosed] = useState(false);
  if (closed) return null;
  return (
    <div className="mt-3 mb-2 rounded-xl border border-zinc-700/70 bg-zinc-900/60 p-3.5">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-zinc-100">{title}</h4>
        <button
          type="button"
          onClick={() => setClosed(true)}
          className="text-zinc-600 hover:text-zinc-300"
          aria-label="Dismiss card"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {children}
    </div>
  );
}

function ActionButton({
  label,
  icon,
  primary,
  disabled,
  onClick,
}: {
  label: string;
  icon?: React.ReactNode;
  primary?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-50",
        primary
          ? "bg-emerald-600 text-white hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500"
          : "border border-zinc-700 bg-zinc-900/40 text-zinc-300 hover:border-zinc-500",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

export default AttachmentCard;
