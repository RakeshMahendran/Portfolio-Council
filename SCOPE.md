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

### Web UI (optional alternative to CLI)

Users who don't want to use a terminal can access the same agent flow via a chat UI:

```
1. Run the backend: gitclaw --dir . (in server mode)
2. Open the Vite + React frontend at http://localhost:5173
3. Same onboarding flow — but as forms + chat
4. Trigger sessions from the dashboard
5. View past reports and the git log in the UI
```

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
├── frontend/                     # Vite + React UI (chat + dashboard)
│   ├── src/
│   ├── package.json
│   └── ...
│
├── server/                       # Thin FastAPI bridge: HTTP ↔ gitclaw
│   └── main.py
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

### Phase B — Web UI
- [ ] **Vite + React frontend** (chat interface + dashboard)
- [ ] **FastAPI bridge** (HTTP ↔ gitclaw subprocess/SDK)
- [ ] **Chat-based onboarding flow** (same questions as CLI, but as UI forms)
- [ ] **Session dashboard** showing past reports + git log

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

```
0:00  Title card: "Portfolio Council — your AI board of directors"
0:05  Open the web UI — user clicks "New Session"
0:10  Chat onboarding (compressed): 3-4 questions visible
0:25  User uploads Excel holdings → table renders
0:30  Click "Run portfolio review"
0:35  Live debate panel — 5 agents update in real time
       → Analyst: "TCS at 18%, above 15% cap"
       → Strategist: "Trim TCS 4%, add HDFCBANK, cash buffer"
       → Risk: "VETO — drawdown sim shows 24% under stress"
       → Strategist: "AMEND — execute over 3 days"
       → Risk: "APPROVE"
       → Execution: "BUY HDFCBANK at ₹1620 (current ₹1635 — wait for dip)"
0:55  Telegram notification arrives on phone (side-by-side screen)
1:00  Open git log — show signed commits across sessions
1:15  Click a previously VETOED commit — show full deliberation
1:25  Closing: "Built on gitclaw. Open-source. github.com/<you>/portfolio-council"
```

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

## 12. Built with gitclaw

This product is **built on gitclaw and built using gitclaw**:

- **Build layer**: gitclaw (the agent) writes the SOUL.md / RULES.md / skill / hook files for the product. Every meaningful product artifact is gitclaw-authored, visible in `git log`.
- **Runtime layer**: when a user runs Portfolio Council, gitclaw IS the engine running each sub-agent. Same gitclaw binary, different config per agent.
- **Integration layer**: the web UI and Telegram bot are thin shells around gitclaw — they marshal user input into gitclaw prompts and capture gitclaw output for display.

The product cannot exist without gitclaw. The product was built by gitclaw. That's the hackathon thesis.

---

*This file is the contract. Scope changes after this require explicit re-negotiation.*
