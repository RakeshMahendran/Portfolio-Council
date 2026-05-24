---
name: adversarial-proposal-review
description: Adversarially review the Strategist's portfolio proposal against every Hard Rule and Soft Rule in RULES.md. Issue a structured Verdict (APPROVE / AMEND / VETO) with specific required changes and a Plan B alternative. The pre-commit hook requires a `Verdict: APPROVE` line for the rebalance commit to proceed.
learned_from: task:99f3f667-740c-4dd8-8513-347cceb2a36c
learned_at: '2026-05-24T12:00:00.000Z'
confidence: 1
usage_count: 7
success_count: 7
failure_count: 0
negative_examples: []
---

## Steps

1. **Read inputs.** `workspace/analysis-<date>.md` (today's Analyst output), `workspace/proposal-<date>.md` (today's Strategist output), `RULES.md`, `memory/user_plan.md`, `data/holdings.json`.
2. **Check every Hard Rule** against the proposal in turn. For each rule, decide: PASSES / VIOLATES / UNDETERMINABLE (and why).
3. **Check Soft Rules.** A Soft Rule violation is not a VETO by itself but counts toward AMEND.
4. **Run the math the Strategist provided.** Verify totals, concentration percentages, liquidity buffer, and cash impact. If any number doesn't reconcile with `holdings.json` and `analysis-<date>.md`, that's a VETO.
5. **Stress-test the proposal.** Consider: what if NIFTY drops 10% the day after execution? What if the proposed buy doesn't fill at the limit price? What if the user's investable savings drop next month? Document the worst plausible scenario.
6. **Pick the verdict.**
   - **APPROVE** — proposal violates no Hard Rule, math reconciles, stress test shows acceptable downside. Issue with confidence percentage.
   - **AMEND** — proposal is salvageable with specific, named changes. Enumerate each change the Strategist must make before re-review. List them as bullet points; the Strategist should be able to apply them and re-submit without further dialogue.
   - **VETO** — proposal violates a Hard Rule that can't be amended away, OR the math is wrong, OR the worst-case downside is unacceptable for the user's risk profile.
7. **Always offer a Plan B** — an alternative course of action (often "do nothing this session and wait for clearer signal"). The user should always have a non-action option.
8. **Write `workspace/verdict-<YYYY-MM-DD>.md`** with section 1 starting on a line of the form `Verdict: **APPROVE**` (or AMEND / VETO). This exact format is checked by the pre-commit governance hook in `hooks/pre-commit`.
9. **Confirm completion** with one line containing the verdict word.

## Verdict file format (required)

```markdown
# Risk Verdict — <YYYY-MM-DD>

## 1. Verdict

**Verdict: APPROVE**  (or AMEND / VETO)

Confidence: <pct>%

## 2. Rule-by-rule review
<table or list>

## 3. Required amendments (if AMEND)
<numbered list>

## 4. Stress-test summary
<worst-case scenario + impact>

## 5. Plan B
<the do-nothing or wait-and-see alternative>
```

The `Verdict: APPROVE` marker MUST be on its own line and case-sensitive — anything else (e.g. "Verdict: APPROVED with amendments", "we'd APPROVE if not for…") will be rejected by the hook regex.

## Adversarial mindset

Your job is to find the failure modes the Strategist missed. Default skepticism. The user is depending on you to be the strict editor. APPROVE only when you've genuinely tried and failed to find a flaw — not when the proposal "looks reasonable."

## What Worked

Rule-by-rule mechanical checks beat free-form opinion. Pre-defined verdict structure makes the hook regex trivial. The Plan B option gives the orchestrator a recoverable path on every VETO.
