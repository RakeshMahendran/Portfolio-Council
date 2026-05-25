import clsx from "clsx";
import {
  BarChart3,
  ListChecks,
  Lightbulb,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";

export type AgentKey = "analyst" | "strategist" | "risk" | "execution";

type AgentMeta = {
  name: string;
  description: string;
  Icon: LucideIcon;
  artifactPrefix: string;
};

/** Single source of truth for agent identity across the app. */
export const AGENT_META: Record<AgentKey, AgentMeta> = {
  analyst: {
    name: "Analyst",
    description: "Observes facts. Never recommends.",
    Icon: BarChart3,
    artifactPrefix: "analysis",
  },
  strategist: {
    name: "Strategist",
    description: "Proposes actions. Cites RULES.",
    Icon: Lightbulb,
    artifactPrefix: "proposal",
  },
  risk: {
    name: "Risk Officer",
    description: "Adversarial review. APPROVE / VETO / AMEND.",
    Icon: ShieldAlert,
    artifactPrefix: "verdict",
  },
  execution: {
    name: "Execution",
    description: "Translates approved strategy into orders.",
    Icon: ListChecks,
    artifactPrefix: "orders",
  },
};

export const AGENT_ORDER: AgentKey[] = [
  "analyst",
  "strategist",
  "risk",
  "execution",
];

/**
 * Consistent agent glyph — a rounded brand-tinted tile with the agent's
 * lucide icon. One uniform treatment across every surface; the glyph (not
 * colour) is what differentiates the four agents.
 */
export function AgentIcon({
  agent,
  size = "md",
  className,
}: {
  agent: AgentKey;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { Icon } = AGENT_META[agent];
  const box = { sm: "w-7 h-7 rounded-lg", md: "w-9 h-9 rounded-lg", lg: "w-11 h-11 rounded-xl" }[size];
  const ic = { sm: "w-3.5 h-3.5", md: "w-4.5 h-4.5", lg: "w-5 h-5" }[size];
  return (
    <span
      className={clsx(
        "inline-flex items-center justify-center border border-teal-400/20 bg-teal-500/10 text-teal-300",
        box,
        className,
      )}
      aria-hidden
    >
      <Icon className={ic} strokeWidth={2} />
    </span>
  );
}
