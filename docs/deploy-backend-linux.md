# 一介凡人 · 公共碑林后端 Linux 部署说明

> 给服务器上的 AI 执行。目标：把这套「一介凡人」完整站点部署到 Linux 服务器上，让 `hall.html` 从“本机模式”变成真正的公共碑林。
>
> 请先读完再执行。不要改业务代码，不要伪造测试结果。遇到不确定的地方，停下来报告，不要猜。

## 0. 先理解要部署什么

这个仓库包含：

- 静态前端：`index.html`、`play.html`、`hall.html`、`codex.html`、`about.html`
- 公共碑林后端：`server.py`
- 运行时数据：`data/hall.json`（由 `server.py` 自动创建）

`server.py` 同时做两件事：

1. 提供静态文件；
2. 提供 `/api/hall`、`/api/candle`、`/api/message` 三个接口。

**重要：不要只把 `server.py` 单独跑起来，然后把前端继续放在 GitHub Pages 上。**

前端里的接口地址是写死的同源相对路径：

```js
fetch("/api/hall")
fetch("/api/candle")
fetch("/api/message")
```

如果前端在 GitHub Pages、后端在另一台服务器，浏览器会请求 GitHub Pages 自己的 `/api/*`，不会请求到你的服务器；而且后端目前没有配置 CORS。

所以推荐方案是：

> **把完整仓库部署到 Linux 服务器，通过同一个域名同时提供静态页面和 API。**

这样打开 `https://你的域名/hall.html` 时，公共碑林才会自动连上。

---

## 1. 目标环境

- Linux（Debian / Ubuntu 优先）
- Python **3.10+**（`server.py` 使用了 `dict | None` 类型语法）
- 一个已解析到服务器 IP 的域名（推荐）
- 80 / 443 端口可访问
- 不需要 npm、Node、数据库、Redis、Docker
- 不需要 `pip install`，只用 Python 标准库

如果暂时没有域名，可以先用 `http://服务器IP:8765` 做临时测试，但**不要长期把 8765 直接暴露在公网**。

---

## 2. 安装基础依赖

```bash
sudo apt update
sudo apt install -y python3 git curl
python3 --version
```

确认 Python 版本 >= 3.10。

---

## 3. 拉取代码

推荐目录：`/opt/yijie-fanren`。

```bash
sudo mkdir -p /opt/yijie-fanren

if [ -d /opt/yijie-fanren/.git ]; then
  sudo git -C /opt/yijie-fanren pull --ff-only
else
  sudo git clone https://github.com/wang1375830242/yijie-fanren.git /opt/yijie-fanren
fi
```

设置权限：

```bash
sudo chown -R root:root /opt/yijie-fanren
sudo mkdir -p /opt/yijie-fanren/data
sudo chown -R www-data:www-data /opt/yijie-fanren/data
sudo chmod 750 /opt/yijie-fanren/data
```

检查：

```bash
cd /opt/yijie-fanren
python3 -m py_compile server.py
ls -la
```

`py_compile` 没有输出即通过。

---

## 4. 启动方式：systemd

不要用 `nohup` 或 `screen` 作为最终方案。用 systemd 管理，服务器重启后自动恢复。

创建 `/etc/systemd/system/yijie-fanren.service`：

```ini
[Unit]
Description=Yijie Fanren public memorial backend
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/yijie-fanren
ExecStart=/usr/bin/python3 /opt/yijie-fanren/server.py --host 127.0.0.1 --port 8765
Restart=on-failure
RestartSec=3
Environment=PYTHONUNBUFFERED=1
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/yijie-fanren/data
UMask=0027

[Install]
WantedBy=multi-user.target
```

加载并启动：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now yijie-fanren
sudo systemctl status yijie-fanren --no-pager
```

查看日志：

```bash
sudo journalctl -u yijie-fanren -n 100 --no-pager
```

本机自检：

```bash
curl -fsS http://127.0.0.1:8765/api/hall
curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8765/hall.html
```

预期：

- `/api/hall` 返回 200，JSON 类似：

```json
{"candles":{},"messages":{},"totalCandles":0,"totalMessages":0}
```

- `/hall.html` 返回 200。

---

## 5. 反向代理与 HTTPS

下面二选一。**优先用 Caddy**，它自动申请 HTTPS 证书，配置最少。

### 方案 A：Caddy（推荐）

安装：

```bash
sudo apt install -y caddy
```

把 `play.example.com` 换成你的真实域名：

```bash
sudo tee /etc/caddy/Caddyfile >/dev/null <<'EOF'
play.example.com {
    encode gzip
    reverse_proxy 127.0.0.1:8765
}
EOF

