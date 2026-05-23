# Portfolio Council — FastAPI Backend

Thin HTTP bridge between the Next.js dashboard (`frontend/`, port 3000) and the gitclaw agent runtime.

## Architecture

```
Browser (localhost:3000)
   │
   ▼
Next.js (frontend/, UI only)
   │   HTTP
   ▼
FastAPI (server/, this folder, localhost:8000)
   │   subprocess
   ▼
gitclaw CLI (Node.js binary)
   │
   ▼
AWS Bedrock — Claude Sonnet 4.5
```

**Why a subprocess (and not a Python SDK)?** gitclaw is a Node.js library. There is no Python SDK. This server invokes `gitclaw --dir <agent> --prompt <text>` as a subprocess and streams its stdout back to the browser as NDJSON.

## Install

Uses the project-wide venv at `~/.venvs/portfolio-council` (created earlier when we set up the Python scripts).

```bash
~/.venvs/portfolio-council/bin/pip install -r requirements.txt
```

## Run

```bash
cd /path/to/portfolio-agent/server
~/.venvs/portfolio-council/bin/uvicorn main:app --reload --port 8000
```

Then point your browser at the frontend (`http://localhost:3000`) or hit the API directly at `http://localhost:8000/api/log`.

## Endpoints

### Read (cheap)

| Method | Path | Returns |
|---|---|---|
| `GET` | `/` | API metadata + endpoint listing |
| `GET` | `/api/log?max_count=50` | Recent commits as `{commits, count}` |
| `GET` | `/api/log/{commit_hash}` | Single commit body + changed files |
| `GET` | `/api/branches` | `{current, all}` branches |

### Write (mutating)

| Method | Path | Body | Effect |
|---|---|---|---|
| `POST` | `/api/fork` | `{name}` | `git checkout -b <name>` |
| `POST` | `/api/checkout` | `{branch}` | switch to existing branch |
| `POST` | `/api/revert` | `{commit_hash, reason?}` | revert commit, optional reason in message |

### Agent run (streams)

| Method | Path | Body | Returns |
|---|---|---|---|
| `POST` | `/api/run` | `{prompt}` | NDJSON stream of `{type, ...}` events from gitclaw |

## NDJSON event types from `/api/run`

```
{"type":"session_start","agent_dir":"..."}
{"type":"tool_use","text":"▶ task_tracker(...)"}
{"type":"output","text":"plain stdout line"}
{"type":"task_end","text":"Task ... completed successfully"}
{"type":"error_line","text":"✗ ..."}
{"type":"session_end","return_code":0}
```

The frontend reads `response.body` line by line and renders each into the Live Activity panel.

## Security notes

- Branch names are whitelisted (`[a-zA-Z0-9_/.-]+`) to prevent shell-meta injection.
- Commit hashes are validated (`[a-fA-F0-9]{7,40}`).
- CORS is locked to `http://localhost:3000` only — open up only when deploying.
- The `.env` file containing AWS Bedrock + Azure keys is inherited by the gitclaw subprocess. **Never commit `.env`.** (Already in `.gitignore`.)

## Files

- `main.py` — FastAPI app, routes, gitclaw subprocess streaming
- `git_ops.py` — git CLI wrappers (`log`, `show`, `branch_create`, `revert`, etc.)
- `requirements.txt` — `fastapi`, `uvicorn`, `pydantic`
