# 日刊

印刷向静态日刊。奶油纸、近黑油墨、克莱因蓝。无后端、无登录、无追踪。可直接放到 Vercel 或 GitHub Pages。

第一期日期：**2026-08-21**。

## 打开方式

站点用 `fetch` 读取相对路径下的 JSON，不能靠双击 HTML。

```bash
cd daily-news
python3 -m http.server 8080
```

- 首页：http://127.0.0.1:8080/
- 当日：http://127.0.0.1:8080/day.html?date=2026-08-21

线上 `cleanUrls` 后也可用 `/day?date=2026-08-21`。

## 目录结构

```
daily-news/
├── index.html
├── day.html
├── favicon.svg
├── robots.txt
├── vercel.json
├── .nojekyll
├── css/style.css
├── js/site.js
├── assets/grain.svg
└── data/
    ├── editions.json
    └── 2026-08-21.json
```

## 如何加一天

1. 新建 `data/YYYY-MM-DD.json`（字段见下，`items` 最多 30 条）。
2. 在 `data/editions.json` 追加 `{ "date", "summary", "itemCount" }`。`summary` 用当天 `summary_zh`。
3. 刷新首页；日页 `day.html?date=YYYY-MM-DD`。

不要编造没有稿件的日期。

## JSON

每日 `data/YYYY-MM-DD.json`：

```
date, timezone, title, summary_zh, sources[], item_count, items[]
```

每条：

```
rank, title_zh, title_en, source ("News Minimalist"|"Hacker News"),
source_site, article_url, hn_url, hn_points, hn_comments,
summary_zh, quotes[{ type, author, en, zh }]
```

渲染器用 `title_zh`、`summary_zh`、`article_url`、`quotes[].en/zh`。兼容 `title`（作 title_en）与 `publisher`（作 source_site）。

目录 `data/editions.json` 为一天一行的数组。

## 视觉

纸色 `#F4EFE4`，克莱因蓝 `#002FA7`。全页一层纸纹噪点；圆形半色调只出现在日期邮票内部。刊头 Noto Serif SC 56–72px。无暗色、无玻璃、无卡片阴影。
