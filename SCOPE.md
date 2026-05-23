# Portfolio Council — Scope

> **Your portfolio's AI board of directors. Five agents argue every move. Every decision audit-trailed in git.**

---

## 1. The Problem

DIY retail investors in India have intelligence and capital — but lack the institutional discipline that protects professional investors from themselves. This shows up as four daily pains, each with real measurable cost:

### 1.1 Emotional Decisions

**The pattern.** Market drops 3% on a Tuesday — they panic-sell their best long-term position. RVNL hits a new high — they double down without re-checking the thesis. Twitter is bullish on Adani — they buy without reading a single annual report.

**The cost.** Behavioral finance studies consistently show retail investors underperform their *own* portfolio by 1.5–3% annually purely from timing errors caused by emotion. On a ₹10L portfolio, that's ₹15,000–₹30,000 lost every year to your own panic and FOMO — not to bad picks, but to mistimed reactions.

**What they do today.** Try to "be more disciplined." Read more books. Promise themselves next time will be different. Fail under pressure because there's no system enforcing the discipline.

### 1.2 Forgotten Rules

**The pattern.** In January, you write down: "I'll never put more than 15% in a single stock." TCS runs up 60% over six months. By July, TCS is 28% of your portfolio. You don't rebalance because *checks notes* it's been doing great. Then it corrects 22% and you've lost ₹3L from a position you swore you'd cap.

**The cost.** Your concentration bets become your largest unmanaged risk. The rules you wrote down to protect yourself are forgotten by the version of you that needs them most — because there's no system actively reminding you, much less *blocking* you.

**What they do today.** Excel sheets with rules in row 1 that nobody re-reads. Notion docs. Slow drift away from the discipline, with zero enforcement.

### 1.3 No Paper Trail

**The pattern.** Twelve months later, you can't remember why you bought RVNL at ₹443. Was it the Q4 earnings beat? A Twitter thread? A YouTube video? Did you stress-test the thesis or just buy? The reasoning is gone. The decision is now an artifact you can neither defend nor learn from.

**The cost.** You repeat mistakes because you can't see them. You can't tell your spouse, accountant, or future self what your reasoning was. When a CA asks for an audit trail at tax time, you have receipts but no narrative.

**What they do today.** Vague Notion notes that never get updated. Memory, which is unreliable. WhatsApp chats with friends, which are searchable but not structured.

### 1.4 No Affordable Second Opinion

**The pattern.** Before a meaningful trade, you want a sanity check. You call a friend — they don't know your full portfolio. You ask ChatGPT — it doesn't know your rules or your real holdings. You consider a SEBI-registered RIA — they cost ₹50,000–₹2,00,000/year for personalized advice, which doesn't pencil for a ₹10L portfolio.

**The cost.** You make impulsive decisions because the friction of getting a second opinion is too high. By the time you'd find someone competent and brief them, the moment has passed and you've already clicked Buy.

**What they do today.** Trade on instinct. Sometimes regret it. Sometimes don't realize they should have.

### Summary

The retail DIY investor doesn't need someone to pick their stocks. They need someone to **stop them from sabotaging their own plan**. That requires:
- Memory (rules persist)
- Enforcement (rules get applied)
- Adversarial review (someone argues back)
- Audit trail (the reasoning survives)

That's exactly what an institutional investment committee provides — and exactly what's missing for the DIY tier.

---

## 2. Target User

**The Self-Directed Retail Investor.**

