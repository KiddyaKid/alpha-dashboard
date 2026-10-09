// Generate mdxcn figures (official Knap filters → fenced ASCII) from data.json, in place.
// Called by update_heat.py render. Usage: node scripts/figures.mjs [path/to/data.json]
import { readFileSync, writeFileSync } from "node:fs"
import { graphFilters as g } from "./mdxcn/graph-knap.mjs"

const path = process.argv[2] || new URL("../data.json", import.meta.url).pathname
const d = JSON.parse(readFileSync(path, "utf8"))
const fig = (name, title, props) => g[name]("", JSON.stringify(title), { rawValue: props })
const ascii = s => /^[\x20-\x7e]+$/.test(s)
const label = s => String(s).replace(/_/g, " ").toLowerCase()
const n = v => (v == null || isNaN(v) ? "-" : Math.round(v).toLocaleString("en-US"))
const money = v => (v == null || isNaN(v) ? "-" : v >= 1e9 ? `$${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `$${Math.round(v / 1e3)}K` : `$${Math.round(v)}`)
const pct = v => (v == null || isNaN(v) ? "-" : `${v > 0 ? "+" : ""}${Math.abs(v) >= 100 ? Math.round(v) : v.toFixed(1)}%`)
// frame width is measured in code units, so CJK labels would break alignment → ascii names only
const coinLabel = (c, dup) => {
  let s = ascii(c.sym) ? c.sym : c.ascii || c.ca.slice(0, 6)
  if (dup) s += " " + c.ca.slice(0, 4)
  return s.slice(0, 12)
}
const days = t => Object.keys(t.history || {}).sort().slice(-7)

for (const t of d.topics) {
  const f = {}
  const ds = days(t)
  if (ds.length) {
    const ests = ds.map(x => t.history[x].est ?? t.history[x].count)
    f.trend = fig("graph_kpi", "HEAT 7D", {
      value: n(ests.at(-1)), label: t.history[ds.at(-1)].partial_hours ? "posts today (est)" : "posts per day",
      hint: pct(t.delta), data: ests,
    })
  }
  const a = t.attention
  if (a) {
    const items = [["big names", a.big_names], ["politics", a.politics], ["news", a.news], ["novelty", a.novelty]]
    const mx = Math.max(...items.map(i => i[1] || 0))
    f.attention = fig("graph_score", "ATTENTION", {
      items: items.map(([l, v]) => ({ label: l, value: v || 0, max: 10, ...(v === mx ? { accent: true } : {}) })),
    })
  }
  const coins = (t.coins || []).filter(c => c.snap)
  if (coins.length) {
    const cnt = {}; coins.forEach(c => (cnt[c.sym] = (cnt[c.sym] || 0) + 1))
    f.coins = fig("graph_table", "LEAD VS BETA", {
      headers: ["coin", "mcap", "1h", "24h", "liq"], align: ["left", "right", "right", "right", "right"],
      rows: coins.slice(0, 8).map((c, i) => [(i ? "" : "*") + coinLabel(c, cnt[c.sym] > 1), money(c.snap.mcap), pct(c.snap.chg1h), pct(c.snap.chg24h), money(c.snap.liq)]),
    })
  }
  t.figures = f
}
const act = d.topics.filter(t => t.status === "active")
const cyc = act.filter(t => t.horizon !== "24h").sort((a, b) => b.heat - a.heat)
const t24 = act.filter(t => t.horizon === "24h").sort((a, b) => (b.momentum || 0) - (a.momentum || 0))
d.figures = {
  cycle_rank: cyc.length ? fig("graph_rank", "HEAT", { items: cyc.slice(0, 10).map(t => ({ label: label(t.id).slice(0, 14), value: t.heat })) }) : "",
  momentum_rank: fig("graph_rank", "MOMENTUM", {
    items: [...t24.map(t => ({ label: label(t.id).slice(0, 14), value: t.momentum ?? t.heat })),
            ...(d.radar || []).slice(0, 8 - t24.length).map(r => ({ label: "$" + (ascii(r.sym) ? r.sym : r.ca.slice(0, 6)).toLowerCase().slice(0, 13), value: Math.round(r.mom) }))]
      .sort((a, b) => b.value - a.value),
  }),
  generated: new Date().toISOString(),
  source: "mdxcn Knap filters (https://mdxcn.dev/llms.txt ## Knap)",
}
writeFileSync(path, JSON.stringify(d, null, 1))
console.log(`figures: ${d.topics.length} topics + overview`)
