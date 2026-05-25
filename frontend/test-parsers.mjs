import { readFileSync } from "fs";
import { parseAnalyst, parseExecution, parseSIPs, parseForwardTranches, parseNextReview, parseOrderRuleCitations, parseUserPlan, parseStrategist } from "./src/lib/parse-artifacts.ts";

// Read artifact files
const analyst = readFileSync("../workspace/analysis-2026-05-24.md", "utf-8");
const orders = readFileSync("../workspace/orders-2026-05-24.md", "utf-8");
const proposal = readFileSync("../workspace/proposal-2026-05-24.md", "utf-8");
const userPlan = readFileSync("../memory/user_plan.md", "utf-8");

console.log("=== PARSING ANALYST ARTIFACT ===");
const analystParsed = parseAnalyst(analyst);
console.log("Total Portfolio:", analystParsed.totalPortfolio);
console.log("Required Buffer:", analystParsed.requiredBuffer);
console.log("Current Liquid:", analystParsed.currentLiquid);
console.log("Liquidity Status:", analystParsed.liquidityStatus);
console.log("Composition count:", analystParsed.composition.length);
console.log("Composition:", analystParsed.composition);

console.log("\n=== PARSING EXECUTION ARTIFACT ===");
const execParsed = parseExecution(orders);
console.log("Orders found:", execParsed.orders.length);
execParsed.orders.forEach(o => {
  console.log(`  #${o.seq}: ${o.symbol} ${o.action} ${o.qty}u @ ${o.price}`);
});
console.log("Total Buy:", execParsed.totalBuy);
console.log("Total Sell:", execParsed.totalSell);
console.log("Net Deployment:", execParsed.netDeployment);
console.log("Post-Execution Liquidity:", execParsed.postExecutionLiquidity);

console.log("\n=== PARSING SIPs (PROPOSAL + ORDERS) ===");
const combined = proposal + "\n\n" + orders;
const sipsParsed = parseSIPs(combined);
console.log("Total Monthly SIP:", sipsParsed.totalMonthly);
console.log("SIP lines:", sipsParsed.lines.length);
sipsParsed.lines.forEach(l => {
  console.log(`  ${l.symbol}: ₹${l.monthlyAmount}`);
});
console.log("Start Note:", sipsParsed.startNote);

console.log("\n=== PARSING FORWARD TRANCHES ===");
const tranches = parseForwardTranches(combined);
console.log("Tranches found:", tranches.length);
tranches.forEach(t => {
  console.log(`  ${t.name} (${t.dateText}): ${t.amountText} (condition: ${t.condition})`);
});

console.log("\n=== PARSING NEXT REVIEW ===");
const nextReview = parseNextReview(combined);
console.log("Review text:", nextReview.text);
console.log("Days from now:", nextReview.daysFromNow);
console.log("Triggers:", nextReview.triggers);

console.log("\n=== PARSING ORDER RULE CITATIONS ===");
const ruleCites = parseOrderRuleCitations(proposal);
console.log("Symbols with rules:");
for (const [sym, rules] of ruleCites) {
  console.log(`  ${sym}: ${rules.join(", ")}`);
}

console.log("\n=== PARSING USER PLAN ===");
const planParsed = parseUserPlan(userPlan);
console.log("Goal Type:", planParsed.goalType);
console.log("Goal Amount:", planParsed.goalAmount);
console.log("Goal Date:", planParsed.goalDate);
console.log("Horizon Years:", planParsed.horizonYears);
console.log("Current Corpus:", planParsed.currentCorpus);
console.log("Monthly Investable:", planParsed.monthlyInvestable);

console.log("\n=== PARSING STRATEGIST ===");
const stratParsed = parseStrategist(proposal);
console.log("Has Plan B:", stratParsed.hasPlanB);
console.log("Tranche Count:", stratParsed.trancheCount);
console.log("Summary:", stratParsed.proposalSummary ? stratParsed.proposalSummary.substring(0, 100) + "..." : null);
