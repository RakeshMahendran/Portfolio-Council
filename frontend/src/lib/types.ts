// Shared types — used by all components.
// Mirrors server/main.py response shapes exactly.

export type Commit = {
  hash: string;
  shortHash: string;
  subject: string;
  author: string;
  date: string;
  body: string;
  isGitclawAuthored: boolean;
  isRebalance: boolean;
};

// Discriminated union of every NDJSON event the FastAPI /api/run endpoint
// can emit. Keep in sync with stream_gitclaw() in server/main.py.
export type StreamMsg =
  | { type: "session_start"; agent_dir: string }
  | { type: "output"; text: string }
  | { type: "tool_use"; text: string }
  | { type: "error_line"; text: string }
  | { type: "task_end"; text: string }
  | { type: "system"; text: string }
  | { type: "error"; message: string }
  | { type: "session_end"; return_code: number };

export type AgentId = "analyst" | "strategist" | "risk" | "execution";

export type AgentStatus = "idle" | "running" | "complete" | "failed";

export type UserPlan = {
  goalType?: string;
  targetAmount?: number;
  targetDate?: string;
  monthlyIncome?: number;
  netInvestable?: number;
  riskTolerance?: "low" | "medium" | "high";
  rawMarkdown?: string;
};

export type SetupStatus = {
  hasUserPlan: boolean;
  hasRules: boolean;
  hasHoldings: boolean;
  ready: boolean;
};
