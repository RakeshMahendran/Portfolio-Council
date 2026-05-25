import { readFileSync } from 'fs';
import { parseRisk, parseConfidenceRationale } from './src/lib/parse-artifacts.ts';

const verdictMd = readFileSync('/mnt/e/RakeshProfessional/portfolio-agent/agents/risk/workspace/verdict-2026-05-24.md', 'utf-8');

const riskData = parseRisk(verdictMd);
const rationale = parseConfidenceRationale(verdictMd);

console.log('=== RISK PARSER TEST ===\n');
console.log('Verdict:', riskData.verdict);
console.log('Confidence:', riskData.confidence, '%');
console.log('Rules count:', riskData.rules.length);
console.log('Plan B present:', riskData.planB ? 'YES' : 'NO');
console.log('Plan B length:', riskData.planB?.length || 0, 'chars');
console.log('\nConfidence rationale:', rationale ? 'FOUND' : 'NULL');

console.log('\n=== RULES BREAKDOWN ===');
riskData.rules.forEach((r) => {
  console.log(`Rule #${r.number}: "${r.label.slice(0, 40)}..." → ${r.status}`);
});

console.log('\n=== EXPECTED vs ACTUAL ===');
console.log('Expected verdict: APPROVE');
console.log('Actual verdict:', riskData.verdict);
console.log('Match:', riskData.verdict === 'APPROVE' ? 'PASS' : 'FAIL');

console.log('\nExpected confidence: 100% (artifact has no "Confidence:" line outside verdict section)');
console.log('Actual confidence:', riskData.confidence);
console.log('Match:', riskData.confidence === null ? 'PASS' : 'FAIL');

console.log('\nExpected rules: 7 Hard Rules #1-7, all PASS');
console.log('Actual rules: ' + riskData.rules.length);
riskData.rules.forEach((r, i) => {
  const expectedStatus = 'pass';
  const match = r.status === expectedStatus ? 'OK' : `MISMATCH (expected ${expectedStatus})`;
  console.log(`  Rule #${r.number}: ${r.status.toUpperCase()} ${match}`);
});

console.log('\nExpected Plan B: YES (section exists in verdict)');
console.log('Actual Plan B:', riskData.planB ? 'FOUND (' + riskData.planB.length + ' chars)' : 'NULL');
