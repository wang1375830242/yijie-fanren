# 后台管理增强 · 2026-10-29

## 范围

现有的独立后台 `/stats/` 扩展为：

- 访问统计：总访问、独立访客、今日访问/今日访客、最近七日、页面排行、最近访问
- 用户概览：注册用户、今日注册、今日活跃、近七日活跃、总人生局数、今日/近七日人生、进行中的存档、人均局数
- 境界与界域分布：基于账号快照中的 `lives` 最近人生样本
- 留言板统计：公开、隐藏、已删除、总数、今日、近七日
- 容量限制：留言板条数、已跟踪碑数、每碑留言上限、今日访客
- 用户管理：账号列表、搜索、注册时间、禁用状态、总局数、最后活跃、当前/最后境界
- 用户详情：最近人生记录（第几世、界域、境界、年龄、宗门/职位、结局、时间）

## 数据口径

- 用户：`accounts.db` 的 `users`
- 总局数：账号快照的 `lineage.total`；若缺失才退回 `lives.length`
- 人生明细：账号快照的 `lives`，最多 60 条；页面明确标注为“最近人生样本”
- 当前存档：账号快照的 `run.state`，仅在 `alive !== false` 时展示
- 最后活跃：取 session 最后时间、存档更新时间、快照 `savedAt`、最近人生时间的最大值
- 今日/近七日：按 Asia/Shanghai 日期计算
- 留言：`guestbook.db` 的 `status`；容量按公开留言数计算
- 访客：`visits.db` 的匿名去重访客；不展示原始 IP

## 接口

均位于现有 Basic Auth 后台内：

```text
GET /stats/stats.json
GET /stats/api/users?q=&offset=0&limit=50&refresh=1
GET /stats/api/users/<id>?refresh=1
```

`/api/users` 系列额外要求请求头 `X-Yijie-Admin: 1` 和同源 Origin。Basic Auth 是实际权限边界，请求头只是管理端的额外保护，不作为身份认证。

## 隐私与安全

- 不返回 `password_hash`、`recovery_hash`、session token、IP 或完整原始快照
- 用户详情只返回人生摘要字段
- accounts.db 以 SQLite `mode=ro` 打开
- 后台页面不加入静态站点导航，不进入 sitemap；Nginx `/stats/` 继续使用 Basic Auth
- 本轮只做查看，不提供删除用户或修改密码等写操作

## 部署

服务文件位于服务器 `/opt/yijie-stats`，由 `yijie-stats.service` 运行；对外由 Nginx `/stats/` 反向代理，使用 `/etc/nginx/.htpasswd-yijie-stats`。部署时安装：

```text
stats_server.py
index.html
users.html
guestbook.html
```

运行时只读 `accounts.db`、`visits.db`、`hall.json`、`guestbook.db`；统计历史写入 `/opt/yijie-stats/data`。

按现有约定，访问统计和后台管理相关改动不写入玩家更新页。
