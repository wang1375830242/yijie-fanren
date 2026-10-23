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

/* 220 局回归：不变量 + 伪灵根可到灵界。 */
let issues = 0;
let pseudoReachedSpirit = 0;
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
      else if (state.pending.kind === "danger") sim.resolveDanger(0);
      else sim.choose(0);
    } else {
      sim.step();
    }
  }
  if (sim.state.root.key === "wei" && sim.state.tier >= 6) {
    pseudoReachedSpirit++;
  }
}
ok(issues === 0, `220 局不变量问题：${issues}`);
ok(pseudoReachedSpirit > 0, "至少应有一名伪灵根到达灵界");

console.log(`canon-regression: ${checks} checks passed; 220 runs, 0 issues; pseudo-spirit=${pseudoReachedSpirit}`);
