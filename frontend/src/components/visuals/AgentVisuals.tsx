"use client";

import {
  parseAmendments,
  parseAnalyst,
  parseConfidenceRationale,
  parseExecution,
  parsePlainEnglish,
  parseRisk,
  parseStrategist,
  parseStressTests,
  parseTargetAllocation,
  parseUserPlan,
} from "@/lib/parse-artifacts";
import { AmendmentsCard } from "./AmendmentsCard";
import { ConfidenceRationale } from "./ConfidenceRationale";
import { ExecutionSummary } from "./ExecutionSummary";
import { GoalProgress } from "./GoalProgress";
import { LiquidityGauge } from "./LiquidityGauge";
import { PlainEnglishCallout } from "./PlainEnglishCallout";
import { PlanBCard } from "./PlanBCard";
import { PortfolioDonut } from "./PortfolioDonut";
import { RuleTrafficLights } from "./RuleTrafficLights";
import { StrategistSummary } from "./StrategistSummary";
import { StressTestCard } from "./StressTestCard";
import { TargetAllocationDonut } from "./TargetAllocationDonut";
import { VerdictBadge } from "./VerdictBadge";
import type { AgentKey } from "@/components/AgentIcon";

/**
 * Renders the visual layer above an agent artifact's markdown.
 *
 * Each branch curates the visuals that match what the agent reliably emits.
 * Parsers return empty / null when they can't find the pattern, so every
 * card silently hides itself rather than break the page.
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
  const plain = parsePlainEnglish(content);

  if (agent === "analyst") {
    const a = parseAnalyst(content);
    const plan = userPlanContent ? parseUserPlan(userPlanContent) : null;
    const hasAny =
      a.totalPortfolio !== null ||
      a.composition.length > 0 ||
      (a.requiredBuffer !== null && a.currentLiquid !== null) ||
      (plan?.goalAmount ?? null) !== null;
    if (!hasAny && !plain) return null;
    return (
      <div className="space-y-4">
        <PlainEnglishCallout agent={agent} summary={plain} />
        {plan && plan.goalAmount !== null && (
          <GoalProgress plan={plan} currentCorpus={a.totalPortfolio} />
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PortfolioDonut composition={a.composition} total={a.totalPortfolio} />
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
    const targetAlloc = parseTargetAllocation(content);
    const stress = parseStressTests(content);
    const amendments = parseAmendments(content);
    // Goal-math (required savings / return) lives on the home "Roadmap" card,
    // which is the single source of truth — no duplicate Math card here.
    return (
      <div className="space-y-4">
        <PlainEnglishCallout agent={agent} summary={plain} />
        <StrategistSummary s={s} />
        {targetAlloc.length > 0 && (
          <TargetAllocationDonut positions={targetAlloc} />
        )}
        {amendments.length > 0 && (
          <AmendmentsCard amendments={amendments} />
        )}
        {stress.length > 0 && (
          <StressTestCard scenarios={stress} />
        )}
      </div>
    );
  }

  if (agent === "risk") {
    const r = parseRisk(content);
    const confidenceRationale = parseConfidenceRationale(content);
    if (!r.verdict && r.rules.length === 0 && !plain) return null;
    return (
      <div className="space-y-4">
        <PlainEnglishCallout agent={agent} summary={plain} />
        <VerdictBadge verdict={r.verdict} confidence={r.confidence} />
        {r.confidence !== null && r.confidence < 100 && confidenceRationale && (
          <ConfidenceRationale
            confidence={r.confidence}
            rationale={confidenceRationale}
          />
        )}
        <RuleTrafficLights rules={r.rules} />
        <PlanBCard planB={r.planB} />
      </div>
    );
  }

  if (agent === "execution") {
    const e = parseExecution(content);
    return (
      <div className="space-y-4">
        <PlainEnglishCallout agent={agent} summary={plain} />
        <ExecutionSummary e={e} />
      </div>
    );
  }

  return null;
}
