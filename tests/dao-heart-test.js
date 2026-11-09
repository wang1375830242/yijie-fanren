/* 道心试炼回归：破碎、锁境、补心、旧存档兼容。 */
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
  "js/sim.js",
]) {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, file), "utf8"), { filename: file });
}

let checks = 0;
function ok(value, message) {
  assert.ok(value, message);
  checks += 1;
}

ok(XD.DAO_HEART_EVENTS.filter((x) => /^dao_heart_/.test(x.id)).length === 5, "应有 5 个道心试炼事件");
ok(XD.DAO_HEART_EVENTS.filter((x) => /^dao_repair_/.test(x.id)).length === 2, "应有 2 个补心事件");

const sim = new XD.Sim({ seed: 8801, world: "human" });
sim.state.path = "cultivator";
sim.state.tier = 2;
sim.state.age = 40;
sim.state.cult = 90;
ok(sim.maybeDaoHeart(), "筑基后应触发第一个道心试炼");
ok(sim.state.pending && sim.state.pending.id === "dao_heart_1", "首个道心事件 id 应正确");

const risky = sim.state.pending.choices.findIndex((choice) => choice.risk && choice.risk.fail && choice.risk.fail.daoBreak);
ok(risky >= 0, "道心试炼应至少有一个可能破碎的选项");
sim.rng.chance = () => false;
sim.choose(risky);
ok(sim.state.daoBroken === true, "风险失败应使道心破碎");
ok(sim.state.tier === 2, "道心破碎不应直接跌大境界");
ok(sim.state.cult <= 55, "道心破碎应使修为大退");
ok(sim.canBreak() === false, "道心破碎后应锁定破境");
ok(sim.breakForecast().locked === true && sim.breakForecast().chance === 0, "破碎状态应返回锁定预测");

const brokenAt = sim.state.daoBrokenAt;
sim.state.age = brokenAt + 3;
ok(sim.maybeDaoHeartRepair(), "破碎三季后应触发补心第一段");
ok(sim.state.pending && sim.state.pending.id === "dao_repair_1", "补心第一段 id 应正确");
sim.choose(0);
ok(sim.state.daoRepairStep === 1, "补心第一段应推进修复进度");

sim.state.age = sim.state.daoRepairStepAt + 5;
ok(sim.maybeDaoHeartRepair(), "补心第一段后再过五季应触发第二段");
ok(sim.state.pending && sim.state.pending.id === "dao_repair_2", "补心第二段 id 应正确");
sim.choose(0);
ok(sim.state.daoBroken === false, "补心完成后应解除道心破碎");
ok(sim.state.daoScar >= 1, "补心完成后应保留道心裂痕");
ok(sim.canBreak() === true, "补心完成后应重新允许破境");

const snap = sim.snapshot();
delete snap.state.daoBroken;
delete snap.state.daoBrokenAt;
delete snap.state.daoRepairStep;
delete snap.state.daoRepairStepAt;
delete snap.state.daoScar;
const restored = XD.Sim.restore(snap);
ok(restored && restored.state.daoBroken === false && restored.state.daoScar === 0, "旧存档缺少道心字段时应安全补默认值");

console.log(`dao-heart-test: ${checks} checks passed`);
