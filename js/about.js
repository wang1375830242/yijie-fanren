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
    $("dataCount").textContent = `目前本机存有 ${n} 段人生。`;
  }

  $("btnClear").addEventListener("click", () => {
    if (!confirm("清空本机所有人生记录与碑林留言？这个操作不能撤销。")) return;
    U.store.clearLives();
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
      lives: U.store.lives(),
      candles: U.store.candles(),
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

  refresh();
})();
