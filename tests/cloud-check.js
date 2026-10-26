const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
global.window = global;
global.document = {
  addEventListener() {},
  querySelector() {
    return null;
  },
  querySelectorAll() {
    return [];
  },
};
global.localStorage = {
  _d: {},
  getItem(key) {
    return this._d[key] ?? null;
  },
  setItem(key, value) {
    this._d[key] = String(value);
  },
  removeItem(key) {
    delete this._d[key];
  },
};
global.sessionStorage = global.localStorage;

const messages = Array.from({ length: 21 }, (_, i) => ({
  objectId: `m${i + 1}`,
  stele: "legend-hanli",
  text: `m${i + 1}`,
  createdAt: `2026-10-24T00:00:${String(i).padStart(2, "0")}Z`,
})).reverse();
const candles = [
  { objectId: "c1", stele: "legend-hanli", count: 2 },
  { objectId: "c2", stele: "legend-hanli", count: 3 },
  { objectId: "c3", stele: "legend-nangong", count: 4 },
];
let lastRequest = null;
global.fetch = async (url, opts) => {
  lastRequest = { url, opts };
  let data = { results: [] };
  if (url.includes("/HallCandle")) data = { results: candles };
  if (url.includes("/HallMessage")) data = { results: messages };
  if (url.includes("/functions/statsAdmin")) {
    data = { result: { total: 7, unique: 3, today: 2, days: [{ day: "2026-10-24", count: 2 }], pages: [{ page: "index.html", count: 7 }] } };
  }
  return { ok: true, status: 200, text: async () => JSON.stringify(data) };
};

vm.runInThisContext(fs.readFileSync(path.join(root, "js", "lean-config.js"), "utf8"));
XD_LEAN.writeMode = "direct";
vm.runInThisContext(fs.readFileSync(path.join(root, "js", "cloud.js"), "utf8"));

(async () => {
  try {
    const hall = await XD.cloud.hall.load();
    if (hall.candles["legend-hanli"] !== 5) throw new Error("candle duplicate sum failed");
    if (hall.messages["legend-hanli"].join(",") !== Array.from({ length: 20 }, (_, i) => `m${i + 2}`).join(",")) {
      throw new Error("message order failed");
    }
    let blocked = false;
    try {
      await XD.cloud.hall.message("__proto__", "x");
    } catch (err) {
      blocked = true;
    }
    if (!blocked) throw new Error("invalid stele should be rejected");
    const admin = await XD.cloud.adminStats("test-token");
    if (admin.total !== 7 || admin.days[0].count !== 2) throw new Error("statsAdmin response failed");
    if (!lastRequest || !lastRequest.opts.headers["X-LC-Id"]) throw new Error("headers missing");
    console.log("cloud-check: ok");
  } catch (err) {
    console.error(`cloud-check: ${err.message}`);
    process.exit(1);
  }
})();
