// Shared API client. Components should import from here.

import type { Commit, StreamMsg, SetupStatus } from "./types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

/**
 * Turn a raw HTTP error / fetch failure into a sentence a human can read.
 * Maps known status codes to actionable messages.
 */
export function humanizeError(input: unknown, context: string = "Request"): string {
  // Network / CORS / backend down
  if (input instanceof TypeError && input.message.includes("fetch")) {
    return `Can't reach the backend. Is it running on ${API_BASE}? Try \`docker compose up\` or start uvicorn on port 8000.`;
  }
  const msg = input instanceof Error ? input.message : String(input);
  // Try to extract HTTP status code from the message
  const statusMatch = msg.match(/\b(\d{3})\b/);
  const status = statusMatch ? Number(statusMatch[1]) : undefined;
  switch (status) {
    case 400:
      return `${context} rejected — the data sent looks malformed. (${msg})`;
    case 401:
    case 403:
      return `${context} blocked — auth/credentials missing or rejected.`;
    case 404:
      return `${context} not found — the file or endpoint doesn't exist yet.`;
    case 413:
      return `${context} too large — we accept files up to 10 MB.`;
    case 500:
      return `Server error — check the backend terminal for a Python traceback.`;
    case 502:
    case 503:
    case 504:
      return `Upstream service unreachable — usually means Bedrock/Azure isn't responding. Check your AWS_BEARER_TOKEN_BEDROCK.`;
    default:
      return msg;
  }
}

export async function getLog(maxCount = 100): Promise<Commit[]> {
  const res = await fetch(`${API_BASE}/api/log?max_count=${maxCount}`);
  if (!res.ok) throw new Error(`getLog failed: ${res.status}`);
  const data = await res.json();
  return data.commits ?? [];
}

export async function getBranches(): Promise<{
  current: string;
  all: string[];
}> {
  const res = await fetch(`${API_BASE}/api/branches`);
  if (!res.ok) throw new Error(`getBranches failed: ${res.status}`);
  return res.json();
}

/**
 * Detect setup status by checking whether key files exist in the agent repo.
 * Uses git log heuristics + a probe of /api/log to check for recent
 * onboarding commits. Returns whether onboarding is needed.
 *
 * This is the "fake auth" — we don't have real users, we have repo state.
 */
export async function getSetupStatus(): Promise<SetupStatus> {
  // Actually probe the file status endpoint — each file checked independently.
  // No more "if user_plan exists then everything exists" lie.
  try {
    const files = await getDataFiles();
    const hasUserPlan = files.user_plan !== null;
    const hasRules = files.rules !== null;
    const hasHoldings = files.holdings !== null;
    return {
      hasUserPlan,
      hasRules,
      hasHoldings,
      // Truly "ready" to run a session requires all three.
      ready: hasUserPlan && hasRules && hasHoldings,
    };
  } catch {
    return {
      hasUserPlan: false,
      hasRules: false,
      hasHoldings: false,
      ready: false,
    };
  }
}

// gitclaw wraps its process metadata in ANSI styling: bold (\x1b[1m) for the
// agent name line, dim (\x1b[2m) for everything else (model/tools/skills
// banner, tool execution markers, tool-result previews, memory dumps). The
// agent's actual spoken response is written plain (no ANSI). So the right
// noise filter isn't "match these strings" — it's "drop everything that's
// inside a bold or dim range".
export type AnsiState = { inDim: boolean; inBold: boolean };

