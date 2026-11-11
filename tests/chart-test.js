/* 存活曲线回归：本地、确定性、随寿元/境界/时代变化。 */
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
};
for (const file of ["js/common.js", "js/art.js"]) {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, file), "utf8"), { filename: file });
}

let checks = 0;
function ok(value, message) {
  assert.ok(value, message);
  checks += 1;
}

const A = XD.art;
const birth = A.survivalInfo(0, 78, { tier: 0, world: "human", phase: { key: "peace" } });
const adult = A.survivalInfo(40, 78, { tier: 0, world: "human", phase: { key: "peace" } });
const end = A.survivalInfo(78, 78, { tier: 0, world: "human", phase: { key: "peace" } });
ok(birth.pct > 0.98, "出生时存活率应接近 100%");
ok(adult.pct > 0.7 && adult.pct < birth.pct, "中年存活率应低于出生且仍可观");
ok(end.pct < 0.1, "寿元尽头存活率应接近零");
ok(birth.logAxis === false && birth.xAt(78) === 1, "普通寿元应使用线性轴并覆盖完整寿元");

const high = A.survivalInfo(1000, 15000, { tier: 8, world: "immortal", phase: { key: "surge" } });
ok(high.logAxis === true, "极长寿元应使用压缩轴");
ok(high.xAt(0) === 0 && Math.abs(high.xAt(15000) - 1) < 1e-9, "压缩轴应覆盖 0 到寿元上限");
ok(high.pct > 0.8, "高境界早年的存活率应较高");

const war = A.survivalInfo(50, 78, { tier: 0, world: "human", phase: { key: "war" } });
ok(war.pct < adult.pct, "兵灾时代的存活率应低于承平");

const svg = A.survivalChart(40, 78, { tier: 0, world: "human", phase: { key: "peace" } });
ok(typeof svg === "string" && svg.startsWith("<svg") && svg.includes("<circle"), "应生成带当前年龄标记的 SVG");
ok(!String(A.survivalChart).includes("fetch("), "存活图不应依赖网络请求");

const repeated = A.survivalInfo(40, 78, { tier: 0, world: "human", phase: { key: "peace" } });
ok(repeated.pct === adult.pct, "同一输入应得到同一曲线");

console.log(`chart-test: ${checks} checks passed`);
