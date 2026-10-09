# Alpha 雷达 v3 · 更新与发布手册

- 线上地址：https://kiddyakid.github.io/alpha-dashboard/ （GitHub Pages，`KiddyaKid/alpha-dashboard` 的 main 分支根目录；push 后约 1 分钟生效）
- 目录：`/workspace/alpha-dashboard/`
- Python：`PY=/workspace/.venv-xl/bin/python`（自带 openpyxl；丢失时：`python3 -m venv /workspace/.venv-xl && /workspace/.venv-xl/bin/pip install -q openpyxl`）

| 文件 | 作用 |
|---|---|
| `data.json` | 唯一数据源（话题、每日热度历史、马斯克分析、推送历史、帖子） |
| `update_heat.py` | 写入热度 → 计算排名 → 渲染 `index.html` + `posts.xlsx` → git push |
| `template.html` | 页面模板（一般不用改） |
| `index.html` / `posts.xlsx` | 生成产物（不要手改） |

## 热度模型（update_heat.py 自动算）
- 数据：每个话题的 `query` 用 x 工具 `get_posts_counts_recent`（granularity=day，近 7 天）取每日帖数。按 **UTC 日** 记录（悉尼 11:00 换日）。
- 未结束的当天：按 X 全站小时曲线外推成全天（`partial_hours`），再按已过时长与昨天加权混合，避免清晨噪声。页面上用虚线格 / 斜纹柱表示“估算”。
- 每日格子分 `grid` = 0.625×讨论量分 + 0.375×动量分（讨论量：100 帖/天=0，10 万帖/天=100，取对数；动量：对比前 3 天的均值）。
- 当前热度 `heat` = 0.8×今日 grid + 0.2×头部帖浏览分（`top_views`：1 千=0，约 3000 万=100）。
- 趋势：近 2 天均值 vs 前 3 天均值，≥+15% 为 ▲升温，≤−13% 为 ▼降温（降温行会变灰、变淡并下沉）。

## 每小时例行（复制即用）
```bash
cd /workspace/alpha-dashboard; PY=/workspace/.venv-xl/bin/python
python3 -c "import json;[print(t['id'],'|',t['query']) for t in json.load(open('data.json'))['topics'] if t['status']=='active']"
```
1. 对每个话题调用 x `get_posts_counts_recent`：`{"query": <topic.query>, "granularity": "day", "start_time": <7 天前的 UTC 00:00，如 2026-10-03T00:00:00Z>}`，把**原始 JSON 响应**存成 `/tmp/c_<id>.json`。
2. 写入（可附带本轮找到的最高浏览帖）：
   ```bash
   $PY update_heat.py ingest quantum /tmp/c_quantum.json --views 764377 --post https://x.com/camolNFT/status/2107861120341942548
   ```
   （没有原始 JSON 时也可手填：`$PY update_heat.py set quantum 2026-10-10 5321 --partial-hours 7.5 --views 900000`）
3. **刷新币价 + 自动删死盘 + 发现新币（v3，必跑）**：
   ```bash
   $PY scripts/refresh_tokens.py
   ```
   （约 1.5–2 分钟，只调用 GMGN 只读命令；`--no-discover` 只刷新不发现；`--dry-run` 只打印）
3b. 有判断变化就直接改 `data.json` 里该话题的 `verdict / signal / coins[].blurb / memes / attention / firsts / ignition / play / risk / sources`（只放真实帖子 URL）。马斯克分析改 `musk`，新帖子追加到 `posts`。
4. 记一条推送历史（可选）：`$PY update_heat.py event "量子盘出现龙头" "QI 站稳 1M" up`
5. 渲染 + 发布：
   ```bash
   $PY update_heat.py all "hourly 10/10 09:42"
   ```
6. 验证：`sleep 60; curl -s -o /dev/null -w "%{http_code}\n" https://kiddyakid.github.io/alpha-dashboard/ && curl -s https://kiddyakid.github.io/alpha-dashboard/data.json | python3 -c "import json,sys;print(json.load(sys.stdin)['meta']['updated_label'])"`

