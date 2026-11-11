/* ==========================================================================
   开发投入展示
   数据来自本地开发工作台，支持离线内嵌值与在线 JSON 刷新，不参与访客统计。
   ========================================================================== */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const fallback = { rounds: 240, steps: 5954, tokens: "2,267M", updated: "2026-11-11", autoRefreshSeconds: 15 };

  function fmt(value) {
    if (typeof value === "number") return new Intl.NumberFormat("zh-CN").format(value);
    return String(value == null ? "—" : value);
  }

  async function load() {
    let data = window.XD_DEV_USAGE || fallback;
    if (location.protocol !== "file:") {
      try {
        const res = await fetch("assets/dev-usage.json", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          if (json && typeof json === "object") data = Object.assign({}, fallback, json);
        }
      } catch (err) {}
    }
    $("metricRounds").textContent = fmt(data.rounds);
    $("metricSteps").textContent = fmt(data.steps);
    $("metricTokens").textContent = fmt(data.tokens);
    $("metricsFoot").textContent = "自动刷新 · 更新于 " + (data.updated || "—") + "。" + (data.note || "");
  }

  load();
  window.setInterval(() => {
    if (!document.hidden) load();
  }, Math.max(5, Number(fallback.autoRefreshSeconds) || 15) * 1000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) load();
  });
})();
