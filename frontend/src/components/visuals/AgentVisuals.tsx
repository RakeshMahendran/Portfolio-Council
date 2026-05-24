"use client";

import {
  parseAnalyst,
  parseExecution,
  parseRisk,
  parseStrategist,
  parseUserPlan,
} from "@/lib/parse-artifacts";
import { ExecutionSummary } from "./ExecutionSummary";
import { GoalProgress } from "./GoalProgress";
import { LiquidityGauge } from "./LiquidityGauge";
import { PlanBCard } from "./PlanBCard";
import { PortfolioDonut } from "./PortfolioDonut";
import { RuleTrafficLights } from "./RuleTrafficLights";
import { StrategistSummary } from "./StrategistSummary";
import { VerdictBadge } from "./VerdictBadge";

type AgentKey = "analyst" | "strategist" | "risk" | "execution";

/**
 * Renders the visual layer above an agent artifact's markdown.
 *
 * `userPlanContent` is optional — when present, the Analyst page gets the
 * Goal Progress card (target/date live in user_plan.md, not in analysis).
 */
export function AgentVisuals({
  agent,
  content,
  userPlanContent,
}: {
  agent: AgentKey;
  content: string;
  userPlanContent?: string | null;
}) {
  if (agent === "analyst") {
    const a = parseAnalyst(content);
    const plan = userPlanContent ? parseUserPlan(userPlanContent) : null;
    const hasAny =
      a.totalPortfolio !== null ||
      a.composition.length > 0 ||
      (a.requiredBuffer !== null && a.currentLiquid !== null) ||
      (plan?.goalAmount ?? null) !== null;
    if (!hasAny) return null;
    return (
      <div className="space-y-4">
        {plan && plan.goalAmount !== null && (
          <GoalProgress plan={plan} currentCorpus={a.totalPortfolio} />
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PortfolioDonut
            composition={a.composition}
            total={a.totalPortfolio}
          />
          <LiquidityGauge
            required={a.requiredBuffer}
            current={a.currentLiquid}
            status={a.liquidityStatus}
          />
        </div>
      </div>
    );
  }

  if (agent === "strategist") {
    const s = parseStrategist(content);
    return (
      <div className="space-y-4">
        <StrategistSummary s={s} />
      </div>
    );
  }

  if (agent === "risk") {
    const r = parseRisk(content);
    if (!r.verdict && r.rules.length === 0) return null;
    return (
      <div className="space-y-4">
        <VerdictBadge verdict={r.verdict} confidence={r.confidence} />
        <RuleTrafficLights rules={r.rules} />
        <PlanBCard planB={r.planB} />
      </div>
    );
  }

  if (agent === "execution") {
    const e = parseExecution(content);
    return (
      <div className="space-y-4">
        <ExecutionSummary e={e} />
      </div>
    );
  }

  return null;
}
