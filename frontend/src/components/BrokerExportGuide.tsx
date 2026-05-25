"use client";

import clsx from "clsx";
import { ChevronDown, ExternalLink, X } from "lucide-react";
import { useEffect, useState } from "react";

export type BrokerExportGuideProps = {
  open: boolean;
  onClose: () => void;
};

type Broker = {
  name: string;
  loginUrl: string;
  /** Compact title for the section header. */
  title: string;
  /** Ordered steps the user follows on the broker's site. */
  steps: string[];
  /** Final note about what the downloaded file looks like. */
  outputHint: string;
};

// Each broker's instructions are short and click-by-click. The goal is that
// a non-technical user can follow these without help.
const BROKERS: Broker[] = [
  {
    name: "zerodha",
    title: "Zerodha (Console)",
    loginUrl: "https://console.zerodha.com/portfolio/holdings",
    steps: [
      "Log in to Zerodha Console (console.zerodha.com).",
      "Click 'Portfolio' → 'Holdings' in the left menu.",
      "Click the download icon (top-right of the holdings table).",
      "Choose 'CSV' as the format.",
    ],
    outputHint:
      "You'll get a file like 'holdings.csv' with columns Symbol, Qty, Avg cost, LTP, Current value.",
  },
  {
    name: "groww",
    title: "Groww (Web)",
    loginUrl: "https://groww.in/stocks/user/holdings",
    steps: [
      "Open groww.in and log in.",
      "Click 'Stocks' tab → 'My holdings'.",
      "Click the download icon (top-right of the holdings list).",
      "Select 'CSV' / 'Excel' to download.",
    ],
    outputHint:
      "The file includes Stock name, Quantity, Average price, Invested amount, Current value.",
  },
  {
    name: "upstox",
    title: "Upstox (Pro Web)",
    loginUrl: "https://pro.upstox.com/holdings",
    steps: [
      "Open Upstox Pro Web → 'Portfolio' → 'Holdings'.",
      "Click the three-dot menu near the holdings table.",
      "Select 'Download holdings' → CSV.",
    ],
    outputHint:
      "Columns: Stock, Quantity, Avg buy price, Current price, P&L.",
  },
  {
    name: "icicidirect",
    title: "ICICI Direct",
    loginUrl: "https://secure.icicidirect.com/trading/equity/portfolio",
    steps: [
      "Log in to icicidirect.com.",
      "Go to 'Equity' → 'Portfolio' → 'Demat Holdings'.",
      "Click 'Download' (top-right).",
      "Select 'CSV' or 'Excel'.",
    ],
    outputHint:
      "File contains ISIN, Stock, Quantity, Average cost, Market price, Value.",
  },
  {
    name: "hdfcsec",
    title: "HDFC Securities",
    loginUrl: "https://www.hdfcsec.com/portfolio",
    steps: [
      "Log in to hdfcsec.com → 'Reports / Portfolio'.",
      "Choose 'Holdings Summary'.",
      "Click 'Export' → 'CSV'.",
    ],
    outputHint:
      "Holdings list with symbol, quantity, average price, current value.",
  },
];

/**
 * Slide-out modal explaining how to download a holdings CSV from each major
 * Indian broker. The onboarding flow references this when the agent asks
 * about current holdings.
 */
export function BrokerExportGuide({ open, onClose }: BrokerExportGuideProps) {
  const [expanded, setExpanded] = useState<string | null>("zerodha");

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={clsx(
          "w-full max-w-2xl max-h-[85vh] overflow-hidden",
          "rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl",
          "flex flex-col",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5 py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">
              How to export your holdings
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Download a CSV from your broker, then upload it back here.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 p-1"
            aria-label="Close guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {BROKERS.map((b) => {
            const isOpen = expanded === b.name;
            return (
              <div
                key={b.name}
                className="rounded-lg border border-zinc-800 bg-zinc-950/50 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : b.name)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-900/50 transition"
                >
                  <span className="text-sm font-medium text-zinc-200">
                    {b.title}
                  </span>
                  <ChevronDown
                    className={clsx(
                      "w-4 h-4 text-zinc-500 transition-transform",
                      isOpen ? "rotate-180" : "",
                    )}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 border-t border-zinc-800/70">
                    <ol className="text-sm text-zinc-300 space-y-1.5 list-decimal list-inside">
                      {b.steps.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ol>
                    <p className="text-xs text-zinc-500 mt-3 italic">
                      {b.outputHint}
                    </p>
                    <a
                      href={b.loginUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 mt-3"
                    >
                      Open {b.title.split(" ")[0]}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="px-5 py-3 border-t border-zinc-800 text-[11px] text-zinc-500">
          Don't see your broker? Any CSV with columns{" "}
          <code className="text-zinc-400">Symbol, Qty, Avg price</code> will
          work — the importer is forgiving.
        </div>
      </div>
    </div>
  );
}

export default BrokerExportGuide;
