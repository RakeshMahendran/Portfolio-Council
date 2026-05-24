"use client";

import { useState } from "react";

/**
 * AuthShell — a deliberately FAKE signin/signup widget.
 *
 * Portfolio Council's MVP is local-first: there are no user accounts, and
 * all portfolio data lives in the user's own git repo. We still want judges
 * to see an "auth" affordance at the top-right so the product feels real,
 * but clicking either button surfaces a roadmap modal explaining the plan.
 *
 * No props — there is no real auth state to thread through.
 */
export default function AuthShell() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        <span
          className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded
                     bg-zinc-800 text-zinc-400 border border-zinc-700"
          title="Auth is not real in this MVP"
        >
          [roadmap]
        </span>
        <button
          onClick={() => setOpen(true)}
          className="text-xs px-3 py-1.5 rounded-md border border-zinc-700
                     text-zinc-300 hover:text-zinc-100 hover:border-zinc-500
                     hover:bg-zinc-900 transition"
        >
          Sign in
        </button>
        <button
          onClick={() => setOpen(true)}
          className="text-xs px-3 py-1.5 rounded-md
                     bg-emerald-600/90 hover:bg-emerald-500 text-white
                     border border-emerald-500/80 transition"
        >
          Sign up
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center
                     bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="authshell-title"
        >
          <div
            className="max-w-md w-full bg-zinc-900 border border-zinc-700
                       rounded-xl shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-3">
              <span
                className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded
                           bg-amber-900/40 text-amber-300 border border-amber-700/50"
              >
                [roadmap]
              </span>
              <h2
                id="authshell-title"
                className="text-base font-semibold text-zinc-100"
              >
                Hosted accounts coming soon
              </h2>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Hosted auth is on the roadmap — this MVP runs locally with no
              user accounts. Your portfolio data lives in YOUR local git repo.
              See README for the v2 plan.
            </p>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700
                           text-sm text-zinc-100 border border-zinc-700 transition"
                autoFocus
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
