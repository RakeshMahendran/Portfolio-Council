Skill: check-market

Purpose

This skill defines a repeatable procedure for rapidly checking market status and health indicators used by the Portfolio Council. It is intended to provide the Analyst and Risk Officer with a concise, timestamped snapshot of market conditions before any rebalance or execution.

Inputs

- RULES.md (read before running)
- Approved market data sources (scripts/check_market.py, market APIs configured in scripts/)
- Optional: data/holdings.json (for context-specific checks, e.g., concentrated-asset halts)

Outputs

- workspace/market-check-<YYYY-MM-DD>.md — snapshot report of market status
- workspace/market-prices-<YYYY-MM-DD>.csv — optional price snapshot for requested tickers
- workspace/market-alerts-<YYYY-MM-DD>.md — any active alerts or circuit-breaker events

Preconditions

- memory/user_plan.md exists and constraints are known
- RULES.md has been read to confirm any user-specific market constraints (e.g., do-not-trade during earnings)
- Network access to configured market data APIs

Procedure

1. Read RULES.md and memory/user_plan.md to respect trading windows, blackout periods, and allowed data sources.
2. Determine ticker set to check: default to top positions from data/holdings.json if present, otherwise use a configured watchlist in scripts/config.
3. Query market data sources for real-time or near-real-time quotes. Prefer consolidated feeds; degrade gracefully to single-exchange quotes if necessary.
4. Capture exchange status for primary markets (NYSE, NASDAQ, LSE, etc.) and note any exchange holidays, partial closures, or halts.
5. Check for macro-level indicators: major index moves (S&P 500, FTSE, MSCI World), VIX, US Treasury yields (2y, 10y), FX major pairs (USD/EUR, USD/JPY), and commodity movers (WTI, Gold).
6. Detect anomalies and alerts:
   - Circuit breakers triggered or market-wide halts
   - Trading halts on individual tickers in the user's portfolio
   - Unusually wide bid-ask spreads or quote absence
   - Significant gap moves vs previous close (> X% configurable)
7. Record data sources, query timestamps, and any rate-limit or API errors encountered.
8. Produce workspace/market-check-<date>.md containing:
   - Snapshot header with ISO 8601 timestamp and data source list
   - Exchange status summary
   - Key index & macro indicator table
   - Ticker-level prices for requested symbols with bid/ask/last/volume
   - Active alerts and recommended caution flags (factual only; do not recommend trades)
9. If critical alerts are present (exchange closures, circuit breakers, trading halts for portfolio tickers), write workspace/market-alerts-<date>.md with details and include suggested next steps for the Risk Officer (informational only).
10. Save any raw CSV price snapshots to workspace/ for auditability.

Error handling

- If primary API fails, switch to fallback sources and note the fallback in the report.
- If no market data is available, create workspace/market-check-error-<timestamp>.md explaining failure and suggesting retry intervals.

Notes

- This skill is a utility used by Analyst and Risk Officer; outputs must be strictly factual and timestamped.
- Respect API keys and credentials stored in scripts/config; do not hardcode secrets in reports.
- Keep response time short (aim < 30 seconds) and cache recent queries to avoid rate limits.

Metadata

created_by: Portfolio Council Orchestrator
created_at: 2026-05-23
version: 0.1.0
