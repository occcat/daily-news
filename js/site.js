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
    if (dateEl) dateEl.textContent = fmtMD(day.date);
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
    return theme;
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
      fullEl.textContent = fmtDot(iso).replace(/\./g, ".") + " | " + weekdayZh(iso);
    }
    if (kick) kick.textContent = (theme && KICKERS[theme]) || "";
    if (count && day) {
      var n = Math.min(MAX_ITEMS, (day.items || []).length);
      count.textContent = n ? ("今日 " + n + " 条") : "";
    }
    if (quote) quote.innerHTML = day ? firstQuoteFromDay(day) : "";
    var stubEl = document.getElementById("day-stub");
    if (stubEl) {
      stubEl.hidden = !(day && day.stub);
    }
    document.title = "日刊 · " + fmtDot(iso);
  }

  function renderThemedItems(day) {
    var host = document.getElementById("items-v2");
    if (!host) return;
    var items = (day.items || []).slice(0, MAX_ITEMS);
    if (!items.length) {
      host.innerHTML = '<p class="empty">本日暂无条目</p>';
      return;
    }
    host.innerHTML = items.map(function (it, idx) {
      var rank = it.rank != null ? it.rank : idx + 1;
      var url = it.article_url || it.hn_url || "";
      var src = it.source || "";
      var sum = (it.summary_zh || "").trim();
      var hn = isHN(it.source);
      var q = quotesV2(it);
      var n = String(rank).padStart(2, "0") + ".";
      var serial = fmtMD(day.date) + "-" + String(rank).padStart(2, "0");
      var cls = "item" + (idx === 0 ? " item--lead" : "") + (hn ? " item--hn" : " item--nm");
      return (
        '<li class="' + cls + '" id="item-' + esc(String(rank)) + '">' +
        '<span class="item__id">' + esc(serial) + "</span>" +
        '<span class="item__mark" aria-hidden="true"></span>' +
        '<span class="item__n">' + esc(n) + "</span>" +
        '<div class="item__visual" aria-hidden="' + (hn && q.first ? "false" : "true") + '">' +
        (hn ? q.first : "") +
        "</div>" +
        '<div class="item__body">' +
        '<h2 class="item__title">' + esc(titleOf(it)) + "</h2>" +
        (sum ? '<p class="item__sum">' + esc(sum) + "</p>" : "") +
        q.rest +
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
    renderThemedItems(day);
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
    paintThemed(date);
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