const ANSI_CSI = /^\x1b\[([0-9;]*)([a-zA-Z])/;

/**
 * Walk `text` character by character, threading the bold/dim state given
 * in `state` (mutated in place so the caller can carry state across stream
 * events). Returns only the characters that were emitted while in plain
 * (non-bold, non-dim) mode.
 */
export function extractPlainText(text: string, state: AnsiState): string {
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] === "\x1b" && text[i + 1] === "[") {
      const m = text.slice(i).match(ANSI_CSI);
      if (!m) { i++; continue; }
      // Only SGR (set-graphics-rendition) escapes — `\x1b[<codes>m` — affect
      // bold/dim. Cursor motion etc. (`H`, `J`, `K`) are ignored.
      if (m[2] === "m") {
        const codes = m[1] === "" ? ["0"] : m[1].split(";");
        for (const c of codes) {
          if (c === "0" || c === "") {
            state.inDim = false;
            state.inBold = false;
          } else if (c === "1") {
            state.inBold = true;
          } else if (c === "2") {
            state.inDim = true;
          } else if (c === "22") {
            state.inDim = false;
            state.inBold = false;
          }
        }
      }
      i += m[0].length;
    } else {
      if (!state.inDim && !state.inBold) out.push(text[i]);
      i++;
    }
  }
  return out.join("");
}

// Belt-and-suspenders regexes for plain-text noise that's *not* wrapped in
// ANSI (Node v20 AWS-SDK deprecation warning lines come from Node itself
// before gitclaw can style them, and the warning is dumped on stderr which
// FastAPI merges into stdout). These run after ANSI extraction.
export const NOISE_PATTERNS: RegExp[] = [
  /^\(node:\d+\)/, //                              (node:12345) Warning: …
  /^\[system\]\s+Node warning/,
  /NodeVersionSupportWarning/,
  /versions published after/,
  /will require node/,
  /^You are running node/,
  /To continue receiving updates/,
  /and security updates/,
  /More information can be found at:/,
  /^\(Use `node/,
  /^Task\s.*completed/,
];

export function isNoiseLine(line: string): boolean {
  return NOISE_PATTERNS.some((p) => p.test(line));
}

/**
 * Stateless one-shot strip — used as a final-pass cleanup on the
 * accumulated bubble text. Strips ANSI, then drops banner/warning lines.
 */
export function stripNoise(text: string): string {
  // Use a fresh state because this entry point is for already-accumulated
  // text (which may have lost the ANSI escapes already) — anything still
  // wrapped in dim/bold here is a stray fragment we should drop.
  const plain = extractPlainText(text, { inDim: false, inBold: false });
  return plain
    .split("\n")
    .filter((line) => line.trim() === "" || !isNoiseLine(line))
    .join("\n")
    .replace(/^\n+/, "");
}

/**
 * POST a prompt to gitclaw. Returns an AsyncIterable of StreamMsg events.
 * Each yielded message is one line of NDJSON from the backend. Banner /
 * warning lines are filtered out at the source — consumers receive clean
 * agent speech only.
 */
export async function* streamRun(
  prompt: string,
  agent?: string,
): AsyncIterableIterator<StreamMsg> {
  const res = await fetch(`${API_BASE}/api/run`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(agent ? { prompt, agent } : { prompt }),
  });

  if (!res.body) {
    yield { type: "error", message: "No response body from server" };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  // Dim/bold state has to persist across events because gitclaw can split a
  // `\x1b[2m…\x1b[0m` region across multiple output events. Resetting per
  // event would let dimmed content leak through whenever the dim-start
  // arrived in one event and the content arrived in the next.
  const ansiState: AnsiState = { inDim: false, inBold: false };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        let msg: StreamMsg;
        try {
          msg = JSON.parse(line) as StreamMsg;
        } catch {
          continue; // partial line during streaming
        }
        if (msg.type === "output" && typeof msg.text === "string") {
          // Drop anything inside a bold/dim region (banner, tool output,
          // memory dump) and any leftover plain-text Node warnings.
          const plain = extractPlainText(msg.text, ansiState);
          const cleaned = plain
            .split("\n")
            .filter((l) => l.trim() === "" || !isNoiseLine(l))
            .join("\n");
          if (!cleaned.trim()) continue;
          msg = { ...msg, text: cleaned };
        }
        yield msg;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ─── /api/setup/* — provider credentials ──────────────────────────────────

export type ProviderField = {
  name: string;
  label: string;
  type: "text" | "password";
  required?: boolean;
  default?: string;
  help?: string;
};

export type ProviderSpec = {
  label: string;
  description: string;
  model_string: string;
  fields: ProviderField[];
};

export type ProviderCatalog = {
  providers: Record<string, ProviderSpec>;
};

export type ProviderStatus = {
  ready: boolean;
  active_provider: string | null;
  configured: Record<string, boolean>;
};

export async function getProviderStatus(): Promise<ProviderStatus> {
  const res = await fetch(`${API_BASE}/api/setup/status`);
  if (!res.ok) throw new Error(`status ${res.status}`);
  return (await res.json()) as ProviderStatus;
}

export async function getProviderCatalog(): Promise<ProviderCatalog> {
  const res = await fetch(`${API_BASE}/api/setup/providers`);
  if (!res.ok) throw new Error(`status ${res.status}`);
  return (await res.json()) as ProviderCatalog;
}

export async function saveCredentials(
  provider: string,
  fields: Record<string, string>,
  makeActive = true,
): Promise<{
  ok: boolean;
  provider: string;
  active: boolean;
  model_string: string;
}> {
  const res = await fetch(`${API_BASE}/api/setup/credentials`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ provider, fields, make_active: makeActive }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(data?.detail ?? `status ${res.status}`);
  }
  return await res.json();
}

export async function testProvider(
  provider: string,
  fields?: Record<string, string>,
): Promise<{ ok: boolean; latency_ms: number; sample_text: string }> {
  const res = await fetch(`${API_BASE}/api/setup/test`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ provider, fields }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(data?.detail ?? `status ${res.status}`);
  }
  return await res.json();
}

/**
 * Strip ANSI escape sequences from gitclaw's terminal-colored output.
 */
export function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
}

export async function forkAgent(name: string) {
  const res = await fetch(`${API_BASE}/api/fork`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Fork failed: ${res.status}`);
  }
  return res.json();
}

export async function checkout(branch: string) {
  const res = await fetch(`${API_BASE}/api/checkout`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ branch }),
  });
  if (!res.ok) throw new Error(`Checkout failed: ${res.status}`);
  return res.json();
}

