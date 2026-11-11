/* 安装项目本地 Git 钩子：npm run hooks:install */
"use strict";
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
execFileSync("git", ["config", "core.hooksPath", ".githooks"], {
  cwd: root,
  stdio: "inherit",
});
console.log("hooks: core.hooksPath=.githooks");
