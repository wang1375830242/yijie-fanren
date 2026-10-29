# 自动模式

日期：2026-10-24
状态：已实现

## 规则

自动模式开启后：

- 普通事件不再弹出选择框
- 继续使用原自动策略选择选项
- 事件仍写入人生录
- 结算后自动进入下一步
- 突破/飞升动画保留
- 濒死抉择保留，不会静默替玩家决定生死

## 与手动模式的区别

| 模式 | 普通事件 | 突破/飞升 | 濒死 |
|---|---|---|---|
| 手动 | 弹窗选择 | 动画 | 弹窗 |
| 自动 | 直接自动选择 | 动画保留 | 弹窗保留 |

## 实现

- `openPrompt()` 在普通事件且 `auto` 时进入 `autoChooseEvent()`；濒死事件始终打开选择层
- `autoChooseEvent()` 复用原自动选项评分策略
- 不显示 `#choiceOverlay`
- `startAutoBreak()` 路径不变
- 关闭自动模式会清除待执行的自动计时器

## 验收

```text
canon-regression: 431 checks passed
220 runs, 0 issues
changelog-check: 8 releases, 115 changes
```

源码回归覆盖：

- 自动事件跳过 `choiceOverlay`
- 破境仍走独立 `startAutoBreak()`
- 自动模式保留事件日志
