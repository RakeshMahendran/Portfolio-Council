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
  // "X cr" / "X crore"
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
  // "X K" / "X k" / "X thousand" — common in SIP commitments
  const k = s.match(/₹?\s*([\d.,]+)\s*(?:K\b|k\b|thousand)/i);
  if (k) {
    const n = Number(k[1].replace(/,/g, ""));
    return isNaN(n) ? null : n * 1_000;
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
  // Total portfolio value — agents use several phrasings, sometimes wrapped
  // in markdown bold (`**`) or laid out as a table row footer
  // (`| **Total Portfolio** | **10,00,000** | **100.0%** |`).
  const B = "[*\\s]*"; // any mix of `*` and whitespace, between table cells
  const totalMatch =
    md.match(/Total\s*Portfolio\s*Value\s*:?\s*₹?\s*([\d,]+(?:\.\d+)?)/i) ??
    md.match(/Total\s*Corpus\s*:?\s*₹?\s*([\d,]+(?:\.\d+)?)/i) ??
    md.match(/Portfolio\s*Value\s*:?\s*₹?\s*([\d,]+(?:\.\d+)?)/i) ??
    md.match(new RegExp(`Total\\s*Portfolio${B}\\|?${B}₹?\\s*([\\d,]+(?:\\.\\d+)?)`, "i"));
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

  // Fallback — table form:
  //   | Fixed Deposit | 10,00,000 | 100.0% |
  //   | Cash          |    50,000 |   5.0% |
  // We accept either ₹-prefixed or bare-digit amounts in the second cell, and
  // skip the header row, separator row, and any "Total ..." footer.
  if (composition.length === 0) {
    const TABLE_KIND: Array<[RegExp, AnalystComposition["kind"], string]> = [
      [/^stocks?$/i,                "equity", "Stocks"],
      [/^equity$/i,                 "equity", "Equity"],
      [/^mutual\s*funds?$/i,        "mf",     "Mutual Funds"],
      [/^cash(?:\/(?:savings|other))?$/i, "cash", "Cash"],
      [/^fixed\s*deposit(?:s)?$/i,  "fd",     "Fixed Deposit"],
      [/^gold(?:\s*etfs?)?$/i,      "gold",   "Gold / Gold ETF"],
      [/^bonds?$/i,                 "bonds",  "Bonds"],
      [/^other$/i,                  "other",  "Other"],
    ];
    const tableRe = /^\|\s*([A-Za-z][A-Za-z\s/]*?)\s*\|\s*₹?\s*([\d,]+(?:\.\d+)?)\s*\|/gm;
    let tm;
    while ((tm = tableRe.exec(md)) !== null) {
      const cell = tm[1].trim();
      if (/^(asset\s*type|total\s*portfolio|---|amount)/i.test(cell)) continue;
      const matched = TABLE_KIND.find(([re]) => re.test(cell));
      if (!matched) continue;
      const [, kind, label] = matched;
      const amount = parseInr("₹" + tm[2]);
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
  // "(per RULES Hard Rule #3): ₹75,000". The `[*\s]*` segment after `:`
  // tolerates the markdown-bold wrap (`**Required Buffer:** ₹75,000`).
  const requiredBufferMatch = md.match(/Required\s*buffer[^:]*:[*\s]*₹\s*([\d,]+)/i);
  // "Current Liquid: ₹X" OR "Total Liquid: ₹X" (some agents bullet the
  // breakdown and only the total appears as a single line).
  const currentLiquidMatch =
    md.match(/Current\s*liquid[^:]*:[*\s]*₹\s*([\d,]+)/i) ??
    md.match(/Total\s*Liquid[^:]*:[*\s]*₹\s*([\d,]+)/i);
  const requiredBuffer = requiredBufferMatch
    ? parseInr("₹" + requiredBufferMatch[1])
    : null;
  const currentLiquid = currentLiquidMatch
    ? parseInr("₹" + currentLiquidMatch[1])
    : null;

  // Status line — agents sometimes wrap "Status" AND the value in markdown
  // bold (`**Status:** **ADEQUATE**`), so allow any mix of `*` and whitespace
  // between the colon and the value.
  let liquidityStatus: AnalystParsed["liquidityStatus"] = null;
  if (/[*\s]*Status[*\s]*:[*\s]*ADEQUATE/i.test(md))
    liquidityStatus = "ADEQUATE";
  else if (/[*\s]*Status[*\s]*:[*\s]*TIGHT/i.test(md))
    liquidityStatus = "TIGHT";
  else if (/[*\s]*Status[*\s]*:[*\s]*DEFICIENT/i.test(md))
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
  kind: "Hard" | "Soft"; // distinguishes Hard Rule #1 from Soft Rule #1
};

export type RiskParsed = {
  verdict: "APPROVE" | "AMEND" | "VETO" | null;
  confidence: number | null;
  rules: RuleCompliance[];
  planB: string | null;
};

// Map a status word (PASS / FAIL / ALIGNED / FUTURE / AMEND / …) to a chip kind.
function ruleStatusFromWord(word: string): RuleCompliance["status"] {
  const w = word.toUpperCase();
  if (/FAIL|VIOLAT/.test(w)) return "fail";
  if (/AMEND/.test(w)) return "amend";
  if (/PASS|ALIGN|COMPLIAN|MET\b|SATISF/.test(w)) return "pass";
  return "info"; // FUTURE, PENDING, N/A, etc.
}

export function parseRisk(md: string): RiskParsed {
  // Verdict — tolerate both the inline form (`**Verdict:** APPROVE`) and the
  // heading-then-value form the agents actually emit:
  //   ## 1. Verdict
  //   **APPROVE**
  // `[\s:*]+` spans the newline + bold markers between "Verdict" and the word.
  let verdict: RiskParsed["verdict"] = null;
  const vm = md.match(/Verdict[\s:*]+\**\s*(APPROVE|AMEND|VETO)\b/i);
  if (vm) verdict = vm[1].toUpperCase() as RiskParsed["verdict"];

  // Confidence
  const confMatch = md.match(/Confidence:\s*(\d+(?:\.\d+)?)\s*%/i);
  const confidence = confMatch ? Number(confMatch[1]) : null;

  // Rule-by-rule outcomes. Agents emit these as bullets, e.g.:
  //   - Hard Rule #1 (Goal commitment — impact toward ₹1Cr): **PASS** — …
  //   - **Soft Rule #1 (Gradual equity exposure):** ALIGNED — …
  // The label sits inside parentheses; the status word follows the colon.
  const rules: RuleCompliance[] = [];
  const seenRule = new Set<string>();
  const ruleBulletRe =
    /(?:^|\n)\s*[-*]\s*\*{0,2}\s*(Hard|Soft)\s*Rule\s*#?(\d+)\s*\(([^)]+)\)\s*\*{0,2}\s*:\s*\*{0,2}\s*([A-Za-z/]+)/gi;
  let m;
  while ((m = ruleBulletRe.exec(md)) !== null) {
    const kind = (m[1][0].toUpperCase() + m[1].slice(1).toLowerCase()) as "Hard" | "Soft";
    const num = Number(m[2]);
    const key = `${kind}#${num}`;
    if (seenRule.has(key)) continue;
    seenRule.add(key);
    // Label = the text inside the parens, trimmed at the em/en-dash aside.
    // Only split on em/en dashes (not the hyphen in "Low-risk"/"penny/illiquid").
    const label = m[3].split(/\s[—–]\s|\s—\s/)[0].trim().slice(0, 60);
    rules.push({ number: num, label, status: ruleStatusFromWord(m[4]), kind });
  }

  // Fallback — markdown-table form (older agents):
  //   | **#1: Goal commitment** … | ✅ PASS | … |
  if (rules.length === 0) {
    const ruleRowRe =
      /\|\s*\*{1,2}\s*#?(\d+):\s*([^*\n]+?)\s*\*{1,2}[^|]*\|\s*([^|\n]+?)\s*\|/gm;
    while ((m = ruleRowRe.exec(md)) !== null) {
      const num = Number(m[1]);
      if (rules.find((r) => r.number === num && r.kind === "Hard")) continue;
      const label = m[2].trim().slice(0, 60);
      const statusCell = m[3];
      let status: RuleCompliance["status"] = "info";
      if (/❌|\bFAIL\b|\bVIOLATES?\b/i.test(statusCell)) status = "fail";
      else if (/✅|\bPASS(?:ES)?\b/i.test(statusCell)) status = "pass";
      else if (/AMEND/i.test(statusCell)) status = "amend";
      else if (/⚠|PENDING|UNDETERMINABLE/i.test(statusCell)) status = "info";
      else continue;
      rules.push({ number: num, label, status, kind: "Hard" });
    }
  }

  // Plan B — tolerate "## 5. The Plan B (…)" as well as "## Plan B".
  const planBMatch = md.match(
    /##\s*\d*\.?\s*(?:The\s+)?Plan\s*B[^\n]*\n+([\s\S]+?)(?:\n##\s|$)/i,
  );
  const planB = planBMatch ? planBMatch[1].trim() : null;

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

// Split a markdown table row "| a | b | c |" into trimmed cells, stripping
// the leading/trailing empties and any bold markers.
function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.replace(/\*\*/g, "").trim());
}

export function parseExecution(md: string): ExecutionParsed {
  const orders: ExecutionOrder[] = [];
  const lines = md.split("\n");

  // Header-driven parse. Find the order table by its header row — it contains
  // an "Action" column plus a symbol/instrument column. Then map each data row
  // by column position. This is robust to the real layouts agents emit:
  //   | # | Symbol/Instrument | Action | Qty/Type | Order Type | Price Target | Estimated INR | Notes |
  // where qty is "Lump-sum"/"300 units (Tranche 1A)"/"—" and action is
  // BUY/SELL/HOLD/ALLOCATE.
  let headerIdx = -1;
  let cols: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*\|/.test(lines[i])) continue;
    const cells = splitTableRow(lines[i]).map((c) => c.toLowerCase());
    if (cells.some((c) => /\baction\b/.test(c)) &&
        cells.some((c) => /symbol|instrument/.test(c))) {
      headerIdx = i;
      cols = cells;
      break;
    }
  }

  if (headerIdx >= 0) {
    const find = (...names: RegExp[]) =>
      cols.findIndex((c) => names.some((re) => re.test(c)));
    const iSeq = find(/^#$/, /^no\.?$/, /^s\.?\s*no/);
    const iSym = find(/symbol|instrument/);
    const iAct = find(/\baction\b/);
    const iQty = find(/qty|quantity|units?/);
    const iType = find(/order\s*type/);
    // Prefer the rupee-amount column (Estimated INR / Amount / Value) over the
    // per-unit "Price Target" — the latter is often free text ("Closing NAV").
    const iAmount = find(/estimated\s*inr|amount|value|deploy/);
    const iPrice = iAmount >= 0 ? iAmount : find(/price/);
    const iNotes = find(/note|sequenc/);

    let seq = 1;
    for (let i = headerIdx + 1; i < lines.length; i++) {
      const ln = lines[i];
      if (!/^\s*\|/.test(ln)) break; // table ended
      if (/^\s*\|[\s|:-]+\|?\s*$/.test(ln)) continue; // separator row
      const cells = splitTableRow(ln);
      const symbol = (iSym >= 0 ? cells[iSym] : "")?.trim() ?? "";
      const action = (iAct >= 0 ? cells[iAct] : "")?.toUpperCase().trim() ?? "";
      if (!symbol || !action) continue;
      // skip the "TOTAL" footer rows
      if (/^total\b/i.test(symbol)) continue;
      const seqCell = iSeq >= 0 ? Number(cells[iSeq]) : NaN;
      orders.push({
        seq: Number.isFinite(seqCell) ? seqCell : seq++,
        symbol: symbol.slice(0, 48),
        action,
        qty: (iQty >= 0 ? cells[iQty] : "")?.replace(/\s+/g, " ").trim() || "—",
        orderType: iType >= 0 ? cells[iType] : undefined,
        price: iPrice >= 0 ? cells[iPrice]?.replace(/^₹\s*/, "") : undefined,
        sequencing: (iNotes >= 0 ? cells[iNotes] : "")?.slice(0, 100) ?? "",
      });
    }
  }

  // Fallback — prose-table: "| **SYMBOL** (400 shares @ ₹269) | ₹1,07,600 |"
  if (orders.length === 0) {
    const proseRowRe =
      /^\|\s*\*?\*?([A-Z][A-Z0-9.&\-]+)\*?\*?\s*\(([\d,.]+)\s*shares?\s*@\s*₹?\s*([\d,.]+)\)\s*\|\s*₹?\s*([\d,.]+)/gim;
    let seq = 1;
    let pm;
    while ((pm = proseRowRe.exec(md)) !== null) {
      orders.push({
        seq: seq++,
        symbol: pm[1].trim(),
        action: "BUY",
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

  // Fall back to summing the parsed order amounts when there's no explicit
  // "Total BUY" line (the common case for these order tables).
  const sumByAction = (re: RegExp) =>
    orders
      .filter((o) => re.test(o.action))
      .reduce((sum, o) => sum + (parseInr("₹" + (o.price ?? "")) ?? 0), 0);
  const buyFromOrders = sumByAction(/^BUY$/);
  const sellFromOrders = sumByAction(/^SELL$/);

  return {
    orders,
    totalBuy: totalBuyMatch
      ? parseInr("₹" + totalBuyMatch[1])
      : buyFromOrders > 0
        ? buyFromOrders
        : null,
    totalSell: totalSellMatch
      ? parseInr("₹" + totalSellMatch[1])
      : sellFromOrders > 0
        ? sellFromOrders
        : null,
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
  const hasPlanB = /##\s*\d*\.?\s*(?:The\s+)?Plan\s*B/i.test(md);
  // Count distinct deployment steps. Agents phrase these as either
  // "Tranche N" / "Sub-Tranche N" or "Phase 1A" / "Phase 1B" / "Phase 2".
  const tranches = md.match(/(?:Sub-)?Tranche\s+\d+/gi) ?? [];
  const phases = md.match(/Phase\s+\d+[A-Z]?/gi) ?? [];
  const steps = new Set<string>();
  for (const t of tranches) steps.add(t.toLowerCase().replace(/sub-/i, ""));
  for (const p of phases) steps.add(p.toLowerCase().replace(/\s+/g, " "));
  const trancheCount = steps.size;

  // Summary: heading can appear anywhere (## 13. Summary, ## Final
  // Recommendation, ## Recommendation, etc.). Take everything up to the next
  // H2 or end of file.
  const summaryMatch = md.match(
    /##\s*\d*\.?\s*(?:Summary|Final\s*Recommendation|Recommendation)\s*\n+([\s\S]+?)(?:\n##\s|\n*$)/i,
  );
  let proposalSummary: string | null = null;
  if (summaryMatch) {
    proposalSummary = summaryMatch[1]
      .replace(/^[*#-]+\s*/gm, "")    // strip leading bullets / headers
      .trim()
      .slice(0, 400);
  }

  return { hasPlanB, trancheCount, proposalSummary };
}

// ─── Prescription parsers — SIPs / Future tranches / Next review ────────

export type SIPLine = {
  symbol: string;
  monthlyAmount: number;
};

export type SIPPlan = {
  totalMonthly: number | null;
  lines: SIPLine[];
  startNote: string | null;
};

// Words that the symbol-capturing regexes occasionally bite on. They're not
// instruments — they're categories, totals, or prose tokens like "to SIP".
const GENERIC_SYMBOL = new Set([
  "SIP", "SIPS", "ETF", "ETFS", "FUND", "FUNDS", "MF",
  "TOTAL", "MONTHLY", "ANNUAL", "DIVIDEND",
]);

/** Parse recurring SIP commitments out of a Strategist/Execution/report markdown. */
export function parseSIPs(md: string): SIPPlan {
  const lines: SIPLine[] = [];

  // Pattern A — arrow style: "₹40K/month → NIFTYBEES" / "₹40,000/month → NIFTYBEES"
  // We also skip generic-word captures here (e.g. prose like "₹75K/month to SIP").
  const arrowRe =
    /₹\s*([\d,.]+\s*[KLcr]?(?:rore|akh)?)\s*\/?\s*(?:month|mo)\s*(?:→|->|to)\s*([A-Z][A-Z0-9.&\-]+(?:\s+[A-Z][A-Z0-9.&\-]+){0,3})/gi;
  let m;
  while ((m = arrowRe.exec(md)) !== null) {
    const amount = parseInr("₹" + m[1]);
    const sym = m[2].trim().split(/\s/).slice(0, 3).join(" ");
    if (amount && amount > 0 && !GENERIC_SYMBOL.has(sym.toUpperCase())) {
      lines.push({ symbol: sym, monthlyAmount: amount });
    }
  }

  // Pattern B — bullet style: "  - NIFTYBEES ₹25K/month" / "* NIFTYBEES: ₹25,000 per month"
  if (lines.length === 0) {
    const bulletRe =
      /(?:^|\n)\s*[-*•]\s*([A-Z][A-Z0-9.&\-]+(?:\s+(?:ETF|FoF|Fund|BAF|Plus|Index))*)\s*[:\s]+₹\s*([\d,.]+\s*[KLcr]?(?:rore|akh)?)\s*\/?\s*(?:month|mo|per month)/gi;
    while ((m = bulletRe.exec(md)) !== null) {
      const amount = parseInr("₹" + m[2]);
      if (amount && amount > 0) {
        lines.push({ symbol: m[1].trim(), monthlyAmount: amount });
      }
    }
  }

  // Pattern C — markdown table layout, scoped to the SIP-setup section so we
  // don't also pick up rows from adjacent tables (Liquidity Reserve, Dry
  // Powder, etc.). We isolate the section between a SIP-section header
  // ("SIP Setup", "Monthly SIP", "Auto-SIP") and the next H2/H3 / horizontal-rule.
  if (lines.length === 0) {
    const sectionRe =
      /(?:###?\s*[^\n]*(?:SIP\s*Setup|Monthly\s*SIP|Auto-?SIP)[^\n]*|\*\*Monthly\s*SIP\*\*)[^\n]*\n([\s\S]*?)(?:\n###?\s|\n---|\n\n## )/i;
    const sectionMatch = md.match(sectionRe);
    if (sectionMatch) {
      const section = sectionMatch[1];
      const tableRe =
        /^\|\s*\*?\*?([A-Z][A-Za-z0-9.&\-\s()/]+?)\*?\*?\s*\|\s*\*?\*?\s*₹\s*([\d,.]+\s*[KLcr]?(?:rore|akh)?)\*?\*?\s*(?:\/\s*(?:month|mo))?\s*\|/gm;
      while ((m = tableRe.exec(section)) !== null) {
        const rawSym = m[1].trim();
        if (/^(total|monthly|sip|---|instrument)\b/i.test(rawSym)) continue;
        const amount = parseInr("₹" + m[2]);
        if (amount && amount > 0) {
          lines.push({ symbol: rawSym, monthlyAmount: amount });
        }
      }
    }
  }

  // Defensive: filter again post-collection in case Pattern B/C captured anything.
  const filtered = lines.filter(
    (l) => !GENERIC_SYMBOL.has(l.symbol.toUpperCase()),
  );

  // Dedup by symbol — keep the first occurrence.
  const seen = new Set<string>();
  const dedupedLines = filtered.filter((l) => {
    const key = l.symbol.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Total monthly SIP — the SUM of detected lines is the source of truth.
  // The regex fallback historically misfired on "12 months of SIP: ₹7,20,000"
  // (an annual rollup) and on table cells like "| SIP | Lower monthly SIP |
  // ₹50,000/month |" (a Plan B alternative). Two stricter fallbacks:
  //   (a) Canonical markdown-table total: "| Total Monthly SIP | ₹X |"
  //   (b) Section header "Total Monthly SIP: ₹X/month" — note we DO NOT
  //       allow `|` in the separator class (it lets the match cross cells).
  let totalMonthly: number | null = null;
  if (dedupedLines.length > 0) {
    totalMonthly = dedupedLines.reduce((sum, r) => sum + r.monthlyAmount, 0);
  } else {
    const tableTotalRe =
      /\|\s*\*?\*?\s*Total\s*Monthly\s*SIP\s*\*?\*?\s*\|\s*\*?\*?\s*₹\s*([\d,.]+\s*[KLcr]?(?:rore|akh)?)/i;
    const tt = md.match(tableTotalRe);
    if (tt) totalMonthly = parseInr("₹" + tt[1]);
    if (totalMonthly === null) {
      const strictTotalRe =
        /Total\s+Monthly\s+SIP[s]?[:\s]+₹\s*([\d,.]+\s*[KLcr]?(?:rore|akh)?)(?:\s*\/?\s*(?:month|mo|per month)\b)/i;
      const t = md.match(strictTotalRe);
      if (t) totalMonthly = parseInr("₹" + t[1]);
    }
  }

  // Sanity-cap: any monthly SIP claim > ₹5L is almost certainly an annual
  // figure misread as monthly. Cap at ₹5L/month or fall back to the
  // line-sum (whichever is smaller).
  if (totalMonthly !== null && totalMonthly > 5_00_000) {
    totalMonthly =
      dedupedLines.length > 0
        ? dedupedLines.reduce((sum, r) => sum + r.monthlyAmount, 0)
        : null;
  }

  // Start-date hint — "starting June 2026" / "from next month"
  const startMatch =
    md.match(/starting\s+([A-Za-z]+\s+\d{4})/i) ??
    md.match(/from\s+(next\s+month)/i) ??
    md.match(/begin(?:ning|s)?\s+([A-Za-z]+\s+\d+)/i);

  return {
    totalMonthly,
    lines: dedupedLines,
    startNote: startMatch ? startMatch[1] : null,
  };
}

export type ForwardTranche = {
  name: string;       // "Tranche 2"
  dateText: string;   // "June 24, 2026"
  amountText: string; // "₹2.5L"
  amount: number | null;
  condition: string | null;
};

/** Extract future-tranche / scheduled deployments from proposal/report markdown. */
export function parseForwardTranches(md: string): ForwardTranche[] {
  const out: ForwardTranche[] = [];

  // Pattern: "**Tranche 2 (June 24, 2026):** Deploy ₹2.5L more"
  // Allow markdown asterisks anywhere between segments.
  const trancheRe =
    /(Tranche\s+\d+|Sub-Tranche\s+\d+)\s*\(?\s*([A-Za-z]+\s+\d+,?\s*\d{4})\s*\)?[*:\s]+(?:Deploy\s+)?(₹\s*[\d,.]+\s*[KLcr]?(?:rore|akh)?)\s*(?:more)?(?:\s*\((?:cumulative[^)]+)\))?(?:\s+\*?\*?IF\*?\*?\s+([^\n.]+))?/gi;
  let m;
  while ((m = trancheRe.exec(md)) !== null) {
    out.push({
      name: m[1].trim(),
      dateText: m[2].trim(),
      amountText: m[3].trim(),
      amount: parseInr(m[3]),
      condition: m[4]?.trim() ?? null,
    });
  }

  // Dedupe by name+date
  const seen = new Set<string>();
  return out.filter((t) => {
    const key = `${t.name}|${t.dateText}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Detect when the user should re-run a portfolio review next. */
export function parseNextReview(md: string): {
  text: string;
  daysFromNow: number | null;
  triggers: string[];
} {
  const triggers: string[] = [];

  // Explicit "Next review: <date>" or "review in 30 days"
  let text =
    md.match(/(?:Tranche\s+\d+\s*review|Next\s*(?:portfolio\s+)?review)\s*(?:in|on|by)?\s*([^\n.]+)/i)?.[1]?.trim() ?? "";
  // Strip markdown bold + parenthetical asides so the text reads cleanly.
  text = text
    .replace(/\*+/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[:—-]\s*$/, "")
    .trim();
  let daysFromNow: number | null = null;
  if (!text) {
    const daysMatch = md.match(/review\s+in\s+(\d+)\s*days/i);
    if (daysMatch) {
      daysFromNow = Number(daysMatch[1]);
      text = `${daysFromNow} days`;
    }
  } else {
    // Extract day count from the cleaned text if present
    const dm = text.match(/(\d+)\s*days?/i);
    if (dm) daysFromNow = Number(dm[1]);
  }
  // "in 30 days" embedded in steps
  const inDays = md.match(/(?:in|after)\s+(\d+)\s*days/i);
  if (daysFromNow === null && inDays) {
    daysFromNow = Number(inDays[1]);
  }

  // Emergency triggers — typical phrasings
  const triggerPatterns = [
    /NIFTY\s*(?:drops?|falls?)\s*>?\s*(\d+)\s*%/gi,
    /VIX\s*>?\s*(\d+)/gi,
    /major\s+life\s+change/gi,
    /windfall/gi,
    /salary\s+change/gi,
    /portfolio\s+drops?\s*>?\s*(\d+)\s*%/gi,
  ];
  for (const pat of triggerPatterns) {
    let tm;
    while ((tm = pat.exec(md)) !== null) {
      triggers.push(tm[0].trim());
      if (triggers.length > 20) break;
    }
  }
  // Dedupe while preserving order
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const t of triggers) {
    const key = t.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(t);
  }

  return {
    text: text || (daysFromNow !== null ? `${daysFromNow} days` : ""),
    daysFromNow,
    triggers: deduped.slice(0, 4),
  };
}

// ─── Target Allocation (Q1) — Strategist's post-deployment composition ───

export type TargetPosition = {
  symbol: string;
  amount: number;
  pct: number;
};

export function parseTargetAllocation(md: string): TargetPosition[] {
  // (A) Table form: | **NIFTYBEES** | ₹1,45,000 | 592 | **14.5%** | ✅ |
  const out: TargetPosition[] = [];
  const sectionMatch = md.match(/##\s*\d*\.?\s*(?:Final\s*Portfolio\s*Composition|Target\s*Allocation|Post-?Deployment\s*Composition)[^\n]*\n([\s\S]*?)(?:\n##|\n---|\n\*\*Key|$)/i);
  if (sectionMatch) {
    const section = sectionMatch[1];
    const rowRe = /^\|\s*\*?\*?([A-Za-z][\w\s&.()/-]+?)\*?\*?\s*\|\s*₹\s*([\d,.]+)\s*\|[^|]*\|\s*\*?\*?([\d.]+)\s*%/gm;
    let m;
    while ((m = rowRe.exec(section)) !== null) {
      const symbol = m[1].trim();
      if (/^TOTAL$/i.test(symbol)) continue;
      const amount = parseInr("₹" + m[2]);
      const pct = Number(m[3]);
      if (amount && !isNaN(pct)) out.push({ symbol, amount, pct });
    }
  }
  if (out.length > 0) return out;

  // (B) Bullet form — the resulting composition after the first tranche, e.g.:
  //   ### Post-Phase-1A State (Immediate)
  //   - Equity: ~15% (NIFTYBEES ₹1.5L)
  //   - Debt: ~7.5% (HDFC Corp Bond ₹75K)
  //   - Cash/Liquid: ~67.5% (₹6.75L in FD/liquid)
  // Scope to the first "Post-...State" / "Resulting Allocation" block so we
  // don't blend the 6-month projection into the immediate snapshot.
  const stateMatch = md.match(
    /###?\s*(?:Post-?[\w-]*\s*State|Resulting\s*Allocation|After\s*Deployment)[^\n]*\n([\s\S]*?)(?:\n###?\s|\n##\s|$)/i,
  );
  if (stateMatch) {
    const block = stateMatch[1];
    const bulletRe =
      /[-*]\s*(Equity|Debt(?:\s*Funds?)?|Hybrid(?:\s*Funds?)?|Cash(?:\/Liquid)?|Gold|Bonds?)\s*:\s*~?\s*([\d.]+)\s*%\s*(?:\(([^)]*)\))?/gi;
    let m;
    const seen = new Set<string>();
    while ((m = bulletRe.exec(block)) !== null) {
      const symbol = m[1].trim();
      const key = symbol.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const pct = Number(m[2]);
      const amount = m[3] ? parseInr(m[3]) : null;
      if (!isNaN(pct)) out.push({ symbol, amount: amount ?? 0, pct });
    }
  }
  return out;
}

// ─── Stress tests (Q2) ───────────────────────────────────────────────────

export type StressScenario = {
  name: string;
  drawdownPct: number | null;
  drawdownAmount: number | null;
  recovery: string | null;
  verdict: "ACCEPTABLE" | "MARGINAL" | "UNACCEPTABLE" | null;
};

export function parseStressTests(md: string): StressScenario[] {
  const out: StressScenario[] = [];
  const sectionMatch = md.match(/##\s*\d*\.?\s*Stress\s*Test[^\n]*\n([\s\S]*?)(?:\n## |$)/i);
  if (!sectionMatch) return out;
  const section = sectionMatch[1];
  // Each scenario is "### Scenario N: NAME"
  const blocks = section.split(/###\s+/).slice(1);
  for (const block of blocks) {
    const nameMatch = block.match(/^(Scenario\s+\d+:[^\n]+)/i);
    if (!nameMatch) continue;
    const name = nameMatch[1].replace(/\*+/g, "").trim();
    // Drawdown can be written either way:
    //   "→ **-8.85% drawdown**"   (% before the word)
    //   "drawdown = -8.85%"        (word before the %)
    const ddPctMatch =
      block.match(/(-?[\d.]+)\s*%\s*drawdown/i) ??
      block.match(/(?:max(?:imum)?\s*)?drawdown[^=:\n%]*[=:]\s*\*?\*?(-?[\d.]+)\s*%/i);
    const ddAmountMatch = block.match(/(?:Total\s*)?drawdown[^₹\n]*?₹\s*([\d,.]+)/i);
    const recoveryMatch = block.match(/Recovery\s*time[^:]*:\s*\*?\*?([^*\n]+?)\s*\*?\*?(?:\n|$)/i);
    let verdict: StressScenario["verdict"] = null;
    if (/UNACCEPTABLE|\bFAIL/i.test(block)) verdict = "UNACCEPTABLE";
    else if (/MARGINAL|\bMARGIN/i.test(block)) verdict = "MARGINAL";
    else if (/ACCEPTABLE|PASS(?:ES)?\b/i.test(block)) verdict = "ACCEPTABLE";
    out.push({
      name,
      drawdownPct: ddPctMatch ? Number(ddPctMatch[1]) : null,
      drawdownAmount: ddAmountMatch ? parseInr("₹" + ddAmountMatch[1]) : null,
      recovery: recoveryMatch ? recoveryMatch[1].trim() : null,
      verdict,
    });
  }
  return out;
}

// ─── Amendments (Q4) — what changed from v1 to v2 ────────────────────────

export type Amendment = {
  title: string;
  category: "MANDATORY" | "RECOMMENDED" | "OPTIONAL" | null;
  description: string;
};

export function parseAmendments(md: string): Amendment[] {
  const out: Amendment[] = [];
  const sectionMatch = md.match(/##\s*\d*\.?\s*Changes?\s*(?:from\s*Original|Made\s*from)[^\n]*\n([\s\S]*?)(?:\n## |$)/i);
  if (!sectionMatch) return out;
  const section = sectionMatch[1];
  const blocks = section.split(/###\s+Amendment\s+\d+:/i).slice(1);
  for (const block of blocks) {
    const titleMatch = block.match(/^([^\n(]+)\s*(?:\((MANDATORY|RECOMMENDED|OPTIONAL)[^)]*\))?/i);
    if (!titleMatch) continue;
    const title = titleMatch[1].trim().slice(0, 80);
    const category = (titleMatch[2]?.toUpperCase() as Amendment["category"]) ?? null;
    // Grab the "Amendment Implemented" or first paragraph
    const descMatch =
      block.match(/\*\*Amendment\s+Implemented\*\*[^:]*:\s*([\s\S]{0,300}?)(?:\n\n|\*\*Rationale)/i) ??
      block.match(/\*\*Original\s+Issue\*\*[^:]*:\s*([\s\S]{0,200}?)(?:\n\n|\*\*Amendment)/i);
    const description = descMatch
      ? descMatch[1].replace(/[*_#]/g, "").replace(/\s+/g, " ").trim().slice(0, 260)
      : "";
    out.push({ title, category, description });
  }
  return out;
}

// ─── Math check (Q5) ─────────────────────────────────────────────────────

export type MathCheck = {
  monthlyContribution: number | null;
  months: number | null;
  totalContributions: number | null;
  assumedReturnPct: number | null;
  projectedCorpus: number | null;
  goalAmount: number | null;
  goalCoveragePct: number | null;
};

export function parseMathCheck(md: string): MathCheck {
  // Look for patterns like "₹75K × 360 months = ₹2.7Cr" or "8% CAGR on ₹X → ₹Y"
  // Also "Required monthly progress: ~₹2,521" vs "₹75,000 monthly"
  const monthlyMatch = md.match(/₹\s*([\d,.]+\s*[KLcr]?)\s*\/?\s*month/i);
  const monthsMatch = md.match(/(\d+)\s*months?\s*(?:to|until|of|×|x)\s*(?:goal|target|deployment|contributions)/i);
  const returnMatch = md.match(/(\d+(?:\.\d+)?)\s*%\s*(?:annual\s*return|CAGR|return)/i);
  // Only a long-horizon projection counts as "projected corpus". The greedy
  // "total"/"combined" alternation used to grab "TOTAL DEPLOYED: ₹3,25,000"
  // (an immediate-deployment figure), which made goal-coverage read a false
  // ~3%. Require an explicit projected/final-corpus label.
  const corpusMatch = md.match(
    /(?:projected\s*corpus|final\s*corpus|corpus\s*(?:at|by)\s*(?:goal|maturity|retirement))[^:₹\n]*:?\s*₹\s*([\d,.]+\s*[KLcr]?(?:rore|akh)?)/i,
  );
  const goalMatch = md.match(/(?:goal|target)\s*(?:of)?:?\s*₹\s*([\d,.]+\s*[KLcr]?(?:rore|akh)?)/i);

  const monthlyContribution = monthlyMatch ? parseInr("₹" + monthlyMatch[1]) : null;
  const months = monthsMatch ? Number(monthsMatch[1]) : null;
  const totalContributions =
    monthlyContribution !== null && months !== null
      ? monthlyContribution * months
      : null;
  const projectedCorpus = corpusMatch ? parseInr("₹" + corpusMatch[1]) : null;
  const goalAmount = goalMatch ? parseInr("₹" + goalMatch[1]) : null;
  const goalCoveragePct =
    projectedCorpus !== null && goalAmount !== null && goalAmount > 0
      ? (projectedCorpus / goalAmount) * 100
      : null;

  return {
    monthlyContribution,
    months,
    totalContributions,
    assumedReturnPct: returnMatch ? Number(returnMatch[1]) : null,
    projectedCorpus,
    goalAmount,
    goalCoveragePct,
  };
}

// ─── Per-order rule citations (Q3) ───────────────────────────────────────

export function parseOrderRuleCitations(
  md: string,
): Map<string, string[]> {
  // For each row in proposed-actions tables, grab the cited rules.
  // Format: | BUY | NIFTYBEES | ... | Hard Rule #2 (concentration cap), Soft Rule #2 |
  const out = new Map<string, string[]>();
  const rowRe =
    /\|\s*\*?\*?(?:BUY|SELL|HOLD)\*?\*?\s*\|\s*\*?\*?([A-Z][A-Z0-9.&\-\s]+?)\*?\*?\s*\|[\s\S]*?(?:Rule\s*[#A-Z\d, ]+|Hard\s*Rule\s*#\d+|Soft\s*Rule\s*#\d+)([^|]*)\|/gi;
  let m;
  while ((m = rowRe.exec(md)) !== null) {
    const symbol = m[1].trim();
    if (!symbol || /^—$/.test(symbol)) continue;
    const ruleText = (m[2] ?? "").trim();
    // Extract rule numbers from the full match
    const fullMatch = m[0];
    const rules: string[] = [];
    const ruleRe = /(Hard|Soft)\s*Rule\s*#?(\d+)/gi;
    let rm;
    while ((rm = ruleRe.exec(fullMatch)) !== null) {
      rules.push(`${rm[1]} Rule #${rm[2]}`);
    }
    if (rules.length > 0) {
      const existing = out.get(symbol) ?? [];
      // Merge + dedupe
      const merged = [...new Set([...existing, ...rules])];
      out.set(symbol, merged);
    }
  }
  return out;
}

// ─── Confidence rationale (Q8) ────────────────────────────────────────────

export function parseConfidenceRationale(md: string): string | null {
  // Look for "Confidence: 92%" followed by reasoning
  const m = md.match(
    /Confidence:\s*\d+\s*%[^\n]*(?:\n[^\n]*){0,3}([\s\S]{0,400}?)(?:\n##|\n\*\*[A-Z])/i,
  );
  if (!m) return null;
  return m[1]
    .replace(/^\s*[-*]\s*/gm, "• ")
    .replace(/\*+/g, "")
    .trim()
    .slice(0, 300);
}

// ─── Plain-English summary (every agent now leads with one) ───────────────

/**
 * Extract the agent's own layperson summary. Agents lead their artifact with a
 * `## 📊 In plain English` / `## 💡 In plain English` / `## ✅ In plain English`
 * section (Analyst / Strategist / Execution). The Risk verdict instead carries
 * a `One-line summary: …` line — we fall back to that.
 */
export function parsePlainEnglish(md: string): string | null {
  // Primary: the "## … In plain English" section, body up to the next heading.
  const section = md.match(
    /##[^\n]*In\s+plain\s+English[^\n]*\n+([\s\S]+?)(?:\n##\s|\n---|\n*$)/i,
  );
  let body = section?.[1] ?? null;

  // Fallback: Risk's "One-line summary: …"
  if (!body) {
    const oneLine = md.match(/One-line summary:\s*([^\n]+)/i);
    body = oneLine?.[1] ?? null;
  }
  if (!body) return null;

  const cleaned = body
    .replace(/^\s*[-*]\s*/gm, "• ") // bullets → •
    .replace(/[*_#`]/g, "")          // strip md emphasis / code ticks
    .replace(/\s*\n\s*/g, " ")       // collapse newlines to spaces
    .trim();
  return cleaned.length > 0 ? cleaned.slice(0, 700) : null;
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
