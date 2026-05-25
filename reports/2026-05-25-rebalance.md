# Rebalance Report — 2026-05-25

**Not investment advice.** This report is the output of an open-source research / educational tool that simulates a multi-agent governance flow. It is **not** issued by a SEBI-registered investment adviser or research analyst. Outputs are illustrations of how the Council reasons, not personalized recommendations. Consult a SEBI RIA before acting. Past performance ≠ future results.

---

## Executive Summary

**Decision:** APPROVED with 11 execution conditions  
**Session Type:** Rebalance (monthly review)  
**Session Date:** 2026-05-25  
**Agent Sign-Offs:** Analyst → Strategist → Risk Officer → Execution (all complete)

### The Situation
Portfolio worth ₹13.33L toward ₹40L house down-payment goal by June 2027 (13 months away). Current equity allocation of 66.5% (₹8.87L) is aggressive for a short, capital-preservation horizon. Emergency liquidity buffer is DEFICIENT by ₹1.48L (have ₹3.98L, need ₹5.46L per RULES.md). Three holdings deeply underwater: BAJAJHFL -44%, PRAJIND -42%, RVNL -38%. One position (BSE Ltd) up 115% but trading at extreme valuations (PE 81.2, RSI 79.8).

### The Decision
Sell 6 positions to raise ₹1.14L for Fixed Deposit, restoring liquidity compliance to 95% (up from 72.9%) and de-risking equity allocation from 66.5% to 52.4%. Exit two illiquid losers (BAJAJHFL, PRAJIND), book profit from overvalued winners (BSE, CUMMINSIND), and trim volatile ETFs (MIDCAP, SMALLCAP). Risk Officer approved despite timing concerns (selling into momentum) and incomplete liquidity restoration (₹27K still short), citing Hard Rule #6 (capital preservation > growth) and the urgency of the emergency-fund deficiency.

### The Orders
6 LIMIT orders to execute May 25-27:
1. SELL BAJAJHFL -121 @ ₹83.00 → ₹10,043
2. SELL PRAJIND -22 @ ₹393.00 → ₹8,646
3. SELL BSE -11 @ ₹4,280.00 → ₹47,080
4. SELL CUMMINSIND -3 @ ₹5,370.00 → ₹16,110
5. SELL MIDCAP -1,000 @ ₹18.00 → ₹18,000
6. SELL SMALLCAP -300 @ ₹45.50 → ₹13,650

**Total proceeds:** ₹1,13,529 (net ₹1,10,747 after ₹2,782 STCG tax)  
**Action:** Transfer ₹1,13,529 to Fixed Deposit

### Next Steps
- **Immediate:** Place all 6 orders today (May 25) or tomorrow (May 26)
- **Settlement:** Confirm ₹1.14L in trading account by May 27-28 (T+1 to T+2)
- **FD Transfer:** Move full proceeds to FD before May 31
- **Next Review:** June 25, 2026 (monthly cadence)
- **June Plan:** Close ₹27K liquidity gap (₹30K from June surplus → FD), trim equity to 45% (exit ₹70-80K more), deploy ₹1-1.2L to liquid/debt fund

---

## Analyst Report Summary

**From:** `workspace/analysis-2026-05-25.md` (11:49 AM IST, live market data)

### Portfolio Snapshot (₹13.33L)
- **Equity:** ₹8,87,386 (66.56%) — 29 positions (stocks + ETFs)
- **Liquid:** ₹3,98,000 (29.86%) — ₹3,08,000 cash + ₹90,000 FD
- **Gold:** ₹47,771 (3.58%) — GOLDBEES/SILVERBEES + physical/digital

