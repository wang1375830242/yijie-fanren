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
  getItem() {
    return null;
  },
  setItem() {},
  removeItem() {},
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
const femaleSim = new Sim({ seed: 4, world: "human" });
femaleSim.state.gender = "女";
const maleSects = rootEvent.choices(maleSim.state).map((choice) => choice.effects && choice.effects.sect);
const femaleSects = rootEvent.choices(femaleSim.state).map((choice) => choice.effects && choice.effects.sect);
ok(!maleSects.includes("掩月宗"), "M4 男角色不应能入掩月宗");
ok(femaleSects.includes("掩月宗"), "M4 女角色应能入掩月宗");

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
deathPartner.state.partner.maxAge = 80;
deathPartner.partnerTick();
ok(deathPartner.state.partner === null, "道侣寿尽应离开");
ok(deathPartner.state.partnerHistory.length === 1, "道侣寿尽应留下历史");

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
ok(pseudoReachedSpirit > 0, "至少应有一名伪灵根到达灵界");
ok(worstRepeat <= 2, `单世事件/对话最大重复应 <= 2，实际 ${worstRepeat}`);
ok(XD.EVENTS.length === 3064, `事件总数应为 3064，实际 ${XD.EVENTS.length}`);

console.log(`canon-regression: ${checks} checks passed; 220 runs, 0 issues; pseudo-spirit=${pseudoReachedSpirit}; worst-repeat=${worstRepeat}`);
