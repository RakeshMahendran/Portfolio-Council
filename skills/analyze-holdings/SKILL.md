Skill: analyze-holdings

Purpose

This skill defines the standardized procedure for the "analyze-holdings" operation used by the Portfolio Council. It encodes reproducible steps to load user holdings, validate inputs, fetch market data, compute portfolio metrics, and produce a draft analysis saved to workspace/.

Inputs

- data/holdings.json OR an uploaded holdings spreadsheet (converted to JSON by import-holdings skill)
- RULES.md (must be read before running)
- scripts/analyze_holdings.py (optional helper to fetch prices and compute metrics)

Outputs

- workspace/analysis-<YYYY-MM-DD>.md — factual analysis of holdings and market state
- (optional) workspace/analysis-<YYYY-MM-DD>.csv — computed metrics table

Preconditions

- memory/user_plan.md exists and has been read for constraints and objectives
- RULES.md exists and is consulted before producing any analysis
- data/holdings.json is present and passes basic validation (non-empty, assets have symbols and quantities)

Procedure

1. Read RULES.md and memory/user_plan.md to ensure governance and user constraints are considered.
2. Load holdings from data/holdings.json. If not present, fail with a clear error message and guidance to run import-holdings.
3. Validate holdings format: ensure each position has {symbol, quantity, currency, lot-level data if available}.
4. Normalize quantities and currencies (note FX conversions if holdings include non-base currencies).
5. Fetch current market prices using scripts/analyze_holdings.py or an approved data source. Respect rate limits and cache where appropriate.
6. Compute portfolio-level metrics: market value per position, total market value, asset-class breakdown, sector exposure, concentrated positions (>5% of portfolio), realized/unrealized P&L if cost basis available.
7. Run quick sanity checks: market values > 0, no negative quantities unless short positions are allowed per RULES.md.
8. Write a factual analysis file to workspace/analysis-<YYYY-MM-DD>.md containing:
   - Data sources and timestamp
   - Snapshot of holdings with prices and market values
   - Key metrics and concentrations
   - Flags for missing/invalid data
   - No recommendations or opinions (Analyst role must only report facts)
9. Commit or save the output files to workspace/. Do NOT push to any broker or enact trades.

Error handling

- If market data cannot be retrieved, include a clear note in the analysis and attach the latest cached prices if available.
- If holdings are malformed, abort and write a diagnostic file workspace/analysis-error-<timestamp>.md with details.

Notes

- This skill is for the Analyst agent; it must not produce recommendations.
- Ensure timestamps are ISO 8601 and files are named according to session date conventions.

Metadata

created_by: Portfolio Council Orchestrator
created_at: 2026-05-23
version: 0.1.0
