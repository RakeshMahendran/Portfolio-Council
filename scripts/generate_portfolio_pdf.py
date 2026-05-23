"""Generate Portfolio Holdings Deep Analysis PDF."""
import os
import json
from datetime import datetime
from xhtml2pdf import pisa

# Load analysis data
data_path = os.path.join(os.path.dirname(__file__), "portfolio_data", "holdings_analysis.json")
with open(data_path) as f:
    holdings = json.load(f)

# Sort by action priority: EXIT first, then REVIEW, then rest
action_order = {"EXIT": 0, "REVIEW": 1, "AVERAGE DOWN": 2, "HOLD": 3, "BOOK PARTIAL": 4}

PDF_STYLES = """
@page { size: A4; margin: 1.5cm 2cm;
    @frame footer { -pdf-frame-content: footerContent; bottom: 0.5cm;
        margin-left: 2cm; margin-right: 2cm; height: 1.2cm; }
}
body { font-family: Helvetica, Arial, sans-serif; font-size: 9pt; line-height: 1.4; color: #1a1a1a; }
.header { background-color: #0a2540; color: #fff; padding: 20px 25px;
    margin: -1.5cm -2cm 20px -2cm; padding-left: 2cm; padding-right: 2cm; }
.header h1 { font-size: 20pt; margin: 0 0 5px 0; color: #fff; }
.header .sub { font-size: 10pt; color: #a3c4e0; margin: 3px 0; }
.header .meta { font-size: 8pt; color: #7db3d8; margin-top: 8px; }
h2 { font-size: 13pt; color: #0a2540; border-bottom: 2px solid #0a2540;
    padding-bottom: 4px; margin-top: 18px; margin-bottom: 8px; }
h3 { font-size: 11pt; color: #1a5276; margin-top: 12px; margin-bottom: 6px; }
table { width: 100%; border-collapse: collapse; margin: 6px 0 10px 0; font-size: 8pt; }
thead { background-color: #0a2540; color: #fff; }
th { padding: 5px 6px; text-align: left; font-weight: bold; color: #fff; border: 1px solid #0a2540; }
td { padding: 4px 6px; border: 1px solid #ddd; }
tr:nth-child(even) { background-color: #f5f7fa; }
.exit { background-color: #fdecea; border-left: 4px solid #d32f2f; padding: 8px 12px; margin: 8px 0; }
.review { background-color: #fff8e1; border-left: 4px solid #f9a825; padding: 8px 12px; margin: 8px 0; }
.hold { background-color: #e8f5e9; border-left: 4px solid #388e3c; padding: 8px 12px; margin: 8px 0; }
.info { background-color: #e3f2fd; border-left: 4px solid #1976d2; padding: 8px 12px; margin: 8px 0; }
.page-break { page-break-before: always; }
.disclaimer { background-color: #f5f5f5; border: 1px solid #ddd; padding: 8px;
    margin-top: 15px; font-size: 7pt; color: #666; font-style: italic; }
.footer { font-size: 7pt; color: #999; text-align: center; border-top: 1px solid #ddd; padding-top: 5px; }
.red { color: #d32f2f; font-weight: bold; }
.green { color: #388e3c; font-weight: bold; }
"""

now = datetime.now()
report_date = now.strftime("%A, %d %B %Y - %I:%M %p IST")

# Calculate portfolio totals
total_inv = sum(h["inv"] for h in holdings)
total_val = sum(h["cur_val"] for h in holdings)
total_pnl = total_val - total_inv
total_pnl_pct = (total_pnl / total_inv) * 100

exits = [h for h in holdings if h["action"] == "EXIT"]
reviews = [h for h in holdings if h["action"] == "REVIEW"]
holds = [h for h in holdings if h["action"] in ("HOLD", "AVERAGE DOWN", "BOOK PARTIAL")]

# Build HTML
html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>{PDF_STYLES}</style></head><body>

<div class="header">
    <h1>Portfolio Holdings — Deep Analysis Report</h1>
    <p class="sub">46-Metric Analysis with Valuation Reality Check</p>
    <p class="meta">
        Date: {report_date} &nbsp;|&nbsp;
        Holdings: {len(holdings)} stocks + 5 ETFs &nbsp;|&nbsp;
        Market Regime: CRISIS
    </p>
</div>

<h2>1. Portfolio Summary</h2>
<table>
<thead><tr><th>Metric</th><th>Value</th></tr></thead>
<tbody>
<tr><td>Total Invested (Stocks)</td><td>Rs {total_inv:,.0f}</td></tr>
<tr><td>Current Value</td><td>Rs {total_val:,.0f}</td></tr>
<tr><td>P&L</td><td><span class="{'red' if total_pnl < 0 else 'green'}">Rs {total_pnl:,.0f} ({total_pnl_pct:+.1f}%)</span></td></tr>
<tr><td>Action: EXIT</td><td><span class="red">{len(exits)} stocks</span> — {', '.join(h['sym'] for h in exits)}</td></tr>
<tr><td>Action: REVIEW</td><td>{len(reviews)} stocks — {', '.join(h['sym'] for h in reviews)}</td></tr>
<tr><td>Action: HOLD</td><td><span class="green">{len(holds)} stocks</span></td></tr>
</tbody></table>

