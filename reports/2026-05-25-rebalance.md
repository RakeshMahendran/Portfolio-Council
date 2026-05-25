# Rebalance Report — 2026-05-25

**Not investment advice.** This report is the output of an open-source research / educational tool that simulates a multi-agent governance flow. It is **not** issued by a SEBI-registered investment adviser or research analyst. Outputs are illustrations of how the Council reasons, not personalized recommendations. Consult a SEBI RIA before acting. Past performance ≠ future results.

---

## Executive Summary

**Session Type:** REBALANCE  
**Date:** 2026-05-25  
**Portfolio Value:** ₹15.04 lakh (₹10.58L equity + ₹3.98L cash/FD + ₹48K gold)  
**Goal:** ₹40 lakh house down-payment by June 2027 (13 months remaining)

**Decision:** **APPROVED** (Risk Officer verdict v2)

**Actions Approved:**
- **Exit 5 positions:** BSE (+112%), CUMMINSIND (+54%), PRAJIND (-43%), BAJAJHFL (-44%), RVNL (-38%)
- **Deploy ₹2.0L to debt funds:** ₹1L liquid fund + ₹1L short-duration debt fund
- **Net effect:** Equity 84% → 77% (-7.3pp); Debt 0% → 16% (new allocation)
- **Proceeds:** ₹91,800 from exits + ₹1.08L from reserves → ₹2L debt deployment

**Rationale:** Initiate glide-path de-risking for 13-month capital-preservation goal. Exit overvalued winners (BSE PE 80.2, CUMMINSIND PE 66.7) and fundamentally weak/underwater positions (PRAJIND, BAJAJHFL, RVNL) to reduce portfolio volatility and eliminate speculative bets incompatible with LOW risk profile. This is the first of 4-6 monthly rebalances that will progressively rotate equity → debt/liquid instruments through Q1 2027 (3-4 months before June 2027 goal).

**Session Flow:**
1. **Analyst** (analysis-2025-05-25.md) → Observed 84% equity allocation with ₹24.96L gap to goal; flagged 3 overvalued positions (BSE, CUMMINSIND, PRAJIND) and 3 large losers (BAJAJHFL -44%, RVNL -38%, PRAJIND -43%)
2. **Strategist v1** (proposal-2025-05-25.md) → Proposed exit 3 positions + ₹1.5L debt deployment
3. **Risk Officer v1** (verdict-2026-05-25.md) → **AMEND** — Required: (a) exit BAJAJHFL+RVNL (eliminate ₹20.5K underwater exposure), (b) increase debt to ₹2.0L, (c) add tax-loss harvesting protocol
4. **Strategist v2** (proposal-v2-2026-05-25.md) → Revised proposal incorporating all AMEND requirements
5. **Risk Officer v2** (verdict-v2-2026-05-25.md) → **APPROVE** — All Hard Rules pass
6. **Execution** (orders-2026-05-25.md) → Translated to 7 price-targeted orders for manual execution

---

## Section 1: Portfolio Analysis (Analyst)

**Full report:** `agents/analyst/workspace/analysis-2025-05-25.md`

### Key Findings

**Portfolio Snapshot (as of 2026-05-25 03:57 IST):**
- **29 positions:** ₹10.58L market value (+0.64% unrealized P/L vs. ₹10.52L invested cost)
- **Biggest winners:** BSE +112% (₹24.6K gain), CUMMINSIND +54% (₹5.7K gain), GOLDBEES +22% (₹6.5K gain)
- **Biggest losers:** BAJAJHFL -44% (₹8K loss), PRAJIND -43% (₹6.4K loss), RVNL -38% (₹6.4K loss)
- **Concentration:** 8 positions above 4% (₹5.16L total, 48.8% of portfolio); largest is MUTHOOTFIN 8.85%
- **Liquidity:** ₹3.98L cash/FD (289% of ₹1.38L minimum buffer) — adequate

**Market Environment:**
- NIFTY: 23,972 (+0.18%), VIX: 17.04 (moderate fear), Bank Nifty: +1.59% (strong)
- Broad rally (17 green vs. 2 red in NIFTY top 20)
- Favorable conditions for rebalancing execution

