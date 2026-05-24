---
name: generate-execution-orders-from-approved-proposal
description: Translate the Risk-approved Strategist proposal into a broker-ready order list. One row per order with symbol, action, quantity, order type, price target, and a sequencing note. Output is human-executable — there is no broker API; the user places these orders themselves.
learned_from: task:f46f9962-04c8-460e-ae62-5e68ccfacf71
learned_at: '2026-05-24T12:00:00.000Z'
confidence: 1
usage_count: 6
success_count: 6
failure_count: 0
negative_examples: []
---

## Steps

1. **Read inputs.** `workspace/verdict-<date>.md` (must contain `Verdict: APPROVE`), `workspace/proposal-<date>.md` (the approved proposal), `data/holdings.json`, the Analyst report for live prices.
2. **Refuse to proceed unless the verdict is APPROVE.** If the verdict is AMEND or VETO, write nothing and confirm: `Cannot generate orders — Risk verdict is <verdict>`. The pre-commit hook would block the commit anyway, but the Execution agent should not generate orders for blocked proposals.
3. **One row per action.** For each "Proposed Action" row in the proposal, emit one order with:
   - **Symbol** (NSE / BSE listed; use `.NS` suffix in any tool calls but plain symbol in the order list)
   - **Action** (BUY / SELL)
   - **Qty** (whole shares; fractional rounding noted explicitly)
   - **Order Type** (LIMIT preferred, MARKET only when explicitly authorized)
   - **Price target** (limit price from proposal; if proposal gave a range, use the conservative end)
   - **Sequencing note** (e.g. "execute SELLs before BUYs to free capital", "after market open at 09:20", "wait for HDFCBANK above ₹X")
4. **Compute total INR impact.** Sum of all BUYs minus sum of all SELLs. Verify the result keeps the liquidity buffer per `RULES.md`. If it doesn't, refuse to generate orders and write a clarification note instead.
5. **Day-N protocol.** If a LIMIT order won't fill within N days (default 8), the user should call the Strategist back for a re-evaluation. State this in the file header.
6. **Write `workspace/orders-<YYYY-MM-DD>.md`** with the table + sequencing notes.
7. **Confirm completion** with one line: `Orders written to workspace/orders-<date>.md`.

## Orders file structure

```markdown
# Execution Orders — <YYYY-MM-DD>

Approved by Risk Officer on <date>. Place these orders in the order listed.

## Order Table
| # | Symbol | Action | Qty | Order Type | Price | Sequencing |
|---|--------|--------|-----|------------|-------|------------|

## Net Capital Impact
- Total BUY: ₹X
- Total SELL: ₹Y
- Net deployment: ₹X-Y
- Post-execution liquidity: ₹L  (buffer requirement: ₹B — status: ADEQUATE / TIGHT)

## Day-8 protocol
If any LIMIT order is unfilled after 8 trading days, return to the Strategist for re-evaluation. Do not amend price targets in isolation.
```

## Constraints

- **No broker API.** This is a recommendation list. The user places the orders themselves.
- **No new positions** — only execute what the approved proposal authorized.
- **Whole shares only.** Round down. Note rounding gaps explicitly.

## What Worked

One-row-per-order with explicit sequencing makes the document human-executable. Refusing to generate when the verdict is non-APPROVE keeps Execution honest.
