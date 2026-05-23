---
name: generate-execution-orders-from-approved-proposal
description: Translate Risk-approved rebalancing proposal into broker-ready execution orders with price targets, sequencing, and day-8 protocols when market data is unavailable
learned_from: task:f46f9962-04c8-460e-ae62-5e68ccfacf71
learned_at: '2026-05-23T12:42:46.381Z'
confidence: 1
usage_count: 0
success_count: 0
failure_count: 0
negative_examples: []
---

## Steps
1. Files not found in execution agent workspace - checking parent workspace directory
2. Read Risk verdict (AMEND → now reviewing proposal v2) and proposal v2 with all amendments incorporated. Holdings data loaded.
3. Market data unavailable (yfinance not installed). Proceeding with proposal prices and explicit unavailability flags per protocol.
4. Risk Officer APPROVED proposal v2. Now generating actionable orders with prices from proposal and holdings data.

## What Worked
This approach succeeded on attempt #1.
