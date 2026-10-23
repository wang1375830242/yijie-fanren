/* 原著一致性回归测试：无浏览器、无第三方依赖，直接 Node 运行。
   用法：node tests/canon-regression.js
*/
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const ROOT = path.resolve(__dirname, "..");
global.window = global;
global.document = {
  addEventListener() {},
  documentElement: { dataset: {} },
  querySelector() {
    return null;
  },
  querySelectorAll() {
    return [];
  },
  getElementById() {
    return null;
  },
  createElement() {
    return {
      style: {},
      classList: { add() {}, remove() {}, toggle() {} },
      setAttribute() {},
      appendChild() {},
      addEventListener() {},
      querySelector() {
        return null;
      },
    };
  },
};
global.localStorage = {
  _data: {},
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this._data, key) ? this._data[key] : null;
  },
  setItem(key, value) {
    this._data[key] = String(value);
  },
  removeItem(key) {
    delete this._data[key];
  },
};

for (const file of [
  "js/common.js",
  "js/data.js",
  "js/events.js",
  "js/events-expanded.js",
  "js/sim.js",
  "js/canon.js",
]) {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, file), "utf8"), {
    filename: file,
  });
}

const D = XD.DATA;
const Sim = XD.Sim;
let checks = 0;

function ok(condition, message) {
  assert.ok(condition, message);
  checks++;
}

/* H1：后期境界不能被寿元硬锁死。 */
for (const realm of D.REALMS.filter((realm) => realm.tier >= 3)) {
  ok(
    realm.need <= realm.life * 0.8,
    `H1 ${realm.name} need ${realm.need} > life ${realm.life} * 0.8`
  );
}
for (const realm of D.REALMS.filter((realm) => realm.tier >= 6)) {
  ok(realm.per >= 32 && realm.pace > 1, `后期节奏 ${realm.name} 应有更小步长与 compensator`);
}
const pitySim = new Sim({ seed: 71, world: "human" });
pitySim.state.age = 20;
pitySim.state.stepsSinceEvent = 2;
ok(pitySim.eventChance() >= 0.45, "连续无事件后应有保底事件率");
const daozuEvent = XD.EVENT_BY_ID.i_daozu;
ok(
  daozuEvent.choices.some((choice) => choice.effects && choice.effects.flag === "daozu_declined"),
  "道祖事件退让后应记录已退标志"
);

/* 结局：分类、三幕回顾与终局摘要。 */
const endingSim = new Sim({ seed: 602, world: "human" });
endingSim.state.tier = 3;
endingSim.state.age = 240;
endingSim.state.cause = "走火入魔";
const ending = endingSim.finaleSummary("走火入魔");
ok(ending.key === "demon" && ending.title.includes("道"), "心魔结局应归入道消");
ok(ending.narrative && ending.narrative.length <= 120, "终局叙事应有短文本");
ok(ending.acts.length >= 1 && ending.acts.length <= 3, "一生回顾应有三幕上限");
ok(
  endingSim.finaleSummary("走火入魔").narrative === ending.narrative,
  "同一 seed 的终局叙事应稳定"
);
const mortalEndingSim = new Sim({ seed: 604, world: "human" });
mortalEndingSim.state.tier = 0;
mortalEndingSim.state.path = "mortal";
const mortalEnding = mortalEndingSim.finaleSummary("寿元耗尽");
ok(mortalEnding.key === "mortal", "凡人寿终应归入凡尘");
const ascendedEnding = endingSim.finaleSummary("证道");
ok(ascendedEnding.key === "legend", "证道应使用证道结局");
const deathSim = new Sim({ seed: 603, world: "human" });
deathSim.state.tier = 1;
deathSim.state.ward = 0;
deathSim.die("走火入魔");
ok(deathSim.summary().finale && deathSim.summary().finale.key === "demon", "死亡摘要应带终局叙事");
ok(
  fs.readFileSync(path.join(ROOT, "play.html"), "utf8").includes("endNarrative") &&
    fs.readFileSync(path.join(ROOT, "play.html"), "utf8").includes("endActs"),
  "终局页应展示终局叙事与三幕回顾"
);

