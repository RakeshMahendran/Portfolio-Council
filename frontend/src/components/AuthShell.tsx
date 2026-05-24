"use client";

import Link from "next/link";
import { BookOpen, GitBranch, ExternalLink } from "lucide-react";

/**
 * NavActions — useful right-side navbar links.
 *
 * Portfolio Council is local-first: there are no user accounts (your local
 * git repo IS your identity — see DECISIONS.md, ADR-05). Instead of fake
 * "Sign in/Sign up" buttons that don't do anything, we surface the actually-
 * useful links: docs, developer view, source.
 *
 * Component name kept as `AuthShell` for backward-compat (it's imported in
 * many places); the actual content has nothing to do with auth.
 */
export default function AuthShell() {
  return (
    <nav className="flex items-center gap-1">
      <Link
        href="/dev"
        className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
      >
        <GitBranch className="w-4 h-4" />
        <span className="hidden sm:inline">Git log</span>
      </Link>
      <Link
        href="/profile"
        className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
      >
        <BookOpen className="w-4 h-4" />
        <span className="hidden sm:inline">Profile</span>
      </Link>
      <a
        href="https://github.com/open-gitagent/gitagent"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
        title="GitAgent on GitHub"
      >
        <ExternalLink className="w-4 h-4" />
        <span className="hidden sm:inline">GitAgent</span>
      </a>
    </nav>
  );
}
