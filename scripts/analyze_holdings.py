"""Analyze current portfolio holdings with full 46-metric deep analysis."""
import yfinance as yf
import json
import os

holdings = [
    {"sym": "ADANIGREEN", "qty": 9, "avg": 1672.38, "inv": 15051},
    {"sym": "AURIONPRO", "qty": 18, "avg": 823.00, "inv": 14814},
    {"sym": "BAJAJHFL", "qty": 121, "avg": 149.87, "inv": 18134},
    {"sym": "BSE", "qty": 11, "avg": 1997.58, "inv": 21973},
    {"sym": "COCHINSHIP", "qty": 7, "avg": 1284.55, "inv": 8992},
    {"sym": "CUMMINSIND", "qty": 3, "avg": 3504.58, "inv": 10514},
    {"sym": "HAL", "qty": 4, "avg": 4312.41, "inv": 17250},
    {"sym": "IPL", "qty": 45, "avg": 221.29, "inv": 9958},
    {"sym": "IREDA", "qty": 249, "avg": 184.04, "inv": 45825},
    {"sym": "JPPOWER", "qty": 667, "avg": 17.97, "inv": 11985},
    {"sym": "MAZDOCK", "qty": 8, "avg": 2886.25, "inv": 23090},
    {"sym": "PENIND", "qty": 42, "avg": 233.00, "inv": 9786},
    {"sym": "PRAJIND", "qty": 22, "avg": 678.42, "inv": 14925},
    {"sym": "RVNL", "qty": 38, "avg": 443.24, "inv": 16843},
    {"sym": "TRANSRAILL", "qty": 47, "avg": 614.29, "inv": 28872},
]

# ETFs — just get current price
etfs = [
    {"sym": "GOLDBEES", "qty": 118, "avg": 87.86, "inv": 10367},
    {"sym": "SILVERBEES", "qty": 189, "avg": 265.26, "inv": 50135},
    {"sym": "MIDCAP", "qty": 3053, "avg": 16.98, "inv": 51841},
    {"sym": "SMALLCAP", "qty": 950, "avg": 41.52, "inv": 39442},
    {"sym": "TOP100CASE", "qty": 5000, "avg": 10.50, "inv": 52514},
]