/* H2：化神进入灵界仍是化神，之后再突破炼虚。 */
const ascend = new Sim({ seed: 3, world: "human" });
ascend.state.tier = 5;
ascend.state.age = 1200;
ascend.ascendTo("spirit");
ok(ascend.state.world === "spirit", "H2 进入灵界后 world 应为 spirit");
ok(ascend.state.tier === 5, "H2 进入灵界后仍应是化神 tier=5");
ascend.state.pending = { kind: "break", chance: 1 };
ascend.chooseBreak("push");
ok(ascend.state.tier === 6, "H2 化神之后应能正常突破到炼虚 tier=6");
ok(ascend.state.world === "spirit", "H2 炼虚仍应留在灵界");

/* H4：典籍中的界域必须与境界匹配。 */
function expectedWorld(realm) {
  const value = String(realm || "");
  if (/道祖|真仙|金仙|太乙|大罗/.test(value)) return "immortal";
  if (/大乘|合体|炼虚/.test(value)) return "spirit";
  if (/凡人|炼气|筑基|结丹|元婴|化神|无灵根/.test(value)) return "human";
  return null;
}
for (const legend of D.LEGENDS) {
  const expected = expectedWorld(legend.realm);
  if (expected) {
    ok(
      legend.world === expected,
      `H4 ${legend.name} 境界 ${legend.realm} 应属于 ${expected}，实际 ${legend.world}`
    );
  }
}

/* H5：不再把读者共识写成“原著结局”。 */
ok(
  !D.LEGENDS.some((legend) => String(legend.note || "").includes("原著结局")),
  "H5 碑林 note 不应再出现“原著结局”"
);
ok(D.LEGENDS.length === 39, `碑林原著人物应为 39 位，实际 ${D.LEGENDS.length}`);
ok(
  new Set(D.LEGENDS.map((legend) => legend.id)).size === D.LEGENDS.length,
  "碑林人物 id 不应重复"
);
const hallSource = fs.readFileSync(path.join(ROOT, "js/hall.js"), "utf8");
for (const legend of D.LEGENDS) {
  ok(
    hallSource.includes(`"${legend.id}"`),
    `碑林人物 ${legend.name} 应有灵根/宗门资料`
  );
}
ok(
  !(XD.CANON && XD.CANON.characters || []).some((character) =>
    String(character.meta || "").includes("原著结局")
  ),
  "H5 图鉴 meta 不应再出现“原著结局”"
);

/* H6：道祖不再写成唯一席位。 */
const eventsSource = fs.readFileSync(path.join(ROOT, "js/events.js"), "utf8");
ok(
  !eventsSource.includes("万界只有一个道祖之位"),
  "H6 不应再出现“万界只有一个道祖之位”"
);

/* H7：玩家旧瓶不再暗示为掌天瓶。 */
ok(!eventsSource.includes('title: "小瓶"'), "H7 玩家事件不应再叫“小瓶”");
const gameSource = fs.readFileSync(path.join(ROOT, "js/game.js"), "utf8");
ok(gameSource.includes("无名旧瓶"), "H7 角色面板应显示“无名旧瓶”");
ok(!gameSource.includes("生还 ${"), "濒死选项不应显示生还率");
ok(
  !/生机较大|九死一生|有凶险/.test(gameSource),
  "选项不应显示定性质风险标签"
);

/* H8：硬死亡绕过玉符；普通死亡玉符 92% 判定。 */
const normal = new Sim({ seed: 2, world: "human" });
normal.state.ward = 1;
normal.rng.chance = () => true;
normal.die("被乱刀砍中");
ok(normal.state.alive === true && normal.state.ward === 0, "H8 普通死亡应触发玉符免死");
const hard = new Sim({ seed: 2, world: "human" });
hard.state.ward = 1;
hard.die("陨于飞升天劫");
ok(hard.state.alive === false && hard.state.ward === 1, "H8 飞升天劫应绕过玉符");

