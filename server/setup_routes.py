"""
Portfolio Council — first-run setup endpoints.

The agents can't reach a model without provider credentials. These endpoints
let the user configure credentials from the web UI on a fresh clone, so
nobody has to hand-edit `.env` before `docker compose up`.

Endpoints:
    GET  /api/setup/status        — which providers are configured + active
    GET  /api/setup/providers     — supported providers + their fields
    POST /api/setup/credentials   — write fields to .env atomically + hot-reload
    POST /api/setup/test          — make a 1-token sanity call against a provider

Security: these routes write to disk and validate live credentials, so they
MUST stay localhost-only. The docker-compose ports bind to 127.0.0.1; do not
expose them on a remote host without adding auth.
"""

from __future__ import annotations

import asyncio
import json
import os
import re
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/setup", tags=["setup"])

# Repo root — parent of server/ — same convention as main.py.
AGENT_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = AGENT_DIR / ".env"


# ─────────────────────────────────────────────────────────────────────────
# Provider catalog
# ─────────────────────────────────────────────────────────────────────────
#
# Each provider lists the env vars it needs, the gitclaw model-string prefix,
# and a default model id the agents can use out of the box. These are the
# four providers gitclaw supports natively (see
# /home/.../gitclaw/dist/loader.js knownProviders set).

PROVIDERS: dict[str, dict[str, Any]] = {
    "amazon-bedrock": {
        "label": "AWS Bedrock (Claude Sonnet 4.5)",
        "description": "Use Anthropic models hosted on Amazon Bedrock. Recommended for production-grade SOUL adherence.",
        "model_string": "amazon-bedrock:us.anthropic.claude-sonnet-4-5-20250929-v1:0",
        "fields": [
            {
                "name": "AWS_BEARER_TOKEN_BEDROCK",
                "label": "Bedrock API key",
                "type": "password",
                "required": True,
                "help": "The newer 2025 bearer-token. Get it from IAM Identity Center or Lyzr Studio.",
            },
            {
                "name": "AWS_DEFAULT_REGION",
                "label": "AWS region",
                "type": "text",
                "required": True,
                "default": "us-east-1",
                "help": "Region where you enabled Claude Sonnet 4.5 model access.",
            },
        ],
    },
    "anthropic": {
        "label": "Anthropic (direct)",
        "description": "Claude models via Anthropic's API. Fastest path if you already have an Anthropic key.",
        "model_string": "anthropic:claude-sonnet-4-5-20250929",
        "fields": [
            {
                "name": "ANTHROPIC_API_KEY",
                "label": "Anthropic API key",
                "type": "password",
                "required": True,
                "help": "Get one at console.anthropic.com/settings/keys.",
            },
        ],
    },
    "openai": {
        "label": "OpenAI (direct)",
        "description": "GPT-5 / GPT-4o via OpenAI's API. SOUL adherence on smaller models may vary.",
        "model_string": "openai:gpt-5-mini",
        "fields": [
            {
                "name": "OPENAI_API_KEY",
                "label": "OpenAI API key",
                "type": "password",
                "required": True,
                "help": "Get one at platform.openai.com/api-keys.",
            },
        ],
    },
    "azure-openai-responses": {
        "label": "Azure AI Foundry (Azure OpenAI)",
        "description": "OpenAI models via Azure deployments. Useful if your org is on Azure.",
        "model_string": "azure-openai-responses:gpt-5-mini",
        "fields": [
            {
                "name": "AZURE_OPENAI_API_KEY",
                "label": "Azure OpenAI API key",
                "type": "password",
                "required": True,
                "help": "From your Azure AI Foundry resource > Keys and Endpoint.",
            },
            {
                "name": "AZURE_OPENAI_BASE_URL",
                "label": "Resource base URL",
                "type": "text",
                "required": True,
                "help": "e.g. https://my-foundry.openai.azure.com",
            },
            {
                "name": "AZURE_OPENAI_API_VERSION",
                "label": "API version",
                "type": "text",
                "required": True,
                "default": "preview",
                "help": "Use 'preview' for the Responses API.",
            },
            {
                "name": "AZURE_OPENAI_DEPLOYMENT_NAME_MAP",
                "label": "Deployment map",
                "type": "text",
                "required": True,
                "default": "gpt-5-mini=gpt-5-mini",
                "help": "model-id=deployment-name (comma-separated for multiple).",
            },
        ],
    },
}


# ─────────────────────────────────────────────────────────────────────────
# .env read/write helpers
# ─────────────────────────────────────────────────────────────────────────


