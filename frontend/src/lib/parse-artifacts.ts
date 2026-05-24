/**
 * Parsers for agent artifacts (markdown → structured data for visualizations).
 *
 * Each parser is defensive: if the agent reformats and a regex misses, the
 * function returns `null` for that field and the visual is hidden. The
 * markdown stays primary; visuals are a bonus layer.
 */

// ─── INR parsing helpers ──────────────────────────────────────────────────

/**
 * Parse "₹10,00,000" / "1L" / "1 crore" / "₹2.5 cr" into a number.
 * Returns null if no match.
 */
export function parseInr(s: string | undefined | null): number | null {
  if (!s) return null;
  // Try "X cr" or "X crore" first (and crore-rupees written as ₹X cr).
  const cr = s.match(/₹?\s*([\d.,]+)\s*(?:cr|crore)/i);
  if (cr) {
    const n = Number(cr[1].replace(/,/g, ""));
    return isNaN(n) ? null : n * 1_00_00_000;
  }
  // "X lakh" / "X L" / "X lac"
  const lakh = s.match(/₹?\s*([\d.,]+)\s*(?:lakh|lac|L\b)/i);
  if (lakh) {
    const n = Number(lakh[1].replace(/,/g, ""));
    return isNaN(n) ? null : n * 1_00_000;
  }
  // Plain rupees: "₹10,00,000" or "₹10,00,000.50"
  const plain = s.match(/₹?\s*([\d,]+(?:\.\d+)?)/);
  if (plain) {
    const n = Number(plain[1].replace(/,/g, ""));
    return isNaN(n) ? null : n;
  }
  return null;
}

/** Extract the first percentage value from a string ("15%" → 15). */
export function parsePct(s: string | undefined | null): number | null {
  if (!s) return null;
  const m = s.match(/([\d.]+)\s*%/);
  if (!m) return null;
  const n = Number(m[1]);
  return isNaN(n) ? null : n;
}

// ─── Analyst artifact ─────────────────────────────────────────────────────

export type AnalystComposition = {
  label: string;
  amount: number;
  // Tailwind color class hint, frontend maps to swatch
  kind: "equity" | "mf" | "cash" | "fd" | "gold" | "bonds" | "other";
};

export type AnalystHolding = {
  symbol: string;
  pct: number;
  value?: number;
};

export type AnalystParsed = {
  totalPortfolio: number | null;
  composition: AnalystComposition[];
  concentrationCapPct: number | null;
  topHoldings: AnalystHolding[]; // for the concentration bar chart
  requiredBuffer: number | null;
  currentLiquid: number | null;
  liquidityStatus: "ADEQUATE" | "TIGHT" | "DEFICIENT" | null;
  goalTarget: number | null;
  goalDate: string | null;
  currentCorpus: number | null;
};

const COMPOSITION_PATTERNS: { label: string; kind: AnalystComposition["kind"]; regex: RegExp }[] = [
  { label: "Stocks", kind: "equity", regex: /(?:^|\n)\s*-?\s*Stocks?:\s*₹?\s*([\d,]+)/i },
  { label: "Mutual Funds", kind: "mf", regex: /(?:^|\n)\s*-?\s*Mutual\s*Funds?:\s*₹?\s*([\d,]+)/i },
  { label: "Cash", kind: "cash", regex: /(?:^|\n)\s*-?\s*Cash(?:\/Savings|\/Other)?:\s*₹?\s*([\d,]+)/i },
  { label: "Fixed Deposit", kind: "fd", regex: /(?:^|\n)\s*-?\s*Fixed\s*Deposit(?:s)?:\s*₹?\s*([\d,]+)/i },
  // Anchor Gold to ₹ specifically — otherwise "Gold: $4,523" from the
  // global-markets section gets misread as ₹4,523 in the user's portfolio.
  { label: "Gold / Gold ETF", kind: "gold", regex: /(?:^|\n)\s*-?\s*Gold(?:\s*ETFs?)?:\s*₹\s*([\d,]+)/i },
  { label: "Bonds", kind: "bonds", regex: /(?:^|\n)\s*-?\s*Bonds?:\s*₹?\s*([\d,]+)/i },
  { label: "Other", kind: "other", regex: /(?:^|\n)\s*-?\s*Other:\s*₹?\s*([\d,]+)/i },
];

