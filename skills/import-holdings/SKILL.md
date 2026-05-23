---
name: import-holdings
description: Parse uploaded Excel/CSV holdings into data/holdings.json.
---

Skill: import-holdings

Purpose

This skill standardizes the ingestion and validation of user holdings into the Portfolio Council workspace. It converts uploaded spreadsheets or pasted data into a canonical JSON format (data/holdings.json), performs validation checks, and records provenance for audit.

Inputs

- Uploaded holdings spreadsheet (XLSX, CSV) OR pasted tabular holdings data
- RULES.md (to determine any redaction or allowed data fields)
- Optional: scripts/import_holdings.py or helper utilities in scripts/

Outputs

- data/holdings.json — canonical normalized holdings file
- workspace/import-holdings-<timestamp>.md — import log with provenance, detected issues, and summary statistics
- (optional) workspace/import-holdings-<timestamp>.csv — cleaned CSV export used to generate the JSON

Preconditions

- memory/user_plan.md exists and has been read to respect constraints on holdings (e.g., excluded asset classes)
- User has provided a source file or pasted data in a supported format

Canonical Holdings Schema (example)

- portfolio_name: string
- snapshot_date: ISO 8601 date
- base_currency: string (e.g., USD)
- positions: array of {
    - symbol: string (exchange ticker)
    - name: string (optional)
    - quantity: number
    - currency: string (currency of the position)
    - cost_basis: number (optional, in base_currency or specified currency)
    - acquisition_date: ISO 8601 (optional)
    - lot_id: string (optional)
    - tags: array of strings (optional)
  }

Procedure

1. Read RULES.md and memory/user_plan.md to determine any fields that must be redacted or excluded and the base currency to normalize holdings into.
2. Accept input formats:
   - XLSX: read all sheets and attempt to locate the most likely holdings table by header matching (symbol, quantity)
   - CSV/TSV: parse and infer delimiter
   - Pasted table: accept tab- or comma-separated content
3. Normalize column headers to the canonical schema using a configurable mapping (e.g., "Ticker" -> symbol, "Qty" -> quantity).
4. Validate and coerce types:
   - Ensure quantities are numeric and non-NaN
   - Parse dates to ISO 8601
   - Map empty strings to nulls
5. Detect ambiguous or missing fields and attempt intelligent fixes:
   - If currency is missing, assume portfolio base currency and flag for review
   - If cost_basis is present in a different currency, record original and convert if FX rates are available
6. Run consistency checks:
   - No duplicate lot_id unless explicitly allowed
   - Total market exposure per symbol aggregated
   - Negative quantities flagged as shorts (only allowed if RULES.md permits)
7. Write normalized data to data/holdings.json with a snapshot_date and source metadata (original filename, upload timestamp, uploader id if available).
8. Create workspace/import-holdings-<timestamp>.md summarizing:
   - Number of positions imported
   - Any fixes or assumptions applied
   - Warnings and errors
   - Suggested manual checks
9. If critical errors prevent import (no symbol or quantity), write workspace/import-holdings-error-<timestamp>.md and abort.

Provenance & Audit

- Include original file checksum (SHA256) in the import log
- Record the git commit SHA if the import was committed to the repo
- Do not store plaintext credentials or sensitive PII; apply redaction per RULES.md

Error handling

- Recoverable issues (missing currency, extra columns) should be logged and the import completed with warnings.
- Non-recoverable issues (no symbol/quantity) should halt the import and return a clear error message with guidance to fix the source file.

Notes

- The output data/holdings.json is authoritative for the session and should not be modified by downstream agents except via a new import.
- Keep import operations idempotent: re-importing the same file should produce the same holdings.json and update snapshot_date only if content changed.
- Prefer transparent warnings over silent fixes; surface any inferred changes to the user for confirmation.

Metadata

created_by: Portfolio Council Orchestrator
created_at: 2026-05-23
version: 0.1.0
