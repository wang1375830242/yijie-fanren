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
      this.state = this.seed;
      this.calls = 0;
    }
    next() {
      let a = this.state | 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      this.state = a;
      this.calls = (this.calls || 0) + 1;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    int(min, max) {
      return Math.floor(this.next() * (max - min + 1)) + min;
    }
    pick(arr) {
      return arr[Math.floor(this.next() * arr.length)];
    }
    chance(p) {
      return this.next() < p;
    }
    weighted(items, key) {
      const w = items.map((it) => (typeof key === "function" ? key(it) : it.w || 1));
      const total = w.reduce((a, b) => a + b, 0);
      let r = this.next() * total;
      for (let i = 0; i < items.length; i++) {
        r -= w[i];
        if (r <= 0) return items[i];
      }
      return items[items.length - 1];
    }
    getState() {
      return { state: this.state >>> 0, calls: this.calls || 0 };
    }
    setState(snapshot) {
      if (!snapshot) return this;
      this.state = (Number(snapshot.state) || this.seed) >>> 0;
      this.calls = Number(snapshot.calls) || 0;
      return this;
    }
  }

  /* ---------- 本地存储 ---------- */
  const KEY_LIVES = "yijie.lives.v1";
  const KEY_PREFS = "yijie.prefs.v1";
  const KEY_CANDLES = "yijie.candles.v1";
  const KEY_LEGACY = "yijie.legacy.v1";
  const KEY_RUN = "yijie.run.v1";
  const KEY_LINEAGE = "yijie.lineage.v1";
  const KEY_STELES = "yijie.steles.v1";

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
    setLives(lives) {
      return write(KEY_LIVES, Array.isArray(lives) ? lives.slice(0, 60) : []);
    },
    clearLives() {
      write(KEY_LIVES, []);
    },
    legacy() {
      const v = read(KEY_LEGACY, null);
      return v && typeof v === "object" ? v : null;
    },
    setLegacy(legacy) {
      return write(KEY_LEGACY, legacy);
    },
    markLegacyUsed(seed) {
      const legacy = store.legacy();
      if (!legacy) return false;
      legacy.usedBy = seed >>> 0;
      return write(KEY_LEGACY, legacy);
    },
    clearLegacy() {
      write(KEY_LEGACY, null);
    },
    run() {
      const v = read(KEY_RUN, null);
      return v && typeof v === "object" ? v : null;
    },
    setRun(run) {
      return write(KEY_RUN, run);
    },
    clearRun() {
      write(KEY_RUN, null);
    },
    lineage() {
      const v = read(KEY_LINEAGE, null);
      if (v && v.v === 1 && Array.isArray(v.entries)) return v;
      const lives = store.lives();
      return {
        v: 1,
        total: lives.length,
        streak: lives.length,
        bestStreak: lives.length,
        entries: [],
      };
    },
    setLineage(lineage) {
      return write(KEY_LINEAGE, lineage);
    },
    addLineage(entry) {
      const lineage = store.lineage();
      const no = Number(entry.no) || (Number(lineage.total) || 0) + 1;
      const item = Object.assign({}, entry, {
        no,
        lifeKey: entry.lifeKey || `life-${entry.seed || "unknown"}-${Date.now()}`,
      });
      lineage.v = 1;
      lineage.total = Math.max(Number(lineage.total) || 0, no);
      lineage.streak = Math.max(Number(lineage.streak) || 0, no);
      lineage.bestStreak = Math.max(Number(lineage.bestStreak) || 0, lineage.streak);
      lineage.entries = [item].concat(lineage.entries || []).slice(0, 20);
      return write(KEY_LINEAGE, lineage) ? lineage : null;
    },
    clearLineage() {
      write(KEY_LINEAGE, null);
    },
    steles() {
      const v = read(KEY_STELES, []);
      return Array.isArray(v) ? v : [];
    },
    markStele(id) {
      const list = store.steles();
      if (!list.includes(id)) {
        list.push(id);
        write(KEY_STELES, list);
      }
      return list.length;
    },
    setSteles(ids) {
      const list = Array.isArray(ids) ? ids.filter((id) => typeof id === "string") : [];
      return write(KEY_STELES, Array.from(new Set(list)));
    },
    clearSteles() {
      write(KEY_STELES, []);
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
    setCandles(candles) {
      const out = Object.create(null);
      if (candles && typeof candles === "object") {
        Object.keys(candles).forEach((id) => {
          if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return;
          if (id === "__proto__" || id === "constructor" || id === "prototype") return;
          const n = Math.max(0, Math.floor(Number(candles[id]) || 0));
          if (n) out[id] = n;
        });
      }
      return write(KEY_CANDLES, out);
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
  function setupNavMore(bar) {
    const links = bar.querySelector(".nav-links");
    if (!links || links.querySelector(".nav-more")) return;
    const more = document.createElement("div");
    more.className = "nav-more";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "nav-more-toggle";
    button.textContent = "更多";
    button.setAttribute("aria-haspopup", "true");
    button.setAttribute("aria-expanded", "false");
    const menu = document.createElement("div");
    menu.className = "nav-more-menu";
    menu.hidden = true;
    ["a[href=\"changelog.html\"]", "a[href=\"about.html\"]", "a[href=\"support.html\"]"].forEach((selector) => {
      const link = links.querySelector(selector);
      if (link) menu.appendChild(link);
    });
    if (!menu.children.length) return;
    more.appendChild(button);
    more.appendChild(menu);
    const cta = links.querySelector(".nav-cta");
    links.insertBefore(more, cta || null);
    const account = links.querySelector('a[href="account.html"]');
    if (account) links.appendChild(account);
    const close = () => {
      menu.hidden = true;
      button.setAttribute("aria-expanded", "false");
    };
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const open = menu.hidden;
      menu.hidden = !open;
      button.setAttribute("aria-expanded", open ? "true" : "false");
    });
    menu.addEventListener("click", () => close());
    document.addEventListener("click", (event) => {
      if (!more.contains(event.target)) close();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") close();
    });
  }

  function updateAccountNavLabel() {
    const session = authSession();
    const label = session && session.user ? (session.user.displayName || session.user.username || "账号") : "账号";
    document.querySelectorAll('a[href="account.html"]').forEach((link) => {
      if (!link.closest(".nav-links, .nav-drawer")) return;
      link.textContent = label;
      link.title = session ? `账号 · ${label}` : "账号";
      link.classList.toggle("account-nav", !!session);
    });
  }

  function nav() {
    const bar = document.querySelector(".nav");
    const accountLink = document.createElement("a");
    accountLink.href = "account.html";
    accountLink.textContent = "账号";
    const supportLink = document.createElement("a");
    supportLink.href = "support.html";
    supportLink.textContent = "赞助";
    if (bar) {
      const links = bar.querySelector(".nav-links");
      if (links && !links.querySelector('a[href="account.html"]')) links.insertBefore(accountLink.cloneNode(true), links.querySelector(".nav-cta") || null);
      if (links && !links.querySelector('a[href="support.html"]')) links.insertBefore(supportLink.cloneNode(true), links.querySelector(".nav-cta") || null);
    }
    const accountDrawer = document.querySelector(".nav-drawer");
    if (accountDrawer && !accountDrawer.querySelector('a[href="account.html"]')) accountDrawer.appendChild(accountLink);
    if (accountDrawer && !accountDrawer.querySelector('a[href="support.html"]')) accountDrawer.appendChild(supportLink);
    if (bar) setupNavMore(bar);
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
    updateAccountNavLabel();
  }

  /* ---------- 主题（三界气候） ---------- */
  function setRealm(kind) {
    document.documentElement.dataset.realm = kind || "human";
  }

  /* ---------- 主题与字体 ---------- */
  const FONT_OPTIONS = [
    { key: "serif", label: "宋体", note: "默认 · 纸面阅读" },
    { key: "kai", label: "楷体", note: "手稿 · 题签感" },
    { key: "fangsong", label: "仿宋", note: "古卷 · 清瘦" },
    { key: "sans", label: "黑体", note: "清爽 · 易读" },
  ];

  function normalizeFont(font) {
    return FONT_OPTIONS.some((item) => item.key === font) ? font : "serif";
  }

  function applyFont(font) {
    const key = normalizeFont(font);
    document.documentElement.dataset.font = key;
    document.querySelectorAll("[data-font-choice]").forEach((button) => {
      const active = button.dataset.fontChoice === key;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    document.dispatchEvent(new CustomEvent("xd:font", { detail: { font: key } }));
  }

  function currentTheme() {
    return document.documentElement.dataset.theme === "day" ? "day" : "night";
  }

  function currentFont() {
    const prefs = store.prefs();
    return normalizeFont(prefs.font);
  }

  function applyTheme(mode) {
    const day = mode === "day";
    const root = document.documentElement;
    root.dataset.theme = day ? "day" : "night";
    root.style.colorScheme = day ? "light" : "dark";
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", day ? "#f7f4ec" : "#0b0f0b");
    document.dispatchEvent(new CustomEvent("xd:theme", { detail: { theme: day ? "day" : "night" } }));
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.textContent = "主题";
      button.setAttribute("aria-label", "主题与字体设置");
      button.setAttribute("aria-haspopup", "dialog");
    });
    document.querySelectorAll("[data-theme-choice]").forEach((button) => {
      const active = button.dataset.themeChoice === (day ? "day" : "night");
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function setTheme(mode) {
    applyTheme(mode);
    store.setPref("theme", mode === "day" ? "day" : "night");
  }

  function setFont(font) {
    const key = normalizeFont(font);
    applyFont(key);
    store.setPref("font", key);
  }

  let themeOverlay = null;
  let releaseThemeTrap = null;

  function closeThemePanel() {
    if (!themeOverlay) return;
    themeOverlay.hidden = true;
    if (releaseThemeTrap) {
      releaseThemeTrap();
      releaseThemeTrap = null;
    }
  }

  function ensureThemePanel() {
    if (themeOverlay) return themeOverlay;
    themeOverlay = document.createElement("div");
    themeOverlay.className = "theme-overlay";
    themeOverlay.hidden = true;
    themeOverlay.innerHTML = `
      <section class="theme-sheet" role="dialog" aria-modal="true" aria-labelledby="themeTitle">
        <header class="theme-head">
          <div>
            <p class="theme-kicker">观感 · 阅读</p>
            <h2 id="themeTitle">主题与字体</h2>
          </div>
          <button class="theme-close" type="button" data-theme-close aria-label="关闭主题设置">×</button>
        </header>
        <div class="theme-section">
          <p class="theme-label">明暗</p>
          <div class="theme-grid theme-grid--two">
            <button class="theme-choice" type="button" data-theme-choice="night" aria-pressed="true">
              <b>夜间</b><span>墨色 · 玉光</span>
            </button>
            <button class="theme-choice" type="button" data-theme-choice="day" aria-pressed="false">
              <b>日间</b><span>暖白 · 纸面</span>
            </button>
          </div>
        </div>
        <div class="theme-section">
          <p class="theme-label">正文字体</p>
          <div class="theme-grid theme-grid--font">
            ${FONT_OPTIONS.map(
              (item) =>
                `<button class="font-choice font-choice--${item.key}" type="button" data-font-choice="${item.key}" aria-pressed="false">
                  <span class="font-sample">一介凡人</span>
                  <b>${item.label}</b>
                  <span>${item.note}</span>
                </button>`
            ).join("")}
          </div>
          <p class="theme-note">字体来自系统已安装字体，不加载外部字体文件。</p>
        </div>
        <p class="theme-status" data-theme-status aria-live="polite"></p>
      </section>`;
    document.body.appendChild(themeOverlay);
    themeOverlay.querySelectorAll("[data-theme-choice]").forEach((button) => {
      button.addEventListener("click", () => {
        setTheme(button.dataset.themeChoice);
        const status = themeOverlay.querySelector("[data-theme-status]");
        if (status) status.textContent = `已切换到${button.dataset.themeChoice === "day" ? "日间" : "夜间"}主题。`;
      });
    });
    themeOverlay.querySelectorAll("[data-font-choice]").forEach((button) => {
      button.addEventListener("click", () => {
        setFont(button.dataset.fontChoice);
        const status = themeOverlay.querySelector("[data-theme-status]");
        if (status) status.textContent = `正文字体已切换为${FONT_OPTIONS.find((item) => item.key === button.dataset.fontChoice).label}。`;
      });
    });
    themeOverlay.querySelector("[data-theme-close]").addEventListener("click", closeThemePanel);
    themeOverlay.addEventListener("click", (event) => {
      if (event.target === themeOverlay) closeThemePanel();
    });
    return themeOverlay;
  }

  function openThemePanel() {
    const overlay = ensureThemePanel();
    applyTheme(currentTheme());
    applyFont(currentFont());
    overlay.hidden = false;
    const status = overlay.querySelector("[data-theme-status]");
    if (status) status.textContent = "选择明暗与正文字体，设置会保存在本机。";
    releaseThemeTrap = trapFocus(overlay.querySelector(".theme-sheet"), closeThemePanel);
    const first = overlay.querySelector("[data-theme-choice].is-active") || overlay.querySelector("[data-theme-close]");
    if (first) first.focus();
  }

  function toggleTheme() {
    setTheme(currentTheme() === "day" ? "night" : "day");
  }

  function theme() {
    if (!document.querySelector(".theme-fab")) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.themeToggle = "true";
      button.className = "theme-toggle theme-fab";
      button.addEventListener("click", openThemePanel);
      document.body.appendChild(button);
    }
    applyTheme(currentTheme());
    applyFont(currentFont());
    window.addEventListener("storage", (event) => {
      if (event.key !== "yijie.prefs.v1") return;
      try {
        const prefs = JSON.parse(event.newValue || "{}");
        applyTheme(prefs.theme === "day" ? "day" : "night");
        applyFont(prefs.font);
      } catch (err) {}
    });
  }

  /* ---------- 命盘：三界比例（用于落地页 / 出生页） ---------- */
  const WORLD_ODDS = {
    human: 0.962,
    spirit: 0.037,
    immortal: 0.001,
  };

  const AUTH_KEY = "yijie.auth.v1";
  const API_BASE = typeof location !== "undefined" && location.hostname === "wang1375830242.github.io" ? "https://192.144.150.24" : "";
  function authSession() {
    try {
      const raw = JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
      return raw && typeof raw.token === "string" && raw.token ? raw : null;
    } catch (err) { return null; }
  }
  function setAuthSession(session) {
    if (!session || !session.token) { try { localStorage.removeItem(AUTH_KEY); } catch (err) {} return null; }
    try { localStorage.setItem(AUTH_KEY, JSON.stringify(session)); } catch (err) {}
    updateAccountNavLabel();
    return session;
  }
  function clearAuthSession() {
    try { localStorage.removeItem(AUTH_KEY); } catch (err) {}
    updateAccountNavLabel();
  }
  async function authFetch(path, options) {
    const session = authSession();
    const headers = Object.assign({}, (options && options.headers) || {});
    if (session) headers.Authorization = "Bearer " + session.token;
    return fetch(API_BASE + path, Object.assign({}, options || {}, { headers }));
  }

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
    applyTheme,
    applyFont,
    setFont,
    openThemePanel,
    toggleTheme,
    WORLD_ODDS,
    auth: { session: authSession, setSession: setAuthSession, clear: clearAuthSession, apiBase: API_BASE, fetch: authFetch },
  };

  function trackVisit() {
    if (!/^https?:$/.test(location.protocol)) return;
    if (/^\/stats(\/|$)/.test(location.pathname)) return;
    const path = (location.pathname.replace(/^\/yijie-fanren(?=\/|$)/, "") || "/").replace(/\/+$/, "") || "/";
    const known = new Set(["/", "/index.html", "/play.html", "/hall.html", "/guestbook.html", "/codex.html", "/changelog.html", "/about.html"]);
    if (!known.has(path)) return;
    const apiBase = location.hostname === "wang1375830242.github.io" ? "https://192.144.150.24" : "";
    try {
      fetch(apiBase + "/api/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
        keepalive: true,
        credentials: "omit",
        mode: "cors",
      }).catch(() => {});
    } catch (err) {}
  }

  /* ---------- 账号（GitHub Pages 跨站 Token 方案） ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    nav();
    theme();
    reveal();
    trackVisit();
  });
})();
