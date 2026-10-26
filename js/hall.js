/* ==========================================================================
   碑林 · 逻辑
   ========================================================================== */
(function () {
  "use strict";
  const XD = window.XD;
  const U = XD.util;
  const D = XD.DATA;
  const $ = (id) => document.getElementById(id);

  const KEY_MSG = "yijie.messages.v1";
  let isPublic = false;
  const shared = { candles: {}, messages: {} };
  const API_BASE =
    location.hostname === "wang1375830242.github.io" ? "https://192.144.150.24" : "";
  const apiUrl = (path) => API_BASE + path;

  async function postWrite(path, payload) {
    return fetch(apiUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  /* 碑林里的无名碑：给新来的人一点可以看的东西 */
  const ANON = [
    {
      id: "anon-chen",
      name: "陈石头",
      world: "human",
      realm: "炼气期 · 第九层",
      age: 87,
      origin: "越国 · 青牛镇 · 农户",
      root: "四灵根",
      sect: "散修",
      epitaph: "他修了一辈子仙，最后还是死在了人间。",
      deeds: [
        { age: 12, text: "在山上砍柴时捡到半本吐纳口诀，照着练了三年。" },
        { age: 34, text: "攒了二十年灵石，买了一枚最便宜的筑基丹，没成。" },
        { age: 61, text: "收了一个徒弟。徒弟后来去了大晋，再没回来。" },
        { age: 87, text: "坐化于洞府。身边只有一盏快灭的灯。" },
      ],
    },
    {
      id: "anon-yun",
      name: "云娘",
      world: "human",
      realm: "筑基期 · 初期",
      age: 196,
      origin: "天南 · 落雁城 · 没落修仙家族",
      root: "双灵根",
      sect: "掩月宗",
      epitaph: "二百年的寿元，用在了等一个不会来的人身上。",
      deeds: [
        { age: 19, text: "入掩月宗，因灵根出众被内门长老收为弟子。" },
        { age: 58, text: "与一位散修结为道侣，三十年后那人失踪。" },
        { age: 120, text: "独自闯过一次秘境，带回了半部功法。" },
        { age: 196, text: "寿元耗尽。临终前把洞府留给了照看她的杂役。" },
      ],
    },
    {
      id: "anon-mo",
      name: "墨无咎",
      world: "human",
      realm: "结丹期 · 后期",
      age: 431,
      origin: "大晋 · 京城 · 皇城商贾",
      root: "三灵根",
      sect: "化刀坞",
      epitaph: "结丹之后，凡俗的亲人一个个走了。他一个都没送。",
      deeds: [
        { age: 16, text: "弃商从武，被化刀坞的外门执事看中。" },
        { age: 92, text: "结丹那日，一刀劈开了山门前的石碑。" },
        { age: 240, text: "回京城寻亲，只找到一片拆了的旧宅。" },
        { age: 431, text: "在洞府中坐化。刀插在门口，锈了。" },
      ],
    },
    {
      id: "anon-ling",
      name: "林晚照",
      world: "spirit",
      realm: "炼虚期 · 中期",
      age: 2680,
      origin: "天渊城 · 西坊 · 人族军户",
      root: "异灵根",
      sect: "天渊城",
      epitaph: "天渊城的城墙记得他。",
      deeds: [
        { age: 21, text: "生在天渊城，十六岁入伍，守了三百年的西墙。" },
        { age: 900, text: "第一次异族叩关时活了下来，全队只剩他一个。" },
        { age: 1800, text: "升任百夫长，手下有了自己的兵。" },
        { age: 2680, text: "死于一次守城战。名字被刻在城墙内侧。" },
      ],
    },
    {
      id: "anon-su",
      name: "苏见微",
      world: "spirit",
      realm: "合体期 · 初期",
      age: 9400,
      origin: "风元大陆 · 青芦洲 · 小族旁支",
      root: "天灵根",
      sect: "青芦苏氏",
      epitaph: "他活了很久，久到忘了自己为什么开始修行。",
      deeds: [
        { age: 19, text: "族中长明灯为他亮了一夜，全族都知道出了个天灵根。" },
        { age: 1400, text: "合体成功，成为青芦洲第一位合体修士。" },
        { age: 5000, text: "闭了一次长达三千年的关，出关时族中已无人识得他。" },
        { age: 9400, text: "坐化于族祠。长明灯这一次没有亮。" },
      ],
    },
    {
      id: "anon-bai",
      name: "白霜",
      world: "immortal",
      realm: "真仙 · 后期",
      age: 63000,
      origin: "北寒仙域 · 落雪城 · 边陲小仙",
      root: "冰灵根",
      sect: "北寒仙域",
      epitaph: "真仙也有寿元。天道的公平，冷酷得让人安心。",
      deeds: [
        { age: 300, text: "在落雪城替仙宫看了三百年的药园。" },
        { age: 9000, text: "得了一枚仙宫赏下的玉牌，入了仙籍。" },
        { age: 30000, text: "独自去过一次断界海，回来后再没提过。" },
        { age: 63000, text: "在雪线上坐化。雪落下来，很快就盖住了。" },
      ],
    },
    {
      id: "anon-he",
      name: "何不悔",
      world: "human",
      realm: "凡人",
      age: 76,
      origin: "越国 · 嘉元城 · 药铺学徒之家",
      root: "凡骨",
      sect: "无",
      epitaph: "他没有修成仙，但他把日子过完了。",
      deeds: [
        { age: 14, text: "接了父亲的药铺，认得三百种草木。" },
        { age: 22, text: "娶了邻村的姑娘。婚礼只摆了一桌。" },
        { age: 41, text: "一场瘟疫里守了四十天，救了几十个人。" },
        { age: 76, text: "在院子里晒着太阳走了。孙子说，他走的时候在笑。" },
      ],
    },
    {
      id: "anon-xue",
      name: "薛照野",
      world: "human",
      realm: "元婴期 · 初期",
      age: 806,
      origin: "乱星海 · 石螺岛 · 渔村孤儿",
      root: "伪灵根",
      sect: "星宫",
      epitaph: "元婴出窍那夜，他看见了自己的影子。",
      deeds: [
        { age: 13, text: "在岛上捡到一枚会发光的贝壳，从此能看见灵气。" },
        { age: 210, text: "以伪灵根之身结丹，星宫的长老亲自来看了一眼。" },
        { age: 500, text: "元婴出窍，第一次以神念看见了整座岛。" },
        { age: 806, text: "在星宫的一场内斗中陨落。岛上的旧屋还空着。" },
      ],
    },
  ];

  const MSG = (() => {
    try {
      return JSON.parse(localStorage.getItem(KEY_MSG) || "{}");
    } catch (e) {
      return {};
    }
  })();
  function saveMsg() {
    try {
      localStorage.setItem(KEY_MSG, JSON.stringify(MSG));
      return true;
    } catch (e) {
      return false;
    }
  }

  function baseCandles(id) {
    return isPublic ? shared.candles[id] || 0 : 0;
  }
  function candleCount(id) {
    return isPublic ? shared.candles[id] || 0 : U.store.candles()[id] || 0;
  }
  function totalCandles() {
    const source = isPublic ? shared.candles : U.store.candles();
    return Object.values(source).reduce((sum, n) => sum + (Number(n) || 0), 0);
  }
  function messagesFor(id) {
    const pub = isPublic ? shared.messages[id] || [] : [];
    const local = MSG[id] || [];
    return pub.concat(local.filter((m) => !pub.includes(m))).slice(-20);
  }

  /* ---------- 汇总 ---------- */
  const mine = U.store.lives().map((l) => ({
    id: l.id || "life-" + l.seed,
    name: l.name,
    world: l.world,
    realm: l.realm,
    age: l.age,
    origin: l.origin ? `${l.origin.place} · ${l.origin.family}` : "",
    root: l.root ? l.root.name : "—",
    sect: l.sect ? `${l.sect}${l.sectRank ? " · " + l.sectRank : ""}` : "散修",
    sectRank: l.sectRank || "",
    sectContrib: l.sectContrib || 0,
    epitaph: l.epitaph || "",
    deeds: (l.deeds || []).map((d) => ({ age: d.age, text: d.text })),
    tag: "我的一世",
    isMine: true,
    cause: l.cause,
  }));

  const LEGEND_PROFILES = {
    "legend-hanli": { root: "伪灵根", sect: "黄枫谷" },
    "legend-nangong": { root: "冰灵根（推测）", sect: "掩月宗" },
    "legend-ziling": { root: "水灵根（推测）", sect: "妙音门" },
    "legend-yinyue": { root: "七星月体", sect: "银月狼族" },
    "legend-lifeiyu": { root: "无灵根", sect: "七玄门" },
    "legend-mo-dafu": { root: "无灵根", sect: "七玄门" },
    "legend-mo-caihuan": { root: "无灵根", sect: "墨府" },
    "legend-zhang-tie": { root: "无灵根", sect: "七玄门" },
    "legend-li-huayuan": { root: "双灵根（推测）", sect: "黄枫谷" },
    "legend-linghu": { root: "天灵根（推测）", sect: "黄枫谷" },
    "legend-xiangzhili": { root: "双灵根（推测）", sect: "散修" },
    "legend-yuan-yao": { root: "水灵根（推测）", sect: "青阳门" },
    "legend-wen-tianren": { root: "双灵根（推测）", sect: "逆星盟" },
    "legend-liudao": { root: "异灵根（推测）", sect: "逆星盟" },
    "legend-wangchan": { root: "暗灵根", sect: "鬼灵门" },
    "legend-yanruyan": { root: "水系天灵根", sect: "燕家堡" },
    "legend-lingyuling": { root: "天灵根", sect: "星宫" },
    "legend-nanlong": { root: "双灵根（推测）", sect: "散修" },
    "legend-bingfeng": { root: "妖修（冰凤）", sect: "冰凤一族" },
    "legend-dayan": { root: "天灵根（推测）", sect: "散修" },
    "legend-gu-huo-jin": { root: "时间灵根（推测）", sect: "无宗门（时间道祖）" },
    "legend-li-yuanjiu": { root: "金灵根（推测）", sect: "九元观" },
    "legend-lunhui": { root: "轮回灵根（推测）", sect: "轮回殿" },
    "legend-feng-laoguai": { root: "风灵根（推测）", sect: "散修" },
    "legend-hu-qinglei": { root: "火灵根（推测）", sect: "天魔宗" },
    "legend-chen-qiaoqian": { root: "双灵根（推测）", sect: "黄枫谷" },
    "legend-dong-xuaner": { root: "水灵根（推测）", sect: "黄枫谷 / 合欢宗" },
    "legend-hong-fu": { root: "火灵根（推测）", sect: "黄枫谷" },
    "legend-li-yingning": { root: "金灵根（推测）", sect: "化刀坞" },
    "legend-qi-yunxiao": { root: "土灵根（推测）", sect: "天南" },
    "legend-xin-ruyin": { root: "木灵根（推测）", sect: "天南" },
    "legend-tianfu-zhenren": { root: "双灵根（推测）", sect: "天符门" },
    "legend-xuangu-shangren": { root: "鬼灵根（推测）", sect: "极阴岛" },
    "legend-ji-yin": { root: "鬼灵根（推测）", sect: "极阴岛" },
    "legend-wan-tianming": { root: "水灵根（推测）", sect: "万法门" },
    "legend-ling-xiaofeng": { root: "雷灵根（推测）", sect: "星宫" },
    "legend-wen-qing": { root: "水灵根（推测）", sect: "星宫" },
    "legend-jin-kui": { root: "金灵根（推测）", sect: "星宫" },
    "legend-qing-yi": { root: "木灵根（推测）", sect: "散修" },
  };

  const legends = D.LEGENDS.map((lg) => {
    const profile = LEGEND_PROFILES[lg.id] || {};
    return {
      id: lg.id,
      name: lg.name,
      world: lg.world,
      realm: lg.realm,
      age: lg.years,
      origin: lg.title,
      root: profile.root || "—",
      sect: profile.sect || "—",
      epitaph: lg.line,
      deeds: [],
      tag: "原著人物 · 致敬",
      isLegend: true,
      note: lg.note,
    };
  });

  const anon = ANON.map((a) => Object.assign({}, a, { tag: "无名碑" }));

  const ALL = mine.concat(legends, anon);

  /* ---------- 渲染 ---------- */
  const wall = $("steleWall");
  let filter = "all";

  function visible() {
    if (filter === "all") return ALL;
    if (filter === "mine") return ALL.filter((x) => x.isMine);
    if (filter === "legend") return ALL.filter((x) => x.isLegend);
    return ALL.filter((x) => x.world === filter);
  }

  function render() {
    const list = visible();
    wall.innerHTML = list
      .map(
        (x) => `<button class="wall-stele${x.isLegend ? " is-legend" : ""}" type="button" data-id="${U.esc(x.id)}">
          <div class="st-top"><span>碑</span><span>${U.esc(x.tag)}</span></div>
          <div class="st-name">${U.esc(x.name)}</div>
          <div class="st-sub">${U.esc((D.WORLD_META[x.world] || {}).name || "")} · ${U.esc(x.realm)}</div>
          <p class="st-line">「${U.esc(x.epitaph)}」</p>
          <div class="st-foot"><span>${x.isMine ? "享年 " + U.esc(x.age) + " 岁" : x.isLegend ? "传说" : "享年 " + U.esc(x.age) + " 岁"}</span><b>${candleCount(x.id)} 灯</b></div>
        </button>`
      )
      .join("");
    $("hallEmpty").hidden = list.length > 0;
    wall.querySelectorAll(".wall-stele").forEach((b) => {
      b.addEventListener("click", () => open(b.dataset.id));
    });
    updateStats();
  }

  function updateStats() {
    $("statTotal").textContent = ALL.length;
    $("statMine").textContent = mine.length;
    $("statRead").textContent = U.store.steles().length;
    const lineage = U.store.lineage();
    $("statStreak").textContent = `${lineage.streak || 0}`;
    $("statCandles").textContent = U.fmt(totalCandles());
  }

  function setStatus(ok) {
    const el = $("hallStatus");
    if (!el) return;
    const writable = !!(XD.cloud && XD.cloud.writeEnabled);
    el.textContent = ok
      ? writable
        ? "公共碑林已连接 · 灯与留言对所有访客可见。请不要写真实个人信息。"
        : "公共碑林已连接（只读）· 点灯与留言需由 server.py 或云函数代写。"
      : "本机模式 · 未连接公共碑林，灯与留言只保存在这个浏览器。";
    el.classList.toggle("is-online", ok);
  }

  async function loadShared() {
    if (XD.cloud && XD.cloud.enabled) {
      try {
        const data = await XD.cloud.hall.load();
        shared.candles = data.candles && typeof data.candles === "object" ? data.candles : {};
        shared.messages = data.messages && typeof data.messages === "object" ? data.messages : {};
        isPublic = true;
        setStatus(true);
        render();
        if (current) open(current.id);
        return;
      } catch (err) {
        // LeanCloud 不可用时继续尝试本机 server.py，最后退回本机模式。
      }
    }
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2200);
      const res = await fetch(apiUrl("/api/hall"), { cache: "no-store", signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error("hall api failed");
      const data = await res.json();
      shared.candles = data.candles && typeof data.candles === "object" ? data.candles : {};
      shared.messages = data.messages && typeof data.messages === "object" ? data.messages : {};
      isPublic = true;
      setStatus(true);
    } catch (err) {
      isPublic = false;
      setStatus(false);
    }
    render();
    if (current) open(current.id);
  }

  /* ---------- 详情 ---------- */
  let current = null;
  let releaseHallTrap = null;

  function open(id) {
    const x = ALL.find((v) => v.id === id);
    if (!x) return;
    U.store.markStele(x.id);
    updateStats();
    current = x;
    $("smName").textContent = x.name;
    $("smSub").textContent = `${(D.WORLD_META[x.world] || {}).name || ""} · ${x.realm}`;
    $("smEpitaph").textContent = "「" + (x.epitaph || "此人一生，不足为外人道。") + "」";
    const fields = [
      ["出身", x.origin || "不详"],
      ["灵根", x.root || "不详"],
      ["宗门", x.sect || "散修"],
      ["享年", typeof x.age === "number" ? x.age + " 岁" : x.age || "不可考"],
    ];
    $("smFields").innerHTML = fields
      .map(([k, v]) => `<div class="sm-field"><dt>${k}</dt><dd>${U.esc(v)}</dd></div>`)
      .join("");
    $("smDeeds").innerHTML = (x.deeds || [])
      .map((d) => `<div class="sm-deed"><b>${d.age}岁</b><span>${U.esc(d.text)}</span></div>`)
      .join("");
    $("smDeeds").style.display = (x.deeds || []).length ? "block" : "none";
    $("smCandles").textContent = candleCount(x.id) + " 盏";
    $("smNote").textContent = x.isMine
      ? "这是你自己走过的一生。"
      : x.isLegend
      ? "原著人物的致敬条目，不是推演结果。"
      : "碑上的字是随机生成的，不必当真。";
    const msgs = messagesFor(x.id);
    $("smMsgs").innerHTML = msgs
      .slice(-6)
      .map((m) => `<div>${U.esc(m)}</div>`)
      .join("");
    $("smMsgInput").value = "";
    $("steleOverlay").hidden = false;
    if (releaseHallTrap) releaseHallTrap();
    releaseHallTrap = U.trapFocus($("steleOverlay"), close);
    $("smLight").focus();
  }

  function close() {
    $("steleOverlay").hidden = true;
    if (releaseHallTrap) {
      releaseHallTrap();
      releaseHallTrap = null;
    }
    current = null;
  }

  /* ---------- 交互 ---------- */
  document.querySelectorAll("#hallTabs button").forEach((b) => {
    b.addEventListener("click", () => {
      filter = b.dataset.filter;
      document.querySelectorAll("#hallTabs button").forEach((x) => x.classList.toggle("on", x === b));
      render();
    });
  });

  $("btnRandom").addEventListener("click", () => {
    const list = visible();
    if (!list.length) return;
    open(U.RNG ? list[Math.floor(Math.random() * list.length)].id : list[0].id);
  });

  $("btnWipe").addEventListener("click", () => {
    if (!mine.length) return U.toast("你还没有安放过任何一世");
    if (!confirm("清空你自己安放的碑？这个操作不能撤销，传说与无名碑不受影响。")) return;
    U.store.clearLives();
    U.store.clearLineage();
    U.store.clearSteles();
    location.reload();
  });

  $("smClose").addEventListener("click", close);
  $("steleOverlay").addEventListener("click", (e) => {
    if (e.target === $("steleOverlay")) close();
  });

  $("smLight").addEventListener("click", async () => {
    if (!current) return;
    if (XD.cloud && XD.cloud.writeEnabled) {
      try {
        const data = await XD.cloud.hall.light(current.id);
        shared.candles[current.id] = Number(data.count) || 0;
        $("smCandles").textContent = shared.candles[current.id] + " 盏";
        const flame = $("smCandles").nextElementSibling;
        if (flame) flame.classList.add("on");
        updateStats();
        render();
        U.toast("灯亮了，所有来访的人都能看见");
        return;
      } catch (err) {
        if (isPublic) {
          try {
            const res = await postWrite("/api/candle", { id: current.id });
            if (!res.ok) throw new Error("candle failed");
            const data = await res.json();
            shared.candles[current.id] = Number(data.count) || 0;
            $("smCandles").textContent = shared.candles[current.id] + " 盏";
            const flame = $("smCandles").nextElementSibling;
            if (flame) flame.classList.add("on");
            updateStats();
            render();
            U.toast("灯亮了，所有来访的人都能看见");
            return;
          } catch (localErr) {}
        }
        U.toast("LeanCloud 没有响应，这盏灯只记在本机");
      }
    } else if (isPublic) {
      try {
        const res = await postWrite("/api/candle", { id: current.id });
        if (!res.ok) throw new Error("candle failed");
        const data = await res.json();
        shared.candles[current.id] = Number(data.count) || 0;
        $("smCandles").textContent = shared.candles[current.id] + " 盏";
        const flame = $("smCandles").nextElementSibling;
        if (flame) flame.classList.add("on");
        updateStats();
        render();
        U.toast("灯亮了，所有来访的人都能看见");
        return;
      } catch (err) {
        U.toast("公共碑林没有响应，这盏灯只记在本机");
      }
    }
    const n = U.store.light(current.id);
    $("smCandles").textContent = n + " 盏";
    const flame = $("smCandles").nextElementSibling;
    if (flame) flame.classList.add("on");
    updateStats();
    render();
    U.toast("灯亮了");
  });

  async function leave() {
    if (!current) return;
    const v = $("smMsgInput").value.trim();
    if (!v) return U.toast("写一句话再留");
    if (XD.cloud && XD.cloud.writeEnabled) {
      try {
        const messages = await XD.cloud.hall.message(current.id, v);
        shared.messages[current.id] = Array.isArray(messages) ? messages : [];
        $("smMsgInput").value = "";
        $("smMsgs").innerHTML = messagesFor(current.id)
          .slice(-6)
          .map((m) => `<div>${U.esc(m)}</div>`)
          .join("");
        U.toast("留在公共碑林了");
        return;
      } catch (err) {
        if (isPublic) {
          try {
            const res = await postWrite("/api/message", { id: current.id, text: v });
            if (!res.ok) throw new Error("message failed");
            const data = await res.json();
            shared.messages[current.id] = Array.isArray(data.messages) ? data.messages : [];
            $("smMsgInput").value = "";
            $("smMsgs").innerHTML = messagesFor(current.id)
              .slice(-6)
              .map((m) => `<div>${U.esc(m)}</div>`)
              .join("");
            U.toast("留在公共碑林了");
            return;
          } catch (localErr) {}
        }
        U.toast("LeanCloud 没有响应，留言只存在本机");
      }
    } else if (isPublic) {
      try {
        const res = await postWrite("/api/message", { id: current.id, text: v });
        if (!res.ok) throw new Error("message failed");
        const data = await res.json();
        shared.messages[current.id] = Array.isArray(data.messages) ? data.messages : [];
        $("smMsgInput").value = "";
        $("smMsgs").innerHTML = messagesFor(current.id)
          .slice(-6)
          .map((m) => `<div>${U.esc(m)}</div>`)
          .join("");
        U.toast("留在公共碑林了");
        return;
      } catch (err) {
        U.toast("公共碑林没有响应，留言只存在本机");
      }
    }
    MSG[current.id] = (MSG[current.id] || []).concat(v).slice(-20);
    if (!saveMsg()) return U.toast("这个浏览器不让保存留言");
    $("smMsgInput").value = "";
    $("smMsgs").innerHTML = messagesFor(current.id)
      .slice(-6)
      .map((m) => `<div>${U.esc(m)}</div>`)
      .join("");
    U.toast("留在碑上了");
  }
  $("smMsgBtn").addEventListener("click", leave);
  $("smMsgInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") leave();
  });

  render();
  loadShared();

  if (location.hash === "#random") {
    setTimeout(() => {
      const list = visible();
      if (list.length) open(list[Math.floor(Math.random() * list.length)].id);
    }, 400);
  }
})();
