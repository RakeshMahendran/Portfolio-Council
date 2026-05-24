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
  // Check the latest commits for evidence onboarding has been completed.
  // If we see commits like "Onboarding completed" or "Switch all agents" etc.,
  // assume the user is already set up.
  try {
    const commits = await getLog(50);
    const hasUserPlan = commits.some(
      (c) =>
        c.subject.toLowerCase().includes("onboarding completed") ||
        c.subject.toLowerCase().includes("user plan") ||
        c.subject.toLowerCase().includes("rules.md"),
    );
    return {
      hasUserPlan,
      hasRules: hasUserPlan,
      hasHoldings: hasUserPlan,
      ready: hasUserPlan,
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
