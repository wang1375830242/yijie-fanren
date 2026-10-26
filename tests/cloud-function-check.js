const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
let handler = null;

class Query {
  constructor(name) {
    this.name = name;
    this.filter = null;
  }
  equalTo(key, value) {
    this.filter = { key, value };
    return this;
  }
  async count() {
    if (this.name === "SiteVisitor") return 2;
    if (this.filter && this.filter.key === "day") return this.filter.value === "2026-10-26" ? 3 : 1;
    if (this.filter && this.filter.key === "page") return this.filter.value === "index.html" ? 4 : 1;
    return 9;
  }
}

const fakeAV = {
  Cloud: {
    define(name, fn) {
      if (name === "statsAdmin") handler = fn;
    },
    Error: class CloudError extends Error {
      constructor(message) {
        super(message);
        this.code = 500;
      }
    },
  },
  Query,
};

const context = {
  require(name) {
    if (name === "leanengine") return fakeAV;
    throw new Error(`unexpected module: ${name}`);
  },
  process,
  console,
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "cloud-engine", "cloud.js"), "utf8"), context, {
  filename: "cloud-engine/cloud.js",
});

(async () => {
  try {
    if (!handler) throw new Error("statsAdmin was not registered");
    let rejected = false;
    try {
      await handler({ params: { token: "wrong" } });
    } catch (err) {
      rejected = err.code === 401;
    }
    if (!rejected) throw new Error("wrong token should be rejected");

    process.env.STATS_ADMIN_TOKEN = "test-secret";
    const result = await handler({
      params: {
        token: "test-secret",
        today: "2026-10-26",
        days: ["2026-10-26", "2026-10-25"],
        pages: ["index.html"],
      },
    });
    if (result.total !== 9 || result.unique !== 2) throw new Error("aggregate counts failed");
    if (result.days.length !== 2 || result.pages[0].count !== 4) throw new Error("grouped counts failed");
    console.log("cloud-function-check: ok");
  } catch (err) {
    console.error(`cloud-function-check: ${err.message}`);
    process.exit(1);
  }
})();