<h2>2. All Holdings — Scorecard</h2>
<table>
<thead><tr><th>Stock</th><th>CMP</th><th>P/L%</th><th>OPM%</th><th>NPM%</th><th>ROE%</th><th>D/E</th><th>PE</th><th>RSI</th><th>Valuation</th><th>Action</th></tr></thead>
<tbody>
"""

for h in sorted(holdings, key=lambda x: action_order.get(x["action"], 3)):
    pnl_class = "red" if h["pnl_pct"] < 0 else "green"
    act_class = "red" if h["action"] == "EXIT" else ("" if h["action"] == "HOLD" else "")
    html += f"""<tr>
<td><strong>{h['sym']}</strong></td>
<td>{h['cmp']:,.2f}</td>
<td><span class="{pnl_class}">{h['pnl_pct']:+.1f}%</span></td>
<td>{h['opm']:.1f}%</td>
<td>{h['npm']:.1f}%</td>
<td>{h['roe']:.1f}%</td>
<td>{h['de']:.1f}</td>
<td>{h['trail_pe']:.1f}</td>
<td>{h['rsi']:.1f}</td>
<td>{h['val']}</td>
<td><strong><span class="{act_class}">{h['action']}</span></strong></td>
</tr>"""

html += """</tbody></table>

<div class="page-break"></div>
<h2>3. EXIT Recommendations (Sell)</h2>
"""

for h in exits:
    html += f"""
<div class="exit">
<h3>{h['sym']} — EXIT | P/L: {h['pnl_pct']:+.1f}% (Rs {h['pnl']:+,.0f})</h3>
<p><strong>Reasons:</strong> {h['reasons']}</p>
<table>
<thead><tr><th>Category</th><th>Metric</th><th>Value</th><th>Problem</th></tr></thead>
<tbody>
<tr><td>Invested</td><td>Qty x Avg</td><td>{h['qty']} x Rs {h['avg']:,.2f} = Rs {h['inv']:,.0f}</td><td>Current: Rs {h['cur_val']:,.0f}</td></tr>
<tr><td>Growth</td><td>Rev / Earn / QoQ</td><td>{h['rev_gr']}% / {h['earn_gr']}% / {h['earn_qoq']}%</td><td>{'Weak' if h['earn_gr'] <= 0 else 'OK'}</td></tr>
<tr><td>Value</td><td>Trail PE / Fwd PE</td><td>{h['trail_pe']} / {h['fwd_pe']}</td><td>{'EXTREME' if h['trail_pe'] > 80 else 'HIGH' if h['trail_pe'] > 50 else 'OK'}</td></tr>
<tr><td>Quality</td><td>OPM / NPM / ROE</td><td>{h['opm']}% / {h['npm']}% / {h['roe']}%</td><td>{'Negative margins!' if h['opm'] < 0 or h['npm'] < 0 else 'Low ROE' if h['roe'] < 5 else 'OK'}</td></tr>
<tr><td>Safety</td><td>D/E / Int Coverage</td><td>{h['de']} / {h['int_cov'] if h['int_cov'] else 'N/A'}x</td><td>{'High debt' if h['de'] > 200 else 'OK'}</td></tr>
<tr><td>Valuation</td><td>2Y Chg / Above 3Y Low</td><td>{h['chg_2y']:+.1f}% / {h['ab3y']:.0f}%</td><td>{h['val']} ({h['red_flags']} red flags)</td></tr>
<tr><td>Analyst</td><td>Target / Rating</td><td>Rs {h['tgt'] if h['tgt'] else 'N/A'} ({(h['upside'] or 0):+.1f}% upside) / {h['rec']}</td><td>{h['n_analysts']} analysts</td></tr>
</tbody></table>
</div>
"""

html += """<h2>4. REVIEW (Watch Closely)</h2>"""
for h in reviews:
    html += f"""
<div class="review">
<h3>{h['sym']} — REVIEW | P/L: {h['pnl_pct']:+.1f}% (Rs {h['pnl']:+,.0f})</h3>
<p><strong>Concerns:</strong> {h['reasons']}</p>
<table>
<thead><tr><th>Metric</th><th>Value</th><th>Metric</th><th>Value</th></tr></thead>
<tbody>
<tr><td>Rev Growth</td><td>{h['rev_gr']}%</td><td>Earn Growth</td><td>{h['earn_gr']}%</td></tr>
<tr><td>Trail PE</td><td>{h['trail_pe']}</td><td>Fwd PE</td><td>{h['fwd_pe']}</td></tr>
<tr><td>OPM</td><td>{h['opm']}%</td><td>NPM</td><td>{h['npm']}%</td></tr>
<tr><td>D/E</td><td>{h['de']}</td><td>ROE</td><td>{h['roe']}%</td></tr>
<tr><td>RSI</td><td>{h['rsi']}</td><td>From 52W High</td><td>{h['from_high']}%</td></tr>
<tr><td>Valuation</td><td>{h['val']} ({h['red_flags']} flags)</td><td>Analyst Target</td><td>Rs {h['tgt'] if h['tgt'] else 'N/A'} ({(h['upside'] or 0):+.1f}%)</td></tr>
</tbody></table>
</div>
"""

html += """<div class="page-break"></div>
<h2>5. HOLD (Fundamentally Sound)</h2>"""
for h in holds:
    box_class = "hold"
    html += f"""