## 新增 / 退役话题
新增：写一个 JSON 文件（字段同现有话题），然后 ingest 计数：
```json
{"id":"newtopic","name":"话题名","emoji":"🔥","chains":["SOL"],
 "query":"($TICKER OR \"关键词\") -is:retweet",
 "verdict":"一句话结论","signal":"watch",
 "leader":{"sym":"TICKER","chain":"SOL","note":"说明","ca":"","mcap":"~$1M"},
 "betas":[{"sym":"B1","chain":"SOL","note":"说明","ca":"","mcap":""}],
 "attention":{"big_names":5,"politics":2,"news":4,"novelty":8,"notes":["大人物说明","政治/慈善说明","新闻说明","🆕说明"]},
 "firsts":["🆕 第一次……"],"ignition":"点火变量","play":["先等…","然后…"],"risk":"风险",
 "top_views":0,"top_post":"","sources":[{"label":"来源","url":"https://x.com/..."}]}
```
```bash
$PY update_heat.py add-topic /tmp/newtopic.json && $PY update_heat.py ingest newtopic /tmp/c_newtopic.json
```
退役（保留历史，移出排名）：`$PY update_heat.py retire laptop`；恢复：`$PY update_heat.py revive laptop`

## 注意
- 计数查询务必带括号：`(A OR B) -is:retweet`，否则 `-is:retweet` 只作用于最后一项。
- `$SI` 这类短 cashtag 单独用会匹配海量无关帖（实测每小时 10 万），要配合 “super inu” 等限定词。
- 只引用真实帖子/新闻 URL；mcap 写明时间和出处。


## v3：代币刷新 / 24 小时视图（scripts/refresh_tokens.py）
**一键命令（每小时例行里跑，或单独跑）：**
```bash
cd /workspace/alpha-dashboard && /workspace/.venv-xl/bin/python scripts/refresh_tokens.py --publish "tokens $(date +%m/%d\ %H:%M)"
```
（`--publish` = 刷新后自动 `update_heat.py all`：渲染 index.html/posts.xlsx + git pull --rebase + push）

- GMGN：`scripts/gmgn.py` 包装 `npx gmgn-cli`（从 /workspace 运行，key 由 CLI 自己读 `~/.config/gmgn/.env`，脚本不读不打印）。**白名单只允许** token info/security/pool/holders/traders、market trending/search/kline/hot-searches/trenches/signal；swap / order / cooking / buy 一律禁止。限速 ≥0.35s/次。
- 每个币字段：`{sym,name,chain(sol|bsc|base|eth|robinhood),ca,role(leader|beta),blurb(中文 1–2 句),status,snap{mcap,ath_mcap,liq,holders,chg1h,chg6h,chg24h,vol24h,top10,bundler,flags,created,at,mom},auto?,keep?}`；`topics[].coins[0]` 是龙头，`leader` 由脚本同步。无币的梗写进 `topics[].memes`。
- **自动删除**（记入 `data.pruned`，页面「🪙 币」底部可见）：市值 < $10K、流动性 < $2K、蜜罐、或较 ATH 跌 >90% 且 24h 量 < $20K。想强留某币：给它加 `"keep": true`。
- **自动发现**：GMGN 热榜（sol/bsc/base × 1h/6h）+ 每个话题 `discover.search` 搜索；名字命中 `discover.keywords`、<72h、市值≥$50K、池子≥$10K、持有人≥150、非刷量（池子>市值或 1h 量>20×市值视为刷量）→ 自动加入该话题（每话题最多 3 个，标「自动发现」，blurb 需人工改写）。24h 话题优先认领。
- **新币雷达**（`data.radar`，⚡24小时 首页）：<24h 诞生或 1h ≥ +100%、市值≥$100K、池子≥$15K、持有人≥300；保留首次发现时间，24h 后过期；按发现时间（新→旧）再按动量排。
- **话题周期**：`horizon:"24h"`（需 `born`）显示在 ⚡24小时，按动量（币价 1h/6h/24h + X 发帖速度）排序；36 小时后若热度≥45 或有 ≥$1M 存活币 → 自动转 `cycle`（🌊大周期，7 日热度格），否则自动归档（retired）。新 24h 话题：add-topic JSON 里加 `"horizon":"24h","born":"2026-10-10T09:00+11:00","coins":[...],"discover":{"keywords":[...],"search":[...]}`。
- 页面实时行情：浏览器每 60 秒从 `https://api.dexscreener.com/latest/dex/tokens/<CA,CA,...>`（无 key）取市值/1h/24h/流动性，顶部显示「实时 HH:MM:SS 悉尼」；失败时显示 GMGN 快照及快照时间。
- 删掉的过时概念记在 `data.removed_concepts`（如 PNUT/Peanut）。不要再加回去。
