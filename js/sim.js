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

  class Sim {
    constructor(opts) {
      opts = opts || {};
      this.seed = (opts.seed >>> 0) || (Math.random() * 4294967295) >>> 0;
      this.rng = new U.RNG(this.seed);
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
      let root;
      if (world === "human") {
        root = rng.weighted(D0.ROOTS, (x) => x.w);
      } else {
        do {
          root = rng.weighted(D0.ROOTS, (x) => x.w);
        } while (root.key === "none");
      }

      const surname = rng.pick(D0.SURNAMES);
      const given = rng.pick(D0.GIVEN);
      const name = surname + given;
      const daohao =
        rng.pick(D0.DAOHAO_A) + rng.pick(D0.DAOHAO_B);

      const bottle = rng.chance(0.012);
      const startTier = world === "spirit" ? 6 : world === "immortal" ? 9 : 0;
      const realm = D0.REALMS[startTier];

      const insight = clamp(
        32 + (origin.mods.insight || 0) + rng.int(0, 22),
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
        gender: rng.chance(0.5) ? "男" : "女",
        world,
        startWorld: world,
        path: startTier > 0 ? "cultivator" : "unsettled",
        tier: startTier,
        age: world === "spirit" ? 16 : world === "immortal" ? 100 : 0,
        maxAge: realm.life,
        cult: 0,
        mood,
        karma: 0,
        traits: { kind: 0, ruthless: 0, curious: 0, bold: 0, calm: 0 },
        stones,
        insight,
        luck,
        breakBonus: 0,
        ward: 0,
        cultRate: 0,
        root,
        origin,
        place: origin.place,
        sect: world === "spirit" ? "天渊城 · 散修" : world === "immortal" ? "北寒仙域 · 散仙" : "凡俗",
        partner: null,
        disciples: [],
        rivals: [],
        bottle,
        flags: {},
        seen: {},
        focus: "cultivate",
        log: [],
        lastAmbient: null,
        recentAmbient: [],
        pending: null,
        alive: true,
        cause: null,
        epitaph: null,
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

      this.buildPeers();
      this.pushLog(
        "birth",
        world === "human"
          ? `你出生在${origin.place}，${origin.family}。${origin.text}`
          : `你降生于${origin.place}，${origin.family}。${origin.text}`
      );
      if (startTier > 0) {
        this.pushLog(
          "system",
          `你降生于此界，自幼修行，如今已是${this.realmName()}。`
        );
      }
      this.state.tierHistory.push({ age: this.state.age, tier: this.state.tier });
    }

    buildPeers() {
      const rng = this.rng;
      const names = [];
      const used = new Set([this.state.name]);
      while (names.length < 4) {
        const n = rng.pick(D.SURNAMES) + rng.pick(D.GIVEN);
        if (used.has(n)) continue;
        used.add(n);
        names.push(n);
      }
      const worlds = this.state.world === "human" ? ["human", "human", "human", "human"] : [this.state.world, this.state.world, "human", "spirit"];
      this.state.peers = names.map((n, i) => {
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
    focusDef() {
      return D.FOCUS.find((f) => f.key === this.state.focus) || D.FOCUS[0];
    }
    pushLog(kind, text, extra) {
      const entry = Object.assign(
        { age: this.state.age, kind, text },
        extra || {}
      );
      this.state.log.push(entry);
      return entry;
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
        this.yearTick();
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

    yearTick() {
      const s = this.state;
      if (s.tier === 0) {
        if (s.path === "mortal") {
          s.mood = clamp(s.mood + (s.age > 65 ? -1 : 0), 0, 100);
        }
      } else {
        const f = this.focusDef();
        const decay = s.age > s.maxAge * 0.6 ? 0.04 : 0.005;
        s.mood = clamp(s.mood + (f.mood || 0) - decay, 0, 100);
        s.stones = Math.max(0, s.stones + (f.stones || 0));
        if (f.insight && this.rng.chance(f.insight)) {
          s.insight = clamp(s.insight + 1, 0, 100);
        }
        const base = 100 / this.realm().need;
        const mul =
          s.root.mul *
          (0.75 + s.insight / 200) *
          (0.82 + s.mood / 240) *
          (f.cult || 1) *
          (1 + s.cultRate) *
          (s.bottle ? 2.1 : 1);
        s.cult = clamp(s.cult + base * mul, 0, 100);
      }

      if (s.mood < 12 && this.rng.chance(0.006)) {
        this.die("心魔缠身");
      }
    }

    afterStep() {
      const s = this.state;
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
        let line = this.rng.pick(pool);
        let guard = 0;
        while (pool.length > 1 && recent.indexOf(line) >= 0 && guard++ < 6) {
          line = this.rng.pick(pool);
        }
        s.recentAmbient = recent.concat(line).slice(-4);
        this.pushLog("ambient", line);
      }
    }

    eventChance() {
      if (this.state.tier === 0 && this.state.age < 10) return 0.34;
      const f = this.focusDef();
      const years = Math.max(1, this.state.lastStepYears || 1);
      const scale = Math.min(2.5, 1 + Math.log10(years));
      return clamp((0.14 + (f.event || 0) * 0.05) * scale, 0.08, 0.5);
    }

    maybeAgeQuestion() {
      const s = this.state;
      if (s.startWorld !== "human") {
        if (s.flags.asked_path) return false;
        s.flags.asked_path = true;
        this.trigger("age_path");
        return true;
      }
      const ages = [5, 15, 30, 50, 70];
      for (const age of ages) {
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
      this.trigger(this.rng.pick(fresh.length ? fresh : pool).id);
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
      const t = this.state.tier;
      // 5→6、8→9、12→13 由剧情事件完成，其余境界可正常冲关
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
      if (s.tier === 5 && s.cult >= 90 && !(s.flags.wait_spirit_until && s.age < s.flags.wait_spirit_until))
        return want("d_node", true);
      if (s.tier === 8 && s.cult >= 85 && !(s.flags.wait_immortal_until && s.age < s.flags.wait_immortal_until))
        return want("m_ascend", true);
      if (s.tier === 12 && s.cult >= 90) return want("i_daozu", true);
      if (s.tier >= 1 && s.age >= s.maxAge * 0.82 && !s.seen.x_life)
        return want("x_life", true);
      return false;
    }

    pickEvent() {
      const s = this.state;
      const stage = this.stage();
      let pool = XD.EVENTS.filter((e) => {
        if (e.id === "root_test") return false;
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
      if (!pool.length) return null;
      const recentScenes = new Set(s.recentScenes || []);
      const fresh = pool.filter((e) => !(e.sceneKey && recentScenes.has(e.sceneKey)));
      if (fresh.length) pool = fresh;
      return this.rng.weighted(pool, (e) => {
        const trait = e.tone && s.traits ? s.traits[e.tone] || 0 : 0;
        return (e.w || 1) * (1 + Math.min(0.75, trait * 0.06));
      });
    }

    trigger(id) {
      const ev = XD.EVENT_BY_ID[id];
      if (!ev) return;
      const s = this.state;
      if (ev.once) s.seen[id] = true;
      if (ev.sceneKey) {
        s.recentScenes = (s.recentScenes || []).concat(ev.sceneKey).slice(-6);
      }
      const text = typeof ev.text === "function" ? ev.text(s) : ev.text;
      this.pushLog("event", text, { title: ev.title });
      s.pending = {
        kind: "event",
        id,
        title: ev.title,
        text,
        choices:
          typeof ev.choices === "function" ? ev.choices(s) : ev.choices,
        major: !!ev.major,
      };
    }

    /* ---------------- 抉择 ---------------- */
    choose(index, opts) {
      const s = this.state;
      if (!s.pending || s.pending.kind !== "event") return null;
      const choice = s.pending.choices[index];
      if (!choice) return null;
      const required =
        choice.requires && choice.requires.stones != null
          ? choice.requires.stones
          : choice.effects && choice.effects.stones < 0
          ? -choice.effects.stones
          : 0;
      if (required > s.stones) {
        s.pending = null;
        this.pushLog("system", "你拿不出这笔灵石，只能作罢。");
        return { status: "blocked" };
      }

      let donateAmount = null;
      if (choice.donate) {
        const min = Number(choice.donate.min) || 10;
        const max = Math.min(Number(choice.donate.max) || s.stones, s.stones);
        if (s.stones < min || max < min) {
          s.pending = null;
          this.pushLog("system", "你拿不出这笔灵石，只能作罢。");
          return { status: "blocked" };
        }
        const wanted = Number(opts && opts.donateAmount);
        donateAmount = Math.max(min, Math.min(max, Math.floor(Number.isFinite(wanted) ? wanted : min)));
      }

      const result = { text: "", effects: choice.effects || {}, died: false };
      let effects = Object.assign({}, choice.effects || {});
      if (donateAmount != null) {
        effects.stones = -donateAmount;
        effects.karma =
          (effects.karma || 0) +
          Math.round((donateAmount / (choice.donate.unit || 10)) * (choice.donate.karmaPer || 1));
      }
      const outcomeText =
        typeof choice.outcome === "function"
          ? choice.outcome(s, donateAmount)
          : choice.outcome || "";
      const riskChance = choice.risk
        ? clamp(choice.risk.p + 0.34 + (s.luck - 50) * 0.002, 0.12, 0.96)
        : 1;
      if (choice.risk && this.rng.chance(riskChance)) {
        // 成功
        this.pushLog("choice", `你选择了「${choice.label}」。${outcomeText || choice.risk.text || ""}`);
        result.text = outcomeText || choice.risk.text || "";
      } else if (choice.risk) {
        if (choice.risk.fail) {
          effects = Object.assign({}, effects, choice.risk.fail);
          delete effects.death;
        }
        this.pushLog(
          "choice",
          `你选择了「${choice.label}」。${choice.failText || "事与愿违。"}`
        );
        result.text = choice.failText || "事与愿违。";
        if (choice.risk.fail && choice.risk.fail.death) {
          const cause = choice.risk.fail.cause || "意外身亡";
          const hardDeath =
            choice.noRescue ||
            /劫|天劫|走火入魔|空间乱流|道祖之争|寿元/.test(cause);
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
        this.pushLog("choice", `你选择了「${choice.label}」。${outcomeText}`);
        result.text = outcomeText;
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
      const chance = clamp(opt.p + (s.luck - 50) * 0.0005, 0.05, 0.95);
      if (this.rng.chance(chance)) {
        this.apply(opt.effects);
        this.pushLog("choice", `你选择了「${opt.label}」。${opt.text}`);
        s.pending = null;
        return { status: "survived", text: opt.text, chance };
      }
      this.pushLog("choice", `你选择了「${opt.label}」。${p.cause}。`);
      s.pending = null;
      this.die(p.cause, { bypassWard: true });
      return { status: "died", text: p.cause, chance };
    }

    apply(effects) {
      const s = this.state;
      if (!effects) return;
      if (typeof effects.cult === "number")
        s.cult = clamp(s.cult + effects.cult, 0, 100);
      if (typeof effects.mood === "number") s.mood = clamp(s.mood + effects.mood, 0, 100);
      if (typeof effects.karma === "number") s.karma = clamp(s.karma + effects.karma, -100, 100);
      if (!s.traits) s.traits = { kind: 0, ruthless: 0, curious: 0, bold: 0, calm: 0 };
      if (typeof effects.karma === "number" && effects.karma > 0) {
        s.traits.kind += Math.min(3, Math.ceil(effects.karma / 2));
      }
      if (typeof effects.karma === "number" && effects.karma < 0) {
        s.traits.ruthless += Math.min(3, Math.ceil(-effects.karma / 2));
      }
      if (typeof effects.insight === "number" && effects.insight > 0) {
        s.traits.curious += Math.min(2, Math.ceil(effects.insight / 2));
      }
      if (typeof effects.luck === "number" && effects.luck > 0) {
        s.traits.bold += 1;
      }
      if (typeof effects.mood === "number" && effects.mood > 0) {
        s.traits.calm += 1;
      }
      if (typeof effects.insight === "number")
        s.insight = clamp(s.insight + effects.insight, 0, 100);
      if (typeof effects.luck === "number") s.luck = clamp(s.luck + effects.luck, 0, 100);
      if (typeof effects.stones === "number") {
        if (effects.stones <= -999) s.stones = 0;
        else s.stones = Math.max(0, s.stones + effects.stones);
      }
      if (typeof effects.maxAge === "number") s.maxAge += effects.maxAge;
      if (typeof effects.breakBonus === "number") s.breakBonus += effects.breakBonus;
      if (typeof effects.ward === "number") s.ward += effects.ward;
      if (typeof effects.cultRate === "number") s.cultRate += effects.cultRate;
      if (effects.flag) s.flags[effects.flag] = true;
      if (effects.sect) s.sect = effects.sect;
      if (effects.partner) {
        s.partner = {
          name: this.rng.pick(D.SURNAMES) + this.rng.pick(D.GIVEN),
          title: effects.partner,
          since: s.age,
        };
      }
      if (effects.disciple) {
        s.disciples.push({
          name: this.rng.pick(D.SURNAMES) + this.rng.pick(D.GIVEN),
          title: effects.disciple,
          since: s.age,
        });
      }
      if (effects.rival) {
        s.rivals.push({
          name: this.rng.pick(D.SURNAMES) + this.rng.pick(D.GIVEN),
          since: s.age,
        });
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
        s.maxAge = Math.max(s.maxAge, D.REALMS[1].life);
        this.pushLog("system", "你踏入了炼气期。从此，你与凡人不是一路人了。");
      }
      if (effects.path === "mortal" && s.path !== "mortal") {
        s.path = "mortal";
        if (s.tier === 0) s.maxAge = 78;
      }
      if (effects.begin && s.tier === 0) {
        s.path = "cultivator";
        s.tier = 1;
        s.cult = 0;
        s.maxAge = Math.max(s.maxAge, D.REALMS[1].life);
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
        s.tier = 6;
        s.cult = 0;
        s.maxAge = Math.max(s.maxAge, D.REALMS[6].life);
        s.flags.arrived_spirit = false;
        s.place = "灵界 · 天渊城";
        s.sect = "天渊城 · 散修";
        this.pushLog("system", "你穿过空间节点，落入了灵界。");
      } else if (world === "immortal") {
        s.world = "immortal";
        s.tier = 9;
        s.cult = 0;
        s.maxAge = Math.max(s.maxAge, D.REALMS[9].life);
        s.flags.arrived_immortal = false;
        s.place = "仙界 · 北寒仙域";
        s.sect = "北寒仙域 · 散仙";
        this.pushLog("system", "九道天雷之后，你踏入了仙界。");
      }
      s.mood = clamp(s.mood + 8, 0, 100);
    }

    breakChance() {
      const s = this.state;
      let p =
        0.78 -
        s.tier * 0.04 +
        s.mood * 0.0015 +
        s.insight * 0.0006 +
        (s.root.mul - 1) * 0.04 +
        Math.min(s.breakBonus, 25) / 100 -
        (s.flags.demon ? 0.1 : 0) -
        (s.flags.heart_scar ? 0.05 : 0);
      return clamp(p, 0.15, 0.94);
    }

    chooseBreak(action) {
      const s = this.state;
      if (!s.pending || s.pending.kind !== "break") return null;
      const p = s.pending.chance;
      s.pending = null;
      if (action === "wait") {
        if ((s.breakWaits || 0) >= 3) return { status: "blocked" };
        s.breakWaits = (s.breakWaits || 0) + 1;
        s.age += Math.min(8, Math.max(1, Math.round(this.realm().per)));
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
        s.mood = clamp(s.mood + 10, 0, 100);
        s.maxAge = Math.max(s.maxAge, D.REALMS[s.tier].life);
        const r = this.realm();
        this.pushLog("break", `天地灵气倒灌。你破境了——${r.name}。`, {
          title: "破境",
        });
        if (s.tier === 6 || s.tier === 9) s.world = r.world;
        return { status: "break", tier: s.tier };
      }
      s.cult = 40;
      s.breakBonus = 0;
      s.breakWaits = 0;
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
    die(cause, opts) {
      if (!this.state.alive) return;
      if (!(opts && opts.bypassWard) && cause !== "寿元耗尽" && this.state.ward > 0) {
        this.state.ward -= 1;
        this.state.mood = clamp(this.state.mood + 10, 0, 100);
        this.pushLog("system", "护身玉符碎了，替你挡下了这一劫。");
        return;
      }
      this.state.alive = false;
      this.state.cause = cause;
      this.state.endedAt = this.state.age;
      const pool = D.EPITAPHS[Math.min(this.state.tier, 13)] || D.EPITAPHS[0];
      this.state.epitaph = this.rng.pick(pool);
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
      this.pushLog("death", `你的故事到此为止：${kind}。`, { title: "终" });
    }

    summary() {
      const s = this.state;
      const deeds = s.log
        .filter((l) => l.kind === "event" || l.kind === "break")
        .slice(-6)
        .map((l) => ({ age: l.age, text: l.text, title: l.title || "" }));
      return {
        id: "life-" + s.seed,
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
        deeds,
        partner: s.partner,
        disciples: s.disciples,
        karma: s.karma,
        stones: s.stones,
        sect: s.sect,
        place: s.place,
        bottle: s.bottle,
        legendary: !!s.legendary,
        ts: Date.now(),
      };
    }
  }

  XD.Sim = Sim;
})();
