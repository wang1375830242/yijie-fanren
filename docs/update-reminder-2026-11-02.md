# 更新提醒 · 2026-11-02

## 目标

检测 GitHub Pages 是否发布了新版本，提示当前页面是否刷新；不自动刷新，不打断正在进行的这一世。

## 检测

- 根目录 `version.json` 保存 `version / build / updatedAt / notes`
- `js/common.js` 保存当前 `XD.VERSION / XD.BUILD`
- 页面加载后 **30 秒**首次检测
- 页面可见时每 **10 分钟**检测一次
- 从后台回到前台，超过 10 分钟补查
- 检测失败后 **15 分钟**重试
- 离线或 `file://` 本地打开时不检测

请求：

```text
./version.json?ts=<当前时间>&cache=no-store
```

发现新版本后等待 2 秒再请求一次，两次 `version/build` 一致才展示提醒，避免 GitHub Pages 部署过程中的缓存抖动。

## 提醒

底部非阻断横幅：

```text
发现新版本 v1.2.0
本次更新：……
                         [稍后]  [更新并刷新]
```

- 不覆盖游戏选择弹层
- 「稍后」只在当前标签页隐藏同一 build
- 新标签页仍可看到提醒
- 不做全屏弹窗

## 更新流程

```text
点击「更新并刷新」
→ 触发 XD.GameHooks.saveBeforeUpdate()
→ 保存当前 run
→ 保存成功
→ location.replace 带 _refresh build 的当前地址
```

保存失败或当前有未完成选择时，停止刷新并提示。

## 版本同步

发布时需要同时更新：

- `package.json`
- `js/common.js`
- `version.json`
- `js/changelog-data.js`

`tests/changelog-check.js` 会校验版本一致性；`tests/update-check.js` 校验版本比较与 JSON 解析。

## 边界

- 不使用 Service Worker
- 不调用 GitHub API
- 不自动刷新
- 不显示检测失败的 toast
- 只请求同源 `version.json`
