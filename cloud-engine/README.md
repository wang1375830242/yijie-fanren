# LeanCloud 云函数：统计鉴权

这个目录只包含统计页使用的 `statsAdmin` 云函数，不会进入 GitHub Pages 静态文件。

## 部署步骤

1. 在 LeanCloud 控制台进入应用的「云引擎」。
2. 新建或打开 Node.js 云函数项目。
3. 把 `cloud.js` 的内容粘贴到云函数入口。
4. 在云引擎的「环境变量」中添加：

```text
STATS_ADMIN_TOKEN=<一个只告诉站长的随机长口令>
```

5. 部署后，在「云引擎 → 云函数」中确认函数名为：

```text
statsAdmin
```

6. 把 `SiteVisit`、`SiteVisitor` 的 **读权限** 改为仅服务端 / 关闭客户端读取；云函数使用 MasterKey 查询，前端不需要读取原始记录。

## 调用方式

统计页会请求：

```text
POST /1.1/functions/statsAdmin
```

请求体：

```json
{
  "token": "站长输入的口令",
  "today": "2026-10-26",
  "days": ["2026-10-20", "..."],
  "pages": ["index.html", "..."]
}
```

函数只返回聚合数字，不返回 IP、原始访客 ID 或留言正文。
