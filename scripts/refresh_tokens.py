#!/usr/bin/env python3
"""Refresh every coin on the dashboard via GMGN (read-only) and discover new hot coins.

  python scripts/refresh_tokens.py                # refresh + prune + discover, writes data.json
  python scripts/refresh_tokens.py --no-discover  # only refresh/prune existing coins
  python scripts/refresh_tokens.py --dry-run      # print, don't write
  python scripts/refresh_tokens.py --publish "msg"  # + render (update_heat.py render) + git push

Rules
  * snapshot per coin: price/mcap/ATH/liq/holders/1h/6h/24h/vol/top10/bundler/flags (GMGN token info+security)
  * PRUNE (deleted from board, logged in data.pruned): mcap < $10K, liquidity < $2K,
    honeypot, or > 90% below ATH with < $20K 24h volume. Coins with "keep": true are never pruned.
  * DISCOVER: GMGN trending (sol/bsc/base, 1h+6h) + per-topic `discover.search` queries.
    Fresh (<72h) coins matching a topic's keywords with mcap>=$50K, liq>=$10K, holders>=150
    are added to that topic (max 3 auto coins/topic). Top spiking coins (<24h old or 1h>=+100%)
    go to data.radar (the '24小时' view), first-seen time preserved, entries >24h old expire.
  * 24h topics (horizon=="24h") older than 36h are promoted to '大周期' if heat>=45 or a coin
    >= $1M is alive; otherwise retired (archived).
Never calls swap/order/cooking/buy commands; the GMGN key stays inside gmgn-cli.
"""
import json, math, re, subprocess, sys, time, pathlib
from datetime import datetime, timezone, timedelta
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import gmgn

D = pathlib.Path(__file__).resolve().parent.parent
DATA = D / "data.json"
SYD = timezone(timedelta(hours=11))
try:
    from zoneinfo import ZoneInfo; SYD = ZoneInfo("Australia/Sydney")
except Exception: pass
NOW = datetime.now(SYD)
CHAINS = {"SOL": "sol", "BSC": "bsc", "BASE": "base", "ETH": "eth", "Robinhood": "robinhood", "ROBINHOOD": "robinhood"}
DISC_CHAINS = ["sol", "bsc", "base"]
MAX_AUTO = 3

def clamp(x, a=0, b=100): return max(a, min(b, x))
def sc(x):  # % change -> 0..100 (0% = 50)
    if x is None: return 50
    return clamp(50 + 18 * math.log2(max(1 + x / 100, 1e-3)))
def coin_mom(s):
    return round(0.5 * sc(s.get("chg1h")) + 0.3 * sc(s.get("chg6h")) + 0.2 * sc(s.get("chg24h")), 1)
def money(v):
    if not v: return ""
    return f"${v/1e9:.2f}B" if v >= 1e9 else f"${v/1e6:.1f}M" if v >= 1e6 else f"${v/1e3:.0f}K"
def age_h(ts): return (time.time() - ts) / 3600 if ts else 1e9

def log(*a): print(*a, flush=True)

def refresh_coins(d, dry):
    pruned = d.setdefault("pruned", [])
    for t in d["topics"]:
        if t.get("status") == "retired": continue
        keep = []
        for c in t.get("coins", []):
            if not c.get("ca"):
                keep.append(c); continue
            try:
                s = gmgn.snapshot(c["chain"], c["ca"])
            except Exception as e:
                log(f"  ! {t['id']}/{c['sym']} snapshot failed: {str(e)[:120]} (kept old snapshot)")
                keep.append(c); continue
            s["at"] = NOW.isoformat(timespec="minutes")
            s["mom"] = coin_mom(s)
            reason = gmgn.prune_reason(s)
            if reason and not c.get("keep"):
                log(f"  ✂ prune {t['id']}/{c['sym']} {c['ca']}: {reason} (mcap {money(s['mcap'])})")
                pruned.append({"date": NOW.strftime("%m/%d %H:%M"), "topic": t["id"], "sym": c["sym"],
                               "chain": c["chain"], "ca": c["ca"], "reason": reason, "mcap": s["mcap"]})
                continue
            c["snap"] = s; c["status"] = gmgn.status_of(s) if not c.get("keep") else "alive"
            keep.append(c)
            log(f"  ✓ {t['id']}/{c['sym']:<9} {money(s['mcap']):>8} 1h {s['chg1h']}% 24h {s['chg24h']}% liq {money(s['liq'])}")
        # leader = explicit leader if still present, else biggest alive coin
        keep.sort(key=lambda c: (c.get("role") != "leader", 0))
        if keep and keep[0].get("role") != "leader":
            best = max(keep, key=lambda c: (c.get("snap") or {}).get("mcap") or 0)
            best["role"] = "leader"; keep.remove(best); keep.insert(0, best)
        t["coins"] = keep
        sync_leader(t)
    d["pruned"] = pruned[-200:]

