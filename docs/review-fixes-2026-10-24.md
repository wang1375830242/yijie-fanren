# 代码评审修复记录

日期：2026-10-24
状态：已修复并验证

## 关系链

- 父母链在 `minAge` 未到时保持等待，不再提前 `ended`
- 道侣终局写入 `partnerStatus`
- 弟子出师写入 `discipleStatus: graduated`
- 仇敌和解/离开写入 `rivalStatus`
- 分开的道侣、出师的弟子、和解的仇敌不再计入在场/供养/对手统计

## 自动模式

- 自动事件选择会计算 `donate.min`
- 无可用选项时追加无消耗兜底，避免 blocked 死循环
- 濒死抉择不再自动倒计时代选

## 公共数据

- 碑林留言按最新 20 条、旧到新显示
- `__proto__` 等特殊碑 id 被拒绝，留言/灯数映射使用无原型对象
- 重复灯数按碑汇总
- 公共数据统一由自建 `server.py` 提供；请求失败时退回本机模式
- 导入人生记录清洗 id、年龄和文本字段，碑林渲染统一转义

## server.py

- 静态目录白名单：拦截 `.git`、`server.py`、`data/`、`docs/`、`tests/` 等
- URL 解码后再规范化，防止编码斜杠绕过
- `HEAD` 请求同样经过检查

## 测试

```text
syntax-check: 21 js files ok
a11y-check: 47 checks passed
browser-smoke: 8 pages ok
guestbook-check: ok
canon-regression: 441 checks passed
220 runs, 0 issues
natural-ascensions=9
changelog-check: 8 releases, 127 changes
```

## 仍然需要服务端的部分

公共碑林由自建 `server.py` 提供；GitHub Pages 通过 HTTPS 调用 `https://192.144.150.24`。
访问统计页运行在服务器上的独立 `/stats/` 服务，不进入项目构建。