### Key Findings
1. **Liquidity DEFICIENT:** ₹3.98L available vs. ₹5.46L required (3× monthly outflows ₹1.82L) → 27.1% shortfall (₹1.48L)
2. **Equity too high:** 66.5% allocation for 13-month capital-safe horizon violates de-risking glide path (should be trending toward 20-25% by March 2027)
3. **Deep losers:** BAJAJHFL -44% (₹8,055 loss), PRAJIND -42% (₹6,265 loss), RVNL -38% (₹6,490 loss) — ₹20,810 combined unrealized losses
4. **Overvalued winners:** BSE +115% but PE 81.2 (vs. NIFTY ~25-27), RSI 79.8 overbought; CUMMINSIND +54% but "valuation FAIL, near-zero ROE" per fundamentals
5. **Concentration:** MUTHOOTFIN 7.05% highest position (well under 15% cap, no violations)
6. **Market context:** NIFTY 24,050 (+0.51% today), VIX 16.70 (-6.7%, moderate fear), broad rally (16 green / 3 red) — favorable for rebalancing

### Goal Progress
- **Current:** ₹13.33L
- **Target:** ₹40L by June 2027 (13 months)
- **Gap:** ₹26.67L
- **Monthly SIP capacity:** ₹1.80L
- **Required monthly progress:** ₹2.05L (including portfolio returns) → needs 18-19% annualized portfolio return
- **Status:** Aggressive return target; achievable but requires de-risking into capital-safe instruments to prevent drawdown from derailing goal

---

## Strategist Proposal Summary

**From:** `workspace/proposal-2026-05-25.md`

### Primary Plan: Sell 6, Restore Liquidity, De-Risk Equity

#### Proposed Actions (with rule citations)
| Action | Symbol | Qty | Price | Proceeds | Rule | Rationale |
|--------|--------|-----|-------|----------|------|-----------|
| SELL | BAJAJHFL | -121 | ₹83.30 | ₹10,079 | HR #6, #7, SR #1 | Loss -44%; illiquid; no recovery catalyst in 13 months |
| SELL | PRAJIND | -22 | ₹393.65 | ₹8,660 | HR #6, #7, SR #1 | Loss -42%; PE 138 extreme; infra recovery speculative |
| SELL | BSE | -11 | ₹4,291.20 | ₹47,203 | HR #6, SR #1 | Gain +115% but PE 81 unsustainable; book before reversion |
| SELL | CUMMINSIND | -3 | ₹5,382.00 | ₹16,146 | HR #6, SR #1 | Gain +54%; weak ROE; fundamentals lag price |
| SELL | MIDCAP | -1,000 | ₹18.02 | ₹18,020 | HR #3, #6, SR #1 | Trim volatile ETF; raise liquidity |
| SELL | SMALLCAP | -300 | ₹45.56 | ₹13,668 | HR #3, #6, SR #1 | Trim volatile ETF; incompatible with capital-safe mandate |
| TRANSFER | Cash → FD | — | — | -₹113,776 | HR #3 | Restore liquidity buffer 72.9% → 95% |

**Total raised:** ₹1,13,776 | **Tax:** ₹2,800 STCG | **Net:** ₹1,10,976

#### Portfolio Impact
- **Liquidity:** ₹3.98L → ₹5.19L (72.9% → 95.0% compliant, ₹27K short of perfect)
- **Equity:** ₹8.87L → ₹6.99L (66.5% → 52.4% allocation)
- **Positions:** 29 → 27 (exits: BSE, BAJAJHFL, PRAJIND, CUMMINSIND)
- **Concentration:** MUTHOOTFIN 7.05% → 10.08% (denominator effect; still under 15% cap)

#### Stress Tests (all PASS or MARGINAL PASS)
- **NIFTY -10%:** Liquidity holds, goal requires 18-19% return (feasible)
- **MUTHOOTFIN +20% surge:** Concentration drops to 8.33% (denominator effect, no breach)
- **Combined stress (-10% NIFTY + MUTHOOTFIN -15%):** Marginal pass, requires 19.8% return (at edge of feasible)
- **Small/mid-cap -15% correction:** 18.2% return needed (feasible)