def sync_leader(t):
    L = t["coins"][0] if t.get("coins") else None
    if L:
        t["leader"] = {"sym": L["sym"], "chain": L["chain"].upper(), "ca": L.get("ca", ""),
                       "mcap": money((L.get("snap") or {}).get("mcap")), "note": L.get("blurb", "")}
    else:
        t["leader"] = {"sym": "—", "chain": "—", "ca": "", "mcap": "", "note": "暂无链上龙头"}

def norm_trend(x, chain, interval):
    return {"ca": x.get("address"), "chain": chain, "sym": x.get("symbol") or "", "name": x.get("name") or "",
            "mcap": float(x.get("market_cap") or 0), "liq": float(x.get("liquidity") or 0),
            "holders": x.get("holder_count") or 0, "created": x.get("creation_timestamp") or x.get("open_timestamp") or 0,
            "chg": float(x.get("price_change_percent") or 0), "chg1h": float(x.get("price_change_percent1h") or 0),
            "interval": interval, "bad": bool(x.get("is_honeypot")) or bool(x.get("is_wash_trading")),
            "twitter": x.get("twitter_username") or "", "vol": float(x.get("volume") or 0)}

def norm_search(x):
    return {"ca": x.get("address"), "chain": x.get("chain"), "sym": x.get("symbol") or "", "name": x.get("name") or "",
            "mcap": float(x.get("mcp") or 0), "liq": float(x.get("liquidity") or 0), "holders": x.get("holder_count") or 0,
            "created": x.get("created_at") or 0, "chg": None, "chg1h": None, "interval": "search",
            "bad": bool(x.get("is_honeypot")), "vol": float(x.get("volume_1h") or 0),
            "twitter": (x.get("token_link") or {}).get("twitter_username") or ""}

def suspicious(c):
    """wash-trading tells: pool bigger than the mcap, or hourly volume > 20x mcap"""
    return c["liq"] > c["mcap"] * 0.9 or (c.get("vol") or 0) > 20 * max(c["mcap"], 1)

def matches(cand, kws):
    hay = (cand["sym"] + " " + cand["name"]).lower()
    return any(re.search(r"(?<![a-z])" + re.escape(k.lower()) + r"(?![a-z])", hay) if k.isascii() else k in hay for k in kws)

def discover(d, dry):
    seen = {c["ca"] for t in d["topics"] for c in t.get("coins", []) if c.get("ca")}
    dead = {p["ca"] for p in d.get("pruned", [])}
    pool = {}
    for ch in DISC_CHAINS:
        for iv in ("1h", "6h"):
            try:
                for x in gmgn.trending(ch, iv, 100):
                    n = norm_trend(x, ch, iv)
                    if n["ca"]: pool.setdefault(n["ca"], {}).update({k: v for k, v in n.items() if v not in (None, "")} | {"chg_" + iv: n["chg"]})
            except Exception as e:
                log(f"  ! trending {ch} {iv} failed: {str(e)[:100]}")
    added = 0
    # 24h topics first so the most specific (newest) narrative claims a coin
    for t in sorted(d["topics"], key=lambda t: t.get("horizon") != "24h"):
        if t.get("status") == "retired": continue
        disc = t.get("discover") or {}
        kws = disc.get("keywords") or []
        if not kws: continue
        cands = [c for c in pool.values() if matches(c, kws)]
        for q in disc.get("search", []):
            for ch in [CHAINS.get(x, x.lower()) for x in t.get("chains", []) if CHAINS.get(x)] or ["sol"]:
                if ch not in ("sol", "bsc", "base", "eth", "robinhood"): continue
                try: cands += [norm_search(x) for x in gmgn.search(q, ch) if matches(norm_search(x), kws)]
                except Exception as e: log(f"  ! search {q}/{ch}: {str(e)[:100]}")
        n_auto = sum(1 for c in t.get("coins", []) if c.get("auto"))
        for c in sorted(cands, key=lambda c: -c["mcap"]):
            if n_auto >= MAX_AUTO: break
            if c["ca"] in seen or c["ca"] in dead or c["bad"] or suspicious(c): continue
            if c["mcap"] < 50_000 or c["liq"] < 10_000 or c["holders"] < 150 or age_h(c["created"]) > 72: continue
            try: s = gmgn.snapshot(c["chain"], c["ca"])
            except Exception: continue
            if gmgn.prune_reason(s): continue
            s["at"] = NOW.isoformat(timespec="minutes"); s["mom"] = coin_mom(s)
            born = datetime.fromtimestamp(c["created"], SYD).strftime("%m/%d %H:%M") if c["created"] else "?"
            t.setdefault("coins", []).append({"sym": c["sym"], "name": c["name"], "chain": c["chain"], "ca": c["ca"],
                "role": "beta", "auto": True, "found": NOW.isoformat(timespec="minutes"), "status": gmgn.status_of(s), "snap": s,
                "blurb": f"🆕 GMGN 自动发现：{c['name']}（{born} 悉尼上线），名字命中「{t['name'].split(' ')[0]}」关键词；叙事待人工核实。"})
            seen.add(c["ca"]); n_auto += 1; added += 1
            log(f"  ＋ {t['id']}: {c['sym']} {c['ca']} {money(s['mcap'])}")
        sync_leader(t)
    # radar: spiking / newborn coins across chains (24h view)
    old = {r["ca"]: r for r in d.get("radar", [])}
    radar = []
    for c in pool.values():
        if c["bad"] or c["ca"] in dead or suspicious(c): continue
        fresh = age_h(c["created"]) <= 24
        spike = (c.get("chg_1h") or c.get("chg1h") or 0) >= 100
        if not (fresh or spike): continue
        if c["mcap"] < 100_000 or c["liq"] < 15_000 or c["holders"] < 300: continue
        topic = next((t["id"] for t in sorted(d["topics"], key=lambda t: t.get("horizon") != "24h") if t.get("status") != "retired"
                      and matches(c, (t.get("discover") or {}).get("keywords") or [])), None)
        r = old.get(c["ca"], {})
        mom = round(0.6 * sc(c.get("chg_1h", c.get("chg1h"))) + 0.4 * sc(c.get("chg_6h")), 1)
        radar.append({"ca": c["ca"], "chain": c["chain"], "sym": c["sym"], "name": c["name"], "mcap": round(c["mcap"]),
                      "liq": round(c["liq"]), "holders": c["holders"], "chg1h": c.get("chg_1h", c.get("chg1h")),
                      "chg6h": c.get("chg_6h"), "created": c["created"], "topic": topic, "mom": mom,
                      "twitter": c.get("twitter", ""), "first_seen": r.get("first_seen") or NOW.isoformat(timespec="minutes"),
                      "on_board": c["ca"] in seen})
    # keep still-qualifying entries; expire anything first seen > 24h ago
    cutoff = (NOW - timedelta(hours=24)).isoformat(timespec="minutes")
    radar = [r for r in radar if r["first_seen"] >= cutoff or r["mom"] >= 70]
    radar.sort(key=lambda r: -r["mom"])
    d["radar"] = radar[:20]
    log(f"  radar: {len(d['radar'])} coins · auto-added {added}")

