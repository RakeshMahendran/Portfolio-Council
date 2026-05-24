"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import clsx from "clsx";

type MarkdownViewProps = {
  content: string;
  className?: string;
};

/**
 * Tailwind classes per element. Kept here so the component file stays
 * readable and the styling contract is obvious at a glance.
 *
 * Theme: dark background, light text. Headings get a subtle bottom border
 * so longer agent transcripts (with many h2s) skim well. Tables and code
 * blocks lean into the "data tool" aesthetic.
 */
const components: Components = {
  h1: ({ node: _node, className, ...props }) => (
    <h1
      className={clsx(
        "text-2xl font-semibold text-zinc-50 mt-6 mb-3 pb-2",
        "border-b border-zinc-800",
        className,
      )}
      {...props}
    />
  ),
  h2: ({ node: _node, className, ...props }) => (
    <h2
      className={clsx(
        "text-xl font-semibold text-zinc-100 mt-6 mb-3 pb-1.5",
        "border-b border-zinc-800/70",
        className,
      )}
      {...props}
    />
  ),
  h3: ({ node: _node, className, ...props }) => (
    <h3
      className={clsx(
        "text-base font-semibold text-zinc-100 mt-5 mb-2 pb-1",
        "border-b border-zinc-800/40",
        className,
      )}
      {...props}
    />
  ),
  h4: ({ node: _node, className, ...props }) => (
    <h4
      className={clsx(
        "text-sm font-semibold uppercase tracking-wider",
        "text-zinc-300 mt-4 mb-2",
        className,
      )}
      {...props}
    />
  ),
  h5: ({ node: _node, className, ...props }) => (
    <h5
      className={clsx(
        "text-sm font-semibold text-zinc-200 mt-3 mb-1.5",
        className,
      )}
      {...props}
    />
  ),
  h6: ({ node: _node, className, ...props }) => (
    <h6
      className={clsx(
        "text-xs font-semibold uppercase tracking-wider",
        "text-zinc-400 mt-3 mb-1",
        className,
      )}
      {...props}
    />
  ),
  p: ({ node: _node, className, ...props }) => (
    <p
      className={clsx(
        "text-sm text-zinc-300 leading-relaxed my-3",
        className,
      )}
      {...props}
    />
  ),
  a: ({ node: _node, className, ...props }) => (
    <a
      className={clsx(
        "text-emerald-400 hover:text-emerald-300 underline underline-offset-2",
        className,
      )}
      target="_blank"
      rel="noreferrer noopener"
      {...props}
    />
  ),
  strong: ({ node: _node, className, ...props }) => (
    <strong
      className={clsx("font-semibold text-zinc-100", className)}
      {...props}
    />
  ),
  em: ({ node: _node, className, ...props }) => (
    <em className={clsx("italic text-zinc-300", className)} {...props} />
  ),
  ul: ({ node: _node, className, ...props }) => (
    <ul
      className={clsx(
        "list-disc list-outside pl-6 my-3 space-y-1.5",
        "text-sm text-zinc-300 marker:text-zinc-600",
        className,
      )}
      {...props}
    />
  ),
  ol: ({ node: _node, className, ...props }) => (
    <ol
      className={clsx(
        "list-decimal list-outside pl-6 my-3 space-y-1.5",
        "text-sm text-zinc-300 marker:text-zinc-500",
        className,
      )}
      {...props}
    />
  ),
  li: ({ node: _node, className, ...props }) => (
    <li className={clsx("leading-relaxed", className)} {...props} />
  ),
  blockquote: ({ node: _node, className, ...props }) => (
    <blockquote
      className={clsx(
        "my-4 pl-4 border-l-4 border-emerald-700/60",
        "text-zinc-400 italic bg-zinc-900/40 py-2 pr-3 rounded-r",
        className,
      )}
      {...props}
    />
  ),
  hr: ({ node: _node, className, ...props }) => (
    <hr
      className={clsx("my-6 border-zinc-800", className)}
      {...props}
    />
  ),
  // Inline + fenced code share one renderer in react-markdown v10.
  code: ({ node: _node, className, children, ...props }) => {
    const isBlock = /language-/.test(className ?? "");
    if (isBlock) {
      return (
        <code
          className={clsx(
            "block font-mono text-xs text-zinc-200 leading-relaxed",
            className,
          )}
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        className={clsx(
          "font-mono text-[0.85em] px-1.5 py-0.5 rounded",
          "bg-zinc-800/80 text-emerald-300 border border-zinc-700/60",
          className,
        )}
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ node: _node, className, ...props }) => (
    <pre
      className={clsx(
        "my-4 p-4 rounded-lg overflow-x-auto",
        "bg-zinc-950/80 border border-zinc-800",
        "text-xs text-zinc-200 font-mono leading-relaxed",
        className,
      )}
      {...props}
    />
  ),
  table: ({ node: _node, className, ...props }) => (
    <div className="my-4 overflow-x-auto rounded-lg border border-zinc-800">
      <table
        className={clsx(
          "w-full text-sm text-zinc-300 border-collapse",
          className,
        )}
        {...props}
      />
    </div>
  ),
  thead: ({ node: _node, className, ...props }) => (
    <thead
      className={clsx("bg-zinc-900/80 text-zinc-200", className)}
      {...props}
    />
  ),
  tbody: ({ node: _node, className, ...props }) => (
    <tbody className={clsx("divide-y divide-zinc-800", className)} {...props} />
  ),
  tr: ({ node: _node, className, ...props }) => (
    <tr
      className={clsx("hover:bg-zinc-900/60 transition-colors", className)}
      {...props}
    />
  ),
  th: ({ node: _node, className, ...props }) => (
    <th
      className={clsx(
        "text-left font-semibold px-3 py-2 border-b border-zinc-800",
        "text-xs uppercase tracking-wider text-zinc-400",
        className,
      )}
      {...props}
    />
  ),
  td: ({ node: _node, className, ...props }) => (
    <td
      className={clsx(
        "px-3 py-2 align-top border-r border-zinc-800/40 last:border-r-0",
        className,
      )}
      {...props}
    />
  ),
  // GFM task list items render <input type="checkbox"> — style them too.
  input: ({ node: _node, className, type, ...props }) => {
    if (type === "checkbox") {
      return (
        <input
          type="checkbox"
          disabled
          className={clsx(
            "mr-2 align-middle accent-emerald-500",
            className,
          )}
          {...props}
        />
      );
    }
    return <input type={type} className={className} {...props} />;
  },
};

/**
 * MarkdownView — themed wrapper around react-markdown.
 *
 * Renders dark-theme markdown with proper styles for headings, paragraphs,
 * lists, tables, code, blockquotes, and GFM extras (strikethrough, task
 * lists, tables) via remark-gfm.
 */
export default function MarkdownView({
  content,
  className,
}: MarkdownViewProps) {
  return (
    <div
      className={clsx(
        "markdown-view font-sans text-zinc-200",
        // Avoid orphan top-margins on the first child block.
        "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
