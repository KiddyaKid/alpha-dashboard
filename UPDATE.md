# Alpha 雷达 · 更新与发布说明

目录：`/workspace/alpha-dashboard/`

| 文件 | 作用 |
|---|---|
| `data.json` | **唯一数据源**。每轮更新只改这里 |
| `template.html` | 页面模板（样式/逻辑），一般不用动 |
| `render.py` | 把 data.json 嵌入 → `index.html`，并生成 `posts.xlsx` |
| `index.html` | 生成产物，手机打开的就是它（离线也能看：数据已内嵌；在线时优先读同目录 data.json） |
| `posts.xlsx` | 生成产物，全部帖子+来源（时间/作者/内容/链接/主题/热度/浏览量） |
| `build_posts.py` | 首轮用的帖子清单脚本（示例，可参考其字段格式） |

## 1. 每轮更新数据（编辑 data.json）

- `meta.updated`（ISO，+11:00）和 `meta.updated_label`（如 `10/09 19:49 悉尼`）→ 必改
- `headline.text` / `headline.level`（`watch` 黄 / `risk` 红）→ 顶部一句话弹窗
- 热点：在 `radar` 数组**前面插入**新卡片（字段同现有卡片：title, tag[new|hot|pol|link], verdict, signal[up|risk|watch|info], story, heat[{k,v0-10}], attention[{k,v,note}], ignition, play[], risk, sources[{label,url}]）
- 马斯克：替换 `musk.summary`（3 行）、`musk.topics`（每个 topic 的 `posts` 填帖子 id）、`musk.quantum_check`、`meta.musk_window`
- 龙头：替换 `leaders.coins` / `leaders.status` / `leaders.beta_plan`
- 历史：`history` 末尾 **append** `{time,title,verdict,signal}`（页面倒序显示）
- 帖子：`posts` 追加 `{id,time(MM/DD HH:MM 悉尼),author("@x"),text,link,topic,views,heat(1-10)}`；只放真实帖子和真实 URL

可用 Python 就地修改，例如：
```bash
cd /workspace/alpha-dashboard
python3 - <<'PY'
import json; d=json.load(open("data.json"))
d["meta"]["updated"]="2026-10-09T19:49:00+11:00"; d["meta"]["updated_label"]="10/09 19:49 悉尼"
d["history"].append({"time":"10/09 19:49","title":"马斯克第 2 轮","verdict":"…","signal":"info"})
json.dump(d,open("data.json","w"),ensure_ascii=False,indent=1)
PY
```

## 2. 重新生成页面和 Excel

```bash
cd /workspace/alpha-dashboard
# 首次（或 venv 丢失时）:
[ -x /workspace/.venv-xl/bin/python ] || (python3 -m venv /workspace/.venv-xl && /workspace/.venv-xl/bin/pip install -q openpyxl)
/workspace/.venv-xl/bin/python render.py
```
可选自检（手机宽度截图）：
```bash
google-chrome --headless=new --no-sandbox --hide-scrollbars --window-size=390,2400 --screenshot=/tmp/check.png file:///workspace/alpha-dashboard/index.html
```

## 3. 发布（覆盖同一个公开地址）

截至 2026-10-09 16:55 悉尼：box 上 `gh` 未登录，没有 `vercel` / `netlify` / `surge` CLI，也没有相关 token，所以**目前没有公开 URL**。用户登录任一平台后，按下面固定命令覆盖发布：

**GitHub Pages（推荐，`gh auth login` 之后）**
```bash
cd /workspace/alpha-dashboard
REPO=alpha-dashboard
if [ ! -d .git ]; then
  git init -b main && git add index.html data.json posts.xlsx && git commit -m "init"
  gh repo create "$REPO" --public --source=. --push
  gh api -X POST "repos/{owner}/$REPO/pages" -f "source[branch]=main" -f "source[path]=/"
fi
git add index.html data.json posts.xlsx && git commit -m "update $(date '+%m/%d %H:%M')" && git push
# URL: https://<github用户名>.github.io/alpha-dashboard/
```

**Surge（`npx surge login` 之后）**：`npx surge /workspace/alpha-dashboard muheng-alpha.surge.sh`

**Netlify（已登录且 link 过站点）**：`npx netlify deploy --prod --dir /workspace/alpha-dashboard`

**Vercel（已登录）**：`npx vercel deploy /workspace/alpha-dashboard --prod --yes`

未发布时：把 `index.html` 作为附件发给用户（数据已内嵌，手机直接打开即可；导出 Excel 需要联网加载 SheetJS，离线时自动降级为 CSV）。
