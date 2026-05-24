"""Check live market sentiments for buy/no-buy decision."""
import sys
from datetime import datetime

try:
    import yfinance as yf
except ImportError:
    print("ERROR: yfinance is not installed. Cannot fetch live market data.")
    print("       Install with: pip install yfinance")
    sys.exit(2)

print(f"Time: {datetime.now().strftime('%I:%M %p IST')}")
print("=" * 70)

# 1. Nifty 50
print("\n=== INDIAN MARKET ===")
n = yf.Ticker("^NSEI")
nh = n.history(period="1d", interval="5m")
nifty_cmp = 0
if len(nh) > 0:
    nifty_cmp = float(nh["Close"].iloc[-1])
    opn = float(nh["Open"].iloc[0])
    hi = float(nh["High"].max())
    lo = float(nh["Low"].min())
    chg = ((nifty_cmp - opn) / opn) * 100
    last6 = nh["Close"].iloc[-6:]
    trend = "UP" if float(last6.iloc[-1]) > float(last6.iloc[0]) else "DOWN"
    print(f"NIFTY 50: {nifty_cmp:,.0f} | Open: {opn:,.0f} | Day: {chg:+.2f}%")
    print(f"  Range: {lo:,.0f} - {hi:,.0f} | Last 30min: {trend}")

# VIX
try:
    vix = yf.Ticker("^INDIAVIX")
    vh = vix.history(period="5d")
    if len(vh) >= 2:
        vt = float(vh["Close"].iloc[-1])
        vy = float(vh["Close"].iloc[-2])
        vc = ((vt - vy) / vy) * 100
        lvl = "FEAR HIGH" if vt > 20 else "FEAR MODERATE" if vt > 15 else "CALM"
        print(f"India VIX: {vt:.2f} ({vc:+.1f}% vs yesterday) -> {lvl}")
except Exception as e:
    print(f"VIX: error {e}")

# Weekly/monthly
nw = n.history(period="1mo")
if len(nw) >= 5:
    wk = ((float(nw["Close"].iloc[-1]) - float(nw["Close"].iloc[-5])) / float(nw["Close"].iloc[-5])) * 100
    mo = ((float(nw["Close"].iloc[-1]) - float(nw["Close"].iloc[0])) / float(nw["Close"].iloc[0])) * 100
    print(f"Nifty 1-Week: {wk:+.2f}% | 1-Month: {mo:+.2f}%")

# 2. Our picks
print("\n=== OUR 3 PICKS ===")
for sym in ["BLS", "ECLERX", "ENGINERSIN"]:
    try:
        t = yf.Ticker(f"{sym}.NS")
        th = t.history(period="1d", interval="5m")
        if len(th) > 0:
            c = float(th["Close"].iloc[-1])
            o = float(th["Open"].iloc[0])
            h = float(th["High"].max())
            l = float(th["Low"].min())
            d = ((c - o) / o) * 100
            last6 = th["Close"].iloc[-6:]
            tr = "UP" if float(last6.iloc[-1]) > float(last6.iloc[0]) else "DOWN"
            vr = th["Volume"].iloc[-6:].sum() / max(th["Volume"].iloc[:6].sum(), 1)
            print(f"{sym:14s} CMP: {c:>9,.2f} | Day: {d:+.2f}% | H/L: {h:,.0f}/{l:,.0f} | 30m: {tr} | Vol: {vr:.1f}x")
    except Exception as e:
        print(f"{sym}: {e}")

# 3. Global cues
print("\n=== GLOBAL CUES ===")
globals_list = [
    ("^GSPC", "S&P 500"),
    ("^DJI", "Dow Jones"),
    ("^IXIC", "NASDAQ"),
    ("GC=F", "Gold"),
    ("CL=F", "Crude Oil"),
    ("USDINR=X", "USD/INR"),
]
for sym, name in globals_list:
    try:
        t = yf.Ticker(sym)
        th = t.history(period="5d")
        if len(th) >= 2:
            c = float(th["Close"].iloc[-1])
            p = float(th["Close"].iloc[-2])
            chg = ((c - p) / p) * 100
            print(f"{name:14s}: {c:>12,.2f} ({chg:+.2f}%)")
    except Exception as e:
        print(f"{name}: {e}")

# 4. Nifty 50 breadth (20 stock sample)
print("\n=== MARKET BREADTH (Nifty top 20 sample) ===")
sample = [
    "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK",
    "SBIN", "BHARTIARTL", "ITC", "LT", "BAJFINANCE",
    "HCLTECH", "SUNPHARMA", "TITAN", "TATAMOTORS", "NTPC",
    "WIPRO", "AXISBANK", "MARUTI", "POWERGRID", "NESTLEIND",
]
green = 0
red = 0
for s in sample:
    try:
        t = yf.Ticker(f"{s}.NS")
        th = t.history(period="2d")
        if len(th) >= 2:
            today = float(th["Close"].iloc[-1])
            yest = float(th["Close"].iloc[-2])
            if today > yest:
                green += 1
            else:
                red += 1
    except:
        pass

breadth = "BROAD RALLY" if green > 14 else "MIXED" if green > 8 else "BROAD SELLING"
print(f"Green: {green} | Red: {red} -> {breadth}")

# 5. Sectoral check
print("\n=== SECTOR SNAPSHOT ===")
sectors = [
    ("^NSEBANK", "Bank Nifty"),
    ("^CNXIT", "Nifty IT"),
    ("^CNXPHARMA", "Nifty Pharma"),
    ("^CNXMETAL", "Nifty Metal"),
    ("^CNXREALTY", "Nifty Realty"),
]
for sym, name in sectors:
    try:
        t = yf.Ticker(sym)
        th = t.history(period="5d")
        if len(th) >= 2:
            c = float(th["Close"].iloc[-1])
            p = float(th["Close"].iloc[-2])
            chg = ((c - p) / p) * 100
            print(f"{name:14s}: {c:>10,.0f} ({chg:+.2f}%)")
    except:
        pass

# 6. FINAL VERDICT
print("\n" + "=" * 70)
print("VERDICT:")
nifty_green = chg > 0 if len(nh) > 0 else False
vix_ok = vt < 22 if "vt" in dir() else True
breadth_ok = green > 10
hour = datetime.now().hour
minute = datetime.now().minute
time_ok = (hour == 14 and minute >= 30) or (hour == 15)

signals = []
if nifty_green:
    signals.append("Nifty GREEN")
else:
    signals.append("Nifty RED")
if vix_ok:
    signals.append("VIX manageable")
else:
    signals.append("VIX too high")
if breadth_ok:
    signals.append("broad participation")
else:
    signals.append("narrow rally/selling")
if time_ok:
    signals.append("good entry window (2:30-3 PM)")
else:
    signals.append(f"wait for 2:30 PM (now {hour}:{minute:02d})")

go_count = sum([nifty_green, vix_ok, breadth_ok, time_ok])
if go_count >= 3:
    print(f"  GO -> Deploy Tranche 1 ({go_count}/4 signals positive)")
elif go_count >= 2:
    print(f"  CONDITIONAL GO -> Deploy smaller tranche ({go_count}/4 signals positive)")
else:
    print(f"  WAIT -> Too many negative signals ({go_count}/4 positive)")

for s in signals:
    print(f"  - {s}")
print("=" * 70)
