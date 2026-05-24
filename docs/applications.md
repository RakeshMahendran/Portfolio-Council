# Other Applications of This Pattern

Portfolio Council demonstrates a general-purpose pattern: **multi-agent adversarial review with git-native audit trail.**

The portfolio use case is a worked example. The same architecture — 5 sub-agents under a non-deciding orchestrator + pre-commit hook + workspace artifacts — adapts to any decision domain where:

1. Decisions are high-stakes (cost of being wrong is real)
2. Reasoning needs to be auditable later
3. A single perspective is unreliable (humans get tired, miss things, drift from rules)
4. Reversibility matters (you want to revert a past decision without losing context)

Below: five other applications of the same pattern. Each is implemented by swapping the SOUL.md files of the four sub-agents; the orchestrator, pre-commit hook, and storage layer stay identical.

---

## 1. Code Review Council

**Replace agents with:**

| Slot | Personality |
|---|---|
| Analyst | "Read the diff. List what changed. Don't recommend." |
| Strategist | "Argue for the PR. Cite design docs. Acknowledge weaknesses." |
| Risk Officer | "Look for security issues, hidden complexity, untested edges. Always offer Plan B (a safer alternative)." |
| Execution | "Draft the merge commit message and changelog entry." |

**Workspace artifacts:** `diff-analysis.md`, `merge-proposal.md`, `risk-verdict.md`, `merge-commit.md`

**Why this is better than a single Claude reviewing a PR:** specialized lenses. The Risk persona is *expected* to find problems; the Strategist persona is *expected* to advocate. The tension produces better reviews than asking one model to do both jobs.

**Pre-commit hook:** blocks the actual merge unless `verdict.md` contains "APPROVE" — i.e., a forgotten PR can't accidentally get merged.

---

## 2. Legal Document Review

**Replace agents with:**

| Slot | Personality |
|---|---|
| Analyst | "Extract every clause. List parties, dates, dollar amounts, jurisdictions. No judgment." |
| Strategist | "Draft redlines. Justify each change against company policy." |
| Risk Officer | "Flag compliance issues, ambiguous terms, dangerous clauses. Plan B: which clauses are acceptable to leave unredlined?" |
| Execution | "Produce the final tracked-changes markup as a single document." |

**Workspace artifacts:** `clauses.md`, `redlines.md`, `risk-flags.md`, `final-markup.md`

**Git advantage:** every revision of a contract review is committed with the reasoning. Six months later, you can `git show` a past review and see exactly why a clause was flagged.

---

## 3. Hiring Committee

**Replace agents with:**

| Slot | Personality |
|---|---|
| Analyst | "Summarize interview signals across loops. List facts: skills demonstrated, gaps, references." |
| Strategist | "Make the hire/no-hire case. Quote specific evidence." |
| Risk Officer | "Bias check. Calibration drift check. Push back on weak signals. Plan B: which loops should be re-run before deciding?" |
| Execution | "Draft the offer letter or rejection email, including reasoning for the candidate." |

**Workspace artifacts:** `interview-summary.md`, `case.md`, `bias-check.md`, `decision-letter.md`

**Why this is high-value:** hiring decisions are reviewed years later when retention/performance is known. Having the original reasoning in git means you can correlate "what we thought" with "what happened" — invaluable for calibration.

**Pre-commit hook:** blocks the offer letter from being committed unless Risk Officer's bias-check verdict is APPROVE.

---

## 4. Compliance Audit (SOX / SOC2 / GDPR)

**Replace agents with:**

| Slot | Personality |
|---|---|
| Analyst | "Read the controls evidence. List what's documented vs missing." |
| Strategist | "Propose remediation actions for gaps. Cite the specific control requirement." |
| Risk Officer | "Adversarial: 'Would this pass an external auditor?' Find weak evidence. Plan B: which controls need additional documentation?" |
| Execution | "Generate the auditor-ready summary report." |

**Workspace artifacts:** `evidence-gaps.md`, `remediation-plan.md`, `auditor-veto.md`, `audit-report.md`

**Why git is required, not optional:** SOX requires immutable audit trails. SOC2 wants change history. Git provides both natively — every audit cycle is a tagged release.

---

## 5. Medical Second Opinion (simulated — not a medical device)

**Replace agents with:**

| Slot | Personality |
|---|---|
| Analyst | "Read the patient's records. List symptoms, vitals, history, current medications. No diagnosis." |
| Strategist | "Propose a treatment plan. Cite which guidelines you applied." |
| Risk Officer | "Cross-check drug interactions, contraindications, alternative diagnoses. Plan B: which test would resolve uncertainty?" |
| Execution | "Draft the patient-facing explanation with reading-level appropriate language." |

**Workspace artifacts:** `case-summary.md`, `treatment-plan.md`, `risk-review.md`, `patient-letter.md`

**Disclaimer:** this is *not* a medical device. It's an illustration of how adversarial review with audit trail applies in regulated domains. Real medical use would require FDA software-as-medical-device clearance.

---

## What stays the same across all five

```
Orchestrator (root SOUL.md):    "Coordinate, delegate, commit. Never decide."
Pre-commit hook:                  Blocks commits without Risk APPROVE.
Workspace artifacts:              Generated by sub-agents, parsed by UI.
Git audit trail:                  Every decision = signed commit.
Forkable agent state:             `git checkout -b experimental-aggressive`
```

## What changes per application

```
4× SOUL.md files (one per sub-agent)
Domain-specific skills (e.g., yfinance for portfolio, github API for code review)
The first set of inputs (memory/user_plan.md → memory/<domain>_context.md)
RULES.md content (concentration limits → security policies → bias rules)
```

## The unifying claim

This isn't "an AI portfolio advisor that happens to use git." It's **"an adversarial multi-agent decision framework where git is the storage and audit layer."**

The choice to demo with portfolio rebalancing was driven by:
- Existing working scripts (yfinance integration, recovery simulation)
- Real domain knowledge (the implementer's actual finances)
- Concrete, verifiable artifacts (real NSE prices > toy examples)
- A domain where adversarial review is provably valuable (the Risk Officer caught a real ₹3.74L double-execution risk in testing)

But the engineering thesis is general. Swap the SOUL.md files and the same machine reviews code, contracts, hires, audits, or anything else where multi-perspective deliberation matters.

---

*This document is part of the Portfolio Council submission. See `README.md` for the live demo, `DECISIONS.md` for the architectural rationale, and `SCOPE.md` for the build scope.*
