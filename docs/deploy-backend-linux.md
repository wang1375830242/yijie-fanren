# 一介凡人 · 公共碑林后端 Linux 部署说明

> 给服务器上的 AI 执行。目标：把这套「一介凡人」完整站点部署到 Linux 服务器上，让 `hall.html` 从“本机模式”变成真正的公共碑林。
>
> 请先读完再执行。不要改业务代码，不要伪造测试结果。遇到不确定的地方，停下来报告，不要猜。

## 0. 先理解要部署什么

这个仓库包含：

- 静态前端：`index.html`、`play.html`、`hall.html`、`guestbook.html`、`codex.html`、`about.html`
- 公共碑林与留言板后端：`server.py`
- 服务器后台：`/stats/`（访问统计与留言管理，部署在服务器，不进静态仓库）
- 运行时数据：`data/hall.json`、`data/guestbook.db`（由 `server.py` 自动创建）
- 访问统计：`data/visits.db`（SQLite，`server.py` 通过 `/api/visit` 记录；`/stats/` 只读该库，Nginx 日志仅用于旧数据一次性回填）

`server.py` 提供：

```text
/api/hall
/api/candle
/api/message
/api/guestbook
```

`/api/guestbook` 支持 `GET` 分页读取和 `POST` 写入；管理端通过服务器的 `/stats/guestbook` 操作。

GitHub Pages 静态前端在 `hall.js` / `guestbook.js` 中把 API 地址指向
`https://192.144.150.24`，服务器允许
`https://wang1375830242.github.io` 的 CORS。部署到其他域名时，需要同步修改
`API_BASE` 与 `ALLOWED_ORIGINS`。

推荐仍然把完整仓库部署到 Linux 服务器，通过同一个域名同时提供静态页面和 API；这样碑林和留言板都可以同源工作。

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
    reverse_proxy 127.0.0.1:8765 {
        # 覆盖客户端伪造的 X-Real-IP；服务端同时只信任回环代理。
        header_up X-Real-IP {remote_host}
    }
}
EOF

