---
name: generate-pdf
description: Convert final rebalance markdown report into a PDF for archival.
---

Skill: generate-pdf

Purpose

This skill standardizes the process for creating PDF reports from workspace artifacts produced by Portfolio Council agents. It ensures reports are reproducible, auditable, and formatted according to governance rules in RULES.md.

Inputs

- One or more workspace/*.md or workspace/*.html files to render
- Optional: workspace/*.png, workspace/*.csv to embed or attach
- RULES.md (must be consulted for confidentiality, redaction rules, and signing requirements)
- scripts/generate_pdf.py or an approved rendering tool (Pandoc, wkhtmltopdf, WeasyPrint)

Outputs

- workspace/report-<YYYY-MM-DD>-<slug>.pdf — primary rendered PDF
- workspace/report-<YYYY-MM-DD>-<slug>-assets/ — exported assets used in the PDF (images, CSVs)
- (optional) workspace/report-<YYYY-MM-DD>-<slug>.pdf.metadata.json — metadata and provenance (creator, timestamp, source files, git commit sha)

Preconditions

- memory/user_plan.md and RULES.md exist and have been read to apply any required redactions or disclaimers
- Source files to render exist in workspace/ and are named following session conventions
- The environment contains the selected rendering tool (or scripts/generate_pdf.py is present and executable)

Procedure

1. Read RULES.md and memory/user_plan.md to determine required headers, disclaimers, and any redaction rules (e.g., remove account numbers, mask personal data).
2. Collect source files. By default, include the session artifacts:
   - workspace/analysis-<date>.md
   - workspace/proposal-<date>.md
   - workspace/verdict-<date>.md
   - workspace/orders-<date>.md
   Include any supplementary charts or CSVs produced during the session.
3. Normalize markdown/HTML input:
   - Ensure front-matter includes title, author (agent roles), and ISO 8601 timestamp
   - Convert relative image links to workspace report-assets paths
   - Replace any confidential tokens per RULES.md redaction rules
4. Assemble a master document in workspace/report-<date>-<slug>.md with the approved structure:
   - Cover page with title, date, and participant signatures (agent names and roles)
   - Table of contents
   - Session summary (one-line summary from the final commit message)
   - Included artifacts in the agreed order (Analysis, Proposal, Verdict, Orders)
   - Appendices for raw CSV tables and full data dumps (if allowed)
   - Legal disclaimer / governance footer from RULES.md
5. Render the master document to PDF using the chosen tool (Pandoc/wkhtmltopdf/scripts/generate_pdf.py). Use a stable CSS/template for consistent branding and accessibility.
6. Generate metadata file containing:
   - Source file list and their git SHAs
   - Render tool and version
   - Timestamp and creating agent
   - Any redactions performed
   Save metadata to workspace/report-<date>-<slug>.pdf.metadata.json
7. Verify the produced PDF for integrity:
   - Confirm page count > 0
   - Check that critical sections (cover, verdict summary, signatures) are present
   - Validate that no forbidden content (per RULES.md) remains
8. Save the PDF and assets to workspace/ and record the output paths in the session task tracker.
9. If required by RULES.md, prepare a short signed commit message and hand off to the Orchestrator for final commit into reports/.

Error handling

- If rendering fails due to missing fonts or assets, create workspace/report-error-<timestamp>.md with the error log and fallback instructions.
- If redaction rules cannot be automatically applied, halt and create workspace/report-redaction-needed-<timestamp>.md listing offending items; manual review required.

Notes

- PDFs are intended as archival artifacts for the reports/ directory. Do not treat them as execution authority — orders must still be translated into actionable recommendations by the Execution agent.
- Include provenance metadata for auditability; prefer JSON over embedding metadata inside the PDF.
- Keep templates versioned in scripts/templates/ and reference template SHA in metadata.

Metadata

created_by: Portfolio Council Orchestrator
created_at: 2026-05-23
version: 0.1.0