#### Weaknesses (Strategist self-disclosed)
1. **Timing risk:** Selling BSE/CUMMINS into momentum (could rally another 10-20% before reversing)
2. **Loss crystallization:** ₹14,321 realized losses without recovery attempt (BAJAJHFL/PRAJIND could bounce)
3. **Equity still high:** 52.4% for 13-month horizon is better but not "substantially capital-safe" yet (needs Phase 2 trim to 45%, then 35%, then 20-25% by March 2027)
4. **Liquidity 5% short:** 95% compliant leaves ₹27K gap (requires June surplus to close)

#### Plan B Options (Strategist offered 3 alternatives)
- **Option 1 (Staged exits):** Sell losers first, BSE/CUMMINS over 7 days → lower timing risk, delayed compliance
- **Option 2 (Ultra-conservative):** Exit losers only, preserve winners → 79.9% liquidity (still deficient)
- **Option 3 (Aggressive):** Exit ₹2.09L, equity → 44.2%, liquidity 111.2% → one-shot glide path, high regret risk

**Strategist's Recommendation:** Primary plan balances all constraints.

---

## Risk Officer Verdict Summary

**From:** `workspace/verdict-2026-05-25.md`

### Verdict: APPROVE WITH RESERVATIONS

**One-line summary:** Proposal passes all 7 Hard Rules and materially improves liquidity compliance (72.9% → 95.0%) while de-risking equity allocation (66.5% → 52.4%) for the 13-month capital-preservation horizon; approved despite timing risk on profit-booking and incomplete liquidity restoration.

### Hard Rules Compliance: 7/7 PASS ✅
1. **Goal commitment:** PASS — All actions protect corpus for ₹40L goal
2. **Concentration cap (15%):** PASS — MUTHOOTFIN 10.08% post-rebalance, stress-tested to 20% surge (no breach)
3. **Liquidity / capital-safe glide path:** PASS — 22.1pp improvement, equity de-risked 14.16pp
4. **No new debt/leverage:** PASS — Zero margin/borrowing
5. **No speculative instruments:** PASS — Exits reduce speculative exposure
6. **Capital preservation priority:** PASS — Exits losers, books overvalued gains
7. **No illiquid/penny stocks:** PASS — BAJAJHFL/PRAJIND exited

### Soft Rules Compliance: 2 STRONG PASS, 2 PARTIAL
- **SR #1 (De-risk into stability):** STRONG PASS — ₹1.14L equity → FD
- **SR #2 (Diversified instruments):** PARTIAL — FD is single instrument (mitigated by June debt fund deployment)
- **SR #3 (Frequent review):** PASS — Monthly cadence maintained
- **SR #4 (Tax / cost awareness):** PARTIAL — STCG flagged, loss-offset applied, but not staged across FYs

### The Good (Risk Officer's approval reasoning)
1. **Material liquidity improvement** — 22.1pp gain urgent for emergency-fund deficiency
2. **Disciplined loss-cutting** — BAJAJHFL/PRAJIND have no 13-month recovery visibility; holding = sunk-cost fallacy
3. **Overvaluation recognition** — BSE PE 81 is 3× NIFTY; booking +115% gain before reversion is prudent
4. **Phased de-risking** — 52.4% equity is Phase 1; forward plan shows tranches to 20-25% by March 2027
5. **Strategist honesty** — Weaknesses section transparent; no over-selling
6. **Stress tests pass** — All 4 scenarios remain compliant; Scenario C marginal but acceptable

### The Concerns (Why "WITH RESERVATIONS")
1. **Timing risk** — Selling into momentum (NIFTY +0.51%, VIX -6.7%, risk-on market) could mean missing 10-20% rally in BSE/CUMMINS
   - **Risk Officer's judgment:** 13-month horizon + Hard Rule #6 (capital preservation > growth) overrides "wait for the top" instinct
