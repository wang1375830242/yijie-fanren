/* ==========================================================================
   成就系统 · 账号级收集
   只在人生结算/账号页面结算，不参与任何数值加成。
   ========================================================================== */
(function () {
  "use strict";

  const CATEGORIES = ["修行", "飞升", "宗门", "道途", "人生", "隐藏"];
  const RANK_NAMES = ["外门", "内门", "执事", "长老", "大长老", "太上长老"];
  const RANK_INDEX = { 外门: 0, 内门: 1, 执事: 2, 长老: 3, 大长老: 4, 太上长老: 5 };
  const PATH_KEYS = ["dan", "jian", "zhen", "you"];

  const DEFS = [
    { id: "qi", category: "修行", name: "引气入体", desc: "任意一世首次踏入炼气。", test: (c) => c.maxTier >= 1 },
    { id: "foundation", category: "修行", name: "筑基", desc: "任意一世首次达到筑基。", test: (c) => c.maxTier >= 2 },
    { id: "core", category: "修行", name: "结丹", desc: "任意一世首次达到结丹。", test: (c) => c.maxTier >= 3 },
    { id: "nascent", category: "修行", name: "元婴", desc: "任意一世首次达到元婴。", test: (c) => c.maxTier >= 4 },
    { id: "deity", category: "修行", name: "化神", desc: "任意一世首次达到化神。", test: (c) => c.maxTier >= 5 },
    { id: "mahayana", category: "修行", name: "大乘", desc: "任意一世首次达到大乘。", test: (c) => c.maxTier >= 8 },
    { id: "spirit_guest", category: "飞升", name: "灵界客", desc: "从人界首次飞升灵界。", rare: true, test: (c) => c.ascendedHuman },
    { id: "daozu", category: "飞升", name: "证道", desc: "首次成为道祖。", rare: true, hidden: true, test: (c) => c.legendary },
    { id: "sect_join", category: "宗门", name: "入门", desc: "首次加入任意宗门。", test: (c) => c.everSect },
    { id: "sect_inner", category: "宗门", name: "内门", desc: "首次成为内门弟子。", test: (c) => c.maxSectRank >= 1 },
    { id: "sect_grand", category: "宗门", name: "大长老", desc: "首次达到大长老或太上长老。", test: (c) => c.maxSectRank >= 4 },
    { id: "artifact", category: "道途", name: "本命", desc: "首次获得本命法宝。", test: (c) => c.hasArtifact },
    { id: "physique", category: "道途", name: "觉醒", desc: "首次体质觉醒。", test: (c) => c.physiqueAwakened },
    { id: "path", category: "道途", name: "道统", desc: "首次确定道统。", test: (c) => c.paths.size > 0 },
    { id: "ten_lives", category: "人生", name: "十世", desc: "账号累计完成 10 世。", test: (c) => c.totalLives >= 10 },
    { id: "three_worlds", category: "人生", name: "三界行", desc: "人界、灵界、仙界都经历过。", test: (c) => c.worlds.has("human") && c.worlds.has("spirit") && c.worlds.has("immortal") },
    { id: "sanshi_all", category: "隐藏", name: "三尸尽", desc: "在同一世斩尽三尸。", rare: true, hidden: true, test: (c) => c.sanshiAll },
    { id: "four_paths", category: "隐藏", name: "四道归一", desc: "四条道统都体验过。", rare: true, hidden: true, test: (c) => PATH_KEYS.every((key) => c.paths.has(key)) },
  ];

  const DEF_BY_ID = Object.fromEntries(DEFS.map((def) => [def.id, def]));

  function empty() {
    return { v: 1, items: {} };
  }

  function normalize(raw) {
    const out = empty();
    const items = raw && raw.v === 1 && raw.items && typeof raw.items === "object" ? raw.items : {};
    DEFS.forEach((def) => {
      const value = items[def.id];
      if (!value || typeof value !== "object") return;
      out.items[def.id] = { at: typeof value.at === "string" ? value.at : "" };
    });
    return out;
  }

  function merge(left, right) {
    const out = empty();
    [left, right].forEach((source) => {
      const data = normalize(source);
      Object.keys(data.items).forEach((id) => {
        const at = data.items[id].at || "";
        if (!out.items[id] || (at && (!out.items[id].at || at < out.items[id].at))) {
          out.items[id] = { at };
        }
      });
    });
    return out;
  }

  function rankIndex(life) {
    if (Number.isFinite(Number(life.sectRankIndex))) return Number(life.sectRankIndex);
    return RANK_INDEX[life.sectRank] != null ? RANK_INDEX[life.sectRank] : -1;
  }

  function buildContext(lives, lineage, current) {
    const all = (Array.isArray(lives) ? lives.slice() : []).filter((x) => x && typeof x === "object");
    if (current && typeof current === "object") all.push(current);
    const worlds = new Set();
    const paths = new Set();
    let maxTier = 0;
    let maxSectRank = -1;
    let everSect = false;
    let hasArtifact = false;
    let physiqueAwakened = false;
    let legendary = false;
    let ascendedHuman = false;
    let sanshiAll = false;
    all.forEach((life) => {
      const tier = Number(life.tier) || 0;
      maxTier = Math.max(maxTier, tier);
      if (life.world) worlds.add(String(life.world));
      if (life.sectPath) paths.add(String(life.sectPath));
      if (life.sect && !/散修|散仙|凡俗|杂役|天渊城|北寒仙域|青芦苏氏/.test(String(life.sect))) everSect = true;
      maxSectRank = Math.max(maxSectRank, rankIndex(life));
      if (life.artifact) hasArtifact = true;
      if (life.physiqueAwakened) physiqueAwakened = true;
      if (life.legendary) legendary = true;
      if (life.startWorld === "human" && life.world === "spirit") ascendedHuman = true;
      const flags = life.flags && typeof life.flags === "object" ? life.flags : {};
      if (flags.spirit_ascended && life.startWorld === "human") ascendedHuman = true;
      if (flags.sanshi_e && flags.sanshi_shan && flags.sanshi_wo) sanshiAll = true;
    });
    const totalLives = Math.max(Number(lineage && lineage.total) || 0, Array.isArray(lives) ? lives.length : 0);
    return { all, worlds, paths, maxTier, maxSectRank, everSect, hasArtifact, physiqueAwakened, legendary, ascendedHuman, sanshiAll, totalLives };
  }

  function evaluate(input) {
    const data = normalize(input && input.data ? input.data : window.XD.util.store.achievements());
    const ctx = buildContext(input && input.lives, input && input.lineage, input && input.current);
    const unlocked = [];
    DEFS.forEach((def) => {
      if (data.items[def.id]) return;
      try {
        if (def.test(ctx)) {
          data.items[def.id] = { at: new Date().toISOString() };
          unlocked.push(def);
        }
      } catch (err) {}
    });
    if (unlocked.length) window.XD.util.store.setAchievements(data);
    return { data, unlocked };
  }

  function progress(raw) {
    const data = normalize(raw);
    const count = Object.keys(data.items).length;
    const categories = {};
    CATEGORIES.forEach((category) => {
      const defs = DEFS.filter((def) => def.category === category);
      categories[category] = {
        total: defs.length,
        unlocked: defs.filter((def) => data.items[def.id]).length,
      };
    });
    return { unlocked: count, total: DEFS.length, categories };
  }

  function unlockedList(raw) {
    const data = normalize(raw);
    return DEFS.filter((def) => data.items[def.id]).map((def) => ({ ...def, at: data.items[def.id].at }));
  }

  window.XD = window.XD || {};
  window.XD.Achievements = {
    DEFS,
    CATEGORIES,
    normalize,
    merge,
    evaluate,
    progress,
    unlockedList,
    byId: DEF_BY_ID,
  };
})();
