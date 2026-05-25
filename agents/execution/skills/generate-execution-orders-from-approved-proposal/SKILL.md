---
name: generate-execution-orders-from-approved-proposal
description: Translate the Risk-approved Strategist proposal into a broker-ready order list. One row per order with symbol, action, quantity, order type, price target, and a sequencing note. Output is human-executable — there is no broker API; the user places these orders themselves.
learned_from: task:1b614ab9-5689-4d56-9c2b-41c0c5578777
learned_at: '2026-05-25T07:22:14.326Z'
confidence: 1
usage_count: 1
success_count: 1
failure_count: 0
negative_examples: []
---

## Steps
1. Verified Risk APPROVE verdict and loaded amended proposal - 6 sell orders to execute
2. Fetched market data and holdings - Market OPEN, NIFTY +0.06%, VIX 17.04 (moderate), broad rally conditions
3. Generated orders-2026-05-25.md with 6 broker-ready SELL orders, plain-English summary, tax calculations, and execution sequencing

## What Worked
This approach succeeded on attempt #1.
