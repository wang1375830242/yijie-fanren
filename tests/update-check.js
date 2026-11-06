"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

global.window = global;
global.document = {
  body: null,
  baseURI: "https://example.com/yijie-fanren/",
  visibilityState: "hidden",
  addEventListener() {},
};
global.location = { protocol: "https:", href: "https://example.com/yijie-fanren/index.html" };
global.sessionStorage = { _: {}, getItem(k) { return this._[k] || null; }, setItem(k, v) { this._[k] = String(v); } };
global.XD = { VERSION: "1.3.0", BUILD: "20261106a" };
global.fetch = async () => ({
  ok: true,
  headers: { get: () => "application/json" },
  json: async () => ({ version: "1.3.1", build: "20261106b", notes: "test" }),
});

vm.runInThisContext(fs.readFileSync(path.resolve(__dirname, "../js/update-check.js"), "utf8"), {
  filename: "js/update-check.js",
});

const checker = global.XD.UpdateCheck;
assert(checker && checker.currentVersion === "1.3.0", "update-check should expose current version");
assert(checker.isNewer({ version: "1.3.1" }), "higher semver should be newer");
assert(!checker.isNewer({ version: "1.2.9" }), "lower semver should not be newer");
assert(checker.isNewer({ version: "1.3.0", build: "20261106b" }), "higher build should be newer");
assert(!checker.isNewer({ version: "1.3.0", build: "20261106a" }), "same build should not prompt");

(async () => {
  const remote = await checker.fetchVersion();
  assert(remote.version === "1.3.1" && remote.build === "20261106b", "fetchVersion should parse JSON");
  console.log("update-check: ok");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
