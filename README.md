# 日刊

静态日刊。无后端、无登录、无追踪。可直接放到 Vercel 或 GitHub Pages。

第一期日期：**2026-08-21**。

## 打开方式

站点用 `fetch` 读取相对路径下的 JSON，不能靠双击 HTML。

```bash
python3 -m http.server 8080
```

- 首页：http://127.0.0.1:8080/
- 2026-08-21 日页（报纸皮，保持原样）：http://127.0.0.1:8080/day.html?date=2026-08-21

线上 `cleanUrls` 后也可用 `/day?date=2026-08-21`。

## 视觉分工

- **首页**永远是 klein-poster：`css/home.css`。克莱因蓝全幅海报 + 奶油列表 + 横向往期日期。不使用旧报纸样式。
- **2026-08-22 之前的日页**用旧报纸皮：`css/style.css`。缺主题或未知主题也回退报纸，不走 klein-halftone。不要给 2026-08-21 加会切换皮肤的 `theme`。
- **2026-08-22 起**按 `JSON.theme` 加载 `css/day-base.css` + `css/themes/{theme}.css`，并设置 `data-theme`。
- **回退**：`2026-08-29` 强制 `klein-etch`（即使 JSON 仍写 klein-halftone）；`>= 2026-08-30` 且主题空/未知 → `ordered-dither`；`2026-08-22`–`2026-08-28` 未知主题 → `klein-halftone`；`<= 2026-08-21` → 旧报纸。首页永远 `klein-poster`。

日页主题：`klein-halftone`、`klein-etch`、`polaroid`、`stamp`、`isometric-mini`、`agamemnon`、`origami`、`collector-card`、`ordered-dither`、`northflow`、`gathered-zine`、`cote-grid`、`impasto-card`、`paper-prism`、`ascii-plot`。不要给没有稿件的日期编造新闻。

## 目录结构

```
├── index.html
├── day.html
├── css/home.css
├── css/day-base.css
├── css/style.css              ← 仅 2026-08-22 之前的日页
├── css/themes/*.css
├── js/site.js
├── js/stipple.js              ← 首页砂粒 + klein-halftone 网点（代码绘制）
└── data/
    ├── editions.json
    └── 2026-08-21.json
```

## 如何加一天

1. 新建 `data/YYYY-MM-DD.json`，写上真实稿件与 `"theme"`（如 `klein-halftone`）。`items` 最多 30 条。
2. 在 `data/editions.json` 追加 `{ "date", "summary", "itemCount" }`。正式稿去掉 `"stub": true`。
3. 不要把预览 stub 写成正式新闻。`2026-08-22`–`2026-08-28` 目前是皮肤预览，复用 08.21 条目。

## JSON

每日 `data/YYYY-MM-DD.json`：

```
date, timezone, title, summary_zh, theme, sources[], item_count, items[] | parts[]
```

`parts` 仍会按文件顺序拉取并拼接 `items`。不要缩短 `summary_zh`，不要清空 `quotes`。

每条：

```
rank, title_zh, title_en, source ("News Minimalist"|"Hacker News"),
source_site, article_url, hn_url, summary_zh, quotes[{ type, author, en, zh }]
```