def _read_env() -> dict[str, str]:
    """Parse the current .env into a dict. Returns {} if file missing."""
    if not ENV_PATH.exists():
        return {}
    result: dict[str, str] = {}
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if "=" not in stripped:
            continue
        key, _, val = stripped.partition("=")
        key = key.strip()
        val = val.strip().strip('"').strip("'")
        result[key] = val
    return result


def _write_env_atomic(updates: dict[str, str]) -> None:
    """
    Merge `updates` into .env, preserving any keys we don't know about.
    Empty-string values cause the key to be removed.
    """
    current = _read_env()
    current.update({k: v for k, v in updates.items() if v != ""})
    for k, v in list(updates.items()):
        if v == "":
            current.pop(k, None)

    lines = [
        "# Portfolio Council — generated by /api/setup/credentials.",
        "# Hand-edit if you prefer; the in-product setup page will read it back.",
        "",
    ]
    for k in sorted(current):
        # Quote values with whitespace; leave the rest unquoted for readability.
        v = current[k]
        if any(ch.isspace() for ch in v):
            lines.append(f'{k}="{v}"')
        else:
            lines.append(f"{k}={v}")

    tmp = ENV_PATH.with_suffix(".env.tmp")
    tmp.write_text("\n".join(lines) + "\n", encoding="utf-8")
    tmp.replace(ENV_PATH)

    # Push into the current process environment so the next subprocess call
    # picks the new vars up without restarting uvicorn.
    for k, v in updates.items():
        if v == "":
            os.environ.pop(k, None)
        else:
            os.environ[k] = v


def _provider_configured(provider_key: str) -> bool:
    """True iff every required field for this provider is non-empty."""
    spec = PROVIDERS.get(provider_key)
    if not spec:
        return False
    env = _read_env()
    for field in spec["fields"]:
        if field.get("required") and not (env.get(field["name"]) or os.environ.get(field["name"])):
            return False
    return True


def _active_provider() -> str | None:
    """Inspect agent.yaml model.preferred → resolve to a provider key."""
    yaml_path = AGENT_DIR / "agent.yaml"
    if not yaml_path.exists():
        return None
    text = yaml_path.read_text(encoding="utf-8")
    m = re.search(r'preferred:\s*"?([a-z0-9-]+):', text)
    if not m:
        return None
    return m.group(1)


# ─────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────


class SetupStatus(BaseModel):
    ready: bool = Field(description="True iff at least one provider is fully configured.")
    active_provider: str | None
    configured: dict[str, bool]


@router.get("/status", response_model=SetupStatus)
def setup_status() -> SetupStatus:
    """Which providers are configured + which one is currently active in agent.yaml."""
    configured = {key: _provider_configured(key) for key in PROVIDERS}
    return SetupStatus(
        ready=any(configured.values()),
        active_provider=_active_provider(),
        configured=configured,
    )


@router.get("/providers")
def list_providers() -> dict[str, Any]:
    """Catalog of supported providers + field schemas for the setup form."""
    return {"providers": PROVIDERS}


class CredentialsPayload(BaseModel):
    provider: str
    fields: dict[str, str]
    # If true, also rewrite agent.yaml's model.preferred to this provider's
    # default model string. Lets the UI "save + activate" in one click.
    make_active: bool = True


@router.post("/credentials")
def write_credentials(payload: CredentialsPayload) -> dict[str, Any]:
    """Validate fields, write them to .env, optionally activate the provider in agent.yaml."""
    spec = PROVIDERS.get(payload.provider)
    if not spec:
        raise HTTPException(400, f"Unknown provider: {payload.provider}")

    # Validate required fields are present + non-empty.
    missing: list[str] = []
    for field in spec["fields"]:
        if field.get("required") and not payload.fields.get(field["name"], "").strip():
            missing.append(field["name"])
    if missing:
        raise HTTPException(400, f"Missing required fields: {missing}")

    # Light-touch validation on a few common-foot-gun fields.
    if payload.provider == "azure-openai-responses":
        base_url = payload.fields.get("AZURE_OPENAI_BASE_URL", "")
        if base_url and not base_url.startswith("https://"):
            raise HTTPException(
                400,
                "AZURE_OPENAI_BASE_URL must start with https:// (e.g. https://my-foundry.openai.azure.com)",
            )
    if payload.provider == "amazon-bedrock":
        region = payload.fields.get("AWS_DEFAULT_REGION", "")
        if region and not re.match(r"^[a-z]{2}-[a-z]+-\d$", region):
            raise HTTPException(
                400,
                f"AWS_DEFAULT_REGION '{region}' doesn't look like an AWS region (e.g. us-east-1).",
            )

    _write_env_atomic(payload.fields)

    if payload.make_active:
        _set_active_provider_in_yaml(payload.provider, spec["model_string"])

    return {
        "ok": True,
        "provider": payload.provider,
        "active": payload.make_active,
        "model_string": spec["model_string"],
    }


