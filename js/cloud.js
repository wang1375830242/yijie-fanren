/* ==========================================================================
   LeanCloud REST 适配层
   - 访问统计：SiteVisit / SiteVisitor
   - 公共碑林：HallCandle / HallMessage
   只使用 AppID + AppKey（公开客户端密钥），绝不使用 MasterKey。
   ========================================================================== */
(function () {
  "use strict";
  const XD = (window.XD = window.XD || {});
  const cfg = window.XD_LEAN || {};
  const classes = Object.assign(
    {
      visit: "SiteVisit",
      visitor: "SiteVisitor",
      candle: "HallCandle",
      message: "HallMessage",
    },
    cfg.classes || {}
  );
  const base = String(cfg.serverURL || "").replace(/\/+$/, "");
  const enabled = !!cfg.enabled && !!cfg.appId && !!cfg.appKey && !!base;

  function headers() {
    return {
      "X-LC-Id": cfg.appId,
      "X-LC-Key": cfg.appKey,
      "Content-Type": "application/json",
    };
  }

  async function request(path, options) {
    if (!enabled) throw new Error("LeanCloud 未配置");
    const opts = Object.assign({}, options || {});
    opts.headers = Object.assign({}, headers(), opts.headers || {});
    const res = await fetch(base + path, opts);
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (err) {}
    if (!res.ok) {
      const message = (data && (data.error || data.message)) || `LeanCloud ${res.status}`;
      throw new Error(message);
    }
    return data || {};
  }

  function where(value) {
    return encodeURIComponent(JSON.stringify(value));
  }

  function localDay(date) {
    const d = date || new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function visitorId() {
    const key = "yijie.visitor.v1";
    try {
      let id = localStorage.getItem(key);
      if (!id) {
        id =
          (window.crypto && window.crypto.randomUUID && window.crypto.randomUUID()) ||
          `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
        localStorage.setItem(key, id);
      }
      return id;
    } catch (err) {
      return "";
    }
  }

  function pageKey() {
    const file = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    return file.endsWith(".html") ? file : "index.html";
  }

  function isLocalHost() {
    return /^(localhost|127\.0\.0\.1|::1)$/.test(location.hostname);
  }

  async function count(className, filter) {
    const q = filter ? `?where=${where(filter)}&count=1` : "?count=1";
    const data = await request(`/1.1/classes/${className}${q}`, { method: "GET" });
    return Number(data.count) || 0;
  }

  async function recordVisit() {
    if (!enabled || !cfg.trackLocal && isLocalHost()) return;
    if (pageKey() === "stats.html") return;
    const visitor = visitorId();
    if (!visitor) return;
    const page = pageKey();
    const day = localDay();
    const visit = request(`/1.1/classes/${classes.visit}`, {
      method: "POST",
      body: JSON.stringify({ visitor, page, day }),
      keepalive: true,
    }).catch(() => {});
    const existing = await request(
      `/1.1/classes/${classes.visitor}?where=${where({ visitor })}&limit=1`,
      { method: "GET" }
    ).catch(() => null);
    if (existing && existing.results && existing.results.length) {
      const obj = existing.results[0];
      await request(`/1.1/classes/${classes.visitor}/${obj.objectId}`, {
        method: "PUT",
        body: JSON.stringify({
          lastDay: day,
          page,
          visits: { __op: "Increment", amount: 1 },
        }),
      }).catch(() => {});
    } else {
      await request(`/1.1/classes/${classes.visitor}`, {
        method: "POST",
        body: JSON.stringify({ visitor, firstDay: day, lastDay: day, page, visits: 1 }),
      }).catch(() => {});
    }
    await visit;
  }

  async function stats() {
    const today = localDay();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(localDay(d));
    }
    const pageNames = ["index.html", "play.html", "hall.html", "codex.html", "about.html", "changelog.html", "404.html"];
    const [total, unique, todayCount] = await Promise.all([
      count(classes.visit),
      count(classes.visitor),
      count(classes.visit, { day: today }),
    ]);
    const dayCounts = await Promise.all(days.map((day) => count(classes.visit, { day })));
    const pageCounts = await Promise.all(pageNames.map((page) => count(classes.visit, { page })));
    return {
      total,
      unique,
      today: todayCount,
      days: days.map((day, i) => ({ day, count: dayCounts[i] })),
      pages: pageNames.map((page, i) => ({ page, count: pageCounts[i] })),
    };
  }

  async function hallLoad() {
    const [candles, messages] = await Promise.all([
      request(`/1.1/classes/${classes.candle}?limit=1000`, { method: "GET" }),
      request(`/1.1/classes/${classes.message}?limit=1000&order=-createdAt`, { method: "GET" }),
    ]);
    const candleMap = {};
    (candles.results || []).forEach((row) => {
      if (row.stele) candleMap[row.stele] = Number(row.count) || 0;
    });
    const messageMap = {};
    (messages.results || []).forEach((row) => {
      if (!row.stele) return;
      if (!messageMap[row.stele]) messageMap[row.stele] = [];
      messageMap[row.stele].push({ text: row.text || "", createdAt: row.createdAt || "" });
    });
    Object.keys(messageMap).forEach((id) => {
      messageMap[id] = messageMap[id].slice(-20).map((x) => x.text);
    });
    return { candles: candleMap, messages: messageMap };
  }

  function rateLimit(key, ms) {
    const k = `yijie.rate.${key}`;
    try {
      const last = Number(localStorage.getItem(k)) || 0;
      if (Date.now() - last < ms) return false;
      localStorage.setItem(k, String(Date.now()));
      return true;
    } catch (err) {
      return true;
    }
  }

  async function hallLight(id) {
    if (!rateLimit(`candle:${id}`, 1800)) throw new Error("点灯太快了");
    const found = await request(
      `/1.1/classes/${classes.candle}?where=${where({ stele: id })}&limit=1`,
      { method: "GET" }
    );
    const row = found.results && found.results[0];
    if (row) {
      await request(`/1.1/classes/${classes.candle}/${row.objectId}`, {
        method: "PUT",
        body: JSON.stringify({ count: { __op: "Increment", amount: 1 } }),
      });
      return { count: (Number(row.count) || 0) + 1 };
    }
    await request(`/1.1/classes/${classes.candle}`, {
      method: "POST",
      body: JSON.stringify({ stele: id, count: 1 }),
    });
    return { count: 1 };
  }

  async function hallMessage(id, text) {
    const clean = String(text || "").replace(/\s+/g, " ").trim().slice(0, 40);
    if (!clean) throw new Error("留言为空");
    if (!rateLimit(`message:${id}`, 10000)) throw new Error("留言太快了");
    await request(`/1.1/classes/${classes.message}`, {
      method: "POST",
      body: JSON.stringify({ stele: id, text: clean }),
    });
    const rows = await request(
      `/1.1/classes/${classes.message}?where=${where({ stele: id })}&limit=20&order=-createdAt`,
      { method: "GET" }
    );
    return (rows.results || []).slice().reverse().map((row) => row.text || "");
  }

  XD.cloud = {
    enabled,
    config: cfg,
    recordVisit,
    stats,
    hall: {
      load: hallLoad,
      light: hallLight,
      message: hallMessage,
    },
  };

  if (enabled) {
    document.addEventListener("DOMContentLoaded", () => {
      void recordVisit();
    });
  }
})();
