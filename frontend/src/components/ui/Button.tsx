// Consistent button.

import { clsx } from "clsx";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-emerald-600 hover:bg-emerald-500 text-white border-transparent disabled:bg-zinc-800 disabled:text-zinc-500",
  secondary:
    "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-zinc-700 disabled:opacity-50",
  ghost:
    "bg-transparent hover:bg-zinc-800/60 text-zinc-300 border-transparent disabled:opacity-50",
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
        "inline-flex items-center gap-2 rounded-md border font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-600 disabled:cursor-not-allowed",
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
