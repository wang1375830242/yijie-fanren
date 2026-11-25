# 1.3.6 · 本机记录与离线收口

日期：2026-11-25

## 本机记录

- `account.html` 改为“本机记录”，不再显示登录、注册、找回与云同步
- 历史、成就、命格挑战、谱系读取当前浏览器 localStorage
- 导出文件改为 `yijie-local-records.json`

## 离线收口

- 移除所有账号 token、登录注册表单、云存档和访问统计请求
- 碑林固定本机模式：灯与留言只留在浏览器
- 留言板改为关闭说明，不再接收提交
- 不删除旧的人生、成就、挑战、谱系与本地保存数据

## 验证

```text
node tests/a11y-check.js
node tests/browser-smoke.js
node tests/canon-regression.js
```

覆盖本机记录页、碑林本机模式、关闭说明与离线核心玩法。
