/* Code-drawn sand + Klein circular stipple. No sliced background images. */
(function (global) {
  "use strict";

  function fit(canvas) {
    var parent = canvas.parentElement || document.body;
    var rect = parent.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.floor(rect.width));
    var h = Math.max(1, Math.floor(rect.height || window.innerHeight));
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    var ctx = canvas.getContext("2d", { alpha: true });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: w, h: h };
  }

  function hash(x, y) {
    var n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return n - Math.floor(n);
  }

  function paintSand(canvas) {
    var g = fit(canvas);
    var ctx = g.ctx;
    var w = g.w;
    var h = g.h;
    var img = ctx.createImageData(canvas.width, canvas.height);
    var data = img.data;
    var dpr = canvas.width / w;
    var i;
    for (i = 0; i < data.length; i += 4) {
      var px = (i / 4) % canvas.width;
      var py = Math.floor(i / 4 / canvas.width);
      var n = hash(px * 0.37, py * 0.41);
      var v = 180 + n * 70;
      data[i] = v;
      data[i + 1] = v - 6;
      data[i + 2] = v - 18;
      data[i + 3] = 48 + n * 70;
    }
    ctx.putImageData(img, 0, 0);
    void dpr;
  }

  function density(x, y, w, h) {
    var nx = x / w;
    var ny = y / h;
    var tr = Math.hypot(1 - nx, ny);
    var bl = Math.hypot(nx, 1 - ny);
    var tl = Math.hypot(nx, ny);
    var br = Math.hypot(1 - nx, 1 - ny);
    var corner = Math.min(tr * 0.92, bl * 0.95, tl * 1.35, br * 1.4);
    var boost = Math.pow(Math.max(0, 1 - corner * 1.28), 2.3);
    var cx = Math.abs(nx - 0.5) * 2;
    var cy = Math.abs(ny - 0.42) * 2;
    var body = 0.018 + 0.07 * Math.pow(Math.max(cx, cy * 0.6), 1.8);
    return Math.min(1, body + boost * 0.9);
  }

  function paintHalftone(canvas) {
    var g = fit(canvas);
    var ctx = g.ctx;
    var w = g.w;
    var h = g.h;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#002FA7";
    var step = 7;
    var x;
    var y;
    for (y = 1; y < h; y += step) {
      for (x = 1; x < w; x += step) {
        var jx = x + (hash(x, y) - 0.5) * 2.2;
        var jy = y + (hash(y, x) - 0.5) * 2.2;
        if (hash(jx * 1.7, jy * 2.1) > density(jx, jy, w, h)) continue;
        var r = 0.7 + hash(jy, jx) * 0.85;
        ctx.beginPath();
        ctx.arc(jx, jy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function bind(kind, canvas) {
    if (!canvas) return;
    var paint = kind === "hero" ? paintSand : paintHalftone;
    var t = 0;
    function run() {
      paint(canvas);
    }
    run();
    window.addEventListener("resize", function () {
      clearTimeout(t);
      t = setTimeout(run, 80);
    });
  }

  global.RikanStipple = {
    hero: paintSand,
    halftone: paintHalftone,
    bind: bind
  };
})(window);
