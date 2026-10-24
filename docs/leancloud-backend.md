# LeanCloud 后台服务

日期：2026-10-24  
状态：已接入（临时）

## 用途

- 访问统计
- 公共碑林点灯
- 公共碑林留言
- LeanCloud 不可用时自动退回 `server.py` / 本机模式

## 配置

前端配置在：

```text
js/lean-config.js
```

只包含 AppID、AppKey 和 REST API Server URL。  
**不要把 MasterKey 写进前端或仓库。**

## 数据类

| 类 | 用途 |
|---|---|
| `SiteVisit` | 每次页面访问 |
| `SiteVisitor` | 匿名浏览器标识与累计访问 |
| `HallCandle` | 每座碑的灯数 |
| `HallMessage` | 碑林留言 |

访问记录不保存姓名/IP；只保存匿名浏览器 ID、页面路径、日期。

## 类权限

默认配置：

- 读：所有用户
- 写：关闭（`writeMode: "server"`）

GitHub Pages 静态版公共碑林因此是只读的。  
点灯、留言和访问上报必须通过同源 `server.py` 或 LeanCloud 云函数写入；云函数使用服务端密钥做字段校验、频率限制和内容审核。前端只使用 AppKey，不包含 MasterKey。

## 本地联调

```text
python -m http.server 8765
```

本地默认不写入统计（`trackLocal: false`），避免污染线上数据。  
公共碑林会优先访问 LeanCloud，失败后退回 `/api/*` 或本机模式。

## 限制

- LeanCloud 当前共享域名没有可用性保证
- 免费服务预计 2027-01-12 停止
- 正式发布前建议绑定 API 域名
- 客户端限流只能降低误触，不能替代服务端防刷
- 独立访客按浏览器匿名 ID 近似统计

## 停止服务后的迁移

需要把四个类导出为 JSON，再接入 Supabase、Cloudflare D1 或其他 BaaS。  
前端只依赖 `js/cloud.js` 适配层，迁移时可替换适配实现，不改页面。