def _set_active_provider_in_yaml(provider: str, model_string: str) -> None:
    """Rewrite agent.yaml + every agents/*/agent.yaml's `model.preferred` line."""
    yamls = [AGENT_DIR / "agent.yaml"] + sorted(
        (AGENT_DIR / "agents").glob("*/agent.yaml")
    )
    pattern = re.compile(r'^(\s*preferred:\s*)"?[^"\n]+"?\s*$', re.MULTILINE)
    replacement = rf'\1"{model_string}"'
    for path in yamls:
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8")
        new_text = pattern.sub(replacement, text)
        if new_text != text:
            path.write_text(new_text, encoding="utf-8")


class TestPayload(BaseModel):
    provider: str
    # If omitted, test the currently-saved credentials. If present, test these
    # without writing them to disk first.
    fields: dict[str, str] | None = None


@router.post("/test")
async def test_provider(payload: TestPayload) -> dict[str, Any]:
    """
    Make a tiny live call against the provider to verify credentials work.
    Returns {ok, latency_ms, sample_text} on success, raises 4xx with a
    descriptive error message on failure.
    """
    spec = PROVIDERS.get(payload.provider)
    if not spec:
        raise HTTPException(400, f"Unknown provider: {payload.provider}")

    # Build env: start with current .env on disk + os.environ, overlay fields
    # if the caller provided them.
    env = {**os.environ, **_read_env()}
    if payload.fields:
        env.update(payload.fields)

    # Check required fields.
    for field in spec["fields"]:
        if field.get("required") and not env.get(field["name"]):
            raise HTTPException(400, f"Missing required field: {field['name']}")

    # Easiest, most-honest test: spawn `gitclaw --model <model_string> --prompt 'hi'`
    # in a throwaway dir; if the auth/model call succeeds, return success.
    # 25-second timeout keeps the UI responsive.
    import time

    start = time.monotonic()
    try:
        process = await asyncio.create_subprocess_exec(
            "gitclaw",
            "--dir",
            str(AGENT_DIR / "agents" / "onboarding"),
            "--model",
            spec["model_string"],
            "--prompt",
            "Reply with the single word OK and nothing else.",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            env={**env},
        )
        try:
            stdout_bytes, _ = await asyncio.wait_for(process.communicate(), timeout=25)
        except asyncio.TimeoutError:
            process.kill()
            raise HTTPException(504, "Provider test timed out after 25s — check region / network / VPN.")
    except FileNotFoundError:
        raise HTTPException(500, "gitclaw CLI not on PATH inside the server container.")

    latency_ms = int((time.monotonic() - start) * 1000)
    text = stdout_bytes.decode("utf-8", errors="replace")

    # Strip ANSI noise + look for auth failures.
    ansi = re.compile(r"\x1b\[[0-9;]*[a-zA-Z]")
    clean = ansi.sub("", text).strip()

    if process.returncode != 0:
        # Surface the most useful single-line error from gitclaw's stderr.
        hint = _diagnose_failure(clean, payload.provider)
        raise HTTPException(400, f"Provider test failed: {hint}")

    # Pull out the actual response (skip the banner lines).
    response_lines = [
        ln for ln in clean.splitlines()
        if ln and not _is_banner_line(ln)
    ]
    sample = " ".join(response_lines)[:200]
    return {"ok": True, "latency_ms": latency_ms, "sample_text": sample}


def _is_banner_line(line: str) -> bool:
    return bool(
        re.match(r"^[A-Za-z0-9_-]+\s+v\S+\s*$", line)
        or re.match(r"^(Model|Tools|Skills|Agents|Type):", line)
    )


def _diagnose_failure(output: str, provider: str) -> str:
    """Map common gitclaw / SDK errors to a one-line hint for the user."""
    low = output.lower()
    if "is not set" in low or "missing" in low:
        return f"environment variable missing. Re-check the required fields for {provider}."
    if "unauthorized" in low or "authentication" in low or "401" in low or "403" in low:
        return "credentials rejected by provider. Token may be wrong, expired, or missing scope."
    if "region" in low and provider == "amazon-bedrock":
        return "region issue. Make sure Claude Sonnet 4.5 model access is enabled in that AWS region."
    if "network" in low or "enotfound" in low or "econnrefused" in low:
        return "network error reaching the provider. Check VPN / firewall / DNS."
    if "rate" in low and "limit" in low:
        return "rate-limited by provider. Try again in a minute."
    # Fall back to the last non-empty line of output.
    for ln in reversed(output.splitlines()):
        ln = ln.strip()
        if ln and not _is_banner_line(ln):
            return ln[:300]
    return "unknown error — see backend logs."
