#!/usr/bin/env bash
# Portfolio Council — one-time setup for a fresh clone.
#
#   ./scripts/setup.sh
#
# Wires the governance hook into the repo so every rebalance commit is gated
# by the Risk Officer's verdict. Without this step the hook does nothing.

set -euo pipefail

cd "$(dirname "$0")/.."

echo "▸ Installing pre-commit governance hook…"
git config core.hooksPath hooks
chmod +x hooks/pre-commit

# Verify it actually runs by invoking it directly with no staged files.
if hooks/pre-commit > /dev/null 2>&1; then
    echo "  ✓ Hook is executable and gates commits at hooks/pre-commit"
else
    echo "  ✗ Hook failed self-test — check that python3 is on PATH"
    exit 1
fi

# Make sure .env is gitignored (defence in depth).
if grep -qE '^\.env$' .gitignore; then
    echo "  ✓ .env is gitignored"
else
    echo "  ! .env is NOT in .gitignore — add it before adding any secrets"
fi

echo
echo "Done. Two more steps to run the product:"
echo "  1. cp .env.example .env  (fill in AWS_BEARER_TOKEN_BEDROCK)"
echo "  2. docker compose up"
echo "  3. Open http://localhost:3000"
