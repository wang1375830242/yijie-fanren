# 可靠性修复：灵界化神断链与 risk 失败结算

日期：2026-10-23  
状态：已修复

## 一、飞升灵界后卡在化神

### 问题

`ascendTo("spirit")` 后：

```text
world = spirit
tier = 5
```

但 `canBreak()` 排除了 `tier 5`，`d_node` 又已经 `seen`，于是角色会永远停在化神，无法继续炼虚、合体、大乘。

原 H2 测试手动创建了一个 `pending: break`，因此没有覆盖真实断链。

### 修复

`canBreak()` 对 `tier 5` 增加条件：

```js
if (t === 5) return this.state.world === "spirit";
```

- 人界化神不能绕过 `d_node` 直接突破
- 飞升灵界后的化神可以正常冲炼虚
- 8→9、12→13 仍按剧情事件处理

## 二、risk 失败仍结算成功收益

### 问题

原 `choose()` 在 risk 失败时：

```text
先取 choice.effects
再叠加 risk.fail
```

导致失败选项仍可能获得修为、灵石、悟性甚至 flag。

### 修复

失败时只结算 `risk.fail`：

```text
effects = risk.fail
```

- 成功：结算 `choice.effects`
- 失败：结算 `risk.fail`
- 硬死亡仍不结算普通收益
- 濒死分支使用失败代价

## 三、验证

- 飞升灵界后 `canBreak()` 为真
- 化神可以突破到炼虚
- risk 失败不获得成功修为/灵石/flag
- risk 成功正常获得收益
- 220 局回归无异常，低灵根飞升样本恢复

```text
canon-regression: 259 checks passed
220 runs, 0 issues
pseudo-spirit=1
worst-repeat=2
```
