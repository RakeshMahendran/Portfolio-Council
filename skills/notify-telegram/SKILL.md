---
name: notify-telegram
description: Send verdict summary to user Telegram via Bot API.
---

Skill: notify-telegram

Purpose

This skill standardizes sending notifications to Telegram for Portfolio Council events. It provides a secure, auditable, and rate-limited mechanism to inform users or operator channels about session milestones, alerts, and final reports.

Inputs

- Message text and optional payload (markdown-limited text)
- Optional: one or more file attachments from workspace/ (PDFs, PNGs, CSVs)
- Configuration: secrets/scripts/config or environment variables containing TELEGRAM_BOT_TOKEN and allowed CHAT_IDS
- RULES.md (must be read to apply confidentiality/redaction rules and approved recipient lists)

Outputs

- HTTP(s) requests to Telegram Bot API (sendMessage, sendDocument)
- workspace/notify-telegram-<timestamp>.md — log entry recording message, recipient(s), timestamp, and API response status

Preconditions

- RULES.md and memory/user_plan.md exist and have been consulted for allowed recipients and redaction requirements
- TELEGRAM_BOT_TOKEN and target CHAT_ID(s) are available in a secure store (scripts/config or environment) and are permitted by RULES.md
- Network access to api.telegram.org

Procedure

1. Read RULES.md and memory/user_plan.md to determine:
   - Allowed chat IDs and channels (user, admin, audit channel)
   - Redaction rules for personal or sensitive data
   - Allowed attachment types and maximum file sizes
2. Construct the message payload:
   - Apply redaction rules to message text and any attached filenames
   - Limit message length to Telegram's supported maximum (use splitting for very long messages)
   - Prefer MarkdownV2 or HTML formatting consistently; escape as required
3. If attachments are included:
   - Verify attachments exist in workspace/ and comply with size and format constraints
   - For large files, prefer upload via sendDocument with multipart/form-data, or provide a signed download link instead
4. Send the message via Telegram Bot API using HTTPS with proper error handling and exponential backoff for transient errors.
   - For sendMessage: POST to https://api.telegram.org/bot<token>/sendMessage with chat_id, text, parse_mode, disable_web_page_preview as needed
   - For sendDocument: POST multipart/form-data to https://api.telegram.org/bot<token>/sendDocument with chat_id and document
5. Respect rate limits:
   - Default safe cadence: no more than 1 message per second per chat
   - Implement a local queue and retry policy to avoid hitting Telegram limits
6. Record a local audit log entry in workspace/notify-telegram-<timestamp>.md including:
   - Message summary and redaction notes
   - Recipient chat IDs
   - Timestamp (ISO 8601)
   - API request payload (redacted) and full API response
   - Any retries or errors encountered
7. If the API call fails permanently for a critical alert, escalate to an alternative channel per RULES.md (email, SMS, or manual escalation) and log the escalation.
8. Do not include secrets (bot token, API keys) in the log file. Store only redacted or hashed references for auditability.

Error handling

- For HTTP 5xx or network errors: retry with exponential backoff up to a configurable maximum (e.g., 5 attempts).
- For HTTP 4xx errors (invalid chat_id or permission denied): do not retry; record the failure and surface to the Orchestrator.
- For attachment upload errors due to size: attempt alternative (signed download link) and include link in the notification.

Security and Privacy

- Keep TELEGRAM_BOT_TOKEN in a secure store; do not commit it to git.
- Verify recipient lists against RULES.md to avoid accidental leaks.
- Apply content redaction rules consistently before sending or logging messages.

Notes

- This skill is a sender utility; it does not decide what to notify. Agent roles (Analyst, Risk, Execution) must instruct when to call this skill and supply approved message content.
- Maintain an internal send-queue and rate-limiting to prevent abuse and API lockouts.
- Include correlation IDs in messages and logs to trace notifications back to session commits and report IDs.

Metadata

created_by: Portfolio Council Orchestrator
created_at: 2026-05-23
version: 0.1.0
