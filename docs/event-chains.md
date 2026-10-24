# 关键关系链

日期：2026-10-24  
状态：MVP 已实现（12 个节点）

## 目标

让父母、道侣、弟子、仇敌不再只是随机事件里的一次性条件，而是跨事件保留关系、状态和因果。

普通随机池的 3103 条事件不做重写。

## 状态

```js
npcStates: {
  parent:  { key: "parent", present, alive, lastAt },
  partner: { key, present, alive, status },
  disciple:{ key, present, alive, status },
  rival:   { key, present, alive, status }
}

eventChains: {
  parent:  { npcKey, stage, nextAt, status, lastAt },
  partner: { ... },
  disciple:{ ... },
  rival:   { ... }
}
```

- `partner / disciples / rivals` 仍是 NPC 明细的唯一事实源
- `npcStates` 只存关键 NPC 的索引与派生在场状态
- 每类只绑定一个关键 NPC；其他弟子/仇敌仍正常显示
- NPC 有稳定 `id`，旧档按需回填

## 12 个 MVP 节点

| 链 | 节点 |
|---|---|
| 父母 | 家树 → 药渣 → 白烛 |
| 道侣 | 同心结 → 共劫 → 去留 |
| 弟子 | 第一课 → 试炼 → 出师 |
| 仇敌 | 旧怨 → 试锋 → 了断 |

## 触发

- 关系链在主线之后、身份锚点/随机事件之前推进
- 每步最多触发一个链事件
- 全局冷却 3 年
- 单链节点之间由 `nextGap` 控制
- 关系链事件注册到 `EVENT_BY_ID`，但从普通随机池排除
- 旧档首次载入不补播旧节点，下个节点在未来触发

## 验收

```text
canon-regression: 356 checks passed
220 runs, 0 issues
pseudo-spirit=0
natural-ascensions=4
worst-repeat=2

changelog-check: 18 releases, 53 changes, schema ok
```

## 后续

完整版计划 20 个节点：

- 父母 4
- 道侣 6
- 弟子 5
- 仇敌 5

不在第一版增加更多链，避免链事件挤占随机事件与主线。
