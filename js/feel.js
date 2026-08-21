/* Per-skin pointer feel for locked 8.23–8.28 day pages. No scroll hijack. */
(function (global) {
  "use strict";

  var ISO_TILT_X = 6;
  var ISO_TILT_Y = 8;
  var AGA_PULL = 26;
  var TYPE_PAD = 80;

  function reducedMotion() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function typeColumnRight() {
    var head = document.querySelector("#skin-v2 .day-head");
    var main = document.getElementById("main-v2");
    var right = -1e6;
    if (head) right = Math.max(right, head.getBoundingClientRect().right);
    if (main) right = Math.max(right, main.getBoundingClientRect().right);
    return right;
  }

  function bindIso() {
    var plaques = document.querySelectorAll(".iso-plaques .item");
    if (!plaques.length || reducedMotion()) return;
    document.__isoPlaques = plaques;
    if (document.__isoBound) return;
    document.__isoBound = true;

    var aimX = null;
    var aimY = null;
    var ticking = false;

    function apply(px, py) {
      var list = document.__isoPlaques || [];
      var i;
      for (i = 0; i < list.length; i++) {
        var item = list[i];
        var stand = item.querySelector(".item__stand");
        if (!stand) continue;
        if (px == null) {
          stand.style.transform = "";
          continue;
        }
        var r = item.getBoundingClientRect();
        var cx = r.left + r.width / 2;
        var cy = r.top + r.height / 2;
        var nx = Math.max(-1, Math.min(1, (px - cx) / 160));
        var ny = Math.max(-1, Math.min(1, (py - cy) / 160));
        stand.style.transform =
          "rotateX(" + (-ny * ISO_TILT_X).toFixed(2) + "deg) " +
          "rotateY(" + (nx * ISO_TILT_Y).toFixed(2) + "deg)";
      }
    }

    function frame() {
      ticking = false;
      if (!document.__isoFeel) return;
      apply(aimX, aimY);
    }

    function kick() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(frame);
      }
    }

    window.addEventListener("pointermove", function (ev) {
      if (ev.pointerType === "touch") return;
      if (!document.querySelector(".iso-plaques")) return;
      aimX = ev.clientX;
      aimY = ev.clientY;
      kick();
    }, { passive: true });

    document.addEventListener("pointerleave", function () {
      aimX = null;
      aimY = null;
      kick();
    }, { passive: true });
  }

  function clusterBox(kind, figure, day) {
    var fr = figure.getBoundingClientRect();
    var dr = day.getBoundingClientRect();
    var w;
    var h;
    if (kind === "top") {
      w = fr.width;
      h = w * 660 / 540;
      return { left: fr.left, right: fr.right, top: fr.top + 40, bottom: fr.top + 40 + h };
    }
    if (kind === "mid") {
      w = fr.width * 0.82;
      h = w * 600 / 500;
      return { left: fr.left, right: fr.left + w, top: fr.top + fr.height * 0.46, bottom: fr.top + fr.height * 0.46 + h };
    }
    w = window.innerWidth <= 1100
      ? Math.min(164, window.innerWidth * 0.18)
      : Math.min(window.innerWidth * 0.23, 312);
    h = w * 680 / 520;
    return {
      left: dr.right + 80,
      right: dr.right + 80 + w,
      top: dr.bottom - 120 - h,
      bottom: dr.bottom - 120
    };
  }

  function attract(box, px, py) {
    var cx = (box.left + box.right) / 2;
    var cy = (box.top + box.bottom) / 2;
    var dx = px - cx;
    var dy = py - cy;
    var dist = Math.hypot(dx, dy) || 1;
    var mag = Math.min(AGA_PULL, dist * 0.07);
    var out = { x: (dx / dist) * mag, y: (dy / dist) * mag };
    var minLeft = typeColumnRight() + TYPE_PAD;
    if (box.left + out.x < minLeft) {
      out.x = Math.max(0, minLeft - box.left);
    }
    return out;
  }

  function setAga(figure, day, top, mid, bot) {
    figure.style.setProperty("--aga-top-x", top.x.toFixed(1) + "px");
    figure.style.setProperty("--aga-top-y", top.y.toFixed(1) + "px");
    figure.style.setProperty("--aga-mid-x", mid.x.toFixed(1) + "px");
    figure.style.setProperty("--aga-mid-y", mid.y.toFixed(1) + "px");
    day.style.setProperty("--aga-bot-x", bot.x.toFixed(1) + "px");
    day.style.setProperty("--aga-bot-y", bot.y.toFixed(1) + "px");
  }

  function bindAga() {
    var day = document.querySelector("#skin-v2 .day");
    var figure = day && day.querySelector(".day-figure");
    if (!day || !figure) return;
    day.__agaFeel = true;
    if (reducedMotion()) {
      setAga(figure, day, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 });
      return;
    }
    if (figure.__agaBound) return;
    figure.__agaBound = true;

    var aimX = null;
    var aimY = null;
    var curX = null;
    var curY = null;
    var amount = 0;
    var ticking = false;

    function frame() {
      ticking = false;
      if (!day.__agaFeel) return;
      if (aimX != null) {
        if (curX == null) {
          curX = aimX;
          curY = aimY;
        } else {
          curX = lerp(curX, aimX, 0.14);
          curY = lerp(curY, aimY, 0.14);
        }
        amount = lerp(amount, 1, 0.14);
      } else {
        amount = lerp(amount, 0, 0.08);
        if (amount < 0.01) amount = 0;
      }
      var top = { x: 0, y: 0 };
      var mid = { x: 0, y: 0 };
      var bot = { x: 0, y: 0 };
      if (amount > 0 && curX != null) {
        top = attract(clusterBox("top", figure, day), curX, curY);
        mid = attract(clusterBox("mid", figure, day), curX, curY);
        bot = attract(clusterBox("bot", figure, day), curX, curY);
        top.x *= amount; top.y *= amount;
        mid.x *= amount; mid.y *= amount;
        bot.x *= amount; bot.y *= amount;
      }
      setAga(figure, day, top, mid, bot);
      if (amount > 0 || aimX != null) {
        ticking = true;
        requestAnimationFrame(frame);
      }
    }

    function kick() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(frame);
      }
    }

    window.addEventListener("pointermove", function (ev) {
      if (!day.__agaFeel) return;
      if (ev.pointerType === "touch") return;
      aimX = ev.clientX;
      aimY = ev.clientY;
      kick();
    }, { passive: true });

    document.addEventListener("pointerleave", function () {
      aimX = null;
      aimY = null;
      kick();
    }, { passive: true });

    window.addEventListener("scroll", function () {
      if (aimX != null) kick();
    }, { passive: true });
  }

  function bind(theme) {
    var day = document.querySelector("#skin-v2 .day");
    if (day) day.__agaFeel = theme === "agamemnon";
    document.__isoFeel = theme === "isometric-mini";
    if (theme === "isometric-mini") bindIso();
    else if (theme === "agamemnon") bindAga();
  }

  global.RikanFeel = { bind: bind };
})(window);
