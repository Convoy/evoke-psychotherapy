/* evoke psychotherapy — static site behaviour.
   Replaces the editor runtime: nav, sticky header, parallax, reveals,
   FAQ accordion, parking-map hotspots, consult-form prefill. */
(function () {
  "use strict";
  var reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- mobile nav ------------------------------------------------------- */
  var toggle = document.querySelector("[data-nav-toggle]");
  var panel = document.getElementById("site-nav-panel");
  function setNav(open) {
    if (!toggle || !panel) return;
    panel.classList.toggle("open", open);
    toggle.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  }
  if (toggle && panel) {
    toggle.addEventListener("click", function () {
      setNav(!panel.classList.contains("open"));
    });
    panel.addEventListener("click", function (e) {
      if (e.target.closest("a")) setNav(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setNav(false);
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth >= 900) setNav(false);
    });
  }

  /* ---- sticky header + parallax ---------------------------------------- */
  var header = document.querySelector(".site-header");
  var parallax = document.querySelectorAll("[data-parallax]");
  var compact = false, raf = 0;
  function onScroll() {
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      var y = window.scrollY || 0;
      var next = compact ? y > 24 : y > 96;
      if (next !== compact) {
        compact = next;
        if (header) header.classList.toggle("compact", compact);
      }
      if (!reduced && parallax.length) {
        var h = window.innerHeight;
        for (var i = 0; i < parallax.length; i++) {
          var el = parallax[i], r = el.getBoundingClientRect();
          if (r.bottom < -200 || r.top > h + 200) continue;
          var k = parseFloat(el.getAttribute("data-parallax")) || 0.08;
          var mid = r.top + r.height / 2 - h / 2;
          el.style.transform = "translate3d(0," + (-mid * k).toFixed(1) + "px,0)";
        }
      }
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---- reveal on scroll ------------------------------------------------ */
  if (!reduced && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.style.opacity = "1";
        e.target.style.transform = "none";
        io.unobserve(e.target);
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -5% 0px" });
    var vh = window.innerHeight;
    Array.prototype.forEach.call(document.querySelectorAll("[data-reveal]"), function (el, i) {
      if (el.getBoundingClientRect().top < vh * 0.9) return;
      var d = (i % 3) * 80;
      el.style.opacity = "0";
      el.style.transform = "translateY(24px)";
      el.style.transition = "opacity .7s cubic-bezier(.22,.61,.36,1) " + d + "ms, transform .75s cubic-bezier(.22,.61,.36,1) " + d + "ms";
      io.observe(el);
    });
  }

  /* ---- FAQ accordion (one row open at a time) -------------------------- */
  var rows = document.querySelectorAll("[data-faq]");
  function setRow(row, open) {
    var btn = row.querySelector("[data-faq-toggle]");
    var body = row.querySelector("[data-faq-body]");
    var sign = row.querySelector("[data-faq-sign]");
    if (!btn || !body) return;
    if (open) body.removeAttribute("hidden"); else body.setAttribute("hidden", "");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    if (sign) sign.textContent = open ? "\u2212" : "+";
  }
  Array.prototype.forEach.call(rows, function (row) {
    var btn = row.querySelector("[data-faq-toggle]");
    var body = row.querySelector("[data-faq-body]");
    if (!btn || !body) return;
    btn.addEventListener("click", function () {
      var open = body.hasAttribute("hidden");
      Array.prototype.forEach.call(rows, function (r) { if (r !== row) setRow(r, false); });
      setRow(row, open);
    });
  });

  /* ---- parking map hotspots -------------------------------------------- */
  var map = document.querySelector("[data-map]");
  if (map) {
    var pinned = null;
    function show(k) { if (k) map.setAttribute("data-active", k); else map.removeAttribute("data-active"); }
    function zoneOf(el) { return el && el.closest ? el.closest("[data-zone],[data-card]") : null; }
    function keyOf(el) { return el.getAttribute("data-zone") || el.getAttribute("data-card"); }
    map.addEventListener("mouseover", function (e) {
      var t = zoneOf(e.target);
      if (t) show(keyOf(t)); else if (!pinned) show(null);
    });
    map.addEventListener("mouseleave", function () { show(pinned); });
    map.addEventListener("focusin", function (e) {
      var t = zoneOf(e.target);
      if (t) show(keyOf(t));
    });
    map.addEventListener("click", function (e) {
      var t = e.target.closest("[data-zone]");
      if (!t) return;
      var k = keyOf(t);
      pinned = pinned === k ? null : k;
      show(pinned || k);
    });
    map.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      var t = e.target.closest("[data-zone]");
      if (!t) return;
      e.preventDefault();
      var k = keyOf(t);
      pinned = pinned === k ? null : k;
      show(pinned || k);
    });
  }

  /* ---- consult form: preselect therapist, settle the jump -------------- */
  var sel = document.querySelector('select[name="therapist"]');
  if (sel) {
    var want = "";
    try { want = new URLSearchParams(location.search).get("therapist") || ""; } catch (e) {}
    if (want) {
      var key = function (v) { return v.split(",")[0].trim().toLowerCase(); };
      for (var i = 0; i < sel.options.length; i++) {
        if (key(sel.options[i].text) === key(want)) { sel.selectedIndex = i; break; }
      }
    }
  }
  if (location.hash === "#consult") {
    var target = document.getElementById("consult");
    if (target) {
      var stop = false;
      ["wheel", "touchstart", "keydown", "pointerdown"].forEach(function (ev) {
        window.addEventListener(ev, function () { stop = true; }, { once: true, passive: true });
      });
      var settle = function () {
        var top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - 84);
        if (Math.abs(window.scrollY - top) > 4) {
          window.scrollTo({ top: top, behavior: reduced ? "auto" : "smooth" });
          return false;
        }
        return true;
      };
      var tries = 0;
      var tick = function () {
        if (stop || ++tries > 24 || settle()) return;
        setTimeout(tick, 250);
      };
      requestAnimationFrame(function () { requestAnimationFrame(function () { settle(); setTimeout(tick, 250); }); });
      window.addEventListener("load", function () { setTimeout(function () { if (!stop) settle(); }, 120); }, { once: true });
    }
  }
  /* ---- home clinician gallery ------------------------------------------ */
  var gal = document.querySelector("[data-gallery]");
  if (gal) {
    var gPhotos = gal.querySelectorAll("[data-gal-photo]");
    var gCaps = gal.querySelectorAll("[data-gal-cap]");
    var gBtns = gal.querySelectorAll("[data-gal-btn]");
    var gCur = 0;
    var setGal = function (n) {
      if (n === gCur || n < 0 || n >= gBtns.length) return;
      gCur = n;
      Array.prototype.forEach.call(gPhotos, function (el, i) { el.style.opacity = i === n ? "1" : "0"; });
      Array.prototype.forEach.call(gCaps, function (el, i) { el.style.display = i === n ? "block" : "none"; });
      Array.prototype.forEach.call(gBtns, function (el, i) {
        var on = i === n;
        el.style.borderColor = on ? "var(--color-accent)" : "color-mix(in srgb,var(--color-text) 16%,transparent)";
        el.style.background = on ? "var(--color-bg)" : "transparent";
        el.setAttribute("aria-pressed", on ? "true" : "false");
        var img = el.querySelector("img");
        if (img) img.style.opacity = on ? "1" : "0.72";
      });
    };
    Array.prototype.forEach.call(gBtns, function (el, i) {
      el.addEventListener("click", function () { setGal(i); });
      el.addEventListener("mouseenter", function () { setGal(i); });
      el.addEventListener("focus", function () { setGal(i); });
    });
  }

})();
