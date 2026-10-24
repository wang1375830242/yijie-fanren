# 日间主题

日期：2026-10-24  
状态：已实现

## 默认与切换

- 默认主题：夜间（不改变现有视觉）
- 手动切换：日间 / 夜间
- 偏好写入 `yijie.prefs.v1` 的 `theme`
- 刷新、跨页面保持
- 不跟随系统、不按时间自动切换

## 实现

- `js/theme-init.js` 在 `<head>` 中、CSS 之前读取偏好并设置 `data-theme`
- `css/tokens.css` 提供日间语义变量
- `css/day.css` 只覆盖日间差异
- `js/common.js` 注入主题开关，更新 `aria-pressed`、`aria-label` 与 `theme-color`

## 页面覆盖

```text
index.html
play.html
hall.html
codex.html
about.html
changelog.html
404.html
```

## 配色

```text
页面底色：#f7f4ec
卡片底色：#fffdf8
正文：#1b211c
次要文字：#59665d
边框：#d8d2c4
玉色：#2f6b52
金色：#8a6a2f
朱砂：#9f3b2d
```

不使用整页反色，也不复制一套完整暗色样式。

## 验收

- 默认仍为夜间
- 手动切换后刷新仍保持
- 320px 无横向溢出
- 导航、面板、人生录、碑林、图鉴、更新页均有日间版本
- 飞升/破境遮罩在日间仍可读
- 主题按钮可键盘操作，带 `aria-label`
