/* 日刊 · 相对路径读取 data/*.json */
(function () {
  "use strict";

  var MAX_DIGEST = 8;
  var MAX_ITEMS = 30;

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

  function setStamp(iso) {
    var el = document.getElementById("stamp");
    if (!el) return;
    el.innerHTML = '<span class="stamp__date">' + esc(fmtDot(iso)) + "</span>";
  }

  function renderDigest(day) {
    var host = document.getElementById("digest");
    if (!host) return;
    var items = (day.items || []).slice(0, MAX_ITEMS);
    var html = "";
    var lead = (day.summary_zh || day.summary || "").trim();
    if (lead) {
      html += '<div class="lead">' + lead.split(/\n+/).map(function (line) {
        return "<p>" + esc(line) + "</p>";
      }).join("") + "</div>";
    }
    if (!items.length) {
      html += '<p class="empty">本日暂无条目</p>';
      host.innerHTML = html;
      return;
    }
    html += '<ol class="digest">';
    items.slice(0, MAX_DIGEST).forEach(function (it) {
      var rank = it.rank != null ? it.rank : 0;
      var tag = tagOf(it.source);
      html +=
        '<li><a class="digest-row" href="day.html?date=' +
        encodeURIComponent(day.date) +
        "#item-" +
        esc(String(rank)) +
        '">' +
        '<span class="digest-row__n">' + esc(String(rank)) + ".</span>" +
        '<span class="digest-row__title">' + esc(titleOf(it)) + "</span>" +
        (tag ? '<span class="tag">' + esc(tag) + "</span>" : "<span></span>") +
        "</a></li>";
    });
    html += "</ol>";
    if (items.length > MAX_DIGEST) {
      html +=
        '<p class="more"><a href="day.html?date=' +
        encodeURIComponent(day.date) +
        '">其余 ' +
        esc(String(items.length - MAX_DIGEST)) +
        " 则见当日</a></p>";
    }
    host.innerHTML = html;
  }

  function renderTickets(editions) {
    var host = document.getElementById("editions");
    if (!host) return;
    if (!editions.length) {
      host.innerHTML = '<p class="empty">尚无往期</p>';
      return;
    }
    var html = '<ol class="tickets">';
    editions.forEach(function (ed) {
      html +=
        '<li><a class="ticket" href="day.html?date=' +
        encodeURIComponent(ed.date) +
        '">' +
        '<span class="ticket__date">' + esc(fmtDot(ed.date)) + "</span>" +
        '<span class="ticket__leader" aria-hidden="true"></span>' +
        '<span class="ticket__seal">日刊<br>存档</span></a></li>';
    });
    html += "</ol>";
    host.innerHTML = html;
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

  function bootHome() {
    fetchJSON("editions.json").then(function (editions) {
      if (!Array.isArray(editions) || !editions.length) {
        document.getElementById("digest").innerHTML = '<p class="empty">尚无刊次</p>';
        document.getElementById("editions").innerHTML = "";
        return;
      }
      editions = editions.slice().sort(function (a, b) {
        return a.date < b.date ? 1 : -1;
      });
      setStamp(editions[0].date);
      renderTickets(editions);
      return fetchJSON(editions[0].date + ".json").then(function (day) {
        setStamp(day.date || editions[0].date);
        renderDigest(day);
      });
    }).catch(function (err) {
      var el = document.getElementById("digest");
      if (el) el.innerHTML = '<p class="empty">未能载入：' + esc(err.message) + "</p>";
    });
  }

  function bootDay() {
    var date = new URLSearchParams(window.location.search).get("date") || "2026-08-21";
    setStamp(date);
    renderFolio(date);
    document.title = "日刊 · " + fmtDot(date);
    fetchJSON(date + ".json").then(function (day) {
      setStamp(day.date || date);
      renderFolio(day.date || date);
      document.title = "日刊 · " + fmtDot(day.date || date);
      renderItems(day);
    }).catch(function (err) {
      var el = document.getElementById("items");
      if (el) el.innerHTML = '<p class="empty">未能载入：' + esc(err.message) + "</p>";
    });
  }

  var page = document.body.getAttribute("data-page");
  if (page === "home") bootHome();
  else if (page === "day") bootDay();
})();
