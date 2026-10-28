/* Balance audit harness. Not loaded by the game page. */
const fs = require("fs");
const vm = require("vm");

const root = require("path").resolve(__dirname, "..");
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
for (const file of ["js/common.js", "js/data.js", "js/events.js", "js/events-expanded.js", "js/chain-events.js", "js/canon-events.js", "js/sim.js"]) {
  vm.runInThisContext(fs.readFileSync(`${root}/${file}`, "utf8"), { filename: file });
}

function affordable(choice, stones) {
  const required = choice.requires && choice.requires.stones != null
    ? choice.requires.stones
    : choice.effects && choice.effects.stones < 0
      ? -choice.effects.stones
      : 0;
  if (required > stones) return false;
  return !choice.donate || stones >= (Number(choice.donate.min) || 10);
}

function chooseIndex(state) {
  const p = state.pending;
  if (p && p.id === "root_test") {
    // Audit-only policy: follow the cultivation branch, never the mortal
    // refusal branch. The page auto policy remains unchanged.
    const begin = p.choices.findIndex(
      (c) => c.effects && (c.effects.begin || c.effects.awaken)
    );
    if (begin >= 0) return begin;
  }
  if (p && (p.id === "d_node" || p.id === "m_ascend")) {
    const ascend = p.choices.findIndex((c) => c.effects && c.effects.ascend);
    if (ascend >= 0) return ascend;
  }
  const choices = (p && p.choices) || [];
  const viable = choices.map((c, i) => ({ c, i })).filter((x) => affordable(x.c, state.stones));
  if (!viable.length) return 0;
  const safe = viable.filter((x) => !x.c.risk);
  return (safe[0] || viable[0]).i;
}

function dangerIndex(state) {
  const options = (state.pending && state.pending.options) || [];
  const viable = options.map((c, i) => ({ c, i })).filter((x) => {
    if (x.c.ward && state.ward < 1) return false;
    const cost = x.c.costStones > 0
      ? x.c.costStones < 1
        ? Math.max(1, Math.floor(state.stones * x.c.costStones))
        : Math.floor(x.c.costStones)
      : 0;
    return cost <= state.stones;
  });
  return viable.length ? viable.sort((a, b) => (b.c.p || 0) - (a.c.p || 0))[0].i : 0;
}

const count = Number(process.env.N || 100);
let spirit = 0;
let immortal = 0;
let daluo = 0;
let human5 = 0;
const reached = {};
const deaths = {};
for (let i = 0; i < count; i += 1) {
  const sim = new XD.Sim({ seed: 10000 + i * 73, world: "human", mode: "birth" });
  let guard = 0;
  while (sim.state.alive && guard++ < 8000) {
    const state = sim.state;
    if (state.pending) {
      if (state.pending.kind === "break") sim.chooseBreak("push");
      else if (state.pending.kind === "danger") sim.resolveDanger(dangerIndex(state));
      else sim.choose(chooseIndex(state));
    } else {
      sim.step();
    }
  }
  const s = sim.state;
  reached[`${s.world}/${s.tier}`] = (reached[`${s.world}/${s.tier}`] || 0) + 1;
  if (s.world !== "human") spirit += 1;
  if (s.world === "immortal") immortal += 1;
  if (s.tier >= 12) daluo += 1;
  if (s.world === "human" && s.tier === 5) human5 += 1;
  deaths[s.cause || "alive"] = (deaths[s.cause || "alive"] || 0) + 1;
}
const pct = (n) => `${((n / count) * 100).toFixed(1)}%`;
console.log(JSON.stringify({
  runs: count,
  humanToSpirit: pct(spirit),
  humanToImmortal: pct(immortal),
  humanToDaluo: pct(daluo),
  humanTier5: pct(human5),
  reached,
  deaths,
}, null, 2));
