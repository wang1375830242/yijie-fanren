/* ==========================================================================
   一介凡人 · 公共工具
   ========================================================================== */
(function () {
  "use strict";

  const XD = (window.XD = window.XD || {});

  /* ---------- 随机 ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  class RNG {
    constructor(seed) {
      this.seed = seed >>> 0;
      this._r = mulberry32(this.seed);
    }
    next() {
      return this._r();
    }
    int(min, max) {
      return Math.floor(this._r() * (max - min + 1)) + min;
    }
    pick(arr) {
      return arr[Math.floor(this._r() * arr.length)];
    }
    chance(p) {
      return this._r() < p;
    }
    weighted(items, key) {
      const w = items.map((it) => (typeof key === "function" ? key(it) : it.w || 1));
      const total = w.reduce((a, b) => a + b, 0);
      let r = this._r() * total;
      for (let i = 0; i < items.length; i++) {
        r -= w[i];
        if (r <= 0) return items[i];
      }
      return items[items.length - 1];
    }
  }

  /* ---------- 本地存储 ---------- */
  const KEY_LIVES = "yijie.lives.v1";
  const KEY_PREFS = "yijie.prefs.v1";
  const KEY_CANDLES = "yijie.candles.v1";

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  const store = {
    lives() {
      const v = read(KEY_LIVES, []);
      return Array.isArray(v) ? v : [];
    },
    addLife(life) {
      const all = store.lives();
      all.unshift(life);
      return write(KEY_LIVES, all.slice(0, 60));
    },
    clearLives() {
      write(KEY_LIVES, []);
    },
    prefs() {
      return read(KEY_PREFS, {});
    },
    setPref(k, v) {
      const p = store.prefs();
      p[k] = v;
      write(KEY_PREFS, p);
    },
    candles() {
      return read(KEY_CANDLES, {});
    },
    light(id) {
      const c = store.candles();
      c[id] = (c[id] || 0) + 1;
      write(KEY_CANDLES, c);
      return c[id];
    },
  };

  /* ---------- 文本 ---------- */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function fmt(n) {
    return Number(n || 0).toLocaleString("zh-CN");
  }

  function el(tag, attrs, html) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach((k) => {
        if (k === "class") node.className = attrs[k];
        else if (k === "text") node.textContent = attrs[k];
        else if (k.startsWith("on")) node.addEventListener(k.slice(2), attrs[k]);
        else node.setAttribute(k, attrs[k]);
      });
    }
    if (html != null) node.innerHTML = html;
    return node;
  }

  /* ---------- 提示 ---------- */
  let stack;
  function toast(msg) {
    if (!stack) {
      stack = el("div", { class: "toast-stack" });
      stack.setAttribute("role", "status");
      stack.setAttribute("aria-live", "polite");
      document.body.appendChild(stack);
    }
    const t = el("div", { class: "toast", text: msg });
    stack.appendChild(t);
    setTimeout(() => {
      t.style.opacity = "0";
      t.style.transition = "opacity 300ms";
      setTimeout(() => t.remove(), 320);
    }, 2200);
  }

  /* ---------- 焦点陷阱 ---------- */
  function trapFocus(container, onEscape) {
    const prev = document.activeElement;
    const list = () =>
      Array.from(
        container.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((x) => x.offsetParent !== null);
    const onKey = (e) => {
      if (e.key === "Escape" && onEscape) {
        e.preventDefault();
        onEscape();
        return;
      }
      if (e.key !== "Tab") return;
      const f = list();
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (prev && typeof prev.focus === "function") {
        try {
          prev.focus();
        } catch (err) {}
      }
    };
  }

  /* ---------- 进场观察 ---------- */
  function reveal(scope) {
    const nodes = (scope || document).querySelectorAll("[data-reveal]");
    if (!nodes.length) return;
    if (!("IntersectionObserver" in window)) {
      nodes.forEach((n) => n.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const d = e.target.dataset.delay;
            if (d) e.target.style.transitionDelay = d + "ms";
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    nodes.forEach((n) => io.observe(n));
  }

  /* ---------- 顶栏 ---------- */
  function nav() {
    const bar = document.querySelector(".nav");
    if (bar) {
      const onScroll = () => bar.classList.toggle("is-solid", window.scrollY > 24);
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }
    const toggle = document.querySelector(".nav-toggle");
    const drawer = document.querySelector(".nav-drawer");
    if (toggle && drawer) {
      toggle.addEventListener("click", () => {
        const open = drawer.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
      document.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        if (!drawer.classList.contains("is-open")) return;
        drawer.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      });
    }
  }

  /* ---------- 主题（三界气候） ---------- */
  function setRealm(kind) {
    document.documentElement.dataset.realm = kind || "human";
  }

  /* ---------- 命盘：三界比例（用于落地页 / 出生页） ---------- */
  const WORLD_ODDS = {
    human: 0.962,
    spirit: 0.037,
    immortal: 0.001,
  };

  XD.util = {
    RNG,
    store,
    esc,
    pad,
    fmt,
    el,
    toast,
    trapFocus,
    reveal,
    nav,
    setRealm,
    WORLD_ODDS,
  };

  document.addEventListener("DOMContentLoaded", () => {
    nav();
    reveal();
  });
})();