sudo systemctl reload caddy
sudo systemctl status caddy --no-pager
```

Caddy 会自动处理 80/443 和证书。上面的 `header_up X-Real-IP {remote_host}` 会覆盖客户端伪造的转发头；如果前面还有 CDN/负载均衡，需要显式配置可信代理链，不能直接信任任意 `X-Forwarded-For`。需要确认：

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

### 5.1 没有域名时的临时 HTTPS 方案

如果暂时没有自己的域名，可以用 `sslip.io` 的临时域名指向服务器 IP。它不需要注册，DNS 会直接把 `<IP>.sslip.io` 解析到该 IP。

先取本机公网 IP：

```bash
SERVER_IP="$(curl -4 -s https://api.ipify.org)"
TEMP_HOST="${SERVER_IP}.sslip.io"
echo "$TEMP_HOST"
```

如果 `curl` 返回为空，就把 `SERVER_IP` 手动设置成服务器公网 IP。

安装 Nginx 和 Certbot：

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

写入配置（`server_name` 使用刚才的临时域名）：

```bash
sudo tee /etc/nginx/sites-available/yijie-fanren >/dev/null <<EOF
server {
    listen 80;
    server_name ${TEMP_HOST};

    client_max_body_size 16k;

    location / {
        proxy_pass http://127.0.0.1:8765;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/yijie-fanren /etc/nginx/sites-enabled/yijie-fanren
sudo nginx -t
sudo systemctl reload nginx
```

申请证书：

```bash
sudo certbot --nginx \
  -d "${TEMP_HOST}" \
  --redirect \
  --non-interactive \
  --agree-tos \
  --register-unsafely-without-email
```

云厂商安全组必须放行 **80 和 443**。如果使用 `ufw`：

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

验证：

```bash
curl -I "https://${TEMP_HOST}/hall.html"
curl -fsS "https://${TEMP_HOST}/api/hall"
```

注意：

- `sslip.io` 只是临时入口，不适合作为长期品牌域名；有域名后换成自己的域名即可。
- 如果云厂商因为备案/端口策略拦截 80/443，Let's Encrypt 的 HTTP-01 验证会失败；此时只能用 `http://IP:8765` 做短期调试（需要改 `--host 0.0.0.0` 并放行安全组），或者使用 Cloudflare Tunnel 之类的隧道方案。
- 不要把 `http://IP:8765` 当作长期公开方案：没有 HTTPS，也没有域名。


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

运行时数据：

```text
/opt/yijie-fanren/data/hall.json
/opt/yijie-fanren/data/guestbook.db
```

请确保：

- 目录属主是 `www-data:www-data`；
- 服务停止后备份这两个文件；
- SQLite 使用 WAL，优先用 `tools/backup_hall.py` 的 SQLite backup API，不要直接复制正在写入的 `.db-wal`；
- 不要把它们提交回 Git；
- 不要把 `data/` 暴露成静态文件；新的静态服务使用 `server.py` 的扩展名/真实路径白名单。

简单备份命令：

```bash
sudo mkdir -p /var/backups/yijie-fanren
sudo python3 tools/backup_hall.py \
  --source /opt/yijie-fanren/data/hall.json \
  --guestbook-source /opt/yijie-fanren/data/guestbook.db \
  --dest /var/backups/yijie-fanren
```

`backup_hall.py` 会通过 SQLite backup API 备份 `guestbook.db`，比直接复制 live WAL 文件安全。也可以继续用 tar 备份整个 `data` 目录，但应在低流量时执行。

可以加到 cron，每天一次。

---

## 8. 已知限制

请在报告里如实说明，不要隐瞒：

1. **限流是进程内内存限流**，重启后清零；同时 Nginx 有 `yijie_guestbook` 外层限流。
2. **反向代理必须正确传递真实 IP**。Nginx 配置需要 `X-Real-IP $remote_addr`；Caddy/Docker/Cloudflare 需要显式配置可信代理或 `real_ip`，否则所有访客可能共用同一个限流桶。
    - 点灯：30 次/分钟
    - 碑林留言：8 次/分钟
    - 留言板：2 次/分钟
3. **留言板管理端是服务器独立服务** `/stats/`，使用 Basic Auth；不要把 `127.0.0.1:8766` 暴露到公网。
4. **公共留言默认公开**，管理员可隐藏/软删除；没有敏感词审核。碑林留言仍每个碑最多保留 20 条。
5. **账号系统可选**：游客仍可点灯/留言/写留言板；登录用户留言显示账号名，可删除自己的留言。
6. **GitHub Pages 跨域已支持**：GitHub Pages 来源在 `ALLOWED_ORIGINS` 中，API 地址由 `hall.js` / `guestbook.js` 指向 `https://192.144.150.24`；换域名时两边都要改。

如果这些限制对当前使用场景不可接受，先停下来报告，不要擅自加复杂功能。

---

## 8.1 公开写入与防滥用

当前公开发布不设置 `YIJIE_WRITE_KEY`，任何访客都可以点灯和留言。
`server.py` 在环境变量为空时允许匿名写入；保留该变量只用于私有部署，前端当前不会自动发送口令，设置后会导致写入返回 401。

公开写入依靠以下边界控制：

- Nginx 按真实访客 IP 限流
- `server.py` 按真实 IP 限制点灯/留言频率
- 公共碑林最多跟踪 5000 个 stele id
- 每日备份 `hall.json` 和 `guestbook.db`，保留 30 天
- 静态文件使用扩展名 + 真实路径白名单，禁止访问 `data/`、`.git/`、`server.py` 等
- 留言板 `POST` 只接受 `application/json`，并校验 `Origin`
- 管理端 `/stats/` 使用 Basic Auth，隐藏/软删除留言

公开留言默认公开可见，管理员可在 `/stats/guestbook` 隐藏或软删除；部署者仍需承担内容审核责任。


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
