/* Per-skin pointer feel for locked 8.23–8.28 day pages. No scroll hijack. */
(function (global) {
  "use strict";

  var ISO_TILT_X = 5;
  var ISO_TILT_Y = 6;
  var AGA_PULL = 36;
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

  function bindStamp() {
    var mark = document.querySelector("#skin-v2 .item--lead .item__mark");
    if (!mark) return;
    setTimeout(function () { mark.classList.add("is-landed"); }, 500);
  }

  function bindPolaroid() {
    var items = document.querySelectorAll("#skin-v2 .items > .item");
    if (!items.length) return;
    document.__polaroidItems = items;
    if (reducedMotion() || document.__polaroidBound) return;
    document.__polaroidBound = true;

    document.addEventListener("pointerover", function (ev) {
      if (!document.__polaroidFeel) return;
      var item = ev.target.closest && ev.target.closest("#skin-v2 .items > .item");
      var from = ev.relatedTarget && ev.relatedTarget.closest
        ? ev.relatedTarget.closest("#skin-v2 .items > .item")
        : null;
      if (item === from) return;
      var list = document.__polaroidItems || [];
      var i;
      for (i = 0; i < list.length; i++) {
        list[i].classList.toggle("is-yield", !!(item && list[i] !== item && (
          list[i] === item.previousElementSibling ||
          list[i] === item.nextElementSibling
        )));
      }
    }, true);
  }

  function bindIso() {
    var plaques = document.querySelectorAll(".iso-plaques .item");
    if (!plaques.length || reducedMotion()) return;
    document.__isoPlaques = plaques;
    document.__isoReady = false;
    setTimeout(function () {
      document.__isoReady = true;
      var list = document.__isoPlaques || [];
      var i;
      for (i = 0; i < list.length; i++) {
        var stand = list[i].querySelector(".item__stand");
        if (stand) stand.classList.add("is-landed");
      }
    }, 860);
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
        if (px == null || !document.__isoReady) {
          stand.style.setProperty("--iso-rx", "0deg");
          stand.style.setProperty("--iso-ry", "0deg");
          continue;
        }
        var r = item.getBoundingClientRect();
        var cx = r.left + r.width / 2;
        var cy = r.top + r.height / 2;
        var nx = Math.max(-1, Math.min(1, (px - cx) / 160));
        var ny = Math.max(-1, Math.min(1, (py - cy) / 160));
        stand.style.setProperty("--iso-rx", (-ny * ISO_TILT_X).toFixed(2) + "deg");
        stand.style.setProperty("--iso-ry", (nx * ISO_TILT_Y).toFixed(2) + "deg");
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

  function bindDither() {
    var day = document.querySelector("#skin-v2 .day");
    if (!day) return;
    day.__odFeel = true;
    if (reducedMotion()) {
      day.style.setProperty("--od-near", "0");
      return;
    }
    if (day.__odBound) return;
    day.__odBound = true;

    function apply(px, py) {
      if (!day.__odFeel || px == null || py == null) {
        day.style.setProperty("--od-near", "0");
        return;
      }
      var nodes = day.querySelectorAll(".od-cluster, .day-date, .item");
      var i;
      var best = 0;
      for (i = 0; i < nodes.length; i++) {
        var r = nodes[i].getBoundingClientRect();
        var cx = r.left + r.width / 2;
        var cy = r.top + r.height / 2;
        var dist = Math.hypot(px - cx, py - cy);
        var near = dist < 40 ? 1 - dist / 40 : 0;
        nodes[i].style.setProperty("--od-near", near.toFixed(3));
        if (near > best) best = near;
      }
      day.style.setProperty("--od-near", best.toFixed(3));
      if (px != null) {
        day.style.setProperty("--od-mx", px.toFixed(1) + "px");
        day.style.setProperty("--od-my", py.toFixed(1) + "px");
      }
    }

    window.addEventListener("pointermove", function (ev) {
      if (!day.__odFeel || ev.pointerType === "touch") return;
      apply(ev.clientX, ev.clientY);
    }, { passive: true });

    document.addEventListener("pointerleave", function () {
      if (!day.__odFeel) return;
      apply(null, null);
      day.querySelectorAll(".od-cluster, .day-date, .item").forEach(function (el) {
        el.style.setProperty("--od-near", "0");
      });
    }, { passive: true });
  }

  function bindPrism() {
    var cubes = document.querySelectorAll(".pp-cube");
    if (!cubes.length) return;
    document.__ppFeel = true;
    if (reducedMotion()) {
      var j;
      for (j = 0; j < cubes.length; j++) {
        cubes[j].style.setProperty("--pp-rx", "0deg");
        cubes[j].style.setProperty("--pp-ry", "0deg");
      }
      return;
    }
    if (document.__ppBound) return;
    document.__ppBound = true;

    var drag = null;
    var startX = 0;
    var startY = 0;
    var baseX = 0;
    var baseY = 0;

    function tilt(cube, px, py) {
      var r = cube.getBoundingClientRect();
      var nx = Math.max(-1, Math.min(1, (px - (r.left + r.width / 2)) / (r.width / 2 || 1)));
      var ny = Math.max(-1, Math.min(1, (py - (r.top + r.height / 2)) / (r.height / 2 || 1)));
      cube.style.setProperty("--pp-rx", (-ny * 8).toFixed(2) + "deg");
      cube.style.setProperty("--pp-ry", (nx * 8).toFixed(2) + "deg");
    }

    window.addEventListener("pointermove", function (ev) {
      if (!document.__ppFeel) return;
      if (drag) {
        var dx = ev.clientX - startX;
        var dy = ev.clientY - startY;
        drag.style.setProperty("--pp-x", (baseX + dx).toFixed(1) + "px");
        drag.style.setProperty("--pp-y", (baseY + dy).toFixed(1) + "px");
        tilt(drag, ev.clientX, ev.clientY);
        return;
      }
      if (ev.pointerType === "touch") return;
      var list = document.querySelectorAll(".pp-cube");
      var i;
      for (i = 0; i < list.length; i++) {
        var cube = list[i];
        var r = cube.getBoundingClientRect();
        var inside = ev.clientX >= r.left && ev.clientX <= r.right &&
          ev.clientY >= r.top && ev.clientY <= r.bottom;
        if (inside) tilt(cube, ev.clientX, ev.clientY);
        else {
          cube.style.setProperty("--pp-rx", "0deg");
          cube.style.setProperty("--pp-ry", "0deg");
        }
      }
    }, { passive: true });

    document.addEventListener("pointerdown", function (ev) {
      if (!document.__ppFeel) return;
      var cube = ev.target.closest && ev.target.closest(".pp-cube");
      if (!cube) return;
      drag = cube;
      startX = ev.clientX;
      startY = ev.clientY;
      baseX = parseFloat(cube.style.getPropertyValue("--pp-x")) || 0;
      baseY = parseFloat(cube.style.getPropertyValue("--pp-y")) || 0;
      cube.classList.add("is-drag");
      try { cube.setPointerCapture(ev.pointerId); } catch (e) {}
    });

    document.addEventListener("pointerup", function () {
      if (drag) drag.classList.remove("is-drag");
      drag = null;
    });
  }

  function bind(theme) {
    var day = document.querySelector("#skin-v2 .day");
    if (day) {
      day.__agaFeel = theme === "agamemnon";
      day.__odFeel = theme === "ordered-dither";
    }
    document.__isoFeel = theme === "isometric-mini";
    document.__polaroidFeel = theme === "polaroid";
    document.__ppFeel = theme === "paper-prism";
    if (theme === "polaroid") bindPolaroid();
    else if (theme === "isometric-mini") bindIso();
    else if (theme === "agamemnon") bindAga();
    else if (theme === "stamp") bindStamp();
    else if (theme === "ordered-dither") bindDither();
    else if (theme === "paper-prism") bindPrism();
  }

  global.RikanFeel = { bind: bind };
})(window);
