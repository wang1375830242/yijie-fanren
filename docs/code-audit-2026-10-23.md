# 2026-10-23 代码逻辑审计与修复

状态：已修复

## 修复项

### 1. 突破动画计时器重复执行

`playAscend()` 的关闭函数没有幂等保护；点击「继续」后，3.6 秒 fallback 仍会再次执行，可能把已经暂停的游戏重新推进。

修复：

- 增加 `closed` 标记
- 关闭时 `clearTimeout(fallback)`
- 只允许关闭一次

### 2. 坊市临时选项污染全局事件

`q_market` 在灵石不足时，`openPrompt()` 会向 `pending.choices` 追加「拿不出灵石」选项。原 `trigger()` 直接引用事件静态数组，导致该临时选项永久写进全局事件。

修复：

- `trigger()` 对 choices 做浅拷贝
- 弹窗只修改本回合副本

### 3. 主线风险失败后永久卡步

`s_main_2/3`、`i_main_4` 等主线步骤如果风险失败但没有设置 flag，`seen` 已记录，后续 `maybeMainline()` 不会重试。

修复：

- 主线推进不再依赖 `seen` 阻断
- 已获得最后一步资格的步骤仍然可重试
- 越级收束逻辑保留

### 4. 谱系连续世次多算一世

旧档没有 `yijie.lineage.v1` 时，默认 `streak = lives.length`；`endLife` 先写人生记录再写谱系，导致 streak 多加 1。

修复：

- `addLineage()` 改为 `streak = max(streak, no)`，不再盲目 +1

### 5. 导入覆盖谱系与已读碑

`about.js` 导入时直接 `setLineage` / `setSteles`，会覆盖本机进度。

修复：

- 谱系按 `lifeKey/no` 合并
- `total`、`streak`、`bestStreak` 取较大值
- 已读碑取并集

### 6. 重开后旧 run 被 pagehide 写回

`menuRestart` 和「再投一世」只清 `localStorage`，没有清内存中的 `sim/state`；关闭页面时 `pagehide` 会把旧 run 再写回。

修复：

- 两条路径都置空 `sim/state/endSummary`
- 重置 `saved` 与 `paused`

### 7. 高境界宗门月例只发一次

`sectTick()` 的 `rank.share` 没按 `lastStepYears` 计算，高境界一步跨数百年时收入偏低。

修复：

- `rank.share × lastStepYears`

### 8. 人界事件串入灵界

`q_bully` 只判断宗门名，灵界本地出生也可能触发人界同门相欺。

修复：

- 增加 `s.world === "human"` 条件

## 验证

```text
canon-regression: 331 checks passed
220 runs, 0 issues
pseudo-spirit=0
natural-ascensions=7
worst-repeat=2
changelog-check: 11 releases, 38 changes
```
