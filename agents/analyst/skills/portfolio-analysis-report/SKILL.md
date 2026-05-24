---
name: portfolio-analysis-report
description: Generate comprehensive portfolio analysis report including holdings snapshot, market state, concentration risks, liquidity status, goal progress tracking, anomaly detection, and facts for Strategist consideration. Handles missing market data gracefully and computes metrics from holdings.json against RULES.md constraints.
learned_from: task:6b89a154-ef82-4881-bb76-adf29878fae3
learned_at: '2026-05-23T19:04:45.361Z'
confidence: 1
usage_count: 1
success_count: 1
failure_count: 0
negative_examples: []
---

## Steps
1. Checked for required files - user_plan.md, RULES.md, and holdings.json not found in analyst directory. Checking parent directories.
2. Read user_plan.md, RULES.md, and holdings.json successfully. Now running market analysis scripts.
3. Market data scripts failed due to missing yfinance module. Will include DATA UNAVAILABLE sections in analysis and compute metrics from holdings data where possible.
4. Reviewed previous session report (2026-05-23-rebalance.md) showing HDFCBANK violation addressed and portfolio rebalanced. Now computing current portfolio metrics.

## What Worked
This approach succeeded on attempt #1.
