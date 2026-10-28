const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const store = {};
global.window = global;
global.localStorage = {
  getItem(key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
  setItem(key, value) { store[key] = String(value); },
  removeItem(key) { delete store[key]; },
};
function element() {
  return {
    textContent: "",
    innerHTML: "",
    value: "",
    checked: false,
    files: [],
    style: {},
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener() {},
    setAttribute() {},
    click() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
}
global.document = {
  addEventListener() {},
  documentElement: { dataset: {} },
  getElementById() { return element(); },
  querySelector() { return element(); },
  querySelectorAll() { return []; },
  createElement() { return element(); },
};
global.XD = global.XD || {};
vm.runInThisContext(fs.readFileSync(path.join(ROOT, "js/common.js"), "utf8"), { filename: "js/common.js" });
vm.runInThisContext(fs.readFileSync(path.join(ROOT, "js/about.js"), "utf8"), { filename: "js/about.js" });

const U = XD.util;
const T = XD.aboutTools;
if (!T) throw new Error("about helpers unavailable");

const evil = T.cleanLife({
  id: "evil",
  seed: 1,
  age: "12",
  deeds: [{ age: '<img src=x onerror="window.__xss=1">', text: "x" }],
});
if (!evil || evil.age !== 12) throw new Error("age should be numeric");
if (!Array.isArray(evil.deeds) || !Number.isInteger(evil.deeds[0].age)) throw new Error("deeds age should be numeric");
if (String(evil.deeds[0].age).includes("<")) throw new Error("deeds age retained markup");

const sixty = Array.from({ length: 60 }, (_, i) => ({
  id: `old-${i}`,
  seed: i,
  age: i,
  name: `old ${i}`,
  realm: "凡人",
  epitaph: "",
  deeds: [],
}));
U.store.setLives(sixty);
const result = T.mergeLives([
  { id: "new-a", seed: 101, age: 1, name: "a", realm: "凡人", epitaph: "", deeds: [] },
  { id: "new-b", seed: 102, age: 2, name: "b", realm: "凡人", epitaph: "", deeds: [] },
]);
const lives = U.store.lives();
if (result.added !== 2 || result.dropped !== 0) throw new Error(`merge count ${JSON.stringify(result)}`);
if (lives.length !== 60 || !lives.some((x) => x.id === "new-a") || !lives.some((x) => x.id === "new-b")) {
  throw new Error("imported lives were not retained");
}

U.store.setCandles({ "old-1": 2, __proto__: { polluted: true } });
T.mergeCandles({ "old-1": 7, "new-a": 3 });
const candles = U.store.candles();
if (candles["old-1"] !== 7 || candles["new-a"] !== 3) throw new Error("candle merge failed");
if (candles.polluted) throw new Error("prototype pollution");

if (T.cleanRun({ v: 1, seed: 1, state: {} }) !== null) throw new Error("malformed run should be rejected");
if (T.cleanRun({ v: 1, seed: 1, state: { origin: {}, root: {}, age: 1, tier: 1, log: [], history: [] } }) === null) {
  throw new Error("valid run should pass");
}

const hallSource = fs.readFileSync(path.join(ROOT, "js/hall.js"), "utf8");
if (!hallSource.includes("U.esc(d.age)")) throw new Error("hall deed age is not escaped");

console.log("import-check: ok");
