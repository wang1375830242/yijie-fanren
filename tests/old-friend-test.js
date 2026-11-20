/* 故人回身回归：私有记忆、动态重逢、跨界/寿尽与旧存档兼容。 */
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
  "js/common.js", "js/data.js", "js/replay-data.js",
  "js/events.js", "js/events-expanded.js", "js/chain-events.js", "js/canon-events.js",
  "js/path-events.js", "js/lineage-events.js", "js/cause-events.js", "js/tribulation-events.js",
  "js/path-branch-events.js", "js/late-expansion.js", "js/dao-heart-events.js",
  "js/replay-events.js", "js/old-friend-events.js", "js/sim.js",
]) {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, file), "utf8"), { filename: file });
}

let checks = 0;
function ok(value, message) {
  assert.ok(value, message);
  checks += 1;
}
function ready(sim) {
  sim.state.path = "cultivator";
  sim.state.tier = 3;
  sim.state.age = 80;
  sim.state.cult = 20;
  sim.state.pending = null;
  sim.state.stepsSinceEvent = 5;
  sim.state.lastChainAge = -99;
  sim.state.daoBroken = false;
}
function returnEvent(kind, choice, extra) {
  const sim = new XD.Sim({ seed: 6119, world: "human" });
  ready(sim);
  if (kind === "rival") {
    sim.state.rivals = [{ id: "r1", name: "沈照", alive: true, tier: 3, world: "human" }];
  }
  sim.rememberOldFriend(Object.assign({ kind, choice, npcRole: kind === "rival" ? "rival" : "" }, extra || {}));
  const person = sim.state.oldFriends[0];
  sim.state.age = person.dueAt;
  if (kind === "herbalist") {
    sim.state.age = person.dueAt + 80;
    sim.oldFriendTick();
  }
  ok(sim.maybeOldFriends(), `${kind} 应能在平静年份触发回归`);
  ok(sim.state.pending && sim.state.pending.id === `oldfriend_${kind}_return`, `${kind} 回归 id 应正确`);
  return { sim, person };
}

const shelter = returnEvent("refugee", "shelter");
ok(shelter.person.originEvent === "", "直接写入测试不应伪造初遇事件");
ok(shelter.person.name && !/undefined/.test(shelter.sim.state.pending.text), "散修回归应有真实人名且无空文本");
const dynamicBefore = shelter.sim.state.pending.text;
const dynamicChoices = typeof XD.EVENT_BY_ID.oldfriend_refugee_return.choices === "function"
  ? XD.EVENT_BY_ID.oldfriend_refugee_return.choices(shelter.sim.state)
  : [];
ok(dynamicChoices[0].outcome(shelter.sim.state) !== dynamicChoices[2].outcome(shelter.sim.state), "散修动态结果不能复用错误静态文本");
shelter.sim.choose(0);
ok(shelter.person.status === "done" && shelter.person.resolution === "acknowledged", "回归选择应结算旧人状态");
ok(!shelter.sim.maybeOldFriends(), "一世最多触发一次旧人回归");
  ok(dynamicBefore.includes("当年"), "重逢正文必须能指出当年选择");

const paid = returnEvent("refugee", "paid");
ok(paid.sim.state.pending.oldFriend.originChoice === "paid", "资助离开应使用当前旧人的原始选择");
paid.sim.choose(1);

const letterSim = new XD.Sim({ seed: 6119, world: "human" });
ready(letterSim);
letterSim.rememberOldFriend({ kind: "refugee", choice: "closed" });
const letterPerson = letterSim.state.oldFriends[0];
letterPerson.world = "spirit";
letterPerson.alive = true;
letterPerson.status = "away";
letterSim.state.age = Math.max(letterPerson.afterAt, letterPerson.dueAt);
letterPerson.dueAt = letterSim.state.age;
letterSim.state.oldFriendReturns = 0;
letterPerson.returnedAt = null;
letterPerson.returnForm = "";
letterSim.state.seen = {};
ok(letterSim.maybeOldFriends(), "隔界旧人应可通过来信回归");
ok(letterSim.state.pending.text.includes("信"), "隔界不应写本人瞬移到场");
letterSim.choose(1);

const rival = returnEvent("rival", "resolved");
ok(rival.person.name === "沈照", "宿敌回归应沿用现有 NPC 身份");
ok(rival.sim.state.pending.text.includes("旧账"), "宿敌重逢应承认旧怨");
rival.sim.choose(1);
ok(rival.person.resolution === "new_name", "宿敌选择应留下重新相认方式");

const herbalist = returnEvent("herbalist", "gift");
ok(herbalist.person.alive === false && herbalist.person.kind === "herbalist", "采药人按凡人寿命结算，不强行延寿");
ok(herbalist.sim.state.pending.text.includes("后人") && herbalist.sim.state.pending.text.includes("过世"), "凡人旧人应由后人带来消息");
herbalist.sim.choose(2);

const missed = new XD.Sim({ seed: 8120, world: "human" });
ready(missed);
missed.rememberOldFriend({ kind: "herbalist", choice: "gift" });
missed.state.age = missed.state.oldFriends[0].dueAt + 300;
ok(!missed.maybeOldFriends() && missed.state.oldFriends[0].status === "gone", "错过应自然终止，不无限等待");

const normal = new XD.Sim({ seed: 8121, world: "human" });
ready(normal);
normal.state.stones = 100;
normal.trigger("f_debt");
const beforeNormalRng = normal.oldFriendRng.getState();
normal.choose(1);
ok(normal.state.oldFriends.length === 1 && normal.state.oldFriends[0].originEvent === "f_debt", "实际事件选择应立即写入旧人");
ok(normal.oldFriendRng.getState().calls > beforeNormalRng.calls, "写入旧人应使用独立随机流");

const dangerous = new XD.Sim({ seed: 8122, world: "human" });
ready(dangerous);
dangerous.state.stones = 100;
dangerous.trigger("f_debt");
dangerous.choose(0);
ok(dangerous.state.oldFriends.length === 0, "可能转入生死险境的选择不应先伪造旧人关系");

const old = normal.snapshot();
delete old.state.oldFriends;
delete old.state.oldFriendReturns;
delete old.oldFriendRng;
const restored = XD.Sim.restore(old);
ok(restored && Array.isArray(restored.state.oldFriends) && restored.state.oldFriends.length === 0, "旧存档缺字段应静默关闭旧人线");
ok(restored.oldFriendRng && Number.isFinite(restored.oldFriendRng.state), "旧随机流缺失应可恢复");

const pendingSave = new XD.Sim({ seed: 8123, world: "human" });
ready(pendingSave);
pendingSave.rememberOldFriend({ kind: "refugee", choice: "paid" });
pendingSave.state.age = pendingSave.state.oldFriends[0].dueAt;
pendingSave.maybeOldFriends();
const pendingRestored = XD.Sim.restore(JSON.parse(JSON.stringify(pendingSave.snapshot())));
ok(pendingRestored.state.pending === null && pendingRestored.state.oldFriendReturns === 0, "恢复未完成弹窗时应取消回归，不混用动态选项");

const html = fs.readFileSync(path.join(ROOT, "play.html"), "utf8");
ok(html.includes("old-friend-events.js"), "页面应加载故人回身事件");
console.log(`old-friend-test: ${checks} checks passed`);