export function parseAnalyst(md: string): AnalystParsed {
  // Total portfolio value — agents use several phrasings.
  const totalMatch =
    md.match(/Total\s*Portfolio\s*Value\s*:?\s*₹?\s*([\d,]+(?:\.\d+)?)/i) ??
    md.match(/Total\s*Corpus\s*:?\s*₹?\s*([\d,]+(?:\.\d+)?)/i) ??
    md.match(/Portfolio\s*Value\s*:?\s*₹?\s*([\d,]+(?:\.\d+)?)/i);
  const totalPortfolio = totalMatch ? parseInr(totalMatch[0]) : null;

  // Composition rows. Order patterns most-specific first.
  const composition: AnalystComposition[] = [];
  for (const { label, kind, regex } of COMPOSITION_PATTERNS) {
    const m = md.match(regex);
    if (m) {
      const amount = parseInr(m[0]);
      if (amount !== null && amount > 0) {
        composition.push({ label, amount, kind });
      }
    }
  }

  // Concentration cap (Hard Rule #2)
  const capMatch =
    md.match(/Position\s*cap[^\n]*?(\d+(?:\.\d+)?)\s*%/i) ??
    md.match(/concentration\s*cap[^\n]*?(\d+(?:\.\d+)?)\s*%/i);
  const concentrationCapPct = capMatch ? Number(capMatch[1]) : null;

  // Top holdings — parse the markdown table with "% of Portfolio" column.
  // Only fires for sessions that actually have positions.
  const topHoldings: AnalystHolding[] = [];
  const tableRowRe = /^\|\s*([A-Z][A-Z0-9.&]+)\s*\|.*?(\d+(?:\.\d+)?)\s*%/gm;
  let m;
  while ((m = tableRowRe.exec(md)) !== null) {
    topHoldings.push({ symbol: m[1].trim(), pct: Number(m[2]) });
  }

  // Liquidity — anchor AFTER the colon so we don't capture "#3" from
  // "(per RULES Hard Rule #3): ₹75,000". Use the capture group directly
  // (parseInr on m[0] would re-scan the whole prefix and grab "3" first).
  const requiredBufferMatch = md.match(/Required\s*buffer[^:]*:\s*₹\s*([\d,]+)/i);
  const currentLiquidMatch = md.match(/Current\s*liquid[^:]*:\s*₹\s*([\d,]+)/i);
  const requiredBuffer = requiredBufferMatch
    ? parseInr("₹" + requiredBufferMatch[1])
    : null;
  const currentLiquid = currentLiquidMatch
    ? parseInr("₹" + currentLiquidMatch[1])
    : null;

  // Status line — agents sometimes wrap "Status" in markdown bold.
  let liquidityStatus: AnalystParsed["liquidityStatus"] = null;
  if (/\*{0,2}\s*Status\s*\*{0,2}\s*:\s*\*{0,2}\s*ADEQUATE/i.test(md))
    liquidityStatus = "ADEQUATE";
  else if (/\*{0,2}\s*Status\s*\*{0,2}\s*:\s*\*{0,2}\s*TIGHT/i.test(md))
    liquidityStatus = "TIGHT";
  else if (/\*{0,2}\s*Status\s*\*{0,2}\s*:\s*\*{0,2}\s*DEFICIENT/i.test(md))
    liquidityStatus = "DEFICIENT";

  // Goal
  const goalTargetMatch =
    md.match(/Goal:\s*₹?\s*([\d,]+(?:\.\d+)?(?:\s*cr| crore| lakh| L)?)/i) ??
    md.match(/Target\s*Amount\s*:?\s*₹?\s*([\d,]+(?:\.\d+)?(?:\s*cr| crore| lakh| L)?)/i);
  const goalTarget = goalTargetMatch ? parseInr(goalTargetMatch[0]) : null;

  const goalDateMatch =
    md.match(/by\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{4})/i) ??
    md.match(/Target\s*Date\s*:?\s*([^\n]+)/i);
  const goalDate = goalDateMatch ? goalDateMatch[1].trim().replace(/\.$/, "") : null;

  const currentCorpusMatch =
    md.match(/Current\s*corpus\s*:?\s*₹?\s*([\d,]+(?:\.\d+)?)/i) ??
    md.match(/Total\s*Portfolio\s*Value\s*:?\s*₹?\s*([\d,]+(?:\.\d+)?)/i);
  const currentCorpus = currentCorpusMatch ? parseInr(currentCorpusMatch[0]) : null;

  return {
    totalPortfolio,
    composition,
    concentrationCapPct,
    topHoldings: topHoldings.slice(0, 10),
    requiredBuffer,
    currentLiquid,
    liquidityStatus,
    goalTarget,
    goalDate,
    currentCorpus,
  };
}

// ─── Risk artifact ────────────────────────────────────────────────────────

export type RuleCompliance = {
  number: number;
  label: string;
  status: "pass" | "fail" | "amend" | "info";
};

export type RiskParsed = {
  verdict: "APPROVE" | "AMEND" | "VETO" | null;
  confidence: number | null;
  rules: RuleCompliance[];
  planB: string | null;
};

