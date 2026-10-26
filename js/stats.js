/* 隐藏访问统计页：不加入站点导航，不参与搜索引擎索引。 */
(function () {
  "use strict";
  const XD = (window.XD = window.XD || {});
  const $ = (id) => document.getElementById(id);
  const TOKEN_KEY = "yijie.stats.token.v1";

  function row(label, value) {
    return `<div class="stats-row"><span>${label}</span><b>${value}</b></div>`;
  }

  function render(data) {
    $("statTotal").textContent = data.total;
    $("statUnique").textContent = data.unique;
    $("statToday").textContent = data.today;
    $("statDays").innerHTML = data.days.map((x) => row(x.day, x.count)).join("");
    $("statPages").innerHTML = data.pages.map((x) => row(x.page, x.count)).join("");
    $("statsStatus").textContent = "数据来自 LeanCloud 云函数 statsAdmin；口令只在本次会话的浏览器中保存。";
    $("statsStatus").classList.remove("is-error");
  }

  async function load(token, status) {
    status.textContent = "正在验证口令并读取聚合数据…";
    status.classList.remove("is-error");
    try {
      const data = await XD.cloud.adminStats(token);
      try {
        sessionStorage.setItem(TOKEN_KEY, token);
      } catch (err) {}
      render(data);
    } catch (err) {
      const message = err && err.status === 401
        ? "口令不正确。"
        : `统计读取失败：${err.message || "云函数 statsAdmin 未部署"}`;
      status.textContent = message;
      status.classList.add("is-error");
    }
  }

  function boot() {
    const status = $("statsStatus");
    const form = $("statsLogin");
    const input = $("statsToken");
    if (!XD.cloud || !XD.cloud.enabled) {
      status.textContent = "LeanCloud 未配置，无法读取统计。";
      status.classList.add("is-error");
      return;
    }
    if (!form || !input) return;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const token = input.value.trim();
      if (!token) {
        status.textContent = "请输入管理口令。";
        status.classList.add("is-error");
        return;
      }
      load(token, status);
    });
    let saved = "";
    try {
      saved = sessionStorage.getItem(TOKEN_KEY) || "";
    } catch (err) {}
    if (saved) {
      input.value = saved;
      load(saved, status);
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
