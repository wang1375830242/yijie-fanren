# 自动化回归

日期：2026-10-23
状态：已接入

## 目的

把“每次改完手动跑一遍”变成 GitHub 自动检查，避免提交后忘记回归。

## 本地运行

```bash
npm test
```

`npm test` 会依次运行：

```bash
node tests/syntax-check.js
node tests/a11y-check.js
node tests/browser-smoke.js
node tests/guestbook-check.js
node tests/import-check.js
node tests/server-security-check.js
node tests/canon-regression.js
node tests/build-reachability.js
node tests/changelog-check.js
```

项目仍然没有前端 npm 依赖、没有构建步骤，`package.json` 只提供测试脚本入口。`browser-smoke.js` 没有 Chrome 时会自动跳过。

## GitHub Actions

工作流：

```text
.github/workflows/regression.yml
```

触发条件：

- push 到 `main`
- pull request

步骤：

1. checkout
2. setup-node 20
3. setup-python 3.12（供 `guestbook-check` / `server-security-check` 使用）
4. `npm test`

失败会在 Actions 和 README 徽章上显示红叉。

## 飞升率断言

220 局回归现在会同时统计：

- `pseudo-spirit`：伪灵根到达炼虚的数量
- `natural-ascensions`：从人界自然飞升、并在灵界突破到炼虚的数量

断言要求 `natural-ascensions > 0`，不再只依赖手工构造的 H2 突破状态。

当前基线：

```text
syntax-check: 21 js files ok
a11y-check: 47 checks passed
browser-smoke: 8 pages ok
guestbook-check: ok
canon-regression: 441 checks passed
220 runs, 0 issues
pseudo-spirit=2
natural-ascensions=9
worst-repeat=2
changelog-check: 8 releases, 127 changes, schema ok
```
