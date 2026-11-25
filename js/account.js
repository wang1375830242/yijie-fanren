/* ==========================================================================
   本机记录 · 只读本地存档，不登录、不同步、不请求后端
   ========================================================================== */
(function () {
  "use strict";
  const XD = window.XD;
  const U = XD.util;
  const $ = (id) => document.getElementById(id);
  const WORLD_NAMES = { human: "人界", spirit: "灵界", immortal: "仙界", mortal: "凡间" };
  const REALM_NAMES = ["凡人", "炼气", "筑基", "结丹", "元婴", "化神", "炼虚", "合体", "大乘", "真仙", "金仙", "太乙", "大罗", "道祖"];
  let visibleLives = 10;

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function textOf(value) {
    return value == null ? "" : String(value);
  }

  function worldName(value) {
    return WORLD_NAMES[value] || value || "未知";
  }

  function realmName(tier, cult) {
    const index = Math.max(0, Math.min(REALM_NAMES.length - 1, Number(tier) || 0));
    const name = REALM_NAMES[index];
    if (index === 0) return name;
    const value = Number(cult) || 0;
    const sub = value < 34 ? "初期" : value < 67 ? "中期" : "后期";
    return `${name} · ${sub}`;
  }

  function dateText(value) {
    if (value == null || value === "") return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function snapshot() {
    return {
      lives: U.store.lives(),
      lineage: U.store.lineage(),
      run: U.store.run(),
      savedAt: Date.now(),
    };
  }

  function statCard(label, value) {
    const box = el("div", "history-stat");
    box.append(el("span", "", label), el("b", "", value), el("small", "", ""));
    return box;
  }

  function addDetail(detail, label, value) {
    const text = textOf(value).trim();
    if (!text) return;
    const row = el("div", "record-detail-line");
    row.append(el("span", "", label), el("b", "", text));
    detail.append(row);
  }

  function renderLife(life, index) {
    const card = el("article", "record-card");
    const head = el("div", "record-top");
    const title = el("div", "record-title");
    title.append(el("b", "", `第 ${life.lifeNo || index + 1} 世 · ${life.name || "无名"}`));
    title.append(el("span", "", `${worldName(life.world)} · ${life.realm || realmName(life.tier, life.cult)} · ${life.age ? life.age + "岁" : "—"}`));
    head.append(title);
    const toggle = el("button", "record-toggle", "详情");
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", "false");
    head.append(toggle);
    card.append(head);
    const summary = el("div", "record-summary");
    summary.append(el("span", "", `结局：${life.cause || "—"}`), el("time", "", dateText(life.ts || life.endedTs)));
    card.append(summary);
    const detail = el("div", "record-detail");
    detail.hidden = true;
    addDetail(detail, "宗门 / 职位", [life.sect, life.sectRank].filter(Boolean).join(" · "));
    addDetail(detail, "道号", life.daohao);
    addDetail(detail, "出身", life.origin ? [life.origin.place, life.origin.family].filter(Boolean).join(" · ") : "");
    addDetail(detail, "灵根", life.root ? life.root.name : "");
    addDetail(detail, "道统", life.buildName || life.sectPath || "");
    addDetail(detail, "道祖准备", life.daoPrep ? `+${Math.min(10, Math.round(Number(life.daoPrep)))}%` : "");
    addDetail(detail, "遗愿", life.wish ? life.wish.text : "");
    if (Array.isArray(life.deeds) && life.deeds.length) {
      const deeds = el("div", "record-detail-line");
      deeds.append(el("span", "", "事迹"));
      const list = el("div", "record-deeds");
      life.deeds.slice(0, 4).forEach((deed) => {
        list.append(el("p", "", `${deed.age != null ? deed.age + "岁 · " : ""}${deed.text || ""}`));
      });
      deeds.append(list);
      detail.append(deeds);
    }
    if (window.XD && XD.LifeCard) {
      const actions = el("div", "record-actions");
      const download = el("button", "btn btn--sm", "下载命格卡");
      download.type = "button";
      download.addEventListener("click", () => {
        if (XD.LifeCard.download(life, $("shareCanvas"))) setStatus("命格卡已生成。");
        else setStatus("命格卡生成失败，请换一台设备或稍后再试。", true);
      });
      actions.append(download);
      if (XD.LifeCode) {
        const codeButton = el("button", "btn btn--sm", "复制人生短码");
        codeButton.type = "button";
        codeButton.addEventListener("click", async () => {
          const url = XD.LifeCode.url(life);
          const copied = await XD.LifeCode.copy(url);
          if (copied) setStatus("人生短码已复制，可发给别人只读回放。");
          else if (window.prompt) window.prompt("复制这段人生短码：", url);
        });
        actions.append(codeButton);
      }
      detail.append(actions);
    }
    card.append(detail);
    toggle.addEventListener("click", () => {
      detail.hidden = !detail.hidden;
      toggle.textContent = detail.hidden ? "详情" : "收起";
      toggle.setAttribute("aria-expanded", String(!detail.hidden));
    });
    return card;
  }

  function setStatus(text, error) {
    const node = $("recordsStatus");
    if (!node) return;
    node.textContent = text || "";
    node.classList.toggle("is-error", !!error);
  }

  function renderHistory() {
    const panel = $("historyPanel");
    if (!panel) return;
    const snap = snapshot();
    const lives = (Array.isArray(snap.lives) ? snap.lives.slice() : []).sort((a, b) => (Number(b.ts) || 0) - (Number(a.ts) || 0));
    const lineage = snap.lineage && typeof snap.lineage === "object" ? snap.lineage : {};
    const run = snap.run && typeof snap.run === "object" ? snap.run : null;
    const total = Math.max(Number(lineage.total) || 0, lives.length);
    const highest = lives.reduce((best, life) => (Number(life.tier) || 0) > (Number(best.tier) || 0) ? life : best, lives[0] || null);
    const longest = lives.reduce((best, life) => (Number(life.age) || 0) > (Number(best.age) || 0) ? life : best, lives[0] || null);
    const last = lives[0];
    const stats = $("historyStats");
    stats.textContent = "";
    stats.append(
      statCard("总世数", String(total)),
      statCard("最高境界", highest ? highest.realm || realmName(highest.tier, highest.cult) : "—"),
      statCard("最长寿数", longest && longest.age ? longest.age + " 岁" : "—"),
      statCard("最近游历", last ? dateText(last.ts || last.endedTs) : "—")
    );
    $("historySub").textContent = `只在本机 · 已记录 ${total} 世${total > lives.length ? " · 仅显示最近 60 世" : ""}`;
    const current = $("historyCurrent");
    current.textContent = "";
    if (run && run.state && run.state.alive !== false) {
      const state = run.state;
      current.hidden = false;
      current.append(el("span", "history-current-label", "当前进行中"));
      current.append(el("b", "", `${worldName(state.world)} · ${realmName(state.tier, state.cult)} · ${state.age != null ? state.age + "岁" : "—"}`));
      current.append(el("small", "", "回到游戏可继续这一世。"));
    } else {
      current.hidden = true;
    }
    const list = $("historyList");
    list.textContent = "";
    const shown = lives.slice(0, Math.min(visibleLives, 60));
    shown.forEach((life, index) => list.append(renderLife(life, index)));
    $("historyEmpty").hidden = lives.length > 0 || !!(run && run.state && run.state.alive !== false);
    $("historyMore").hidden = lives.length <= shown.length;
    $("historyNote").textContent = total > lives.length ? `本机共 ${total} 世；此处展示最近 ${lives.length} 世。` : "";
  }

  function renderAchievements() {
    if (!window.XD || !XD.Achievements) return;
    const evaluated = XD.Achievements.evaluate({ lives: U.store.lives(), lineage: U.store.lineage(), current: null });
    const data = evaluated.data;
    const progress = XD.Achievements.progress(data);
    const grid = $("achievementGrid");
    if (!grid) return;
    grid.textContent = "";
    XD.Achievements.CATEGORIES.forEach((category) => {
      const defs = XD.Achievements.DEFS.filter((def) => def.category === category);
      const section = el("div", "achievement-category");
      section.append(el("h3", "", `${category} · ${progress.categories[category].unlocked}/${progress.categories[category].total}`));
      const list = el("div", "achievement-list");
      defs.forEach((def) => {
        const entry = data.items[def.id];
        const unlocked = !!entry;
        const hidden = !!def.hidden && !unlocked;
        const card = el("div", `achievement-card${unlocked ? " is-unlocked" : ""}${hidden ? " is-hidden" : ""}`);
        card.append(el("b", "", hidden ? "???" : def.name), el("span", "", hidden ? "未解锁的隐藏成就" : def.desc), el("small", "", unlocked ? `已解锁 · ${dateText(entry.at)}` : "未解锁"));
        list.append(card);
      });
      section.append(list);
      grid.append(section);
    });
    $("achievementCount").textContent = `${progress.unlocked} / ${progress.total}`;
    $("achievementSub").textContent = `本机收集 · 已解锁 ${progress.unlocked} 个，不影响修为与战斗`;
  }

  function renderChallenges() {
    if (!window.XD || !XD.Challenges) return;
    const evaluated = XD.Challenges.evaluate({ lives: U.store.lives(), lineage: U.store.lineage(), summary: null });
    const data = evaluated.data;
    const progress = XD.Challenges.progress(data);
    const list = $("challengeList");
    if (!list) return;
    list.textContent = "";
    XD.Challenges.DEFS.forEach((def) => {
      const entry = data.items[def.id];
      const item = el("div", `challenge-item${entry ? " is-done" : ""}`);
      item.append(el("b", "", def.name), el("span", "", def.desc), el("small", "", entry ? `已完成 · ${dateText(entry.at)}` : "未完成"));
      if (!entry) {
        const link = el("a", "", "去挑战");
        link.href = `play.html?challenge=${encodeURIComponent(def.id)}`;
        item.append(link);
      }
      list.append(item);
    });
    $("challengeCount").textContent = `${progress.unlocked} / ${progress.total}`;
    $("challengeSub").textContent = `固定命格与 seed · 已完成 ${progress.unlocked} 个，不影响修为`;
  }

  function renderLineage() {
    if (!window.XD) return;
    const lineage = U.store.lineage();
    const entries = (Array.isArray(lineage.entries) ? lineage.entries.slice() : []).sort((a, b) => (Number(b.no) || 0) - (Number(a.no) || 0));
    const list = $("lineageList");
    if (!list) return;
    list.textContent = "";
    $("lineageCount").textContent = `${Number(lineage.total) || entries.length} 个`;
    $("lineageSub").textContent = `最近 ${entries.length} 世留痕 · 第 ${entries.length ? entries[entries.length - 1].no || "—" : "—"} 世至第 ${entries.length ? entries[0].no || "—" : "—"} 世`;
    if (!entries.length) {
      list.append(el("p", "lineage-empty", "还没有留下谱系。完成第一世后，这里会记住你的来处。"));
      return;
    }
    entries.forEach((entry) => {
      const card = el("article", "lineage-item");
      const top = el("div", "lineage-top");
      top.append(el("b", "", `第 ${entry.no || "—"} 世 · ${entry.name || "无名"}`));
      top.append(el("span", "", `${worldName(entry.world)} · ${entry.realm || "凡人"} · ${entry.age ? entry.age + "岁" : "—"}`));
      card.append(top);
      const meta = el("div", "lineage-meta");
      meta.append(el("span", "", `结局：${entry.cause || "—"}`));
      if (entry.sect) meta.append(el("span", "", `宗门：${entry.sect}`));
      if (entry.partnerName) meta.append(el("span", "", `道侣：${entry.partnerName}`));
      if (entry.discipleNames && entry.discipleNames.length) meta.append(el("span", "", `弟子：${entry.discipleNames.join("、")}`));
      card.append(meta);
      if (entry.wish && entry.wish.text) card.append(el("p", "lineage-wish", `遗愿：${entry.wish.text}`));
      list.append(card);
    });
  }

  function exportData() {
    if (!confirm("导出文件只包含这台设备上的本机记录与设置，请自行保存。确定导出？")) return;
    const data = snapshot();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "yijie-local-records.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  }

  function renderAll() {
    renderHistory();
    renderAchievements();
    renderChallenges();
    renderLineage();
  }

  $("historyRefresh").addEventListener("click", () => {
    renderAll();
    setStatus("已刷新本机记录。");
  });
  $("historyMore").addEventListener("click", () => {
    visibleLives = Math.min(60, visibleLives + 10);
    renderHistory();
  });
  const exportBtn = $("exportBtn");
  if (exportBtn) exportBtn.addEventListener("click", exportData);
  renderAll();
})();
