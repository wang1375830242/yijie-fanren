/* ==========================================================================
   一介凡人 · 落地页
   ========================================================================== */
(function () {
  "use strict";
  const XD = window.XD;
  const U = XD.util;
  const A = XD.art;
  const $ = (id) => document.getElementById(id);

  /* ---------- 命盘 ---------- */
  const dialBox = $("heroDial");
  if (dialBox) dialBox.innerHTML = A.dial();

  /* ---------- 降生比例 ---------- */
  const odds = U.WORLD_ODDS;
  document.querySelectorAll("[data-odds]").forEach((bar) => {
    const key = bar.dataset.odds;
    const pct = odds[key] * 100;
    bar.style.width = Math.max(2, pct) + "%";
  });
  document.querySelectorAll("[data-pct]").forEach((el) => {
    const key = el.dataset.pct;
    el.textContent = (odds[key] * 100).toFixed(1) + "%";
  });

  /* ---------- 投胎签 ---------- */  let world = "any";
  let pace = "mid";
  const go = $("slipGo");

  function refreshGo() {
    go.href = `play.html?world=${world}&pace=${pace}`;
  }
  document.querySelectorAll('input[name="landingWorld"]').forEach((r) => {
    r.addEventListener("change", () => {
      world = r.value;
      refreshGo();
    });
  });
  document.querySelectorAll("#pacePick button").forEach((b) => {
    b.addEventListener("click", () => {
      pace = b.dataset.pace;
      document.querySelectorAll("#pacePick button").forEach((x) => x.classList.toggle("on", x === b));
      refreshGo();
    });
  });
  refreshGo();

  /* ---------- 计数器 ---------- */
  const cBirth = $("cBirth");
  const cDeath = $("cDeath");
  let births = 0;
  let deaths = 0;
  let t0 = performance.now() - 5200;
  function tickCounters(now) {
    const sec = (now - t0) / 1000;
    const nb = Math.floor(sec * 4);
    const nd = Math.floor(sec * 0.42);
    if (nb !== births) {
      births = nb;
      cBirth.textContent = U.fmt(births);
    }
    if (nd !== deaths) {
      deaths = nd;
      cDeath.textContent = U.fmt(deaths);
    }
    requestAnimationFrame(tickCounters);
  }
  requestAnimationFrame(tickCounters);

  /* ---------- 碑林 ---------- */
  const row = $("steleRow");
  const lives = U.store.lives();
  const cards = [];

  if (lives.length) {
    const l = lives[0];
    cards.push({
      name: l.name,
      sub: `${(XD.DATA.WORLD_META[l.world] || {}).name || "人界"} · ${l.realm || "凡人"}`,
      line: l.epitaph || "这一世刚刚安放。",
      foot: `享年 ${l.age} 岁`,
      tag: "你的一世",
    });
  }
  XD.DATA.LEGENDS.slice(0, 3).forEach((lg) => {
    cards.push({
      name: lg.name,
      sub: `${(XD.DATA.WORLD_META[lg.world] || {}).name || "人界"} · ${lg.realm}`,
      line: lg.line,
      foot: "传说",
      tag: "原著人物 · 致敬",
    });
  });
  while (cards.length < 4) {
    const lg = XD.DATA.LEGENDS[cards.length % XD.DATA.LEGENDS.length];
    cards.push({
      name: lg.name,
      sub: `${(XD.DATA.WORLD_META[lg.world] || {}).name || "人界"} · ${lg.realm}`,
      line: lg.line,
      foot: "传说",
      tag: lg.note,
    });
  }
  row.innerHTML = cards
    .slice(0, 4)
    .map(
      (c) => `<a class="stele" href="${c.tag === "你的一世" ? "hall.html" : "hall.html"}">
        <div class="stele-top"><span>碑</span><span>${U.esc(c.tag)}</span></div>
        <div class="stele-name">${U.esc(c.name)}</div>
        <div class="stele-sub">${U.esc(c.sub)}</div>
        <p class="stele-line">「${U.esc(c.line)}」</p>
        <div class="stele-foot"><span>${U.esc(c.foot)}</span><b>读</b></div>
      </a>`
    )
    .join("");
})();
