"""
Portfolio Council — FastAPI backend.

Bridges the Next.js frontend (localhost:3000) to gitclaw (the agent runtime).
Exposes git operations + the gitclaw run() flow as HTTP endpoints.

gitclaw is a Node.js library — this FastAPI server invokes the gitclaw CLI
as a subprocess and streams its output back to the browser as NDJSON.
That's the architecture: Python (FastAPI) ↔ Node (gitclaw) ↔ AWS Bedrock.
"""

from __future__ import annotations

import asyncio
import json
import re
from pathlib import Path
from typing import AsyncIterator

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from git_ops import (
    git_branch_create,
    git_branch_list,
    git_branch_current,
    git_checkout,
    git_log,
    git_revert,
    git_show,
)
from data_routes import router as data_router
from session_routes import router as session_router
from setup_routes import router as setup_router

# Agent repo is the parent of server/ (i.e. portfolio-agent/)
AGENT_DIR = Path(__file__).resolve().parent.parent

app = FastAPI(
    title="Portfolio Council API",
    description="FastAPI bridge to the gitclaw-powered Portfolio Council agent.",
    version="0.1.0",
)

# Mount data management routes (/api/data/*) and session routes (/api/session/*, /api/workspace/*)
app.include_router(data_router)
app.include_router(session_router)
# /api/setup/* — first-run provider configuration (must be reachable before any other endpoint works).
app.include_router(setup_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "name": "Portfolio Council API",
        "agent_dir": str(AGENT_DIR),
        "engine": "gitclaw (invoked as subprocess)",
        "endpoints": [
            "GET  /api/log",
            "GET  /api/log/{commit_hash}",
            "GET  /api/branches",
            "POST /api/run",
            "POST /api/fork",
            "POST /api/revert",
            "POST /api/checkout",
        ],
    }


# ─────────────────────────────────────────────────────────────────────────
# READ endpoints (git operations on the agent repo)
# ─────────────────────────────────────────────────────────────────────────


