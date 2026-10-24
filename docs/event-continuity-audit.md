# 事件连续性评审

日期：2026-10-24  
状态：已修复

## 发现

### 1. 孤儿身世仍会出现父母问话

`渔村孤儿` 的出身文本明确写「父母死于风灾」，但早期 `age_5`、`root_test`、`age_15`、童年场景和 `AMBIENT` 仍使用「母亲」「父亲」「父母」等称呼。

修复：

- `Sim` 根据出身设置 `flags.no_parents`
- `familyText()` 统一替换为「收养你的老人」「抚养你的人」
- `events-expanded.fill()` 对生成事件做同样处理
- `trigger()` 对事件正文、选项 label、静态 outcome 统一处理
- `q_letters` 明确排除无父母出身

### 2. 人界事件串入灵界/仙界

早期 `q_market`、`q_valley`、`q_herb` 等事件的 `when` 只判断境界，没有判断世界；灵界本地出生也可能看到凡人坊市、宗门落霞谷。

修复：

- `pickEvent()` 对 `c_`、`q_`、`f_`、`h_`、`g_h_`、`age_`、`root_` 等前缀加人界门禁
- 灵界/仙界只能进入各自世界事件池

### 3. 事件临时选项污染

坊市弹窗曾把「拿不出灵石」追加到全局事件 choices。

修复：

- `trigger()` 克隆 choices
- 临时选项只存在于本回合

## 验证

```text
canon-regression: 332 checks passed
220 runs, 0 issues
pseudo-spirit=0
natural-ascensions=7
worst-repeat=2
```

新增回归：

- 孤儿 `age_5` 正文与选项不出现父母称呼
- 灵界出生不触发人界同门相欺
- 弹窗临时选项不改变全局事件数组
- 主线风险失败后可重试下一步

## 仍需注意

- 事件池仍有大量生成文本，建议后续增加「人物在场」「地点」「年龄」三类上下文键，而不仅是世界门禁。
- 读屏与 320px 已做浏览器可访问性树检查，但仍建议人工用 Narrator/NVDA 走一遍完整人生。