sudo systemctl reload caddy
sudo systemctl status caddy --no-pager
```

Caddy 会自动处理 80/443 和证书。需要确认：

- 域名 A/AAAA 记录已经指向这台服务器；
- 云厂商安全组 / 防火墙放行 80、443；
- 不需要放行 8765。

### 方案 B：Nginx + Certbot

如果服务器已经装有 Nginx：

```bash
sudo tee /etc/nginx/sites-available/yijie-fanren >/dev/null <<'EOF'
server {
    listen 80;
    server_name play.example.com;

    client_max_body_size 16k;

    location / {
        proxy_pass http://127.0.0.1:8765;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/yijie-fanren /etc/nginx/sites-enabled/yijie-fanren
sudo nginx -t
sudo systemctl reload nginx
```

然后申请证书：

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d play.example.com
```

### 防火墙

如果使用 `ufw`：

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status
```

不要执行 `ufw allow 8765`，除非你明确知道自己在做什么。8765 只应该监听 `127.0.0.1`。

---

## 6. 上线后的验收测试

把 `play.example.com` 换成真实域名。

### 6.1 页面和 API

```bash
curl -fsS -o /dev/null -w 'hall page: %{http_code}\n' https://play.example.com/hall.html
curl -fsS https://play.example.com/api/hall
```

预期：

- `hall page: 200`
- `/api/hall` 返回 200 JSON

### 6.2 点灯

```bash
curl -fsS -X POST https://play.example.com/api/candle \
  -H 'Content-Type: application/json' \
  -d '{"id":"test-deploy"}'
```

预期返回类似：

```json
{"count":1,"totalCandles":1}
```

### 6.3 留言

```bash
curl -fsS -X POST https://play.example.com/api/message \
  -H 'Content-Type: application/json' \
  -d '{"id":"test-deploy","text":"deployment test"}'
```

预期返回包含：

```json
{"messages":["deployment test"],"totalMessages":1}
```

### 6.4 确认数据文件不能直接访问

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://play.example.com/data/hall.json
```

预期：`404`。

### 6.5 测试后清理测试数据

测试用的 `test-deploy` 不要留在公共碑林里。

```bash
sudo systemctl stop yijie-fanren
sudo rm -f /opt/yijie-fanren/data/hall.json
sudo systemctl start yijie-fanren
curl -fsS https://play.example.com/api/hall
```

预期重新变成：

```json
{"candles":{},"messages":{},"totalCandles":0,"totalMessages":0}
```

### 6.6 重启持久化

```bash
sudo systemctl restart yijie-fanren
sleep 2
sudo systemctl is-active yijie-fanren
curl -fsS https://play.example.com/api/hall
```

预期 `active`，数据仍然存在（如果清理后则是空状态）。

---

## 7. 数据与备份

运行时数据只有一个文件：

```text
/opt/yijie-fanren/data/hall.json
```

请确保：

- 目录属主是 `www-data:www-data`；
- 服务停止后备份这个文件；
- 不要把它提交回 Git；
- 不要把 `data/hall.json` 暴露成静态文件。

简单备份命令：

```bash
sudo mkdir -p /var/backups/yijie-fanren
sudo tar czf "/var/backups/yijie-fanren/hall-$(date +%F-%H%M).tgz" \
  -C /opt/yijie-fanren data
```

可以加到 cron，每天一次。

---

## 8. 已知限制

请在报告里如实说明，不要隐瞒：

1. **限流是进程内内存限流**，重启后清零。
2. **反向代理后，所有请求的来源 IP 会显示为 127.0.0.1**。当前 `server.py` 没有读取 `X-Forwarded-For`，所以所有访客共用同一个限流桶：
   - 点灯：30 次/分钟（全站合计）
   - 留言：8 次/分钟（全站合计）
   对小站点够用；如果用户量上来，需要改后端支持可信代理头。
3. **留言是公开且没有审核后台的**。前端会做 HTML 转义、长度限制 40 字、每个碑最多保留 20 条，但没有敏感词审核。
4. **没有账号系统**，任何人都可以点灯/留言。
5. **只支持同源部署**。不要试图让 GitHub Pages 前端直接调用这个后端，除非另外修改 `hall.js` 的 API 地址并给后端加 CORS。

如果这些限制对当前使用场景不可接受，先停下来报告，不要擅自加复杂功能。

---

## 9. 部署完成后必须返回的信息

请把下面模板填好发回。**不要返回私钥、密码、Token、完整环境变量或用户留言正文。**

```text
DEPLOYMENT REPORT

1. Public URL:
2. Domain:
3. Server public IP:
4. OS / version:
5. Python version:
6. Repository commit:
7. Service name:
8. Service status:
9. Reverse proxy used:
10. TLS enabled (yes/no + expiry):
11. GET /api/hall status and body:
12. GET /hall.html status:
13. GET /data/hall.json status:
14. POST /api/candle test result:
15. POST /api/message test result:
16. Test data cleaned (yes/no):
17. Restart persistence verified (yes/no):
18. Data directory and permissions:
19. Logs location:
20. Any remaining issues / limitations:
```

另外请附上：

```bash
sudo systemctl status yijie-fanren --no-pager
curl -fsS https://你的域名/api/hall
```

的实际输出（可以截取关键行）。

---

## 10. 完成标准

只有以下条件全部满足，才算部署完成：

- [ ] `https://域名/hall.html` 可以打开
- [ ] `https://域名/api/hall` 返回 200 JSON
- [ ] 点灯接口能增加计数
- [ ] 留言接口能写入并重新读取
- [ ] `https://域名/data/hall.json` 返回 404
- [ ] `systemctl is-enabled yijie-fanren` 为 `enabled`
- [ ] 重启服务后数据仍在
- [ ] 测试数据已清理
- [ ] 已返回上面的 DEPLOYMENT REPORT

如果任何一项失败，请返回**具体命令、HTTP 状态码和错误日志**，不要只说“部署成功”。
