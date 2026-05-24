"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import ActivityFAB, { type Activity } from "@/components/ActivityFAB";
import AttachmentCard, {
  detectAttachmentMode,
} from "@/components/AttachmentCard";
import ChatInput from "@/components/ChatInput";
import ChatMessage, { type ChatRole } from "@/components/ChatMessage";
import { QuickReplies } from "@/components/QuickReplies";
import SiteHeader from "@/components/SiteHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getLog, streamRun, stripAnsi, stripNoise } from "@/lib/api";

type Message = {
  id: string;
  role: ChatRole;
  text: string;
  streaming?: boolean;
  timestamp: string;
};

const SYSTEM_INTRO =
  "Hi! I'm the Onboarding agent. Let's get you set up for Portfolio Council. " +
  "I'll ask a few short questions about your goals, finances, and constraints — one at a time. " +
  "I'll cross-check answers and push back if something doesn't add up. " +
  "Ready? Just say hi to begin.";

// Used only for the header progress bar UI. The agent itself does not count
// questions — it asks until the checklist in SOUL.md is filled.
const TOTAL_QUESTIONS = 8;

function newId() {
  // Cheap unique id — good enough for keys.
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function ts() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildPrompt(history: Message[], latest: string): string {
  // Conversation log includes user + agent turns (skip system bubbles).
  const turns = history
    .filter((m) => m.role === "user" || m.role === "agent")
    .map((m) => `[${m.role}]: ${m.text.trim()}`)
    .join("\n");

  return [
    "Continue the onboarding conversation. Here's the conversation so far:",
    "",
    "<conversation>",
    turns,
    `[user]: ${latest}`,
    "</conversation>",
    "",
    `The user's latest message is: "${latest}"`,
    "",
    "Respond as the Onboarding agent. Ask the next question OR if you have enough info, summarize and ask if they want to save the plan.",
  ].join("\n");
}

export default function OnboardingPage() {
  const router = useRouter();
  // NB: leave intro timestamp empty during initial render — `ts()` would
  // evaluate to a UTC time on the server and a local time on the client,
  // breaking hydration. The post-mount effect below fills it in.
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "intro",
      role: "system",
      text: SYSTEM_INTRO,
      timestamp: "",
    },
  ]);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  // gitclaw tool calls fired in the current/last turn (▶ memory load, etc.).
  // Surfaced through ActivityFAB so the user knows things are happening when
  // a turn is slow.
  const [activities, setActivities] = useState<Activity[]>([]);

  // Stamp the intro message after the client has mounted.
  useEffect(() => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === "intro" && !m.timestamp ? { ...m, timestamp: ts() } : m,
      ),
    );
  }, []);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  // Tracks the timestamp of the most recent onboarding commit seen on mount.
  // Anything newer than this is treated as "just written by this session".
  const baselineCommitHashRef = useRef<string | null>(null);

  // ── Auto-scroll to bottom on new messages or streaming updates ──────────
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  // ── Capture baseline of recent commits on mount ─────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const commits = await getLog(20);
        if (commits.length > 0) {
          baselineCommitHashRef.current = commits[0].hash;
        }
      } catch {
        // ignore — baseline just defaults to null
      }
    })();
  }, []);

  // ── Poll /api/log for a new onboarding commit while running ─────────────
  useEffect(() => {
    if (completed) return;
    let cancelled = false;

    const interval = setInterval(async () => {
      try {
        const commits = await getLog(20);
        if (cancelled) return;
        const baseline = baselineCommitHashRef.current;
        const idx = baseline
          ? commits.findIndex((c) => c.hash === baseline)
          : commits.length;
        const fresh = idx === -1 ? commits : commits.slice(0, idx);
        const hit = fresh.find((c) => {
          const s = c.subject.toLowerCase();
          const b = (c.body ?? "").toLowerCase();
          return (
            s.includes("onboarding") ||
            s.includes("user_plan") ||
            s.includes("user plan") ||
            b.includes("user_plan.md")
          );
        });
        if (hit) {
          setCompleted(true);
        }
      } catch {
        // ignore polling errors
      }
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [completed]);

  // ── Inject the "onboarding complete" system message exactly once ────────
  useEffect(() => {
    if (!completed) return;
    setMessages((prev) => {
      if (prev.some((m) => m.id === "complete-banner")) return prev;
      return [
        ...prev,
        {
          id: "complete-banner",
          role: "system",
          text: "Onboarding complete — forwarding you to the setup screen…",
          timestamp: ts(),
        },
      ];
    });
  }, [completed]);

  // ── Forward to /processing once we detect an onboarding commit ──────────
  // Short delay lets the user see the "complete" system banner before the
  // page changes. /processing then polls until plan + RULES are visible and
  // forwards to /profile from there.
  useEffect(() => {
    if (!completed) return;
    const t = setTimeout(() => router.push("/processing"), 1500);
    return () => clearTimeout(t);
  }, [completed, router]);

  // ── Count of agent turns → progress indicator ───────────────────────────
  const agentTurnCount = useMemo(
    () => messages.filter((m) => m.role === "agent").length,
    [messages],
  );
  const questionNumber = Math.min(agentTurnCount + 1, TOTAL_QUESTIONS);

  const handleSend = useCallback(
    async (text: string) => {
      if (running) return;

      const userMsg: Message = {
        id: newId(),
        role: "user",
        text,
        timestamp: ts(),
      };
      const agentId = newId();
      const agentPlaceholder: Message = {
        id: agentId,
        role: "agent",
        text: "",
        streaming: true,
        timestamp: ts(),
      };

      // Snapshot history BEFORE the new user message for prompt construction.
      const history = messages;

      setMessages((prev) => [...prev, userMsg, agentPlaceholder]);
      // Fresh activity list per turn — the FAB shows "what gitclaw did on
      // this question", not the whole session history.
      setActivities([]);
      setRunning(true);

      const prompt = buildPrompt(history, text);

      try {
        let acc = "";
        // Route at the onboarding sub-agent directly; otherwise the parent
        // orchestrator role-plays Onboarding from its own SOUL.md table and
        // overrides agents/onboarding/SOUL.md rules.
        for await (const evt of streamRun(prompt, "onboarding")) {
          // streamRun has already dropped banner/warning lines; here we just
          // append the agent's speech to the bubble. A final stripNoise pass
          // on the accumulated text means stale state self-heals if anything
          // ever slipped through.
          if (evt.type === "output") {
            const chunk = evt.text ?? "";
            if (!chunk) continue;
            acc += (acc && !acc.endsWith("\n") ? "\n" : "") + chunk;
            const next = stripNoise(acc);
            if (!next) continue;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === agentId ? { ...m, text: next, streaming: true } : m,
              ),
            );
          } else if (evt.type === "error" || evt.type === "error_line") {
            const errText =
              evt.type === "error" ? evt.message : evt.text ?? "";
            acc += (acc ? "\n\n" : "") + `[error] ${errText}`;
            const next = acc;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === agentId ? { ...m, text: next, streaming: true } : m,
              ),
            );
          } else if (evt.type === "tool_use") {
            // Surface tool calls in the ActivityFAB (not in the chat bubble).
            const raw = stripAnsi(evt.text ?? "").trim();
            if (!raw) continue;
            setActivities((prev) => [
              ...prev,
              { id: newId(), text: raw, timestamp: ts() },
            ]);
          } else if (evt.type === "session_end") {
            // Finalize bubble.
            setMessages((prev) =>
              prev.map((m) =>
                m.id === agentId
                  ? {
                      ...m,
                      text: m.text || "(no response)",
                      streaming: false,
                    }
                  : m,
              ),
            );
            break;
          }
          // session_start → ignored in chat UI
        }
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === agentId
              ? {
                  ...m,
                  text:
                    (m.text ? m.text + "\n\n" : "") +
                    `[error] ${String(err)}`,
                  streaming: false,
                }
              : m,
          ),
        );
      } finally {
        // Make sure streaming flag is cleared even if session_end didn't arrive.
        setMessages((prev) =>
          prev.map((m) =>
            m.id === agentId && m.streaming ? { ...m, streaming: false } : m,
          ),
        );
        setRunning(false);
      }
    },
    [messages, running],
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="shrink-0">
        <SiteHeader
          backHref="/"
          pageContext={
            <>
              <span className="text-sm text-zinc-400">Setup</span>
              <StatusBadge variant="info">onboarding</StatusBadge>
              <div className="flex items-center gap-2 text-xs text-zinc-500 ml-1">
                <span>
                  Q{" "}
                  <span className="text-zinc-300 font-medium">
                    {questionNumber}
                  </span>
                  /~{TOTAL_QUESTIONS}
                </span>
                <div className="w-20 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round((agentTurnCount / TOTAL_QUESTIONS) * 100),
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </>
          }
        />
      </div>

      {/* ── Messages ───────────────────────────────────────────────────── */}
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto"
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
          {messages.map((m, idx) => {
            const isLast = idx === messages.length - 1;
            const isLatestAgent =
              isLast && m.role === "agent" && !m.streaming && !running;
            // Only one of QuickReplies / AttachmentCard renders per message.
            // AttachmentCard takes precedence: if the agent is asking about
            // expenses or holdings, the upload affordance is more useful
            // than a plain quick-reply list.
            const attachmentMode = isLatestAgent
              ? detectAttachmentMode(m.text)
              : null;
            return (
              <div key={m.id}>
                <ChatMessage
                  role={m.role}
                  text={m.text}
                  streaming={m.streaming}
                  timestamp={m.timestamp}
                />
                {isLatestAgent && attachmentMode && (
                  <div className="ml-12 mb-3">
                    <AttachmentCard
                      mode={attachmentMode}
                      disabled={running || completed}
                      onSendMessage={handleSend}
                    />
                  </div>
                )}
                {isLatestAgent && !attachmentMode && (
                  <div className="ml-12 -mt-1 mb-3">
                    <QuickReplies
                      text={m.text}
                      disabled={running || completed}
                      onSelect={handleSend}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {completed && (
            <div className="w-full flex flex-col items-center gap-2 my-6">
              <p className="text-sm text-zinc-400">
                Forwarding to your setup screen…
              </p>
              <Link
                href="/processing"
                className={clsx(
                  "inline-flex items-center gap-2 rounded-lg px-4 py-2",
                  "border border-zinc-700 bg-zinc-900/50 text-zinc-300 text-xs hover:border-zinc-500",
                )}
              >
                Continue now →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Input pinned to bottom ─────────────────────────────────────── */}
      <div className="border-t border-zinc-800 bg-zinc-950/80 backdrop-blur shrink-0">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3">
          <ChatInput
            onSend={handleSend}
            disabled={running || completed}
            placeholder={
              completed
                ? "Onboarding complete — head to your dashboard."
                : running
                  ? activities.length > 0
                    ? `Agent is working — ${activities.length} ${activities.length === 1 ? "action" : "actions"} so far…`
                    : "Agent is thinking — this can take 10–30s for the first message…"
                  : "Say hi to begin, or answer the agent's question…"
            }
          />
        </div>
      </div>

      {/* Floating activity panel — only renders while running or activity exists */}
      <ActivityFAB activities={activities} running={running} />
    </div>
  );
}
