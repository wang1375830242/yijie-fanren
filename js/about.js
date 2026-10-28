/* ==========================================================================
   关于 · 数据操作
   ========================================================================== */
(function () {
  "use strict";
  const XD = window.XD;
  const U = XD.util;
  const $ = (id) => document.getElementById(id);

  function refresh() {
    const n = U.store.lives().length;
    const run = U.store.run();
    const lineage = U.store.lineage();
    $("dataCount").textContent = `目前本机存有 ${n} 段人生${lineage.total ? `，谱系累计 ${lineage.total} 世` : ""}。${run ? "有一段未完成的人生可继续。" : ""}`;
  }

  function cleanLife(life) {
    if (!life || typeof life !== "object") return null;
    const seed = Number.isFinite(Number(life.seed)) ? Number(life.seed) : "unknown";
    const fallbackTs = Number.isFinite(Number(life.ts)) ? Number(life.ts) : Date.now();
    const id = String(life.id || life.lifeKey || `life-${seed}-${fallbackTs}`)
      .replace(/[^A-Za-z0-9_-]/g, "")
      .slice(0, 64);
    if (!id) return null;
    const deeds = Array.isArray(life.deeds)
      ? life.deeds.slice(0, 80).map((deed) => ({
          age: Number.isFinite(Number(deed && deed.age))
            ? Math.max(0, Math.floor(Number(deed.age)))
            : 0,
          text: String((deed && deed.text) || "").slice(0, 240),
        })).filter((deed) => deed.text)
      : [];
    return Object.assign({}, life, {
      id,
      age: Number.isFinite(Number(life.age)) ? Math.max(0, Math.floor(Number(life.age))) : 0,
      name: String(life.name || "无名").slice(0, 40),
      realm: String(life.realm || "凡人").slice(0, 40),
      epitaph: String(life.epitaph || "").slice(0, 160),
      deeds,
    });
  }

  function cleanLegacy(legacy) {
    if (!legacy || typeof legacy !== "object" || legacy.v !== 1) return null;
    const finite = (value, fallback = 0) =>
      Number.isFinite(Number(value)) ? Math.max(-1000, Math.min(100000, Number(value))) : fallback;
    const source = legacy.source && typeof legacy.source === "object" ? legacy.source : {};
    return {
      v: 1,
      depth: Math.max(0, Math.min(100, Math.floor(finite(legacy.depth, 1)))),
      rootKey: typeof legacy.rootKey === "string" ? legacy.rootKey.slice(0, 20) : null,
      rootName: typeof legacy.rootName === "string" ? legacy.rootName.slice(0, 40) : "",
      insight: finite(legacy.insight),
      stones: finite(legacy.stones),
      karma: finite(legacy.karma),
      ward: Math.max(0, Math.min(2, Math.floor(finite(legacy.ward)))),
      source: {
        name: String(source.name || "").slice(0, 40),
        realm: String(source.realm || "").slice(0, 40),
        partnerName: String(source.partnerName || "").slice(0, 40),
        sectName: String(source.sectName || "").slice(0, 40),
      },
    };
  }

  function cleanRun(run) {
    if (!run || run.v !== 1 || typeof run.seed !== "number" || !run.state) return null;
    const st = run.state;
    if (!st.origin || !st.root || !Number.isFinite(Number(st.age)) || !Number.isFinite(Number(st.tier))) return null;
    if (!Array.isArray(st.log) || !Array.isArray(st.history)) return null;
    return run;
  }

  function mergeLives(incoming) {
    if (!Array.isArray(incoming)) return { added: 0, dropped: 0 };
    const current = U.store.lives();
    const seen = new Set(current.map((life) => life.id || `life-${life.seed}`));
    const accepted = [];
    for (const raw of incoming) {
      const life = cleanLife(raw);
      if (!life) continue;
      if (seen.has(life.id)) continue;
      seen.add(life.id);
      accepted.push(life);
    }
    const merged = accepted.concat(current).slice(0, 60);
    U.store.setLives(merged);
    const added = accepted.filter((life) => merged.includes(life)).length;
    return { added, dropped: accepted.length - added };
  }

  function mergeCandles(incoming) {
    if (!incoming || typeof incoming !== "object") return;
    const current = U.store.candles() || {};
    Object.keys(incoming).forEach((id) => {
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return;
      if (id === "__proto__" || id === "constructor" || id === "prototype") return;
      const n = Math.max(0, Math.floor(Number(incoming[id]) || 0));
      if (!n) return;
      current[id] = Math.max(Number(current[id]) || 0, n);
    });
    if (U.store.setCandles) U.store.setCandles(current);
  }

  function mergeLineage(incoming) {
    if (!incoming || incoming.v !== 1) return;
    const incomingEntries = Array.isArray(incoming.entries) ? incoming.entries : [];
    const current = U.store.lineage();
    const byKey = new Map();
    [...(current.entries || []), ...incomingEntries].forEach((entry) => {
      if (!entry || typeof entry !== "object") return;
      const key = entry.lifeKey || `no:${entry.no}`;
      if (!byKey.has(key)) byKey.set(key, entry);
    });
    const entries = Array.from(byKey.values())
      .sort((a, b) => (Number(b.no) || 0) - (Number(a.no) || 0))
      .slice(0, 20);
    const total = Math.max(
      Number(current.total) || 0,
      Number(incoming.total) || 0,
      ...entries.map((entry) => Number(entry.no) || 0)
    );
    const streak = Math.max(Number(current.streak) || 0, Number(incoming.streak) || 0);
    U.store.setLineage({
      v: 1,
      total,
      streak,
      bestStreak: Math.max(Number(current.bestStreak) || 0, Number(incoming.bestStreak) || 0, streak),
      entries,
    });
  }

  function mergeSteles(incoming) {
    if (!Array.isArray(incoming)) return;
    const valid = incoming
      .filter((id) => typeof id === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(id));
    U.store.setSteles([...(U.store.steles() || []), ...valid]);
  }

  $("btnClear").addEventListener("click", () => {
    if (!confirm("清空本机所有人生记录、未完成的一世与道果？这个操作不能撤销。")) return;
    U.store.clearLives();
    U.store.clearLegacy();
    U.store.clearRun();
    U.store.clearLineage();
    U.store.clearSteles();
    ["yijie.messages.v1", "yijie.candles.v1", "yijie.visitor.v1"].forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch (e) {}
    });
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("yijie.visit.v1:") || k.startsWith("yijie.rate."))
        .forEach((k) => localStorage.removeItem(k));
    } catch (e) {}
    U.toast("都清干净了");
    refresh();
  });

  $("btnExport").addEventListener("click", () => {
    const data = {
      version: 3,
      lives: U.store.lives(),
      candles: U.store.candles(),
      legacy: U.store.legacy(),
      run: U.store.run(),
      lineage: U.store.lineage(),
      steles: U.store.steles(),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "一介凡人-人生记录.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    U.toast("已导出");
  });

  $("btnImport").addEventListener("click", () => {
    $("importFile").click();
  });

  $("importFile").addEventListener("change", async () => {
    const input = $("importFile");
    const file = input.files && input.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || typeof data !== "object") throw new Error("不是有效的人生记录");
      const lives = Array.isArray(data.lives) ? data.lives : [];
      const merged = mergeLives(lives);
      const importedLegacy = cleanLegacy(data.legacy);
      if (importedLegacy && !U.store.legacy()) U.store.setLegacy(importedLegacy);
      mergeLineage(data.lineage);
      mergeSteles(data.steles);
      mergeCandles(data.candles);
      const importedRun = cleanRun(data.run);
      if (importedRun) {
        if (!U.store.run() || confirm("导入会覆盖本机未完成的一世，继续吗？")) {
          U.store.setRun(importedRun);
        }
      }
      refresh();
      U.toast(
        `导入完成，新增 ${merged.added} 段人生` +
          (merged.dropped ? `，因上限跳过 ${merged.dropped} 段` : "")
      );
    } catch (err) {
      U.toast("导入失败：文件不是有效的人生记录");
    } finally {
      input.value = "";
    }
  });

  const canonToggle = $("canonHomage");
  if (canonToggle) {
    canonToggle.checked = !!U.store.prefs().canonHomage;
    canonToggle.addEventListener("change", () => {
      U.store.setPref("canonHomage", canonToggle.checked);
      U.toast(canonToggle.checked ? "已启用致敬事件" : "已关闭致敬事件");
    });
  }

  XD.aboutTools = { cleanLife, cleanLegacy, mergeLives, mergeCandles, cleanRun };

  refresh();
})();
