# 开发工作台统计

赞助页的“开发工作台”数据由本地脚本自动维护：

```text
assets/dev-usage.json  在线读取
assets/dev-usage.js    file:// 离线内嵌值
```

## 数据口径

- 开发轮次：最近一个 DSH 项目主会话的 `sessionStats.turns`
- 执行步数：同一会话的 `sessionStats.steps`
- Token 使用：同一会话 `tokenUsage.totals` 四项之和，显示为 M（含缓存读取）
- 更新日期：生成当天

只读取统计字段，不读取会话正文，不发送到服务器。

## 自动更新

首次安装：

```text
npm run hooks:install
```

之后每次 `git commit` 前，`.githooks/pre-commit` 会执行：

```text
node tools/update-dev-usage.js
git add assets/dev-usage.json assets/dev-usage.js
```

缺少 DSH 缓存或 Node 时，钩子会放行提交，保留旧数据，不会阻塞。

手动刷新：

```text
npm run stats
```

## 离线

`support.html` 先加载 `assets/dev-usage.js`，再由 `js/support.js` 渲染。`file://` 下跳过 `fetch`，直接显示内嵌值；有服务器时仍会每 15 秒刷新 JSON。
