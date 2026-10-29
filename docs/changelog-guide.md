# 更新纪事维护说明

日期：2026-10-23

## 唯一内容源

只维护：

```text
js/changelog-data.js
```

`changelog.html` 只负责渲染，不在 HTML 里重复写版本条目。

## 什么时候记

- 一个发布批次写一条版本记录
- 玩家能感知的变化才写
- 一条只写一个结果，不按 commit 或文件列流水账
- 同一天多个版本按版本号倒序

## 分类

```text
feature      新增
improve      改进
fix          修复
engineering  工程
```

分类是玩家看到的分类，不和 commit type 一一对应。

## 新增版本模板

```js
{
  version: "1.1.2",
  date: "2026-10-24",
  title: "一页短标题",
  summary: "一句话说明这一版最重要的变化。",
  compatibility: "旧存档兼容",
  changes: [
    {
      type: "fix",
      text: "修正某个玩家能感知到的问题。",
      tags: ["关键词"],
      commit: "abcdefg"
    }
  ]
}
```

## 发布步骤

1. 编辑 `js/changelog-data.js`
2. 同步 `package.json` 的 `version`
3. 运行 `npm test`
4. 本地打开 `changelog.html` 检查筛选、搜索和移动端
5. 提交时使用中文 Git message

## 不做什么

- 不从 git log 自动生成前台页面
- 不在 `changelog.html` 里写第二份内容
- 不把内部 P0/P1 编号、函数名、commit 流水账放进玩家文案
- 已发布版本只修错别字，不静默改写历史
