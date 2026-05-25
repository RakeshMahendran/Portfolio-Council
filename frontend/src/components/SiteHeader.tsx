// Shared top navbar — used on every page so branding stays consistent.

"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AuthShell from "./AuthShell";
import { BrandMark } from "./BrandMark";

type Props = {
  /** When true (or unset), shows the full brand (logo + "Portfolio Council" + "powered by gitclaw"). */
  showFullBrand?: boolean;
  /** When set, renders a "← Back" arrow that links here instead of the full logo. */
  backHref?: string;
  /** Optional center slot — page name, breadcrumb, status badges. */
  pageContext?: React.ReactNode;
};

export default function SiteHeader({
  showFullBrand = true,
  backHref,
  pageContext,
}: Props = {}) {
  return (
    <header
      className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between sticky top-0 bg-[#08080c]/80 backdrop-blur-xl z-40"
    >
      <div className="flex items-center gap-4 min-w-0">
        {/* Brand cluster — either back arrow or full logo */}
        {backHref ? (
          <Link href={backHref} className="flex items-center gap-3 group shrink-0">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 flex items-center justify-center transition-colors">
              <ArrowLeft className="w-4 h-4 text-zinc-300" />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              Portfolio Council
            </span>
          </Link>
        ) : (
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <span className="group-hover:brand-ring rounded-xl transition-shadow">
              <BrandMark size={38} />
            </span>
            <div className="flex items-baseline gap-3">
              <span className="text-xl font-semibold tracking-tight">
                Portfolio Council
              </span>
              {showFullBrand && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] text-zinc-400 font-mono border border-white/10 hidden md:inline">
                  powered by gitclaw
                </span>
              )}
            </div>
          </Link>
        )}

        {/* Optional page-context slot (breadcrumbs, status badges, etc.) */}
        {pageContext && (
          <>
            <div className="h-5 w-px bg-white/10 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-2 min-w-0">
              {pageContext}
            </div>
          </>
        )}
      </div>

      <AuthShell />
    </header>
  );
}