results = []
for h in holdings:
    sym = h["sym"]
    try:
        t = yf.Ticker(f"{sym}.NS")
        info = t.info
        hist = t.history(period="1y")
        hist3 = t.history(period="3y")
        if len(hist) < 20:
            print(f"{sym}: insufficient data")
            continue
        cmp = float(hist["Close"].iloc[-1])
        pnl_pct = ((cmp - h["avg"]) / h["avg"]) * 100
        cur_val = cmp * h["qty"]
        pnl_amt = cur_val - h["inv"]

        rev_gr = (info.get("revenueGrowth", 0) or 0) * 100
        earn_gr = (info.get("earningsGrowth", 0) or 0) * 100
        trail_pe = info.get("trailingPE", 0) or 0
        fwd_pe = info.get("forwardPE", 0) or 0
        roe = (info.get("returnOnEquity", 0) or 0) * 100
        de = info.get("debtToEquity", 0) or 0
        opm = (info.get("operatingMargins", 0) or 0) * 100
        npm = (info.get("profitMargins", 0) or 0) * 100
        fcf = (info.get("freeCashflow", 0) or 0) / 1e7
        ocf = (info.get("operatingCashflow", 0) or 0) / 1e7
        mcap = (info.get("marketCap", 0) or 0) / 1e7
        td = info.get("totalDebt", 0) or 0
        tc = info.get("totalCash", 0) or 0
        ebitda = info.get("ebitda", 0) or 0
        int_cov = ebitda / (td * 0.08) if td > 0 else 999
        c2d = tc / td if td > 0 else 999
        insider = (info.get("heldPercentInsiders", 0) or 0) * 100
        inst = (info.get("heldPercentInstitutions", 0) or 0) * 100
        tgt = info.get("targetMeanPrice")
        n_analysts = info.get("numberOfAnalystOpinions", 0) or 0
        rec = info.get("recommendationKey", "")
        ev_eb = info.get("enterpriseToEbitda", 0) or 0
        beta = info.get("beta", 0) or 0
        sector = info.get("sector", "?")
        earn_qoq = (info.get("earningsQuarterlyGrowth", 0) or 0) * 100
        eps_t = info.get("trailingEps", 0) or 0
        eps_f = info.get("epsForward", 0) or 0
        eps_gr = ((eps_f - eps_t) / abs(eps_t) * 100) if eps_t else 0

        # Technicals
        h52 = info.get("fiftyTwoWeekHigh", 0) or float(hist["Close"].max())
        l52 = info.get("fiftyTwoWeekLow", 0) or float(hist["Close"].min())
        fh = ((cmp - h52) / h52 * 100) if h52 else 0
        d = hist["Close"].diff()
        g = d.where(d > 0, 0).rolling(14).mean()
        ls = (-d.where(d < 0, 0)).rolling(14).mean()
        rsi = float((100 - (100 / (1 + g / ls))).iloc[-1])
        s20 = float(hist["Close"].rolling(20).mean().iloc[-1])
        s50 = float(hist["Close"].rolling(50).mean().iloc[-1])

        # Valuation check
        val_verdict = "N/A"
        chg_2y = 0
        ab3y = 0
        red_flags = 0
        if len(hist3) >= 504:
            p2y = float(hist3["Close"].iloc[-504])
            low3y = float(hist3["Close"].min())
            chg_2y = ((cmp - p2y) / p2y * 100)
            ab3y = ((cmp - low3y) / low3y * 100)
            if earn_gr > 0 and chg_2y > 0:
                ratio = chg_2y / (earn_gr * 2) if earn_gr > 0 else 99
                if ratio > 3: red_flags += 2
                elif ratio > 2: red_flags += 1
            elif earn_gr <= 0 and chg_2y > 50:
                red_flags += 2
            if trail_pe > 80: red_flags += 2
            elif trail_pe > 50 and "tech" not in sector.lower(): red_flags += 1
            if ab3y > 400: red_flags += 2
            elif ab3y > 200: red_flags += 1
            if red_flags >= 4: val_verdict = "FAIL"
            elif red_flags >= 2: val_verdict = "CAUTION"
            else: val_verdict = "PASS"

        upside = ((tgt - cmp) / cmp * 100) if tgt else None

        # Action recommendation
        action = "HOLD"
        reasons = []
        if opm < 0: reasons.append("negative OPM")
        if npm < 0: reasons.append("negative NPM")
        if trail_pe > 100: reasons.append(f"extreme PE {trail_pe:.0f}")
        if rev_gr < -20: reasons.append(f"revenue crashing {rev_gr:.0f}%")
        if val_verdict == "FAIL": reasons.append("valuation FAIL")
        if upside is not None and upside < -20: reasons.append(f"analysts see {upside:.0f}% downside")
        if roe < 3 and trail_pe > 50: reasons.append("near-zero ROE + high PE")
        if fcf < 0 and ocf < 0 and not any(x in sector.lower() for x in ["bank", "financial", "insurance"]):
            reasons.append("negative FCF+OCF")

        is_fin = any(x in sector.lower() for x in ["bank", "financial", "insurance"])
        if len(reasons) >= 2:
            action = "EXIT"
        elif len(reasons) == 1:
            action = "REVIEW"
        elif pnl_pct < -30 and roe > 12 and (de < 80 or is_fin):
            action = "AVERAGE DOWN"
        elif pnl_pct > 30 and rsi > 60:
            action = "BOOK PARTIAL"
        elif pnl_pct > 0 and roe > 10:
            action = "HOLD"

        r = {
            "sym": sym, "qty": h["qty"], "avg": h["avg"], "cmp": round(cmp, 2),
            "inv": h["inv"], "cur_val": round(cur_val, 0), "pnl": round(pnl_amt, 0),
            "pnl_pct": round(pnl_pct, 1), "sector": sector, "mcap": round(mcap, 0),
            "rev_gr": round(rev_gr, 1), "earn_gr": round(earn_gr, 1),
            "earn_qoq": round(earn_qoq, 1), "eps_gr": round(eps_gr, 1),
            "trail_pe": round(trail_pe, 1), "fwd_pe": round(fwd_pe, 1),
            "roe": round(roe, 1), "de": round(de, 1),
            "opm": round(opm, 1), "npm": round(npm, 1),
            "fcf": round(fcf, 0), "ocf": round(ocf, 0),
            "int_cov": round(int_cov, 1) if int_cov < 999 else None,
            "c2d": round(c2d, 2) if c2d < 999 else None,
            "insider": round(insider, 1), "inst": round(inst, 1),
            "rsi": round(rsi, 1), "from_high": round(fh, 1),
            "sma20": "above" if cmp > s20 else "below",
            "sma50": "above" if cmp > s50 else "below",
            "tgt": round(tgt, 0) if tgt else None,
            "upside": round(upside, 1) if upside else None,
            "n_analysts": n_analysts, "rec": rec,
            "ev_eb": round(ev_eb, 1) if ev_eb else None,
            "beta": round(beta, 2) if beta else None,
            "chg_2y": round(chg_2y, 1), "ab3y": round(ab3y, 1),
            "val": val_verdict, "red_flags": red_flags,
            "action": action, "reasons": "; ".join(reasons) if reasons else "",
        }
        results.append(r)
        print(f'{sym:14s} CMP:{cmp:>9.2f} P/L:{pnl_pct:>+7.1f}% | OPM:{opm:>5.1f}% NPM:{npm:>5.1f}% ROE:{roe:>5.1f}% D/E:{de:>6.1f} | PE:{trail_pe:>6.1f} RSI:{rsi:>5.1f} | Val:{val_verdict:>7s} | {action} {("-- " + "; ".join(reasons)) if reasons else ""}')
    except Exception as e:
        print(f"{sym}: ERROR - {e}")

out = os.path.join(os.path.dirname(__file__), "portfolio_data", "holdings_analysis.json")
with open(out, "w") as f:
    json.dump(results, f, indent=2)
print(f"\nSaved {len(results)} holdings to {out}")