<div class="{box_class}">
<h3>{h['sym']} — {h['action']} | P/L: {h['pnl_pct']:+.1f}% (Rs {h['pnl']:+,.0f})</h3>
<table>
<thead><tr><th>Metric</th><th>Value</th><th>Metric</th><th>Value</th><th>Metric</th><th>Value</th></tr></thead>
<tbody>
<tr><td>Rev Growth</td><td>{h['rev_gr']}%</td><td>Earn Growth</td><td>{h['earn_gr']}%</td><td>Earn QoQ</td><td>{h['earn_qoq']}%</td></tr>
<tr><td>Trail PE</td><td>{h['trail_pe']}</td><td>Fwd PE</td><td>{h['fwd_pe']}</td><td>EV/EBITDA</td><td>{h['ev_eb'] if h['ev_eb'] else 'N/A'}</td></tr>
<tr><td>OPM</td><td>{h['opm']}%</td><td>NPM</td><td>{h['npm']}%</td><td>ROE</td><td>{h['roe']}%</td></tr>
<tr><td>D/E</td><td>{h['de']}</td><td>Int Coverage</td><td>{h['int_cov'] if h['int_cov'] else 'N/A'}x</td><td>Cash/Debt</td><td>{h['c2d'] if h['c2d'] else 'N/A'}</td></tr>
<tr><td>RSI</td><td>{h['rsi']}</td><td>From 52W High</td><td>{h['from_high']}%</td><td>SMA20/50</td><td>{h['sma20']}/{h['sma50']}</td></tr>
<tr><td>Valuation</td><td>{h['val']}</td><td>2Y Change</td><td>{h['chg_2y']:+.1f}%</td><td>Above 3Y Low</td><td>{h['ab3y']:.0f}%</td></tr>
<tr><td>Insider %</td><td>{h['insider']}%</td><td>Inst %</td><td>{h['inst']}%</td><td>Beta</td><td>{h['beta'] if h['beta'] else 'N/A'}</td></tr>
<tr><td>Analyst Target</td><td>Rs {h['tgt'] if h['tgt'] else 'N/A'}</td><td>Upside</td><td>{(h['upside'] or 0):+.1f}% </td><td>Rating</td><td>{h['rec']}</td></tr>
</tbody></table>
</div>
"""

html += f"""
<h2>6. Action Summary</h2>
<div class="info">
<strong>Immediate Actions:</strong><br/>
<span class="red">EXIT ({len(exits)}):</span> {', '.join(h['sym'] + ' (Rs ' + str(int(h['cur_val'])) + ')' for h in exits)} — Total recoverable: Rs {sum(h['cur_val'] for h in exits):,.0f}<br/><br/>
<strong>Watch ({len(reviews)}):</strong> {', '.join(h['sym'] for h in reviews)} — Set stop-loss, review in 1 week<br/><br/>
<strong>Hold ({len(holds)}):</strong> {', '.join(h['sym'] for h in holds)} — Fundamentally OK, wait for recovery<br/><br/>
<strong>Exit proceeds (Rs {sum(h['cur_val'] for h in exits):,.0f}) can be redeployed into screener top picks (BLS, ECLERX, ENGINERSIN).</strong>
</div>

<div class="disclaimer">
<strong>Disclaimer:</strong> This report is AI-generated for educational/research purposes only.
Not financial advice. All investments carry risk including loss of principal. Consult a SEBI-registered advisor.
Data from yfinance may have delays/errors. Past performance is not indicative of future results.
</div>

<div id="footerContent" class="footer">
    Portfolio AI Holdings Analysis &mdash; {report_date} &mdash; {len(holdings)} stocks analyzed, 46 metrics checked
</div>
</body></html>"""

# Generate PDF
output_dir = os.path.join(os.path.dirname(__file__), "portfolio_data")
today = now.strftime("%Y-%m-%d")
output_path = os.path.join(output_dir, f"portfolio_analysis_{today}.pdf")

with open(output_path, "wb") as pdf_file:
    status = pisa.CreatePDF(src=html, dest=pdf_file, encoding="utf-8")

if status.err:
    print(f"PDF had {status.err} errors")
else:
    size = os.path.getsize(output_path)
    print(f"PDF generated: {output_path} ({size/1024:.1f} KB)")
