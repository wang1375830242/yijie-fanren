/* 结局体验回归：一生的纹理、同世四人、choices 记录。 */
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

for (const file of ["js/common.js", "js/data.js", "js/sim.js"]) {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, file), "utf8"), { filename: file });
}

let checks = 0;
function ok(value, message) {
  assert.ok(value, message);
  checks += 1;
}

const sim = new XD.Sim({ seed: 9301, world: "human" });
sim.state.pending = {
  kind: "event",
  id: "texture-test",
  title: "旧誓",
  choices: [{ label: "下山完婚", effects: { mood: 2 }, outcome: "你回去了。" }],
};
sim.choose(0);
const last = sim.state.choiceTrace[sim.state.choiceTrace.length - 1];
ok(last.eventTitle === "旧誓", "choiceTrace 应记录事件标题");
ok(last.choiceLabel === "下山完婚", "choiceTrace 应记录选项文案");
ok(last.outcome === "你回去了。", "choiceTrace 应记录选择结果");

sim.state.choiceTrace = [
  { kind: "event", eventId: "a", eventTitle: "一", choiceLabel: "甲", age: 20, tier: 1, outcome: "一之后" },
  { kind: "event", eventId: "b", eventTitle: "二", choiceLabel: "乙", age: 30, tier: 2, outcome: "二之后" },
  { kind: "event", eventId: "c", eventTitle: "三", choiceLabel: "丙", age: 40, tier: 3, outcome: "三之后" },
  { kind: "event", eventId: "d", eventTitle: "四", choiceLabel: "丁", age: 50, tier: 4, outcome: "四之后" },
  { kind: "event", eventId: "e", eventTitle: "五", choiceLabel: "戊", age: 60, tier: 5, outcome: "五之后" },
];
const texture = sim.lifeTexture();
ok(texture.length === 5, "纹理最多取五条");
ok(texture.map((item) => item.title).join("") === "一二三四五", "纹理应覆盖首、四分之一、中、四分之三、末，而不是按分数排序");
ok(texture.every((item) => item.age > 0 && item.choice), "纹理条目应包含年龄和选择");

const peers = sim.state.peers;
ok(Array.isArray(peers) && peers.length === 4, "开局应生成四名同辈");
const firstName = peers[0].name;
sim.state.age = 100;
sim.updatePeers();
const peerLives = sim.summary().peerLives;
ok(peerLives.length === 4, "结局摘要应带四条同辈路径");
ok(peerLives[0].name === firstName, "同辈顺序应按出生顺序保持，不按境界排序");
ok(peerLives.every((peer) => peer.name && typeof peer.age === "number"), "同辈摘要应含姓名与年龄");

const play = fs.readFileSync(path.join(ROOT, "play.html"), "utf8");
ok(play.includes("endTexture") && play.includes("endPeers"), "结局页应包含纹理和同世四人容器");

console.log(`experience-test: ${checks} checks passed`);
