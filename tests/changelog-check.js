"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const ROOT = path.resolve(__dirname, "..");
global.window = global;
vm.runInThisContext(fs.readFileSync(path.join(ROOT, "js/changelog-data.js"), "utf8"), {
  filename: "js/changelog-data.js",
});
const data = global.XD && global.XD.CHANGELOG;
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const allowed = new Set(["feature", "improve", "fix", "engineering"]);

assert(data && data.schema === 1, "更新数据 schema 应为 1");
assert(Array.isArray(data.releases) && data.releases.length, "更新数据至少需要一个版本");
assert(data.updatedAt && /^\d{4}-\d{2}-\d{2}$/.test(data.updatedAt), "updatedAt 应为 ISO 日期");

const versions = new Set();
let total = 0;
data.releases.forEach((release) => {
  assert(/^\d+\.\d+\.\d+$/.test(release.version), `版本号不合法：${release.version}`);
  assert(!versions.has(release.version), `版本号重复：${release.version}`);
  versions.add(release.version);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(release.date), `日期不合法：${release.date}`);
  assert(release.title && release.summary, `版本缺少标题或摘要：${release.version}`);
  assert(Array.isArray(release.changes) && release.changes.length, `版本没有条目：${release.version}`);
  release.changes.forEach((change) => {
    assert(allowed.has(change.type), `未知分类：${change.type}`);
    assert(typeof change.text === "string" && change.text.length > 8, "更新条目太短");
    assert(change.text.length <= 80, "更新条目应保持简短");
    assert(!/[<>]/.test(change.text), "更新条目不能包含 HTML");
    if (change.tags) assert(Array.isArray(change.tags), "tags 应为数组");
    total += 1;
  });
});

const latest = data.releases[0];
assert(latest.version === pkg.version, `package.json 版本 ${pkg.version} 应等于最新版本 ${latest.version}`);
assert(latest.date <= data.updatedAt, "updatedAt 不应早于最新版本日期");

const pageFiles = ["index.html", "play.html", "hall.html", "codex.html", "about.html"];
pageFiles.forEach((file) => {
  const source = fs.readFileSync(path.join(ROOT, file), "utf8");
  assert(source.includes("changelog.html"), `${file} 缺少更新页入口`);
});
const changelogHtml = fs.readFileSync(path.join(ROOT, "changelog.html"), "utf8");
assert(!/fetch\s*\(/.test(changelogHtml), "更新页不应使用 fetch");
assert(fs.existsSync(path.join(ROOT, "js/changelog.js")), "缺少更新页渲染脚本");
assert(fs.existsSync(path.join(ROOT, "css/changelog.css")), "缺少更新页样式");

console.log(`changelog-check: ${data.releases.length} releases, ${total} changes, schema ok`);
