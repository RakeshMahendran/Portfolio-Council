---
name: import-holdings
description: Parse a user-uploaded holdings file (CSV/XLSX/JSON) with intelligent LLM-driven column inference, then write canonical data/holdings.json.
---

# Skill: import-holdings

## Purpose

Turn a user-uploaded holdings file into the canonical `data/holdings.json` that the rest of Portfolio Council consumes. Handles messy real-world broker exports (Zerodha, Groww, AngelOne, etc.) — column names vary, units vary, extra metadata columns are common.

This skill is **LLM-aware**: when column names don't match obvious patterns, the agent uses its own reasoning (not a hardcoded alias table) to figure out which column means symbol, quantity, and average price.

## When this skill is invoked

The FastAPI backend (`server/data_routes.py`) calls this skill when:
1. A user uploads a file via the `/profile` UI
2. The deterministic fast-path parser fails to find required columns
3. Falls through to: *"Use the import-holdings skill on data/uploaded/<filename>"*

The skill can also be invoked directly via:

```
gitclaw --dir . --prompt "Use the import-holdings skill on /path/to/file.csv"
```

## Inputs

- A file path passed in the invocation: `data/uploaded/<filename>` (relative to repo root)
- Supported formats: `.csv`, `.xlsx`, `.xls`
- (`.json` uploads bypass this skill — they're already canonical)

## Output

A single file: **`data/holdings.json`**, with this exact schema:

```json
[
  {"symbol": "RELIANCE", "qty": 12, "avg_price": 2450.50},
  {"symbol": "TCS", "qty": 8, "avg_price": 3920.00},
  ...
]
```

- `symbol`: uppercase ticker string (no spaces, no exchange suffix)
- `qty`: positive number (float, not string)
- `avg_price`: positive number (float, not string), in INR per share
- One object per position, no nesting

## Procedure

1. **Read the uploaded file** at `data/uploaded/<filename>`. Use your `cli` tool with Python to parse — e.g., `python -c "import pandas as pd; df = pd.read_csv(...); print(df.head().to_json())"`.

2. **Inspect the headers and first 3-5 rows.** Identify which columns correspond to:
   - **symbol** (the stock ticker — e.g., "RELIANCE", "TCS")
   - **qty** (number of shares — sometimes labelled "Qty.", "Holdings", "Units", "Shares")
   - **avg_price** (average purchase price per share — sometimes "Avg.cost", "Buy Price", "Average Cost", "Cost", "Avg Price (₹)")

   **Use your judgment.** Brokers vary. Don't rely on exact matches.

3. **Skip noise columns** — Current price, P&L, day change, market cap, sector, anything not in the canonical schema.

4. **Validate each row**:
   - `symbol` must be non-empty and uppercase-able
   - `qty` must parse as a positive float
   - `avg_price` must parse as a positive float
   - Skip blank rows or rows with any missing required field

5. **Strip exchange suffixes** if present (`.NS`, `.BO`, `:NSE`). Keep the bare ticker.

6. **Write `data/holdings.json`** using your `write` tool. JSON array, indented 2 spaces.

7. **Clean up** — delete `data/uploaded/<filename>` after a successful parse to keep the workspace clean. Use your `cli` tool: `rm data/uploaded/<filename>`.

8. **Confirm in chat** with one line:
   `Imported N holdings via column mapping: {symbol: "Instrument", qty: "Qty.", avg_price: "Avg.cost"}`

## Hard constraints

- **NEVER guess values.** If a row is ambiguous, skip it. Don't invent a quantity or price.
- **NEVER write a partial result** if you can't parse most rows. Better to write nothing and emit an error than to write 2 holdings out of 50.
- **NEVER touch files outside** `data/uploaded/` (read) and `data/holdings.json` (write) and `data/uploaded/<filename>` (delete on success).
- **NEVER include extra fields** in the output (no `current_price`, `pnl`, `sector` — only `symbol`, `qty`, `avg_price`).

## Examples of the column-mapping intelligence

### Example 1: Zerodha Console export
Input headers: `Instrument,Qty.,Avg.cost,LTP,Cur.val,P&L,Net chg.,Day chg.`

Mapping:
- `Instrument` → `symbol`
- `Qty.` → `qty`
- `Avg.cost` → `avg_price`
- LTP, Cur.val, P&L, Net chg., Day chg. → ignored

### Example 2: Generic spreadsheet
Input headers: `Stock Name,Holdings,Purchase Price`

Mapping:
- `Stock Name` → `symbol`
- `Holdings` → `qty`
- `Purchase Price` → `avg_price`

### Example 3: Already canonical
Input headers: `symbol,qty,avg_price`

This case is handled by the deterministic fast-path before reaching this skill.

## Error handling

- File not found at given path → emit an error message in chat, do not write `data/holdings.json`.
- Headers entirely unreadable → emit "Could not identify required columns. Please use the example CSV template."
- All rows fail validation → write nothing, emit summary of why.

## Why this skill exists (instead of a hardcoded parser)

Real broker exports have unpredictable column names. A hardcoded alias dict misses variants like `Avg.cost` (with period), `Avg Price (₹)` (with currency), `Holdings` (vs "Quantity"). An LLM, given a few sample rows, can map columns reliably across vendors.

The deterministic fast-path still runs first for known-good formats — this skill only fires on the messy 20%.

## Files this skill touches

| File | Action | When |
|---|---|---|
| `data/uploaded/<filename>` | READ | Always |
| `data/holdings.json` | WRITE | After successful parse |
| `data/uploaded/<filename>` | DELETE | After successful parse |

## Tools this skill uses

- `read` — load the uploaded file content
- `cli` — run pandas or `csv` module for parsing
- `write` — emit `data/holdings.json`
- `cli` (again) — clean up the uploaded file with `rm`

## Metadata

- created_by: Portfolio Council Orchestrator
- updated: 2026-05-24 (v0.2.0 — added LLM-driven column inference)
- version: 0.2.0
