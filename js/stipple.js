/* Code-drawn homepage stipple + Klein circular day-page stipple. No sliced images. */
(function (global) {
  "use strict";

  var HERO_PAD = 28;
  var TEXT_KEEPOUT = 80;
  var HERO_PULL = 12;
  var HERO_RADIUS = 170;
  var CLOUD_PULL = 32;

  function hash(x, y) {
    var n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return n - Math.floor(n);
  }

  function sizeCanvas(canvas, w, h, left, top) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var cssW = w + "px";
    var cssH = h + "px";
    var bw = Math.floor(w * dpr);
    var bh = Math.floor(h * dpr);
    if (canvas.style.width !== cssW) canvas.style.width = cssW;
    if (canvas.style.height !== cssH) canvas.style.height = cssH;
    if (left != null) canvas.style.left = left + "px";
    if (top != null) canvas.style.top = top + "px";
    var ctx = canvas.getContext("2d", { alpha: true });
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    return ctx;
  }

  /* Homepage only: one light irregular stipple. Edges dense, center sparse.
     Per-dot alpha 0.08–0.14. Does not change day-page halftone. */
  function heroDensity(x, y, w, h) {
    var nx = x / w;
    var ny = y / h;
    var edge = Math.min(nx, 1 - nx, ny, 1 - ny);
    var fromEdge = 1 - Math.min(1, edge * 3.4);
    var cx = (nx - 0.5) * 2;
    var cy = (ny - 0.46) * 2;
    var dist = Math.hypot(cx, cy * 0.88);
    return Math.min(1, 0.03 + fromEdge * 0.62 + Math.pow(Math.max(0, dist - 0.28), 1.55) * 0.22);
  }

  function buildHeroDots(vw, vh) {
    var w = vw + HERO_PAD * 2;
    var h = vh + HERO_PAD * 2;
    var dots = [];
    var step = 5;
    var x;
    var y;
    for (y = 0; y < h + step; y += step) {
      for (x = 0; x < w + step; x += step) {
        var jx = x + (hash(x, y) - 0.5) * step * 1.15;
        var jy = y + (hash(y + 3.1, x + 1.7) - 0.5) * step * 1.15;
        if (hash(jx * 2.11, jy * 1.73) > heroDensity(jx - HERO_PAD, jy - HERO_PAD, vw, vh)) continue;
        dots.push({
          x: jx,
          y: jy,
          r: 0.38 + hash(jx, jy) * 0.42,
          a: 0.08 + hash(jy * 0.9, jx * 1.3) * 0.06
        });
      }
    }
    return { dots: dots, w: w, h: h, vw: vw, vh: vh };
  }

  function gatherDot(x, y, px, py, amount) {
    if (!amount || px == null || py == null) return { x: x, y: y };
    var dx = px - x;
    var dy = py - y;
    var dist = Math.hypot(dx, dy);
    if (dist < 1 || dist > HERO_RADIUS) return { x: x, y: y };
    var t = 1 - dist / HERO_RADIUS;
    var pull = HERO_PULL * t * t * amount;
    return { x: x + (dx / dist) * pull, y: y + (dy / dist) * pull };
  }

  function paintHeroStipple(canvas, pointer, amount) {
    var parent = canvas.parentElement || document.body;
    var rect = parent.getBoundingClientRect();
    var vw = Math.max(1, Math.floor(rect.width));
    var vh = Math.max(1, Math.floor(rect.height || window.innerHeight));
    var cache = canvas.__rikanHero;
    if (!cache || cache.vw !== vw || cache.vh !== vh) {
      cache = buildHeroDots(vw, vh);
      canvas.__rikanHero = cache;
    }
    var ctx = sizeCanvas(canvas, cache.w, cache.h, -HERO_PAD, -HERO_PAD);
    ctx.clearRect(0, 0, cache.w, cache.h);
    ctx.fillStyle = "#F6F0E4";
    var dots = cache.dots;
    var i;
    var d;
    var p;
    for (i = 0; i < dots.length; i++) {
      d = dots[i];
      p = gatherDot(d.x, d.y, pointer && pointer.x, pointer && pointer.y, amount);
      ctx.globalAlpha = d.a;
      ctx.beginPath();
      ctx.arc(p.x, p.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function reducedMotion() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function textColumnKeepout() {
    var day = document.querySelector("#skin-v2 .day") || document.querySelector(".day");
    if (day) {
      var r = day.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    }
    var w = window.innerWidth;
    var colW = Math.min(840, Math.max(0, w - 96));
    var colL = (w - colW) / 2;
    return { left: colL, right: colL + colW, top: -1e6, bottom: 1e6 };
  }

  function insideKeepout(x, y, col) {
    return (
      x >= col.left - TEXT_KEEPOUT &&
      x <= col.right + TEXT_KEEPOUT &&
      y >= col.top - TEXT_KEEPOUT &&
      y <= col.bottom + TEXT_KEEPOUT
    );
  }

  function attractCloud(c, pointer, amount) {
    if (!amount || !pointer) return;
    var dx = pointer.x - c.x;
    var dy = pointer.y - c.y;
    var dist = Math.hypot(dx, dy) || 1;
    var mag = Math.min(CLOUD_PULL, dist * 0.06) * amount;
    c.x += (dx / dist) * mag;
    c.y += (dy / dist) * mag;
  }

  /* 8.22 klein-halftone: a few circular sand clouds, not a full-page grid.
     Top-right, mid-right edge, bottom-left. No dots within 80px of the text column.
     Cloud centers drift extremely slowly; t=0 matches the QA'd static pose. */
  function paintHalftone(canvas, now, pointer, amount) {
    var w = Math.max(1, Math.floor(window.innerWidth));
    var h = Math.max(1, Math.floor(window.innerHeight));
    var ctx = sizeCanvas(canvas, w, h, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#002FA7";

    var span = Math.min(w, h);
    var t = (now || 0) / 1000;
    var clouds = [
      { x: w * 0.96 + Math.sin(t / 48) * 18, y: h * 0.02 + Math.sin(t / 56) * 11, r: span * 0.42, dens: 0.94 },
      { x: w * 1.02 + Math.sin(t / 62) * 12, y: h * 0.50 + Math.sin(t / 44) * 16, r: span * 0.17, dens: 0.82 },
      { x: w * -0.02 + Math.sin(t / 53) * 14, y: h * 1.02 + Math.sin(t / 59) * 10, r: span * 0.26, dens: 0.86 }
    ];

    var col = textColumnKeepout();
    var step = 8;
    var c;
    var i;

    for (i = 0; i < clouds.length; i++) {
      attractCloud(clouds[i], pointer, amount);
    }

    for (i = 0; i < clouds.length; i++) {
      c = clouds[i];
      var x0 = Math.max(0, c.x - c.r);
      var y0 = Math.max(0, c.y - c.r);
      var x1 = Math.min(w, c.x + c.r);
      var y1 = Math.min(h, c.y + c.r);
      var y;
      var x;
      for (y = y0; y < y1; y += step) {
        for (x = x0; x < x1; x += step) {
          var jx = x + (hash(x, y) - 0.5) * step * 0.95;
          var jy = y + (hash(y + 2.4, x + 5.1) - 0.5) * step * 0.95;
          if (insideKeepout(jx, jy, col)) continue;
          var d = Math.hypot(jx - c.x, jy - c.y) / c.r;
          if (d >= 1) continue;
          var fall = Math.pow(1 - d, 1.25);
          var irregular = 0.68 + hash(jx * 0.06, jy * 0.08) * 0.32;
          if (hash(jx * 1.9, jy * 2.3) > fall * c.dens * irregular) continue;
          ctx.globalAlpha = 0.42 + fall * 0.5;
          var r = 0.95 + hash(jy, jx) * 1.35;
          ctx.beginPath();
          ctx.arc(jx, jy, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function bindHero(canvas) {
    var hero = canvas.parentElement || document.body;
    var aimX = null;
    var aimY = null;
    var curX = null;
    var curY = null;
    var amount = 0;
    var live = !reducedMotion();
    var ticking = false;

    function pointerFromEvent(ev) {
      var rect = hero.getBoundingClientRect();
      return {
        x: ev.clientX - rect.left + HERO_PAD,
        y: ev.clientY - rect.top + HERO_PAD
      };
    }

    function paint() {
      var ptr = curX == null ? null : { x: curX, y: curY };
      paintHeroStipple(canvas, ptr, amount);
    }

    function tick() {
      ticking = false;
      if (!live) {
        paint();
        return;
      }
      if (aimX != null) {
        if (curX == null) {
          curX = aimX;
          curY = aimY;
        } else {
          curX = lerp(curX, aimX, 0.18);
          curY = lerp(curY, aimY, 0.18);
        }
        amount = lerp(amount, 1, 0.16);
      } else {
        amount = lerp(amount, 0, 0.1);
        if (amount < 0.01) amount = 0;
      }
      paint();
      if (amount > 0 || aimX != null) {
        ticking = true;
        requestAnimationFrame(tick);
      }
    }

    function kick() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(tick);
      }
    }

    if (canvas.__rikanBound === "hero") {
      paint();
      return;
    }
    canvas.__rikanBound = "hero";
    paint();

    var resizeT = 0;
    window.addEventListener("resize", function () {
      clearTimeout(resizeT);
      resizeT = setTimeout(paint, 80);
    });

    if (!live) return;

    hero.addEventListener("pointermove", function (ev) {
      if (ev.pointerType === "touch") return;
      var p = pointerFromEvent(ev);
      aimX = p.x;
      aimY = p.y;
      kick();
    }, { passive: true });

    hero.addEventListener("pointerleave", function () {
      aimX = null;
      aimY = null;
      kick();
    }, { passive: true });
  }

  function bindHalftone(canvas) {
    var drift = !reducedMotion();
    var aimX = null;
    var aimY = null;
    var curX = null;
    var curY = null;
    var amount = 0;
    var settleUntil = 0;

    function paint(now) {
      var ptr = curX == null ? null : { x: curX, y: curY };
      paintHalftone(canvas, drift ? now : 0, ptr, drift ? amount : 0);
    }

    if (canvas.__rikanBound === "halftone") {
      if (!canvas.__rikanCloudDrift) paint(0);
      return;
    }
    canvas.__rikanBound = "halftone";

    var resizeT = 0;
    window.addEventListener("resize", function () {
      clearTimeout(resizeT);
      resizeT = setTimeout(function () {
        paint(drift ? performance.now() : 0);
      }, 80);
    });

    if (!drift) {
      paint(0);
      return;
    }

    canvas.__rikanCloudDrift = true;

    window.addEventListener("pointermove", function (ev) {
      if (ev.pointerType === "touch") return;
      aimX = ev.clientX;
      aimY = ev.clientY;
      settleUntil = performance.now() + 480;
    }, { passive: true });

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        aimX = null;
        aimY = null;
      }
    });

    var last = 0;
    function tick(now) {
      if (!document.hidden) {
        if (aimX != null) {
          if (curX == null) {
            curX = aimX;
            curY = aimY;
          } else {
            curX = lerp(curX, aimX, 0.12);
            curY = lerp(curY, aimY, 0.12);
          }
          amount = lerp(amount, 1, 0.12);
        } else {
          amount = lerp(amount, 0, 0.06);
          if (amount < 0.01) amount = 0;
        }
        var interval = now < settleUntil ? 32 : 120;
        if (now - last >= interval) {
          last = now;
          paint(now);
        }
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function bind(kind, canvas) {
    if (!canvas) return;
    if (kind === "hero") bindHero(canvas);
    else bindHalftone(canvas);
  }

  global.RikanStipple = {
    hero: function (canvas) { paintHeroStipple(canvas, null, 0); },
    halftone: function (canvas, now) { paintHalftone(canvas, now, null, 0); },
    bind: bind
  };
})(window);
