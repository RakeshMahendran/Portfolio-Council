// Consistent button.

import { clsx } from "clsx";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "brand-gradient text-white border-transparent shadow-lg shadow-teal-900/30 hover:shadow-teal-800/50 hover:brightness-110 disabled:bg-none disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none",
  secondary:
    "bg-white/[0.06] hover:bg-white/[0.12] text-zinc-100 border-white/10 disabled:opacity-50",
  ghost:
    "bg-transparent hover:bg-white/[0.06] text-zinc-300 border-transparent disabled:opacity-50",
  danger:
    "bg-red-900/40 hover:bg-red-900/60 text-red-300 border-red-800/60 disabled:opacity-50",
};

const SIZES: Record<Size, string> = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-3.5 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
};

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center gap-2 rounded-lg border font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 disabled:cursor-not-allowed",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    >
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {children}
    </button>
  );
}
