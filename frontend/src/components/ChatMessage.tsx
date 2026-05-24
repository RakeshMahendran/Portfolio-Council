"use client";

import clsx from "clsx";
import { stripAnsi } from "@/lib/api";

export type ChatRole = "user" | "agent" | "system";

export type ChatMessageProps = {
  role: ChatRole;
  text: string;
  streaming?: boolean;
  timestamp?: string;
};

/**
 * A single message bubble in the onboarding chat.
 *
 * - user → right-aligned, blue accent
 * - agent → left-aligned, neutral zinc
 * - system → centered, small, italic
 *
 * When `streaming` is true, a pulsing cursor is shown at the end of the text
 * to indicate that more deltas are still arriving.
 */
export function ChatMessage({
  role,
  text,
  streaming,
  timestamp,
}: ChatMessageProps) {
  const clean = stripAnsi(text);

  if (role === "system") {
    return (
      <div className="w-full flex justify-center my-3">
        <div className="max-w-2xl w-full text-center">
          <div
            className={clsx(
              "inline-block rounded-lg border border-zinc-800 bg-zinc-900",
              "px-3 py-2 text-xs italic text-zinc-500 whitespace-pre-wrap",
            )}
          >
            {clean}
            {streaming && <PulseCursor />}
          </div>
          {timestamp && (
            <div className="text-[10px] text-zinc-700 mt-1">{timestamp}</div>
          )}
        </div>
      </div>
    );
  }

  const isUser = role === "user";

  return (
    <div
      className={clsx(
        "w-full flex my-2",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      <div className={clsx("max-w-2xl flex flex-col", isUser ? "items-end" : "items-start")}>
        <div
          className={clsx(
            "rounded-lg border px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
            isUser
              ? "bg-blue-600/20 border-blue-500/40 text-blue-50"
              : "bg-zinc-800 border-zinc-700 text-zinc-100",
          )}
        >
          {clean}
          {streaming && <PulseCursor />}
        </div>
        {timestamp && (
          <div
            className={clsx(
              "text-[10px] text-zinc-600 mt-1 px-1",
              isUser ? "text-right" : "text-left",
            )}
          >
            {timestamp}
          </div>
        )}
      </div>
    </div>
  );
}

function PulseCursor() {
  return (
    <span
      className="inline-block w-1.5 h-4 bg-zinc-400 align-middle ml-0.5 animate-pulse"
      aria-hidden
    />
  );
}

export default ChatMessage;
