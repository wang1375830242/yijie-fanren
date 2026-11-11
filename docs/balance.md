# 数值口径

只记录玩家能感知、后续容易改坏的数值。新增数值先在这里登记，再改代码。

| 参数 | 代码位置 | 当前值 | 边界 / 说明 |
| --- | --- | --- | --- |
| 境界数 | `js/data.js` `REALMS` | 0..13，共 14 级 | 凡人到道祖；9→10 与 13 由剧情完成 |
| 突破基础率 | `js/sim.js` `breakForecast` | `0.78 - tier*0.04 - ...` | 最终夹在 0.12–0.94 |
| 失败代价 | `js/sim.js` `chooseBreak` | 修为降到 40、伤势 +1、心境 -14 | 高境界有额外死亡概率 |
| 道心破碎触发 | `js/dao-heart-events.js` | 风险成功率 70%–85% | 失败约 15%–30% 破碎 |
| 道心破碎修为 | `js/sim.js` `breakDaoHeart` | 最多保留 55 | 不直接掉大境界 |
| 道心破碎心境 | `breakDaoHeart` | -20，最低 15 | 避免直接跌入心魔死亡线 |
| 道心破碎锁 | `canBreak` / `breakForecast` | 锁住破境，预测 chance 0 | 破碎期间不能冲关 |
| 道心裂痕 | `breakForecast` | 每层 4%，最高 2 层 | 与旧 `heart_scar` 取较高值，不叠加 |
| 补心第一段 | `maybeDaoHeartRepair` | 破碎后 3 年 | 触发 `dao_repair_1` |
| 补心第二段 | `maybeDaoHeartRepair` | 第一段后 5 年 | 触发 `dao_repair_2` |
| 纹理条数 | `js/sim.js` `lifeTexture` | 最多 5 条 | 取首、四分之一、中、四分之三、末，不按分数选 |
| 同世人数 | `js/sim.js` `buildPeers` | 4 人 | 按出生顺序展示，不按境界排序 |
| 时代修炼修正 | `js/replay-data.js` `PHASES` | 承平 1.0 / 兵灾 0.96 / 末法 0.9 / 灵潮 1.1 | 只做小幅修正，不做战力天梯 |
| 誓约破誓代价 | `js/sim.js` `breakOath` | 心境 -18、道心裂痕 1、伤势 +1 | 不直接掉境界或死亡 |
| 身世线索 | `js/sim.js` `maybeLifePremise` | 18 岁错认、55 岁真相 | 一世一次 |
| 存活曲线 | `js/art.js` `survivalInfo` | 按寿元/境界/时代计算 | 纯前端、同一输入同一结果 |

## 约束

- 概率变化必须同步更新本表。
- 不要把“约”“左右”写进玩家可感知的数值。
- 境界、寿元、突破概率的改动，必须跑 `node tests/canon-regression.js`。
- 道心相关改动，必须跑 `node tests/dao-heart-test.js`。
- 任何新的“排名/评分”字段，先对照 `design-charter.md` 的不做清单。
