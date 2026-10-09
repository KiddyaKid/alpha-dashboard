"""Thin read-only wrapper around `npx gmgn-cli` (key is loaded by the CLI itself
from ~/.config/gmgn/.env; this module never reads or prints it).
Only read/query subcommands are whitelisted."""
import json, subprocess, time, os

ALLOWED = {("token", "info"), ("token", "security"), ("token", "pool"),
           ("token", "holders"), ("token", "traders"), ("market", "trending"),
           ("market", "search"), ("market", "kline"), ("market", "hot-searches"),
           ("market", "trenches"), ("market", "signal")}
CWD = os.environ.get("GMGN_CWD", "/workspace")
_last = [0.0]
MIN_GAP = 0.35  # well under the 10 req/s bucket

CHAIN_MAP = {"SOL": "sol", "BSC": "bsc", "BASE": "base", "ETH": "eth",
             "ROBINHOOD": "robinhood", "Robinhood": "robinhood"}

def call(group, cmd, *args, retries=3):
    if (group, cmd) not in ALLOWED:
        raise ValueError(f"gmgn command not allowed (read-only): {group} {cmd}")
    for i in range(retries):
        gap = time.time() - _last[0]
        if gap < MIN_GAP:
            time.sleep(MIN_GAP - gap)
        _last[0] = time.time()
        p = subprocess.run(["npx", "--yes", "gmgn-cli", group, cmd, *args, "--raw"],
                           cwd=CWD, capture_output=True, text=True, timeout=90)
        out = p.stdout.strip()
        if p.returncode == 0 and out:
            try:
                return json.loads(out)
            except json.JSONDecodeError:
                pass
        err = (p.stderr or out)[-300:]
        if "429" in err or "rate" in err.lower():
            time.sleep(3 * (i + 1)); continue
        if i == retries - 1:
            raise RuntimeError(f"gmgn {group} {cmd} failed: {err}")
        time.sleep(1.5)
    raise RuntimeError(f"gmgn {group} {cmd} failed after retries")

def info(chain, ca):     return call("token", "info", "--chain", chain, "--address", ca)
def security(chain, ca): return call("token", "security", "--chain", chain, "--address", ca)
def search(q, chain=None):
    a = ["--query", q] + (["--chain", chain] if chain else [])
    return (call("market", "search", *a) or {}).get("coins", [])
def trending(chain, interval="1h", limit=100):
    d = call("market", "trending", "--chain", chain, "--interval", interval, "--limit", str(limit))
    d = d.get("data", d) if isinstance(d, dict) else d
    return d.get("rank", []) if isinstance(d, dict) else d

def _f(x):
    try: return float(x)
    except (TypeError, ValueError): return 0.0

def snapshot(chain, ca):
    """Normalized metrics from token info (+security)."""
    d = info(chain, ca)
    p = d.get("price") or {}
    pr = _f(p.get("price"))
    sup = _f(d.get("circulating_supply")) or _f(d.get("total_supply"))
    def chg(k):
        old = _f(p.get(k))
        return round((pr / old - 1) * 100, 1) if old else None
    st = d.get("stat") or {}
    ath = _f(d.get("ath_price"))
    if ath and pr and ath / pr > 1000: ath = 0   # bogus ATH prints (e.g. 1-tick spikes)
    snap = {
        "symbol": d.get("symbol"), "name": d.get("name"),
        "price": pr, "mcap": round(pr * sup), "ath_mcap": round(ath * sup) if ath else None,
        "liq": round(_f(d.get("liquidity"))), "holders": d.get("holder_count"),
        "chg1h": chg("price_1h"), "chg6h": chg("price_6h"), "chg24h": chg("price_24h"),
        "vol1h": round(_f(p.get("volume_1h"))), "vol24h": round(_f(p.get("volume_24h"))),
        "top10": round(_f(st.get("top_10_holder_rate")) * 100, 1),
        "bundler": round(_f(st.get("top_bundler_trader_percentage")) * 100, 1),
        "bot": round(_f(st.get("bot_degen_rate")) * 100, 1),
        "created": d.get("creation_timestamp") or d.get("open_timestamp"),
        "twitter": (d.get("link") or {}).get("twitter_username") or "",
        "website": (d.get("link") or {}).get("website") or "",
    }
    try:
        s = security(chain, ca)
        flags = []
        if s.get("is_honeypot") is True or _f(s.get("honeypot")) == 1: flags.append("honeypot")
        if _f(s.get("sell_tax")) > 0.05 or _f(s.get("buy_tax")) > 0.05: flags.append("高税")
        if chain == "sol":
            if s.get("renounced_mint") is False: flags.append("mint未弃")
            if s.get("renounced_freeze_account") is False: flags.append("freeze未弃")
        if s.get("is_blacklist") is True or _f(s.get("blacklist")) == 1: flags.append("黑名单")
        if chain != "sol" and s.get("is_open_source") is False: flags.append("未开源")
        snap["flags"] = flags
        if s.get("top_10_holder_rate") is not None:
            snap["top10"] = round(_f(s.get("top_10_holder_rate")) * 100, 1)
    except Exception as e:
        snap["flags"] = ["security查询失败"]
    return snap

PRUNE_MCAP = 10_000

def prune_reason(s):
    """Why a coin should be deleted from the board (None = keep)."""
    mc, liq, ath = s.get("mcap") or 0, s.get("liq") or 0, s.get("ath_mcap") or 0
    if "honeypot" in s.get("flags", []): return "貔貅/蜜罐"
    if mc < PRUNE_MCAP: return f"市值<${PRUNE_MCAP//1000}K"
    if liq < 2_000: return "池子枯竭"
    if ath and mc < ath * 0.10 and (s.get("vol24h") or 0) < 20_000: return "较ATH跌>90%且无量"
    return None

def status_of(s):
    """alive / dead / rugged."""
    r = prune_reason(s)
    if r is None: return "alive"
    return "rugged" if r == "貔貅/蜜罐" or ((s.get("ath_mcap") or 0) > 200_000 and (s.get("liq") or 0) < 5_000) else "dead"
