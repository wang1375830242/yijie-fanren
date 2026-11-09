/* ==========================================================================
   蓝图主题 · 逐组件生成
   参考 spec-build：骨架 -> 规格框 -> 内容生成 -> 幽灵光标收束。
   卡片内部拆成小部件，同一水平行由多个光标并行生成。
   ========================================================================== */
(function () {
  "use strict";
  const XD = (window.XD = window.XD || {});
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let instance = null;
  let marked = [];

  const CARD_ROOT = ".realm, .rule, .stele, .fate-slip";
  const CARD_SELECTORS = [
    ".realm > .realm-glyph",
    ".realm h3",
    ".realm .realm-text",
    ".rule > .rule-glyph",
    ".rule h3",
    ".rule > p",
    ".stele .stele-name",
    ".stele .stele-line",
    ".stele .stele-foot",
    ".fate-slip .slip-head",
    ".fate-slip h2",
    ".fate-slip .slip-sub",
    ".fate-slip .world-pick",
    ".fate-slip .slip-cta",
  ];
  const SELECTORS = [
    ".nav .brand",
    ".nav-links > a",
    ".nav .theme-toggle",
    "main .hero-kicker",
    "main .hero-title .line1",
    "main .hero-title .line2",
    "main .hero-lede",
    "main .hero-cta > a",
    "main .hero-note",
    "main .counter",
    "main h2",
    "main h3",
    "main .kicker",
    "main .lede",
    "main .sub",
    "main .btn",
    "main .chip",
    "main .stat",
    "main .card",
    "main .section-lede",
    "main .chapter-no",
    "main .chapter-note",
    "main .rule-quote",
    "main .record-card",
    "main .achievement-card",
    "main .challenge-item",
    "main .lineage-item",
    "main .codex-item",
    "main .wall-stele",
    "main .cl-change",
    "main .history-head",
    "main .history-stats",
    "main .birth-cta > *",
    "main .end-actions .btn",
    "main .life-actions .btn",
    "main .theme-choice",
    "main .record-top",
    "main .record-summary",
    "main .record-actions",
    "main .record-detail-line",
    "main .history-current",
    "main .achievement-head",
    "main .theme-head",
    "main .field",
    "main label",
    "main p",
    "main li",
  ];
  const PRIORITY_SELECTORS = [
    ".hero-kicker",
    ".hero-title .line1",
    ".hero-title .line2",
    ".hero-lede",
    ".hero-cta > a",
    ".hero-note",
  ];

  function visible(el) {
    if (!el || el.hidden) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 16 && rect.height > 12;
  }

  function labelFor(el, index) {
    const raw =
      el.getAttribute("data-build") ||
      el.getAttribute("aria-label") ||
      (el.querySelector("h1,h2,h3") && el.querySelector("h1,h2,h3").textContent) ||
      el.textContent ||
      el.tagName;
    const text = String(raw).replace(/\s+/g, " ").trim().slice(0, 34);
    return `${String(index + 1).padStart(2, "0")} · ${text || el.tagName.toLowerCase()}`;
  }

  function depthOf(el) {
    let depth = 0;
    let node = el;
    while (node && node !== document.documentElement) {
      depth += 1;
      node = node.parentElement;
    }
    return depth;
  }

  function collectTargets() {
    stop(false);
    const seen = new Set();
    const priority = [];
    const candidates = [];

    PRIORITY_SELECTORS.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        if (visible(el) && !seen.has(el)) {
          seen.add(el);
          priority.push(el);
        }
      });
    });

    // 先把卡片拆成真正的小组件，避免一整个卡片被一个指针框住。
    CARD_SELECTORS.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        if (visible(el) && !seen.has(el)) {
          seen.add(el);
          candidates.push(el);
        }
      });
    });

    SELECTORS.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        if (!visible(el) || seen.has(el)) return;
        if (el.closest(CARD_ROOT)) return;
        seen.add(el);
        candidates.push(el);
      });
    });

    candidates.sort((a, b) => depthOf(b) - depthOf(a));
    const selected = priority.slice();
    candidates.forEach((el) => {
      if (selected.some((parent) => parent.contains(el))) return;
      selected.push(el);
    });

    if (selected.length < 3) {
      const main = document.querySelector("main");
      if (main) {
        Array.prototype.forEach.call(main.children, (el) => {
          if (visible(el) && !seen.has(el)) {
            seen.add(el);
            selected.push(el);
          }
        });
      }
    }

    // 按视觉位置从上到下、从左到右排列，同层小组件才能在 _runRow 里并行。
    selected.sort((a, b) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      if (Math.abs(ra.top - rb.top) > 24) return ra.top - rb.top;
      return ra.left - rb.left;
    });

    const groups = new Map();
    const balanced = priority.slice();
    priority.forEach((el) => {
      const group = el.closest("main > section, main > header, .nav") || el.closest("main") || document.body;
      groups.set(group, (groups.get(group) || 0) + 1);
    });
    selected.forEach((el) => {
      if (balanced.includes(el)) return;
      const group = el.closest("main > section, main > header, .nav") || el.closest("main") || document.body;
      const count = groups.get(group) || 0;
      if (count < 50 && balanced.length < 90) {
        groups.set(group, count + 1);
        balanced.push(el);
      }
    });
    selected.forEach((el) => {
      if (balanced.length < 90 && !balanced.includes(el)) balanced.push(el);
    });

    balanced.sort((a, b) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      if (Math.abs(ra.top - rb.top) > 24) return ra.top - rb.top;
      return ra.left - rb.left;
    });

    marked = balanced;
    marked.forEach((el, index) => {
      el.setAttribute("data-spec-build", "");
      el.setAttribute("data-build", labelFor(el, index));
    });
    return marked.length;
  }

  function finish() {
    document.documentElement.classList.add("spec-build-done");
  }

  function start() {
    if (instance) return;
    if (reduce) {
      finish();
      return;
    }
    document.documentElement.classList.remove("spec-build-done");
    if (!window.SpecBuild) {
      finish();
      return;
    }
    if (!collectTargets()) {
      finish();
      return;
    }
    instance = new window.SpecBuild({
      selector: "[data-spec-build]",
      speed: 2.2,
      stepMs: 420,
      startDelay: 300,
      scrollDelay: 180,
      cursorCount: window.innerWidth < 700 ? 4 : 8,
      hud: true,
      hudAgents: 18,
      settle: true,
      settleCorner: "bottom-right",
      autoStart: false,
      parallelRows: true,
      rowTolerance: 22,
      onComplete: finish,
    });
    instance.mount();
    instance.start();
  }

  function stop(clear = true) {
    if (instance) {
      instance.destroy();
      instance = null;
    }
    if (clear) {
      marked.forEach((el) => {
        el.removeAttribute("data-spec-build");
        el.removeAttribute("data-build");
        el.classList.remove("sb-built", "sb-building");
        const parent = el.closest(CARD_ROOT);
        if (parent) parent.classList.remove("sb-parent-visible");
      });
      marked = [];
      document.documentElement.classList.remove("sb-ready");
      document.documentElement.classList.remove("spec-build-done");
    }
  }

  function sync() {
    if (document.documentElement.dataset.theme === "spec") start();
    else stop();
  }

  document.addEventListener("xd:theme", sync);
  window.addEventListener("pagehide", () => stop(false));
  XD.SpecTheme = { start, stop, sync };
  if (document.body) {
    // landing.js 会在 spec-theme.js 之后填充碑林卡片，等一轮脚本执行完再收集目标。
    if (document.documentElement.dataset.theme === "spec") setTimeout(sync, 0);
    else sync();
  } else {
    document.addEventListener("DOMContentLoaded", sync, { once: true });
  }
})();