export function parseRisk(md: string): RiskParsed {
  // Verdict — match the anchored format from hooks/pre-commit
  let verdict: RiskParsed["verdict"] = null;
  if (/^\s*\*{0,2}Verdict[\s:*]+\*{0,2}APPROVE\b/im.test(md)) verdict = "APPROVE";
  else if (/^\s*\*{0,2}Verdict[\s:*]+\*{0,2}AMEND\b/im.test(md)) verdict = "AMEND";
  else if (/^\s*\*{0,2}Verdict[\s:*]+\*{0,2}VETO\b/im.test(md)) verdict = "VETO";

  // Confidence
  const confMatch = md.match(/Confidence:\s*(\d+(?:\.\d+)?)\s*%/i);
  const confidence = confMatch ? Number(confMatch[1]) : null;

  // Rule-by-rule outcomes — agents emit a markdown table:
  //   | **#1: Goal commitment** — every proposal must... | ✅ PASS | Assessment |
  //   | **#2: Concentration cap** — no single position... | ❌ FAIL | ...       |
  // Capture: rule number (#1), label (between #N: and **), status cell.
  // Use greedy capture up to the next ** to get the real label, not just one char.
  const rules: RuleCompliance[] = [];
  const ruleRowRe =
    /\|\s*\*{1,2}\s*#?(\d+):\s*([^*\n]+?)\s*\*{1,2}[^|]*\|\s*([^|\n]+?)\s*\|/gm;
  let m;
  while ((m = ruleRowRe.exec(md)) !== null) {
    const num = Number(m[1]);
    if (rules.find((r) => r.number === num)) continue;
    const label = m[2].trim().slice(0, 60);
    const statusCell = m[3];
    let status: RuleCompliance["status"] = "info";
    if (/❌|\bFAIL\b|\bVIOLATES?\b/i.test(statusCell)) status = "fail";
    else if (/✅|\bPASS(?:ES)?\b/i.test(statusCell)) status = "pass";
    else if (/AMEND/i.test(statusCell)) status = "amend";
    else if (/⚠|PENDING|UNDETERMINABLE/i.test(statusCell)) status = "info";
    else continue;
    rules.push({ number: num, label, status });
  }

  // Plan B excerpt
  const planBMatch = md.match(/##\s*\d*\.?\s*Plan\s*B[^\n]*\n+([\s\S]{0,400}?)(?:\n\n|##)/i);
  const planB = planBMatch ? planBMatch[1].trim().slice(0, 280) : null;

  return { verdict, confidence, rules, planB };
}

// ─── Execution artifact ───────────────────────────────────────────────────

export type ExecutionOrder = {
  seq: number;
  symbol: string;
  action: string;
  qty: string;
  orderType?: string;
  price?: string;
  sequencing?: string;
};

export type ExecutionParsed = {
  orders: ExecutionOrder[];
  totalBuy: number | null;
  totalSell: number | null;
  netDeployment: number | null;
  postExecutionLiquidity: number | null;
};

export function parseExecution(md: string): ExecutionParsed {
  const orders: ExecutionOrder[] = [];

  // Format A — strict template per Execution SKILL.md:
  //   | 1 | SYMBOL | BUY | 10 | LIMIT | ₹2,450 | sequencing note |
  const strictRowRe =
    /^\|\s*(\d+)\s*\|\s*([A-Z][A-Z0-9.&\-]+)\s*\|\s*(BUY|SELL|HOLD)\s*\|\s*([\d.,]+)\s*\|\s*([A-Z]+)\s*\|\s*₹?\s*([\d,.]+)\s*\|\s*([^|]+?)\s*\|/gim;
  let m;
  while ((m = strictRowRe.exec(md)) !== null) {
    orders.push({
      seq: Number(m[1]),
      symbol: m[2].trim(),
      action: m[3].toUpperCase(),
      qty: m[4].replace(/,/g, ""),
      orderType: m[5],
      price: m[6],
      sequencing: m[7].trim().slice(0, 80),
    });
  }

  // Format B — prose-table that current agents actually produce:
  //   | **SYMBOL** (400 shares @ ₹269) | ₹1,07,600 |
  // We fall back to this if the strict parse found nothing.
  if (orders.length === 0) {
    const proseRowRe =
      /^\|\s*\*?\*?([A-Z][A-Z0-9.&\-]+)\*?\*?\s*\(([\d,.]+)\s*shares?\s*@\s*₹?\s*([\d,.]+)\)\s*\|\s*₹?\s*([\d,.]+)/gim;
    let seq = 1;
    let pm;
    while ((pm = proseRowRe.exec(md)) !== null) {
      orders.push({
        seq: seq++,
        symbol: pm[1].trim(),
        action: "BUY", // prose-format defaults to BUY (deployment scenarios)
        qty: pm[2].replace(/,/g, ""),
        price: pm[3],
        orderType: "LIMIT",
        sequencing: "",
      });
    }
  }

  const totalBuyMatch = md.match(/Total\s*BUY[^\n]*?₹\s*([\d,.]+)/i);
  const totalSellMatch = md.match(/Total\s*SELL[^\n]*?₹\s*([\d,.]+)/i);
  const netMatch =
    md.match(/Net\s*deployment[^\n]*?₹\s*([\d,.\-]+)/i) ??
    md.match(/Total\s*Deployment[^\n]*?₹\s*([\d,.]+)/i);
  const liqMatch =
    md.match(/Post[-\s]?execution\s*liquidity[^\n]*?₹\s*([\d,.]+)/i) ??
    md.match(/Post[-\s]?deployment\s*FD[^\n]*?₹\s*([\d,.]+)/i);

  return {
    orders,
    totalBuy: totalBuyMatch ? parseInr("₹" + totalBuyMatch[1]) : null,
    totalSell: totalSellMatch ? parseInr("₹" + totalSellMatch[1]) : null,
    netDeployment: netMatch ? parseInr("₹" + netMatch[1]) : null,
    postExecutionLiquidity: liqMatch ? parseInr("₹" + liqMatch[1]) : null,
  };
}

// ─── User plan (lives in memory/user_plan.md) ──────────────────────────────

export type UserPlanParsed = {
  goalType: string | null;
  goalAmount: number | null;
  goalDate: string | null;
  horizonYears: number | null;
  currentCorpus: number | null;
  monthlyInvestable: number | null;
};

export function parseUserPlan(md: string): UserPlanParsed {
  const goalTypeMatch = md.match(/Type:\s*([^\n]+)/i);
  const goalAmountMatch =
    md.match(/Target\s*Amount:\s*₹?\s*([\d,]+(?:\.\d+)?(?:\s*(?:cr|crore|lakh|L))?)/i);
  const goalDateMatch =
    md.match(/Target\s*Date:\s*([^\n]+)/i);
  const horizonMatch =
    md.match(/Time\s*Horizon:\s*~?\s*(\d+(?:\.\d+)?)\s*(?:year|yr)/i) ??
    md.match(/Time\s*Horizon:\s*~?\s*\d+\s*(?:year|yr)s?\s*\(?\s*(\d+)\s*month/i);
  const currentCorpusMatch =
    md.match(/Portfolio\s*Value:\s*₹?\s*([\d,]+(?:\.\d+)?)/i);
  const monthlyMatch =
    md.match(/Net\s*Monthly\s*Investable:\s*₹?\s*([\d,]+(?:\.\d+)?)/i);

  return {
    goalType: goalTypeMatch ? goalTypeMatch[1].trim().replace(/[*.]/g, "") : null,
    goalAmount: goalAmountMatch ? parseInr("₹" + goalAmountMatch[1]) : null,
    goalDate: goalDateMatch ? goalDateMatch[1].trim().replace(/[*.]/g, "") : null,
    horizonYears: horizonMatch ? Number(horizonMatch[1]) : null,
    currentCorpus: currentCorpusMatch ? parseInr("₹" + currentCorpusMatch[1]) : null,
    monthlyInvestable: monthlyMatch ? parseInr("₹" + monthlyMatch[1]) : null,
  };
}

// ─── Strategist artifact ──────────────────────────────────────────────────

export type StrategistParsed = {
  hasPlanB: boolean;
  trancheCount: number;
  proposalSummary: string | null;
};

export function parseStrategist(md: string): StrategistParsed {
  const hasPlanB = /##\s*\d*\.?\s*Plan\s*B/i.test(md);
  // Distinct "Tranche N" mentions — both "Tranche 1" and "Sub-Tranche 1" count
  const tranches = md.match(/(?:Sub-)?Tranche\s+\d+/gi) ?? [];
  const trancheCount = new Set(tranches.map((t) => t.toLowerCase().replace(/sub-/i, ""))).size;

  // Summary: heading can appear anywhere (## 13. Summary, ## Summary, etc.).
  // We take everything up to the next H2 or end of file. /s flag for newlines.
  const summaryMatch = md.match(/##\s*\d*\.?\s*Summary\s*\n+([\s\S]+?)(?:\n##\s|\n*$)/i);
  let proposalSummary: string | null = null;
  if (summaryMatch) {
    proposalSummary = summaryMatch[1]
      .replace(/^[*#-]+\s*/gm, "")    // strip leading bullets / headers
      .trim()
      .slice(0, 400);
  }

  return { hasPlanB, trancheCount, proposalSummary };
}

// ─── INR formatting (for display) ─────────────────────────────────────────

/** Format a number as ₹X,XX,XXX (Indian numbering). */
export function formatInr(n: number, opts: { short?: boolean } = {}): string {
  if (!isFinite(n)) return "—";
  if (opts.short) {
    if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)}cr`;
    if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
    if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}K`;
    return `₹${n.toFixed(0)}`;
  }
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}
