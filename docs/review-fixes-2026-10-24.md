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
- LeanCloud 请求增加超时；失败时读回 `server.py`，写操作也会尝试本机 API 再退回本机
- 导入人生记录清洗 id、年龄和文本字段，碑林渲染统一转义

## server.py

- 静态目录白名单：拦截 `.git`、`server.py`、`data/`、`docs/`、`tests/` 等
- URL 解码后再规范化，防止编码斜杠绕过
- `HEAD` 请求同样经过检查

## 测试

```text
syntax-check: 22 js files ok
cloud-check: ok
cloud-function-check: ok
a11y-check: 38 checks passed
browser-smoke: 6 pages ok
canon-regression: 381 checks passed
220 runs, 0 issues
natural-ascensions=8
changelog-check: 33 releases, 71 changes
```

## 仍然需要服务端的部分

静态版默认 `writeMode: "server"`，LeanCloud 客户端不再直写公共碑林或访问记录。  
统计页已改为管理口令 + `statsAdmin` 云函数；云函数代码在 `cloud-engine/cloud.js`，部署后还需在 LeanCloud 关闭两个统计类的客户端读权限。部署步骤见 `cloud-engine/README.md`。LeanCloud 停服前的目标库迁移尚未执行。
