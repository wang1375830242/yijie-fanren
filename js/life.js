/* ==========================================================================
   人生短码回放 · 只读页面
   ========================================================================== */
(function () {
  "use strict";
  const XD = window.XD = window.XD || {};
  const U = XD.util;
  const params = new URLSearchParams(location.search);
  const code = params.get("c") || "";
  const life = XD.LifeCode ? XD.LifeCode.decode(code) : null;
  const content = document.getElementById("lifeContent");
  const canvas = document.getElementById("shareCanvas");

  function worldName(value) {
    return { human: "人界", spirit: "灵界", immortal: "仙界", mortal: "凡间" }[value] || value || "未知";
  }

  function esc(value) {
    return U.esc(value == null ? "" : value);
  }

  if (!life) {
    content.innerHTML = '<p class="life-empty">这段人生短码不完整，可能被截断或复制错了。<br><a href="play.html">去推演新的一世</a></p>';
    document.title = "人生短码 · 一介凡人";
  } else {
    document.title = `${life.name || "无名"} · 人生短码 · 一介凡人`;
    life.path = "cultivator";
    const rows = [
      ["境界", life.realm],
      ["世界", worldName(life.world)],
      ["享年", `${life.age} 岁`],
      ["结局", life.cause],
      ["道号", life.daohao],
      ["宗门", life.sect],
      ["道统", life.buildName || life.sectPath],
      ["出身", life.origin && life.origin.place],
      ["灵根", life.root && life.root.name],
    ].filter((row) => row[1]);
    content.innerHTML = `
      <h1>${esc(life.name || "无名")}</h1>
      <p class="sub">${esc(life.daohao || "凡人")} · ${esc(worldName(life.world))} · ${esc(life.realm || "凡人")} · ${life.age} 岁</p>
      <div class="life-grid">${rows.map(([label, value]) => `<div><span>${esc(label)}</span><b>${esc(value)}</b></div>`).join("")}</div>
      <div class="life-actions">
        <button class="btn btn--primary" type="button" id="lifeDownload">下载命格卡</button>
        <button class="btn" type="button" id="lifeShare">分享命格卡</button>
        ${life.seed ? `<a class="btn" href="play.html?seed=${life.seed}">同 seed 再开一世</a>` : ""}
        <a class="btn" href="play.html">推演新的一世</a>
      </div>
      <p class="history-note">这是只读短码，不包含完整人生日志；完整记录仍保存在原设备或账号中。</p>`;
    document.getElementById("lifeDownload").addEventListener("click", () => {
      if (XD.LifeCard.download(life, canvas)) U.toast("命格卡已生成");
      else U.toast("命格卡生成失败");
    });
    document.getElementById("lifeShare").addEventListener("click", async () => {
      const result = await XD.LifeCard.share(life, canvas);
      U.toast(result === "shared" ? "命格卡已分享" : result === "downloaded" ? "已下载命格卡" : "已取消分享");
    });
  }
})();
