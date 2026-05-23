# RULES for Portfolio Agent Team

These rules are derived from the user's current financial facts (see memory/*.md) and are meant to be machine-checkable by a pre-commit hook. All numeric values use INR and refer to the family combined portfolio unless otherwise noted.

Sources: memory/family_financial_context.md, memory/month_wise_plan_2026_27.md, memory/realistic_income_based_plan.md

---

# Hard Rules (must never violate — Risk Officer must VETO)

1. Goal and Deadline
   - The team must treat the primary goal as: reach ₹40,00,000 (40 lakh) target for house down payment by March 13, 2027 (the month-wise plan and realistic income plan both target this date). Any proposal that changes the goal amount or the deadline must be explicit, include numerical re-calculation, and be APPROVED by the Risk Officer. A proposal that moves the deadline later than March 13, 2027 must include a new month-by-month projection showing why the new deadline is feasible.
   - Check: proposals must include the stated goal and deadline fields; pre-commit will fail if absent.

2. Minimum Liquidity for Withdrawal
   - By March 1, 2027, cash + liquid mutual funds + bank savings must be at least ₹40,00,000 OR the portfolio must have a verified plan (with sell orders and settlement dates) that will convert holdings to >= ₹40,00,000 by March 10, 2027. Any proposal that risks having < ₹40,00,000 available by March 10, 2027 must be vetoed.
   - Check: proposals must include "liquidity_by_2027-03-10" numeric field and supporting sell/settlement plan.

3. Stop-Loss & Profit-booking enforcement
   - Must enforce these rules exactly in any rebalance proposal: individual stock stop-loss trigger: -25% from purchase or average cost; profit booking: >30% → book 25%, >50% → book 50%, >75% → book 75%. Strategist proposals that do not apply these rules must include per-stock justification and be AMENDED or VETOED by Risk.
   - Check: proposals must include a per-stock table with current P/L% and actions (hold/sell/partial sell) consistent with above thresholds.

4. Single-stock concentration limit
   - No single stock may be increased or proposed to remain at >15% of total portfolio CURRENT VALUE. If a proposal would leave any single stock >15%, it must simultaneously include an order to reduce that holding to <=15% (partial sell) within the same trade cycle.
   - Check: proposals must provide total portfolio current value and per-stock %; fail if any >15% without matching sell order.

5. Equity exposure glide-path (months and hard caps)
   - The team must follow the month-wise equity/debt/glide path in memory/month_wise_plan_2026_27.md. Hard caps for equity exposure by month (total portfolio equity share, not monthly inflows):
     - Mar–May 2026: max equity 55%
     - Jun–Aug 2026: max equity 50%
     - Sep–Oct 2026: max equity 40%
     - Nov–Dec 2026: max equity 30%
     - Jan–Feb 2027: max equity 15%
     - Mar 2027: max equity 0% (portfolio must be in debt/liquid as per plan)
   - Any Strategist proposal that increases projected equity % above the month's hard cap is VETOED unless it provides a quantitative simulation (see Required Process) showing no chance of missing the ₹40L goal and is specifically APPROVED by Risk.
   - Check: proposals must include projected portfolio allocation (%) for the proposal month.

6. No leverage or new EMIs / new debt increases
   - The team must not propose any increase in leverage, margin, new loans, or new chits that increase monthly EMI/chit commitments beyond the currently recorded EMIs and chits. Specifically: do not propose taking any new chit >= ₹10,000/month or any new EMI without explicit user approval recorded in memory and Risk approval.
   - Check: proposals must declare change_in_monthly_commitments (numeric). If >0 and not pre-approved in memory, fail.

7. Mandatory insurance plan
   - Within 90 days from the first strategy commit after these rules are active, the team must present a documented purchase plan to acquire the planned insurance (family health/medical and Rakesh+Brother life) totaling ~₹84,000/year (approx. ₹7,000/month). If the user declines, the declination must be recorded in memory with timestamp and reason.
   - Check: after 90 days, if no insurance plan or declination exists in memory, any new equity deployment proposals will be VETOED.

8. USD income protection
   - Brother's USD income (~$1,875/month) is a key strength. Do not propose hedges or forex positions that reduce household USD receipt value without explicit user consent. Any proposal that assumes USD/INR conversion below ₹90 or above ₹100 for planning must include sensitivity analysis for at least ±5% and be approved by Risk.
   - Check: proposals referencing converted USD amounts must include the exchange rate used and a +/-5% sensitivity column.

9. No redeploy of funds required for near-term mandatory payments
   - Required scheduled payments in memory (school fee lump sums: June 2026 ₹38,000; and quarterly ~₹17,333 in Sep/Dec/Mar; EMIs; chits ending dates) must not be made illiquid by proposals (e.g., do not move funds scheduled for fee payments into 3+ month lock-in instruments without documented replacement liquidity). Proposals that do so must include a plan that replicates liquidity by the payment date.
   - Check: proposals must list near-term cash obligations and confirm funding sources.

# Soft Rules (prefer but can be overridden with documented justification)

1. Preference for index ETFs as core
   - Prefer NIFTYBEES/index ETF allocations for core equity exposure as shown in the month-wise plan (large cap index first). Strategist should default to index ETFs for new equity inflows unless a clear high-conviction stock thesis is provided and cites financial ratios and one source file.
   - Check: proposals that pick individual stocks must include a short justification (2–4 sentences) and cite the earnings/valuation basis.

2. Maintain minimum liquidity buffer
   - Prefer maintaining a liquid buffer of at least ₹1,00,000 at all times (bank + liquid funds). This can be overridden if the simulation shows projected liquidity > ₹40L at conversion time.
   - Check: proposal must show current liquidity before/after.

