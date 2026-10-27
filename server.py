#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
一介凡人 · 本地服务器
静态文件 + 公共碑林 API（点灯 / 留言）。

默认只监听 127.0.0.1。若要放到局域网/公网，请自行加反向代理、HTTPS 和访问控制。
"""
from __future__ import annotations

import argparse
import hmac
import ipaddress
import json
import os
import re
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, unquote
import posixpath

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(ROOT, "data")
DATA_FILE = os.path.join(DATA_DIR, "hall.json")
MAX_BODY = 8192
MAX_MESSAGE = 40
MAX_MESSAGES_PER_STELE = 20
MAX_TRACKED_STELES = 5000
WRITE_KEY = os.environ.get("YIJIE_WRITE_KEY", "").strip()
ALLOWED_ORIGINS = {"https://wang1375830242.github.io"}
ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
SENSITIVE_PATHS = {
    "",
    "server.py",
    "README.md",
    "package.json",
    "node_modules",
    "docs",
    "tests",
    "tools",
    "data",
    ".git",
    ".github",
    ".env",
    ".tmp",
}

_LOCK = threading.Lock()
_RATE: dict[tuple[str, str], list[float]] = {}


def empty_state() -> dict:
    return {"candles": {}, "messages": {}}


def load_state() -> dict:
    if not os.path.exists(DATA_FILE):
        return empty_state()
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as fh:
            raw = json.load(fh)
    except (OSError, ValueError):
        return empty_state()
    if not isinstance(raw, dict):
        return empty_state()
    candles = raw.get("candles")
    messages = raw.get("messages")
    return {
        "candles": candles if isinstance(candles, dict) else {},
        "messages": messages if isinstance(messages, dict) else {},
    }


def save_state(state: dict) -> None:
    os.makedirs(DATA_DIR, exist_ok=True)
    tmp = DATA_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(state, fh, ensure_ascii=False, indent=2)
        fh.flush()
        os.fsync(fh.fileno())
    os.replace(tmp, DATA_FILE)


def allow_rate(ip: str, kind: str, limit: int, window: int = 60) -> bool:
    now = time.time()
    bucket = _RATE.setdefault((ip, kind), [])
    bucket[:] = [t for t in bucket if now - t < window]
    if len(bucket) >= limit:
        return False
    bucket.append(now)
    return True


def clean_text(value: object) -> str:
    text = str(value or "").replace("\r", " ").replace("\n", " ").strip()
    text = re.sub(r"[\x00-\x1f\x7f]", "", text)
    return text[:MAX_MESSAGE]


def counts(state: dict) -> dict:
    candles = state.get("candles", {})
    messages = state.get("messages", {})
    return {
        "candles": candles,
        "messages": messages,
        "totalCandles": sum(int(v) for v in candles.values() if isinstance(v, int)),
        "totalMessages": sum(len(v) for v in messages.values() if isinstance(v, list)),
    }


def tracked_stele_count(state: dict) -> int:
    return len(set(state.get("candles", {})) | set(state.get("messages", {})))


def write_authorized(provided: str) -> bool:
    if not WRITE_KEY:
        return True
    return bool(provided) and hmac.compare_digest(provided, WRITE_KEY)


class Handler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "YijieHall/1.0"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def client_ip(self) -> str:
        """只信任回环 Nginx 传入的真实 IP，防止客户端直接伪造 X-Real-IP。"""
        peer = self.client_address[0]
        if peer in ("127.0.0.1", "::1"):
            raw = self.headers.get("X-Real-IP", "").strip()
            try:
                return str(ipaddress.ip_address(raw))
            except ValueError:
                pass
        return peer

    def log_message(self, fmt, *args):
        # 只保留错误，避免终端被静态请求刷屏。
        if str(args[1] if len(args) > 1 else "").startswith("4"):
            super().log_message(fmt, *args)

    def end_headers(self):
        if self.path.startswith("/api/"):
            self.send_header("Cache-Control", "no-store")
            origin = self.headers.get("Origin", "")
            if origin in ALLOWED_ORIGINS:
                self.send_header("Access-Control-Allow-Origin", origin)
                self.send_header("Vary", "Origin")
        else:
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def _json(self, code: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self) -> dict | None:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return None
        if length <= 0 or length > MAX_BODY:
            return None
        try:
            raw = self.rfile.read(length)
            data = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, ValueError):
            return None
        return data if isinstance(data, dict) else None

    def _blocked_static(self, raw_path: str) -> bool:
        """只允许页面、样式、脚本和资源；拒绝仓库元数据与运行时数据。"""
        path = posixpath.normpath(unquote(raw_path or "/"))
        if not path.startswith("/"):
            return True
        parts = [part for part in path.split("/") if part]
        if any(part.startswith(".") for part in parts):
            return True
        if parts and parts[0] in SENSITIVE_PATHS:
            return True
        if len(parts) == 1 and parts[0] in SENSITIVE_PATHS:
            return True
        return False

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/hall":
            with _LOCK:
                state = load_state()
            self._json(200, counts(state))
            return
        if self._blocked_static(path):
            self._json(404, {"error": "not found"})
            return
        super().do_GET()

    def do_HEAD(self):
        path = urlparse(self.path).path
        if self._blocked_static(path):
            self.send_response(404)
            self.end_headers()
            return
        super().do_HEAD()

    def do_OPTIONS(self):
        path = urlparse(self.path).path
        if path not in ("/api/hall", "/api/candle", "/api/message"):
            self._json(404, {"error": "not found"})
            return
        self.send_response(204)
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Max-Age", "600")
        self.end_headers()

    def do_POST(self):
        path = urlparse(self.path).path
        if path not in ("/api/candle", "/api/message"):
            self._json(404, {"error": "not found"})
            return
        if not allow_rate(self.client_ip(), path, 30 if path.endswith("candle") else 8):
            self._json(429, {"error": "too many requests"})
            return
        if not write_authorized(self.headers.get("X-Yijie-Write-Key", "")):
            self._json(401, {"error": "write key required"})
            return
        data = self._read_json()
        if not data:
            self._json(400, {"error": "invalid json"})
            return
        stele_id = str(data.get("id", ""))
        if not ID_RE.fullmatch(stele_id):
            self._json(400, {"error": "invalid stele id"})
            return

        with _LOCK:
            state = load_state()
            if stele_id not in state["candles"] and stele_id not in state["messages"]:
                if tracked_stele_count(state) >= MAX_TRACKED_STELES:
                    self._json(429, {"error": "stele limit reached"})
                    return
            if path == "/api/candle":
                current = state["candles"].get(stele_id, 0)
                if not isinstance(current, int):
                    current = 0
                state["candles"][stele_id] = current + 1
                save_state(state)
                self._json(200, {"count": current + 1, "totalCandles": counts(state)["totalCandles"]})
                return

            text = clean_text(data.get("text"))
            if not text:
                self._json(400, {"error": "empty message"})
                return
            bucket = state["messages"].get(stele_id, [])
            if not isinstance(bucket, list):
                bucket = []
            bucket.append(text)
            state["messages"][stele_id] = bucket[-MAX_MESSAGES_PER_STELE:]
            save_state(state)
            self._json(200, {"messages": state["messages"][stele_id], "totalMessages": counts(state)["totalMessages"]})


def main():
    parser = argparse.ArgumentParser(description="一介凡人 · 本地服务器")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()

    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(DATA_FILE):
        save_state(empty_state())

    server = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"一介凡人 · 服务器已启动")
    print(f"  http://{args.host}:{args.port}/")
    print(f"  公共碑林：http://{args.host}:{args.port}/hall.html")
    print("  按 Ctrl+C 结束。")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n已停止。")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
