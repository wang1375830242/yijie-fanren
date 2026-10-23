# P3：场景池与语义去重

日期：2026-10-23  
状态：第一版已实现

## 场景规模

`js/events-expanded.js` 的场景池现在为：

| 池 | 场景数 |
| --- | ---: |
| child | 60 |
| home | 20 |
| sect | 20 |
| wild | 20 |
| market | 20 |
| war | 20 |
| spirit | 20 |
| immortal | 20 |
| partner | 20 |

童年场景保留原有 24 条，并在末尾新增 36 条；新增不会改变旧场景的索引。

## 世界池

灵界主题不再借用人界的 `market`、`sect`、`war`、`wild`：

```text
s_city      -> spirit
s_clan      -> spirit
s_war       -> spirit
s_market    -> spirit
s_beast     -> spirit
s_law       -> spirit
s_disciple  -> spirit
i_market    -> immortal
```

仙界的坊市也改为 `immortal`，不再出现凡人丹药与山门文案。

## 去重

事件触发时记录：

```text
pending.sceneKey
```

完成选择后记录两组：

```text
state.sceneTotal[sceneKey] += 1
state.sceneUses[sceneKey + "|" + resultType] += 1
```

`resultType` 根据选择结果确定：

- `risk`
- `flag`
- `bond`
- `sect`
- `loss`
- `normal`

抽取事件时：

- 最近场景仍做软避让
- `sceneTotal[sceneKey] >= 3` 的场景不再进入候选
- 同一场景整世最多 3 次

谱系与场景状态都会进入运行快照，刷新续玩不会丢失。

## 验收

- 童年 60 条
- 其他八个池至少 20 条
- 灵界主题不再指向人界池
- `sceneTotal` 与 `sceneUses` 都会记录
- 220 局回归无异常
- 事件总数仍为 3090

当前基线：

```text
274 checks passed
220 runs, 0 issues
natural-ascensions=8
worst-repeat=2
```
