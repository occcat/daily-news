/* Code-drawn homepage stipple + Klein circular day-page stipple. No sliced images. */
(function (global) {
  "use strict";

  var HERO_PAD = 28;

  function hash(x, y) {
    var n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return n - Math.floor(n);
  }

  function sizeCanvas(canvas, w, h, left, top) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    if (left != null) canvas.style.left = left + "px";
    if (top != null) canvas.style.top = top + "px";
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    var ctx = canvas.getContext("2d", { alpha: true });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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

  function paintHeroStipple(canvas) {
    var parent = canvas.parentElement || document.body;
    var rect = parent.getBoundingClientRect();
    var vw = Math.max(1, Math.floor(rect.width));
    var vh = Math.max(1, Math.floor(rect.height || window.innerHeight));
    var w = vw + HERO_PAD * 2;
    var h = vh + HERO_PAD * 2;
    var ctx = sizeCanvas(canvas, w, h, -HERO_PAD, -HERO_PAD);
    ctx.clearRect(0, 0, w, h);
    var step = 5;
    var x;
    var y;
    for (y = 0; y < h + step; y += step) {
      for (x = 0; x < w + step; x += step) {
        var jx = x + (hash(x, y) - 0.5) * step * 1.15;
        var jy = y + (hash(y + 3.1, x + 1.7) - 0.5) * step * 1.15;
        if (hash(jx * 2.11, jy * 1.73) > heroDensity(jx - HERO_PAD, jy - HERO_PAD, vw, vh)) continue;
        var alpha = 0.08 + hash(jy * 0.9, jx * 1.3) * 0.06;
        ctx.fillStyle = "rgba(246, 240, 228, " + alpha.toFixed(3) + ")";
        var r = 0.38 + hash(jx, jy) * 0.42;
        ctx.beginPath();
        ctx.arc(jx, jy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /* 8.22 klein-halftone: a few circular sand clouds, not a full-page grid.
     Top-right, mid-right edge, bottom-left. Text column almost empty. */
  function paintHalftone(canvas) {
    var w = Math.max(1, Math.floor(window.innerWidth));
    var h = Math.max(1, Math.floor(window.innerHeight));
    var ctx = sizeCanvas(canvas, w, h, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#002FA7";

    var span = Math.min(w, h);
    var clouds = [
      { x: w * 0.96, y: h * 0.02, r: span * 0.42, dens: 0.94 },
      { x: w * 1.02, y: h * 0.50, r: span * 0.17, dens: 0.82 },
      { x: w * -0.02, y: h * 1.02, r: span * 0.26, dens: 0.86 }
    ];

    var colW = Math.min(840, Math.max(0, w - 96));
    var colL = (w - colW) / 2;
    var colR = colL + colW;
    var step = 8;
    var c;
    var i;

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
          var d = Math.hypot(jx - c.x, jy - c.y) / c.r;
          if (d >= 1) continue;
          var fall = Math.pow(1 - d, 1.25);
          var irregular = 0.68 + hash(jx * 0.06, jy * 0.08) * 0.32;
          var colGate = 1;
          if (jx > colL + 36 && jx < colR - 36) colGate = 0.045;
          if (hash(jx * 1.9, jy * 2.3) > fall * c.dens * irregular * colGate) continue;
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

  function bind(kind, canvas) {
    if (!canvas) return;
    var paint = kind === "hero" ? paintHeroStipple : paintHalftone;
    function run() {
      paint(canvas);
    }
    if (canvas.__rikanBound === kind) {
      run();
      return;
    }
    canvas.__rikanBound = kind;
    run();
    var t = 0;
    window.addEventListener("resize", function () {
      clearTimeout(t);
      t = setTimeout(run, 80);
    });
  }

  global.RikanStipple = {
    hero: paintHeroStipple,
    halftone: paintHalftone,
    bind: bind
  };
})(window);
