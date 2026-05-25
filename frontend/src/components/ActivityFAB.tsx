"use client";

import clsx from "clsx";
import { ChevronUp, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type Activity = {
  id: string;
  text: string;
  timestamp: string;
};

export type ActivityFABProps = {
  activities: Activity[];
  running: boolean;
};

/**
 * Floating bottom-right button that surfaces gitclaw's tool-call activity
 * during a long-running session. Click expands a popover listing every
 * tool the agent has fired in the current turn — so the user can see that
 * gitclaw is alive while waiting on a slow response.
 */
export function ActivityFAB({ activities, running }: ActivityFABProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Auto-open the panel when running starts; auto-close when it ends
  // (so the user gets a passive glance at activity, then it tucks away).
  useEffect(() => {
    if (running && activities.length > 0) {
      setOpen(true);
    } else if (!running) {
      const t = setTimeout(() => setOpen(false), 1200);
      return () => clearTimeout(t);
    }
  }, [running, activities.length]);

  // Click-outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Don't render at all if there's nothing to show and nothing happening.
  if (!running && activities.length === 0) return null;

  const count = activities.length;
  const label = running
    ? count === 0
      ? "Thinking…"
      : `${count} ${count === 1 ? "action" : "actions"}`
    : `${count} ${count === 1 ? "action" : "actions"}`;

  return (
    <div className="fixed bottom-24 right-6 z-40 flex flex-col items-end gap-2">
      {open && (
        <div
          ref={panelRef}
          className={clsx(
            "w-[340px] max-h-[60vh] overflow-hidden",
            "rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl shadow-black/40",
            "flex flex-col",
          )}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              {running ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-400" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              )}
              <span className="text-xs font-medium text-zinc-300">
                Agent activity
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-zinc-500 hover:text-zinc-300"
              aria-label="Close activity panel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
            {activities.length === 0 && (
              <div className="text-xs text-zinc-500 italic py-2">
                Waiting for the first tool call…
              </div>
            )}
            {activities.map((a) => (
              <div
                key={a.id}
                className="flex items-start justify-between gap-2 text-[12px] font-mono"
              >
                <span className="text-zinc-300 break-all leading-tight">
                  {a.text}
                </span>
                <span className="shrink-0 text-zinc-600 text-[10px] mt-0.5">
                  {a.timestamp}
                </span>
              </div>
            ))}
          </div>
          <div className="px-3 py-1.5 border-t border-zinc-800 text-[10px] text-zinc-600">
            Live from gitclaw — refreshes as tools fire.
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "group inline-flex items-center gap-2 rounded-full pl-3 pr-3.5 py-2",
          "shadow-lg shadow-black/40 transition",
          running
            ? "bg-teal-600 text-white hover:bg-teal-500"
            : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700 border border-zinc-700",
        )}
        aria-label="Show agent activity"
      >
        {running ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
        )}
        <span className="text-xs font-medium">{label}</span>
        <ChevronUp
          className={clsx(
            "w-3 h-3 transition-transform",
            open ? "rotate-180" : "",
          )}
        />
      </button>
    </div>
  );
}

export default ActivityFAB;
