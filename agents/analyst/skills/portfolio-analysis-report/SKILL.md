---
name: portfolio-analysis-report
description: Generate today's portfolio analysis report. Reads holdings, RULES, user plan; runs the live-market scripts; computes concentration / liquidity / goal-progress facts; writes workspace/analysis-<date>.md in the exact 7-section format defined by the Analyst SOUL. Never recommends actions.
learned_from: task:6b89a154-ef82-4881-bb76-adf29878fae3
learned_at: '2026-05-24T12:00:00.000Z'
confidence: 1
usage_count: 5
success_count: 5
failure_count: 0
negative_examples: []
---

## Steps

Run these in order. Stop on any unrecoverable error and write what you have so far.

1. **Read inputs.** `memory/user_plan.md`, `RULES.md`, `data/holdings.json`. Paths are relative to repo root (`../../` from this skill directory).
2. **Run live market scripts.** Use `cli` to invoke `python3 scripts/analyze_holdings.py` and `python3 scripts/check_market.py`. Capture stdout. The scripts read `data/holdings.json` themselves.
3. **Parse live prices.** For each line of the form `SYMBOL  CMP: <price>  P/L: <pct>`, extract `current_price`. Use the live prices in the Holdings Snapshot table — never the average purchase price.
4. **Compute the seven sections** per the Analyst SOUL format (Holdings Snapshot, Market State, Concentration Risks, Liquidity Status, Goal Progress, Notable Anomalies, What the Strategist Should Consider).
5. **Concentration math.** `position_value = qty * current_price`; `position_pct = position_value / total_portfolio_value`. Flag any `position_pct > rules.concentration_cap`.
6. **Liquidity math.** From `user_plan.md`: read the `**Total**` outflows line and `Cash` + `Fixed Deposits` lines. `required_buffer = 3 * total_outflows`. Status is ADEQUATE if `liquid >= required_buffer`, else DEFICIENT.
7. **Goal-progress math.** `gap = target_amount - current_corpus`; `months = (target_date - today).months`; `required_monthly = gap / months`.
8. **Read prior reports for trend only.** Look at the 2-3 most recent files in `reports/`. Extract ONLY the verdict (APPROVED / AMENDED / VETOED) and date — never copy specific numbers, deadlines, or order details from them into today's analysis. Today's numbers come exclusively from inputs read in step 1.
9. **Write `workspace/analysis-<YYYY-MM-DD>.md`** via `write` tool.
10. **Confirm completion** with one line: `Analysis written to workspace/analysis-<date>.md`. Do not propose actions. Do not continue.

## Data-source policy (load-bearing)

- The only authoritative numeric sources for today's report are: `data/holdings.json`, `memory/user_plan.md`, `RULES.md`, and the live script stdout from step 2.
- Prior session reports are read for trend context only — never for specific values.
- If the live scripts return any non-empty stdout with `CMP:` lines, current prices ARE AVAILABLE. Write a "DATA UNAVAILABLE" section ONLY when stdout is empty or the script exits non-zero.

## What Worked

A clean four-input pipeline (`user_plan`, `RULES`, `holdings`, live scripts) followed by mechanical computation produces a stable, audit-ready report. The Strategist consumes this directly.
