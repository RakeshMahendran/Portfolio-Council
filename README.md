# Portfolio Council

> A 5-agent AI investment-research board you run as a git repo. Every decision is a commit. Every veto is enforced by a pre-commit hook. You fork an analyst the same way you fork a repo.

Built on **[gitclaw](https://github.com/lyzr/gitclaw)** (Lyzr's GitAgent runtime) for the Lyzr AI hiring challenge: *"Build something with GitAgent that makes us go: okay… this person ships."*

🎬 **[Watch the 4-min demo](ADD_LOOM_OR_YOUTUBE_LINK)** &nbsp;·&nbsp; [Architecture](#architecture) &nbsp;·&nbsp; [Decisions / ADRs](docs/DECISIONS.md) &nbsp;·&nbsp; [Quickstart](#quickstart)

> ⚠️ **Not investment advice.** Portfolio Council is an open-source research / educational tool that simulates a multi-agent governance flow. It is **not** a SEBI-registered investment adviser or research analyst. Outputs are illustrations of how the Council reasons, not personalized recommendations. **Consult a SEBI RIA before making any actual investment decision.** Past performance ≠ future results. The author accepts no liability for outcomes from following any output.

---

## What it does

You give the Onboarding agent your goals and holdings. From then on, every "should I rebalance?" question runs a **structured debate** between four specialist agents:

```
   Analyst       Strategist        Risk             Execution
   ─────────     ──────────        ─────────        ──────────
   Reports      → Proposes a   →   APPROVE  /   →   Price-targeted
   facts only;    rebalance,       AMEND    /       order list
   never            cites RULES    VETO              (no broker API)
   recommends.    

                  ↑ if AMEND, loop back to Strategist
```

The whole debate gets **committed to git** — every analysis, proposal, verdict, and execution plan is a file with a commit. Six months from now you can `git log --grep="VETOED"` and see why the AI told you to cool off.

The pre-commit hook (`hooks/pre-commit`) refuses to commit a rebalance unless `workspace/verdict-<date>.md` contains a structured `Verdict: APPROVE` marker. That's governance at the git layer — not theatre.

---

## Why agents-as-repos isn't just packaging

| Operation | Traditional AI agent | Portfolio Council (this) |
|---|---|---|
| "I want to try a more aggressive risk profile" | Edit a system prompt + restart | `git checkout -b aggressive-risk` → edit `agents/risk/SOUL.md` → run a session |
| "Why did you tell me to sell HDFC last March?" | (lost in token context) | `git log --grep="HDFC" workspace/verdict-*.md` |
| "Roll back the bad call from session 4" | Hope you saved a snapshot | `git revert <commit-sha>` |
| "Give my advisor to a friend" | Re-do the entire setup | `git clone` |
| "Block bad commits" | Trust the LLM not to lie | Pre-commit hook + structured verdict regex |

That's why **gitclaw is load-bearing** here, not decoration. Strip gitclaw and you can still ship "a multi-agent finance chatbot." Strip git and you've lost the whole audit-trail / fork-and-clone story.

---

## Quickstart

```bash
git clone <this-repo>
cd portfolio-agent
./scripts/setup.sh                         # installs the pre-commit hook
cp .env.example .env                       # fill in AWS_BEARER_TOKEN_BEDROCK
docker compose up                          # ~90s first boot
open http://localhost:3000
```

Click **"Try with sample data"** on the landing page → onboarding chat opens with a demo persona pre-loaded. You'll have a finished plan + RULES.md + holdings file inside 60 seconds without typing anything personal. Then click **"Run portfolio review"** to watch the four-agent debate stream into the dashboard.

> **Bedrock access**: get an `AWS_BEARER_TOKEN_BEDROCK` from the AWS console (or Lyzr Studio's hosted access). The default model is `amazon-bedrock:us.anthropic.claude-sonnet-4-5-20250929-v1:0`. There's an Azure OpenAI fallback in `.env.example` if Bedrock is unavailable.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Next.js 16 frontend  (localhost:3000, App Router)       │
│  /onboarding   chatbot intake, in-chat uploads           │
│  /processing   post-onboarding polling page              │
│  /session      4-agent debate viewer, 2×2 artifact grid  │
│  /profile      data management (plan / RULES / holdings) │
│  /dev          live git log + commit inspector           │
└────────────────────┬─────────────────────────────────────┘
                     │  fetch + NDJSON streaming
                     ▼
┌──────────────────────────────────────────────────────────┐
│  FastAPI bridge  (localhost:8000)                        │
│  /api/run       spawns gitclaw subprocess per agent      │
│  /api/data/*    file CRUD on user_plan / RULES / holdings│
│  /api/session/* per-date artifact reads                  │
│  /api/log,/fork,/revert,/checkout  git operations as HTTP│
└────────────────────┬─────────────────────────────────────┘
                     │  asyncio.subprocess
                     ▼
┌──────────────────────────────────────────────────────────┐
│  gitclaw  (Node.js)                                      │
│  Reads agents/<name>/SOUL.md → loads model + tools       │
│  Spawns AWS Bedrock / Claude Sonnet 4.5                  │
│  Writes workspace/ artifacts + git commits               │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  git  (the source of truth)                              │
│  hooks/pre-commit   refuses unauthorized rebalances      │
│  reports/*-rebalance.md   session output                 │
│  workspace/*.md           per-agent artifacts            │
│  agents/<name>/*          forkable advisor personalities │
└──────────────────────────────────────────────────────────┘
```

---

## What lives where

```
agents/                       five sub-agents — each is a forkable repo subtree
├── onboarding/   SOUL.md     conversational intake (one Q per turn)
├── analyst/     SOUL.md     reports facts, never recommends
├── strategist/  SOUL.md     proposes rebalances, cites RULES
├── risk/        SOUL.md     adversarial reviewer (APPROVE/AMEND/VETO)
└── execution/   SOUL.md     price-targeted order list

hooks/pre-commit              governance gate (regex-anchored APPROVE check)
SOUL.md                       orchestrator brain
RULES.md                      derived from user_plan; Risk enforces
SCOPE.md                      what's in / out of v1
docs/DECISIONS.md             11 ADRs explaining the path here
docs/applications.md          how the pattern generalizes beyond finance
examples/holdings.example.json  sanitised demo data for "Try with sample"

frontend/                     Next.js 16 App Router (Tailwind, lucide, sonner)
server/                       FastAPI + git_ops helpers
```

Per-user runtime files (`memory/`, `data/`, `workspace/`, `reports/`, `RULES.md`) are gitignored. Your goals and holdings stay in your clone.

---

## What's polished vs. what's known to drift

**Polished**
- Onboarding agent obeys SOUL.md one-question rules (rewrote it after gpt-5-mini paraphrased it — see [ADR-03](docs/DECISIONS.md))
- 4-agent debate is real: Strategist v2 proposals exist because Risk forced AMENDs
- Governance hook is installed and tests against bypass attempts
- In-chat uploads route through the `import-holdings` skill (the architecturally-pure path), not a backdoor — see [ADR-02](docs/DECISIONS.md)

**Known drift**
- Telegram skill is scoped in `SCOPE.md` but disabled in `.env.example` ("not wired up in v1"). Pick one.
- `AuthShell.tsx` is a roadmap placeholder. Documented in [ADR-05](docs/DECISIONS.md).
- Recent commit log is noisy with "Scaffold gitclaw agent" entries — agent scaffolding fires that subject by default.

**Boundaries** (explicit non-goals)
- No broker API. Execution outputs a price-targeted order list; you place the trades.
- No multi-user auth. The fork-and-clone model means each user gets their own repo. See [ADR-04](docs/DECISIONS.md).
- No paper-trading backtest. Recovery sim is a what-if calculator, not a market simulator.

---

## Demo flow (~5 min)

1. Land at `/` → click **"Try with sample data"** (seeds demo persona).
2. **`/onboarding`** → say hi; quick-reply through 6–7 short questions. Agent saves `memory/user_plan.md` and generates `RULES.md`.
3. Auto-forwards to **`/processing`** → checklist of artifacts landing.
4. Auto-forwards to **`/profile`** → see structured user plan + holdings table.
5. Click **"Run portfolio review"** → **`/session`** opens with a 2×2 grid: Analyst → Strategist → Risk → Execution, streaming in real time. Watch a verdict get committed.
6. Open **`/dev`** → git log with VETOED / APPROVED labels. Click any commit to inspect the diff.
7. Fork a riskier advisor: `/dev` → New branch → edit `agents/risk/SOUL.md` → re-run the session → compare commits.

---

## License & disclaimers

MIT. **Not investment advice.** The agents are wrong sometimes — that's why there's a Risk Officer, and that's why every decision is in a commit you can revert.

Built solo for the [Lyzr AI hiring challenge](https://lnkd.in/giuuNd57). Architecture decisions are documented as ADRs in [`docs/DECISIONS.md`](docs/DECISIONS.md) — including the things that broke (gpt-5-mini paraphrasing SOUL.md, regex parsing fragility, the no-banner ANSI state machine).
