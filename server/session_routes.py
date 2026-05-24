"""
Session artifact endpoints. The session panel UI fetches:
  - /api/session/latest → metadata + summaries for all 4 agents
  - /api/workspace/{filename} → full markdown of a single artifact
  - /api/session/{date} → all 4 artifacts for a specific date
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api", tags=["session"])

AGENT_DIR = Path(__file__).resolve().parent.parent
WORKSPACE_DIR = AGENT_DIR / "workspace"

AgentName = Literal["analyst", "strategist", "risk", "execution"]
AGENTS: list[AgentName] = ["analyst", "strategist", "risk", "execution"]
AGENT_FILE_PREFIX = {
    "analyst": "analysis",
    "strategist": "proposal",
    "risk": "verdict",
    "execution": "orders",
}


# ─────────────────────────────────────────────────────────────────────────
# Summary parsers — extract 3-6 key bullets per agent
# ─────────────────────────────────────────────────────────────────────────


def _bullets_from_section(md: str, section_pattern: str, limit: int = 6) -> list[str]:
    """Find a section heading matching pattern, return up to `limit` bullets under it."""
    match = re.search(
        rf"^#+\s*[\d.]*\s*{section_pattern}.*?$",
        md,
        re.IGNORECASE | re.MULTILINE,
    )
    if not match:
        return []
    start = match.end()
    # Read until next heading
    rest = md[start:]
    end_match = re.search(r"^#+\s", rest, re.MULTILINE)
    section_body = rest[: end_match.start()] if end_match else rest

    bullets: list[str] = []
    for line in section_body.splitlines():
        line = line.strip()
        if line.startswith("-") or line.startswith("*"):
            cleaned = line.lstrip("-*").strip()
            # Drop markdown emphasis for cleaner display
            cleaned = re.sub(r"\*\*(.*?)\*\*", r"\1", cleaned)
            if cleaned and len(cleaned) > 5:
                bullets.append(cleaned[:200])
        if len(bullets) >= limit:
            break
    return bullets


def _first_table_summary(md: str, label: str) -> str | None:
    """Count rows in the first markdown table in `md`."""
    rows = re.findall(r"^\|[^|\n]+\|", md, re.MULTILINE)
    # Exclude header + separator (---|--- lines)
    data_rows = [r for r in rows if not re.match(r"^\|\s*-+\s*\|", r) and "---" not in r]
    # Subtract one for the header row
    n = max(0, len(data_rows) - 1)
    return f"{n} {label}" if n > 0 else None


def parse_analyst(md: str) -> dict:
    summary: list[str] = []
    # Section 3: Concentration risks
    risks = _bullets_from_section(md, r"Concentration Risks?", limit=3)
    summary.extend(f"⚠ {r}" for r in risks[:2] if r.lower().find("none") < 0)

    # Section 5: Goal progress — pull "Trend: ..." line + corpus
    trend_match = re.search(
        r"Trend.*?:\s*(BEHIND|ON TRACK|AHEAD)", md, re.IGNORECASE
    )
    if trend_match:
        summary.append(f"Goal trend: {trend_match.group(1).upper()}")

    corpus_match = re.search(r"Current corpus:\s*₹([\d,.]+)", md, re.IGNORECASE)
    if corpus_match:
        summary.append(f"Corpus: ₹{corpus_match.group(1)}")

    # Notable anomalies
    anomalies = _bullets_from_section(md, r"Notable Anomalies", limit=2)
    summary.extend(anomalies[:1])

    return {"summary": summary[:6]}


def parse_strategist(md: str) -> dict:
    summary: list[str] = []
    # Actions table — count rows
    count = _first_table_summary(md, "actions proposed")
    if count:
        summary.append(count)

    # Find specific action mentions
    actions = re.findall(r"\|\s*(TRIM|BUY|SELL|HOLD)\s*\|\s*([A-Z]+)", md)
    if actions:
        # Aggregate, first 3
        for verb, sym in actions[:3]:
            summary.append(f"{verb} {sym}")

    # Plan B
    if re.search(r"^#+\s*[\d.]*\s*Plan\s*B", md, re.IGNORECASE | re.MULTILINE):
        summary.append("Includes Plan B alternative")

    return {"summary": summary[:6]}


def parse_risk(md: str) -> dict:
    summary: list[str] = []
    verdict: str | None = None
    # Section 1: Verdict — bold token
    for v in ("VETO", "APPROVE", "AMEND"):
        if re.search(rf"\*\*{v}\*\*", md) or re.search(
            rf"^Verdict:\s*{v}", md, re.MULTILINE
        ):
            verdict = v
            break

    # One-line summary right after verdict
    sum_match = re.search(
        r"One-line summary:\s*(.+)$", md, re.IGNORECASE | re.MULTILINE
    )
    if sum_match:
        summary.append(sum_match.group(1).strip()[:200])

    # Adversarial concerns — pull 2-3
    concerns = _bullets_from_section(md, r"Adversarial Concerns?", limit=3)
    summary.extend(concerns[:2])

    return {"summary": summary[:6], "verdict": verdict}


def parse_execution(md: str) -> dict:
    summary: list[str] = []
    # Count "Order N:" sections
    order_blocks = re.findall(r"^#+\s*Order\s+\d+", md, re.MULTILINE)
    n = len(order_blocks)
    if n > 0:
        summary.append(f"{n} broker-ready orders")

    # First 2 actions
    actions = re.findall(
        r"\*\*Action\*\*:\s*(BUY|SELL|TRIM)\s*\n\s*-\s*\*\*Symbol\*\*:\s*([A-Z]+)",
        md,
        re.IGNORECASE,
    )
    for verb, sym in actions[:3]:
        summary.append(f"{verb} {sym}")

    # Was this blocked?
    if re.search(r"refus(al|e)|blocked|cannot", md, re.IGNORECASE):
        summary.append("⚠ Execution refused (Risk did not APPROVE)")

    return {"summary": summary[:6]}


PARSERS = {
    "analyst": parse_analyst,
    "strategist": parse_strategist,
    "risk": parse_risk,
    "execution": parse_execution,
}


def list_session_dates() -> list[str]:
    """Find all dates that have at least one workspace artifact."""
    if not WORKSPACE_DIR.exists():
        return []
    dates: set[str] = set()
    for p in WORKSPACE_DIR.iterdir():
        m = re.match(r"^(?:analysis|proposal|verdict|orders)-(\d{4}-\d{2}-\d{2})\.md$", p.name)
        if m:
            dates.add(m.group(1))
    return sorted(dates, reverse=True)


def load_agent_artifact(agent: AgentName, date: str) -> dict:
    prefix = AGENT_FILE_PREFIX[agent]
    path = WORKSPACE_DIR / f"{prefix}-{date}.md"
    if not path.exists():
        # Also check versioned (proposal-v2-<date>.md)
        v2 = WORKSPACE_DIR / f"{prefix}-v2-{date}.md"
        path = v2 if v2.exists() else path
    if not path.exists():
        return {
            "agent": agent,
            "exists": False,
            "filename": None,
            "size": 0,
            "summary": [],
        }
    raw = path.read_text(encoding="utf-8")
    parsed = PARSERS[agent](raw)
    return {
        "agent": agent,
        "exists": True,
        "filename": path.name,
        "size": len(raw),
        **parsed,
    }


# ─────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────


@router.get("/session/latest")
def get_latest_session():
    """Return summary + status for all 4 agents on the latest session date."""
    dates = list_session_dates()
    if not dates:
        return {"date": None, "agents": {a: {"agent": a, "exists": False} for a in AGENTS}}
    latest = dates[0]
    return {
        "date": latest,
        "available_dates": dates[:20],
        "agents": {a: load_agent_artifact(a, latest) for a in AGENTS},
    }


@router.get("/session/{date}")
def get_session_by_date(date: str):
    """Return summaries for all 4 agents on a specific date."""
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", date):
        raise HTTPException(400, "date must be YYYY-MM-DD")
    return {
        "date": date,
        "agents": {a: load_agent_artifact(a, date) for a in AGENTS},
    }


@router.get("/workspace/{filename}")
def get_workspace_file(filename: str):
    """Return the raw markdown content of a workspace artifact."""
    # Guard against path traversal
    if "/" in filename or ".." in filename or not filename.endswith(".md"):
        raise HTTPException(400, "Invalid filename")
    # Match: <type>-<optional-version>-<YYYY-MM-DD>.md  (allows v2 suffixes)
    # Or any plain alphanumeric/hyphen/underscore name ending in .md
    if not re.match(r"^[a-zA-Z0-9_.\-]+\.md$", filename):
        raise HTTPException(400, "Invalid filename format")
    path = WORKSPACE_DIR / filename
    if not path.exists() or not path.is_file():
        raise HTTPException(404, f"{filename} not found in workspace/")
    return {"filename": filename, "raw": path.read_text(encoding="utf-8")}
