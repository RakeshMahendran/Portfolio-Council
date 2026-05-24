"use client";

import clsx from "clsx";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import ChatInput from "@/components/ChatInput";
import ChatMessage, { type ChatRole } from "@/components/ChatMessage";
import { getLog, streamRun } from "@/lib/api";

type Message = {
  id: string;
  role: ChatRole;
  text: string;
  streaming?: boolean;
  timestamp: string;
};

const SYSTEM_INTRO =
  "Hi! I'm the Onboarding agent. Let's get you set up for Portfolio Council. " +
  "I'll ask ~8 questions about your goals, finances, and constraints. " +
  "I'll cross-check answers and push back if something doesn't add up. " +
  "Ready? Just say hi to begin.";

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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "intro",
      role: "system",
      text: SYSTEM_INTRO,
      timestamp: ts(),
    },
  ]);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);

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
          text: "Onboarding complete! Click below to go to your dashboard.",
          timestamp: ts(),
        },
      ];
    });
  }, [completed]);

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
      setRunning(true);

      const prompt = buildPrompt(history, text);

      try {
        let acc = "";
        for await (const evt of streamRun(prompt)) {
          // Append any "speech-like" event text into the agent bubble.
          if (
            evt.type === "output" ||
            evt.type === "task_end" ||
            evt.type === "system"
          ) {
            const chunk = evt.text ?? "";
            if (!chunk) continue;
            acc += (acc && !acc.endsWith("\n") ? "" : "") + chunk;
            const next = acc;
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
          // session_start / tool_use → ignored in chat UI
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
      <header className="border-b border-zinc-800 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm text-zinc-400 hover:text-zinc-100 transition"
          >
            ← Home
          </Link>
          <div className="h-4 w-px bg-zinc-800" />
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold tracking-tight">
              Portfolio Council Setup
            </span>
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
              onboarding
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span>
            Question{" "}
            <span className="text-zinc-300 font-medium">{questionNumber}</span>{" "}
            of ~{TOTAL_QUESTIONS}
          </span>
          <div className="w-24 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
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
      </header>

      {/* ── Messages ───────────────────────────────────────────────────── */}
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto"
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
          {messages.map((m) => (
            <ChatMessage
              key={m.id}
              role={m.role}
              text={m.text}
              streaming={m.streaming}
              timestamp={m.timestamp}
            />
          ))}

          {completed && (
            <div className="w-full flex justify-center my-6">
              <Link
                href="/"
                className={clsx(
                  "inline-flex items-center gap-2 rounded-lg px-5 py-2.5",
                  "bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium",
                  "shadow-lg shadow-emerald-900/30 transition",
                )}
              >
                Go to Dashboard →
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
                  ? "Onboarding agent is responding…"
                  : "Say hi to begin, or answer the agent's question…"
            }
          />
        </div>
      </div>
    </div>
  );
}
