/* 隐藏访问统计页：不加入站点导航，不参与搜索引擎索引。 */
(function () {
  "use strict";
  const XD = (window.XD = window.XD || {});
  const $ = (id) => document.getElementById(id);

  function row(label, value) {
    return `<div class="stats-row"><span>${label}</span><b>${value}</b></div>`;
  }

  function render(data) {
    $("statTotal").textContent = data.total;
    $("statUnique").textContent = data.unique;
    $("statToday").textContent = data.today;
    $("statDays").innerHTML = data.days.map((x) => row(x.day, x.count)).join("");
    $("statPages").innerHTML = data.pages.map((x) => row(x.page, x.count)).join("");
    $("statsStatus").textContent = "数据来自 LeanCloud；独立访客按匿名浏览器标识近似统计。";
    $("statsStatus").classList.remove("is-error");
  }

  async function boot() {
    const status = $("statsStatus");
    if (!XD.cloud || !XD.cloud.enabled) {
      status.textContent = "LeanCloud 未配置，无法读取统计。";
      status.classList.add("is-error");
      return;
    }
    try {
      const data = await XD.cloud.stats();
      render(data);
    } catch (err) {
      status.textContent = `统计读取失败：${err.message || "LeanCloud 没有响应"}`;
      status.classList.add("is-error");
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
