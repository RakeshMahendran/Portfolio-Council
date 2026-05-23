Skill: run-recovery-sim

Purpose

This skill defines a reproducible procedure to run portfolio recovery simulations. It is used to estimate time-to-recovery and probability-of-recovery for portfolios subjected to specified drawdown scenarios or stress events. Outputs support the Strategist and Risk Officer when evaluating Plan B and resilience measures.

Inputs

- workspace/analysis-<YYYY-MM-DD>.md (holding values and market snapshot)
- data/holdings.json (current portfolio positions)
- RULES.md (to respect constraints on allowed stress methods and acceptable risk tolerances)
- scripts/recovery_sim.py (optional helper for Monte Carlo or scenario simulations)
- Assumptions: expected return distribution, volatility, rebalancing rules, contribution/withdrawal schedule

Outputs

- workspace/recovery-sim-<YYYY-MM-DD>.md — narrative summary of simulation setup, key results, and interpretation
- workspace/recovery-sim-<YYYY-MM-DD>.csv — scenario table with recovery times and probabilities
- workspace/recovery-sim-<YYYY-MM-DD>.png — optional chart showing recovery trajectories (percentiles)

Preconditions

- memory/user_plan.md exists and has been read for spending needs, liquidity constraints, and time horizon
- RULES.md read and followed for any strategy limitations (e.g., no use of leverage)
- Holdings data validated and market prices available

Procedure

1. Read RULES.md and memory/user_plan.md to ensure scenarios respect user constraints (e.g., no margin use, minimum liquidity buffers).
2. Load holdings and latest market values from workspace/analysis-<date>.md or data/holdings.json.
3. Define simulation scenarios. Common sets:
   - Historical drawdown replay (e.g., 2008, 2020) applied to current holdings
   - Parametric shock (instant loss of X% across asset classes)
   - Monte Carlo forward paths using assumed return and volatility inputs
   - Tail-event stress tests (correlated losses, liquidity shocks)
4. For each scenario, set assumptions about reinvestment, contribution/withdrawal behavior, and rebalancing rules (frequency and thresholds).
5. Run the simulation engine (scripts/recovery_sim.py or equivalent). Ensure random seeds are recorded for reproducibility.
6. Compute key metrics per scenario:
   - Time to recover to pre-drawdown portfolio value (median, 10th/90th percentiles)
   - Probability of recovery within user time horizon
   - Expected shortfall and worst-case drawdown
   - Liquidity events (cash exhaustion) if withdrawals are simulated
7. Perform sensitivity checks on critical assumptions (return drift, volatility, correlations).
8. Summarize findings in workspace/recovery-sim-<date>.md with:
   - Scenario definitions and assumptions
   - Tables of recovery probabilities and times
   - Visualizations (trajectory percentiles, distribution of recovery times)
   - Limitations and caveats about model assumptions
9. Save detailed scenario outputs to CSV and charts to PNG for audit.

Error handling

- If simulation inputs are invalid (missing holdings, negative cash buffer), abort and write workspace/recovery-sim-error-<timestamp>.md with diagnostics.
- If computation fails due to resource limits, run a reduced-sample simulation and note the approximation in the report.

Notes

- This skill supports decision-making but does not itself recommend actions; results are advisory for Strategist and Risk Officer.
- Ensure all outputs include timestamps and seed values for reproducibility.
- Respect user privacy and do not include secret credentials in outputs.

Metadata

created_by: Portfolio Council Orchestrator
created_at: 2026-05-23
version: 0.1.0
