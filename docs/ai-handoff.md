# AI 交接文档

最后更新：2026-11-11

## 一句话

《一介凡人》：零构建、纯静态的中文修仙人生模拟器；随机降生，走完一世，留下纹理而不是分数。

## 当前版本

- `1.3.3`，build `20261111e`
- 最近提交：`1.3.3`（本次提交）
- 主要入口：`index.html` → `play.html` → 结局页

## 关键文件

| 文件 | 作用 |
| --- | --- |
| `js/sim.js` | 人生状态机：境界、突破、事件、道心、同辈、结局摘要 |
| `js/game.js` | 游戏界面绑定、结局页渲染、命格卡 |
| `js/data.js` | 境界、灵根、物品、事件基础数据 |
| `js/events*.js` | 普通事件与扩展事件 |
| `js/dao-heart-events.js` | 5 个道心试炼 + 2 段补心 |
| `js/replay-data.js` | 身世底牌、时代相位、自缚誓约数据 |
| `js/replay-events.js` | 错认、身世真相、时代事件、誓约试炼 |
| `js/changelog-data.js` | 玩家可感知更新的唯一来源 |
| `play.html` / `css/game.css` | 游戏界面与结局页样式 |

## 已完成（1.3.1）

- 道心破碎：保留境界、修为大跌、锁破境、两段补心、裂痕保留。
- 结局页“这一生的纹理”：从 `choiceTrace` 取首、四分之一、中、四分之三、末最多 5 条选择。
- 结局页“同世四人”：展示同辈姓名、境界、年龄、已故/在世和最近路径。
- 设计宣言、数值口径、AI 交接文档：见 `docs/README.md`。
- 身世底牌/错认、自缚誓约、时代相位：新增 `js/replay-data.js`、`js/replay-events.js`。
- 核心推演、结局、图表、本地存档均可离线运行；后端只用于可选公共碑林/账号同步。
- 旧存档兼容：缺失道心与重开字段自动补默认值。

## 已知坑

- `sim.js` 的 `summary()` 是结局、碑林、账号历史的共同出口；新增字段要考虑旧记录。
- `choiceTrace` 旧条目没有 `eventTitle/choiceLabel/outcome`，纹理必须容错隐藏。
- 同辈只记路径节点，不做排名；不要按 tier 排序。
- `breakForecast` 的 `chance` 下限是 0.12；道心破碎用 `locked` 单独表达，不要用 -100% 伪造。
- 修改境界/寿元/突破率后必须跑 `canon-regression` 和 `build-reachability`。
- 不要提交 `data/accounts.db`、`data/visits.db`、截图、`forum-post.md` 等本地临时文件。

## 测试

```text
npm test
```

单项：

```text
node tests/syntax-check.js
node tests/a11y-check.js
node tests/browser-smoke.js
node tests/canon-regression.js
node tests/dao-heart-test.js
node tests/experience-test.js
node tests/replay-test.js
node tests/changelog-check.js
```

## 下一步（候选，不自动做）

1. 给纹理条目增加“关系/身份/去留”分类，避免三条同质。
2. 让同辈在人生中通过来信、再遇出现，而不只在结局列表里。
3. 把 `docs/design-charter.md` 的不做清单写成更具体的测试断言。