3. Use step-down in equity as plan approaches
   - Prefer a progressive migration to debt/liquid from September onward per month-wise glide path. Small deviations (±5 percentage points) are permitted if justified by a quantitative scenario.
   - Check: proposals must include a one-paragraph justification when deviating >5pp.

4. Tax-loss harvesting where efficient
   - Prefer to use tax-loss harvesting near fiscal year-end when it improves net outcome and does not jeopardize the timeline. Tax harvesting trades must include expected tax benefit (INR) calculation.
   - Check: proposals claiming tax harvesting must include projected tax savings number and source trades.

5. Protect brother's USD income by prioritizing INR cash flows for family obligations
   - Prefer to use INR earnings or sell INR assets rather than touching USD-converted holdings unless FX environment analysis supports otherwise.
   - Check: proposals must state which household income streams will fund proposed redeployments.

# Required Process (every proposal, commit, and rebalance must follow)

1. Task tracking (MANDATORY)
   - Before any substantive work, Orchestrator must call task_tracker action "begin" with the objective.
   - After each significant step (analysis produced, strategy proposed, risk review completed), call task_tracker "update" with a short step description.
   - At the end, call task_tracker "end" with outcome success/failure/partial and summary.
   - Check: commit metadata must include task_tracker id. Pre-commit fails if missing.

2. Use / cite memory files and scripts
   - Every Strategist proposal must declare which memory files were used (at minimum: memory/family_financial_context.md and one of the month-wise/realistic plan files). The commit message must include the exact file paths and the last-modified timestamp (git SHA or memory read timestamp).
   - All proposals that affect the goal timeline must run the portfolio tracker script and include its output: run: python scripts/track_goal.py OR python track_goal.py (whichever exists). If scripts are missing, the proposal must run recovery_sim (or the designated simulator) and attach its output file (workspace/sim-*.json or .csv).
   - Check: commit must include an artifacts list: tracker_output_path and memory files cited.

3. Mandatory simulation and sensitivity analysis
   - Every rebalancing or large allocation (>₹2,00,000 in a month or >10% of portfolio) must include:
     a) a 3-scenario projection (base, optimistic +6% p.a., pessimistic 0% p.a.) showing projected balance by month until March 2027;
     b) liquidity timeline showing cash/settlement dates for any sells; and
     c) FX sensitivity if USD income is part of funding (±5% rate scenarios).
   - Check: proposal commit must attach sim files and summary metrics (projected_balance_by_2027-03, probability_of_missing_goal boolean by scenario).

4. Analysis deliverables (Analyst must produce)
   - For each Strategist proposal, Analyst must produce a structured analysis: holdings snapshot (market value, qty, avg cost, P/L%), list of near-term cash obligations and dates, and market environment summary (NIFTY, IndiaVIX, crude price, USD/INR). This analysis is required before Strategist writes a proposal.
   - Check: commit must include analyst_analysis.json or .md in workspace with those fields.

5. Risk review and decision audit
   - Risk Officer must respond to every Strategist proposal with APPROVE / VETO / AMEND. The response must be a structured comment that includes at least one concrete reason and (if AMEND) exactly one set of changes to make the proposal approvable.
   - Check: commit must include risk_decision.json with fields {decision: APPROVE|VETO|AMEND, reasons:[], amendments:[]}

6. Commit & provenance requirements
   - Every Git commit touching portfolio rules, strategy proposals, or automated trades must include in the commit message: (a) task_tracker id, (b) memory files consulted (paths), (c) simulator/tracker output file path(s), and (d) risk_decision id. Missing any of these will fail the pre-commit hook.

7. Automated enforcement of stop-loss / book rules
   - Any automated trading script must include a pre-trade validation that ensures stop-loss and profit-booking rules (Hard Rule #3) are met; otherwise the trade is blocked.
   - Check: pre-trade logs must contain validation_pass boolean and the rule checks performed.

8. Monthly checklist enforcement
   - On the 1st of every month the Strategist must run the monthly checklist and commit the outputs: deployment plan for the month's ₹2,00,000 (or actual available surplus for that month), performance vs target table (planned vs actual), and any deviations with justification. This must be present in workspace/monthly/YYYY-MM-01.md
   - Check: if the 1st-of-month commit is missing by day 3, Risk Officer raises an alert stored in memory/alerts.md.

# Automated / Machine-checkable fields required for each proposal

Every proposal file (YAML/JSON/MD) must include these top-level fields so the pre-commit hook can validate them automatically:
- goal_amount: 4000000
- goal_deadline: 2027-03-13
- current_portfolio_value: <numeric>
- projected_liquidity_by_2027-03-10: <numeric>
- month_of_proposal: YYYY-MM
- proposed_equity_pct: <numeric 0-100>
- proposed_debt_pct: <numeric 0-100>
- per_stock_actions: [{symbol, qty, current_value, current_pl_pct, action, rationale}]
- cited_memory_files: [list of memory paths used]
- tracker_output_paths: [list of files created by scripts]
- task_tracker_id: <id>
- risk_decision_id: <id>

Pre-commit will validate these fields and enforce the numeric hard caps (equity caps per month, single-stock cap 15%, stop-loss/profit rules applied in per_stock_actions).

---

# Notes and rationale

These rules are intentionally strict because the user's plan is time-bound (target ~March 2027) and relies heavily on disciplined monthly investing and a job-salary inflection. Hard constraints focus on liquidity and concentration risk; soft rules encourage preferred instruments and tax-aware behavior. All rules reference exact numeric thresholds and file-attachment requirements so a pre-commit hook can enforce them automatically.

If the household income assumptions or the goal date change, a new RULES.md must be generated and approved by Risk, and the change must be recorded in memory with the new projections.
