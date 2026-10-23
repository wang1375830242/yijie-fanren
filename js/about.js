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

  function mergeLives(incoming) {
    const current = U.store.lives();
    const seen = new Set(current.map((life) => life.id || `life-${life.seed}`));
    let added = 0;
    for (const life of incoming) {
      const key = life.id || `life-${life.seed}`;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      current.push(life);
      added += 1;
    }
    U.store.setLives(current);
    return added;
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
      if (data.lineage && data.lineage.v === 1) U.store.setLineage(data.lineage);
      if (Array.isArray(data.steles)) {
        U.store.setSteles ? U.store.setSteles(data.steles) : data.steles.forEach((id) => U.store.markStele(id));
      }
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

  refresh();
})();