export async function revertCommit(commitHash: string, reason?: string) {
  const res = await fetch(`${API_BASE}/api/revert`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ commit_hash: commitHash, reason: reason ?? null }),
  });
  if (!res.ok) throw new Error(`Revert failed: ${res.status}`);
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────
// Data management — /api/data/*
// ─────────────────────────────────────────────────────────────────────────

export type FileStat = { size: number; modified: number } | null;
export type DataFileStatus = {
  user_plan: FileStat;
  rules: FileStat;
  holdings: FileStat;
};

export type ParsedUserPlan = {
  goalType?: string;
  targetAmount?: string;
  targetDate?: string;
  timeHorizon?: string;
  portfolioValue?: string;
  monthlyIncome?: string;
  netInvestable?: string;
  riskTolerance?: string;
  hardConstraints?: string[];
};

export type Holding = {
  symbol: string;
  qty: number;
  avg_price: number;
};

export async function getDataFiles(): Promise<DataFileStatus> {
  const res = await fetch(`${API_BASE}/api/data/files`);
  if (!res.ok) throw new Error(`getDataFiles failed: ${res.status}`);
  return res.json();
}

export async function getUserPlan(): Promise<{
  raw: string;
  parsed: ParsedUserPlan;
}> {
  const res = await fetch(`${API_BASE}/api/data/user_plan`);
  if (!res.ok) throw new Error(`getUserPlan failed: ${res.status}`);
  return res.json();
}

export async function putUserPlan(raw: string): Promise<{
  ok: boolean;
  size: number;
}> {
  const res = await fetch(`${API_BASE}/api/data/user_plan`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ raw }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `putUserPlan failed: ${res.status}`);
  }
  return res.json();
}

export async function deleteUserPlan(): Promise<{
  ok: boolean;
  deleted: string[];
}> {
  const res = await fetch(`${API_BASE}/api/data/user_plan`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`deleteUserPlan failed: ${res.status}`);
  return res.json();
}

export async function getRules(): Promise<{ raw: string }> {
  const res = await fetch(`${API_BASE}/api/data/rules`);
  if (!res.ok) throw new Error(`getRules failed: ${res.status}`);
  return res.json();
}

