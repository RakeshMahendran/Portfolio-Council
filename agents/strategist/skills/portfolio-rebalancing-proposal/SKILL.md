---
name: portfolio-rebalancing-proposal
description: Produce a rebalancing proposal that addresses today's Analyst report. Cite specific Hard / Soft Rules for every proposed action. Include a stress-test (or explicitly document why one isn't possible). Identify the proposal's own weaknesses for the Risk Officer. Provide at least one Plan B.
learned_from: task:76f03209-8973-4452-8458-c5925b758abd
learned_at: '2026-05-24T12:00:00.000Z'
confidence: 1
usage_count: 9
success_count: 9
failure_count: 0
negative_examples: []
---

## Steps

1. **Read inputs.** `workspace/analysis-<date>.md` (today's Analyst output), `RULES.md`, `memory/user_plan.md`, `data/holdings.json`.
2. **Identify the priorities** from the Analyst's "What the Strategist Should Consider" section. Treat that as the agenda. Do not invent new concerns the Analyst didn't surface.
3. **Draft the primary proposal.**
   - For each proposed buy/sell/hold action, cite the specific Hard Rule or Soft Rule it serves.
   - Compute the impact on total portfolio value, concentration percentages, liquidity buffer, and goal-progress trajectory.
   - Use the live current prices from the Analyst's Holdings Snapshot (never average price).
4. **Stress-test the proposal.** Apply a -10% NIFTY shock and a +20% concentration-stock-specific shock. Document worst-case impact on goal trajectory. If you can't stress-test (e.g. missing market data), note that as a known limitation the Risk Officer will weigh.
5. **Pre-empt the Risk Officer.** List 2-3 weaknesses you can already see in your own proposal. Be honest. The Risk Officer will find them anyway; better to surface them now and propose mitigations than have the verdict come back as VETO.
6. **Provide at least one Plan B.** An alternative that addresses the same Analyst concerns differently (e.g. "trim later in the week instead of today", or "use SIP rather than lump-sum deployment"). Plan B should be genuinely different, not a token alternative.
7. **Write `workspace/proposal-<YYYY-MM-DD>.md`** with the structure below.
8. **Confirm completion** with one line: `Proposal written to workspace/proposal-<date>.md`.

## Proposal file structure

```markdown
# Rebalancing Proposal — <YYYY-MM-DD>

## 1. Summary
<one-paragraph plain-English summary of what changes and why>

## 2. Proposed Actions
| # | Action | Symbol | Qty | Target Price | Rule Cited | Rationale |
|---|--------|--------|-----|--------------|------------|-----------|

## 3. Portfolio Impact (vs current)
- Total value: before → after
- Concentration: any positions crossing the cap?
- Liquidity buffer: maintained / drawn down by ₹X
- Goal trajectory: months-to-goal before → after

## 4. Stress-test
<scenarios + impact, OR documented limitation if data missing>

## 5. Known weaknesses
<3 honest critiques of your own proposal>

## 6. Plan B
<alternative course of action>
```

## Rule citation policy

Every proposed action MUST cite a specific rule. If you can't cite one, drop the action. Vague rationales ("rebalancing for better diversification") are not allowed — the rule is the audit trail.

## What Worked

Pre-empting Risk's review by listing weaknesses upfront cuts the AMEND loop in half. Citing rules per action makes the verdict file's rule-by-rule check trivial.
