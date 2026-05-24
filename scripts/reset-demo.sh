#!/usr/bin/env bash
# Portfolio Council — reset to a clean demo state.
#
#   ./scripts/reset-demo.sh
#
# Wipes per-session artifacts so the next session's agents don't accidentally
# read stale numbers from yesterday's runs. The analyst's SOUL.md reads recent
# reports for trend continuity, so polluted files can leak into today's
# analysis. Run this before a fresh demo / submission.
#
# Files removed:
#   workspace/*                  Claude scratchpad + per-agent artifacts
#   reports/*                    rebalance reports from prior sessions
#   agents/*/workspace/*         per-agent workspaces

set -euo pipefail

cd "$(dirname "$0")/.."

echo "▸ Wiping per-session artifacts…"

removed=0
for d in workspace reports agents/analyst/workspace agents/strategist/workspace agents/risk/workspace agents/execution/workspace agents/onboarding/workspace; do
    if [ -d "$d" ]; then
        count=$(find "$d" -mindepth 1 -maxdepth 1 | wc -l)
        if [ "$count" -gt 0 ]; then
            rm -rf "$d"/*
            echo "  ✓ cleared $count item(s) from $d/"
            removed=$((removed + count))
        fi
    fi
done

if [ "$removed" -eq 0 ]; then
    echo "  (already clean)"
fi

echo
echo "Demo state reset. The next session will compute fresh facts from:"
echo "  - data/holdings.json"
echo "  - memory/user_plan.md"
echo "  - RULES.md"
echo "  - live market scripts (yfinance)"
