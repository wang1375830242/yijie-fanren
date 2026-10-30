/* ==========================================================================
   账号页 · 登录 / 注册 / 云存档
   ========================================================================== */
(function () {
  "use strict";
  const XD = window.XD;
  const auth = XD.util.auth;
  const $ = (id) => document.getElementById(id);
  let currentUser = null;
  let visibleLives = 10;
  const WORLD_NAMES = { human: "人界", spirit: "灵界", immortal: "仙界", mortal: "凡间" };
  const REALM_NAMES = ["凡人", "炼气期", "筑基期", "结丹期", "元婴期", "化神期", "炼虚期", "合体期", "大乘期", "真仙", "金仙", "太乙", "大罗", "道祖"];

  function api(path, options) {
    return auth.fetch(path, options);
  }

  function setStatus(text, error) {
    const node = $("accountStatus");
    node.textContent = text;
    node.classList.toggle("is-error", !!error);
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
    const date = typeof value === "number" ? new Date(value) : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
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
    title.append(el("b", "", `第${life.lifeNo || index + 1}世 · ${life.name || "无名"}`));
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
    addDetail(detail, "道祖准备", life.daoPrep ? `+${Math.min(10, Math.round(Number(life.daoPrep)))}%` : "");
    addDetail(detail, "遗愿", life.wish ? life.wish.text : "");
    if (Array.isArray(life.deeds) && life.deeds.length) {
      const deeds = el("div", "record-detail-line");
      deeds.append(el("span", "", "事迹"));
      const list = el("div", "record-deeds");
      life.deeds.slice(0, 4).forEach((deed) => {
        const item = el("p", "", `${deed.age != null ? deed.age + "岁 · " : ""}${deed.text || ""}`);
        list.append(item);
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
      const share = el("button", "btn btn--sm", "分享命格卡");
      share.type = "button";
      share.addEventListener("click", async () => {
        setStatus("正在生成命格卡…");
        const result = await XD.LifeCard.share(life, $("shareCanvas"));
        if (result === "shared") setStatus("命格卡已分享。");
        else if (result === "downloaded") setStatus("当前设备不支持直接分享，已下载命格卡。");
        else setStatus("已取消分享。");
      });
      actions.append(download, share);
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

  function renderHistory() {
    const panel = $("historyPanel");
    if (!panel || !XD.account) return;
    const snap = XD.account.snapshot ? XD.account.snapshot() : {};
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
      statCard("最近游玩", last ? dateText(last.ts || last.endedTs) : "—")
    );
    $("historySub").textContent = `只属于当前账号 · 已记录 ${total} 世${total > lives.length ? " · 仅显示最近 60 世" : ""}`;
    const current = $("historyCurrent");
    current.textContent = "";
    if (run && run.state && run.state.alive !== false) {
      const state = run.state;
      current.hidden = false;
      current.append(el("span", "history-current-label", "当前进行中"));
      current.append(el("b", "", `${worldName(state.world)} · ${realmName(state.tier, state.cult)} · ${state.age != null ? state.age + "岁" : "—"}`));
      current.append(el("small", "", "回到游戏可继续这一世"));
    } else {
      current.hidden = true;
    }
    const list = $("historyList");
    list.textContent = "";
    const shown = lives.slice(0, Math.min(visibleLives, 60));
    shown.forEach((life, index) => list.append(renderLife(life, index)));
    $("historyEmpty").hidden = lives.length > 0 || !!(run && run.state && run.state.alive !== false);
    $("historyMore").hidden = lives.length <= shown.length;
    $("historyNote").textContent = total > lives.length ? `账号共 ${total} 世；此处展示最近 ${lives.length} 世。` : "";
  }

  function renderAchievements() {
    if (!window.XD || !XD.Achievements) return;
    const evaluated = XD.Achievements.evaluate({
      lives: U.store.lives(),
      lineage: U.store.lineage(),
      current: null,
    });
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
        const title = el("b", "", hidden ? "???" : def.name);
        const desc = el("span", "", hidden ? "未解锁的隐藏成就" : def.desc);
        const meta = el("small", "", unlocked ? `已解锁 · ${dateText(entry.at)}` : "未解锁");
        card.append(title, desc, meta);
        list.append(card);
      });
      section.append(list);
      grid.append(section);
    });
    $("achievementCount").textContent = `${progress.unlocked} / ${progress.total}`;
    $("achievementSub").textContent = `账号级收集 · 已解锁 ${progress.unlocked} 个，不影响修为与战斗`;
  }

  function showSigned(user) {
    currentUser = user;
    $("accountGuest").hidden = true;
    $("accountSigned").hidden = false;
    $("accountName").textContent = user.displayName || user.username;
    $("accountUser").textContent = "@" + user.username;
    $("accountAvatar").textContent = (user.displayName || user.username).slice(0, 1);
    renderHistory();
    renderAchievements();
  }

  function showGuest() {
    currentUser = null;
    visibleLives = 10;
    $("accountSigned").hidden = true;
    $("accountGuest").hidden = false;
    setStatus("");
  }

  function readError(res) {
    return res.json().then((data) => data.error || "HTTP " + res.status).catch(() => "HTTP " + res.status);
  }

  async function register(event) {
    event.preventDefault();
    const username = $("registerUser").value.trim();
    const password = $("registerPass").value;
    const displayName = $("registerName").value.trim();
    setStatus("正在注册…");
    try {
      const res = await fetch(auth.apiBase + "/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, displayName }),
      });
      if (!res.ok) throw new Error(await readError(res));
      const data = await res.json();
      auth.setSession({ token: data.token, user: data.user });
      if (data.recoveryCode) {
        $("recoveryBox").hidden = false;
        $("recoveryCode").textContent = data.recoveryCode;
      }
      showSigned(data.user);
      await XD.account.sync();
    } catch (err) {
      setStatus(err.message || "注册失败", true);
    }
  }

  async function login(event) {
    event.preventDefault();
    const username = $("loginUser").value.trim();
    const password = $("loginPass").value;
    setStatus("正在登录…");
    try {
      const res = await fetch(auth.apiBase + "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) throw new Error(await readError(res));
      const data = await res.json();
      auth.setSession({ token: data.token, user: data.user });
      showSigned(data.user);
      setStatus("登录成功，正在合并本机与云端记录…");
      await XD.account.sync();
    } catch (err) {
      setStatus(err.message || "登录失败", true);
    }
  }

  async function logout() {
    try { await api("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" } }); } catch (err) {}
    auth.clear();
    showGuest();
    setStatus("已退出。本机记录仍保留在这台设备。");
  }

  async function me() {
    if (!auth.session()) return showGuest();
    const res = await api("/api/auth/me", { cache: "no-store" });
    if (!res.ok) {
      auth.clear();
      return showGuest();
    }
    const data = await res.json();
    showSigned(data.user);
    XD.account.syncSoon();
  }

  function exportData() {
    if (!confirm("导出文件包含本机账号记录与设置，请自行妥善保存。确定导出？")) return;
    const data = XD.account.snapshot();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "yijie-account-snapshot.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  }

  function claimLocal() {
    if (!currentUser) return;
    if (!confirm("导入本机匿名数据会与当前账号记录合并，是否继续？")) return;
    try { localStorage.setItem("yijie.owner.v1", String(currentUser.id)); } catch (err) {}
    $("importLocalBtn").hidden = true;
    XD.account.sync();
  }

  $("historyRefresh").addEventListener("click", async () => {
    setStatus("正在同步修行记录…");
    try {
      await XD.account.sync();
      renderHistory();
      setStatus("修行记录已刷新。");
    } catch (err) {
      setStatus(err.message || "同步失败", true);
    }
  });
  $("historyMore").addEventListener("click", () => {
    visibleLives = Math.min(60, visibleLives + 10);
    renderHistory();
  });
  document.querySelectorAll("[data-auth-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      const mode = tab.dataset.authTab;
      document.querySelectorAll("[data-auth-tab]").forEach((node) => {
        const on = node === tab;
        node.classList.toggle("on", on);
        node.setAttribute("aria-selected", on ? "true" : "false");
      });
      $("loginForm").hidden = mode !== "login";
      $("registerForm").hidden = mode !== "register";
      $("recoverForm").hidden = mode !== "recover";
    });
  });
  async function recover(event) {
    event.preventDefault();
    setStatus("正在重置…");
    try {
      const res = await fetch(auth.apiBase + "/api/auth/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: $("recoverUser").value.trim(), recoveryCode: $("recoverCodeInput").value.trim(), newPassword: $("recoverPass").value }),
      });
      if (!res.ok) throw new Error(await readError(res));
      const data = await res.json();
      auth.setSession({ token: data.token, user: data.user });
      showSigned(data.user);
      setStatus("密码已重置，已登录。");
      await XD.account.sync();
    } catch (err) {
      setStatus(err.message || "重置失败", true);
    }
  }
  $("recoverForm").addEventListener("submit", recover);
  $("loginForm").addEventListener("submit", login);
  $("registerForm").addEventListener("submit", register);
  $("logoutBtn").addEventListener("click", logout);
  $("syncBtn").addEventListener("click", () => XD.account.sync());
  $("exportBtn").addEventListener("click", exportData);
  $("importLocalBtn").addEventListener("click", claimLocal);
  window.addEventListener("yijie:sync", (event) => {
    const detail = event.detail || {};
    $("syncStatus").textContent = detail.text || "尚未同步";
    $("syncStatus").classList.toggle("is-error", !!detail.error);
    if (detail.text && detail.text.indexOf("另一个账号") >= 0) $("importLocalBtn").hidden = false;
    renderHistory();
    renderAchievements();
  });
  me();
})();
