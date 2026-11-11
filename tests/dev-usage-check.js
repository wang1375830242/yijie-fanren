/* 开发工作台统计与离线兜底检查。 */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const ROOT = path.resolve(__dirname, "..");
let checks = 0;
function ok(value, message) {
  assert.ok(value, message);
  checks += 1;
}

const json = JSON.parse(fs.readFileSync(path.join(ROOT, "assets", "dev-usage.json"), "utf8"));
ok(Number.isFinite(json.rounds) && json.rounds > 0, "开发轮次应为正数");
ok(Number.isFinite(json.steps) && json.steps > 0, "执行步数应为正数");
ok(typeof json.tokens === "string" && /M|B/.test(json.tokens), "Token 使用应为可读字符串");
ok(/^\d{4}-\d{2}-\d{2}$/.test(json.updated), "更新日期格式应正确");

const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, "assets", "dev-usage.js"), "utf8"), sandbox);
const embedded = sandbox.window.XD_DEV_USAGE;
ok(embedded && embedded.rounds === json.rounds && embedded.steps === json.steps, "离线内嵌统计应与 JSON 一致");
ok(embedded && embedded.tokens === json.tokens, "离线内嵌 Token 应与 JSON 一致");

const supportHtml = fs.readFileSync(path.join(ROOT, "support.html"), "utf8");
const assetIndex = supportHtml.indexOf("assets/dev-usage.js");
const supportIndex = supportHtml.indexOf("js/support.js");
ok(assetIndex > -1 && supportIndex > assetIndex, "支持页应先加载内嵌统计，再加载 support.js");

const supportJs = fs.readFileSync(path.join(ROOT, "js", "support.js"), "utf8");
ok(supportJs.includes("window.XD_DEV_USAGE"), "support.js 应读取离线内嵌统计");
ok(supportJs.includes('location.protocol !== "file:"'), "file:// 下不应请求 JSON");

const hook = fs.readFileSync(path.join(ROOT, ".githooks", "pre-commit"), "utf8");
ok(hook.includes("update-dev-usage.js") && hook.includes("git add assets/dev-usage.json"), "提交钩子应刷新并暂存统计");

console.log(`dev-usage-check: ${checks} checks passed`);
