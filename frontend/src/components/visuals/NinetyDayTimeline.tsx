"use client";

import clsx from "clsx";
import { Calendar, CircleDot, Flag, Repeat, ShoppingCart } from "lucide-react";
import { type ForwardTranche } from "@/lib/parse-artifacts";

type TimelineEvent = {
  daysFromNow: number;
  date: string;            // formatted, e.g. "Jun 23"
  kind: "today" | "sip-start" | "tranche" | "review";
  label: string;
  detail?: string;
};

/**
 * 90-day forward timeline — answers Q10: "When does each thing happen?"
 *
 * Reads:
 *  - today's session.date for the "today" marker
 *  - SIP start hint for the SIP marker
 *  - parsed future tranches for the tranche markers
 *  - next-review days-from-now for the review marker
 *
 * Renders a horizontal calendar strip with all four marker types.
 */
export function NinetyDayTimeline({
  sessionDate,
  hasOrders,
  sipStartNote,
  futureTranches,
  nextReviewDays,
}: {
  sessionDate: string | null;
  hasOrders: boolean;
  sipStartNote: string | null;
  futureTranches: ForwardTranche[];
  nextReviewDays: number | null;
}) {
  if (!sessionDate) return null;

  const base = parseDate(sessionDate);
  if (!base) return null;

  const events: TimelineEvent[] = [];
  events.push({
    daysFromNow: 0,
    date: fmtMonthDay(base),
    kind: "today",
    label: hasOrders ? "Place today's orders" : "Today",
  });

  // SIP start — assume start of next month if note says "starting <Month> YYYY"
  if (sipStartNote) {
    const sipDate = parseSipStart(sipStartNote, base);
    if (sipDate) {
      events.push({
        daysFromNow: Math.round((sipDate.getTime() - base.getTime()) / 86400000),
        date: fmtMonthDay(sipDate),
        kind: "sip-start",
        label: "SIPs start",
        detail: sipStartNote,
      });
    }
  }

  // Future tranches
  for (const t of futureTranches) {
    const td = parseRoughDate(t.dateText);
    if (td) {
      events.push({
        daysFromNow: Math.round((td.getTime() - base.getTime()) / 86400000),
        date: fmtMonthDay(td),
        kind: "tranche",
        label: t.name,
        detail: `Deploy ${t.amountText}${t.condition ? ` (conditional)` : ""}`,
      });
    }
  }

  // Next review
  if (nextReviewDays !== null && nextReviewDays > 0) {
    const reviewDate = new Date(base);
    reviewDate.setDate(reviewDate.getDate() + nextReviewDays);
    events.push({
      daysFromNow: nextReviewDays,
      date: fmtMonthDay(reviewDate),
      kind: "review",
      label: "Re-run Council",
      detail: `${nextReviewDays}-day review window`,
    });
  }

  // Sort + filter to next 90 days
  events.sort((a, b) => a.daysFromNow - b.daysFromNow);
  const within90 = events.filter((e) => e.daysFromNow <= 90);
  if (within90.length <= 1) return null;

  const maxDays = Math.max(...within90.map((e) => e.daysFromNow), 90);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-4 flex items-center gap-1.5">
        <Calendar className="w-3.5 h-3.5" />
        Your next 90 days — when each action happens
      </h3>

      <div className="relative px-2 py-3">
        {/* baseline */}
        <div className="absolute left-3 right-3 top-1/2 h-px bg-zinc-800 -translate-y-1/2" />
        {/* dots */}
        <div className="relative h-12">
          {within90.map((e, i) => {
            const leftPct = (e.daysFromNow / maxDays) * 100;
            return (
              <div
                key={i}
                className="absolute -translate-x-1/2 flex flex-col items-center"
                style={{ left: `${leftPct}%`, top: 0 }}
              >
                <EventDot kind={e.kind} />
                <div className="text-[10px] text-zinc-500 tabular-nums mt-1 whitespace-nowrap">
                  {e.date}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ul className="mt-4 space-y-1.5">
        {within90.map((e, i) => (
          <li key={i} className="flex items-center gap-2 text-xs">
            <EventDot kind={e.kind} small />
            <span className="text-zinc-300 font-medium">{e.label}</span>
            <span className="text-zinc-600 tabular-nums">
              {e.daysFromNow === 0 ? "today" : `+${e.daysFromNow}d · ${e.date}`}
            </span>
            {e.detail && <span className="text-zinc-500 ml-1 truncate">— {e.detail}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EventDot({
  kind,
  small,
}: {
  kind: TimelineEvent["kind"];
  small?: boolean;
}) {
  const cfg = {
    today:     { color: "bg-teal-500 border-teal-300",   icon: ShoppingCart },
    "sip-start": { color: "bg-cyan-500 border-cyan-300", icon: Repeat },
    tranche:   { color: "bg-amber-500 border-amber-300", icon: CircleDot },
    review:    { color: "bg-emerald-500 border-emerald-300", icon: Flag },
  }[kind];
  const Icon = cfg.icon;
  const size = small ? "w-3.5 h-3.5" : "w-4 h-4";
  return (
    <span
      className={clsx(
        "rounded-full border-2 z-10 flex items-center justify-center shrink-0",
        cfg.color,
        size,
      )}
    >
      <Icon className="w-2 h-2 text-white" />
    </span>
  );
}

function parseDate(s: string): Date | null {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function parseRoughDate(s: string): Date | null {
  // "June 24, 2026" or "2026-06-24" or "Jun 24 2026"
  const iso = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const long = s.match(/([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})/);
  if (!long) return null;
  const d = new Date(`${long[1]} ${long[2]}, ${long[3]}`);
  return isNaN(d.getTime()) ? null : d;
}

function parseSipStart(note: string, sessionDate: Date): Date | null {
  // "June 2025" / "June 2026" / "starting June 2026"
  const m = note.match(/([A-Za-z]+)\s+(\d{4})/);
  if (m) {
    const d = new Date(`${m[1]} 1, ${m[2]}`);
    return isNaN(d.getTime()) ? null : d;
  }
  if (/next\s+month/i.test(note)) {
    const d = new Date(sessionDate);
    d.setMonth(d.getMonth() + 1, 1);
    return d;
  }
  return null;
}

function fmtMonthDay(d: Date): string {
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}
