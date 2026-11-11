/* 散修道统入口与高境界瓶颈回归。 */
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
      style: {}, classList: { add() {}, remove() {}, toggle() {} },
      setAttribute() {}, appendChild() {}, addEventListener() {}, querySelector() { return null; },
    };
  },
};
global.localStorage = {
  _data: {}, getItem(k) { return this._data[k] ?? null; },
  setItem(k, v) { this._data[k] = String(v); }, removeItem(k) { delete this._data[k]; },
};

for (const file of [
  "js/common.js", "js/data.js", "js/events.js", "js/events-expanded.js",
  "js/chain-events.js", "js/canon-events.js", "js/path-events.js",
  "js/lineage-events.js", "js/cause-events.js", "js/tribulation-events.js",
  "js/path-branch-events.js", "js/late-expansion.js", "js/sim.js",
]) {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, file), "utf8"), { filename: file });
}

let checks = 0;
function ok(value, message) {
  assert.ok(value, message);
  checks += 1;
}

function wanderer(seed) {
  const sim = new XD.Sim({ seed, world: "human" });
  sim.state.path = "cultivator";
  sim.state.tier = 2;
  sim.state.sect = "散修";
  sim.state.sectRank = -1;
  sim.state.sectPath = null;
  sim.state.artifact = null;
  sim.state.seen = {};
  sim.state.pending = null;
  return sim;
}

const rogue = wanderer(1201);
ok(rogue.maybeRogueIdentity(), "散修筑基后应触发野路问道");
ok(rogue.state.pending && rogue.state.pending.id === "rogue_path_choice", "野路问道事件 id 应正确");
ok(rogue.state.pending.choices.some((choice) => choice.effects && choice.effects.sectPath === "you"), "野路问道应给游侠道统选项");
rogue.choose(0);
ok(rogue.state.sectPath === "you", "选择野路应写入游侠道统");
ok(rogue.state.sect === "散修", "散修道统不应把身份改成宗门");

const sect = wanderer(1202);
sect.state.sect = "黄枫谷";
sect.state.sectRank = 0;
ok(!sect.maybeRogueIdentity(), "正式宗门成员不应触发散修野路");

const mortal = wanderer(1203);
mortal.state.path = "mortal";
mortal.state.sect = "凡俗";
ok(!mortal.maybeRogueIdentity(), "凡人不应触发散修野路");

const spirit = wanderer(1204);
spirit.state.world = "spirit";
ok(!spirit.maybeRogueIdentity(), "灵界不应触发人界散修事件");

const artifact = wanderer(1205);
artifact.state.sectPath = "you";
ok(artifact.maybePathArtifact(), "散修游侠应能触器胚事件");
ok(artifact.state.pending && artifact.state.pending.id === "artifact_choice", "器胚事件 id 应正确");
artifact.choose(0);
ok(artifact.state.artifact && artifact.state.artifact.key, "散修应能获得本命器胚");

const low = new XD.Sim({ seed: 1301, world: "human" });
const high = new XD.Sim({ seed: 1301, world: "human" });
low.state.tier = 3;
high.state.tier = 4;
ok(high.breakForecast().chance < low.breakForecast().chance - 0.2, "元婴冲化神应增加窄瓶颈");

console.log(`rogue-path-test: ${checks} checks passed`);