2. **Loss crystallization** — ₹14,321 realized losses without recovery attempt
   - **Risk Officer's judgment:** Recovery in 13 months is speculative; FD's 6-7% guaranteed return better aligns with Low risk profile
3. **Liquidity still 5% short** — ₹27K gap remains
   - **Risk Officer's judgment:** ₹27K = 1.5% of monthly surplus; June SIP can close; material improvement (22.1pp) outweighs perfect compliance cost
4. **Equity still aggressive at 52.4%** — Not yet "substantially capital-safe" for Q2 2027 target
   - **Risk Officer's judgment:** Phase 1 of glide path; forward plan shows monthly tranches to 20-30% by March 2027

### What Risk Officer is NOT Approving (would trigger VETO)
1. "52.4% equity is the final state" — NO, forward plan must execute
2. "We'll hold BSE if it keeps rallying" — NO, execute at ₹4,280 or walk away
3. "BAJAJHFL/PRAJIND might recover so let's wait" — NO, exits happen May 25-29
4. "Liquidity gap can wait" — NO, June surplus must deploy ₹30K to FD

### Plan B Assessment (Risk Officer reviewed Strategist's 3 options)
- **Option 1 (Staged):** REJECT — Delays liquidity compliance; VIX -6.7% today = exact time to sell, not wait
- **Option 2 (Ultra-conservative):** REJECT — Liquidity 79.9% still deficient; BSE PE 81 not a "conviction hold"
- **Option 3 (Aggressive):** CONDITIONAL ACCEPT — Only if user risk tolerance decreased (job loss, medical, etc.)

**Risk Officer's Counter Plan B:** Hybrid (Primary + IREDA exit) → 99.6% liquidity, 49% equity; use if 100% compliance demanded today

### Execution Conditions (11 mandates)
1. LIMIT orders only (no market orders)
2. Execution window May 25-27 (no delays)
3. FD transfer confirmed before June 25 session
4. holdings.json updated to 27 positions post-settlement
5. **June 2026:** Close ₹27K liquidity gap (₹30K from June surplus → FD)
6. **June 2026:** Phase 2 de-risking to 45% equity (trim ₹70-80K)
7. **June 2026:** Deploy ₹1-1.2L to liquid/debt fund (diversify from FD)
8. **Emergency trigger:** NIFTY drops >10% in one week → exit ₹50-80K equity immediately
9. **Emergency trigger:** VIX > 25 for 3+ days → review PSU/momentum positions
10. **Emergency trigger:** Portfolio < ₹12.5L → emergency session
11. **Emergency trigger:** Life event (job loss, medical, windfall) → reconvene immediately

### Stress Test Review (Risk Officer ran independent scenarios)
- **Scenario A-D:** Agree with Strategist (3 PASS, 1 MARGINAL)
- **Scenario E (Stagflation):** Risk Officer added this — if equity returns 0% for 12 months, goal shortfall ₹5.07L (goal NOT MET); tail risk, not a veto reason but documented

**Risk Officer Confidence in Verdict:** 85% (reservations around timing risk, but Hard Rules compliance + stress resilience outweigh)

---

## Execution Orders Summary

**From:** `workspace/orders-2026-05-25.md`

### Broker-Ready Orders (6 LIMIT orders)

| # | Symbol | Action | Qty | Target Price | Proceeds | Order Type | Valid Through |
|---|--------|--------|-----|--------------|----------|------------|---------------|
| 1 | BAJAJHFL | SELL | 121 | ₹83.00 | ₹10,043 | LIMIT | May 27, 2026 |
| 2 | PRAJIND | SELL | 22 | ₹393.00 | ₹8,646 | LIMIT | May 27, 2026 |
| 3 | BSE | SELL | 11 | ₹4,280.00 | ₹47,080 | LIMIT | May 27, 2026 |
| 4 | CUMMINSIND | SELL | 3 | ₹5,370.00 | ₹16,110 | LIMIT | May 27, 2026 |
| 5 | MIDCAP | SELL | 1,000 | ₹18.00 | ₹18,000 | LIMIT | May 27, 2026 |
| 6 | SMALLCAP | SELL | 300 | ₹45.50 | ₹13,650 | LIMIT | May 27, 2026 |

