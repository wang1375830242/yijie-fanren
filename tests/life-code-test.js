"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

global.window = global;
vm.runInThisContext(fs.readFileSync(path.resolve(__dirname, "../js/life-code.js"), "utf8"), {
  filename: "js/life-code.js",
});

const life = {
  name: "沈青棠",
  realm: "元婴",
  world: "human",
  age: 640,
  cause: "寿元耗尽",
  seed: 123456789,
  daohao: "青棠真人",
  sectPath: "dan",
  buildName: "丹鼎",
  sect: "黄枫谷",
  origin: { place: "越国" },
  root: { name: "木灵根" },
  gender: "女",
};
const code = XD.LifeCode.encode(life);
assert(code && /^[A-Za-z0-9_-]+$/.test(code), "短码应为 URL-safe 字符串");
const decoded = XD.LifeCode.decode(code);
assert(decoded && decoded.name === life.name && decoded.seed === life.seed, "短码应可还原核心人生信息");
assert(decoded.realm === "元婴" && decoded.origin.place === "越国", "短码应保留境界与出身");
assert(XD.LifeCode.decode("not-a-code") === null, "坏短码应安全返回 null");
console.log("life-code: ok");