@app.get("/api/log")
def get_log(max_count: int = 50):
    """Git log of the agent repo. Each commit = one session card in the UI."""
    try:
        commits = git_log(AGENT_DIR, max_count=max_count)
        return {"commits": commits, "count": len(commits)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/log/{commit_hash}")
def get_commit(commit_hash: str):
    """Full body + diff of a single commit (session detail view)."""
    try:
        return git_show(AGENT_DIR, commit_hash)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/api/branches")
def list_branches():
    """List local branches + current branch (UI branch switcher)."""
    try:
        return {
            "current": git_branch_current(AGENT_DIR),
            "all": git_branch_list(AGENT_DIR),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────
# WRITE endpoints (mutating git operations on the agent repo)
# ─────────────────────────────────────────────────────────────────────────


class ForkRequest(BaseModel):
    name: str


@app.post("/api/fork")
def fork_agent(req: ForkRequest):
    """Create a new branch from current HEAD ('Fork Agent' UI button)."""
    try:
        branch = git_branch_create(AGENT_DIR, req.name)
        return {"ok": True, "branch": branch}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class CheckoutRequest(BaseModel):
    branch: str


@app.post("/api/checkout")
def checkout(req: CheckoutRequest):
    """Switch to a different branch (UI branch switcher dropdown)."""
    try:
        git_checkout(AGENT_DIR, req.branch)
        return {"ok": True, "current": git_branch_current(AGENT_DIR)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class RevertRequest(BaseModel):
    commit_hash: str
    reason: str | None = None


@app.post("/api/revert")
def revert(req: RevertRequest):
    """Revert a commit, with optional reason captured in the new commit."""
    try:
        new_hash = git_revert(AGENT_DIR, req.commit_hash, req.reason)
        return {"ok": True, "new_commit": new_hash}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────
# RUN endpoint — invokes gitclaw as a subprocess, streams output as NDJSON
# ─────────────────────────────────────────────────────────────────────────


class RunRequest(BaseModel):
    prompt: str
    # When set, run the named sub-agent directly (e.g. "onboarding") instead of
    # the parent orchestrator. The orchestrator role-plays sub-agents from its
    # own SOUL.md description, which overrides the sub-agent's actual rules —
    # so the onboarding chat must hit agents/onboarding/ directly.
    agent: str | None = None


# Whitelist of sub-agents the API will spawn directly. Anything not in here
# falls back to the parent orchestrator at AGENT_DIR.
SUB_AGENTS = {"onboarding", "analyst", "strategist", "risk", "execution"}


def resolve_agent_dir(agent: str | None) -> Path:
    if not agent:
        return AGENT_DIR
    if agent not in SUB_AGENTS:
        raise HTTPException(status_code=400, detail=f"Unknown agent: {agent}")
    return AGENT_DIR / "agents" / agent


# Lines that should never reach the chat bubble. gitclaw prints a startup
# banner ("onboarding v0.1.0", Model:, Tools:, etc.) and Node v20 emits an
# AWS-SDK deprecation warning — neither is part of the agent's response.
# gitclaw wraps these in ANSI escapes (\x1b[1m…\x1b[0m), so we strip ANSI
# before matching.
_ANSI_RE = re.compile(r"\x1b\[[0-9;]*[a-zA-Z]")
_NOISE_PATTERNS = (
    re.compile(r"^[A-Za-z0-9_-]+\s+v\S+\s*$"),       # banner header (name v0.1.0)
    re.compile(r"^Model:\s"),
    re.compile(r"^Tools:\s"),
    re.compile(r"^Skills:\s"),
    re.compile(r"^Agents:\s"),
    re.compile(r"^Type\s+/\S+\s+to\s+"),               # "Type /skills to list skills..."
    re.compile(r"^\(node:\d+\)"),                      # Node process warning
    re.compile(r"^\[system\]\s+Node warning"),         # gitclaw-prefixed copy
    re.compile(r"NodeVersionSupportWarning"),
    re.compile(r"versions published after"),
    re.compile(r"will require node"),
    re.compile(r"^You are running node"),
    re.compile(r"To continue receiving updates"),
    re.compile(r"and security updates"),
    re.compile(r"More information can be found at:"),
    re.compile(r"^\(Use `node"),
    re.compile(r"^Task\s.*completed"),                 # "Task abc completed in 2.3s"
)


def _is_noise(line: str) -> bool:
    clean = _ANSI_RE.sub("", line).strip()
    if not clean:
        return False
    return any(p.search(clean) for p in _NOISE_PATTERNS)


async def stream_gitclaw(prompt: str, agent_dir: Path) -> AsyncIterator[bytes]:
    """
    Run gitclaw subprocess; stream each stdout line back to the client
    as one line of NDJSON ({"type": "output", "text": "..."}).
    """

    def sse_event(obj: dict) -> bytes:
        return (json.dumps(obj) + "\n").encode("utf-8")

    yield sse_event({"type": "session_start", "agent_dir": str(agent_dir)})

    try:
        process = await asyncio.create_subprocess_exec(
            "gitclaw",
            "--dir",
            str(agent_dir),
            "--prompt",
            prompt,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            env=None,  # inherit env (.env vars get loaded by gitclaw itself)
        )

        assert process.stdout is not None

        async for raw in process.stdout:
            text = raw.decode("utf-8", errors="replace").rstrip("\n")
            if not text:
                continue
            if _is_noise(text):
                continue
            # Heuristic: gitclaw prefixes tool calls with "▶" and errors with "✗"
            event_type = "output"
            if text.lstrip().startswith("▶"):
                event_type = "tool_use"
            elif text.lstrip().startswith("✗"):
                event_type = "error_line"
            elif text.startswith("["):
                event_type = "system"
            yield sse_event({"type": event_type, "text": text})

        return_code = await process.wait()
        yield sse_event({"type": "session_end", "return_code": return_code})

    except FileNotFoundError:
        yield sse_event(
            {"type": "error", "message": "gitclaw CLI not found in PATH"}
        )
    except Exception as e:
        yield sse_event({"type": "error", "message": str(e)})


@app.post("/api/run")
async def run_session(req: RunRequest):
    """
    Stream gitclaw's response back to the browser as NDJSON.
    The frontend reads response.body chunk by chunk and appends each
    line to the Live Activity panel in real time.
    """
    agent_dir = resolve_agent_dir(req.agent)
    return StreamingResponse(
        stream_gitclaw(req.prompt, agent_dir),
        media_type="application/x-ndjson",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
        },
    )