**Total proceeds:** ₹1,13,529  
**STCG tax:** ₹2,782 (15% on net gains after loss offset)  
**Net to FD:** ₹1,10,747

### Execution Sequencing
1. **Loss cuts first (Orders 1-2):** Generate ₹14,370 tax loss offset → reduces STCG on profit books
2. **Profit books (Orders 3-4):** BSE +115%, CUMMINS +54% → book gains while market is risk-on
3. **ETF trims last (Orders 5-6):** MIDCAP/SMALLCAP volatility reduction

### Timing Guidance
- **Best window:** 10:30 AM - 2:00 PM IST (avoid opening/closing volatility)
- **Market conditions today:** NIFTY +0.51%, VIX -6.7%, broad rally → favorable for selling
- **Deadline:** May 27, 2026 (all orders must be placed by then per Risk mandate)

### Manual Steps (No Broker API in MVP)
1. Log into Zerodha/Groww/Upstox
2. Place 6 LIMIT orders (copy prices from table above)
3. Monitor fills May 25-27
4. Confirm settlement in trading account (T+1 to T+2, May 26-28)
5. Transfer ₹1,13,529 to Fixed Deposit (before May 31)
6. Update `data/holdings.json` to 27 positions:
   - Remove: BSE, BAJAJHFL, PRAJIND, CUMMINSIND
   - Update: MIDCAP 3053 → 2053, SMALLCAP 950 → 650
7. Run reconciliation: `python scripts/reconcile_holdings.py`

