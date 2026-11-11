/* 重开层回归：身世底牌/错认、自缚誓约、时代相位。 */
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
  querySelector() { return null; },
  querySelectorAll() { return []; },
  getElementById() { return null; },
  createElement() {
    return {
      style: {},
      classList: { add() {}, remove() {}, toggle() {} },
      setAttribute() {},
      appendChild() {},
      addEventListener() {},
      querySelector() { return null; },
    };
  },
};
global.localStorage = {
  _data: {},
  getItem(key) { return Object.prototype.hasOwnProperty.call(this._data, key) ? this._data[key] : null; },
  setItem(key, value) { this._data[key] = String(value); },
  removeItem(key) { delete this._data[key]; },
};

for (const file of [
  "js/common.js",
  "js/data.js",
  "js/replay-data.js",
  "js/events.js",
  "js/events-expanded.js",
  "js/chain-events.js",
  "js/canon-events.js",
  "js/path-events.js",
  "js/lineage-events.js",
  "js/cause-events.js",
  "js/tribulation-events.js",
  "js/path-branch-events.js",
  "js/late-expansion.js",
  "js/dao-heart-events.js",
  "js/replay-events.js",
  "js/sim.js",
]) {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, file), "utf8"), { filename: file });
}

let checks = 0;
function ok(value, message) {
  assert.ok(value, message);
  checks += 1;
}

const sim = new XD.Sim({ seed: 9401, world: "human", oath: "no_kill" });
ok(sim.state.phase && sim.state.phase.name, "每世应有时代相位");
ok(sim.state.birthSecret && sim.state.birthSecret.name, "每世应有隐藏身世底牌");
ok(sim.state.oath && sim.state.oath.key === "no_kill", "自缚誓约应写入状态");

sim.state.age = 18;
ok(sim.maybeLifePremise(), "十八岁应触发错认");
ok(sim.state.pending && sim.state.pending.id === "identity_mistake", "错认事件 id 应正确");
sim.choose(0);
ok(sim.state.secretStage === 1, "错认应推进身世线索");

sim.state.age = 25;
ok(sim.maybeLifePremise(), "二十五岁应触发时代事件");
ok(sim.state.pending && sim.state.pending.id === "phase_turn", "时代事件 id 应正确");
sim.choose(0);

sim.state.age = 35;
ok(sim.maybeLifePremise(), "三十五岁应触发誓约事件");
ok(sim.state.pending && sim.state.pending.id === "oath_trial", "誓约事件 id 应正确");
const breakIndex = sim.state.pending.choices.findIndex((choice) => choice.effects && choice.effects.oathBreak);
ok(breakIndex >= 0, "誓约事件应有破誓选项");
sim.choose(breakIndex);
ok(sim.state.oathBroken === true, "破誓应写入 oathBroken");
ok(sim.state.daoScar >= 1, "破誓应留下道心裂痕");

sim.state.age = 55;
ok(sim.maybeLifePremise(), "五十五岁应触发身世真相");
ok(sim.state.pending && sim.state.pending.id === "identity_truth", "身世真相 id 应正确");
sim.choose(0);
ok(sim.state.secretRevealed === true, "身世真相应标记已揭示");
ok(sim.summary().birthSecret && sim.summary().phase && sim.summary().oath, "结局摘要应带时代/身世/誓约");

const snap = sim.snapshot();
delete snap.state.phase;
delete snap.state.birthSecret;
delete snap.state.secretStage;
delete snap.state.secretRevealed;
delete snap.state.oath;
delete snap.state.oathBroken;
const restored = XD.Sim.restore(snap);
ok(restored && restored.state.phase && restored.state.phase.key === "peace", "旧存档应补默认时代");
ok(restored && restored.state.oath && restored.state.oath.key === "none", "旧存档应补默认誓约");
ok(restored && restored.state.birthSecret === null, "旧存档应补默认身世");

const playHtml = fs.readFileSync(path.join(ROOT, "play.html"), "utf8");
ok(playHtml.includes("modesOverlay") && playHtml.includes("challengeChoices") && playHtml.includes("oathChoices"), "降生页应使用玩法合集");
ok(!playHtml.includes("challengeSelect") && !playHtml.includes("oathSelect"), "降生页不应直接展示旧下拉框");

console.log(`replay-test: ${checks} checks passed`);
