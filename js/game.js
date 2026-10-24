/* ==========================================================================
   一介凡人 · 界面驱动
   ========================================================================== */
(function () {
  "use strict";
  const XD = window.XD;
  const D = XD.DATA;
  const U = XD.util;
  const A = XD.art;
  const $ = (id) => document.getElementById(id);

  const PACE = { short: 2600, mid: 4000, long: 5600 };

  let sim = null;
  let state = null;
  let timer = null;
  let speed = 1;
  let paused = false;
  let auto = false;
  let pace = "mid";
  let themeWorld = "human";
  let logRendered = 0;
  let endSummary = null;
  let saved = false;
  let autoTimer = null;
  let whisperTimer = null;
  let shopPaused = false;
  let rollingLife = false;
  let soft = false;
  let releasePromptTrap = null;
  let releaseShopTrap = null;
  let runSaveWarned = false;
  let choicePeek = false;
  let lastSaveAt = 0;
  let lastChartKey = "";
  let lastMapKey = "";

  /* ======================================================================
     通用
     ====================================================================== */
  function show(name) {
    stopWhisper();
    ["screenBirth", "screenCard", "screenLife", "screenEnd"].forEach((id) => {
      $(id).hidden = id !== "screen" + name[0].toUpperCase() + name.slice(1);
    });
    $("tbMid").hidden = name !== "life";
    document.body.classList.toggle("in-life", name === "life");
    window.scrollTo({ top: 0, behavior: "instant" in document.documentElement.style ? "instant" : "auto" });
    if (name === "birth") renderBirthLegacy();
  }

  function renderBirthLegacy() {
    const el = $("birthLegacy");
    if (!el) return;
    const params = new URLSearchParams(location.search);
    const legacy = params.get("seed") ? null : U.store.legacy();
    if (!legacy || legacy.usedBy) {
      el.hidden = true;
      el.textContent = "";
      return;
    }
    const source = legacy.source || {};
    const parts = [];
    if (legacy.rootKey) parts.push("灵根余韵");
    parts.push(`悟性 +${legacy.insight || 0}`);
    parts.push("遗物");
    if (legacy.karma) parts.push(`因果 ${legacy.karma > 0 ? "+" : ""}${legacy.karma}`);
    el.hidden = false;
    el.innerHTML = `你带着前世道果：<b>${U.esc(source.name || "无名")}</b> · ${U.esc(source.realm || "凡人")} · ${U.esc(parts.join(" · "))}<span>下一世自动继承</span>`;
  }

  function setTheme(world) {
    themeWorld = world;
    document.documentElement.dataset.realm = world;
  }

  function fmtSeed(seed) {
    const s = (seed >>> 0).toString(16).toUpperCase().padStart(8, "0");
    return "No. " + s.slice(0, 4) + "-" + s.slice(4);
  }

  function worldName(w) {
    return (D.WORLD_META[w] || D.WORLD_META.human).name;
  }

  function toast(msg) {
    U.toast(msg);
  }

  const SOFT_MAP = [
    [/碎尸/g, "遗蜕"],
    [/尸体/g, "遗蜕"],
    [/死尸/g, "遗蜕"],
    [/头颅/g, "影子"],
    [/惨死/g, "离世"],
    [/杀死/g, "了断"],
    [/死亡/g, "离世"],
    [/生死/g, "生离"],
    [/鲜血/g, "微光"],
    [/血迹/g, "痕迹"],
    [/血流/g, "流光"],
    [/死/g, "离去"],
    [/血/g, "尘"],
    [/杀/g, "了断"],
  ];
  function soften(text) {
    if (!soft || text == null) return String(text == null ? "" : text);
    let out = String(text);
    for (const [re, to] of SOFT_MAP) out = out.replace(re, to);
    return out;
  }

  function setSoft(value, quiet) {
    soft = !!value;
    const box = $("softMode");
    if (box) box.checked = soft;
    const btn = $("menuSoft");
    if (btn) btn.textContent = `柔化模式：${soft ? "开" : "关"}`;
    U.store.setPref("soft", soft);
    if (!quiet) toast(soft ? "柔化模式已开" : "柔化模式已关");
    if (state && state.log) renderLogAll();
  }

  /* ======================================================================
     开场：择界
     ====================================================================== */
  function initBirth() {
    $("birthDial").innerHTML = A.dial();
    $("rollDial").innerHTML = A.dial({ spin: true });
    const saved = U.store.prefs();
    if (saved.speed) setSpeed(saved.speed);
    setSoft(saved.soft, true);
    $("softMode").addEventListener("change", () => setSoft($("softMode").checked));
    const params = new URLSearchParams(location.search);
    const qWorld = params.get("world");
    const qPace = params.get("pace");
    if (qWorld) {
      const r = document.querySelector(`input[name="world"][value="${qWorld}"]`);
      if (r) r.checked = true;
    }
    if (qPace && PACE[qPace]) {
      const r = document.querySelector(`input[name="pace"][value="${qPace}"]`);
      if (r) r.checked = true;
      pace = qPace;
    }

    $("btnBirth").addEventListener("click", () => {
      if (rollingLife) return;
      rollingLife = true;
      $("btnBirth").disabled = true;
      const world = document.querySelector('input[name="world"]:checked').value;
      pace = document.querySelector('input[name="pace"]:checked').value;
      $("rolling").hidden = false;
      setTimeout(() => {
        $("rolling").hidden = true;
        rollerDone();
      }, 1500);
      function rollerDone() {
        rollingLife = false;
        $("btnBirth").disabled = false;
        startLife(world);
      }
    });

    $("btnReroll").addEventListener("click", () => {
      rollingLife = false;
      $("btnBirth").disabled = false;
      show("birth");
      setTheme("human");
      toast("再择一处降生");
    });

    $("btnBegin").addEventListener("click", () => {
      show("life");
      setTheme(state.world);
      buildLifeUI();
      logRendered = 0;
      refreshAll(true);
      paused = false;
      $("btnPause").textContent = "❚❚";
      schedule();
    });
  }

  /* ======================================================================
     降生
     ====================================================================== */
  function startLife(world) {
    const params = new URLSearchParams(location.search);
    const qSeed = params.get("seed");
    const seed = qSeed ? Number(qSeed) >>> 0 : (Math.random() * 4294967295) >>> 0;
    const modeEl = document.querySelector('input[name="mode"]:checked');
    const storedLegacy = qSeed ? null : U.store.legacy();
    const legacy = storedLegacy && !storedLegacy.usedBy ? storedLegacy : null;
    U.store.clearRun();
    runSaveWarned = false;
    sim = new XD.Sim({
      seed,
      world,
      mode: modeEl ? modeEl.value : "birth",
      legacy,
    });
    state = sim.state;
    endSummary = null;
    saved = false;
    setTheme(state.world);
    renderFateCard();
    show("card");
  }

  function saveRun(force) {
    if (!sim || !state || !state.alive || state.pending) return false;
    const now = Date.now();
    // 自动逐回合保存每 1.5 秒最多一次；离开页面和关键操作可强制落盘。
    if (!force && now - lastSaveAt < 1500) return true;
    lastSaveAt = now;
    const run = sim.snapshot();
    run.pace = pace;
    const ok = U.store.setRun(run);
    if (!ok && !runSaveWarned) {
      runSaveWarned = true;
      toast("这一世暂时没能写入本机存档");
    }
    return ok;
  }

  function resumeRun(run) {
    const restored = XD.Sim.restore(run);
    if (!restored) {
      U.store.clearRun();
      toast("这份存档版本不兼容，已保留原始人生记录");
      return false;
    }
    sim = restored;
    state = sim.state;
    resetPromptChrome();
    endSummary = null;
    saved = false;
    runSaveWarned = false;
    if (run.pace && PACE[run.pace]) pace = run.pace;
    setTheme(state.world);
    show("life");
    buildLifeUI();
    logRendered = 0;
    refreshAll(true);
    paused = false;
    $("btnPause").textContent = "❚❚";
    schedule();
    return true;
  }

  function maybeResume() {
    const params = new URLSearchParams(location.search);
    if (params.get("seed")) return;
    const run = U.store.run();
    if (!run) return;
    if (run.v !== 1 || !run.state || !run.state.alive) {
      U.store.clearRun();
      return;
    }
    const age = run.state.age != null ? run.state.age : "?";
    if (!confirm(`发现一段未完成的人生（${age}岁），继续吗？`)) {
      U.store.clearRun();
      return;
    }
    if (!resumeRun(run)) return;
  }

  function buildProblemReport() {
    return {
      v: 1,
      seed: state.seed,
      seedText: fmtSeed(state.seed),
      world: state.world,
      mode: (sim.opts && sim.opts.mode) || "birth",
      age: state.age,
      tier: state.tier,
      realm: sim.displayRealm(),
      trace: state.choiceTrace || [],
      savedAt: new Date().toISOString(),
    };
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand("copy");
    } finally {
      area.remove();
    }
    return Promise.resolve();
  }

  function resetPromptChrome() {
    choicePeek = false;
    const resume = $("choiceResume");
    if (resume) resume.hidden = true;
  }

  function trapChoicePrompt() {
    if (releasePromptTrap) {
      releasePromptTrap();
      releasePromptTrap = null;
    }
    releasePromptTrap = U.trapFocus($("choiceOverlay"), () =>
      U.toast("这一世的事，总得有个了断")
    );
  }

  function minimizeChoice() {
    if (!state || !state.pending || choicePeek) return;
    choicePeek = true;
    clearTimeout(autoTimer);
    stopWhisper();
    if (releasePromptTrap) {
      releasePromptTrap();
      releasePromptTrap = null;
    }
    $("choiceOverlay").hidden = true;
    const resume = $("choiceResume");
    if (resume) resume.hidden = false;
    const log = $("log");
    if (log) log.focus({ preventScroll: true });
  }

  function resumeChoice() {
    if (!state || !state.pending) {
      resetPromptChrome();
      return;
    }
    choicePeek = false;
    const resume = $("choiceResume");
    if (resume) resume.hidden = true;
    $("choiceOverlay").hidden = false;
    startWhisper();
    trapChoicePrompt();
    const title = $("choiceTitle");
    if (title) title.focus({ preventScroll: true });
  }

  function renderFateCard() {
    const s = state;
    $("fateNo").textContent = fmtSeed(s.seed);
    $("fateSeal").textContent = s.name[0];
    $("fateName").textContent = s.name;
    $("fateMeta").textContent = `${s.gender} · ${worldName(s.world)} · ${s.origin.place}`;
    $("rootRing").innerHTML = A.rootRing(
      A.rootValues(s.root, s.seed),
      s.root.name === "凡骨" ? "" : s.root.name
    );

    const fields = [
      ["界域", worldName(s.world)],
      ["生于", s.origin.place],
      ["出身", s.origin.family],
      ["灵根", s.root.name],
      ["悟性", s.insight],
      ["气运", s.luck],
      ["寿元", s.maxAge + " 年"],
      ["随身", s.stones ? s.stones + " 块灵石" : "一无所有"],
    ];
    if (s.legacy && s.legacy.source) {
      fields.push(["前世", `${s.legacy.source.name} · ${s.legacy.source.realm}`]);
    }
    $("fateFields").innerHTML = fields
      .map(
        ([k, v]) =>
          `<div class="fate-field"><dt>${U.esc(k)}</dt><dd>${U.esc(v)}</dd></div>`
      )
      .join("");

    const notes = {
      tian: "百中无一。若被宗门知晓，他们会为你打起来。",
      yi: "修行极快，也极招祸。",
      shuang: "上佳之资，足以入内门。",
      san: "中人之姿，胜在一个稳字。",
      si: "伪灵根，也能修出真金丹。",
      wei: "五行俱全，等于五行皆废。",
      none: "",
    };
    $("fateNote").textContent = s.root.text + (notes[s.root.key] && s.root.key !== "none" ? " " + notes[s.root.key] : "");
    $("fateCard").style.opacity = "1";
  }

  /* ======================================================================
     主界面骨架
     ====================================================================== */
  function renderActionBar() {
    const bar = document.querySelector(".action-bar");
    bar.innerHTML = `<span class="action-label">命运的重心</span><div class="chips" id="focusChips"></div><button class="btn btn--sm" id="btnShop" type="button">货栈</button>`;
    if (state.path === "mortal") {
      bar.innerHTML =
        '<span class="action-label">凡人的日子</span><span class="tiny dim" style="font-family:var(--kai);letter-spacing:.08em">此身凡骨，日子只能一天一天地过。</span>';
      return;
    }
    $("focusChips").innerHTML = D.FOCUS.map(
      (f) =>
        `<button class="chip${f.key === state.focus ? " on" : ""}" data-focus="${f.key}" type="button" title="${U.esc(f.desc)}">${f.name}</button>`
    ).join("");
    $("focusChips").querySelectorAll(".chip").forEach((b) => {
      b.addEventListener("click", () => {
        state.focus = b.dataset.focus;
        U.store.setPref("focus", state.focus);
        $("focusChips").querySelectorAll(".chip").forEach((x) => x.classList.toggle("on", x === b));
        toast(`重心转为「${b.textContent}」`);
        saveRun();
      });
    });
    $("btnShop").addEventListener("click", openShop);
  }

  function buildLifeUI() {
    renderActionBar();

    $("log").innerHTML = "";
    $("peersList").innerHTML = "";
    $("ladder").innerHTML = "";
    $("mapGrid").innerHTML = "";
    $("mapLegend").innerHTML = "";
    $("chartBox").innerHTML = "";
    logRendered = 0;
    lastChartKey = "";
    lastMapKey = "";
    lastSaveAt = 0;
  }

  /* ======================================================================
     循环
     ====================================================================== */
  function schedule() {
    clearTimeout(timer);
    if (paused || !sim || !state.alive) return;
    const delay = (PACE[pace] || PACE.mid) / speed;
    timer = setTimeout(loop, delay);
  }

  function loop() {
    if (!sim || paused) return;
    const before = state.log.length;
    const res = sim.step();
    appendLogs(before);
    refreshAll();
    if (handleWorldChange()) return;
    if (!state.alive) {
      endLife();
      return;
    }
    if (state.pending) {
      openPrompt();
      return;
    }
    saveRun();
    schedule();
  }

  function fastForward() {
    if (!sim || !state.alive) return;
    paused = true;
    let guard = 0;
    while (guard++ < 800) {
      const res = sim.step();
      if (res.status !== "ok") break;
    }
    renderLogAll();
    refreshAll();
    if (handleWorldChange()) return;
    if (!state.alive) {
      endLife();
      return;
    }
    if (state.pending) {
      openPrompt();
      return;
    }
    paused = false;
    $("btnPause").textContent = "❚❚";
    saveRun();
    schedule();
  }

  function setSpeed(v) {
    speed = v;
    document.querySelectorAll("#speeds button").forEach((b) => {
      b.classList.toggle("on", Number(b.dataset.speed) === v);
    });
    document.querySelectorAll("#menuSpeeds button").forEach((b) => {
      b.classList.toggle("on", Number(b.dataset.mspeed) === v);
    });
    U.store.setPref("speed", v);
    if (sim && !paused) schedule();
  }

  /* ======================================================================
     日志
     ====================================================================== */
  function entryHTML(e, idx) {
    const year = `<div class="log-year">${e.age}<span>岁</span></div>`;
    let cls = "k-" + e.kind;
    if (e.kind === "death") {
      return `<div class="log-entry ${cls}">${year}<div class="log-text">${U.esc(soften(e.text))}</div></div>`;
    }
    const title = e.title ? `<span class="ev-title">${U.esc(soften(e.title))}</span>` : "";
    return `<div class="log-entry ${cls}" data-i="${idx}">${year}<div class="log-text">${title}${U.esc(soften(e.text))}</div></div>`;
  }

  function appendLogs(from) {
    const log = $("log");
    const entries = state.log.slice(from);
    if (!entries.length) return;
    const nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 120;
    const frag = document.createElement("div");
    frag.innerHTML = entries.map((e, i) => entryHTML(e, from + i)).join("");
    while (frag.firstChild) log.appendChild(frag.firstChild);
    if (nearBottom) log.scrollTop = log.scrollHeight;
    logRendered = state.log.length;
  }

  function renderLogAll() {
    const log = $("log");
    log.innerHTML = state.log.map((e, i) => entryHTML(e, i)).join("");
    log.scrollTop = log.scrollHeight;
    logRendered = state.log.length;
  }

  /* ======================================================================
     刷新
     ====================================================================== */
  function refreshAll(full) {
    const s = state;
    // 顶栏
    $("ageNum").textContent = s.age;
    $("tbRealm").textContent = sim.displayRealm();
    const remain = Math.max(0, 1 - s.age / s.maxAge);
    $("lifeBar").style.width = (remain * 100).toFixed(1) + "%";
    $("lifeBar").style.background =
      remain < 0.15 ? "var(--cinnabar-2)" : "var(--realm)";

    // 命牌
    $("idSeal").textContent = s.name[0];
    $("idName").textContent = s.name;
    $("idSub").textContent =
      s.path === "cultivator" ? `${s.daohao} · ${s.gender}` : `凡俗 · ${s.gender}`;
    $("idRealmName").textContent = sim.displayRealm();
    $("idRealmTag").textContent = worldName(s.world);
    const rankName = sim.sectRankName();
    const tags = [
      s.root.name,
      rankName ? `${s.sect} · ${rankName}` : s.sect || "散修",
      s.origin.family,
    ];
    const stageNames = {
      childhood: "童年",
      mortal: "凡俗",
      qi: "炼气",
      core: "结丹 / 元婴",
      spirit: "灵界",
      immortal: "仙界",
    };
    tags.push(stageNames[sim.stage()]);
    if (s.bottle) tags.push("无名旧瓶");
    if (s.flags && s.flags.xutian && !s.flags.xutian_closed) {
      tags.push(s.flags.xutian_3_done ? "残图 · 已了" : s.flags.xutian_2_done ? "残图 · 入殿" : "残图 · 半图");
    }
    if (s.tier === 12 && s.flags) {
      const sanshi = [s.flags.sanshi_e, s.flags.sanshi_shan, s.flags.sanshi_wo].filter(Boolean).length;
      if (s.flags.sanshi_closed) tags.push("斩三尸 · 止步");
      else if (sanshi) tags.push(`斩三尸 · ${sanshi}/3`);
    }
    if (s.traits) {
      const traitLabels = {
        kind: "仁厚",
        ruthless: "狠辣",
        curious: "好奇",
        bold: "冒险",
        calm: "沉静",
      };
      const top = Object.entries(s.traits).sort((a, b) => b[1] - a[1])[0];
      if (top && top[1] >= 3 && traitLabels[top[0]]) {
        tags.push(`心性 · ${traitLabels[top[0]]}`);
      }
    }
    $("idTags").innerHTML = tags.map((t) => `<span>${U.esc(t)}</span>`).join("");

    // 状态
    $("vCult").textContent = s.tier === 0 ? "凡骨" : Math.round(s.cult) + "%";
    $("bCult").style.width = (s.tier === 0 ? 0 : s.cult) + "%";
    $("vMood").textContent = Math.round(s.mood);
    $("bMood").style.width = s.mood + "%";
    $("vKarma").textContent = (s.karma > 0 ? "+" : "") + Math.round(s.karma);
    const k = Math.max(-100, Math.min(100, s.karma));
    const karmaBar = $("bKarma");
    if (k >= 0) {
      karmaBar.style.left = "50%";
      karmaBar.style.width = k / 2 + "%";
    } else {
      karmaBar.style.left = 50 + k / 2 + "%";
      karmaBar.style.width = -k / 2 + "%";
    }
    $("vInsight").textContent = Math.round(s.insight);
    $("bInsight").style.width = s.insight + "%";
    $("vStones").textContent = U.fmt(s.stones);
    $("vWard").textContent = s.ward;

    // 关系
    const rels = [];
    const bondStatus = (person) =>
      person && person.alive === false
        ? `离世${person.fate ? ` · ${person.fate}` : ""}`
        : "在世";
    rels.push({
      ico: "门",
      name: s.sect || "无门无派",
      sub: rankName ? `宗门 · ${rankName} · 贡献 ${Math.round(s.sectContrib || 0)}` : "宗门 / 归属",
      when: "",
    });
    if (s.partner) {
      const partnerRealm = (D.REALMS[s.partner.tier || 0] || D.REALMS[0]).name;
      const partnerWorld = (D.WORLD_META[s.partner.world || s.world] || {}).name || "";
      const partnerState = s.partner.status === "apart" ? "异地 · " : "";
      rels.push({
        ico: "侣",
        name: s.partner.name,
        sub: `${s.partner.title} · ${partnerRealm} · ${partnerWorld} · ${partnerState}${bondStatus(s.partner)}`,
        when: `${typeof s.partner.age === "number" ? s.partner.age : s.partner.since}岁`,
      });
    }
    const discipleList = (s.disciples || []).slice().sort((a, b) => (a.alive === false ? 1 : 0) - (b.alive === false ? 1 : 0));
    for (const d of discipleList) {
      const dRealm = (D.REALMS[d.tier || 0] || D.REALMS[0]).name;
      rels.push({
        ico: "徒",
        name: d.name,
        sub: `${d.title || "弟子"} · ${dRealm} · 亲厚 ${Math.round(d.affinity || 0)} · ${bondStatus(d)}`,
        when: `${typeof d.age === "number" ? d.age : d.since}岁`,
        dead: d.alive === false,
      });
    }
    const rivalList = (s.rivals || []).slice().sort((a, b) => (a.alive === false ? 1 : 0) - (b.alive === false ? 1 : 0));
    for (const r of rivalList) {
      const rRealm = (D.REALMS[r.tier || 0] || D.REALMS[0]).name;
      rels.push({
        ico: "仇",
        name: r.name,
        sub: `${r.title || "对手"} · ${rRealm} · 敌意 ${Math.round(r.hostility || 0)} · ${bondStatus(r)}`,
        when: `${typeof r.age === "number" ? r.age : r.since}岁`,
        dead: r.alive === false,
      });
    }
    if (rels.length === 1)
      rels.push({ ico: "影", name: "孤身一人", sub: "修行路上，暂无同行者", when: "" });
    $("relList").innerHTML = rels
      .map(
        (r) =>
          `<div class="rel${r.dead ? " dead" : ""}"><div class="rel-ico">${r.ico}</div><div><div class="rel-name">${U.esc(r.name)}</div><div class="rel-sub">${U.esc(r.sub)}</div></div><div class="rel-when">${U.esc(r.when)}</div></div>`
      )
      .join("");

    // 所在
    $("placeScene").innerHTML = A.scene(s.world, s.seed);
    $("placeName").textContent = s.place;
    $("placeSub").textContent = `${worldName(s.world)} · ${s.origin.family}`;

    // 同劫
    $("peersList").innerHTML = s.peers
      .map((p) => {
        const dead = !p.alive;
        return `<div class="peer${dead ? " dead" : ""}"><div class="peer-name">${p.name}</div><div class="peer-meta">${p.root} · ${p.place}</div><div class="peer-realm">${dead ? p.fate : D.REALMS[p.tier].name}</div></div>`;
      })
      .join("");

    // 道途
    const ladder = [];
    D.REALMS.slice(1).forEach((r) => {
      if (r.tier === 6 || r.tier === 9) {
        ladder.push(`<div class="rung-world">${worldName(r.world)}</div>`);
      }
      const done = s.tier > r.tier;
      const now = s.tier === r.tier;
      ladder.push(
        `<div class="rung ${done ? "done" : ""} ${now ? "now" : ""}"><span>${r.name}</span><span class="tier">${done ? "已过" : now ? "此身" : "第" + r.tier + "境"}</span></div>`
      );
    });
    $("ladder").innerHTML = ladder.join("");

    // 人生地图
    const mapKey = `${Math.floor(s.age / 5)}|${s.tier}|${s.maxAge}|${s.tierHistory.length}`;
    if (full || mapKey !== lastMapKey) {
      renderMap();
      lastMapKey = mapKey;
    }

    // 曲线
    const chartKey = `${Math.floor(s.age / 10)}|${s.maxAge}`;
    if (full || chartKey !== lastChartKey) {
      $("chartBox").innerHTML = A.survivalChart(s.age, s.maxAge);
      $("chartBox").style.color = "var(--realm)";
      lastChartKey = chartKey;
    }

    // 日志
    if (full) renderLogAll();
    else appendLogs(logRendered);
    $("logHint").textContent = state.pending ? "有一个抉择正在等你" : "逐年记录 · 最新的在最下面";
  }

  function renderMap() {
    const s = state;
    const cells = 128;
    const max = Math.max(20, s.maxAge);
    const segs = s.tierHistory;
    const tierAt = (age) => {
      let t = s.tierHistory.length ? s.tierHistory[0].tier : s.tier;
      for (let i = 0; i < segs.length; i++) {
        if (segs[i].age <= age) t = segs[i].tier;
        else break;
      }
      return t;
    };
    let html = "";
    for (let i = 0; i < cells; i++) {
      const age = (i / cells) * max;
      const t = age <= s.age ? tierAt(age) : null;
      const color = t == null ? null : D.REALMS[t].color;
      const emptyColor =
        document.documentElement.dataset.theme === "day"
          ? "rgba(27,33,28,.06)"
          : "rgba(255,255,255,.035)";
      html += `<span class="map-cell" title="${t == null ? "未至" : age.toFixed(0) + "岁 · " + D.REALMS[t].name}" style="background:${color || emptyColor};opacity:${t == null ? 1 : 0.85}"></span>`;
    }
    $("mapGrid").innerHTML = html;
    $("mapScale").textContent = `一格 ≈ ${Math.max(1, Math.round(max / cells))} 年`;

    const reached = [];
    for (let i = segs.length - 1; i >= 0; i--) {
      if (!reached.find((x) => x.tier === segs[i].tier)) reached.unshift(segs[i]);
    }
    const show = reached.slice(-5);
    $("mapLegend").innerHTML = show
      .map(
        (x) =>
          `<span><i style="background:${D.REALMS[x.tier].color}"></i>${D.REALMS[x.tier].name}</span>`
      )
      .join("");
  }

  /* ======================================================================
     抉择
     ====================================================================== */
  function stopWhisper() {
    if (whisperTimer) {
      clearInterval(whisperTimer);
      whisperTimer = null;
    }
    const el = $("choiceWhisper");
    if (el) el.textContent = "";
  }

  function startWhisper() {
    stopWhisper();
    const el = $("choiceWhisper");
    if (!el || !sim) return;
    const stage = sim.stage();
    const pool = (D.MICRO && D.MICRO[stage]) || D.AMBIENT.mortal || [];
    if (!pool.length) return;
    let last = -1;
    const tick = () => {
      let i = Math.floor(Math.random() * pool.length);
      if (pool.length > 1 && i === last) i = (i + 1) % pool.length;
      last = i;
      el.textContent = `旁白 · ${pool[i]}`;
    };
    tick();
    whisperTimer = setInterval(tick, 5200);
  }

  function openDanger() {
    clearTimeout(autoTimer);
    resetPromptChrome();
    const p = state.pending;
    if (!p || p.kind !== "danger") return;
    $("choiceKicker").textContent = "濒 死";
    $("choiceTitle").textContent = soften(p.title || "濒死");
    $("choiceText").textContent = soften(p.text || "");
    $("choiceOpts").innerHTML = p.options
      .map((c, i) => {
        const cost =
          c.ward
            ? "消耗 1 枚护身玉符"
            : c.costStones > 0
            ? `消耗 ${
                c.costStones < 1
                  ? Math.max(1, Math.floor(state.stones * c.costStones))
                  : Math.floor(c.costStones)
              } 灵石`
            : "不消耗灵石";
        const disabled =
          (c.ward && state.ward < 1) ||
          (c.costStones > 0 &&
            state.stones <
              (c.costStones < 1
                ? Math.max(1, Math.floor(state.stones * c.costStones))
                : Math.floor(c.costStones)));
        return `<button class="opt opt--danger" type="button" data-i="${i}" ${
          disabled ? "disabled" : ""
        }>
          <b>${U.esc(soften(c.label))}</b>
          <span>${cost}</span>
        </button>`;
      })
      .join("");
    $("choiceOpts").querySelectorAll(".opt").forEach((b) => {
      b.addEventListener("click", () => choose(Number(b.dataset.i)));
    });
    $("choiceOverlay").hidden = false;
    startWhisper();
    trapChoicePrompt();
    const first = $("choiceOpts").querySelector(".opt:not([disabled])");
    if (first) first.focus();
    if (auto) {
      autoTimer = setTimeout(() => {
        const usable = p.options
          .map((c, i) => ({ c, i }))
          .filter((x) => {
            if (x.c.ward && state.ward < 1) return false;
            if (x.c.costStones > 0) {
              const cost =
                x.c.costStones < 1
                  ? Math.max(1, Math.floor(state.stones * x.c.costStones))
                  : Math.floor(x.c.costStones);
              return state.stones >= cost;
            }
            return true;
          })
          .sort((a, b) => b.c.p - a.c.p);
        choose(usable.length ? usable[0].i : 0);
      }, 1100);
    }
  }

  function openPrompt() {
    clearTimeout(autoTimer);
    resetPromptChrome();
    if (!state.pending) return;
    if (state.pending.kind === "break") return startAutoBreak();
    if (state.pending.kind === "danger") return openDanger();
    const p = state.pending;
    const waitLocked =
      (p.id === "d_node" && (state.flags.wait_spirit_count || 0) >= 3) ||
      (p.id === "m_ascend" && (state.flags.wait_immortal_count || 0) >= 3);
    const costOf = (c) => {
      if (c.donate) return Number(c.donate.min) || 10;
      return c.requires && c.requires.stones != null
        ? c.requires.stones
        : c.effects && c.effects.stones < 0
        ? -c.effects.stones
        : 0;
    };
    const anyAffordable = p.choices.some(
      (c) =>
        state.stones >= costOf(c) &&
        !(waitLocked && c.effects && c.effects.wait)
    );
    if (!anyAffordable) {
      p.choices.push({
        label: "拿不出灵石，只能作罢",
        effects: { mood: -2 },
        outcome: "你摸了摸空空的储物袋，把话咽了回去。",
      });
    }
    $("choiceKicker").textContent = "抉 择";
    $("choiceTitle").textContent = soften(p.title || "");
    $("choiceText").textContent = soften(p.text || "");
    $("choiceOpts").innerHTML = p.choices
      .map((c, i) => {
        const required =
          c.requires && c.requires.stones != null
            ? c.requires.stones
            : c.effects && c.effects.stones < 0
            ? -c.effects.stones
            : 0;
        const poor = required > state.stones;        const isWait = !!(c.effects && c.effects.wait);
        const blockedWait = waitLocked && isWait;
        const disabled = poor || blockedWait;
        if (c.donate) {
          const min = Number(c.donate.min) || 10;
          const max = Math.min(Number(c.donate.max) || state.stones, state.stones);
          const step = Number(c.donate.step) || 10;
          const value = Math.min(max, min);
          const affordable = max >= min && !poor;
          return `<div class="opt opt--donate${affordable ? "" : " is-disabled"}" data-i="${i}">
            <b>${U.esc(soften(c.label))}</b>
            <div class="donate-row">
              <input class="donate-range" type="range" min="${min}" max="${Math.max(min, max)}" step="${step}" value="${value}" aria-label="捐出灵石数量" ${affordable ? "" : "disabled"}>
              <span class="donate-value">${affordable ? value + " 灵石" : "灵石不足"}</span>
              <button class="donate-all" type="button" ${affordable ? "" : "disabled"}>全部</button>
              <button class="donate-confirm" type="button" ${affordable ? "" : "disabled"}>捐出</button>
            </div>
            <span>${affordable ? `最多可捐 ${max} 块；捐得越多，因果越重。` : "身上没有足够的灵石。"}</span>
          </div>`;
        }
        const sub = blockedWait
          ? `<span>再等下去，心气就散了。此路只能走一次。</span>`
          : poor
          ? `<span>身上灵石不够，做不到。</span>`
          : c.note
          ? `<span>${U.esc(c.note)}</span>`
          : "";
        return `<button class="opt" type="button" data-i="${i}" ${disabled ? "disabled" : ""}>
          <b>${U.esc(soften(c.label))}</b>
          ${sub}
        </button>`;
      })
      .join("");
    $("choiceOpts").querySelectorAll(".opt").forEach((b) => {
      if (b.classList.contains("opt--donate")) return;
      b.addEventListener("click", () => choose(Number(b.dataset.i)));
    });
    $("choiceOpts").querySelectorAll(".opt--donate").forEach((box) => {
      const range = box.querySelector(".donate-range");
      const value = box.querySelector(".donate-value");
      const confirm = box.querySelector(".donate-confirm");
      const all = box.querySelector(".donate-all");
      if (!range || !confirm) return;
      range.addEventListener("input", () => {
        value.textContent = `${range.value} 灵石`;
      });
      if (all) {
        all.addEventListener("click", () => {
          range.value = range.max;
          value.textContent = `${range.value} 灵石`;
        });
      }
      box.addEventListener("click", (e) => {
        if (e.target.closest("input,button")) return;
        confirm.click();
      });
      confirm.addEventListener("click", () =>
        choose(Number(box.dataset.i), { donateAmount: Number(range.value) })
      );
    });
    $("choiceOverlay").hidden = false;
    startWhisper();
    trapChoicePrompt();
    const first = $("choiceOpts").querySelector(".opt:not([disabled]):not(.is-disabled)");
    if (first) {
      const focusEl = first.classList.contains("opt--donate")
        ? first.querySelector(".donate-confirm, .donate-range")
        : first;
      if (focusEl) focusEl.focus();
    }

    if (auto) {
      autoTimer = setTimeout(() => {
        if (p.id === "i_sanshi_wo") {
          choose(1);
          return;
        }
        if (p.id.indexOf("i_sanshi_") === 0) {
          choose(0);
          return;
        }
        if (p.id === "d_node" || p.id === "m_ascend") {
          const i = p.choices.findIndex((c) => c.effects && c.effects.ascend);
          choose(i >= 0 ? i : 0);
          return;
        }
        const choices = p.choices;
        const usable = choices
          .map((c, i) => ({ c, i }))
          .filter((x) => {
            const cost =
              x.c.requires && x.c.requires.stones != null
                ? x.c.requires.stones
                : x.c.effects && x.c.effects.stones < 0
                ? -x.c.effects.stones
                : 0;
            return cost <= state.stones;
          });
        const score = (c) => {
          if (c.risk && c.risk.fail && c.risk.fail.death) return 1000 + (1 - c.risk.p);
          if (c.risk) return 10 + (1 - c.risk.p);
          return 0;
        };
        usable.sort((a, b) => score(a.c) - score(b.c));
        const chosen = usable.length ? usable[0] : { c: choices[0], i: 0 };
        choose(chosen.i, chosen.c.donate ? { donateAmount: chosen.c.donate.min || 10 } : undefined);
      }, 1100);
    }
  }

  function choose(i, opts) {
    clearTimeout(autoTimer);
    stopWhisper();
    resetPromptChrome();
    if (releasePromptTrap) {
      releasePromptTrap();
      releasePromptTrap = null;
    }
    $("choiceOverlay").hidden = true;
    const before = state.log.length;
    const isDanger = state.pending && state.pending.kind === "danger";
    const result = isDanger ? sim.resolveDanger(i) : sim.choose(i, opts);
    if (result === null) {
      openPrompt();
      return;
    }
    appendLogs(before);
    renderActionBar();
    refreshAll();
    if (!state.alive) return endLife();
    if (handleWorldChange()) return;
    if (state.pending) return openPrompt();
    paused = false;
    $("btnPause").textContent = "❚❚";
    saveRun();
    schedule();
  }

  function startAutoBreak() {
    if (!state || !state.pending || state.pending.kind !== "break") return;
    clearTimeout(timer);
    clearTimeout(autoTimer);
    stopWhisper();
    paused = true;
    if (releasePromptTrap) {
      releasePromptTrap();
      releasePromptTrap = null;
    }
    $("choiceOverlay").hidden = true;
    resetPromptChrome();

    const fromRealm = sim.displayRealm();
    const target = D.REALMS[state.tier + 1];
    const before = state.log.length;
    const result = sim.chooseBreak("push");
    appendLogs(before);
    refreshAll();
    const success = !!(result && result.status === "break");
    const worldChanged = state.world !== themeWorld;
    if (XD.Audio) XD.Audio.bell(success ? "break" : "soft");

    $("ascendWord").textContent = success ? "破 境" : "功 亏";
    $("ascendSub").textContent = success
      ? `${fromRealm} → ${target ? target.name : sim.displayRealm()}${worldChanged ? " · 飞升" : ""}`
      : `${fromRealm} · 冲关未成`;
    $("ascend").classList.toggle("is-fail", !success);
    $("ascendBolt").innerHTML = `<svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%">
      <g stroke="#e0c98d" stroke-width="1.2" fill="none" opacity=".55">
        <path d="M120 0 L160 120 L130 130 L190 250 L150 260 L220 430" />
        <path d="M620 0 L590 90 L640 110 L600 230 L650 250 L600 400" />
        <path d="M380 0 L400 80 L370 96 L410 190" stroke-width="2"/>
      </g>
    </svg>`;
    $("ascend").hidden = false;

    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      $("ascendSkip").removeEventListener("click", close);
      $("ascend").hidden = true;
      $("ascend").classList.remove("is-fail");
      if (worldChanged) setTheme(state.world);
      if (!state.alive) {
        endLife();
        return;
      }
      if (state.pending) {
        openPrompt();
        return;
      }
      paused = false;
      $("btnPause").textContent = "❚❚";
      saveRun(true);
      schedule();
    };
    $("ascendSkip").addEventListener("click", close);
    setTimeout(close, success ? 1900 : 1300);
  }

  function handleWorldChange() {
    if (!state || state.world === themeWorld) return false;
    paused = true;
    clearTimeout(timer);
    playAscend(state.world);
    return true;
  }

  function playAscend(world) {
    if (XD.Audio) XD.Audio.bell("ascend");
    setTheme(world);
    $("ascendWord").textContent = "飞升";
    $("ascendSub").textContent = world === "spirit" ? "人界 · 化神 → 灵界 · 炼虚" : "灵界 · 大乘 → 仙界 · 真仙";
    $("ascendBolt").innerHTML = `<svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%">
      <g stroke="#e0c98d" stroke-width="1.2" fill="none" opacity=".55">
        <path d="M120 0 L160 120 L130 130 L190 250 L150 260 L220 430" />
        <path d="M620 0 L590 90 L640 110 L600 230 L650 250 L600 400" />
        <path d="M380 0 L400 80 L370 96 L410 190" stroke-width="2"/>
      </g>
    </svg>`;
    $("ascend").hidden = false;
    let closed = false;
    let fallback = null;
    const close = () => {
      if (closed) return;
      closed = true;
      clearTimeout(fallback);
      $("ascend").hidden = true;
      $("ascendSkip").removeEventListener("click", close);
      refreshAll();
      if (sim && !state.pending && state.alive) {
        paused = false;
        $("btnPause").textContent = "❚❚";
        schedule();
      }
    };
    $("ascendSkip").addEventListener("click", close);
    fallback = setTimeout(close, 3600);
  }

  /* ======================================================================
     终局
     ====================================================================== */
  function renderLegacy(legacy) {
    const box = $("legacyBox");
    if (!box || !legacy) return;
    const source = legacy.source || {};
    const rows = [];
    rows.push([
      "灵根余韵",
      legacy.rootKey
        ? `下一世更容易生出与「${legacy.rootName || "前世灵根"}」同源的灵根`
        : "凡骨无灵根余韵",
    ]);
    rows.push(["悟性起点", `+${legacy.insight || 0}`]);
    rows.push([
      "遗物",
      `灵石余泽${legacy.ward ? " · 护身玉符 ×1" : ""}`,
    ]);
    rows.push([
      "未了因果",
      legacy.karma ? `因果 ${legacy.karma > 0 ? "+" : ""}${legacy.karma}` : "无牵无挂",
    ]);
    $("legacySource").textContent = `${source.name || "无名"} · ${source.realm || "凡人"} · ${source.cause || "离世"} · ${source.age || 0}岁`;
    $("legacyList").innerHTML = rows
      .map(
        ([k, v]) =>
          `<div class="legacy-row"><span>${U.esc(k)}</span><b>${U.esc(v)}</b></div>`
      )
      .join("");
    box.hidden = false;
  }

  function endLife() {
    stopWhisper();
    clearTimeout(timer);
    clearTimeout(autoTimer);
    resetPromptChrome();
    $("choiceOverlay").hidden = true;
    if (XD.Audio) XD.Audio.bell(state.legendary ? "ascend" : "death");
    const s = state;
    const lineageBefore = U.store.lineage();
    const lifeNo = (Number(lineageBefore.total) || 0) + 1;
    endSummary = sim.summary();
    endSummary.lifeNo = lifeNo;

    let legacyStored = false;
    if (!saved) {
      U.store.clearRun();
      const stored = U.store.addLife(endSummary);
      const lineageStored = U.store.addLineage({
        no: lifeNo,
        lifeKey: `${endSummary.id}-${endSummary.ts}`,
        name: endSummary.name,
        world: endSummary.world,
        realm: endSummary.realm,
        cause: endSummary.cause,
        age: endSummary.age,
        sect: endSummary.sect,
        partnerName:
          (s.partner && s.partner.name) ||
          (s.partnerHistory && s.partnerHistory.length
            ? s.partnerHistory[s.partnerHistory.length - 1].name
            : ""),
        discipleNames: (s.disciples || []).slice(0, 3).map((d) => d.name),
        wish: endSummary.wish,
        seed: endSummary.seed,
        ts: endSummary.ts,
      });
      legacyStored = U.store.setLegacy(endSummary.legacy);
      saved = true;
      $("endNote").textContent = stored
        ? lineageStored
          ? legacyStored
            ? "这一世的记录、谱系与道果已经留在本机。碑林里可以再看见它，命格卡可以带走。"
            : "这一世的记录与谱系已经留下，但道果没能写入本机。命格卡仍然可以带走。"
          : "这一世的记录已经留下，但谱系没能写入本机。命格卡仍然可以带走。"
        : "这个浏览器不让保存记录。这一世不会留在碑林，但命格卡仍然可以带走。";
    }

    const titles = {
      证道: "证 道",
      寿元耗尽: "坐 化",
      走火入魔: "道 消",
      心魔缠身: "道 消",
    };
    const finale = endSummary.finale;
    $("endTitle").textContent = soft && !s.legendary
      ? "远 行"
      : (finale && finale.title) || (s.legendary ? "证 道" : titles[s.cause] || "陨 落");
    $("endSub").textContent = `${worldName(s.world)} · ${sim.displayRealm()} · 享年 ${s.endedAt != null ? s.endedAt : s.age} 岁${finale ? " · " + finale.karmaLabel : ""} · 第 ${lifeNo} 世`;
    $("endSeal").textContent = s.name[0];
    $("endName").textContent = s.name + (s.path === "cultivator" && s.daohao ? ` · ${s.daohao}` : "");
    $("endLife").textContent = `${s.origin.place} · ${s.origin.family} · ${soften(s.cause)}`;
    $("endEpitaph").textContent = "「" + soften(s.epitaph || "此人一生，不足为外人道。") + "」";
    $("endWish").textContent = endSummary.wish ? `遗愿：${soften(endSummary.wish.text)}` : "";
    $("endNarrative").textContent = finale ? soften(finale.narrative || "") : "";
    $("endActs").innerHTML = finale && finale.acts
      ? finale.acts
          .map(
            (act) =>
              `<div class="act"><span class="act-tag">${U.esc(act.tag)}</span><span class="act-age">${act.age == null ? "—" : act.age + "岁"}</span><span class="act-text">${U.esc(soften(act.text))}</span></div>`
          )
          .join("")
      : "";

    const endDisciples = (s.disciples || []).filter((d) => d.alive !== false).length;
    const endRivals = (s.rivals || []).filter((r) => r.alive !== false).length;
    const fields = [
      ["最高境界", sim.displayRealm()],
      ["灵根", s.root.name],
      ["宗门", s.sect ? `${s.sect}${sim.sectRankName() ? " · " + sim.sectRankName() : ""}` : "散修"],
      ["道侣", s.partner ? s.partner.name : "无"],
      ["弟子", endDisciples ? `${endDisciples} 人在世` : "无"],
      ["对手", endRivals ? `${endRivals} 人` : "无"],
      ["因果", (s.karma > 0 ? "+" : "") + Math.round(s.karma)],
      ["灵石", U.fmt(s.stones)],
      ["子嗣", s.flags.has_child ? "有" : "无"],
    ];
    $("endFields").innerHTML = fields
      .map(
        ([k, v]) =>
          `<div class="end-field"><dt>${U.esc(k)}</dt><dd>${U.esc(v)}</dd></div>`
      )
      .join("");

    $("endDeeds").innerHTML =
      (endSummary.deeds || [])
        .slice(-5)
        .map(
          (d) =>
            `<div class="deed"><span class="deed-age">${d.age}岁</span><span>${U.esc(soften(d.text))}</span></div>`
        )
        .join("") || '<div class="deed"><span class="deed-age">—</span><span>这一世没有留下什么值得记下的事。</span></div>';

    renderLegacy(endSummary.legacy);
    show("end");
  }

  /* ======================================================================
     命格卡
     ====================================================================== */
  function drawShareCard() {
    const s = endSummary || sim.summary();
    const c = $("shareCanvas");
    const ctx = c.getContext("2d");
    const W = c.width;
    const H = c.height;
    ctx.fillStyle = "#0b0f0b";
    ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W * 0.75, 120, 40, W * 0.75, 120, 900);
    g.addColorStop(0, "rgba(127,178,155,.16)");
    g.addColorStop(1, "rgba(11,15,11,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(233,227,211,.16)";
    ctx.lineWidth = 1;
    ctx.strokeRect(56, 56, W - 112, H - 112);
    ctx.strokeStyle = "rgba(233,227,211,.08)";
    ctx.strokeRect(70, 70, W - 140, H - 140);

    ctx.fillStyle = "rgba(233,227,211,.55)";
    ctx.font = '22px "KaiTi","STKaiti",serif';
    ctx.textAlign = "left";
    ctx.fillText("一 介 凡 人", 110, 130);
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(233,227,211,.35)";
    ctx.font = '18px "KaiTi","STKaiti",serif';
    ctx.fillText("凡人修仙传世界观 · 人生模拟", W - 110, 130);

    ctx.textAlign = "left";
    ctx.fillStyle = "#e9e3d3";
    ctx.font = '108px "KaiTi","STKaiti",serif';
    ctx.fillText(s.name, 106, 330);
    ctx.font = '26px "KaiTi","STKaiti",serif';
    ctx.fillStyle = "rgba(233,227,211,.5)";
    ctx.fillText(
      s.path === "cultivator" ? `${s.daohao} · ${s.gender} · ${worldName(s.world)}` : `凡俗 · ${s.gender} · ${worldName(s.world)}`,
      110,
      382
    );

    ctx.fillStyle = "rgba(233,227,211,.08)";
    ctx.fillRect(110, 430, W - 220, 1);

    // 大字境界
    ctx.fillStyle = "#7fb29b";
    ctx.font = '600 64px "Songti SC","SimSun",serif';
    ctx.fillText(s.realm, 110, 540);
    ctx.fillStyle = "rgba(233,227,211,.45)";
    ctx.font = '22px "KaiTi","STKaiti",serif';
    ctx.fillText(`享年 ${s.age} 岁 · ${soften(s.cause)}`, 112, 588);

    // 墓志
    ctx.fillStyle = "#d9d2be";
    ctx.font = '30px "KaiTi","STKaiti",serif';
    wrapText(ctx, "「" + soften(s.epitaph || "此人一生，不足为外人道。") + "」", 110, 700, W - 220, 48);

    // 数据
    const rows = [
      ["生 于", s.origin.place],
      ["出 身", s.origin.family],
      ["灵 根", s.root.name],
      ["宗 门", s.sect ? `${s.sect}${sim.sectRankName() ? " · " + sim.sectRankName() : ""}` : "散修"],
      ["道 侣", s.partner ? s.partner.name : "无"],
      ["弟 子", ((s.disciples || []).filter((d) => d.alive !== false).length || 0) + " 人"],
    ];
    ctx.font = '21px "KaiTi","STKaiti",serif';
    rows.forEach((r, i) => {
      const y = 900 + i * 46;
      ctx.fillStyle = "rgba(233,227,211,.35)";
      ctx.fillText(r[0], 110, y);
      ctx.fillStyle = "rgba(233,227,211,.78)";
      ctx.fillText(r[1], 260, y);
    });

    // 印
    ctx.save();
    ctx.translate(W - 220, 980);
    ctx.rotate(-0.04);
    ctx.fillStyle = "#ae4430";
    ctx.fillRect(0, 0, 120, 120);
    ctx.fillStyle = "#f6ecda";
    ctx.font = '78px "KaiTi","STKaiti",serif';
    ctx.textAlign = "center";
    ctx.fillText(s.name[0], 60, 92);
    ctx.restore();

    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(233,227,211,.3)";
    ctx.font = '18px "KaiTi","STKaiti",serif';
    ctx.fillText(fmtSeed(s.seed), 110, H - 100);
    ctx.textAlign = "right";
    ctx.fillText("yijie-fanren", W - 110, H - 100);

    let url;
    try {
      url = c.toDataURL("image/png");
    } catch (err) {
      toast("这张命格卡没能生成，换一台设备或稍后再试");
      return;
    }
    const safeRealm = String(s.realm || "凡人").replace(/[\\/:*?"<>|·\s]+/g, "-");
    const filename = `一介凡人-${s.name}-${safeRealm}.png`;
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !("download" in a)) {
      window.open(url, "_blank");
    }
    toast("命格卡已生成");
  }

  function wrapText(ctx, text, x, y, maxW, lineH) {
    let line = "";
    for (const ch of text) {
      const test = line + ch;
      if (ctx.measureText(test).width > maxW) {
        ctx.fillText(line, x, y);
        y += lineH;
        line = ch;
      } else line = test;
    }
    if (line) ctx.fillText(line, x, y);
  }

  /* ======================================================================
     货栈
     ====================================================================== */
  function openShop() {
    if (!sim) return;
    stopWhisper();
    if ($("shopOverlay").hidden) {
      shopPaused = paused;
      paused = true;
      clearTimeout(timer);
      clearTimeout(autoTimer);
    }
    const s = state;
    const list = D.SHOP.filter(
      (it) =>
        (it.tierMin == null || s.tier >= it.tierMin) &&
        (it.tierMax == null || s.tier <= it.tierMax)
    );
    $("shopPurse").textContent = U.fmt(s.stones);
    $("shopList").innerHTML = list
      .map((it) => {
        const bought = s.flags["buy_" + it.key];
        const disabled = s.stones < it.cost || (it.once && bought);
        return `<div class="shop-item"><h4>${it.name}${it.once && bought ? " · 已有" : ""}</h4><p>${it.desc}</p><button class="shop-buy" data-key="${it.key}" ${disabled ? "disabled" : ""}>${it.once && bought ? "已购" : it.cost + " 灵石"}</button></div>`;
      })
      .join("");
    $("shopList").querySelectorAll(".shop-buy").forEach((b) => {
      b.addEventListener("click", () => {
        const it = D.SHOP.find((x) => x.key === b.dataset.key);
        if (!it || state.stones < it.cost) return;
        if (it.once && state.flags["buy_" + it.key]) return;
        sim.apply({ stones: -it.cost });
        sim.apply(it.effect || {});
        if (it.once) state.flags["buy_" + it.key] = true;
        U.toast(`买下了${it.name}`);
        refreshAll();
        saveRun();
        openShop();
      });
    });
    $("shopOverlay").hidden = false;
    if (!releaseShopTrap) releaseShopTrap = U.trapFocus($("shopOverlay"), closeShop);
    const firstBuy = $("shopList").querySelector(".shop-buy:not([disabled])") || $("shopClose");
    if (firstBuy) firstBuy.focus();
  }

  function closeShop() {
    $("shopOverlay").hidden = true;
    if (releaseShopTrap) {
      releaseShopTrap();
      releaseShopTrap = null;
    }
    if (state && state.pending) {
      openPrompt();
      return;
    }
    if (!shopPaused && state && state.alive && !state.pending) {
      paused = false;
      $("btnPause").textContent = "❚❚";
      schedule();
    }
  }

  /* ======================================================================
     事件绑定
     ====================================================================== */
  function bind() {
    $("btnPause").addEventListener("click", () => {
      paused = !paused;
      $("btnPause").textContent = paused ? "▶" : "❚❚";
      if (paused) clearTimeout(timer);
      else schedule();
    });
    document.querySelectorAll("#speeds button").forEach((b) => {
      b.addEventListener("click", () => setSpeed(Number(b.dataset.speed)));
    });
    $("btnFF").addEventListener("click", fastForward);
    function setAuto(next) {
      auto = next;
      $("btnAuto").classList.toggle("is-on", auto);
      $("btnAuto").textContent = auto ? "自动中" : "自动";
      $("menuAuto").textContent = `自动抉择：${auto ? "开" : "关"}`;
      toast(auto ? "已开启自动抉择" : "已关闭自动抉择");
      if (auto && state && state.pending) openPrompt();
    }
    $("btnAuto").addEventListener("click", () => setAuto(!auto));
    $("menuAuto").addEventListener("click", () => setAuto(!auto));
    $("menuSoft").addEventListener("click", () => setSoft(!soft));
    $("choicePeek").addEventListener("click", minimizeChoice);
    $("choiceResume").addEventListener("click", resumeChoice);
    $("menuReport").addEventListener("click", () => {
      $("moreMenu").classList.remove("is-open");
      $("btnMore").setAttribute("aria-expanded", "false");
      const report = buildProblemReport();
      copyText(JSON.stringify(report, null, 2))
        .then(() => toast(`回查包已复制：seed ${fmtSeed(report.seed)}`))
        .catch(() => toast("复制失败，请打开关于页导出 JSON"));
    });
    $("menuSpeeds").querySelectorAll("button").forEach((b) => {
      b.addEventListener("click", () => setSpeed(Number(b.dataset.mspeed)));
    });
    $("menuFF").addEventListener("click", () => {
      $("moreMenu").classList.remove("is-open");
      $("btnMore").setAttribute("aria-expanded", "false");
      fastForward();
    });
    $("btnMore").addEventListener("click", () => {
      const menu = $("moreMenu");
      const open = menu.classList.toggle("is-open");
      $("btnMore").setAttribute("aria-expanded", open ? "true" : "false");
    });
    $("menuRestart").addEventListener("click", (e) => {
      e.preventDefault();
      if (!confirm("重新降生？当前这一世会结束。已经结束的人生仍会留在碑林。")) return;
      clearTimeout(timer);
      U.store.clearRun();
      sim = null;
      state = null;
      endSummary = null;
      saved = false;
      paused = false;
      $("moreMenu").classList.remove("is-open");
      $("btnMore").setAttribute("aria-expanded", "false");
      show("birth");
      setTheme("human");
    });
    $("shopClose").addEventListener("click", closeShop);
    const logLarge = !!U.store.prefs().logLarge;
    $("log").classList.toggle("is-large", logLarge);
    $("logSize").setAttribute("aria-pressed", logLarge ? "true" : "false");
    $("logSize").addEventListener("click", () => {
      const on = !$("log").classList.contains("is-large");
      $("log").classList.toggle("is-large", on);
      $("logSize").setAttribute("aria-pressed", on ? "true" : "false");
      U.store.setPref("logLarge", on);
    });
    $("shopOverlay").addEventListener("click", (e) => {
      if (e.target === $("shopOverlay")) closeShop();
    });
    $("btnShare").addEventListener("click", drawShareCard);
    window.addEventListener("pagehide", () => saveRun(true));
    document.addEventListener("xd:theme", () => {
      if (!sim || !state) return;
      lastMapKey = "";
      refreshAll();
    });
    $("btnHall").addEventListener("click", () => (location.href = "hall.html"));
    $("btnAgain").addEventListener("click", () => {
      U.store.clearRun();
      sim = null;
      state = null;
      endSummary = null;
      saved = false;
      paused = false;
      show("birth");
      setTheme("human");
      window.scrollTo(0, 0);
    });
    $("btnHome").addEventListener("click", () => (location.href = "index.html"));

    const sound = $("btnSound");
    sound.addEventListener("click", () => {
      const on = XD.Audio ? XD.Audio.toggle() : false;
      sound.classList.toggle("is-on", on);
      sound.setAttribute("aria-pressed", on ? "true" : "false");
      toast(on ? "声音已开" : "声音已关");
      if (on && XD.Audio) XD.Audio.bell("soft");
    });

    document.addEventListener("click", (e) => {
      const menu = $("moreMenu");
      if (!menu.classList.contains("is-open")) return;
      if (e.target.closest("#moreMenu") || e.target.closest("#btnMore")) return;
      menu.classList.remove("is-open");
      $("btnMore").setAttribute("aria-expanded", "false");
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (choicePeek) {
          resumeChoice();
          return;
        }
        if (state && state.pending && !$("choiceOverlay").hidden) {
          minimizeChoice();
          return;
        }
        if (!$("shopOverlay").hidden) {
          closeShop();
          return;
        }
        const menu = $("moreMenu");
        if (menu.classList.contains("is-open")) {
          menu.classList.remove("is-open");
          $("btnMore").setAttribute("aria-expanded", "false");
        }
        return;
      }
      if (e.target.matches("input,textarea,select")) return;
      if (e.code === "Space" && state && state.alive && document.body.classList.contains("in-life")) {
        e.preventDefault();
        $("btnPause").click();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initBirth();
    bind();
    maybeResume();
  });
})();