**Compliance Check:**
- ✅ All positions under 15% concentration cap (Hard Rule #2)
- ✅ Liquidity buffer adequate (Hard Rule #3)
- ⚠️ **Equity exposure 84%** — mismatched with 13-month capital-preservation horizon (Hard Rules #3, #6)
- ⚠️ **3 positions flagged for exit:** BSE (PE 80.2, overbought RSI 78.6), CUMMINSIND (PE 66.7, near-zero ROE), PRAJIND (PE 135.6, weak fundamentals)

**Goal Progress:**
- Gap to ₹40L goal: ₹24.96L
- Required monthly progress: ₹1.92L (given 13 months remaining)
- Available monthly surplus: ₹1.80L
- **Shortfall: ₹12K/month** (6.3%) — manageable with minor household contribution increase OR corpus growth

**Strategist Priority:** Initiate glide-path de-risking to reduce equity from 84% → 60-70% over next 4-6 months.

---

## Section 2: Rebalancing Proposal v2 (Strategist — APPROVED)

**Full report:** `agents/strategist/workspace/proposal-v2-2026-05-25.md`

### Proposed Actions

| # | Action | Symbol | Qty | Price | Amount | Rule | Rationale |
|---|--------|--------|-----|-------|--------|------|-----------|
| 1 | SELL | BSE | 11 | ₹4,237 | ₹46,611 | HR #6 | Exit overvalued (PE 80.2, RSI 78.6) before reversion |
| 2 | SELL | CUMMINSIND | 3 | ₹5,392 | ₹16,175 | HR #6 | Exit overvalued (PE 66.7, near-zero ROE) |
| 3 | SELL | PRAJIND | 22 | ₹387 | ₹8,503 | HR #6 | Exit weak fundamentals (PE 135.6, OPM 2.5%) |
| 4 | SELL | BAJAJHFL | 121 | ₹83 | ₹10,099 | HR #6 | Exit underwater (-44%); eliminate speculation |
| 5 | SELL | RVNL | 38 | ₹274 | ₹10,412 | HR #6 | Exit underwater (-38%); eliminate mean-reversion bet |
| 6 | BUY | Liquid Fund | NAV | — | ₹1,00,000 | HR #3 | Glide-path de-risking; T+1 liquidity |
| 7 | BUY | Short Debt Fund | NAV | — | ₹1,00,000 | HR #3 | 7-8% yield; 1-3 year maturity aligns with goal |

**Total Proceeds:** ₹91,800 (equity exits)  
**Total Deployment:** ₹2,00,000 (₹91.8K proceeds + ₹108.2K from cash reserves)

### Portfolio Impact

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Equity Value | ₹10.58L | ₹9.66L | -₹91.8K |
| Equity % | 84.2% | 76.9% | **-7.3pp** |
| Debt Allocation | ₹0 | ₹2.00L | **+₹2.00L** |
| Debt % | 0% | 15.9% | **+15.9pp** |
| Cash/FD | ₹3.98L | ₹2.90L | -₹1.08L |
| Liquidity Buffer | 289% | 210% | -79pp (still 110% above minimum) |
| Positions | 29 | 24 | -5 |
| Largest Position | 8.85% | 9.7% | +0.85pp (MUTHOOTFIN) |

**Hard Rules Compliance:**
- ✅ HR #1 (Goal): No negative impact; improved risk-adjusted trajectory
- ✅ HR #2 (Concentration): Largest position 9.7% (under 15% cap)
- ✅ HR #3 (Glide Path): 15.9% now in capital-safe debt; -7.3pp equity reduction initiates glide path
- ✅ HR #4 (No Leverage): Zero margin used
- ✅ HR #5 (No Speculation): All instruments are regulated equities/debt funds
- ✅ HR #6 (Capital Preservation): Eliminates ₹20.5K underwater exposure; exits overvalued positions
- ✅ HR #7 (Liquidity): All exits are liquid stocks (₹23Cr–₹127Cr daily volume)

**Stress Test (Worst-Case Scenario):**
- NIFTY -10% shock: -₹1.18L equity loss + -₹1K debt MTM = -₹1.19L total (-7.9% corpus)
- vs. v1 proposal (retained BAJAJHFL/RVNL): -₹1.23L (-8.2%)
- **Improvement:** ₹4K less loss in crash scenario

**Tax Optimization:**
- **Gains:** BSE +₹24,638 + CUMMINSIND +₹5,661 = ₹30,299
- **Losses:** PRAJIND -₹6,422 + BAJAJHFL -₹8,036 + RVNL -₹6,431 = ₹20,889
- **Net:** ₹9,410 taxable (if all STCG) → Tax: ₹1,411 (15%)
- **Without offsetting:** ₹30,299 × 15% = ₹4,545 tax
- **Savings:** ₹3,133 (68% tax reduction) — see Execution section for protocol

---

## Section 3: Risk Verdict v2 (Risk Officer — APPROVED)

**Full report:** `workspace/verdict-v2-2026-05-25.md`

### Verdict: APPROVE

**Summary:** All three required amendments from v1 AMEND verdict incorporated. Proposal now eliminates speculative position retention (BAJAJHFL/RVNL underwater bets), accelerates glide-path de-risking to -7.3pp equity reduction (vs. -5.6pp in v1), and includes comprehensive tax-loss harvesting protocol. All 7 Hard Rules pass.

### Hard Rule Review (v2)

1. **Goal Commitment (HR #1):** PASS — Maintains corpus value; improves risk-adjusted goal trajectory
2. **Concentration Cap (HR #2):** PASS — Largest position 9.7% (MUTHOOTFIN), under 15% cap
3. **Glide Path (HR #3):** **PASS** (upgraded from CONDITIONAL in v1) — ₹2L debt deployment (15.9% of corpus) meets minimum -7pp equity reduction threshold for 13-month timeline
4. **No Leverage (HR #4):** PASS — Zero margin; all cash-funded from existing reserves
5. **No Speculation (HR #5):** PASS — Regulated equities + debt funds only; zero F&O/crypto
6. **Capital Preservation (HR #6):** **PASS** (upgraded from FAIL in v1) — BAJAJHFL/RVNL exits eliminate ₹20.5K underwater exposure and ₹14.5K unrealized loss; no speculative "oversold bounce" bets retained
7. **No Illiquid Stocks (HR #7):** PASS — All exits trade at ₹23Cr–₹127Cr daily volume (liquid)

### Adversarial Concerns Resolved

**v1 Concern 1 (Speculative Underwater Position Retention):**  
✅ RESOLVED — BAJAJHFL and RVNL now in exit list per v2 Actions #4-5

**v1 Concern 2 (Insufficient Debt Deployment):**  
✅ RESOLVED — Increased from ₹1.5L → ₹2.0L; equity reduction -5.6pp → -7.3pp

**v1 Concern 3 (Sell-Into-Strength Risk on BSE):**  
✅ MAINTAINED — Risk Officer continues to support BSE exit despite potential upside; PE 80.2 valuation risk outweighs further gain potential at 13-month horizon

**v1 Concern 4 (No Tax-Loss Harvesting):**  
✅ RESOLVED — Section 7 of v2 proposal includes detailed execution protocol for STCG gain/loss offsetting

**v1 Concern 5 (Stress Test Worst-Case Shortfall):**  
✅ PARTIALLY RESOLVED — Exiting BAJAJHFL/RVNL eliminates ₹4.1K controllable risk; remaining shortfall (₹21K/month if -10% NIFTY shock) is uncontrollable macro risk

### Approval Conditions

- Execution agent must confirm purchase dates for all 5 exits (BSE, CUMMINSIND, PRAJIND, BAJAJHFL, RVNL) before placing orders to enable STCG/LTCG tax optimization
- If purchase dates unavailable, flag as "INCOMPLETE — user to provide post-session"
- Orders are recommendation only; user places manually (no broker API integration)

**Cleared for Execution Agent to translate into orders.**

---

## Section 4: Execution Orders (Execution Agent)

**Full report:** `agents/execution/workspace/orders-2026-05-25.md`

### Order List (Price-Targeted)

**Phase 1: Equity Exits (Monday May 26, 09:20-09:45 AM IST)**

| Order | Symbol | Action | Qty | Order Type | Price | Proceeds |
|-------|--------|--------|-----|------------|-------|----------|
| 1 | BSE | SELL | 11 | LIMIT | ₹4,213.00 | ₹46,343 |
| 2 | CUMMINSIND | SELL | 3 | LIMIT | ₹5,364.44 | ₹16,093 |
| 3 | PRAJIND | SELL | 22 | LIMIT | ₹384.42 | ₹8,457 |
| 4 | BAJAJHFL | SELL | 121 | LIMIT | ₹83.04 | ₹10,048 |
| 5 | RVNL | SELL | 38 | LIMIT | ₹272.63 | ₹10,360 |

**Total Equity Exits:** ₹91,301 (all LIMIT orders at -0.5% from current market price to avoid gap-down slippage)

**Phase 2: Debt Purchases (Tuesday May 27, post-T+1 settlement)**

| Order | Fund | Action | Amount | Settlement |
|-------|------|--------|--------|------------|
| 6 | Liquid Fund (IDFC Cash / Parag Parikh) | BUY | ₹1,00,000 | NAV-based, T+1 |
| 7 | Short Duration Debt Fund (ICICI ST / HDFC ST) | BUY | ₹1,00,000 | NAV-based, T+1 to T+3 |

**Total Debt Deployment:** ₹2,00,000 (₹91.3K from equity exits + ₹108.7K from cash reserves)

### Execution Timeline

- **Monday, May 26:**
  - 09:00 AM: Pre-market prep — Check purchase dates for tax coordination (CRITICAL)
  - 09:15 AM: Market open
  - 09:20-09:45 AM: Place 5 SELL LIMIT orders (Phase 1)
  - 10:00 AM: Verify all fills; switch to MARKET if LIMIT orders unfilled
  - End of day: Confirm T+0 execution; proceeds credited to trading account
  
- **Tuesday, May 27:**
  - 10:00 AM: Proceeds settle (T+1); transfer ₹2L to mutual fund platform
  - 11:00 AM: Place 2 debt fund BUY orders (Phase 2)
  
- **Wednesday-Thursday, May 28-29:**
  - Confirm debt fund units allocated (T+1 to T+3 settlement)
  - Update `data/holdings.json` to reflect: (a) remove 5 exited positions, (b) add 2 debt fund positions

### Tax-Loss Harvesting Protocol (CRITICAL)

**BEFORE placing Monday orders, user MUST:**

1. Log into broker platform → check purchase dates for:
   - BSE (11 shares at avg ₹1,997.58)
   - CUMMINSIND (3 shares at avg ₹3,504.58)
   - PRAJIND (22 shares at avg ₹678.42)
   - BAJAJHFL (121 shares at avg ₹149.87)
   - RVNL (38 shares at avg ₹443.24)

2. **IF all purchase dates are >12 months ago (before May 26, 2024):**
   - All gains/losses qualify as LTCG (10% tax on gains >₹1L; losses non-deductible)
   - Net LTCG: BSE ₹24,638 + CUMMINSIND ₹5,661 = ₹30,299 (below ₹1L exemption) → **₹0 tax**
   - No tax optimization needed; proceed with standard execution sequence

3. **IF ANY purchase date is <12 months ago (after May 26, 2024):**
   - Gains/losses qualify as STCG (15% flat tax; losses can offset gains)
   - Coordinate all 5 exits within SAME FISCAL YEAR (FY 2025-26 ends March 31, 2026)
   - **Net STCG:** ₹30,299 gains - ₹20,889 losses = ₹9,410 taxable → Tax: ₹1,411 (15%)
   - **vs. uncoordinated:** ₹30,299 × 15% = ₹4,545 tax → **SAVES ₹3,133**

4. **IF purchase dates unavailable:**
   - Flag as "INCOMPLETE — tax optimization blocked; user to provide dates post-session"
   - Proceed with execution but inform user they may face 68% higher tax liability if STCG applies

**Tax-loss harvesting is NOT a blocker for execution (Soft Rule #4), but missing it costs ₹3,133 if positions are STCG.**

### Risk Mitigations

1. **Gap-Down Risk:** LIMIT orders at -0.5% protect against market-open slippage
2. **Unfilled Orders:** If LIMIT orders don't fill by 10:00 AM, switch to MARKET orders to guarantee execution
3. **Platform Failures:** Have backup broker app ready (e.g., if Zerodha fails, use Groww)
4. **Partial Fills:** If only 2-3 of 5 orders fill, pause and re-engage Strategist (don't proceed with debt deployment)
5. **Tax Coordination Miss:** If user skips purchase-date check, document as "tax optimization incomplete" in post-execution report

### Post-Execution Checklist

- [ ] Monday EOD: Verify all 5 exits executed; ₹91.3K proceeds in trading account
- [ ] Tuesday: Transfer ₹2L to mutual fund platform; place 2 debt fund orders
- [ ] Wednesday-Thursday: Confirm debt fund units allocated; NAVs applied correctly
- [ ] Friday: Update `data/holdings.json` (remove 5 exits, add 2 debt funds)
- [ ] Friday: Update user plan memo with "First glide-path tranche complete; equity 84% → 77%"
- [ ] Week of June 2: Run next monthly review session (target: equity 77% → 70%)

**If orders don't fill within 8 days (June 3 deadline), re-engage Strategist for market re-evaluation.**

---

## Forward Plan

**Next review due:** June 25, 2026 (in ~31 days)

**Monthly SIPs (proposed for next session):**
- Not applicable — this session focused on de-risking existing holdings
- Next session Strategist should propose systematic debt fund SIPs of ₹50-75K/month to automate glide-path deployment from the ₹1.8L monthly surplus

**Future tranches (conditional):**
- **Tranche 2 (June 2026):** Deploy additional ₹1.5-2L to debt funds IF equity markets remain elevated; target equity 77% → 70%
- **Tranche 3 (July 2026):** Continue progressive de-risking; target equity 70% → 60-65%
- **Tranche 4 (Aug-Sep 2026):** Assess goal progress; if on track, maintain 60-65% equity; if behind, accelerate to 50-55%
- **Final Quarter (Q1 2027, Jan-Mar):** Move to 60-70% capital-safe allocation (debt/liquid/FD) per Hard Rule #3; equity should be <40% by March 2027

**Come back sooner if:**
- NIFTY drops >10% (triggers mid-month review to assess buying opportunity vs. further de-risking)
- VIX > 25 (elevated volatility requires risk reassessment)
- Major life change (job loss, medical emergency, wedding preponed/postponed)
- Windfall (bonus, inheritance, property sale) — deploy per glide-path rules rather than lump-sum into equity

**Expected trajectory:**
- **May 2026 (today):** 84% → 77% equity (first tranche)
- **June 2026:** 77% → 70% (second tranche)
- **July-Aug 2026:** 70% → 60-65% (third/fourth tranches)
- **Sep-Dec 2026:** Maintain 60-65% (5-7 months to goal)
- **Jan-Mar 2027:** Move to 60-70% capital-safe (debt/liquid/FD); equity <40%
- **April-May 2027:** Final pre-goal review; ensure 70-80% capital-safe
- **June 2027:** Goal month — liquidate debt funds → transfer ₹40L to savings for house purchase

**This is a multi-session de-risking journey, not a one-time rebalance. Come back monthly.**

---

## Session Metadata

**Date:** 2026-05-25  
**Session ID:** 64041b15-7195-4b4e-966b-39a8767f1c9a  
**Session Type:** REBALANCE  
**Proposal Version:** v2 (amended from v1 per Risk Officer requirements)  
**Risk Verdict:** APPROVE (v2)  
**Agents Involved:** Analyst → Strategist (v1 + v2) → Risk Officer (v1 AMEND + v2 APPROVE) → Execution  

**Artifacts Generated:**
- `agents/analyst/workspace/analysis-2025-05-25.md` (12KB, 7 sections)
- `agents/strategist/workspace/proposal-2025-05-25.md` (21KB, v1 original)
- `workspace/verdict-2026-05-25.md` (16KB, v1 AMEND)
- `agents/strategist/workspace/proposal-v2-2026-05-25.md` (28KB, v2 revised)
- `workspace/verdict-v2-2026-05-25.md` (10KB, v2 APPROVE)
- `agents/execution/workspace/orders-2026-05-25.md` (26KB, 7 orders)
- `reports/2026-05-25-rebalance.md` (this file)

**Git Commit Pending:** Orchestrator will commit this report with message:
```
Rebalance 2026-05-25: Exit 5 positions (BSE, CUMMINSIND, PRAJIND, BAJAJHFL, RVNL) + deploy ₹2L debt; equity 84%→77% — APPROVED (Analyst/Strategist v2/Risk v2/Execution)
```

---

## Compliance Footer

**Not investment advice.** This report is the output of an open-source research / educational tool that simulates a multi-agent governance flow. It is **not** issued by a SEBI-registered investment adviser or research analyst. Outputs are illustrations of how the Council reasons, not personalized recommendations. Consult a SEBI RIA before acting. Past performance ≠ future results.

**Limitations:**
- Holdings data lacks purchase dates → tax optimization incomplete
- No recovery simulation script (recovery_sim.py) → stress tests are manual calculations
- Market prices are T-0 snapshot (2025-05-25 03:57 IST); may differ at Monday open
- This is a recommendation only; execution risk belongs to user

**Audit Trail:** All artifacts version-controlled in git. Run `git log reports/2026-05-25-rebalance.md` to inspect session history.

---

**Session Complete. Execution window: Monday, May 26, 2026, 09:15 AM IST.**
