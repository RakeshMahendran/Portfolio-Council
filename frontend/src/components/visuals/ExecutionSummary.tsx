"use client";

import { ArrowDownToLine, ArrowUpFromLine, ListChecks, Wallet } from "lucide-react";
import { formatInr, type ExecutionParsed } from "@/lib/parse-artifacts";

/**
 * Compact "what am I actually placing today" card for the Execution artifact.
 * Pulls the parsed totals + a small order list. Robust to either the strict
 * template format or the prose-table format the agent currently emits.
 */
export function ExecutionSummary({ e }: { e: ExecutionParsed }) {
  const hasAny =
    e.orders.length > 0 ||
    e.totalBuy !== null ||
    e.totalSell !== null ||
    e.netDeployment !== null;
  if (!hasAny) return null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
      <h3 className="text-xs uppercase tracking-wider text-zinc-500">
        Today's orders
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat
          icon={<ListChecks className="w-4 h-4 text-blue-400" />}
          value={e.orders.length || "—"}
          label="orders to place"
        />
        <Stat
          icon={<ArrowDownToLine className="w-4 h-4 text-emerald-400" />}
          value={e.totalBuy !== null ? formatInr(e.totalBuy, { short: true }) : "—"}
          label="total BUY"
        />
        <Stat
          icon={<ArrowUpFromLine className="w-4 h-4 text-amber-400" />}
          value={e.totalSell !== null ? formatInr(e.totalSell, { short: true }) : "—"}
          label="total SELL"
        />
        <Stat
          icon={<Wallet className="w-4 h-4 text-purple-400" />}
          value={e.netDeployment !== null ? formatInr(e.netDeployment, { short: true }) : "—"}
          label="net deployment"
        />
      </div>

      {e.orders.length > 0 && (
        <div className="border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-zinc-900/60 text-zinc-500 uppercase tracking-wider">
              <tr>
                <th className="text-left px-3 py-2 font-medium">#</th>
                <th className="text-left px-3 py-2 font-medium">Symbol</th>
                <th className="text-left px-3 py-2 font-medium">Action</th>
                <th className="text-right px-3 py-2 font-medium">Qty</th>
                <th className="text-right px-3 py-2 font-medium">Price</th>
                <th className="text-left px-3 py-2 font-medium">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {e.orders.map((o) => (
                <tr key={`${o.seq}-${o.symbol}`} className="hover:bg-zinc-900/40">
                  <td className="px-3 py-2 text-zinc-500 tabular-nums">
                    {o.seq}
                  </td>
                  <td className="px-3 py-2 font-mono text-zinc-200">
                    {o.symbol}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        o.action === "BUY"
                          ? "text-emerald-400"
                          : o.action === "SELL"
                            ? "text-amber-400"
                            : "text-zinc-400"
                      }
                    >
                      {o.action}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-300 tabular-nums">
                    {o.qty}
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-300 tabular-nums">
                    {o.price ? `₹${o.price}` : "—"}
                  </td>
                  <td className="px-3 py-2 text-zinc-500">{o.orderType ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">
          {label}
        </span>
      </div>
      <div className="text-base font-semibold text-zinc-100 tabular-nums">
        {value}
      </div>
    </div>
  );
}