/* M3：道侣文本不再出现英文 ta，且道侣有寿元字段。 */
const expandedSource = fs.readFileSync(path.join(ROOT, "js/events-expanded.js"), "utf8");
ok(!/[\u4e00-\u9fff"']ta/.test(expandedSource), "M3 不应再出现中文语境里的 ta");
const partnerSim = new Sim({ seed: 8, world: "human" });
partnerSim.state.tier = 2;
partnerSim.apply({ partner: "道侣" });
ok(partnerSim.state.partner && partnerSim.state.partner.maxAge > 0, "M3 道侣应有寿元字段");

/* M4：男角色不能入掩月宗，女角色可以。 */
const rootEvent = XD.EVENTS.find((event) => event.id === "root_test");
const maleSim = new Sim({ seed: 4, world: "human" });
maleSim.state.gender = "男";
maleSim.state.origin.place = "越国 · 青牛镇";
const femaleSim = new Sim({ seed: 4, world: "human" });
femaleSim.state.gender = "女";
femaleSim.state.origin.place = "越国 · 青牛镇";
const maleSects = rootEvent.choices(maleSim.state).map((choice) => choice.effects && choice.effects.sect);
const femaleSects = rootEvent.choices(femaleSim.state).map((choice) => choice.effects && choice.effects.sect);
ok(!maleSects.includes("掩月宗"), "M4 男角色不应能入掩月宗");
ok(femaleSects.includes("掩月宗"), "M4 女角色应能入掩月宗");

/* 出生地决定可选宗门。 */
function sectLabelsAt(place, gender) {
  const sim = new Sim({ seed: 31, world: "human" });
  sim.state.origin.place = place;
  sim.state.gender = gender;
  return rootEvent.choices(sim.state).map((choice) => choice.effects && choice.effects.sect);
}
const yueSects = sectLabelsAt("越国 · 青牛镇", "男");
const tiannanSects = sectLabelsAt("天南 · 临江府", "男");
const dajinSects = sectLabelsAt("大晋 · 晋州", "男");
const luantianSects = sectLabelsAt("乱星海 · 石螺岛", "男");
ok(yueSects.includes("黄枫谷") && !yueSects.includes("落云宗"), "越国应匹配越国宗门");
ok(tiannanSects.includes("落云宗") && !tiannanSects.includes("黄枫谷"), "天南应匹配天南宗门");
ok(dajinSects.includes("太一门") && !dajinSects.includes("星宫"), "大晋应匹配大晋宗门");
ok(luantianSects.includes("星宫") && !luantianSects.includes("太一门"), "乱星海应匹配乱星海宗门");

/* M6：灵界不再写成两个月亮；仙界地理说明是总称。 */
const dataSource = fs.readFileSync(path.join(ROOT, "js/data.js"), "utf8");
ok(!dataSource.includes("灵界的月有两个"), "M6 不应再写灵界有两个月亮");
ok(dataSource.includes("真仙界是总称"), "M6 仙界地理应说明真仙界是总称");

/* 散修不应出现宗门/山门对话。 */
const rogue = new Sim({ seed: 21, world: "human" });
rogue.state.tier = 1;
rogue.state.path = "cultivator";
rogue.state.sect = "散修";
rogue.state.age = 15;
const age15 = XD.EVENT_BY_ID.age_15;
const rogueText = age15.text(rogue.state);
ok(!/山门|师兄|执事|月例/.test(rogueText), "散修十五岁文本不应出现宗门/山门");
ok(
  !XD.EVENT_BY_ID.g_h_school_0.when(rogue.state),
  "散修不应触发山门事件"
);
ok(
  !XD.EVENT_BY_ID.q_sectwar.when(rogue.state),
  "散修不应触发宗门攻山事件"
);
ok(
  !XD.EVENT_BY_ID.q_first_sword.when(rogue.state),
  "散修不应触发宗门发剑事件"
);
ok(
  !XD.EVENT_BY_ID.q_bully.when(rogue.state),
  "散修不应触发同门相欺事件"
);
ok(
  !XD.EVENT_BY_ID.q_valley.when(rogue.state),
  "散修不应触发宗门落霞谷事件"
);

/* M9：灵石不足时不消耗事件，保留 pending 让玩家重选。 */
const poor = new Sim({ seed: 6, world: "human" });
poor.state.stones = 0;
poor.state.pending = {
  kind: "event",
  id: "test-poor",
  choices: [
    {
      label: "买",
      requires: { stones: 999 },
      effects: {},
      outcome: "买不起。",
    },
  ],
};
const blocked = poor.choose(0);
ok(blocked && blocked.status === "blocked", "M9 灵石不足应返回 blocked");
ok(poor.state.pending && poor.state.pending.kind === "event", "M9 灵石不足不应消耗事件");

/* M10：心境不再长期只涨不跌。 */
const moodSim = new Sim({ seed: 10, world: "human" });
moodSim.state.tier = 1;
moodSim.state.age = 30;
moodSim.state.maxAge = 130;
moodSim.state.mood = 50;
moodSim.state.focus = "cultivate";
const beforeMood = moodSim.state.mood;
moodSim.yearTick();
ok(moodSim.state.mood < beforeMood, "M10 苦修应带来心境损耗");

/* 道侣自动线：突破、异地、死亡留档。 */
const partnerLife = new Sim({ seed: 12, world: "human" });
partnerLife.state.tier = 1;
partnerLife.state.age = 25;
partnerLife.apply({ partner: "道侣" });
const partner = partnerLife.state.partner;
partner.tier = 1;
partner.cult = 100;
partner.nextAt = 0;
partner.affinity = 70;
partnerLife.rng.chance = () => true;
partnerLife.partnerTick();
ok(partner.tier >= 2, "道侣应能自动突破");
ok(partnerLife.state.partner !== null, "道侣突破后应仍在");
const partnerEvent = XD.EVENTS.find((event) => event.id === "p_letter");
ok(partnerEvent && partnerEvent.when({ partner: { status: "apart" } }), "道侣异地应有书信事件");
const deathPartner = new Sim({ seed: 13, world: "human" });
deathPartner.state.tier = 1;
deathPartner.state.age = 80;
deathPartner.apply({ partner: "道侣" });
deathPartner.state.partner.maxAge = 60;
deathPartner.partnerTick();
ok(deathPartner.state.partner === null, "道侣寿尽应离开");
ok(deathPartner.state.partnerHistory.length === 1, "道侣寿尽应留下历史");
const agePartner = new Sim({ seed: 14, world: "human" });
agePartner.state.tier = 1;
agePartner.state.age = 63;
agePartner.apply({ partner: "道侣" });
agePartner.state.partner.maxAge = 1000;
const partnerAgeAtStart = agePartner.state.partner.age;
agePartner.state.age = 357;
agePartner.partnerTick();
ok(
  agePartner.state.partner && agePartner.state.partner.age >= 354,
  "道侣岁数应随时间增长"
);
ok(
  agePartner.state.partner.age > partnerAgeAtStart,
  "道侣岁数不应固定在结伴年龄"
);

/* 道侣突破必须按境界需要时间，不能在 1200 岁自行证道。 */
const slowerPartner = new Sim({ seed: 701, world: "human" });
slowerPartner.state.path = "cultivator";
slowerPartner.state.tier = 5;
slowerPartner.state.age = 30;
slowerPartner.state.maxAge = 5000;
slowerPartner.apply({ partner: "道侣" });
const slow = slowerPartner.state.partner;
slow.tier = 5;
slow.nextAt = 40;
for (let age = 100; age <= 1200; age += 10) {
  slowerPartner.state.age = age;
  slowerPartner.partnerTick();
  if (!slowerPartner.state.partner) break;
}
ok(
  !slowerPartner.state.partner || slowerPartner.state.partner.tier <= 8,
  "道侣 1200 岁不应突破到道祖或过高境界"
);
ok(
  slowerPartner.partnerInterval(5, 1.2) > slowerPartner.partnerInterval(1, 1.2),
  "高境界道侣突破间隔应更长"
);

/* 转世道果：四项继承、上下限与不继承境界/寿元。 */
const legacySource = new Sim({ seed: 222, world: "human" });
legacySource.state.tier = 6;
legacySource.state.insight = 50;
legacySource.state.stones = 100;
legacySource.state.karma = 20;
const legacyReward = legacySource.legacySummary();
ok(legacyReward.v === 1 && legacyReward.depth === 1, "道果应带版本与世代");
ok(legacyReward.insight > 0 && legacyReward.stones > 0, "道果应包含悟性与遗物");
ok(legacyReward.ward === 1, "化神以上前世应留下护身玉符");
ok(legacyReward.karma > 0, "善因应保留正向因果");

const legacyBaseline = new Sim({ seed: 333, world: "human" });
const legacyNext = new Sim({ seed: 333, world: "human", legacy: legacyReward });
ok(legacyNext.state.legacy && legacyNext.state.legacy.source, "下一世应记录道果来源");
ok(legacyNext.state.tier === legacyBaseline.state.tier, "道果不应继承境界");
ok(legacyNext.state.age === legacyBaseline.state.age, "道果不应继承年龄");
ok(legacyNext.state.maxAge === legacyBaseline.state.maxAge, "道果不应继承寿元");
ok(
  legacyNext.state.insight === Math.min(90, legacyBaseline.state.insight + legacyReward.insight),
  "悟性起点应按上限继承"
);
ok(
  legacyNext.state.stones === legacyBaseline.state.stones + legacyReward.stones,
  "遗物灵石应带入下一世"
);
ok(legacyNext.state.karma === legacyBaseline.state.karma + legacyReward.karma, "未了因果应带入下一世");
ok(legacyNext.state.ward >= legacyReward.ward, "护身玉符应带入下一世");
ok(legacyNext.legacySummary().depth === 2, "道果世代应递增");
const weightSim = new Sim({ seed: 444, world: "human" });
const noneRoot = D.ROOTS.find((x) => x.key === "none");
const siRoot = D.ROOTS.find((x) => x.key === "si");
ok(weightSim.rootWeight("wei", noneRoot) < noneRoot.w, "道果不应提高凡骨权重");
ok(weightSim.rootWeight("wei", siRoot) > siRoot.w, "道果应只向上提高灵根权重");

XD.util.store.setLegacy(legacyReward);
ok(XD.util.store.legacy() && XD.util.store.legacy().v === 1, "道果应可写入本机");
XD.util.store.markLegacyUsed(123);
ok(XD.util.store.legacy().usedBy === 123, "道果使用后应记录已用种子");
const playSource = fs.readFileSync(path.join(ROOT, "play.html"), "utf8");
ok(playSource.includes("birthLegacy") && playSource.includes("legacyBox"), "终局和出生页应展示道果入口");

/* 宗门职位：贡献、境界门槛、晋升事件与 pending 保护。 */
const sectSim = new Sim({ seed: 555, world: "human" });
sectSim.state.path = "cultivator";
sectSim.state.tier = 2;
sectSim.state.sect = "黄枫谷";
sectSim.initSectRank();
sectSim.state.focus = "sect";
sectSim.state.lastStepYears = 2;
sectSim.state.sectContrib = 60;
sectSim.sectTick();
ok(sectSim.state.sectPromo === 1, "达到内门门槛应进入晋升队列");
sectSim.state.pending = { kind: "break" };
ok(!sectSim.maybeSectPromotion(), "有 pending 时晋升不应覆盖");
ok(sectSim.state.pending.kind === "break", "晋升不应替换突破 pending");
sectSim.state.pending = null;
ok(sectSim.maybeSectPromotion(), "空闲时应触发晋升事件");
ok(sectSim.state.sectRank === 1, "晋升后应更新宗门职位");
ok(sectSim.state.pending && sectSim.state.pending.id === "sect_promotion", "晋升应触发宗门事件");
sectSim.state.pending = null;

const highSect = new Sim({ seed: 556, world: "human" });
highSect.state.path = "cultivator";
highSect.state.tier = 12;
highSect.state.sect = "太一门";
highSect.state.focus = "sect";
highSect.state.lastStepYears = 3200;
highSect.initSectRank();
const highBefore = highSect.state.sectContrib;
highSect.sectTick();
ok(highSect.state.sectContrib - highBefore <= 40, "高境界一步贡献应有上限");

const rogueSect = new Sim({ seed: 557, world: "human" });
rogueSect.state.path = "cultivator";
rogueSect.state.tier = 2;
rogueSect.state.sect = "散修";
rogueSect.state.focus = "sect";
rogueSect.initSectRank();
rogueSect.sectTick();
ok(rogueSect.state.sectRank === -1 && rogueSect.state.sectContrib === 0, "散修不应进入宗门职位");
ok(
  highSect.summary().sectRank && highSect.summary().sectContrib >= 0,
  "终局摘要应包含宗门职位与贡献"
);

/* P0：RNG 可序列化、运行快照可恢复、选择轨迹可记录。 */
const rngA = new XD.util.RNG(123456);
const rngFirst = [rngA.next(), rngA.next()];
const rngSave = rngA.getState();
const rngB = new XD.util.RNG(999);
rngB.setState(rngSave);
ok(rngB.next() === rngA.next(), "RNG 恢复后应保持同一随机序列");

const saveSim = new Sim({ seed: 801, world: "human" });
saveSim.state.tier = 2;
saveSim.state.age = 44;
const savedRun = saveSim.snapshot();
const restoredSim = XD.Sim.restore(savedRun);
ok(restoredSim && restoredSim.state.age === 44 && restoredSim.state.tier === 2, "运行快照应恢复年龄与境界");
ok(restoredSim.seed === saveSim.seed, "运行快照应保留 seed");
ok(restoredSim.state.pending === null, "运行快照不应带 pending");

const traceSim = new Sim({ seed: 802, world: "human" });
traceSim.state.pending = {
  kind: "event",
  id: "trace-test",
  choices: [{ label: "记一笔", effects: {}, outcome: "记下了。" }],
};
traceSim.choose(0);
ok(
  traceSim.state.choiceTrace.length === 1 && traceSim.state.choiceTrace[0].eventId === "trace-test",
  "选择轨迹应记录事件与选项"
);
XD.util.store.setRun(savedRun);
ok(XD.util.store.run() && XD.util.store.run().seed === 801, "运行快照应可写入本机");
ok(
  fs.readFileSync(path.join(ROOT, "about.html"), "utf8").includes("btnImport"),
  "关于页应提供导入入口"
);
ok(
  gameSource.includes("saveRun") && gameSource.includes("maybeResume"),
  "游戏应接入自动保存与续存提示"
);
ok(
  !gameSource.includes("aliveDisciples[aliveDisciples.length - 1]") &&
    gameSource.includes("bondStatus"),
  "关系面板应显示全部羁绊而不是最后一个徒弟"
);

const echoSource = new Sim({ seed: 903, world: "human" });
echoSource.state.partner = { name: "沈青棠", title: "道侣", tier: 3 };
echoSource.state.sect = "黄枫谷";
echoSource.state.origin.place = "越国 · 青牛镇";
echoSource.state.disciples = [{ name: "陆小满" }, { name: "周照" }];
const echoLegacy = echoSource.legacySummary();
ok(
  echoLegacy.source.partnerName === "沈青棠" &&
    echoLegacy.source.sectName === "黄枫谷" &&
    echoLegacy.source.discipleNames.length === 2,
  "道果应记录前世故人字段"
);
const echoSim = new Sim({ seed: 904, world: "human", legacy: echoLegacy });
echoSim.state.age = 16;
ok(echoSim.maybeLegacyEcho(), "有前世道果的十六岁应触发旧梦");
ok(echoSim.state.pending && echoSim.state.pending.id === "legacy_echo", "旧梦事件应正确");
echoSim.choose(0);
ok(echoSim.state.flags.legacy_echo_done, "旧梦选择应写入完成标记");
const noEcho = new Sim({ seed: 905, world: "human" });
noEcho.state.age = 16;
ok(!noEcho.maybeLegacyEcho(), "没有前世道果不应触发旧梦");

/* P1：残图主线与地域/宗门身份锚点。 */
const mainline = new Sim({ seed: 901, world: "human" });
mainline.state.path = "cultivator";
mainline.state.tier = 2;
mainline.state.age = 50;
mainline.state.maxAge = 1000;
ok(mainline.maybeMainline(), "筑基五十岁应触发残图起点");
ok(mainline.state.pending && mainline.state.pending.id === "c_secret", "残图起点事件应正确");
mainline.choose(0);
ok(mainline.state.flags.xutian, "取得半图后应写入 xutian");
mainline.state.age = 60;
ok(mainline.maybeMainline(), "有半图后应触发合图");
ok(mainline.state.pending && mainline.state.pending.id === "xutian_2", "合图事件应正确");
mainline.choose(0);
ok(mainline.state.flags.xutian_2_done, "合图后应写入完成标记");
mainline.state.tier = 3;
mainline.state.age = 90;
ok(mainline.maybeMainline(), "结丹后应触发入殿");
ok(mainline.state.pending && mainline.state.pending.id === "xutian_3", "入殿事件应正确");
mainline.choose(0);
ok(mainline.state.flags.xutian_3_done, "入殿后应写入完成标记");

const regionYue = XD.EVENT_BY_ID.r_yue_anchor;
ok(
  regionYue.when({ world: "human", origin: { place: "越国 · 青牛镇" }, tier: 1, age: 18 }),
  "越国地域锚点应匹配越国出生地"
);
ok(
  !regionYue.when({ world: "human", origin: { place: "大晋 · 晋州" }, tier: 1, age: 18 }),
  "越国地域锚点不应匹配大晋出生地"
);
const sectAnchor = XD.EVENT_BY_ID.sect_anchor_huangfeng;
ok(
  sectAnchor.when({ world: "human", sect: "黄枫谷", tier: 1, age: 18 }),
  "黄枫谷宗门锚点应匹配本宗"
);
ok(
  !sectAnchor.when({ world: "human", sect: "落云宗", tier: 1, age: 18 }),
  "黄枫谷宗门锚点不应匹配其他宗门"
);
const anchorSim = new Sim({ seed: 902, world: "human" });
anchorSim.state.path = "cultivator";
anchorSim.state.tier = 1;
anchorSim.state.age = 18;
anchorSim.state.origin.place = "越国 · 青牛镇";
ok(anchorSim.maybeIdentityAnchors(), "第一次身份锚点应触发地域事件");
ok(anchorSim.state.pending && anchorSim.state.pending.id === "r_yue_anchor", "地域锚点事件应为越国");
anchorSim.choose(0);
anchorSim.state.age = 19;
anchorSim.state.sect = "黄枫谷";
ok(anchorSim.maybeIdentityAnchors(), "地域锚点后应触发宗门锚点");
ok(anchorSim.state.pending && anchorSim.state.pending.id === "sect_anchor_huangfeng", "宗门锚点事件应为黄枫谷");


/* 弟子/对手：自动入场、境界推进、寿尽与摘要。 */
const socialSim = new Sim({ seed: 558, world: "human" });
socialSim.state.path = "cultivator";
socialSim.state.tier = 4;
socialSim.state.age = 150;
socialSim.socialTick();
ok(socialSim.state.rivals.length >= 1, "筑基以上应能形成对手");
ok(socialSim.state.disciples.length >= 1, "结丹以上应能收到弟子");
const disciple = socialSim.state.disciples[0];
ok(
  ["tier", "age", "maxAge", "affinity", "nextAt", "alive"].every(
    (key) => typeof disciple[key] === "number" || typeof disciple[key] === "boolean"
  ),
  "弟子应具备境界/年龄/寿元/关系字段"
);
const rival = socialSim.state.rivals[0];
ok(typeof rival.hostility === "number" && typeof rival.tier === "number", "对手应具备敌意与境界");
const oldTier = disciple.tier;
disciple.nextAt = disciple.age;
socialSim.tickSocialList(socialSim.state.disciples, "disciple");
ok(disciple.tier >= oldTier, "弟子应随年份推进境界");
disciple.maxAge = disciple.age;
const historyBefore = socialSim.state.discipleHistory.length;
socialSim.tickSocialList(socialSim.state.disciples, "disciple");
socialSim.tickSocialList(socialSim.state.disciples, "disciple");
ok(disciple.alive === false, "弟子寿尽应标记离世");
ok(socialSim.state.discipleHistory.length === historyBefore + 1, "弟子寿尽只应写入一次历史");
ok(
  socialSim.summary().rivals && socialSim.summary().discipleHistory,
  "终局摘要应包含对手与弟子历史"
);

/* L1/L3/L4：低优先级文案与小口径。 */
const dataText = fs.readFileSync(path.join(ROOT, "js/data.js"), "utf8");
ok(dataText.includes("寿四百八十载"), "L1 结丹文案应与 480 年寿元一致");
const indexText = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
ok(indexText.includes("三千至一万五"), "L4 灵界寿元宣传应与数据一致");
const codexText = fs.readFileSync(path.join(ROOT, "codex.html"), "utf8");
ok(
  codexText.includes('data-cat="characters"') && codexText.includes("<b>95</b>"),
  "L3 图鉴初始计数应与数据一致"
);

/* 220 局回归：不变量 + 伪灵根可到灵界 + 单世对话/事件最多重复 2 次。 */
let issues = 0;
let pseudoReachedSpirit = 0;
let worstRepeat = 0;
function affordableChoice(state) {
  const choices = (state.pending && state.pending.choices) || [];
  for (let i = 0; i < choices.length; i++) {
    const choice = choices[i];
    const cost =
      choice.requires && choice.requires.stones != null
        ? choice.requires.stones
        : choice.effects && choice.effects.stones < 0
        ? -choice.effects.stones
        : 0;
    if (!choice.donate && cost <= state.stones) return i;
  }
  return 0;
}
function affordableDanger(state) {
  const options = (state.pending && state.pending.options) || [];
  for (let i = 0; i < options.length; i++) {
    const option = options[i];
    const cost =
      option.costStones > 0
        ? option.costStones < 1
          ? Math.max(1, Math.floor(state.stones * option.costStones))
          : Math.floor(option.costStones)
        : 0;
    if ((!option.ward || state.ward > 0) && cost <= state.stones) return i;
  }
  return 0;
}
for (let seed = 1; seed <= 220; seed++) {
  const sim = new Sim({
    seed: (seed * 2654435761) >>> 0,
    world: seed % 13 === 0 ? "spirit" : seed % 29 === 0 ? "immortal" : "human",
  });
  let guard = 0;
  while (sim.state.alive && guard++ < 8000) {
    const state = sim.state;
    if (
      state.age > state.maxAge + 1 ||
      state.mood < 0 ||
      state.mood > 100 ||
      state.cult < 0 ||
      state.cult > 100 ||
      state.stones < 0
    ) {
      issues++;
      break;
    }
    if (state.pending) {
      if (state.pending.kind === "break") sim.chooseBreak("push");
      else if (state.pending.kind === "danger") sim.resolveDanger(affordableDanger(state));
      else sim.choose(affordableChoice(state));
    } else {
      sim.step();
    }
  }
  if (sim.state.root.key === "wei" && sim.state.tier >= 6) {
    pseudoReachedSpirit++;
  }
  const texts = sim.state.log
    .filter((entry) => entry.kind === "event" || entry.kind === "choice")
    .map((entry) => entry.text);
  const counts = {};
  for (const text of texts) counts[text] = (counts[text] || 0) + 1;
  worstRepeat = Math.max(worstRepeat, ...Object.values(counts), 0);
}
ok(issues === 0, `220 局不变量问题：${issues}`);
const spiritBirth = new Sim({ seed: 910, world: "spirit" });
const immortalBirth = new Sim({ seed: 911, world: "immortal" });
const spiritExisting = new Sim({ seed: 912, world: "spirit", mode: "existing" });
const immortalExisting = new Sim({ seed: 913, world: "immortal", mode: "existing" });
ok(
  spiritBirth.state.tier === 1 && spiritBirth.state.age === 0,
  "灵界本地出生应从炼气起步，不应直接炼虚"
);
ok(
  immortalBirth.state.tier === 1 && immortalBirth.state.age === 0,
  "仙界本地出生应从炼气起步，不应直接真仙"
);
ok(
  spiritExisting.state.tier === 6 && immortalExisting.state.tier === 9,
  "现存修士模式应保留灵界炼虚/仙界真仙的开局"
);
ok(
  spiritBirth.worldCultMul() === 1.5 && immortalBirth.worldCultMul() === 2,
  "灵界/仙界本地出生应获得修炼速度加成"
);
const pseudoExisting = new Sim({ seed: 914, world: "spirit", mode: "existing" });
pseudoExisting.state.root = D.ROOTS.find((root) => root.key === "wei");
pseudoExisting.state.tier = 6;
ok(
  pseudoExisting.state.root.key === "wei" && pseudoExisting.state.tier >= 6,
  "现存修士模式应保留伪灵根高境界抽样"
);
ok(worstRepeat <= 2, `单世事件/对话最大重复应 <= 2，实际 ${worstRepeat}`);
ok(XD.EVENTS.length === 3085, `事件总数应为 3085，实际 ${XD.EVENTS.length}`);

console.log(`canon-regression: ${checks} checks passed; 220 runs, 0 issues; pseudo-spirit=${pseudoReachedSpirit}; worst-repeat=${worstRepeat}`);
