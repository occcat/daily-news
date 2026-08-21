/* 日刊 · 相对路径读取 data/*.json */
(function () {
  "use strict";

  var MAX_ITEMS = 30;
  var HERO_COUNT = 3;
  var HOME_LIST_MAX = 5;
  var DEFAULT_DATE = "2026-08-21";
  var THEME_START = "2026-08-22";
  var THEMES = {
    "klein-halftone": 1,
    polaroid: 1,
    stamp: 1,
    "isometric-mini": 1,
    agamemnon: 1,
    origami: 1,
    "collector-card": 1
  };
  var WEEKDAYS = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function dataUrl(name) {
    return new URL("data/" + name, window.location.href).toString();
  }

  function fetchJSON(name) {
    return fetch(dataUrl(name), { cache: "no-store" }).then(function (res) {
      if (!res.ok) {
        var err = new Error("HTTP " + res.status);
        err.status = res.status;
        throw err;
      }
      return res.json();
    }).then(function (data) {
      var parts = data && data.parts;
      if (!Array.isArray(parts) || !parts.length) return data;
      return Promise.all(parts.map(function (part) {
        return fetch(dataUrl(part), { cache: "no-store" }).then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.json();
        });
      })).then(function (chunks) {
        var items = [];
        chunks.forEach(function (c) {
          if (Array.isArray(c)) items = items.concat(c);
          else if (c && Array.isArray(c.items)) items = items.concat(c.items);
        });
        data.items = items;
        return data;
      });
    });
  }

  function parseISO(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    if (!m) return null;
    return { y: +m[1], mo: +m[2], d: +m[3], iso: m[0] };
  }

  function fmtDot(iso) {
    var p = parseISO(iso);
    if (!p) return iso || "";
    return p.y + "." + String(p.mo).padStart(2, "0") + "." + String(p.d).padStart(2, "0");
  }

  function fmtMD(iso) {
    var p = parseISO(iso);
    if (!p) return iso || "";
    return String(p.mo).padStart(2, "0") + "." + String(p.d).padStart(2, "0");
  }

  function weekdayZh(iso) {
    var p = parseISO(iso);
    if (!p) return "";
    return WEEKDAYS[new Date(Date.UTC(p.y, p.mo - 1, p.d)).getUTCDay()];
  }

  function hostOf(url) {
    try { return new URL(url).host.replace(/^www\./, ""); } catch (e) { return ""; }
  }

  function tagOf(source) {
    if (/hacker\s*news/i.test(source || "")) return "HN";
    if (/minimalist/i.test(source || "")) return "NM";
    return "";
  }

  function isHN(source) {
    return /hacker\s*news/i.test(source || "");
  }

  function titleOf(it) {
    return (it && (it.title_zh || it.title_en || it.title)) || "";
  }

  /* Only a real http(s) image already on the item. Never invent photos. */
  function itemImageUrl(it) {
    if (!it) return "";
    var keys = ["og_image", "image", "image_url", "photo", "thumbnail", "cover"];
    var i;
    for (i = 0; i < keys.length; i++) {
      var v = it[keys[i]];
      if (typeof v === "string" && /^https?:\/\//i.test(v.trim())) return v.trim();
    }
    return "";
  }

  function fmtZhLong(iso) {
    var p = parseISO(iso);
    if (!p) return iso || "";
    return p.y + "年" + String(p.mo).padStart(2, "0") + "月" + String(p.d).padStart(2, "0") + "日 " + weekdayZh(iso);
  }

  function siteOf(it) {
    var url = (it && (it.article_url || it.hn_url)) || "";
    return (it && (it.source_site || it.publisher)) || hostOf(url);
  }

  function isLegacyDate(iso) {
    var p = parseISO(iso);
    if (!p) return true;
    return p.iso < THEME_START;
  }

  function resolveTheme(name) {
    return THEMES[name] ? name : "klein-halftone";
  }

  function ensureStylesheet(id, href) {
    var el = document.getElementById(id);
    if (el) {
      el.href = href;
      return el;
    }
    el = document.createElement("link");
    el.rel = "stylesheet";
    el.id = id;
    el.href = href;
    document.head.appendChild(el);
    return el;
  }

  /* —— 2026-08-21 newspaper day (unchanged) —— */
  function setStamp(iso) {
    var el = document.getElementById("stamp");
    if (!el) return;
    el.innerHTML = '<span class="stamp__date">' + esc(fmtDot(iso)) + "</span>";
  }

  function quotesHTML(it) {
    if (!isHN(it.source)) return "";
    var qs = Array.isArray(it.quotes) ? it.quotes : [];
    if (!qs.length) return "";
    var pairs = qs.map(function (q) {
      var en = (q.en || q.original || "").trim();
      var zh = (q.zh || q.translation || "").trim();
      if (!en && !zh) return "";
      var author =
        q.author && String(q.author).trim()
          ? '<cite class="quote__author">' + esc(q.author) + "</cite>"
          : "";
      return (
        '<div class="quote-pair">' +
        (en
          ? '<blockquote class="quote quote--en">' + author + "<p>" + esc(en) + "</p></blockquote>"
          : "") +
        (zh
          ? '<blockquote class="quote quote--zh"><p><span class="yi" aria-label="译文">译</span>' +
            esc(zh) +
            "</p></blockquote>"
          : "") +
        "</div>"
      );
    }).join("");
    return pairs ? '<div class="quotes">' + pairs + "</div>" : "";
  }

  function renderItems(day) {
    var host = document.getElementById("items");
    if (!host) return;
    var items = (day.items || []).slice(0, MAX_ITEMS);
    if (!items.length) {
      host.innerHTML = '<p class="empty">本日暂无条目</p>';
      return;
    }
    var html = '<ol class="items">';
    items.forEach(function (it) {
      var rank = it.rank != null ? it.rank : 0;
      var url = it.article_url || it.hn_url || "";
      var src = it.source || "";
      var site = siteOf(it);
      var sum = (it.summary_zh || "").trim();
      html +=
        '<li class="item" id="item-' + esc(String(rank)) + '">' +
        '<span class="item__n">' + esc(String(rank)) + ".</span>" +
        '<div class="item__body">' +
        '<h2 class="item__title">' + esc(titleOf(it)) + "</h2>" +
        '<p class="item__meta">来源: ' + esc(src) +
        (url
          ? '　链接: <a href="' + esc(url) + '" rel="noopener noreferrer">' +
            esc(site || hostOf(url) || "原文") +
            "</a>"
          : "") +
        "</p>" +
        (sum ? '<p class="item__sum">' + esc(sum) + "</p>" : "") +
        quotesHTML(it) +
        "</div></li>";
    });
    html += "</ol>";
    host.innerHTML = html;
  }

  function renderFolio(iso) {
    var el = document.getElementById("folio");
    if (!el) return;
    el.innerHTML =
      '<a href="index.html">返回目录</a><span>' + esc(fmtDot(iso)) + "</span>";
  }

  /* —— Homepage klein-poster —— */
  function renderHeroHeads(day, items) {
    var host = document.getElementById("hero-heads");
    var dateEl = document.getElementById("hero-date");
    if (dateEl) {
      dateEl.textContent = fmtMD(day.date);
      dateEl.classList.add("is-in");
    }
    if (!host) return;
    host.innerHTML = items.slice(0, HERO_COUNT).map(function (it) {
      var rank = it.rank != null ? it.rank : 0;
      var tag = tagOf(it.source);
      return (
        "<li><a href=\"day.html?date=" +
        encodeURIComponent(day.date) +
        "#item-" +
        esc(String(rank)) +
        "\">" +
        '<span class="hero__title">' +
        esc(titleOf(it)) +
        (tag ? '<span class="tag">' + esc(tag) + "</span>" : "") +
        "</span>" +
        "</a></li>"
      );
    }).join("");
    host.classList.add("is-in");
  }

  function renderHomeList(day, items) {
    var host = document.getElementById("digest");
    if (!host) return;
    var rest = items.slice(HERO_COUNT, HERO_COUNT + HOME_LIST_MAX);
    if (!rest.length) {
      host.innerHTML = "";
      return;
    }
    host.innerHTML =
      '<ol class="digest">' +
      rest.map(function (it) {
        var rank = it.rank != null ? it.rank : 0;
        var tag = tagOf(it.source);
        return (
          "<li><a class=\"digest-row\" href=\"day.html?date=" +
          encodeURIComponent(day.date) +
          "#item-" +
          esc(String(rank)) +
          "\">" +
          '<span class="digest-row__title">' +
          esc(titleOf(it)) +
          (tag ? '<span class="tag">' + esc(tag) + "</span>" : "") +
          "</span>" +
          '<span class="digest-row__go" aria-hidden="true">→</span>' +
          "</a></li>"
        );
      }).join("") +
      "</ol>";
  }

  function isPublishedEdition(ed) {
    return !!(ed && ed.date && !ed.stub);
  }

  function renderArchive(editions, today) {
    var host = document.getElementById("editions");
    if (!host) return;
    var past = editions.filter(function (ed) {
      return isPublishedEdition(ed) && ed.date !== today;
    });
    if (!past.length) {
      host.innerHTML = "";
      return;
    }
    host.innerHTML = past.map(function (ed) {
      return (
        '<a href="day.html?date=' +
        encodeURIComponent(ed.date) +
        '">' +
        esc(fmtMD(ed.date)) +
        "</a>"
      );
    }).join("");
  }

  /* —— Themed day pages (2026-08-22 onward) —— */
  function pairHTML(q, withYi) {
    var en = (q.en || q.original || "").trim();
    var zh = (q.zh || q.translation || "").trim();
    if (!en && !zh) return "";
    var author =
      q.author && String(q.author).trim()
        ? '<cite class="quote__author">' + esc(q.author) + "</cite>"
        : "";
    return (
      '<div class="quote-pair">' +
      (en
        ? '<blockquote class="quote quote--en">' + author + "<p>" + esc(en) + "</p></blockquote>"
        : "") +
      (zh
        ? '<blockquote class="quote quote--zh"><p>' +
          (withYi ? '<span class="yi" aria-label="译文">译</span>' : "") +
          esc(zh) +
          "</p></blockquote>"
        : "") +
      "</div>"
    );
  }

  function quotesV2(it) {
    if (!isHN(it.source)) return { all: "", rest: "", first: "" };
    var qs = Array.isArray(it.quotes) ? it.quotes : [];
    var bits = qs.map(function (q) { return pairHTML(q, false); }).filter(Boolean);
    return {
      all: bits.length ? '<div class="quotes">' + bits.join("") + "</div>" : "",
      rest: bits.length > 1 ? '<div class="quotes">' + bits.slice(1).join("") + "</div>" : "",
      first: bits[0] || ""
    };
  }

  function applyTheme(theme) {
    theme = resolveTheme(theme);
    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);
    var link = document.getElementById("theme-css");
    if (link) link.href = "css/themes/" + theme + ".css";
    if (theme === "polaroid") {
      ensureStylesheet(
        "theme-fonts",
        "https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Homemade+Apple&display=swap"
      );
    }
    return theme;
  }

  function clearThemeChrome() {
    var chrome = document.getElementById("theme-chrome");
    if (chrome) chrome.remove();
  }

  function polaroidChromeHTML() {
    return (
      '<div id="theme-chrome" class="polaroid-chrome" aria-hidden="true">' +
      '<div class="prop prop-camera">' +
      '<svg viewBox="0 0 160 110" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="8" y="34" width="144" height="68" rx="8" fill="#1A1916"/>' +
      '<rect x="54" y="16" width="40" height="22" rx="4" fill="#1A1916"/>' +
      '<circle cx="86" cy="68" r="24" fill="#2C2A26"/>' +
      '<circle cx="86" cy="68" r="14" fill="#141312"/>' +
      '<circle cx="86" cy="68" r="6" fill="#3A3834"/>' +
      '<circle cx="32" cy="52" r="5" fill="#3A3834"/>' +
      '<rect x="122" y="44" width="16" height="8" rx="2" fill="#2C2A26"/>' +
      "</svg></div>" +
      '<div class="prop prop-pen">' +
      '<svg viewBox="0 0 200 24" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="8" y="8" width="168" height="8" rx="3" fill="#1A1916"/>' +
      '<polygon points="176,8 196,12 176,16" fill="#1A1916"/>' +
      '<rect x="20" y="7" width="18" height="10" fill="#2C2A26"/>' +
      "</svg></div>" +
      '<div class="prop prop-cup">' +
      '<svg viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg">' +
      '<ellipse cx="52" cy="78" rx="38" ry="8" fill="#F7F2E8"/>' +
      '<path d="M20 28h64v36c0 12-14 20-32 20s-32-8-32-20V28z" fill="#F7F2E8" stroke="#E4D9C4" stroke-width="2"/>' +
      '<ellipse cx="52" cy="28" rx="32" ry="9" fill="#F7F2E8" stroke="#E4D9C4" stroke-width="2"/>' +
      '<ellipse cx="52" cy="28" rx="22" ry="5" fill="#EFE6D4"/>' +
      '<path d="M84 34c16 2 22 14 10 24" fill="none" stroke="#F7F2E8" stroke-width="8"/>' +
      "</svg></div>" +
      '<div class="prop prop-note">good things take time.<small>☺</small></div>' +
      '<div class="prop prop-scrap"></div>' +
      "</div>"
    );
  }

  function isoDressingHTML() {
    return (
      '<div class="iso-dressing" aria-hidden="true">' +
      '<div class="iso-tree iso-tree--1"><span class="iso-tree__canopy"></span><span class="iso-tree__trunk"></span></div>' +
      '<div class="iso-tree iso-tree--2"><span class="iso-tree__canopy"></span><span class="iso-tree__trunk"></span></div>' +
      '<div class="iso-bench"></div>' +
      '<div class="iso-post iso-post--1"></div>' +
      '<div class="iso-post iso-post--2"></div>' +
      '<div class="iso-cube"></div>' +
      '<div class="iso-slogan">科技改变生活<br>创新驱动未来</div>' +
      "</div>"
    );
  }

  function restoreItemsHost() {
    var main = document.getElementById("main-v2");
    if (!main) return null;
    var host = document.getElementById("items-v2");
    if (host && host.tagName === "OL") return host;
    main.innerHTML = '<ol class="items" id="items-v2"></ol>';
    return document.getElementById("items-v2");
  }

  function polaroidVisualHTML(it) {
    var img = itemImageUrl(it);
    if (!img) return "";
    return (
      '<img class="polaroid-shot" src="' +
      esc(img) +
      '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">'
    );
  }

  function renderPolaroidItems(day) {
    var host = restoreItemsHost();
    if (!host) return;
    var dayEl = document.querySelector("#skin-v2 .day");
    clearThemeChrome();
    if (dayEl) dayEl.insertAdjacentHTML("afterbegin", polaroidChromeHTML());
    var items = (day.items || []).slice(0, MAX_ITEMS);
    host.innerHTML = items.map(function (it, idx) {
      var rank = it.rank != null ? it.rank : idx + 1;
      var url = it.article_url || it.hn_url || "";
      var src = it.source || "";
      var site = siteOf(it);
      var sum = (it.summary_zh || "").trim();
      var title = titleOf(it);
      var heading = url
        ? '<a href="' + esc(url) + '" rel="noopener noreferrer">' + esc(title) + "</a>"
        : esc(title);
      return (
        '<li class="item" id="item-' + esc(String(rank)) + '">' +
        '<div class="item__visual" aria-hidden="true">' + polaroidVisualHTML(it) + "</div>" +
        '<div class="item__body">' +
        '<h2 class="item__title">' + heading + "</h2>" +
        '<p class="item__meta">来源: ' + esc(src || site || "") + "</p>" +
        (sum ? '<p class="sr-only">' + esc(sum) + "</p>" : "") +
        "</div></li>"
      );
    }).join("");
  }

  var ISO_ROT = ["-2.4deg", "1.6deg", "-1.1deg", "2.2deg", "-3deg", "0.8deg"];
  var ISO_HERO_POS = [
    [32, 28],
    [58, 26],
    [44, 44],
    [68, 42],
    [30, 58],
    [54, 60]
  ];

  function isoPlaqueHTML(it, idx, flag) {
    var rank = it.rank != null ? it.rank : idx + 1;
    var url = it.article_url || it.hn_url || "";
    var src = it.source || "";
    var sum = (it.summary_zh || "").trim();
    var n = String(rank).padStart(2, "0");
    var title = titleOf(it);
    var heading = url
      ? '<a href="' + esc(url) + '" rel="noopener noreferrer">' + esc(title) + "</a>"
      : esc(title);
    var pos = ISO_HERO_POS[idx] || [50, 40];
    var style = flag
      ? "--rot:" + ISO_ROT[idx % ISO_ROT.length]
      : "--x:" + pos[0] + "%;--y:" + pos[1] + "%;--rot:" + ISO_ROT[idx % ISO_ROT.length];
    return (
      '<li class="item' + (flag ? " item--flag" : "") + '" id="item-' + esc(String(rank)) + '" style="' + style + '">' +
      '<div class="item__stand">' +
      '<span class="item__back" aria-hidden="true"></span>' +
      '<div class="item__face">' +
      '<span class="item__n">' + esc(n) + "</span>" +
      '<h2 class="item__title">' + heading + "</h2>" +
      (!flag && sum ? '<p class="item__sum">' + esc(sum) + "</p>" : "") +
      '<p class="item__meta">来源: ' + esc(src) + "</p>" +
      "</div>" +
      '<span class="item__post" aria-hidden="true"></span>' +
      "</div></li>"
    );
  }

  function renderIsoItems(day) {
    var main = document.getElementById("main-v2");
    if (!main) return;
    clearThemeChrome();
    var items = (day.items || []).slice(0, MAX_ITEMS);
    var hero = items.slice(0, 6);
    var rest = items.slice(6);
    main.innerHTML =
      '<div class="iso-stage">' +
      '<div class="iso-table">' +
      '<b class="iso-table__band"></b>' +
      '<div class="iso-table__top"></div>' +
      '<div class="iso-stairs iso-stairs--east"><span></span><span></span><span></span><span></span></div>' +
      '<div class="iso-stairs iso-stairs--south"><span></span><span></span><span></span></div>' +
      isoDressingHTML() +
      '<ol class="iso-plaques" id="items-v2">' +
      hero.map(function (it, idx) { return isoPlaqueHTML(it, idx, false); }).join("") +
      "</ol>" +
      "</div>" +
      (rest.length
        ? '<ol class="iso-yard" id="items-v2-more">' +
          rest.map(function (it, idx) { return isoPlaqueHTML(it, idx + 6, true); }).join("") +
          "</ol>"
        : "") +
      "</div>";
  }

  function activateSkin(legacy) {
    var news = document.getElementById("skin-newspaper");
    var v2 = document.getElementById("skin-v2");
    if (news) news.hidden = !legacy;
    if (v2) v2.hidden = !!legacy;
    document.body.setAttribute("data-skin", legacy ? "newspaper" : "v2");
    if (legacy) {
      document.documentElement.removeAttribute("data-theme");
      document.body.removeAttribute("data-theme");
    }
  }

  var KICKERS = {
    "isometric-mini": "科技日报 · 每日速递",
    agamemnon: "科技 · 商业 · 未来",
    origami: "科技 · 商业 · 产品",
    "collector-card": ""
  };

  function firstQuoteFromDay(day) {
    var items = (day && day.items) || [];
    var i;
    for (i = 0; i < items.length; i++) {
      var q = quotesV2(items[i]);
      if (q.first) return q.first;
    }
    return "";
  }

  function renderThemedHead(iso, day, theme) {
    var dateEl = document.getElementById("day-date");
    var fullEl = document.getElementById("day-full");
    var kick = document.getElementById("day-kicker");
    var count = document.getElementById("day-count");
    var quote = document.getElementById("day-quote");
    if (dateEl) dateEl.textContent = fmtMD(iso);
    if (fullEl) {
      fullEl.textContent = theme === "isometric-mini"
        ? fmtZhLong(iso)
        : (fmtDot(iso) + " | " + weekdayZh(iso));
    }
    if (kick) kick.textContent = (theme && KICKERS[theme]) || "";
    if (count && day) {
      var n = Math.min(MAX_ITEMS, (day.items || []).length);
      count.textContent = n
        ? (theme === "isometric-mini" ? ("今日 " + n + " 条科技新闻") : ("今日 " + n + " 条"))
        : "";
    }
    if (quote) quote.innerHTML = day ? firstQuoteFromDay(day) : "";
    var stubEl = document.getElementById("day-stub");
    if (stubEl) {
      stubEl.hidden = !(day && day.stub);
    }
    document.title = "日刊 · " + fmtDot(iso);
  }

  function renderThemedItems(day, theme) {
    theme = resolveTheme(theme);
    if (theme === "polaroid") {
      renderPolaroidItems(day);
      return;
    }
    if (theme === "isometric-mini") {
      renderIsoItems(day);
      return;
    }
    var host = restoreItemsHost();
    if (!host) return;
    clearThemeChrome();
    var items = (day.items || []).slice(0, MAX_ITEMS);
    if (!items.length) {
      host.innerHTML = '<p class="empty">本日暂无条目</p>';
      return;
    }
    var klein = theme === "klein-halftone";
    host.innerHTML = items.map(function (it, idx) {
      var rank = it.rank != null ? it.rank : idx + 1;
      var url = it.article_url || it.hn_url || "";
      var src = it.source || "";
      var sum = (it.summary_zh || "").trim();
      var hn = isHN(it.source);
      var q = quotesV2(it);
      var n = String(rank).padStart(2, "0") + ".";
      var serial = fmtMD(day.date) + "-" + String(rank).padStart(2, "0");
      var cls = "item" +
        (idx === 0 ? " item--lead" : "") +
        (idx < 3 ? " item--poster" : " item--compact") +
        (hn ? " item--hn" : " item--nm");
      var visual = klein ? "" : (hn ? q.first : "");
      var quotes = klein ? q.all : q.rest;
      return (
        '<li class="' + cls + '" id="item-' + esc(String(rank)) + '">' +
        '<span class="item__id">' + esc(serial) + "</span>" +
        '<span class="item__mark" aria-hidden="true"></span>' +
        '<span class="item__n">' + esc(n) + "</span>" +
        '<div class="item__visual" aria-hidden="' + (visual ? "false" : "true") + '">' +
        visual +
        "</div>" +
        '<div class="item__body">' +
        '<h2 class="item__title">' + esc(titleOf(it)) + "</h2>" +
        (sum ? '<p class="item__sum">' + esc(sum) + "</p>" : "") +
        quotes +
        '<p class="item__meta">来源: ' + esc(src) +
        (url
          ? "<br>链接: <a href=\"" + esc(url) + "\" rel=\"noopener noreferrer\">" +
            esc(url) +
            "</a>"
          : "") +
        "</p>" +
        "</div>" +
        '<span class="item__code" aria-hidden="true"></span>' +
        "</li>"
      );
    }).join("");
  }

  function bootHome() {
    if (window.RikanStipple) {
      window.RikanStipple.bind("hero", document.getElementById("hero-stipple"));
    }
    fetchJSON("editions.json").then(function (editions) {
      if (!Array.isArray(editions) || !editions.length) {
        document.getElementById("digest").innerHTML = '<p class="empty">尚无刊次</p>';
        document.getElementById("editions").innerHTML = "";
        return;
      }
      editions = editions.slice().sort(function (a, b) {
        return a.date < b.date ? 1 : -1;
      });
      var live = null;
      editions.forEach(function (ed) {
        if (!live && !ed.stub) live = ed;
      });
      if (!live) live = editions[editions.length - 1];
      return fetchJSON(live.date + ".json").then(function (day) {
        var items = (day.items || []).slice(0, MAX_ITEMS);
        renderHeroHeads(day, items);
        renderHomeList(day, items);
        renderArchive(editions, day.date || live.date);
      });
    }).catch(function (err) {
      var el = document.getElementById("digest");
      if (el) el.innerHTML = '<p class="empty">未能载入：' + esc(err.message) + "</p>";
    });
  }

  function paintNewspaper(iso, day) {
    ensureStylesheet("newspaper-css", "css/style.css");
    activateSkin(true);
    setStamp(iso);
    renderFolio(iso);
    document.title = "日刊 · " + fmtDot(iso);
    if (day) renderItems(day);
  }

  function paintThemed(iso, day) {
    ensureStylesheet("day-base-css", "css/day-base.css");
    ensureStylesheet("theme-css", "css/themes/klein-halftone.css");
    activateSkin(false);
    if (!day) {
      applyTheme("klein-halftone");
      renderThemedHead(iso);
      return;
    }
    var theme = applyTheme(day.theme);
    renderThemedHead(iso, day, theme);
    renderThemedItems(day, theme);
    if (theme === "klein-halftone" && window.RikanStipple) {
      window.RikanStipple.bind("halftone", document.getElementById("stipple"));
    }
  }

  function bootNewspaperDay(date) {
    paintNewspaper(date);
    fetchJSON(date + ".json").then(function (day) {
      var iso = day.date || date;
      if (!isLegacyDate(iso)) {
        paintThemed(iso, day);
        return;
      }
      paintNewspaper(iso, day);
    }).catch(function (err) {
      var el = document.getElementById("items");
      if (el) el.innerHTML = '<p class="empty">未能载入：' + esc(err.message) + "</p>";
    });
  }

  function bootThemedDay(date) {
    ensureStylesheet("day-base-css", "css/day-base.css");
    activateSkin(false);
    /* Do not Klein-flood polaroid / isometric while JSON parts load. */
    if (date === "2026-08-23") applyTheme("polaroid");
    else if (date === "2026-08-25") applyTheme("isometric-mini");
    else applyTheme("klein-halftone");
    renderThemedHead(date);
    fetchJSON(date + ".json").then(function (day) {
      var iso = day.date || date;
      if (isLegacyDate(iso)) {
        paintNewspaper(iso, day);
        return;
      }
      paintThemed(iso, day);
    }).catch(function (err) {
      applyTheme("klein-halftone");
      var el = document.getElementById("items-v2");
      if (el) el.innerHTML = '<p class="empty">未能载入：' + esc(err.message) + "</p>";
    });
  }

  function bootDay() {
    var date = new URLSearchParams(window.location.search).get("date") || DEFAULT_DATE;
    if (isLegacyDate(date)) bootNewspaperDay(date);
    else bootThemedDay(date);
  }

  var page = document.body.getAttribute("data-page");
  if (page === "home") bootHome();
  else if (page === "day") bootDay();
})();