### Risk Warnings (What Could Prevent Success)
1. **Delay beyond May 27** — Liquidity deficiency remains urgent; every day delayed = emergency-fund risk
2. **LIMIT orders not filling** — If BSE/CUMMINS rally past target prices, orders won't execute; DO NOT chase higher (Risk Officer mandate)
3. **Broker restrictions** — Some brokers flag "excessive selling" or freeze accounts for anti-money-laundering review
4. **Market crash during execution** — If NIFTY drops >3% intraday, LIMIT orders may not fill at targets (user's choice: lower targets or wait)
5. **Changing mind on BSE** — User sees BSE hit ₹4,500 and regrets selling at ₹4,280; DO NOT cancel order (Hard Rule #6: preservation > growth)

---

## Forward Plan

**Next review due:** June 25, 2026 (in ~30 days)

### Immediate (Post-Execution, May 26-31)
- Confirm ₹1.14L in trading account (settlement T+1 to T+2)
- Transfer full proceeds to Fixed Deposit
- Update holdings file to 27 positions
- Verify liquidity buffer: ₹5.19L / ₹5.46L = 95.0% compliant (₹27K short)

### June 2026 Session (Next Monthly Rebalance)
**Priority:** Close liquidity gap + Phase 2 de-risking

**Monthly SIP deployment (₹1.80L):**
- ₹30,000 → FD (close ₹27K liquidity gap to 100% compliance)
- ₹1,00,000 → Liquid/Short-Duration Debt Fund (capital-safe, T+1 redemption, low-cost)
- ₹50,000 → NIFTYBEES or TOP100CASE SIP (maintain large-cap equity core)

**Additional equity trim (₹70-80K):**
- Candidates: IREDA (-29.5%), IPL (-20.3%), PENIND (-35.0%), ADANIGREEN (-15.6%)
- Target: Equity 52.4% → 45% (Phase 2 of glide path)

**Soft Rule #2 compliance:** Deploy debt fund (diversify beyond FD single instrument)

### July-August 2026
- Continue debt accumulation: 70% monthly surplus (₹1.26L) → debt, 30% (₹54K) → equity SIP
- Review precious metals: GOLDBEES/SILVERBEES 9% of portfolio; if at all-time highs, consider 30-40% profit-booking (₹30K to debt)

### September-November 2026 (Q3 2026)
- Accelerate glide path: 80% monthly surplus to debt (₹1.44L), 20% to equity (₹36K)
- Target: Equity 45% → 35% by November 2026 (6 months before goal)

### December 2026 - March 2027 (Final Glide Path)
- Deploy 100% monthly surplus into liquid/debt (ZERO new equity)
- Exit remaining small-cap/mid-cap/PSU: JPPOWER, TRANSRAILL, MAZDOCK, ENGINERSIN
- Target: Equity 35% → 20-25% by March 2027 (Q2 2027 "substantially capital-safe" milestone per user_plan.md)

### April-June 2027 (Final 3 Months Before Goal)
- **Capital preservation mode:** No new equity purchases
- Exit all equity except ultra-liquid large-cap (NIFTYBEES, TOP100CASE, ICICIBANK)
- Move corpus to liquid fund with T+0 redemption (IDFC Cash Fund, Aditya Birla Savings Fund)
- **By June 1, 2027:** 100% corpus in savings account or T+0 liquid fund (₹40L instantly accessible for house down-payment)

### Emergency Session Triggers (Reconvene Immediately If Any Occur)
- NIFTY drops >10% in any single week
- VIX spikes above 25 for 3+ consecutive days
- MUTHOOTFIN or any position crosses 13% concentration
- Liquidity buffer drops below ₹5L
- Portfolio value drops below ₹12.5L
- Life event: job loss, medical emergency, windfall bonus, risk tolerance change

**Come back sooner if:** Major market correction, VIX spike, life change, windfall

---

## Session Artifacts (For Audit Trail)

All source documents committed to git (local only, no push per orchestrator config):

1. **Analysis:** `workspace/analysis-2026-05-25.md` (Analyst, 159 lines, 11:49 AM IST live data)
2. **Proposal:** `workspace/proposal-2026-05-25.md` (Strategist, 322 lines, 6 exits + stress tests)
3. **Verdict:** `workspace/verdict-2026-05-25.md` (Risk Officer, 297 lines, APPROVE with 11 conditions)
4. **Orders:** `workspace/orders-2026-05-25.md` (Execution, 298 lines, 6 LIMIT orders with manual steps)
5. **Report:** `reports/2026-05-25-rebalance.md` (this file, Orchestrator assembly)

**Git commit signature (pending):**
```
Rebalance 2026-05-25: Restore liquidity (72.9%→95%), de-risk equity (66.5%→52.4%) — APPROVED (Onboarding/A/S/R/E)
```

**Compliance disclaimer (verbatim, load-bearing for audit trail):**
> **Not investment advice.** This report is the output of an open-source research / educational tool that simulates a multi-agent governance flow. It is **not** issued by a SEBI-registered investment adviser or research analyst. Outputs are illustrations of how the Council reasons, not personalized recommendations. Consult a SEBI RIA before acting. Past performance ≠ future results.

---

## Agent Sign-Offs

- **Analyst:** Observation complete (11:49 AM IST, 29 positions analyzed, liquidity deficiency flagged)
- **Strategist:** Proposal submitted (6 exits, ₹1.14L to FD, all 7 Hard Rules cited, stress-tested 4 scenarios)
- **Risk Officer:** APPROVED WITH RESERVATIONS (7/7 Hard Rules PASS, 85% confidence, 11 execution conditions)
- **Execution:** Orders generated (6 LIMIT orders, May 25-27 window, manual placement instructions)
- **Orchestrator:** Report assembled, ready for commit

**Session Status:** COMPLETE — Ready for user execution (no broker API, manual order placement)

---

**Session End:** 2026-05-25  
**Next Session:** June 25, 2026  
**Orchestrator Confidence:** Session flow executed per protocol; all 4 agents completed; Risk approval obtained; orders ready for user manual execution.
