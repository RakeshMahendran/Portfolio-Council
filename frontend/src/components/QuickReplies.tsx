// Quick-reply buttons that appear under an agent message when its question
// matches a known pattern. The user can click an option OR type a custom answer.

"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";

export type QuickReplyOption = {
  /** What gets displayed on the button. */
  label: string;
  /** What gets sent as the user's reply (defaults to label). */
  value?: string;
};

/**
 * Detect what kind of question the agent just asked, return matching options.
 * Returns null if no pattern matches — UI falls back to plain text input.
 */
export function detectQuickReplies(
  agentText: string,
): { kind: string; options: QuickReplyOption[]; multiple: boolean } | null {
  const t = agentText.toLowerCase();

  // Risk tolerance
  if (
    (t.includes("risk tolerance") ||
      t.includes("risk profile") ||
      t.includes("comfortable with") ||
      t.includes("drawdown")) &&
    !t.includes("portfolio")
  ) {
    return {
      kind: "risk",
      multiple: false,
      options: [
        { label: "Low — max -10% drawdown OK", value: "Low" },
        { label: "Medium — max -20% OK", value: "Medium" },
        { label: "High — >-20% is OK", value: "High" },
      ],
    };
  }

  // Hard constraints / what you won't invest in
  if (
    t.includes("won't invest") ||
    t.includes("would not invest") ||
    t.includes("avoid") ||
    t.includes("constraints") ||
    t.includes("prohibited") ||
    t.includes("excluded")
  ) {
    return {
      kind: "constraints",
      multiple: true,
      options: [
        { label: "No cryptocurrency" },
        { label: "No F&O (futures & options)" },
        { label: "No penny stocks" },
        { label: "No illiquid small-caps" },
        { label: "No forex trading" },
        { label: "No leverage / margin" },
        { label: "No tobacco / alcohol" },
        { label: "Max 15% in any single stock" },
      ],
    };
  }

  // Primary goal type
  if (
    (t.includes("primary financial goal") ||
      t.includes("primary goal") ||
      t.includes("what are you saving for") ||
      t.includes("financial goal")) &&
    !t.includes("target amount") &&
    !t.includes("target date")
  ) {
    return {
      kind: "goal",
      multiple: false,
      options: [
        { label: "House down payment" },
        { label: "Retirement corpus" },
        { label: "Child's education" },
        { label: "Emergency fund" },
        { label: "Wealth accumulation" },
        { label: "Wedding fund" },
      ],
    };
  }

  // Confirmation prompts
  if (
    t.includes("save this") ||
    t.includes("confirm") ||
    t.includes("shall i save") ||
    t.includes("ready to save") ||
    t.includes("looks good")
  ) {
    return {
      kind: "confirm",
      multiple: false,
      options: [
        { label: "Yes, save it" },
        { label: "No, let me revise" },
      ],
    };
  }

  // Skip option for holdings ("paste or type skip")
  if (
    t.includes("paste") &&
    (t.includes("holdings") || t.includes("symbol")) &&
    t.includes("skip")
  ) {
    return {
      kind: "holdings",
      multiple: false,
      options: [
        { label: "I'll upload via Excel later", value: "skip" },
        { label: "Use the demo holdings", value: "Use the demo holdings — load from data/holdings.json" },
      ],
    };
  }

  return null;
}

export function QuickReplies({
  text,
  disabled,
  onSelect,
}: {
  text: string;
  disabled: boolean;
  onSelect: (reply: string) => void;
}) {
  const detected = detectQuickReplies(text);
  // Multi-select state for "constraints" kind
  const [picked, setPicked] = useState<Set<string>>(new Set());

  useEffect(() => {
    setPicked(new Set());
  }, [text]);

  if (!detected) return null;

  if (detected.multiple) {
    const submit = () => {
      if (picked.size === 0) return;
      onSelect(Array.from(picked).join(", "));
    };
    return (
      <div className="mt-3 mb-2">
        <div className="flex flex-wrap items-center gap-2">
          {detected.options.map((opt) => {
            const val = opt.value ?? opt.label;
            const selected = picked.has(val);
            return (
              <button
                key={val}
                type="button"
                disabled={disabled}
                onClick={() =>
                  setPicked((prev) => {
                    const next = new Set(prev);
                    if (next.has(val)) next.delete(val);
                    else next.add(val);
                    return next;
                  })
                }
                className={`inline-flex items-center gap-1.5 text-sm px-3.5 py-1.5 rounded-full border transition disabled:opacity-50 ${
                  selected
                    ? "border-emerald-700/60 bg-emerald-950/40 text-emerald-300"
                    : "border-zinc-700 bg-zinc-900/40 text-zinc-300 hover:border-zinc-500"
                }`}
              >
                {selected && <Check className="w-3 h-3" />}
                {opt.label}
              </button>
            );
          })}
          <button
            type="button"
            disabled={disabled || picked.size === 0}
            onClick={submit}
            className="ml-1 text-sm px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-medium transition"
          >
            Send selected ({picked.size})
          </button>
        </div>
        <CustomAnswerHint />
      </div>
    );
  }

  return (
    <div className="mt-3 mb-2">
      <div className="flex flex-wrap gap-2">
        {detected.options.map((opt) => {
          const val = opt.value ?? opt.label;
          return (
            <button
              key={val}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(val)}
              className="text-sm px-3.5 py-1.5 rounded-full border border-zinc-700 bg-zinc-900/40 text-zinc-300 hover:border-emerald-600/60 hover:bg-emerald-950/40 hover:text-emerald-300 transition disabled:opacity-50"
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <CustomAnswerHint />
    </div>
  );
}

function CustomAnswerHint() {
  return (
    <div className="mt-2 text-xs text-zinc-500 flex items-center gap-1.5">
      <span>Or type your own answer in the box below</span>
      <span aria-hidden>↓</span>
    </div>
  );
}
