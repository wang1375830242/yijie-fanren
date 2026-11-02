/* ==========================================================================
   命格挑战 · 账号级目标
   固定 seed 开局，终局判定；只给称号与记录，不给数值加成。
   ========================================================================== */
(function () {
  "use strict";

  const DEFS = [
    {
      id: "mortal_foundation", name: "凡骨筑基", seed: 8101, world: "human",
      desc: "无灵根出身，最终达到筑基。",
      check: (s) => s.root && s.root.key === "none" && s.tier >= 2,
    },
    {
      id: "rogue_ascend", name: "散修飞升", seed: 8102, world: "human",
      desc: "不入宗门，从人界飞升灵界。",
      check: (s) => s.startWorld === "human" && s.world === "spirit" && !hasSect(s),
    },
    {
      id: "farm_grand", name: "寒门大长老", seed: 8103, world: "human",
      desc: "山村、农家或猎户出身，成为大长老或太上长老。",
      check: (s) => /山村|农家|猎户|渔村|矿工/.test(String((s.origin && s.origin.family) || "")) && s.sectRankIndex >= 4,
    },
    {
      id: "daozu_no_legacy", name: "不借前尘", seed: 8104, world: "human",
      desc: "不继承前世道果，成为道祖。",
      check: (s) => !!s.legendary && !s.legacyUsed,
    },
    {
      id: "four_paths", name: "四道归一", seed: 8105, world: "human",
      desc: "同一账号体验四条道统。",
      account: true,
      check: () => true,
    },
    {
      id: "ten_lives", name: "十世问道", seed: 8106, world: "human",
      desc: "账号累计完成十世。",
      account: true,
      check: () => true,
    },
    {
      id: "three_worlds", name: "三界行", seed: 8107, world: "human",
      desc: "人界、灵界、仙界都经历过。",
      account: true,
      check: () => true,
    },
    {
      id: "late_bloom", name: "大器晚成", seed: 8108, world: "human",
      desc: "二百岁以后才首次筑基。",
      check: (s) => Number(s.firstTierAge) >= 200 && s.tier >= 2,
    },
    {
      id: "artifact_master", name: "本命三阶", seed: 8109, world: "human",
      desc: "将本命法宝温养至三阶。",
      check: (s) => s.artifact && Number(s.artifact.stage) >= 3,
    },
    {
      id: "immortal_ascend", name: "飞升仙界", seed: 8110, world: "human",
      desc: "从下界飞升仙界。",
      check: (s) => s.startWorld !== "immortal" && s.world === "immortal",
    },
  ];

  const BY_ID = Object.fromEntries(DEFS.map((def) => [def.id, def]));

  function hasSect(summary) {
    return !!(summary && summary.sect && !/散修|散仙|凡俗|杂役|天渊城|北寒仙域|青芦苏氏/.test(String(summary.sect)));
  }

  function normalize(raw) {
    const out = { v: 1, items: {} };
    const items = raw && raw.v === 1 && raw.items && typeof raw.items === "object" ? raw.items : {};
    DEFS.forEach((def) => {
      const value = items[def.id];
      if (!value || typeof value !== "object") return;
      out.items[def.id] = {
        at: typeof value.at === "string" ? value.at : "",
        lifeNo: Number(value.lifeNo) || null,
      };
    });
    return out;
  }

  function merge(left, right) {
    const out = { v: 1, items: {} };
    [left, right].forEach((source) => {
      const data = normalize(source);
      Object.keys(data.items).forEach((id) => {
        const entry = data.items[id];
        if (!out.items[id] || (entry.at && (!out.items[id].at || entry.at < out.items[id].at))) {
          out.items[id] = { ...entry };
        }
      });
    });
    return out;
  }

  function context(summary, lives, lineage) {
    const all = (Array.isArray(lives) ? lives.slice() : []).filter((x) => x && typeof x === "object");
    if (summary && typeof summary === "object") all.push(summary);
    const worlds = new Set();
    const paths = new Set();
    all.forEach((life) => {
      if (life.world) worlds.add(String(life.world));
      if (life.sectPath) paths.add(String(life.sectPath));
    });
    return {
      summary: summary || null,
      lives: all,
      totalLives: Math.max(Number(lineage && lineage.total) || 0, Array.isArray(lives) ? lives.length : 0),
      worlds,
      paths,
    };
  }

  function passes(def, ctx) {
    if (def.id === "four_paths") return ["dan", "jian", "zhen", "you"].every((key) => ctx.paths.has(key));
    if (def.id === "ten_lives") return ctx.totalLives >= 10;
    if (def.id === "three_worlds") return ["human", "spirit", "immortal"].every((world) => ctx.worlds.has(world));
    if (!def.account) return !!ctx.summary && def.check(ctx.summary);
    return true;
  }

  function evaluate(input) {
    const summary = input && input.summary ? input.summary : null;
    const lives = input && input.lives;
    const lineage = input && input.lineage;
    const ctx = context(summary, lives, lineage);
    const data = normalize(input && input.data ? input.data : window.XD.util.store.challenges());
    const unlocked = [];
    DEFS.forEach((def) => {
      if (data.items[def.id]) return;
      if (!passes(def, ctx)) return;
      data.items[def.id] = { at: new Date().toISOString(), lifeNo: summary && summary.lifeNo ? summary.lifeNo : null };
      unlocked.push(def);
    });
    if (unlocked.length) window.XD.util.store.setChallenges(data);
    return { data, unlocked };
  }

  function progress(raw) {
    const data = normalize(raw);
    return {
      unlocked: Object.keys(data.items).length,
      total: DEFS.length,
      items: data.items,
    };
  }

  window.XD = window.XD || {};
  window.XD.Challenges = { DEFS, byId: BY_ID, normalize, merge, evaluate, progress, hasSect };
})();
