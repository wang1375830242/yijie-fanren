/* Read-only regression: real 300-life build reachability. Not loaded by the game. */
const fs = require("fs");
const vm = require("vm");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const N = 300;
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
  _d: {},
  getItem(k) { return this._d[k] ?? null; },
  setItem(k, v) { this._d[k] = String(v); },
  removeItem(k) { delete this._d[k]; },
};

for (const file of [
  "js/common.js",
  "js/data.js",
  "js/events.js",
  "js/events-expanded.js",
  "js/chain-events.js",
  "js/canon-events.js",
  "js/sim.js",
]) {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, file), "utf8"), { filename: file });
}

const X = global.XD;
const worlds = ["human", "human", "human", "human", "spirit", "immortal"];
function affordable(choice, s) {
  const need = choice.requires && choice.requires.stones != null
    ? choice.requires.stones
    : choice.effects && choice.effects.stones < 0
      ? -choice.effects.stones
      : 0;
  if (need > s.stones) return false;
  if (choice.requires && choice.requires.trait) {
    for (const [key, value] of Object.entries(choice.requires.trait)) {
      if ((s.traits[key] || 0) < value) return false;
    }
  }
  if (choice.requires && choice.requires.karmaMin != null && s.karma < choice.requires.karmaMin) return false;
  if (choice.requires && choice.requires.karmaMax != null && s.karma > choice.requires.karmaMax) return false;
  if (choice.requires && choice.requires.sectPath && s.sectPath !== choice.requires.sectPath) return false;
  return true;
}
function choose(sim) {
  const p = sim.state.pending;
  if (!p || !Array.isArray(p.choices)) return false;
  const offset = (sim.state.log.length + sim.state.seed) % p.choices.length;
  for (let n = 0; n < p.choices.length; n++) {
    const choice = p.choices[(offset + n) % p.choices.length];
    const index = (offset + n) % p.choices.length;
    if (!affordable(choice, sim.state)) continue;
    const result = sim.choose(index);
    if (result && result.status !== "blocked") return true;
  }
  return false;
}
function danger(sim) {
  const p = sim.state.pending;
  if (!p || p.kind !== "danger" || !Array.isArray(p.options)) return false;
  const options = p.options.map((choice, index) => ({ choice, index })).filter(({ choice }) => {
    if (choice.ward && sim.state.ward < 1) return false;
    const cost = choice.costStones > 0
      ? (choice.costStones < 1 ? Math.max(1, Math.floor(sim.state.stones * choice.costStones)) : Math.floor(choice.costStones))
      : 0;
    return cost <= sim.state.stones;
  });
  if (!options.length) return false;
  options.sort((a, b) => (b.choice.p || 0) - (a.choice.p || 0));
  return !!sim.resolveDanger(options[0].index);
}

const levels = {};
const paths = {};
let maxBuild = 0;
for (let i = 0; i < N; i++) {
  const sim = new X.Sim({ seed: (100000 + i * 7919) >>> 0, world: worlds[i % worlds.length], mode: "birth" });
  const s = sim.state;
  let guard = 0;
  while (s.alive && guard++ < 5000) {
    if (s.pending) {
      if (s.pending.kind === "break") sim.chooseBreak("push");
      else if (s.pending.kind === "danger") { if (!danger(sim)) s.pending = null; }
      else if (!choose(sim)) s.pending = null;
    } else {
      sim.step();
    }
  }
  const level = sim.buildLevel();
  levels[level] = (levels[level] || 0) + 1;
  paths[s.sectPath || "none"] = (paths[s.sectPath || "none"] || 0) + 1;
  maxBuild = Math.max(maxBuild, level);
}
if (maxBuild < 2) {
  throw new Error(`300 局中最高 Build 仅 ${maxBuild}，Build 不可达`);
}
for (const key of ["dan", "jian", "zhen", "you"]) {
  if (!paths[key]) throw new Error(`300 局中没有出现 ${key} 道统`);
}
console.log(JSON.stringify({ runs: N, maxBuild, levels, paths }));
