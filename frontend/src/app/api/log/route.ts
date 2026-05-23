import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

// The agent repo is the parent of the frontend dir.
const AGENT_DIR = path.resolve(process.cwd(), "..");

/**
 * GET /api/log
 * Returns the git log of the agent repo as structured JSON.
 * Each commit = one session entry in the UI sidebar.
 */
export async function GET() {
  try {
    const { stdout } = await execAsync(
      `git log --max-count=50 --pretty=format:"%H|||%h|||%s|||%an|||%aI|||%b---END---"`,
      { cwd: AGENT_DIR, maxBuffer: 10 * 1024 * 1024 },
    );

    const commits = stdout
      .split("---END---")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [hash, shortHash, subject, author, date, body] = line.split("|||");
        return {
          hash,
          shortHash,
          subject,
          author,
          date,
          body: (body || "").trim(),
          isGitclawAuthored:
            (body || "").includes("GitClaw") ||
            (subject || "").includes("gitclaw"),
          isRebalance: (subject || "").toLowerCase().includes("rebalance"),
        };
      });

    return NextResponse.json({ commits, count: commits.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