def lifecycle(d):
    for t in d["topics"]:
        alive = [c for c in t.get("coins", []) if c.get("status") == "alive" and c.get("snap")]
        moms = sorted([c["snap"].get("mom", 50) for c in alive], reverse=True)
        hist = t.get("history") or {}
        grid = hist[max(hist)]["grid"] if hist and "grid" in hist[max(hist)] else t.get("heat", 0)
        t["momentum"] = round(0.6 * (moms[0] if moms else 40) + 0.4 * grid)
        if t.get("horizon") == "24h" and t.get("status") == "active" and t.get("born"):
            age = (NOW - datetime.fromisoformat(t["born"])).total_seconds() / 3600
            if age > 36:
                big = any((c["snap"].get("mcap") or 0) >= 1_000_000 for c in alive)
                if t.get("heat", 0) >= 45 or big:
                    t["horizon"] = "cycle"; ev = ("升入大周期", f"{t['name']} 24h 后仍有热度/龙头≥$1M，转入大周期跟踪", "watch")
                else:
                    t["status"] = "retired"; ev = ("24h 话题过期", f"{t['name']} 未能延续，归档", "info")
                d.setdefault("history", []).append({"time": NOW.strftime("%m/%d %H:%M"), "title": ev[0] + "：" + t["name"], "verdict": ev[1], "signal": ev[2]})

def main(a):
    dry = "--dry-run" in a
    d = json.loads(DATA.read_text())
    log(f"[refresh_tokens] {NOW:%m/%d %H:%M} 悉尼")
    refresh_coins(d, dry)
    if "--no-discover" not in a: discover(d, dry)
    lifecycle(d)
    d["version"] = 3
    # scan log for the desk meters (radar scans today); keep 48h
    cut = (NOW - timedelta(hours=48)).isoformat(timespec="minutes")
    d["meta"]["scan_log"] = [x for x in d["meta"].get("scan_log", []) if x >= cut] + [NOW.isoformat(timespec="minutes")]
    d["meta"]["prices_updated"] = NOW.isoformat(timespec="minutes")
    d["meta"]["prices_label"] = NOW.strftime("%m/%d %H:%M") + " 悉尼"
    if dry: log("dry-run: not written"); return
    DATA.write_text(json.dumps(d, ensure_ascii=False, indent=1))
    log("data.json written")
    if "--publish" in a or "--render" in a:
        py = sys.executable
        msg = a[a.index("--publish") + 1] if "--publish" in a and len(a) > a.index("--publish") + 1 else f"tokens {NOW:%m/%d %H:%M}"
        subprocess.run([py, str(D / "update_heat.py"), "all" if "--publish" in a else "render", msg], cwd=D, check=False)

if __name__ == "__main__":
    main(sys.argv[1:])
