// Pill badge with semantic colors.

import { clsx } from "clsx";

type Variant =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "pending";

const VARIANTS: Record<Variant, string> = {
  neutral: "bg-zinc-800/60 text-zinc-300 border-zinc-700",
  success: "bg-emerald-900/40 text-emerald-300 border-emerald-800/60",
  warning: "bg-amber-900/40 text-amber-300 border-amber-800/60",
  danger: "bg-red-900/40 text-red-300 border-red-800/60",
  info: "bg-teal-900/40 text-teal-300 border-teal-800/60",
  pending: "bg-zinc-800/60 text-zinc-400 border-zinc-700 animate-pulse",
};

export function StatusBadge({
  children,
  variant = "neutral",
  className,
}: {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider border",
        VARIANTS[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
