// Shared API client. Components should import from here.

import type { Commit, StreamMsg, SetupStatus } from "./types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

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

/**
 * POST a prompt to gitclaw. Returns an AsyncIterable of StreamMsg events.
 * Each yielded message is one line of NDJSON from the backend.
 */
export async function* streamRun(
  prompt: string,
): AsyncIterableIterator<StreamMsg> {
  const res = await fetch(`${API_BASE}/api/run`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!res.body) {
    yield { type: "error", message: "No response body from server" };
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
          // skip malformed JSON (partial line during streaming)
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
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

export async function uploadHoldings(file: File): Promise<{
  ok: boolean;
  count: number;
  holdings: Holding[];
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
