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
    const id = String(life.id || `life-${life.seed}`)
      .replace(/[^A-Za-z0-9_-]/g, "")
      .slice(0, 64);
    if (!id) return null;
    return Object.assign({}, life, {
      id,
      age: Number.isFinite(Number(life.age)) ? Math.max(0, Math.floor(Number(life.age))) : 0,
      name: String(life.name || "无名").slice(0, 40),
      realm: String(life.realm || "凡人").slice(0, 40),
      epitaph: String(life.epitaph || "").slice(0, 160),
    });
  }

  function mergeLives(incoming) {
    const current = U.store.lives();
    const seen = new Set(current.map((life) => life.id || `life-${life.seed}`));
    let added = 0;
    for (const raw of incoming) {
      const life = cleanLife(raw);
      if (!life) continue;
      const key = life.id;
      if (seen.has(key)) continue;
      seen.add(key);
      current.push(life);
      added += 1;
    }
    U.store.setLives(current);
    return added;
  }

  function mergeLineage(incoming) {
    if (!incoming || incoming.v !== 1) return;
    const current = U.store.lineage();
    const byKey = new Map();
    [...(current.entries || []), ...(incoming.entries || [])].forEach((entry) => {
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
    U.store.setSteles([...(U.store.steles() || []), ...incoming]);
  }

  $("btnClear").addEventListener("click", () => {
    if (!confirm("清空本机所有人生记录、未完成的一世与道果？这个操作不能撤销。")) return;
    U.store.clearLives();
    U.store.clearLegacy();
    U.store.clearRun();
    U.store.clearLineage();
    U.store.clearSteles();
    ["yijie.messages.v1", "yijie.candles.v1"].forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch (e) {}
    });
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
      const added = mergeLives(lives);
      if (data.legacy && !U.store.legacy()) U.store.setLegacy(data.legacy);
      mergeLineage(data.lineage);
      mergeSteles(data.steles);
      if (data.run && data.run.v === 1) {
        if (!U.store.run() || confirm("导入会覆盖本机未完成的一世，继续吗？")) {
          U.store.setRun(data.run);
        }
      }
      refresh();
      U.toast(`导入完成，新增 ${added} 段人生`);
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

  refresh();
})();