- Manages ₹2L–₹50L portfolio on Zerodha/Groww/Upstox
- Has a real financial goal (house, retirement, child's education)
- Uses Excel/Notion to track plans, gets advice from Twitter/YouTube
- **Accesses the product via web UI** (chat dashboard at localhost or self-hosted). Power users / developers can also use the CLI directly.
- Wants institutional rigor without paying ₹50K/year

Post-MVP: Independent investment advisors managing 5–50 client portfolios. Native mobile app in v4.

---

## 3. Value Proposition

You manage your own money. You're smart but human — emotional, forgetful, occasionally overconfident.

**Portfolio Council is your AI investment board.** Five agents review every decision:

- **Onboarding** — captures your goals, builds your personalized rulebook
- **Analyst** — observes holdings + market, reports facts. Never recommends.
- **Strategist** — proposes rebalances. Must cite your rules.
- **Risk Officer** — adversarial review. Can APPROVE / VETO / AMEND. Proposes Plan B.
- **Execution** — translates approved strategy to price-targeted orders.

Their deliberation is committed to git. Six months from now, you can review any decision.

---

## 4. The User Flow

### First-time setup (5 min, one-time)

```
1. Clone repo, set up .env with API keys
2. Run: gitclaw --dir .
3. Onboarding agent walks you through ~8 questions:
   - Primary financial goal
   - Target amount + date
   - Current portfolio value
   - Monthly income
   - Fixed outflows (EMIs, SIPs, rent)
   - Risk tolerance
   - Hard constraints (no leverage, no F&O, etc.)
4. Upload your Excel holdings (or paste list)
5. System generates memory/user_plan.md + RULES.md
6. (Optional) Configure Telegram bot for notifications
```

### Per-session use (5 min, recurring)

```
$ gitclaw --dir . --prompt "Run portfolio review"

[Orchestrator delegates to Analyst]   → workspace/analysis-<date>.md
[Orchestrator delegates to Strategist] → workspace/proposal-<date>.md
[Orchestrator delegates to Risk]       → workspace/verdict-<date>.md (APPROVE / VETO / AMEND + Plan B)
[If APPROVE: delegates to Execution]   → workspace/orders-<date>.md
[Pre-commit hook validates Risk approval]
[Orchestrator commits the full deliberation]
[Telegram bot pings the user with the verdict summary]
```

### Web UI — a Git Dashboard for Agent Decisions (NOT a chatbot)

The web UI is deliberately designed as a **git-visualization dashboard**, not a generic chat interface. Every UI action maps directly to a git operation visible in the repo. The UI exposes — does NOT hide — the git-native nature of the agent.

```
1. Run the backend bridge: ./serve.sh (FastAPI → gitclaw subprocess)
2. Open http://localhost:5173
3. Dashboard layout:

   ┌───────────────────────────────────────────────────────────────────────────┐
   │  Portfolio Council                              [main ▾] [Fork agent +]   │
   ├───────────────┬──────────────────────────────────┬────────────────────────┤
   │ SESSIONS      │  SESSION DETAIL                   │  LIVE AGENT ACTIVITY  │
   │ (git log)     │  (commit view)                    │  (file system stream) │
   │               │                                   │                        │
   │ ● 2026-05-23  │  Rebalance 2026-05-23             │  ▶ Analyst reading:    │
   │   APPROVED    │  Approved (A/S/R/E)                │    memory/user_plan   │
   │   Trim TCS    │  ─────────────────────             │  ✏ Writing:            │
   │               │  Analyst: TCS at 18% (cap 15%)…   │    workspace/analy…    │
   │ ● 2026-05-22  │  Strategist: Trim 4% over 3d…     │  ▶ Strategist:         │
   │   VETOED      │  Risk: APPROVE — drawdown 12%     │    reading proposal…   │
   │   IT timing   │  Execution: BUY @ ₹1620 limit…    │                        │
   │               │                                   │                        │
   │ ● 2026-05-20  │  [Revert this decision]            │                        │
   │   APPROVED    │  [Replay session]                  │                        │
   │   …           │                                   │                        │
   └───────────────┴──────────────────────────────────┴────────────────────────┘
```

**Core UI primitives (each maps to a git operation):**

| UI feature | Git operation under the hood | Why it matters |
|---|---|---|
| Session list | `git log --oneline` | Decision history visible |
| Click session → detail | `git show <commit>` | Full deliberation, file diffs |
| **Fork Agent** button | `git checkout -b <name>` | Create alternate personality (e.g., "aggressive-me") |
| Branch switcher dropdown | `git checkout <branch>` | Compare your default agent vs experimental |
| **Revert Decision** button | `git revert <commit>` + new commit | Undo a past trade decision, captured in audit |
| **Replay Session** button | `git checkout <commit>~1 && re-run agents` | See what agents WOULD have said with different rules |
| Diff view between sessions | `git diff <commit1> <commit2>` | Compare yesterday's vs today's portfolio state |
| Live activity stream | `inotify` / file system watcher → websocket | Watch agents write files in real time |

**What this UI is NOT:**
- ❌ A ChatGPT-style "send message → get response" interface
- ❌ A black-box product where gitclaw is hidden plumbing

**What this UI IS:**
- ✅ A git client wearing finance-friendly clothes
- ✅ The hackathon thesis ("agents as repos") made visible to non-CLI users
- ✅ The CLI flow's exact same operations, exposed as buttons

---

## 5. Architecture

```
portfolio-council/
├── agent.yaml                    # Orchestrator config
├── SOUL.md                       # Orchestrator identity
├── RULES.md                      # Auto-generated governance per user
├── SCOPE.md                      # This file
│
├── agents/                       # 5 sub-agents
│   ├── onboarding/
│   ├── analyst/
│   ├── strategist/
│   ├── risk/
│   └── execution/
│
├── skills/                       # 5+ skills wrapping Python
│   ├── import-holdings/          # Excel/CSV → holdings.json
│   ├── analyze-holdings/         # wraps scripts/analyze_holdings.py
│   ├── check-market/             # wraps scripts/check_market.py
│   ├── run-recovery-sim/         # wraps scripts/recovery_sim.py
│   ├── generate-pdf/             # wraps scripts/generate_portfolio_pdf.py
│   └── notify-telegram/          # sends verdict summary to Telegram
│
├── hooks/
│   └── pre_commit.py             # Blocks commits without Risk approval
│
├── memory/                       # Per-user knowledge (gitignored)
│   └── user_plan.md              # Generated by Onboarding
│
├── data/                         # gitignored
│   └── holdings.json             # User's uploaded holdings
│
├── reports/                      # Dated session reports (gitignored)
├── workspace/                    # Per-session drafts (gitignored)
├── scripts/                      # Existing Python (unchanged)
│
├── frontend/                     # Vite + React — Git Dashboard UI
│   ├── src/
│   │   ├── components/
│   │   │   ├── SessionList.tsx       # Git log of sessions (sidebar)
│   │   │   ├── SessionDetail.tsx     # Commit view with full deliberation
│   │   │   ├── LiveActivityStream.tsx # Real-time file write feed via WS
│   │   │   ├── BranchSwitcher.tsx    # Switch between agent personalities
│   │   │   ├── ForkAgentDialog.tsx   # Create new git branch
│   │   │   ├── RevertButton.tsx      # git revert via UI
│   │   │   ├── ReplaySession.tsx     # Re-run agents on past state
│   │   │   └── DiffView.tsx          # Compare two sessions
│   │   ├── api/                      # FastAPI client
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── server/                       # FastAPI bridge: HTTP/WS ↔ gitclaw + git
│   ├── main.py                       # REST endpoints + WebSocket for live stream
│   ├── git_ops.py                    # log, show, branch, revert, checkout
│   ├── gitclaw_runner.py             # subprocess invocation + output parsing
│   └── fs_watcher.py                 # inotify → websocket for live activity
│
└── notifications/
    └── telegram_bot.py           # Adapted from FinanceAnalyzer (signal alerts)
```

---

## 6. In Scope (must ship by Monday)

### Phase A — Core agent backend
- [x] Bootstrap repo + Azure OpenAI config + Initial commits
- [x] SCOPE.md (this file)
- [x] Root SOUL.md (5-agent orchestrator)
- [ ] **5 sub-agents** with their own SOUL.md + agent.yaml
- [ ] **5+ skills** wrapping existing Python scripts + Telegram notifier
- [ ] **1 pre-commit hook** enforcing Risk approval
- [ ] **1 end-to-end dry run** producing `reports/<date>-rebalance.md`
- [ ] Excel holdings upload via Onboarding flow
- [ ] Execution agent producing price-targeted recommendations

### Phase B — Git Dashboard UI (NOT a chat UI)
- [ ] **Vite + React + Tailwind frontend** — 3-pane layout (Sessions / Detail / Live Activity)
- [ ] **FastAPI bridge** (`server/main.py`) — REST + WebSocket for live file-write stream
- [ ] **`git_ops.py`** — wraps `log`, `show`, `branch`, `checkout`, `revert`, `diff`
- [ ] **`gitclaw_runner.py`** — spawns gitclaw subprocess, parses tool-call output
- [ ] **`fs_watcher.py`** — inotify on `workspace/` + `memory/` → WebSocket events
- [ ] **Session list view** — git log rendered as cards with verdict status
- [ ] **Session detail view** — full commit body rendered as deliberation transcript
- [ ] **Live activity stream** — file reads/writes streamed during a running session
- [ ] **Fork Agent flow** — modal → name a branch → `git checkout -b`
- [ ] **Branch switcher** — dropdown to switch between agent personalities
- [ ] **Revert Decision button** — modal asks for reason → `git revert` with that reason in commit body
- [ ] **Replay Session button** — `git checkout <commit>~1` + re-run agents, show diff
- [ ] **Diff view** — pick two sessions, see what changed

### Phase C — Telegram notifications
- [ ] **Telegram bot integration** (adapted from FinanceAnalyzer's `telegram_bot.py`)
- [ ] **Notify-telegram skill** that sends verdict summary after each session
- [ ] **Configurable**: user can opt in/out, set chat ID

### Phase D — Polish + submission
- [ ] README.md with pitch + architecture + run instructions + screenshots
- [ ] 90-second demo Loom (UI + terminal both shown)
- [ ] Public GitHub repo with sanitized data
- [ ] Inline architecture diagram (Mermaid)

---

## 7. Out of Scope (not building this weekend)

- ❌ Auth system (Clerk, NextAuth, etc.) — single-user local mode for MVP
- ❌ Hosted multi-tenant SaaS — self-hosted only
- ❌ Broker API integration (trade execution) — recommendation only
- ❌ Mobile app native build (web UI is responsive though)
- ❌ Real-time market data beyond yfinance
- ❌ TDD reviewer agent (roadmap item)
- ❌ Backwards compatibility with original portfolio_ai/

---

## 8. Roadmap (post-hackathon — pitch as future, do not build)

| Tier | Feature | Time |
|---|---|---|
| **v2** | Clerk auth (hosted single-user) | ~1 week |
| **v2** | TDD reviewer agent (auto-runs on every commit) | ~3 days |
| **v3** | Multi-tenant SaaS for advisors (one private repo per client) | ~1 month |
| **v3** | Broker API integration (Zerodha Kite, Groww) | ~2 weeks |
| **v3** | Tax-loss harvesting optimizer | ~2 weeks |
| **v4** | SEBI/RIA compliance audit pack | ~1 month |
| **v4** | Mobile native app (React Native) | ~3 weeks |

---

## 9. Demo Plan (90-second Loom)

The demo deliberately showcases **the git-native UI features** that you can't get from any other agent product. Every visible moment ties back to a git operation.

```
0:00  Title card: "Portfolio Council — your AI investment board, as a git repo"

0:05  Open the dashboard — show the 3-pane layout (Sessions / Detail / Activity)
      Sidebar already has 4-5 past sessions. The git log IS the activity feed.

0:12  Click "New Session" → live activity stream lights up on the right
      Watch agents work in real time — files being read, files being written
       → workspace/analysis-2026-05-23.md (Analyst writing)
       → workspace/proposal-2026-05-23.md (Strategist writing)
       → workspace/verdict-2026-05-23.md (Risk writing)
       → workspace/orders-2026-05-23.md (Execution writing)
      (~15 sec of visible agent activity)

0:35  Session completes — new card appears in Sessions sidebar
      Status badge: "APPROVED (A/S/R/E)"
      Click it → Detail pane shows the full deliberation transcript

0:45  ★ HERO MOMENT — click "Fork Agent" ★
      Modal: "Create alternate personality. Name: ____"
      Type "aggressive-me" → creates git branch
      Branch switcher (top right) now shows: main ▾  ↔  aggressive-me

0:55  Switch to aggressive-me, re-run the same review
      Sidebar shows TWO timelines side by side now (default vs aggressive)
      Same data, different agent personality → different recommendations
      "I just A/B-tested my investment thesis with my own AI."

1:08  Click a previously VETOED commit (from earlier in the demo)
      Show: full deliberation, Risk's reasoning, "Replay Session" button visible

1:15  Telegram screenshot side-by-side: "Verdict APPROVED — Trim TCS 4% over 3d"

1:20  Closing card:
      "Built on gitclaw. The UI exposes what gitclaw makes possible.
       github.com/<you>/portfolio-council — open-source."
```

**What this demo proves to Lyzr:**
1. The agents work end-to-end (Phase A)
2. The UI doesn't hide gitclaw — it celebrates git operations (Phase B)
3. "Fork your agent" is a real UI feature backed by `git branch` — that's only possible because of gitclaw's architecture
4. The audit trail is intrinsic, not bolted on
5. The Telegram bot covers the accessibility/mobile angle (Phase C)

---

## 10. Submission Deliverables

1. **Public GitHub repo** (sanitized — no real holdings or personal financial data)
2. **README.md** with: pitch, architecture diagram, install/run instructions, screenshots
3. **90-second demo Loom** URL
4. **Inline architecture diagram** in README (Mermaid)
5. **Telegram bot link** for testing (optional — could be a screenshot)
6. **Live web UI** if hosted (optional — local instructions are sufficient)

---

## 11. Definition of Done

A stranger can:
- Clone the repo
- Set up `.env`
- Either: (a) run `gitclaw --dir .` in terminal, OR (b) start the backend + frontend and use the web UI
- Complete Onboarding (fake goal, fake holdings)
- Trigger a portfolio review
- See 5 agents debate live
- Get a signed commit with the deliberation
- Receive a Telegram notification with the verdict (if configured)
- All in under 5 minutes

If that works end-to-end, we ship.

---

## 12. Built with gitclaw — and the UI proves it

This product is **built on gitclaw, built using gitclaw, and the UI is a visualization of gitclaw**:

- **Build layer**: gitclaw (the agent) writes the SOUL.md / RULES.md / sub-agent / skill / hook files for the product. Every meaningful product artifact is gitclaw-authored, visible in `git log`.

- **Runtime layer**: when a user runs Portfolio Council, gitclaw IS the engine running each sub-agent. Same gitclaw binary, different config per agent.

- **UI as gitclaw visualization**: the web dashboard is deliberately designed to **expose** gitclaw's git-native architecture — not hide it. Every UI primitive maps 1:1 to a git operation:
  - Session list = `git log`
  - Session detail = `git show <commit>`
  - Fork Agent = `git checkout -b <new-branch>`
  - Branch switcher = `git checkout <branch>`
  - Revert Decision = `git revert <commit>`
  - Replay Session = `git checkout <commit>~1` + agent re-run
  - Diff view = `git diff <commit1> <commit2>`
  - Live activity stream = `inotify` on the repo's workspace + memory dirs

  **A judge looking at this UI cannot conclude "gitclaw is replaceable" — the UI's killer features only make sense BECAUSE the runtime is gitclaw.**

- **Telegram bot** is a lightweight accessibility layer — sends verdict summaries via DM. Marshals minimal data; does not hide gitclaw.

The product cannot exist without gitclaw. The product was built by gitclaw. The UI is a window into gitclaw. That's the hackathon thesis at three layers.

---

*This file is the contract. Scope changes after this require explicit re-negotiation.*