export async function getHoldings(): Promise<{ holdings: Holding[] }> {
  const res = await fetch(`${API_BASE}/api/data/holdings`);
  if (!res.ok) throw new Error(`getHoldings failed: ${res.status}`);
  return res.json();
}

/**
 * URL pointing at the example CSV — for "Download template" link in the UI.
 */
export const HOLDINGS_EXAMPLE_URL = `${API_BASE}/api/data/holdings/example`;

export type OnboardFormPayload = {
  goal_type: string;
  target_amount: number;
  target_date: string;
  portfolio_value: number;
  stocks_value?: number;
  cash_value?: number;
  other_value?: number;
  monthly_income: number;
  monthly_outflows: { label: string; amount: number }[];
  risk_tolerance: "low" | "medium" | "high";
  hard_constraints: string[];
};

/**
 * One-shot structured-form onboarding. Writes user_plan.md and RULES.md
 * directly. Replaces the slower chatbot intake for users who'd rather fill
 * a form than chat with an agent.
 */
export async function onboardFromForm(payload: OnboardFormPayload): Promise<{
  ok: boolean;
  user_plan_size: number;
  rules_size: number;
  net_investable: number;
}> {
  const res = await fetch(`${API_BASE}/api/data/onboard`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Onboard failed: ${res.status}`);
  }
  return res.json();
}

/**
 * Seed demo state. Overwrites memory/user_plan.md, RULES.md, data/holdings.json
 * from sanitized templates so a new user can run a session immediately.
 */
export async function seedDemo(): Promise<{ ok: boolean; seeded: string[] }> {
  const res = await fetch(`${API_BASE}/api/data/seed-demo`, { method: "POST" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Seed failed: ${res.status}`);
  }
  return res.json();
}

export async function uploadHoldings(file: File): Promise<{
  ok: boolean;
  count: number;
  holdings: Holding[];
  mapped_via?: string;
}> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/api/data/holdings/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Upload failed: ${res.status}`);
  }
  return res.json();
}

export async function deleteHoldings(): Promise<{
  ok: boolean;
  deleted: string | null;
}> {
  const res = await fetch(`${API_BASE}/api/data/holdings`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`deleteHoldings failed: ${res.status}`);
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────
// Session / workspace — artifact summaries + raw content
// ─────────────────────────────────────────────────────────────────────────

export type AgentSummary = {
  agent: "analyst" | "strategist" | "risk" | "execution";
  exists: boolean;
  filename?: string | null;
  size?: number;
  summary?: string[];
  verdict?: "APPROVE" | "VETO" | "AMEND" | null;
};

export type SessionData = {
  date: string | null;
  available_dates?: string[];
  agents: {
    analyst: AgentSummary;
    strategist: AgentSummary;
    risk: AgentSummary;
    execution: AgentSummary;
  };
};

export async function getLatestSession(): Promise<SessionData> {
  const res = await fetch(`${API_BASE}/api/session/latest`);
  if (!res.ok) throw new Error(`getLatestSession failed: ${res.status}`);
  return res.json();
}

export async function getSessionByDate(date: string): Promise<SessionData> {
  const res = await fetch(`${API_BASE}/api/session/${date}`);
  if (!res.ok) throw new Error(`getSessionByDate failed: ${res.status}`);
  return res.json();
}

export async function getWorkspaceFile(
  filename: string,
): Promise<{ filename: string; raw: string }> {
  const res = await fetch(`${API_BASE}/api/workspace/${filename}`);
  if (!res.ok) throw new Error(`getWorkspaceFile failed: ${res.status}`);
  return res.json();
}

/**
 * Stream a natural-language update request to the agent.
 * Returns NDJSON events similar to streamRun.
 */
export async function* streamUpdateViaChat(
  target: "user_plan" | "rules" | "holdings",
  instruction: string,
): AsyncIterableIterator<StreamMsg> {
  const res = await fetch(`${API_BASE}/api/data/update-via-chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ target, instruction }),
  });
  if (!res.body) {
    yield { type: "error", message: "No response body" };
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          yield JSON.parse(line) as StreamMsg;
        } catch {
          // skip malformed
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
