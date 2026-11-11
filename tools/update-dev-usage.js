/* ==========================================================================
   开发工作台统计更新
   只读取本机 DSH 项目会话缓存的统计字段，不读取/输出会话正文。
   产出：
   - assets/dev-usage.json（网页 fetch / 服务端预览）
   - assets/dev-usage.js（window.XD_DEV_USAGE，file:// 离线兜底）
   ========================================================================== */
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const JSON_FILE = path.join(ROOT, "assets", "dev-usage.json");
const JS_FILE = path.join(ROOT, "assets", "dev-usage.js");
const CACHE_DIR =
  process.env.DSH_SESSION_CACHE ||
  path.join(os.homedir(), ".dsh", "storages", "session_projcache", "sessions");

function norm(value) {
  return path.resolve(String(value || "")).replace(/[\\/]+/g, "/").toLowerCase();
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    return null;
  }
}

function statOf(record) {
  const rows = (record && record.record && record.record.rows) || {};
  const stats = (rows.sessionStats && rows.sessionStats.val) || {};
  const usage = (rows.tokenUsage && rows.tokenUsage.val && rows.tokenUsage.val.totals) || {};
  const meta = (rows.sessionListMetadata && rows.sessionListMetadata.val) || {};
  const turns = Number(stats.turns) || 0;
  const steps = Number(stats.steps) || 0;
  const tokens =
    (Number(usage.uncachedInputTokens) || 0) +
    (Number(usage.outputTokens) || 0) +
    (Number(usage.cacheReadTokens) || 0) +
    (Number(usage.cacheWriteTokens) || 0);
  return { turns, steps, tokens, lastPromptAt: Number(meta.lastPromptAt) || 0 };
}

function findLatestMainSession() {
  if (!fs.existsSync(CACHE_DIR)) return null;
  const candidates = [];
  for (const file of fs.readdirSync(CACHE_DIR)) {
    if (!file.startsWith("session-") || !file.endsWith(".json")) continue;
    const full = path.join(CACHE_DIR, file);
    const parsed = readJson(full);
    if (!parsed) continue;
    const identity = (parsed.record && parsed.record.identity) || {};
    const workingDirectory =
      (parsed.record &&
        parsed.record.rows &&
        parsed.record.rows.workingDirectory &&
        parsed.record.rows.workingDirectory.val) ||
      "";
    const cwd = identity.cwd || workingDirectory;
    if (norm(cwd) !== norm(ROOT)) continue;
    const stat = statOf(parsed);
    if (!stat.turns) continue;
    candidates.push({ file, ...stat });
  }
  // 主会话的轮次远高于子会话；先按轮次，再按最近提示时间择优。
  candidates.sort((a, b) => b.turns - a.turns || b.lastPromptAt - a.lastPromptAt);
  return candidates[0] || null;
}

function formatTokens(value) {
  return `${Math.round(value / 1e6).toLocaleString("en-US")}M`;
}

function today() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function main() {
  const latest = findLatestMainSession();
  if (!latest) {
    console.log("dev-usage: 未找到本项目的 DSH 主会话缓存，保持原数据。");
    return;
  }
  const old = readJson(JSON_FILE) || {};
  // 防止误取子会话或缓存回退导致页面数字倒退。
  if (
    Number(old.rounds) > latest.turns ||
    Number(old.steps) > latest.steps
  ) {
    console.log("dev-usage: 候选统计小于现有数据，保持原数据。");
    return;
  }
  const payload = {
    rounds: latest.turns,
    steps: latest.steps,
    tokens: formatTokens(latest.tokens),
    updated: today(),
    note:
      old.note ||
      "数据来自本地开发工作台，不是网站访客统计。页面每 15 秒自动刷新一次，文件更新后自动生效。",
    autoRefreshSeconds: 15,
  };
  fs.writeFileSync(JSON_FILE, JSON.stringify(payload, null, 2) + "\n", "utf8");
  fs.writeFileSync(
    JS_FILE,
    `/* 由 tools/update-dev-usage.js 生成，供离线打开支持页使用。 */\nwindow.XD_DEV_USAGE = ${JSON.stringify(payload, null, 2)};\n`,
    "utf8"
  );
  console.log(
    `dev-usage: ${payload.rounds} 轮 / ${payload.steps} 步 / ${payload.tokens} / ${payload.updated}`
  );
}

try {
  main();
} catch (err) {
  // 统计失败不能阻塞提交；保留旧文件并给出提示。
  console.log("dev-usage: 更新失败，保持原数据。" + (err && err.message ? " " + err.message : ""));
}
