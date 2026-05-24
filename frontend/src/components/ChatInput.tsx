"use client";

import clsx from "clsx";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

export type ChatInputProps = {
  onSend: (text: string) => void | Promise<void>;
  disabled?: boolean;
  placeholder?: string;
};

const LINE_HEIGHT_PX = 24; // Tailwind leading-6 → 1.5rem at text-sm
const MAX_ROWS = 5;
const MIN_ROWS = 1;

/**
 * Multi-line auto-growing chat input. Mirrors the basic ChatGPT-style UX:
 *
 * - Enter submits, Shift+Enter inserts a newline
 * - Textarea grows from 1 row up to ~5 rows, then scrolls
 * - Send button enabled only when there is non-empty text and !disabled
 * - Clears after a successful send
 */
export function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-grow height based on scrollHeight, capped at MAX_ROWS.
  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const max = LINE_HEIGHT_PX * MAX_ROWS + 16; // 16 = vertical padding
    const next = Math.min(el.scrollHeight, max);
    el.style.height = `${next}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  const canSend = value.trim().length > 0 && !disabled && !sending;

  const submit = useCallback(async () => {
    if (!canSend) return;
    const text = value.trim();
    setSending(true);
    try {
      await onSend(text);
      setValue("");
      // reset height after clear
      requestAnimationFrame(resize);
    } finally {
      setSending(false);
    }
  }, [canSend, value, onSend, resize]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  return (
    <div className="w-full">
      <div
        className={clsx(
          "flex items-end gap-2 rounded-xl border bg-zinc-900 px-3 py-2.5 transition",
          "border-zinc-800 focus-within:border-zinc-600 focus-within:ring-2 focus-within:ring-blue-500/30",
          disabled && "opacity-60",
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={MIN_ROWS}
          placeholder={placeholder ?? "Type your message…"}
          className={clsx(
            "flex-1 resize-none bg-transparent outline-none",
            "text-[15px] leading-6 text-zinc-100 placeholder:text-zinc-500",
            "max-h-40",
          )}
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!canSend}
          className={clsx(
            "shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition",
            canSend
              ? "bg-blue-600 text-white hover:bg-blue-500"
              : "bg-zinc-800 text-zinc-500 cursor-not-allowed",
          )}
          aria-label="Send message"
        >
          {sending ? "…" : "Send"}
        </button>
      </div>
      <div className="text-[11px] text-zinc-600 mt-1.5 px-1">
        Press Enter to send · Shift+Enter for newline
      </div>
    </div>
  );
}

export default ChatInput;
