/* ==========================================================================
   一介凡人 · 模拟引擎
   一世 = 从降生到坐化。引擎只负责结算，界面负责表演。
   ========================================================================== */
(function () {
  "use strict";
  const XD = window.XD;
  const D = XD.DATA;
  const U = XD.util;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // 事件作者写的 risk.p 是基础风险；默认只给极小的主角修正，避免隐藏 +34% 抬高。
  const DEFAULT_RISK_BONUS = 0;

  class Sim {
    constructor(opts) {
      opts = opts || {};
      this.seed = (opts.seed >>> 0) || (Math.random() * 4294967295) >>> 0;
      this.rng = new U.RNG(this.seed);
      this.socialRng = new U.RNG((this.seed ^ 0x9e3779b9) >>> 0);
      this.opts = opts;
      this.state = null;
      this.generate(opts);
    }

    /* ---------------- 降生 ---------------- */
    generate(opts) {
      const rng = this.rng;
      const D0 = D;
      let world = opts.world && opts.world !== "any" ? opts.world : null;
      if (!world) {
        const r = rng.next();
        const odds =
          opts.mode === "existing"
            ? { immortal: 0.02, spirit: 0.22 }
            : { immortal: 0.001, spirit: 0.037 };
        world = r < odds.immortal ? "immortal" : r < odds.immortal + odds.spirit ? "spirit" : "human";
      }

      const origin = rng.pick(D0.ORIGINS[world] || D0.ORIGINS.human);
      const legacy = this.sanitizeLegacy(opts.legacy);
      this.legacyInput = legacy;
      let root;
      if (world === "human") {
        root = rng.weighted(D0.ROOTS, (x) => this.rootWeight(legacy && legacy.rootKey, x));
      } else {
        do {
          root = rng.weighted(D0.ROOTS, (x) => this.rootWeight(legacy && legacy.rootKey, x));
        } while (root.key === "none");
      }

      const surname = rng.pick(D0.SURNAMES);
      const gender = rng.chance(0.5) ? "男" : "女";
      const given = this.pickGivenName(rng, gender);
      const name = surname + given;
      const daohao =
        rng.pick(D0.DAOHAO_A) + rng.pick(D0.DAOHAO_B);

      const bottle = false; // 玩家不再持有掌天瓶；旧瓶只作为默认关闭的致敬传闻。
      const physique = root.key === "none" ? null : rng.weighted(D0.PHYSIQUES, (x) => x.w);
      const isExisting = opts.mode === "existing";
      const startTier = isExisting
        ? world === "spirit"
          ? 6
          : world === "immortal"
          ? 9
          : 0
        : world === "human"
        ? 0
        : 1;
      const startAge = isExisting
        ? world === "spirit"
          ? 16
          : world === "immortal"
          ? 100
          : 0
        : 0;
      const realm = D0.REALMS[startTier];

      const insight = clamp(
        32 + (origin.mods.insight || 0) + rng.int(0, 22) + ((physique && physique.insight) || 0),
        10,
        96
      );
      const luck = clamp(46 + (origin.mods.luck || 0) + rng.int(0, 24), 10, 96);
      const mood = clamp(64 + rng.int(0, 18), 30, 92);
      const stones = (origin.mods.stones || 0) + rng.int(0, 18);

      this.state = {
        seed: this.seed,
        name,
        daohao,
        gender,
        world,
        startWorld: world,
        path: startTier > 0 ? "cultivator" : "unsettled",
        tier: startTier,
        age: startAge,
        maxAge: Math.round(realm.life * ((physique && physique.lifeMul) || 1)),
        cult: 0,
        mood,
        karma: 0,
        traits: { kind: 0, ruthless: 0, curious: 0, bold: 0, calm: 0 },
        stones,
        incomePerYear: 0,
        insight,
        luck,
        breakBonus: 0,
        breakPrep: 0,
        injury: 0,
        sectPath: null,
        karmaBook: [],
        ward: 0,
        cultRate: 0,
        root,
        origin,
        place: origin.place,
        sect:
          world === "spirit"
            ? isExisting
              ? "天渊城 · 散修"
              : "天渊城 · 本地散修"
            : world === "immortal"
            ? isExisting
              ? "北寒仙域 · 散仙"
              : "北寒仙域 · 本地散修"
            : "凡俗",
        sectRank: -1,
        sectContrib: 0,
        sectPromo: null,
        partner: null,
        partnerHistory: [],
        disciples: [],
        rivals: [],
        discipleHistory: [],
        rivalHistory: [],
        npcSeq: 0,
        npcStates: {
          parent: { key: "parent", present: false, alive: false, lastAt: 0 },
          partner: null,
          disciple: null,
          rival: null,
        },
        eventChains: {
          parent: { npcKey: "parent", stage: 0, nextAt: 0, status: "idle", lastAt: 0 },
          partner: { npcKey: null, stage: 0, nextAt: 0, status: "idle", lastAt: 0 },
          disciple: { npcKey: null, stage: 0, nextAt: 0, status: "idle", lastAt: 0 },
          rival: { npcKey: null, stage: 0, nextAt: 0, status: "idle", lastAt: 0 },
        },
        lastChainAge: -999,
        bottle,
        physique,
        physiqueAwakened: null,
        artifact: null,
        flags: {},
        seen: {},
        recentEvents: [],
        textUse: {},
        sceneTotal: {},
        sceneUses: {},
        choiceTrace: [],
        legacy: null,
        focus: "cultivate",
        log: [],
        milestones: [],
        lastAmbient: null,
        recentAmbient: [],
        recentAmbientKeys: [],
        stepsSinceEvent: 0,
        pending: null,
        alive: true,
        cause: null,
        epitaph: null,
        finale: null,
        epitaphPool: [],
        history: [],
        tierHistory: [],
        peers: [],
        started: false,
        ended: false,
      };

      this.state.flags.arrived_spirit = world === "spirit";
      this.state.flags.arrived_immortal = world === "immortal";
      if (world === "spirit") this.state.flags.arrived_spirit_seen = true;
      if (world === "immortal") this.state.flags.arrived_immortal_seen = true;
      if (
        /孤儿|父母.*(死|亡)|散修之后/.test(
          `${this.state.origin.family || ""}${this.state.origin.text || ""}`
        )
      ) {
        this.state.flags.no_parents = true;
      }
      this.ensureChainState();
      this.state.legacy = this.applyLegacy(legacy);

      this.buildPeers();
      this.pushLog(
        "birth",
        world === "human"
          ? `你出生在${origin.place}，${origin.family}。${origin.text}`
          : `你降生于${origin.place}，${origin.family}。${origin.text}`
      );
      if (startTier > 0 && isExisting) {
        this.pushLog(
          "system",
          `你降生于此界，自幼修行，如今已是${this.realmName()}。`
        );
      } else if (startTier > 0 && world !== "human") {
        this.pushLog("system", `你生在此界，灵气浓郁，修行比人界同辈快。`);
      }
      this.state.tierHistory.push({ age: this.state.age, tier: this.state.tier });
    }

    sanitizeLegacy(raw) {
      if (!raw || raw.v !== 1) return null;
      const keys = new Set(D.ROOTS.map((x) => x.key));
      const rootKey =
        typeof raw.rootKey === "string" && keys.has(raw.rootKey) && raw.rootKey !== "none"
          ? raw.rootKey
          : null;
      const number = (value, min, max, fallback) =>
        Number.isFinite(Number(value)) ? clamp(Number(value), min, max) : fallback;
      return {
        v: 1,
        depth: Math.round(number(raw.depth, 1, 10, 1)),
        rootKey,
        insight: Math.round(number(raw.insight, 0, 8, 0)),
        stones: Math.round(number(raw.stones, 0, 120, 0)),
        karma: Math.round(number(raw.karma, -10, 10, 0)),
        ward: raw.ward ? 1 : 0,
        bequest: ["dao", "artifact", "path", "karma"].includes(raw.bequest) ? raw.bequest : "dao",
        burden: ["", "injury", "debt"].includes(raw.burden) ? raw.burden : "",
        artifactKey: typeof raw.artifactKey === "string" ? raw.artifactKey : null,
        sectPath: ["dan", "jian", "zhen", "you"].includes(raw.sectPath) ? raw.sectPath : null,
        source: raw.source && typeof raw.source === "object" ? raw.source : null,
      };
    }

    rootWeight(rootKey, root) {
      if (!rootKey) return root.w;
      const rank = { none: 0, wei: 1, si: 2, san: 3, shuang: 4, yi: 5, tian: 6 };
      const base = rank[rootKey] || 0;
      const current = rank[root.key] || 0;
      if (root.key === "none") return root.w * 0.25;
      if (current < base) return root.w * 0.72;
      if (current > base) {
        return root.w * (1 + Math.min(0.5, (current - base) * 0.18));
      }
      return root.w * 1.1;
    }

    applyLegacy(legacy) {
      if (!legacy) return null;
      const s = this.state;
      const worldFactor = s.world === "human" ? 1 : s.world === "spirit" ? 5 : 15;
      const beforeInsight = s.insight;
      s.insight = clamp(s.insight + legacy.insight, 10, 90);
      const stones = Math.round(legacy.stones * worldFactor);
      s.stones += stones;
      s.karma = clamp(s.karma + legacy.karma, -100, 100);
      if (legacy.ward) s.ward = Math.max(s.ward, 1);
      if (legacy.burden === "debt") s.karma = clamp(s.karma - 5, -100, 100);
      if (legacy.burden === "injury") s.injury = Math.max(s.injury || 0, 1);
      if (legacy.artifactKey && !s.artifact) this.bindArtifact(legacy.artifactKey);
      if (legacy.sectPath) s.sectPath = legacy.sectPath;
      return {
        v: 1,
        depth: legacy.depth,
        rootKey: legacy.rootKey,
        bequest: legacy.bequest || "dao",
        burden: legacy.burden || "",
        source: legacy.source,
        applied: {
          insight: s.insight - beforeInsight,
          stones,
          karma: legacy.karma,
          ward: legacy.ward ? 1 : 0,
        },
      };
    }

    legacySummary() {
      const s = this.state;
      const depth = (s.legacy && s.legacy.depth ? s.legacy.depth : 0) + 1;
      const decay = Math.pow(0.9, Math.max(0, depth - 1));
      const lastPartner =
        s.partner ||
        (Array.isArray(s.partnerHistory) && s.partnerHistory.length
          ? s.partnerHistory[s.partnerHistory.length - 1]
          : null);
      const discipleNames = (s.disciples || [])
        .filter(Boolean)
        .slice(0, 3)
        .map((d) => d.name);
      const rivalNames = (s.rivals || [])
        .filter(Boolean)
        .slice(0, 2)
        .map((r) => r.name);
      return {
        v: 1,
        depth,
        rootKey: s.root.key !== "none" ? s.root.key : null,
        rootName: s.root.name,
        insight: Math.max(1, Math.round((2 + Math.floor(s.tier / 3)) * decay)),
        stones: Math.max(5, Math.round((10 + s.tier * 5) * decay)),
        karma: clamp(Math.round((s.karma || 0) * 0.15), -8, 8),
        ward: s.tier >= 6 ? 1 : 0,
        bequest: s.artifact ? "artifact" : s.sectPath ? "path" : (s.karma || 0) >= 20 ? "karma" : "dao",
        burden: (s.injury || 0) >= 2 ? "injury" : (s.karma || 0) <= -20 ? "debt" : "",
        source: {
          name: s.name,
          seed: s.seed,
          realm: this.displayRealm(),
          tier: s.tier,
          cause: s.cause || "尚在人世",
          age: s.endedAt != null ? s.endedAt : s.age,
          place: (s.origin && s.origin.place) || s.place || "",
          sectName: s.sect && s.sect !== "散修" ? s.sect : "",
          partnerName: lastPartner ? lastPartner.name : "",
          discipleNames,
          rivalNames,
        },
      };
    }

    legacyChoices() {
      const s = this.state;
      const base = this.legacySummary();
      const choices = [
        {
          key: "dao",
          title: "道果",
          desc: "保留前世悟性、灵石与灵根余韵，不添新的负担。",
          legacy: Object.assign({}, base, { bequest: "dao", burden: "" }),
        },
      ];
      if (s.artifact && !s.artifact.broken) {
        choices.push({
          key: "artifact",
          title: "遗物",
          desc: "带走本命法宝的余烬，下一世自动温养；旧伤会跟着你。",
          legacy: Object.assign({}, base, { bequest: "artifact", burden: "injury", artifactKey: s.artifact.key }),
        });
      }
      if (s.sectPath) {
        choices.push({
          key: "path",
          title: "道统",
          desc: "下一世继承同一条道统；宗门会记着这笔旧账。",
          legacy: Object.assign({}, base, { bequest: "path", burden: "debt", sectPath: s.sectPath }),
        });
      }
      if (Math.abs(s.karma || 0) >= 10) {
        choices.push({
          key: "karma",
          title: "因果",
          desc: "把前世未了的人和事带下去；善缘或恶债都会找上门。",
          legacy: Object.assign({}, base, { bequest: "karma", burden: s.karma < 0 ? "debt" : "" }),
        });
      }
      return choices;
    }

    wishSummary() {
      const s = this.state;
      const partnerLost =
        (s.partner &&
          (s.partner.alive === false ||
            s.partner.status === "estranged" ||
            s.partner.status === "left")) ||
        (!s.partner && Array.isArray(s.partnerHistory) && s.partnerHistory.length > 0);
      if (partnerLost) {
        const last =
          s.partner ||
          (s.partnerHistory && s.partnerHistory[s.partnerHistory.length - 1]);
        return {
          type: "partner",
          text: `未守住${last && last.name ? last.name : "那个人"}。`,
        };
      }
      const hasSect =
        s.sect &&
        !/散修|散仙|凡俗|杂役|天渊城|北寒仙域|青芦苏氏/.test(s.sect);
      if (s.flags && (s.flags.sect_lost || (s.flags.had_sect && !hasSect))) {
        return { type: "sect", text: "未守住当年入门的那个山门。" };
      }
      if (s.world === "human" && s.tier > 0 && s.tier < 6) {
        return { type: "ascend", text: "终究没能飞升灵界。" };
      }
      const livingRival = (s.rivals || []).some(
        (rival) =>
          rival.alive !== false &&
          rival.status !== "reconciled" &&
          rival.status !== "left"
      );
      if (Math.abs(s.karma || 0) >= 12 || livingRival) {
        return { type: "karma", text: "还有一段因果没有了结。" };
      }
      return { type: "unfinished", text: "还有一段路没走完。" };
    }

    pickGivenName(rng, gender) {
      const pool =
        gender === "女"
          ? D.FEMALE_GIVEN
          : gender === "男"
          ? D.MALE_GIVEN
          : D.NEUTRAL_GIVEN;
      return rng.pick(pool && pool.length ? pool : D.GIVEN);
    }

    buildPeers() {
      const rng = this.rng;
      const names = [];
      const used = new Set([this.state.name]);
      while (names.length < 4) {
        const gender = rng.chance(0.5) ? "男" : "女";
        const n = rng.pick(D.SURNAMES) + this.pickGivenName(rng, gender);
        if (used.has(n)) continue;
        used.add(n);
        names.push({ name: n, gender });
      }
      const worlds = this.state.world === "human" ? ["human", "human", "human", "human"] : [this.state.world, this.state.world, "human", "spirit"];
      this.state.peers = names.map((item, i) => {
        const n = item.name;
        const w = worlds[i];
        const origin = rng.pick(D.ORIGINS[w] || D.ORIGINS.human);
        let root;
        let tries = 0;
        do {
          root = rng.weighted(D.ROOTS, (x) => x.w);
        } while (root.key === "none" && tries++ < 8);
        const talent = Math.max(0.4, root.mul) * (0.78 + rng.next() * 0.42);
        const tier = w === "human" ? 1 : w === "spirit" ? 6 : 9;
        return {
          name: n,
          gender: item.gender,
          world: w,
          place: origin.place,
          root: root.name,
          tier,
          talent,
          nextAt: (w === "human" ? 12 : w === "spirit" ? 26 : 120) + rng.int(0, 12),
          maxAge: D.REALMS[tier].life,
          alive: true,
          fate: null,
        };
      });
    }

    /* ---------------- 基础 ---------------- */
    realm() {
      return D.REALMS[this.state.tier];
    }
    realmName() {
      return this.state.tier === 0 ? "凡人" : this.realm().name;
    }
    displayRealm() {
      const s = this.state;
      const r = this.realm();
      if (s.tier === 0) return "凡人";
      if (r.key === "qi") {
        const layer = clamp(1 + Math.floor(s.cult / (100 / 13)), 1, 13);
        return `炼气期 · 第${layer}层`;
      }
      if (r.key === "daozu") return "道祖";
      const sub = s.cult < 34 ? "初期" : s.cult < 67 ? "中期" : "后期";
      return `${r.name} · ${sub}`;
    }
    stage() {
      const s = this.state;
      if (s.tier === 0) return s.age < 16 ? "childhood" : "mortal";
      if (s.tier <= 2) return "qi";
      if (s.tier <= 4) return "core";
      if (s.tier <= 8) return "spirit";
      return "immortal";
    }
    worldMeta() {
      return D.WORLD_META[this.state.world] || D.WORLD_META.human;
    }

    worldCultMul() {
      if (this.state.world === "spirit") return 1.5;
      if (this.state.world === "immortal") return 2;
      return 1;
    }
    focusDef() {
      return D.FOCUS.find((f) => f.key === this.state.focus) || D.FOCUS[0];
    }

    focusOptions() {
      return D.FOCUS.filter((f) => f.key !== "sect" || this.isSectMember());
    }

    sectContribPerYear() {
      const s = this.state;
      const focusBonus = s.focus === "sect" ? 2 : 1;
      return Math.max(1, Math.round((2 + Math.floor(s.tier / 2)) * 0.5 * focusBonus));
    }

    focusReport() {
      const s = this.state;
      const f = this.focusDef();
      const baseIncome = this.annualIncome();
      const passiveIncome = Number(s.incomePerYear) || 0;
      const upkeep = this.annualUpkeep();
      this.initSectRank();
      const table = this.sectRankTable();
      const rank = table[s.sectRank >= 0 ? s.sectRank : 0] || table[0];
      const sectShare = this.isSectMember()
        ? (Number(rank.share) || 0) * (s.focus === "sect" ? 1.35 : 1)
        : 0;
      const netIncome = Math.round(baseIncome + passiveIncome + sectShare - upkeep);
      const incomeSign = netIncome >= 0 ? "+" : "";
      const parts = [
        `修为 ×${(Number(f.cult) || 1).toFixed(2)}`,
        `灵石净 ${incomeSign}${netIncome}/步`,
        `心境 ${f.mood ? (f.mood > 0 ? "+" : "") + f.mood : "+0"}/年`,
      ];
      const incomeParts = [];
      if (baseIncome) incomeParts.push(`重心 ${baseIncome}`);
      if (sectShare) incomeParts.push(`年例 ${Math.round(sectShare * 100) / 100}`);
      if (passiveIncome) incomeParts.push(`灵田 ${passiveIncome}`);
      if (upkeep) incomeParts.push(`维护 -${upkeep}`);
      if (incomeParts.length > 1) parts.push(`收支 ${incomeParts.join(" / ")}`);
      if (f.insight) parts.push(`悟性 +1（${Math.round(f.insight * 100)}%/年）`);
      parts.push(f.event ? `遇事率 ×${f.event}` : "遇事率 基准");
      if (f.luck) parts.push(`风险成功 +${f.luck * 3}%`);
      if (f.risk) {
        const sign = f.risk > 0 ? "+" : "";
        const effect = f.risk > 0 ? "-" : "+";
        parts.push(`危险 ${sign}${f.risk}（风险成功 ${effect}${Math.abs(f.risk) * 2}%）`);
      }
      if (f.key === "sect" && this.isSectMember()) {
        const gain = this.sectContribPerYear();
        const next = this.sectRankTable()[(s.sectRank >= 0 ? s.sectRank : 0) + 1];
        parts.push(`宗门贡献 +${gain}/年`);
        parts.push(
          `当前${rank.name}${next ? ` · 差${Math.max(0, next.need - (s.sectContrib || 0))}贡献升${next.name}` : " · 已至最高"}`
        );
      } else if (f.key === "sect") {
        parts.push("宗门贡献：入宗后生效");
      }
      return {
        key: f.key,
        name: f.name,
        income: baseIncome,
        netIncome,
        text: parts.join(" · "),
      };
    }

    isSectMember() {
      const s = this.state;
      return !!(
        s.path === "cultivator" &&
        s.tier > 0 &&
        s.sect &&
        !/散修|散仙|凡俗|杂役|天渊城|北寒仙域|青芦苏氏/.test(s.sect)
      );
    }

    nextNpcId(role) {
      const s = this.state;
      s.npcSeq = (Number(s.npcSeq) || 0) + 1;
      return `${role}-${s.seed}-${s.npcSeq}`;
    }

    ensureChainState() {
      const s = this.state;
      if (!Number.isFinite(Number(s.npcSeq))) s.npcSeq = 0;
      if (!s.npcStates || typeof s.npcStates !== "object") s.npcStates = {};
      if (!s.eventChains || typeof s.eventChains !== "object") s.eventChains = {};
      ["partner", "disciple", "rival"].forEach((role) => {
        if (s.partner && role === "partner" && !s.partner.id) {
          s.partner.id = this.nextNpcId("partner");
        }
        if (role === "disciple") {
          s.disciples = Array.isArray(s.disciples) ? s.disciples : [];
          s.disciples.forEach((npc) => {
            if (npc && !npc.id) npc.id = this.nextNpcId("disciple");
          });
        }
        if (role === "rival") {
          s.rivals = Array.isArray(s.rivals) ? s.rivals : [];
          s.rivals.forEach((npc) => {
            if (npc && !npc.id) npc.id = this.nextNpcId("rival");
          });
        }
      });
      if (!s.eventChains.parent) {
        s.eventChains.parent = {
          npcKey: "parent",
          stage: 0,
          nextAt: s.age >= 18 ? s.age + 8 : 0,
          status: "idle",
          lastAt: 0,
        };
      }
      const parentAlive = !(s.flags && s.flags.no_parents) && !(s.flags && s.flags.parent_dead);
      s.npcStates.parent = {
        key: "parent",
        name: "父母",
        alive: parentAlive,
        present: parentAlive && s.world === "human",
        lastAt: (s.npcStates.parent && s.npcStates.parent.lastAt) || 0,
      };
      const parentChain = s.eventChains.parent;
      parentChain.npcKey = "parent";
      if (!parentAlive) parentChain.status = "unavailable";
      else if (parentChain.status === "unavailable") parentChain.status = "idle";

      const bind = (role, npc) => {
        const chain = s.eventChains[role] || {
          npcKey: null,
          stage: 0,
          nextAt: 0,
          status: "idle",
          lastAt: 0,
        };
        s.eventChains[role] = chain;
        if (!npc) {
          s.npcStates[role] = null;
          if (chain.status === "active") chain.status = "paused";
          return;
        }
        if (!npc.id) npc.id = this.nextNpcId(role);
        s.npcStates[role] = {
          key: npc.id,
          name: npc.name,
          alive: npc.alive !== false,
          present:
            npc.alive !== false &&
            npc.world === s.world &&
            !["apart", "estranged", "left", "separated", "graduated", "reconciled"].includes(npc.status),
          status: npc.status || "present",
        };
        if (chain.npcKey !== npc.id) {
          chain.npcKey = npc.id;
          chain.stage = 0;
          chain.nextAt = s.age + 8;
          chain.status = "active";
          chain.lastAt = 0;
        } else if (chain.status === "paused" && npc.alive !== false) {
          chain.status = "active";
        }
      };

      bind("partner", s.partner);
      const currentDisciple = (s.disciples || []).find(
        (d) => d && d.id === (s.eventChains.disciple || {}).npcKey && d.alive !== false
      );
      bind(
        "disciple",
        currentDisciple || (s.disciples || []).find((d) => d && d.alive !== false) || null
      );
      const currentRival = (s.rivals || []).find(
        (r) => r && r.id === (s.eventChains.rival || {}).npcKey && r.alive !== false
      );
      bind(
        "rival",
        currentRival || (s.rivals || []).find((r) => r && r.alive !== false) || null
      );
      return s.npcStates;
    }

    getNpcStates() {
      return this.ensureChainState();
    }

    maybeChain() {
      const s = this.state;
      if (!s || !s.alive || s.pending) return false;
      this.ensureChainState();
      if (s.lastChainAge != null && s.age - s.lastChainAge < 3) return false;
      const roles = ["parent", "partner", "disciple", "rival"];
      for (const role of roles) {
        const chain = s.eventChains[role];
        if (!chain || chain.status === "unavailable" || chain.status === "ended") continue;
        if (chain.nextAt && s.age < chain.nextAt) continue;
        const defs = (XD.CHAIN_DEFS && XD.CHAIN_DEFS[role]) || [];
        const next = defs.find((item) => item.stage === chain.stage + 1);
        if (!next) {
          if (chain.stage > 0) chain.status = "ended";
          continue;
        }
        if (next.minAge && s.age < next.minAge) {
          chain.nextAt = Math.max(Number(chain.nextAt) || 0, next.minAge);
          continue;
        }
        let allowed = true;
        try {
          allowed = !next.when || next.when(s, chain);
        } catch (err) {
          allowed = false;
        }
        if (!allowed) {
          // 下一节点存在，只是当前不在场/不满足条件；保留进度，等条件恢复。
          chain.status = "paused";
          chain.nextAt = Math.max(Number(chain.nextAt) || 0, s.age + 1);
          continue;
        }
        if (chain.status === "paused") chain.status = "active";
        this.trigger(next.id);
        s.lastChainAge = s.age;
        return true;
      }
      return false;
    }

    sectRankTable() {
      const s = this.state;
      return (D.SECT_RANKS_BY_WORLD && D.SECT_RANKS_BY_WORLD[s.world]) || D.SECT_RANKS;
    }

    sectRankFloor() {
      const s = this.state;
      if (!this.isSectMember()) return -1;
      const floors = (D.SECT_RANK_FLOORS && D.SECT_RANK_FLOORS[s.world]) || {};
      let floor = 0;
      for (const key of Object.keys(floors)) {
        if (s.tier >= Number(key)) floor = Math.max(floor, Number(floors[key]) || 0);
      }
      return floor;
    }

    sectRankName() {
      if (!this.isSectMember()) return "";
      const rank = this.sectRankTable()[this.state.sectRank];
      return rank ? rank.name : "";
    }

    initSectRank() {
      const s = this.state;
      const table = this.sectRankTable();
      if (typeof s.sectRank !== "number" || !table[s.sectRank]) {
        s.sectRank = this.isSectMember() ? 0 : -1;
      }
      if (!this.isSectMember()) {
        s.sectRank = -1;
        s.sectContrib = 0;
      } else {
        const floor = this.sectRankFloor();
        if (s.sectRank < floor) s.sectRank = floor;
      }
      if (typeof s.sectContrib !== "number") s.sectContrib = 0;
    }

    sectTick() {
      const s = this.state;
      this.initSectRank();
      if (!this.isSectMember()) return;
      const stepYears = Math.max(1, s.lastStepYears || 1);
      const years = Math.min(8, stepYears); // 高境界用“每步预算”折算，避免一次性结算数百年
      const table = this.sectRankTable();
      const rank = table[s.sectRank] || table[0];
      const shareBonus = s.focus === "sect" ? 1.35 : 1;
      s.stones += (rank.share || 0) * years * shareBonus;
      if (s.focus === "sect") {
        const focusBonus = 2;
        const gain = Math.round((2 + Math.floor(s.tier / 2)) * years * 0.5 * focusBonus);
        s.sectContrib += Math.min(40, Math.max(1, gain));
      }
      let target = Math.max(s.sectRank, this.sectRankFloor());
      for (let i = target + 1; i < table.length; i++) {
        const next = table[i];
        if (s.sectContrib >= next.need && s.tier >= next.tierMin) target = i;
        else break;
      }
      if (target > s.sectRank) s.sectPromo = target;
    }

    maybeSectPromotion() {
      const s = this.state;
      if (!s.sectPromo || s.pending || !this.isSectMember()) return false;
      const target = s.sectPromo;
      s.sectPromo = null;
      s.sectRank = target;
      this.trigger("sect_promotion");
      return true;
    }

    maybeMainline() {
      const s = this.state;
      if (s.pending) return false;
      if (s.world === "human") {
        if (
          !s.flags.xutian &&
          !s.flags.xutian_closed &&
          !s.seen.c_secret &&
          s.tier >= 2 &&
          s.age >= 50
        ) {
          this.trigger("c_secret");
          return true;
        }
        if (
          s.flags.xutian &&
          !s.flags.xutian_2_done &&
          !s.flags.xutian_closed &&
          s.tier >= 2 &&
          s.tier <= 5 &&
          s.age >= 60 &&
          s.age + 20 < s.maxAge
        ) {
          this.trigger("xutian_2");
          return true;
        }
        if (
          s.flags.xutian_2_done &&
          !s.flags.xutian_3_done &&
          !s.flags.xutian_closed &&
          s.tier >= 3 &&
          s.tier <= 5 &&
          s.age >= 90 &&
          s.age + 20 < s.maxAge
        ) {
          this.trigger("xutian_3");
          return true;
        }
      }
      if (s.world === "spirit") {
        // 已经拿到最后一步资格时，即使突破到合体，也允许把余波走完。
        if (s.flags.s_main_3 && !s.flags.s_main_closed) {
          this.trigger("s_main_4");
          return true;
        }
        if (
          !s.flags.s_main_closed &&
          s.tier >= 7 &&
          (s.flags.s_main_1 || s.flags.s_main_2 || s.flags.s_main_3)
        ) {
          s.flags.s_main_closed = true;
          s.flags.s_main_forfeited = true;
          this.pushLog("system", "你离开了西线。那面令旗后来被风扯碎，西线主线到此收束。");
          return false;
        }
        if (
          !s.flags.s_main_closed &&
          s.tier >= 5 &&
          s.tier <= 6 &&
          s.age >= 80
        ) {
          const next = !s.flags.s_main_1
            ? "s_main_1"
            : !s.flags.s_main_2
            ? "s_main_2"
            : !s.flags.s_main_3
            ? "s_main_3"
            : "s_main_4";
          this.trigger(next);
          return true;
        }
      }
      if (s.world === "immortal") {
        // 已经拿到最后一步资格时，即使突破到太乙，也允许把断界海走完。
        if (s.flags.i_main_3 && !s.flags.i_main_closed) {
          this.trigger("i_main_4");
          return true;
        }
        if (
          !s.flags.i_main_closed &&
          s.tier >= 11 &&
          (s.flags.i_main_1 || s.flags.i_main_2 || s.flags.i_main_3)
        ) {
          s.flags.i_main_closed = true;
          s.flags.i_main_forfeited = true;
          this.pushLog("system", "你没有再回北寒雪线。灰界主线到此收束。");
          return false;
        }
        if (
          !s.flags.i_main_closed &&
          s.tier >= 9 &&
          s.tier <= 10 &&
          s.age >= 500
        ) {
          const next = !s.flags.i_main_1
            ? "i_main_1"
            : !s.flags.i_main_2
            ? "i_main_2"
            : !s.flags.i_main_3
            ? "i_main_3"
            : "i_main_4";
          this.trigger(next);
          return true;
        }
      }
      return false;
    }

    regionAnchorId() {
      const place = this.state.origin.place || "";
      if (place.includes("越国")) return "r_yue_anchor";
      if (place.includes("天南")) return "r_tiannan_anchor";
      if (place.includes("大晋")) return "r_dajin_anchor";
      if (place.includes("乱星海")) return "r_luantian_anchor";
      return null;
    }

    sectAnchorId() {
      const map = {
        黄枫谷: "sect_anchor_huangfeng",
        掩月宗: "sect_anchor_yanyue",
        灵兽山: "sect_anchor_lingshou",
        化刀坞: "sect_anchor_huadao",
        落云宗: "sect_anchor_luoyun",
        古剑门: "sect_anchor_gujian",
        百巧院: "sect_anchor_baqiao",
        太一门: "sect_anchor_taiyi",
        化仙宗: "sect_anchor_huaxian",
        天符门: "sect_anchor_tianfu",
        星宫: "sect_anchor_xinggong",
        妙音门: "sect_anchor_miaoyin",
        碧云门: "sect_anchor_biyun",
      };
      return map[this.state.sect] || null;
    }

    maybeIdentityAnchors() {
      const s = this.state;
      if (s.world !== "human" || s.pending || s.tier <= 0 || s.age < 18) return false;
      if (!s.flags.region_anchor_seen) {
        const region = this.regionAnchorId();
        if (region && XD.EVENT_BY_ID[region]) {
          s.flags.region_anchor_seen = true;
          this.trigger(region);
          return true;
        }
      }
      if (!s.flags.sect_anchor_seen && this.isSectMember()) {
        const sect = this.sectAnchorId();
        if (sect && XD.EVENT_BY_ID[sect]) {
          s.flags.sect_anchor_seen = true;
          this.trigger(sect);
          return true;
        }
      }
      return false;
    }

    maybeSectIdentity() {
      const s = this.state;
      if (s.world !== "human" || s.pending || s.tier < 2 || s.tier > 6) return false;
      if (s.sectPath || !this.isSectMember() || s.seen.sect_path_choice) return false;
      this.trigger("sect_path_choice");
      return true;
    }

    maybePathArtifact() {
      const s = this.state;
      if (
        s.world !== "human" ||
        s.pending ||
        s.tier < 2 ||
        s.tier > 4 ||
        !s.sectPath ||
        s.artifact ||
        s.flags.artifact_declined ||
        s.seen.artifact_choice
      ) {
        return false;
      }
      this.trigger("artifact_choice");
      return true;
    }

    maybePathFeature() {
      const s = this.state;
      if (s.world !== "human" || s.pending || s.tier < 2 || !s.sectPath) return false;
      const id = `sect_path_${s.sectPath}`;
      if (s.seen[id] || !XD.EVENT_BY_ID[id]) return false;
      this.trigger(id);
      return true;
    }

    maybePathAwakening() {
      const s = this.state;
      if (
        s.world !== "human" ||
        s.pending ||
        s.tier < 2 ||
        !s.sectPath ||
        !s.physique ||
        s.physique.path !== s.sectPath ||
        s.physiqueAwakened ||
        s.seen.physique_awakening
      ) {
        return false;
      }
      this.trigger("physique_awakening");
      return true;
    }

    maybeLegacyEcho() {
      const s = this.state;
      if (
        s.world !== "human" ||
        !s.legacy ||
        !s.legacy.source ||
        s.flags.legacy_echo_seen ||
        s.age < 16
      ) {
        return false;
      }
      s.flags.legacy_echo_seen = true;
      this.trigger("legacy_echo");
      return true;
    }
    familyText(text) {
      const s = this.state;
      const noParents =
        s.flags && s.flags.no_parents ||
        /孤儿|父母.*(死|亡)|散修之后/.test(
          `${s.origin && s.origin.family || ""}${s.origin && s.origin.text || ""}`
        );
      if (!noParents && s.flags && s.flags.parent_dead) {
        return String(text)
          .replace(/父母|爹娘|双亲/g, "家里人")
          .replace(/母亲|娘/g, "家里人")
          .replace(/父亲|爹/g, "家里人");
      }
      if (!noParents) return text;
      return String(text)
        .replace(/父母|爹娘|双亲/g, "收养你的老人")
        .replace(/母亲|娘/g, "收养你的老人")
        .replace(/父亲|爹/g, "抚养你的人");
    }

    pushLog(kind, text, extra) {
      const entry = Object.assign(
        { age: this.state.age, kind, text },
        extra || {}
      );
      this.state.log.push(entry);
      return entry;
    }

    recordMilestone(text, title) {
      const s = this.state;
      if (!Array.isArray(s.milestones)) s.milestones = [];
      const entry = { age: s.age, text, title: title || "" };
      if (s.milestones.some((x) => x.text === entry.text)) return;
      s.milestones.push(entry);
      if (s.milestones.length > 60) s.milestones.shift();
    }

    recordText(text) {
      const s = this.state;
      if (!s.textUse) s.textUse = {};
      s.textUse[text] = (s.textUse[text] || 0) + 1;
    }

    recordChoice(kind, index, extra) {
      const s = this.state;
      if (!Array.isArray(s.choiceTrace)) s.choiceTrace = [];
      const entry = Object.assign(
        { age: s.age, tier: s.tier, kind, eventId: s.pending && s.pending.id, choice: index },
        extra || {}
      );
      s.choiceTrace.push(entry);
      if (s.choiceTrace.length > 500) s.choiceTrace.shift();
    }

    uniqueText(text) {
      const s = this.state;
      if (!s.textUse) s.textUse = {};
      const key = String(text || "");
      const count = s.textUse[key] || 0;
      if (count < 2) {
        s.textUse[key] = count + 1;
        return key;
      }
      const pool = (D.TEXT_CODAS && D.TEXT_CODAS[this.stage()]) || [
        "你后来常常想起这件事。",
      ];
      const variant = `${key}${pool[(count - 2) % pool.length]}`;
      s.textUse[key] = count + 1;
      s.textUse[variant] = (s.textUse[variant] || 0) + 1;
      return variant;
    }

    /* ---------------- 主循环 ---------------- */
    step() {
      const s = this.state;
      if (!s.alive) return { status: "dead" };
      if (s.pending) return { status: "pending" };
      const before = s.log.length;

      const r = this.realm();
      let years = r.per;
      if (s.tier === 0) years = 1;
      if (s.age + years > s.maxAge) years = Math.max(1, s.maxAge - s.age);
      s.lastStepYears = years;

      for (let i = 0; i < years; i++) {
        s.age++;
        this.yearTick(i === 0);
        if (!s.alive || s.pending) break;
        if (s.age >= s.maxAge) {
          this.die("寿元耗尽");
          break;
        }
      }

      if (s.alive && !s.pending) {
        this.afterStep();
      }

      s.history.push({ age: s.age, tier: s.tier, cult: Math.round(s.cult) });
      if (s.history.length > 400) s.history.shift();
      const last = s.tierHistory[s.tierHistory.length - 1];
      if (!last || last.tier !== s.tier) {
        s.tierHistory.push({ age: s.age, tier: s.tier });
      }
      this.updatePeers();

      return {
        status: s.alive ? (s.pending ? "pending" : "ok") : "dead",
        entries: s.log.slice(before),
        world: s.world,
      };
    }

    bodyLifeMul() {
      return (this.state.physique && Number(this.state.physique.lifeMul)) || 1;
    }

    realmLife(tier) {
      const realm = D.REALMS[Math.max(0, Math.min(13, Number(tier) || 0))] || D.REALMS[0];
      return Math.round((realm.life || 0) * this.bodyLifeMul());
    }

    rootPower() {
      const root = Number(this.state.root && this.state.root.mul) || 0;
      const delta = Number(this.state.physique && this.state.physique.rootDelta) || 0;
      return Math.max(0, root + delta);
    }

    buildLevel() {
      const s = this.state;
      if (!s.sectPath) return 0;
      let level = 0;
      const artifactDef = s.artifact && D.PLAYER_ARTIFACTS.find((x) => x.key === s.artifact.key);
      if (artifactDef && artifactDef.path === s.sectPath && !s.artifact.broken) level += 1;
      if (s.physique && s.physique.path === s.sectPath) level += 1;
      if (s.physiqueAwakened && s.physique && s.physique.path === s.sectPath) level += 1;
      return level;
    }

    buildName() {
      const path = D.SECT_PATHS.find((x) => x.key === this.state.sectPath);
      return path ? path.name : "无道统";
    }

    artifactRiskBonus() {
      const a = this.state.artifact;
      if (!a || a.broken) return 0;
      const def = D.PLAYER_ARTIFACTS.find((x) => x.key === a.key);
      return Number(def && def.riskBonus) || 0;
    }

    artifactBreakBonus() {
      const a = this.state.artifact;
      if (!a || a.broken) return 0;
      const def = D.PLAYER_ARTIFACTS.find((x) => x.key === a.key);
      return (Number(def && def.breakBonus) || 0) + Math.max(0, Number(a.stage) || 0) * 0.01;
    }

    annualIncome() {
      const s = this.state;
      const base = this.focusDef().stones || 0;
      const bodyMul = s.focus === "alchemy" && s.physique && s.physique.alchemyIncome ? s.physique.alchemyIncome : 1;
      return Math.round(base * bodyMul * (1 + Math.max(0, s.tier - 1) * 0.18));
    }

    annualUpkeep() {
      const s = this.state;
      let upkeep = 0;
      if (s.flags && s.flags.buy_cave) upkeep += 2;
      if (s.flags && s.flags.buy_spirit_field) upkeep += 1;
      const disciples = (s.disciples || []).filter(
        (d) => d.alive !== false && d.status !== "graduated" && d.status !== "left"
      ).length;
      upkeep += disciples * (1 + Math.floor(s.tier / 4));
      if (s.tier >= 6) upkeep += 2;
      return upkeep;
    }

    yearTick(firstYear = true) {
      const s = this.state;
      if (s.tier === 0) {
        if (s.path === "mortal") {
          s.mood = clamp(s.mood + (s.age > 65 ? -1 : 0), 0, 100);
        }
      } else {
        const f = this.focusDef();
        const stepYears = Math.max(1, s.lastStepYears || 1);
        const years = Math.min(8, stepYears); // 高境界用“每步预算”折算，避免一次性结算数百年
        const decay = (s.age > s.maxAge * 0.6 ? 0.12 : 0.02) + ((s.physique && s.physique.moodDecay) || 0);
        if (firstYear) {
          const moodYears = Math.min(2, stepYears);
          s.mood = clamp(s.mood + (f.mood || 0) * moodYears - decay * years, 0, 100);
          const income = (this.annualIncome() + (s.incomePerYear || 0)) * years;
          const upkeep = this.annualUpkeep() * years;
          s.stones = Math.max(0, s.stones + income - upkeep);
          if (f.insight && this.rng.chance(Math.min(0.5, f.insight * years))) {
            s.insight = clamp(s.insight + 1, 0, 100);
          }
        }
        const base = (100 / this.realm().need) * (this.realm().pace || 1);
        const mul =
          (0.5 + this.rootPower() * 0.5) *
          (0.75 + s.insight / 200) *
          (0.82 + s.mood / 240) *
          (f.cult || 1) *
          (1 + (s.cultRate || 0)) *
          (1 - Math.min(3, s.injury || 0) * 0.06) *
          this.worldCultMul();
        // 结丹以后给低灵根一条活路：速度仍受灵根影响，但不让寿元上限变成硬墙。
        const effectiveMul = s.tier >= 3 ? Math.max(mul, 0.55) : mul;
        s.cult = clamp(s.cult + base * effectiveMul, 0, 100);
      }

      if (s.mood < 12 && this.rng.chance(0.006)) {
        this.die("心魔缠身");
      }
    }

    partnerInterval(tier, talent) {
      const realm = D.REALMS[Math.max(0, Math.min(13, Number(tier) || 0))] || D.REALMS[0];
      const need = Math.max(1, realm.need || 1);
      const pace = Math.max(1, realm.pace || 1);
      const base = need / (Math.max(0.4, Number(talent) || 1) * 1.2 * pace);
      const jitter = 0.85 + this.socialRng.next() * 0.3;
      return Math.max(20, Math.round(base * jitter));
    }

    partnerTick() {
      const s = this.state;
      const p = s.partner;
      if (!p || p.alive === false) return;
      if (p.status === "separated" || p.status === "left") return;
      if (!Array.isArray(s.partnerHistory)) s.partnerHistory = [];
      if (typeof p.tier !== "number") p.tier = s.tier;
      if (p.tier > 12) p.tier = 12;
      if (typeof p.world !== "string") p.world = s.world;
      if (typeof p.age !== "number") p.age = p.since || s.age;
      if (typeof p.ageOffset !== "number") p.ageOffset = p.age - s.age;
      p.age = s.age + p.ageOffset;
      if (typeof p.affinity !== "number") p.affinity = 60;
      if (typeof p.talent !== "number") p.talent = 1;
      if (typeof p.cult !== "number") p.cult = 0;
      if (typeof p.nextAt !== "number") p.nextAt = s.age + 20;
      if (typeof p.maxAge !== "number") p.maxAge = Math.max(80, (D.REALMS[p.tier] || D.REALMS[0]).life);
      if (p.status !== "estranged") p.status = p.world === s.world ? "present" : "apart";
      else if (p.world !== s.world) p.status = "apart";
      if (p.age >= p.maxAge) {
        p.alive = false;
        p.endedAt = s.age;
        p.fate = "寿尽";
        s.partnerHistory.push(Object.assign({}, p));
        this.pushLog("system", `${p.name}走了。你在洞府里坐了很久。`);
        s.partner = null;
        return;
      }
      if (s.age < p.nextAt) return;
      if (p.tier >= 12) {
        p.nextAt = s.age + 9999;
        p.cult = 100;
        return;
      }
      p.cult = 100;
      const interval = this.partnerInterval(p.tier, p.talent);
      const chance = clamp(
        0.45 + (p.talent - 1) * 0.2 + (p.affinity - 50) * 0.002,
        0.2,
        0.9
      );
      if (!this.rng.chance(chance)) {
        p.cult = 85;
        p.nextAt = s.age + Math.max(12, Math.round(interval * 0.5));
        return;
      }
      p.tier += 1;
      p.cult = 0;
      p.maxAge = Math.max(p.maxAge, D.REALMS[p.tier].life);
      p.nextAt = s.age + this.partnerInterval(p.tier, p.talent);
      if (p.tier >= 6 && p.world === "human") p.world = "spirit";
      if (p.tier >= 9 && p.world === "spirit") p.world = "immortal";
      p.status = p.world === s.world ? "present" : "apart";
      this.pushLog(
        "system",
        `${p.name}闭关有功，修为到了${D.REALMS[p.tier].name}${p.world === s.world ? "。" : "，人已在另一界。"}`
      );
    }

    createDisciple(title) {
      const s = this.state;
      const rng = this.socialRng;
      const tier = Math.max(1, Math.min(12, s.tier - 1));
      const age = Math.max(8, Math.min(20, Math.max(1, s.age - 1), rng.int(8, 20)));
      const talent = 0.6 + rng.next() * 0.5;
      const gender = rng.chance(0.5) ? "男" : "女";
      const disciple = {
        id: this.nextNpcId("disciple"),
        name: rng.pick(D.SURNAMES) + this.pickGivenName(rng, gender),
        gender,
        title: title || "弟子",
        since: s.age,
        age,
        ageOffset: age - s.age,
        tier,
        cult: 0,
        talent,
        maxAge: Math.max(age + 10, D.REALMS[tier].life),
        affinity: 55 + rng.int(0, 20),
        nextAt: age + Math.max(10, Math.round(D.REALMS[tier].need / Math.max(0.6, talent * 1.6))),
        alive: true,
        status: "present",
        world: s.world,
        place: s.place,
      };
      s.disciples.push(disciple);
      this.pushLog("system", `你收了${disciple.name}为徒。${disciple.gender === "女" ? "她" : "他"}今年${age}岁。`);
      return disciple;
    }

    createRival() {
      const s = this.state;
      const rng = this.socialRng;
      const tier = Math.max(1, Math.min(12, s.tier));
      const age = Math.max(8, s.age + rng.int(-5, 5));
      const talent = 0.8 + rng.next() * 0.5;
      const gender = rng.chance(0.5) ? "男" : "女";
      const rival = {
        id: this.nextNpcId("rival"),
        name: rng.pick(D.SURNAMES) + this.pickGivenName(rng, gender),
        gender,
        title: "对手",
        since: s.age,
        age,
        ageOffset: age - s.age,
        tier,
        cult: 0,
        talent,
        maxAge: Math.max(age + 10, D.REALMS[tier].life),
        hostility: 45 + rng.int(0, 25),
        nextAt: age + Math.max(10, Math.round(D.REALMS[tier].need / Math.max(0.6, talent * 1.6))),
        alive: true,
        status: "active",
        world: s.world,
        place: s.place,
      };
      s.rivals.push(rival);
      this.pushLog("system", `你和${rival.name}结了怨。这个人不会轻易忘记。`);
      return rival;
    }

    maybeCreateSocial() {
      const s = this.state;
      if (s.path !== "cultivator" || s.tier <= 0) return;
      const aliveDisciples = s.disciples.filter(
        (x) => x.alive !== false && x.status !== "graduated" && x.status !== "left"
      ).length;
      const aliveRivals = s.rivals.filter(
        (x) => x.alive !== false && x.status !== "reconciled" && x.status !== "left"
      ).length;
      if (s.tier >= 2 && s.age >= 40 && aliveRivals < 2 && !s.flags.rival_intro) {
        s.flags.rival_intro = true;
        this.createRival();
      }
      if (s.tier >= 4 && s.age >= 120 && aliveDisciples < 3 && !s.flags.disciple_intro) {
        s.flags.disciple_intro = true;
        this.createDisciple("弟子");
      }
    }

    tickSocialList(list, kind) {
      const s = this.state;
      const history = kind === "disciple" ? s.discipleHistory : s.rivalHistory;
      const cap = kind === "disciple" ? Math.min(12, Math.max(1, s.tier)) : Math.min(13, Math.max(1, s.tier + 1));
      for (const person of list) {
        if (!person || person.alive === false) continue;
        if (typeof person.age !== "number") person.age = person.since || s.age;
        if (typeof person.ageOffset !== "number") person.ageOffset = person.age - s.age;
        person.age = s.age + person.ageOffset;
        if (typeof person.tier !== "number") person.tier = kind === "disciple" ? Math.max(1, s.tier - 1) : Math.max(1, s.tier);
        if (typeof person.maxAge !== "number") person.maxAge = D.REALMS[person.tier].life;
        if (person.age >= person.maxAge) {
          person.alive = false;
          person.endedAt = s.age;
          person.fate = "寿尽";
          history.push(Object.assign({}, person));
          if (history.length > 20) history.shift();
          this.pushLog("system", `${person.name}走了。${kind === "disciple" ? "你送走了自己的弟子。" : "那道旧怨，到这里就散了。"}`);
          continue;
        }
        if (typeof person.nextAt !== "number") person.nextAt = person.age + 20;
        if (person.age >= person.nextAt && person.tier < cap) {
          let grown = 0;
          while (person.age >= person.nextAt && grown < 3 && person.tier < cap) {
            person.tier += 1;
            person.cult = 0;
            person.maxAge = Math.max(person.maxAge, D.REALMS[person.tier].life);
            person.nextAt = person.age + Math.max(10, Math.round(D.REALMS[person.tier].need / Math.max(0.6, person.talent * 1.6)));
            grown += 1;
          }
          if (grown) {
            this.pushLog("system", `${person.name}破境了，如今是${D.REALMS[person.tier].name}。`);
          }
        } else if (person.age >= person.nextAt) {
          person.nextAt = person.age + 999;
        }
        if (kind === "disciple" && typeof person.affinity === "number") {
          if (person.tier < s.tier - 2) person.affinity = clamp(person.affinity - 1, 0, 100);
          if (person.affinity < 15) person.status = "estranged";
        }
      }
    }

    socialTick() {
      const s = this.state;
      if (!Array.isArray(s.disciples)) s.disciples = [];
      if (!Array.isArray(s.rivals)) s.rivals = [];
      if (!Array.isArray(s.discipleHistory)) s.discipleHistory = [];
      if (!Array.isArray(s.rivalHistory)) s.rivalHistory = [];
      this.maybeCreateSocial();
      this.tickSocialList(s.disciples, "disciple");
      this.tickSocialList(s.rivals, "rival");
    }

    afterStep() {
      this.partnerTick();
      this.socialTick();
      this.sectTick();
      const s = this.state;
      s.stepsSinceEvent = (s.stepsSinceEvent || 0) + 1;
      // 十岁：测灵根（仅人界凡俗起点）
      if (
        s.tier === 0 &&
        s.path === "unsettled" &&
        s.age >= 10 &&
        !s.flags.tested
      ) {
        s.flags.tested = true;
        this.trigger("root_test");
        return;
      }
      // 人生节点：五、十五、三十、五十、七十
      if (this.maybeChildVignette()) return;
      if (this.maybeAgeQuestion()) return;
      // 境界临界：强制剧情
      if (!s.pending && this.forceMilestone()) return;
      // 突破
      if (!s.pending && s.cult >= 100 && this.canBreak()) {
        s.pending = { kind: "break", chance: this.breakChance() };
        return;
      }
      // 宗门提拔排在突破之后，避免抢掉破境/里程碑的 pending
      if (!s.pending && this.maybeSectPromotion()) return;
      // 中期「残图」主线：按 flag 强制推进，避免被随机池淹没
      if (!s.pending && this.maybeMainline()) return;
      // 关键关系链：在主线之后、身份锚点之前推进，不被随机池抽走
      if (!s.pending && this.maybeChain()) return;
      // 地域/宗门身份锚点：一局各一次，保证玩家能遇见
      if (!s.pending && this.maybeIdentityAnchors()) return;
      // 道统是 Build 的入口，做成稳定节点而不是随机池事件
      if (!s.pending && this.maybeSectIdentity()) return;
      // 道统确定后，优先给匹配器胚与一次道统身份事件
      if (!s.pending && this.maybePathArtifact()) return;
      if (!s.pending && this.maybePathFeature()) return;
      if (!s.pending && this.maybePathAwakening()) return;
      // 再一世：前世回响，一局最多一次
      if (!s.pending && this.maybeLegacyEcho()) return;
      // 随机事件
      if (!s.pending && this.rng.chance(this.eventChance())) {
        const ev = this.pickEvent();
        if (ev) {
          this.trigger(ev.id);
          return;
        }
      }
      // 天候
      const ambientChance = s.tier === 0 && s.age < 10 ? 0.42 : 0.62;
      if (!s.pending && this.rng.chance(ambientChance)) {
        const group = this.ambientGroup();
        const pool = D.AMBIENT[group];
        const recent = s.recentAmbient || [];
        const recentKeys = s.recentAmbientKeys || [];
        let line = this.rng.pick(pool);
        let lineKey = `ambient:${group}:${line}`;
        let guard = 0;
        while (
          pool.length > 1 &&
          (recent.indexOf(line) >= 0 || recentKeys.indexOf(lineKey) >= 0) &&
          guard++ < 8
        ) {
          line = this.rng.pick(pool);
          lineKey = `ambient:${group}:${line}`;
        }
        line = this.familyText(line);
        s.recentAmbient = recent.concat(line).slice(-10);
        s.recentAmbientKeys = recentKeys.concat(lineKey).slice(-10);
        this.pushLog("ambient", line);
      }
    }

    eventChance() {
      if (this.state.tier === 0 && this.state.age < 10) return 0.34;
      const f = this.focusDef();
      const years = Math.max(1, this.state.lastStepYears || 1);
      const scale = Math.min(2.5, 1 + Math.log10(years));
      const baseChance = clamp(
        (0.14 + (f.event || 0) * 0.05 + (f.risk || 0) * 0.01) * scale,
        0.08,
        0.5
      );
      if ((this.state.stepsSinceEvent || 0) >= 2) {
        return clamp(
          Math.max(baseChance, 0.45) + (f.event || 0) * 0.02 + (f.risk || 0) * 0.01,
          0.1,
          0.6
        );
      }
      return baseChance;
    }

    focusEventWeight(event) {
      const f = this.focusDef();
      let text = "";
      try {
        text = String(typeof event.text === "function" ? event.text(this.state) : event.text || "");
      } catch (err) {}
      if (Array.isArray(event.choices)) {
        text += " " + event.choices.map((c) => c && c.label || "").join(" ");
      }
      const danger = /战|杀|魔|妖|兽|劫|追|血|尸|毒|敌|险|乱|攻|斗|噬|鬼/.test(text);
      const fortune = /机缘|宝|灵药|奇遇|古洞|秘境|仙缘|福|拍卖|传承|功法|丹/.test(text);
      let weight = 1;
      if (f.luck) weight *= 1 + (fortune ? 0.15 * f.luck : 0);
      if (f.risk > 0 && danger) weight *= 1 + 0.15 * f.risk;
      if (f.risk < 0 && danger) weight *= Math.max(0.2, 1 + 0.3 * f.risk);
      if (f.key === "wander" && fortune) weight *= 1.15;
      if (f.key === "seclude" && danger) weight *= 0.75;
      return weight;
    }

    maybeAgeQuestion() {
      const s = this.state;
      if (s.startWorld !== "human") {
        // 灵界/仙界本地出生也从零岁开始，先让角色有童年，不要在襁褓里问“修行图什么”。
        if (s.age < 30) return false;
        if (s.flags.asked_path) return false;
        s.flags.asked_path = true;
        this.trigger("age_path");
        return true;
      }
      const ages = [5, 15, 30, 50, 70];
      for (const age of ages) {
        // 三十岁以后的问题都在问“修行图什么”，凡人/尚未踏入修行的人不应被问。
        if (age >= 30 && (s.path !== "cultivator" || s.tier <= 0)) continue;
        if (s.age >= age && !s.flags["asked" + age]) {
          const id = "age_" + age;
          if (XD.EVENT_BY_ID[id]) {
            s.flags["asked" + age] = true;
            this.trigger(id);
            return true;
          }
        }
      }
      return false;
    }

    maybeChildVignette() {
      const s = this.state;
      if (s.startWorld !== "human" || s.tier !== 0 || s.path !== "unsettled") return false;
      if (s.age !== 3 && s.age !== 7) return false;
      const key = "child_asked_" + s.age;
      if (s.flags[key]) return false;
      s.flags[key] = true;
      const pool = XD.EVENTS.filter(
        (e) => e.id.indexOf("g_h_child_") === 0 && !s.seen[e.id]
      );
      if (!pool.length) return false;
      const recentScenes = new Set(s.recentScenes || []);
      const fresh = pool.filter((e) => !(e.sceneKey && recentScenes.has(e.sceneKey)));
      const unused = fresh.filter((e) => {
        try {
          if (!this.sceneAllowed(e)) return false;
          const text = typeof e.text === "function" ? e.text(s) : e.text;
          return (s.textUse && s.textUse[text] ? s.textUse[text] : 0) < 2;
        } catch (err) {
          return true;
        }
      });
      const eligible = unused.length ? unused : fresh.filter((e) => this.sceneAllowed(e));
      if (!eligible.length) return false;
      this.trigger(this.rng.pick(eligible).id);
      return true;
    }

    ambientGroup() {
      const t = this.state.tier;
      if (this.state.path !== "cultivator")
        return this.state.age < 16 ? "mortal" : "mortal_adult";
      if (t <= 2) return "qi";
      if (t <= 4) return "foundation";
      if (t <= 5) return "core";
      if (t <= 8) return "spirit";
      return "immortal";
    }

    canBreak() {
      const s = this.state;
      const t = s.tier;
      // 5→6 需要先在灵界落地；仙界本地出生没有经过人界飞升，
      // 允许直接在仙界完成化神→炼虚的门槛，否则会永远卡在化神后期。
      if (t === 5) {
        return s.world === "spirit" || s.startWorld === "immortal";
      }
      // 8→9、12→13 仍由剧情事件完成，其余境界可正常冲关。
      return (t >= 1 && t <= 4) || (t >= 6 && t <= 7) || (t >= 9 && t <= 11);
    }

    forceMilestone() {
      const s = this.state;
      const want = (id, cond) => {
        if (cond && !s.seen[id]) {
          this.trigger(id);
          return true;
        }
        return false;
      };
      if (s.world === "spirit" && !s.flags.arrived_spirit_seen) {
        s.flags.arrived_spirit_seen = true;
        return want("s_arrive", true);
      }
      if (s.world === "immortal" && !s.flags.arrived_immortal_seen) {
        s.flags.arrived_immortal_seen = true;
        return want("i_arrive", true);
      }
      if (s.tier === 5 && s.world === "human" && s.cult >= 90 && !s.flags.spirit_ascended && !s.flags.spirit_attempted && !(s.flags.wait_spirit_until && s.age < s.flags.wait_spirit_until))
        return want("d_node", true);
      if (s.tier === 8 && s.cult >= 85 && !s.flags.immortal_attempted && !(s.flags.wait_immortal_until && s.age < s.flags.wait_immortal_until))
        return want("m_ascend", true);
      if (s.tier === 7 && s.cult >= 85 && !s.flags.dacheng_gate)
        return want("i_dacheng_gate", true);
      if (s.tier === 11 && s.cult >= 90 && !s.flags.daluo_gate)
        return want("i_daluo_gate", true);
      if (s.tier === 12 && !s.flags.sanshi_closed && !s.flags.daozu_declined) {
        if (!s.flags.sanshi_e && s.cult >= 30) return want("i_sanshi_e", true);
        if (s.flags.sanshi_e && !s.flags.sanshi_shan && s.cult >= 60)
          return want("i_sanshi_shan", true);
        if (s.flags.sanshi_shan && !s.flags.sanshi_wo && s.cult >= 90)
          return want("i_sanshi_wo", true);
        if (s.flags.sanshi_e && s.flags.sanshi_shan && s.flags.sanshi_wo && s.cult >= 90)
          return want("i_daozu", true);
      }
      if (s.tier >= 1 && s.age >= s.maxAge * 0.82 && !s.seen.x_life)
        return want("x_life", true);
      return false;
    }

    pickEvent() {
      const s = this.state;
      const stage = this.stage();
      let pool = XD.EVENTS.filter((e) => {
        if (e.chain) return false;
        if (e.id === "root_test") return false;
        // 人界专属事件不能靠各事件自己记得写 world 条件。
        if (
          s.world !== "human" &&
          /^(c_|q_|f_|h_|g_h_|age_|root_|n_|p_mortal$)/.test(e.id)
        ) {
          return false;
        }
        if (e.once && s.seen[e.id]) return false;
        if (e.stage) {
          const stages = Array.isArray(e.stage) ? e.stage : [e.stage];
          if (!stages.includes(stage)) return false;
        }
        try {
          return e.when(s);
        } catch (err) {
          return false;
        }
      });
      const beforeTextFilter = pool;
      const recentEvents = new Set((s.recentEvents || []).slice(-12));
      const notRecent = pool.filter((e) => !recentEvents.has(e.id));
      if (notRecent.length) pool = notRecent;
      pool = pool.filter((e) => {
        try {
          const text = typeof e.text === "function" ? e.text(s) : e.text;
          return (s.textUse && s.textUse[text] ? s.textUse[text] : 0) < 2;
        } catch (err) {
          return true;
        }
      });
      if (!pool.length) pool = beforeTextFilter;
      if (!pool.length) return null;
      const recentScenes = new Set(s.recentScenes || []);
      const fresh = pool.filter((e) => !(e.sceneKey && recentScenes.has(e.sceneKey)));
      if (fresh.length) pool = fresh;
      const sceneFresh = pool.filter((e) => this.sceneAllowed(e));
      if (sceneFresh.length) pool = sceneFresh;
      else if (pool.some((e) => !e.sceneKey)) pool = pool.filter((e) => !e.sceneKey);
      else return null;
      return this.rng.weighted(pool, (e) => {
        const trait = e.tone && s.traits ? s.traits[e.tone] || 0 : 0;
        return (e.w || 1) * (1 + Math.min(0.75, trait * 0.06)) * this.focusEventWeight(e);
      });
    }

    trigger(id) {
      const ev = XD.EVENT_BY_ID[id];
      if (!ev) return;
      const s = this.state;
      if (ev.once) s.seen[id] = true;
      s.recentEvents = (s.recentEvents || []).concat(id).slice(-12);
      if (ev.chain) {
        this.ensureChainState();
        const chain = s.eventChains[ev.chain.role];
        if (chain) {
          chain.stage = ev.chain.stage;
          chain.lastAt = s.age;
          chain.nextAt = s.age + Math.max(0, Number(ev.chain.nextGap) || 0);
          chain.status = "active";
        }
        const npc = s.npcStates && s.npcStates[ev.chain.role];
        if (npc) npc.lastAt = s.age;
      }
      if (ev.sceneKey) {
        s.recentScenes = (s.recentScenes || []).concat(ev.sceneKey).slice(-6);
      }
      const rawText = typeof ev.text === "function" ? ev.text(s) : ev.text;
      const text = this.familyText(rawText);
      this.recordText(text);
      s.stepsSinceEvent = 0;
      this.pushLog("event", text, { title: ev.title });
      if (ev.chain || ev.major) this.recordMilestone(text, ev.title);
      const rawChoices = typeof ev.choices === "function" ? ev.choices(s) : ev.choices;
      const choices = Array.isArray(rawChoices)
        ? rawChoices.map((choice) =>
            Object.assign({}, choice, {
              label: this.familyText(choice.label || ""),
              outcome:
                typeof choice.outcome === "string"
                  ? this.familyText(choice.outcome)
                  : choice.outcome,
            })
          )
        : [];
      s.pending = {
        kind: "event",
        id,
        title: ev.title,
        text,
        sceneKey: ev.sceneKey || "",
        // 弹窗会追加“灵石不足”等临时选项，不能污染全局事件定义。
        choices,
        major: !!ev.major,
        chain: !!ev.chain,
      };
    }

    /* ---------------- 抉择 ---------------- */
    sceneResultType(choice) {
      if (!choice) return "normal";
      if (choice.resultType) return choice.resultType;
      if (choice.risk) return "risk";
      const e = choice.effects || {};
      if (e.flag) return "flag";
      if (e.partner) return "bond";
      if (e.sect) return "sect";
      if (e.death || e.cult < 0) return "loss";
      return "normal";
    }

    eventResultTypes(event) {
      try {
        const choices =
          typeof event.choices === "function" ? event.choices(this.state) : event.choices;
        if (!Array.isArray(choices) || !choices.length) return ["normal"];
        return Array.from(new Set(choices.map((choice) => this.sceneResultType(choice))));
      } catch (err) {
        return ["normal"];
      }
    }

    sceneAllowed(event) {
      if (!event || !event.sceneKey) return true;
      const s = this.state;
      if ((s.sceneTotal && s.sceneTotal[event.sceneKey] || 0) >= 3) return false;
      const types = this.eventResultTypes(event);
      const uses = s.sceneUses || {};
      return types.some(
        (type) => ((uses[`${event.sceneKey}|${type}`] || 0) < 3)
      );
    }

    noteSceneUse(sceneKey, choice) {
      if (!sceneKey) return;
      const s = this.state;
      s.sceneTotal = s.sceneTotal || {};
      s.sceneUses = s.sceneUses || {};
      s.sceneTotal[sceneKey] = (s.sceneTotal[sceneKey] || 0) + 1;
      const key = `${sceneKey}|${this.sceneResultType(choice)}`;
      s.sceneUses[key] = (s.sceneUses[key] || 0) + 1;
    }

    choose(index, opts) {      const s = this.state;
      if (!s.pending || s.pending.kind !== "event") return null;
      const choice = s.pending.choices[index];
      if (!choice) return null;
      const req = choice.requires || {};
      if (req.trait) {
        for (const key of Object.keys(req.trait)) {
          if ((Number(s.traits[key]) || 0) < Number(req.trait[key])) {
            this.pushLog("system", "你的心性还不足以走这条路。");
            return { status: "blocked" };
          }
        }
      }
      if (req.karmaMin != null && s.karma < Number(req.karmaMin)) {
        this.pushLog("system", "你的因果还不够。");
        return { status: "blocked" };
      }
      if (req.karmaMax != null && s.karma > Number(req.karmaMax)) {
        this.pushLog("system", "你的因果太重，这条路走不通。");
        return { status: "blocked" };
      }
      if (req.sectPath && s.sectPath !== req.sectPath) {
        this.pushLog("system", "你的道统不合，无法选择这条路。");
        return { status: "blocked" };
      }
      const required =
        choice.requires && choice.requires.stones != null
          ? choice.requires.stones
          : choice.effects && choice.effects.stones < 0
          ? -choice.effects.stones
          : 0;
      if (required > s.stones) {
        this.pushLog("system", "你拿不出这笔灵石，只能作罢。");
        return { status: "blocked" };
      }

      let donateAmount = null;
      if (choice.donate) {
        const min = Number(choice.donate.min) || 10;
        const max = Math.min(Number(choice.donate.max) || s.stones, s.stones);
        if (s.stones < min || max < min) {
          this.pushLog("system", "你拿不出这笔灵石，只能作罢。");
          return { status: "blocked" };
        }
        const wanted = Number(opts && opts.donateAmount);
        donateAmount = Math.max(min, Math.min(max, Math.floor(Number.isFinite(wanted) ? wanted : min)));
      }

      this.noteSceneUse(s.pending.sceneKey, choice);
      if (s.pending.id === "m_ascend") {
        s.flags.ascend_attempts = (Number(s.flags.ascend_attempts) || 0) + 1;
      }

      const result = { text: "", effects: choice.effects || {}, died: false };
      let effects = Object.assign({}, choice.effects || {});
      if (donateAmount != null) {
        effects.stones = -donateAmount;
        effects.karma =
          (effects.karma || 0) +
          Math.round((donateAmount / (choice.donate.unit || 10)) * (choice.donate.karmaPer || 1));
      }
      this.recordChoice("event", index, donateAmount != null ? { donateAmount } : null);
      const outcomeText =
        typeof choice.outcome === "function"
          ? choice.outcome(s, donateAmount)
          : choice.outcome || "";
      const focus = this.focusDef();
      const riskBonus = choice.risk && typeof choice.risk.bonus === "number"
        ? choice.risk.bonus
        : DEFAULT_RISK_BONUS;
      const attemptedFlag =
        choice.risk && choice.risk.fail && choice.risk.fail.flag
          ? choice.risk.fail.flag
          : "";
      if (attemptedFlag) {
        s.flags = s.flags || {};
        s.flags[attemptedFlag] = true;
      }
      const riskChance = choice.risk
        ? clamp(
            choice.risk.p +
              riskBonus +
              this.artifactRiskBonus() +
              (s.luck - 50) * 0.002 +
              (Number(focus.luck) || 0) * 0.03 -
              (Number(focus.risk) || 0) * 0.02,
            0.12,
            0.96
          )
        : 1;
      if (choice.risk && this.rng.chance(riskChance)) {
        // 成功
        const shown = this.uniqueText(outcomeText || choice.risk.text || "");
        this.pushLog("choice", `你选择了「${choice.label}」。${shown}`);
        result.text = shown;
      } else if (choice.risk) {
        // 失败只结算 risk.fail，不再携带成功选项的 effects。
        effects = Object.assign({}, choice.risk.fail || {});
        if (effects.artifactBroken && s.artifact) s.artifact.broken = true;
        if (!choice.risk.fail || !choice.risk.fail.death) effects.injury = Math.min(3, (s.injury || 0) + 1);
        delete effects.death;
        delete effects.cause;
        result.effects = effects;
        const failShown = this.uniqueText(choice.failText || "事与愿违。");
        this.pushLog(
          "choice",
          `你选择了「${choice.label}」。${failShown}`
        );
        result.text = failShown;
        if (choice.risk.fail && choice.risk.fail.death) {
          const cause = choice.risk.fail.cause || "意外身亡";
          const hardDeath = choice.noRescue || this.isHardDeath(cause);
          if (!hardDeath) {
            const eventId = s.pending.id;
            this.apply(effects);
            this.enterDanger(choice, effects, cause, eventId);
            result.status = "danger";
            result.died = false;
            return result;
          }
          this.pushLog("choice", `—— ${cause}。`);
          this.die(cause);
          s.pending = null;
          result.died = true;
          return result;
        }
      } else {
        const shown = this.uniqueText(outcomeText);
        this.pushLog("choice", `你选择了「${choice.label}」。${shown}`);
        result.text = shown;
      }

      if (s.pending.major || s.pending.chain) {
        this.recordMilestone(`你选择了「${choice.label}」。${result.text || ""}`, "抉择");
      }
      s.pending = null;
      this.apply(effects);
      return result;
    }

    dangerType(choice, eventId) {
      const explicit = choice.danger || (choice.risk && choice.risk.danger);
      if (explicit) return explicit;
      const id = String(eventId || "");
      if (/war|battle/i.test(id)) return "battlefield";
      if (/travel|beast|ruin|wild/i.test(id)) return "wild";
      if (/market|auction/i.test(id)) return "market";
      if (/school|rival|disciple|clan|sect/i.test(id)) return "sect";
      if (/alchemy|pill|furnace/i.test(id)) return "alchemy";
      if (/^g_i_|immortal|palace|law/i.test(id)) return "immortal";
      return "generic";
    }

    enterDanger(choice, effects, cause, eventId) {
      const s = this.state;
      const type = this.dangerType(choice, eventId);
      const base = D.DANGER[type] || D.DANGER.generic;
      const options = base.map((item) => ({
        key: item.key,
        label: item.label,
        p: item.p,
        effects: Object.assign({}, item.effects),
        text: item.text,
        costStones: item.costStones || 0,
        ward: !!item.ward,
      }));
      if (s.ward > 0) {
        options.unshift({
          key: "ward",
          label: "捏碎护身玉符",
          p: 0.92,
          effects: { mood: -14, cult: -4 },
          text: "玉符在你掌心碎开，替你挡下了最重的一击。",
          costStones: 0,
          ward: true,
        });
      }
      s.pending = {
        kind: "danger",
        title: "濒死",
        text: `你选择了「${choice.label}」，事情没有按你想的走。${cause}。你还有一口气。`,
        cause,
        options,
        eventId,
        type,
      };
      this.pushLog("system", `你受了重伤。眼前发黑，必须马上做决定。`);
      return s.pending;
    }

    resolveDanger(index) {
      const s = this.state;
      const p = s.pending;
      if (!p || p.kind !== "danger") return null;
      const opt = p.options[index];
      if (!opt) return null;
      // 渡劫失败后从濒死中活下来，也要给下一次尝试留出冷却，避免同一条天劫连续弹出。
      s.flags = s.flags || {};
      if (opt.ward && s.ward < 1) {
        this.pushLog("system", "你身上没有护身玉符。");
        return { status: "blocked" };
      }
      let cost = 0;
      if (opt.costStones > 0) {
        cost =
          opt.costStones < 1
            ? Math.max(1, Math.floor(s.stones * opt.costStones))
            : Math.floor(opt.costStones);
        if (s.stones < cost) {
          this.pushLog("system", "你拿不出这笔灵石。");
          return { status: "blocked" };
        }
      }
      if (opt.ward) s.ward -= 1;
      if (cost > 0) s.stones = Math.max(0, s.stones - cost);
      this.recordChoice("danger", index, { cause: p.cause || "", cost });
      const chance = clamp(opt.p + (s.luck - 50) * 0.0005, 0.05, 0.95);
      if (this.rng.chance(chance)) {
        this.apply(opt.effects);
        if (p.eventId === "m_ascend") {
          s.flags.wait_immortal_until = Math.max(s.flags.wait_immortal_until || 0, s.age + 500);
        }
        if (p.eventId === "d_node") {
          s.flags.wait_spirit_until = Math.max(s.flags.wait_spirit_until || 0, s.age + 500);
        }
        // 主线风险节点只有真正活下来才推进，且 s_main_2 不能跳过 s_main_3。
        if (p.eventId === "s_main_2") s.flags.s_main_2 = true;
        if (p.eventId === "s_main_3") s.flags.s_main_3 = true;
        if (p.eventId === "i_main_2") s.flags.i_main_2 = true;
        const shown = this.uniqueText(opt.text);
        this.pushLog("choice", `你选择了「${opt.label}」。${shown}`);
        s.pending = null;
        return { status: "survived", text: shown, chance };
      }
      const failShown = this.uniqueText(p.cause || "身死");
      this.pushLog("choice", `你选择了「${opt.label}」。${failShown}。`);
      s.pending = null;
      this.die(p.cause, { bypassWard: true });
      return { status: "died", text: failShown, chance };
    }

    bindArtifact(key) {
      const s = this.state;
      if (s.artifact) return false;
      const def = D.PLAYER_ARTIFACTS.find((x) => x.key === key);
      if (!def) return false;
      s.artifact = { key: def.key, name: def.name, stage: 0, bond: 0, broken: false };
      if (Number(def.maxAge)) s.maxAge += Number(def.maxAge);
      if (Number(def.mood)) s.mood = clamp(s.mood + Number(def.mood), 0, 100);
      this.pushLog("system", `你以精血温养${def.name}，从此它与你气息相连。`, { title: "本命法宝" });
      return true;
    }

    apply(effects) {
      const s = this.state;
      if (!effects) return;
      if (effects.artifactBroken && s.artifact) s.artifact.broken = true;
      if (effects.artifact && !s.artifact) this.bindArtifact(effects.artifact);
      if (typeof effects.artifactBond === "number" && s.artifact && !s.artifact.broken) {
        s.artifact.bond = clamp((s.artifact.bond || 0) + effects.artifactBond, 0, 100);
        s.artifact.stage = Math.min(3, Math.floor(s.artifact.bond / 25));
      }
      if (effects.physiqueAwaken === "nature" || effects.physiqueAwaken === "seal") {
        s.physiqueAwakened = effects.physiqueAwaken;
      }
      if (typeof effects.cult === "number")
        s.cult = clamp(s.cult + effects.cult, 0, 100);
      if (typeof effects.mood === "number") s.mood = clamp(s.mood + effects.mood, 0, 100);
      if (typeof effects.karma === "number") {
        s.karma = clamp(s.karma + effects.karma, -100, 100);
        if (effects.karma >= 5) s.flags.benefactor_seen = true;
        if (effects.karma !== 0) {
          s.karmaBook = Array.isArray(s.karmaBook) ? s.karmaBook : [];
          s.karmaBook.push({ age: s.age, value: effects.karma });
          if (s.karmaBook.length > 20) s.karmaBook = s.karmaBook.slice(-20);
        }
      }
      if (!s.traits) s.traits = { kind: 0, ruthless: 0, curious: 0, bold: 0, calm: 0 };
      if (typeof effects.insight === "number")
        s.insight = clamp(s.insight + effects.insight, 0, 100);
      if (typeof effects.luck === "number") s.luck = clamp(s.luck + effects.luck, 0, 100);
      if (typeof effects.stones === "number") {
        if (effects.stones <= -999) s.stones = 0;
        else s.stones = Math.max(0, s.stones + effects.stones);
      }
      if (typeof effects.maxAge === "number") s.maxAge += effects.maxAge;
      if (typeof effects.incomePerYear === "number") s.incomePerYear += effects.incomePerYear;
      if (typeof effects.breakBonus === "number") s.breakBonus += effects.breakBonus;
      if (typeof effects.ward === "number") s.ward += effects.ward;
      if (typeof effects.cultRate === "number") s.cultRate += effects.cultRate;
      if (effects.flag) s.flags[effects.flag] = true;
      if (typeof effects.sectPath === "string" && D.SECT_PATHS.some((x) => x.key === effects.sectPath)) s.sectPath = effects.sectPath;
      if (effects.trait && typeof effects.trait === "object") {
        Object.keys(effects.trait).forEach((key) => {
          if (Object.prototype.hasOwnProperty.call(s.traits, key)) s.traits[key] = clamp((s.traits[key] || 0) + Number(effects.trait[key] || 0), 0, 10);
        });
      }
      if (typeof effects.injury === "number") s.injury = clamp((s.injury || 0) + effects.injury, 0, 3);
      if (effects.sect) {
        const nextSect = effects.sect;
        const actual = (value) =>
          value && !/散修|散仙|凡俗|杂役|天渊城|北寒仙域|青芦苏氏/.test(value);
        if (actual(s.sect) && !actual(nextSect)) s.flags.sect_lost = true;
        if (actual(nextSect)) s.flags.had_sect = true;
        s.sect = nextSect;
        this.initSectRank();
      }
      if (typeof effects.sectContrib === "number") {
        s.sectContrib = Math.max(0, (s.sectContrib || 0) + effects.sectContrib);
      }
      if (effects.partner) {
        const partnerAge = s.age + this.rng.int(-3, 3);
        const partnerTier = Math.max(0, s.tier);
        const partnerTalent = 0.85 + this.rng.next() * 0.8;
        const partnerGender = s.gender === "女" ? "男" : "女";
        s.partner = {
          id: this.nextNpcId("partner"),
          name: this.rng.pick(D.SURNAMES) + this.pickGivenName(this.rng, partnerGender),
          gender: partnerGender,
          title: effects.partner,
          since: s.age,
          age: partnerAge,
          ageOffset: partnerAge - s.age,
          tier: partnerTier,
          cult: 0,
          talent: partnerTalent,
          world: s.world,
          maxAge: Math.max(80, this.realm().life),
          affinity: 60,
          nextAt: s.age + this.partnerInterval(partnerTier, partnerTalent),
          status: "present",
          alive: true,
          place: s.place,
        };
      }
      if (s.partner && typeof effects.affinity === "number") {
        s.partner.affinity = clamp(s.partner.affinity + effects.affinity, 0, 100);
        if (s.partner.affinity < 15) s.partner.status = "estranged";
        else if (s.partner.status === "estranged" && s.partner.affinity >= 30) {
          s.partner.status = s.partner.world === s.world ? "present" : "apart";
        }
      }
      if (s.partner && effects.partnerStatus) {
        s.partner.status = String(effects.partnerStatus);
      }
      if (s.partner && effects.partnerMoveToPlayer) {
        s.partner.world = s.world;
        s.partner.place = s.place;
        s.partner.status = "present";
      }
      if (effects.discipleStatus) {
        const key = s.npcStates && s.npcStates.disciple && s.npcStates.disciple.key;
        const disciple =
          (s.disciples || []).find((d) => d && d.id === key) ||
          (s.disciples || []).find((d) => d && d.alive !== false);
        if (disciple) disciple.status = String(effects.discipleStatus);
      }
      if (effects.rivalStatus) {
        const key = s.npcStates && s.npcStates.rival && s.npcStates.rival.key;
        const rival =
          (s.rivals || []).find((r) => r && r.id === key) ||
          (s.rivals || []).find((r) => r && r.alive !== false);
        if (rival) rival.status = String(effects.rivalStatus);
      }
      if (typeof effects.discipleAffinity === "number") {
        const key = s.npcStates && s.npcStates.disciple && s.npcStates.disciple.key;
        const disciple =
          (s.disciples || []).find((d) => d && d.id === key) ||
          (s.disciples || []).find((d) => d && d.alive !== false);
        if (disciple) disciple.affinity = clamp((disciple.affinity || 0) + effects.discipleAffinity, 0, 100);
      }
      if (typeof effects.rivalHostility === "number") {
        const key = s.npcStates && s.npcStates.rival && s.npcStates.rival.key;
        const rival =
          (s.rivals || []).find((r) => r && r.id === key) ||
          (s.rivals || []).find((r) => r && r.alive !== false);
        if (rival) rival.hostility = clamp((rival.hostility || 0) + effects.rivalHostility, 0, 100);
      }
      if (effects.disciple) {
        this.createDisciple(effects.disciple);
      }
      if (effects.rival) {
        this.createRival();
      }
      if (effects.awaken && s.root.key === "none") {
        s.root = {
          key: "wei",
          name: "伪灵根",
          mul: 1.0,
          text: "经脉被硬生生撑开一线。这一线，够你走很远。",
        };
        s.path = "cultivator";
        s.tier = 1;
        s.cult = 0;
        s.maxAge = Math.max(s.maxAge, this.realmLife(1));
        this.pushLog("system", "你踏入了炼气期。从此，你与凡人不是一路人了。");
      }
      if (effects.path === "mortal" && s.path !== "mortal") {
        s.path = "mortal";
        if (s.tier === 0) s.maxAge = 78;
        this.initSectRank();
      }
      if (effects.begin && s.tier === 0) {
        s.path = "cultivator";
        s.tier = 1;
        s.cult = 0;
        s.maxAge = Math.max(s.maxAge, this.realmLife(1));
        this.initSectRank();
        this.pushLog("system", "你踏入炼气期。山门在身后合上，人间从此隔了一层。");
      }
      if (effects.wait === "spirit") {
        s.flags.wait_spirit_until = s.age + 500;
        s.flags.wait_spirit_count = (s.flags.wait_spirit_count || 0) + 1;
      }
      if (effects.wait === "immortal") {
        s.flags.wait_immortal_until = s.age + 500;
        s.flags.wait_immortal_count = (s.flags.wait_immortal_count || 0) + 1;
      }
      if (effects.ascend) {
        this.ascendTo(effects.ascend);
      }
      if (effects.become === "daozu") {
        s.tier = 13;
        s.world = "immortal";
        s.cult = 0;
        s.maxAge = 9999999;
        s.legendary = true;
        this.pushLog("system", "万界之上，你成了道祖。");
        this.endLife("证道");
      }
      if (effects.death) {
        this.die(effects.cause || "身死道消");
      }
    }

    ascendTo(world) {
      const s = this.state;
      if (world === "spirit") {
        s.world = "spirit";
        // 化神修士穿过空间节点后仍是化神，境界小阶段不因换界回退。
        s.tier = 5;
        s.cult = Math.max(0, Math.min(99, Number(s.cult) || 0));
        s.maxAge = Math.max(s.maxAge, this.realmLife(5));
        s.flags.arrived_spirit = false;
        s.flags.spirit_ascended = true;
        s.place = "灵界 · 天渊城";
        s.sect = "天渊城 · 散修";
        s.sectRank = -1;
        s.sectContrib = 0;
        s.sectPromo = null;
        this.pushLog("system", "你穿过空间节点，落入了灵界。境界仍是化神，天地却换了。");
      } else if (world === "immortal") {
        s.world = "immortal";
        s.tier = 9;
        s.cult = 0;
        s.maxAge = Math.max(s.maxAge, this.realmLife(9));
        s.flags.arrived_immortal = false;
        s.place = "仙界 · 北寒仙域";
        s.sect = "北寒仙域 · 散仙";
        s.sectRank = -1;
        s.sectContrib = 0;
        s.sectPromo = null;
        this.pushLog("system", "九道天雷之后，你踏入了仙界。");
      }
      s.mood = clamp(s.mood + 8, 0, 100);
    }

    breakForecast() {
      const s = this.state;
      const base =
        0.78 -
        s.tier * 0.04 -
        Math.max(0, s.tier - 8) * (s.startWorld === "immortal" ? 0.04 : 0.12) +
        s.mood * 0.0015 +
        s.insight * 0.0006 +
        (this.rootPower() - 1) * 0.04 +
        ((s.physique && s.physique.breakBonus) || 0) +
        this.artifactBreakBonus() +
        Math.min(s.breakBonus, 25) / 100 -
        (s.flags.demon ? 0.1 : 0) -
        (s.flags.heart_scar ? 0.05 : 0);
      const prep = Math.min(3, Math.max(0, Number(s.breakPrep) || 0)) * 0.03;
      const injury = Math.min(3, Math.max(0, Number(s.injury) || 0)) * 0.03;
      const final = clamp(base + prep - injury, 0.12, 0.94);
      return { base: clamp(base, 0, 1), prep, injury, chance: final };
    }

    breakChance() {
      return this.breakForecast().chance;
    }

    chooseBreak(action) {
      const s = this.state;
      if (!s.pending || s.pending.kind !== "break") return null;
      const p = s.pending.chance;
      this.recordChoice("break", 0, { action });
      s.pending = null;
      if (action === "wait") {
        if ((s.breakWaits || 0) >= 3) {
          s.pending = { kind: "break", chance: this.breakChance() };
          return { status: "blocked" };
        }
        s.breakWaits = (s.breakWaits || 0) + 1;
        s.breakPrep = Math.min(3, (s.breakPrep || 0) + 1);
        s.age += Math.max(1, Math.min(120, Math.round(this.realm().per || 1)));
        s.mood = clamp(s.mood + 8, 0, 100);
        s.breakBonus += 3;
        this.pushLog("system", "你按下躁动的心，又稳固了几年根基。");
        if (s.age >= s.maxAge) this.die("寿元耗尽");
        return { status: "ok" };
      }
      const success = this.rng.chance(p);
      if (success) {
        s.tier += 1;
        s.cult = 0;
        s.breakBonus = 0;
        s.breakWaits = 0;
        s.breakPrep = 0;
        s.injury = Math.max(0, (s.injury || 0) - 1);
        s.mood = clamp(s.mood + 10, 0, 100);
        s.maxAge = Math.max(s.maxAge, this.realmLife(s.tier));
        if (s.artifact && !s.artifact.broken) {
          s.artifact.bond = Math.min(100, (s.artifact.bond || 0) + 20);
          s.artifact.stage = Math.min(3, Math.floor(s.artifact.bond / 25));
        }
        const r = this.realm();
        this.pushLog("break", `天地灵气倒灌。你破境了——${r.name}。`, {
          title: "破境",
        });
        if (s.tier === 6 && s.world === "human") s.world = "spirit";
        if (s.tier === 9 && s.world === "spirit") s.world = "immortal";
        return { status: "break", tier: s.tier };
      }
      s.cult = 40;
      s.breakBonus = Math.floor(s.breakBonus * 0.5);
      s.breakWaits = 0;
      s.breakPrep = Math.max(0, (s.breakPrep || 0) - 1);
      s.injury = Math.min(3, (s.injury || 0) + 1);
      s.mood = clamp(s.mood - 14, 0, 100);
      this.pushLog("fail", "冲关失败。灵力反噬，你在洞府里躺了三个月。", {
        title: "功亏一篑",
      });
      const fatal = s.tier >= 9 ? 0.18 : s.tier >= 5 ? 0.12 : 0.05;
      if (this.rng.chance(fatal)) {
        this.die("走火入魔");
      }
      return { status: "fail" };
    }

    /* ---------------- 同伴 ---------------- */
    updatePeers() {
      const s = this.state;
      s.peers.forEach((p) => {
        if (!p.alive) return;
        if (p.world === "human" && p.tier >= 5) p.world = "spirit";
        if (p.world === "spirit" && p.tier >= 8) p.world = "immortal";
        let guard = 0;
        while (s.age >= p.nextAt && p.tier < 12 && guard < 20) {
          p.tier += 1;
          const need = D.REALMS[p.tier].need || 100;
          p.nextAt += Math.max(10, Math.round(need / (p.talent * 1.6)));
          p.maxAge = Math.max(p.maxAge, D.REALMS[p.tier].life);
          guard++;
        }
        if (s.age >= p.maxAge || (s.age > 40 && this.rng.chance(0.004))) {
          p.alive = false;
          p.fate = s.age >= p.maxAge ? "坐化" : "陨落";
        }
      });
    }

    /* ---------------- 结束 ---------------- */
    isHardDeath(cause) {
      return /劫|天劫|走火入魔|空间乱流|道祖之争|寿元/.test(String(cause || ""));
    }

    buildActs() {
      const s = this.state;
      const birth = s.log.find((l) => l.kind === "birth");
      const events = s.log.filter(
        (l) => (l.kind === "event" || l.kind === "break") && l.text && l.text.length > 5
      );
      const unique = [];
      for (const event of events) {
        if (!unique.some((item) => item.text === event.text)) unique.push(event);
      }
      const endAge = s.endedAt != null ? s.endedAt : s.age;
      const mid = unique.reduce((best, item) => {
        if (!best) return item;
        return Math.abs(item.age - endAge / 2) < Math.abs(best.age - endAge / 2)
          ? item
          : best;
      }, null);
      const last = unique.length ? unique[unique.length - 1] : null;
      const acts = [];
      acts.push({
        tag: "来处",
        age: birth ? birth.age : 0,
        text: birth ? birth.text : `你出生在${s.origin.place}，${s.origin.family}。`,
      });
      if (mid && mid.text !== acts[0].text) {
        acts.push({ tag: "行路", age: mid.age, text: mid.text });
      }
      if (last && last.text !== acts[0].text && (!mid || last.text !== mid.text)) {
        acts.push({ tag: "归处", age: last.age, text: last.text });
      }
      return acts.slice(0, 3);
    }

    finaleSummary(cause) {
      const s = this.state;
      const text = String(cause || s.cause || "身死道消");
      const mortal = s.tier === 0 || s.path === "mortal";
      let key = "accident";
      let title = "远 行";
      let sub = "你没能看见明天的天。";
      if (s.legendary || /证道/.test(text)) {
        key = "legend";
        title = "证 道";
        sub = "你走完了自己的路。";
      } else if (mortal) {
        key = "mortal";
        title = "归 尘";
        sub = "凡人的一生，也有它的重量。";
      } else if (/走火入魔|心魔/.test(text)) {
        key = "demon";
        title = "道 消";
        sub = "心火反噬，道途断在这里。";
      } else if (/劫|雷|空间乱流|天劫/.test(text)) {
        key = "tribulation";
        title = "劫 尽";
        sub = "天地的门槛，终究没有跨过去。";
      } else if (/寿元|坐化|寿尽/.test(text)) {
        key = "old";
        title = "坐 化";
        sub = "灯油燃尽，你合上了眼。";
      } else if (/战|杀|血|兽|仇|袭|刀|剑|陨/.test(text)) {
        key = "violent";
        title = "陨 落";
        sub = "你倒在了路上。";
      }
      const karmaLabel = s.karma >= 30 ? "余庆" : s.karma <= -30 ? "业债" : "两清";
      const partnerLine = s.partner
        ? s.partner.status === "separated" || s.partner.status === "left"
          ? `与${s.partner.name}各走了一段路。`
          : s.partner.status === "estranged"
          ? `与${s.partner.name}渐渐生疏。`
          : `身边还有${s.partner.name}。`
        : s.partnerHistory && s.partnerHistory.length
        ? `${s.partnerHistory[s.partnerHistory.length - 1].name}先走了一步。`
        : "";
      const narratives = {
        legend: [
          "你走到了这条路的尽头。身后的人还在走，山门还在，风也还在。",
          "最后一段路很安静。你没有回头，也不必回头。",
          "你留下了名字，也留下了很多没有说完的话。",
        ],
        mortal: [
          "你过了普通的一生。田里的庄稼、屋里的灯，都还在原来的地方。",
          "你最后看见的是窗外的光。它和很多年前一样，慢慢移过门槛。",
          "这一生没有惊天动地的事。你把日子过完了。",
        ],
        old: [
          "你算过很多次寿元，最后还是没有算过天。",
          "你把手边的东西一件件放好，然后坐下来，等那盏灯灭。",
          "窗外有风。你想了很久，最后什么也没有说。",
        ],
        demon: [
          "心火从丹田烧上来时，你还在想那句没有想通的话。",
          "你看见了很多年前的自己，然后什么也看不见了。",
          "道基碎得很轻，像一层薄冰。",
        ],
        tribulation: [
          "雷声过去以后，山里安静了很久。",
          "你伸手去够那道门，指尖最后停在了半空。",
          "天没有回答。你也没有再问。",
        ],
        violent: [
          "你倒下去的时候，手里还握着那件东西。",
          "路上的人从你身边过去，没有人停下来。",
          "你最后看见的是一线天光，离得很远。",
        ],
        accident: [
          "事情来得很快，快到你来不及想明白。",
          "你还有话没有说完。后来也没有人替你说。",
          "这一世停在这里，像一笔没有收尾的账。",
        ],
      };
      const list = narratives[key] || narratives.accident;
      const narrative = list[(s.seed >>> 0) % list.length] + (partnerLine ? " " + partnerLine : "");
      return {
        v: 1,
        key,
        title,
        sub,
        narrative,
        karmaLabel,
        partnerLine,
        acts: this.buildActs(),
      };
    }

    die(cause, opts) {
      if (!this.state.alive) return;
      const hard = this.isHardDeath(cause);
      if (!(opts && opts.bypassWard) && !hard && this.state.ward > 0) {
        if (this.rng.chance(0.92)) {
          this.state.ward -= 1;
          this.state.mood = clamp(this.state.mood - 8, 0, 100);
          this.pushLog("system", "护身玉符碎了，替你挡下了这一劫。");
          return;
        }
        this.state.ward -= 1;
        this.pushLog("system", "护身玉符碎了，却没有完全挡住这一击。");
      }
      this.state.alive = false;
      this.state.cause = cause;
      this.state.endedAt = this.state.age;
      const pool = D.EPITAPHS[Math.min(this.state.tier, 13)] || D.EPITAPHS[0];
      this.state.epitaph = this.rng.pick(pool);
      this.state.finale = this.finaleSummary(cause);
      this.pushLog("death", `你死了。${cause}。`, { title: "终" });
      this.state.ended = true;
    }

    endLife(kind) {
      this.state.alive = false;
      this.state.ended = true;
      this.state.cause = kind;
      this.state.endedAt = this.state.age;
      this.state.legendary = true;
      this.state.epitaph =
        (D.EPITAPHS[Math.min(this.state.tier, 13)] || D.EPITAPHS[0])[0];
      this.state.finale = this.finaleSummary(kind);
      this.pushLog("death", `你的故事到此为止：${kind}。`, { title: "终" });
    }

    snapshot() {
      const state = JSON.parse(JSON.stringify(this.state));
      state.pending = null;
      if (Array.isArray(state.log)) state.log = state.log.slice(-600);
      if (Array.isArray(state.history)) state.history = state.history.slice(-400);
      if (Array.isArray(state.choiceTrace)) state.choiceTrace = state.choiceTrace.slice(-500);
      return {
        v: 1,
        seed: this.seed,
        world: state.world,
        mode: this.opts.mode || "birth",
        rng: this.rng.getState(),
        socialRng: this.socialRng.getState(),
        state,
        savedAt: new Date().toISOString(),
      };
    }

    static restore(run) {
      if (!run || run.v !== 1 || !run.state || typeof run.seed !== "number") return null;
      const st = run.state;
      if (
        !st.origin ||
        !st.root ||
        !Number.isFinite(Number(st.age)) ||
        !Number.isFinite(Number(st.tier)) ||
        !Array.isArray(st.log) ||
        !Array.isArray(st.history)
      ) {
        return null;
      }
      const sim = new Sim({
        seed: run.seed >>> 0,
        world: run.world || run.state.world || "human",
        mode: run.mode || "birth",
      });
      sim.state = run.state;
      sim.state.pending = null;
      if (!sim.state.flags) sim.state.flags = {};
      if (!sim.state.seen) sim.state.seen = {};
      if (!Array.isArray(sim.state.choiceTrace)) sim.state.choiceTrace = [];
      if (!Array.isArray(sim.state.log)) sim.state.log = [];
      if (!Array.isArray(sim.state.history)) sim.state.history = [];
      if (!Array.isArray(sim.state.recentAmbientKeys)) sim.state.recentAmbientKeys = [];
      if (!sim.state.physique || typeof sim.state.physique !== "object") sim.state.physique = null;
      if (sim.state.physique && !sim.state.physique.path) {
        const def = D.PHYSIQUES.find((x) => x.key === sim.state.physique.key);
        if (def) sim.state.physique = Object.assign({}, def, sim.state.physique);
      }
      if (typeof sim.state.physiqueAwakened !== "string") sim.state.physiqueAwakened = null;
      if (!sim.state.artifact || typeof sim.state.artifact !== "object") sim.state.artifact = null;
      if (sim.state.artifact && typeof sim.state.artifact.bond !== "number") sim.state.artifact.bond = 0;
      sim.ensureChainState();
      sim.rng.setState(run.rng);
      sim.socialRng.setState(run.socialRng);
      return sim;
    }

    summary() {
      const s = this.state;
      const endedTs = Date.now();
      const milestones = Array.isArray(s.milestones) ? s.milestones : [];
      const keyMilestones =
        milestones.length <= 3
          ? milestones
          : milestones.slice(0, 2).concat(milestones.slice(-2));
      const recent = s.log
        .filter((l) => l.kind === "event" || l.kind === "break" || l.kind === "choice")
        .slice(-4);
      const merged = [];
      [...keyMilestones, ...recent].forEach((l) => {
        const item = { age: l.age, text: l.text, title: l.title || "" };
        if (item.text && !merged.some((x) => x.text === item.text && x.age === item.age)) {
          merged.push(item);
        }
      });
      const deeds = merged.slice(-6);
      return {
        id: "life-" + s.seed + "-" + endedTs.toString(36),
        seed: s.seed,
        name: s.name,
        daohao: s.daohao,
        gender: s.gender,
        path: s.path,
        world: s.world,
        origin: s.origin,
        root: s.root,
        realm: this.displayRealm(),
        tier: s.tier,
        age: s.endedAt != null ? s.endedAt : s.age,
        maxAge: s.maxAge,
        cause: s.cause || "尚在人世",
        epitaph: s.epitaph || "",
        finale: s.finale || null,
        deeds,
        partner: s.partner,
        partnerHistory: s.partnerHistory,
        disciples: s.disciples || [],
        rivals: s.rivals || [],
        discipleHistory: s.discipleHistory || [],
        rivalHistory: s.rivalHistory || [],
        karma: s.karma,
        stones: s.stones,
        sect: s.sect,
        sectRank: this.sectRankName(),
        sectContrib: Math.round(s.sectContrib || 0),
        place: s.place,
        bottle: false,
        physique: s.physique ? { key: s.physique.key, name: s.physique.name } : null,
        artifact: s.artifact ? { key: s.artifact.key, name: s.artifact.name, stage: s.artifact.stage || 0, bond: s.artifact.bond || 0, broken: !!s.artifact.broken } : null,
        wish: this.wishSummary(),
        legacy: this.legacySummary(),
        legendary: !!s.legendary,
        karmaBook: Array.isArray(s.karmaBook) ? s.karmaBook.slice(-8) : [],
        ts: endedTs,
      };
    }
  }

  XD.Sim = Sim;
})();
