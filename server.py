#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
一介凡人 · 本地服务器
静态文件 + 公共碑林 API（点灯 / 留言）。

默认只监听 127.0.0.1。若要放到局域网/公网，请自行加反向代理、HTTPS 和访问控制。
"""
from __future__ import annotations

import argparse
import hashlib
import hmac
import ipaddress
import json
import os
import re
import sqlite3
import threading
import time
from contextlib import closing
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, unquote, parse_qs
import posixpath

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.environ.get("YIJIE_DATA_DIR", os.path.join(ROOT, "data"))
DATA_FILE = os.path.join(DATA_DIR, "hall.json")
GUESTBOOK_DB = os.path.join(DATA_DIR, "guestbook.db")
VISITS_DB = os.path.join(DATA_DIR, "visits.db")
VISIT_SALT = os.environ.get("YIJIE_VISIT_SALT", "yijie-visits-v1")
VISIT_TZ = ZoneInfo("Asia/Shanghai")
MAX_BODY = 8192
MAX_MESSAGE = 40
MAX_GUESTBOOK_NAME = 16
MAX_GUESTBOOK_TEXT = 200
MAX_GUESTBOOK_ROWS = 10000
MAX_MESSAGES_PER_STELE = 20
MAX_TRACKED_STELES = 5000
VISIT_PAGES = {
    "/": "首页",
    "/index.html": "首页",
    "/play.html": "推演",
    "/hall.html": "碑林",
    "/guestbook.html": "留言板",
    "/codex.html": "图鉴",
    "/changelog.html": "更新",
    "/about.html": "关于",
}
VISIT_BOT_RE = re.compile(r"bot|crawler|spider|slurp|bingpreview|headless|python-requests|curl/", re.I)
WRITE_KEY = os.environ.get("YIJIE_WRITE_KEY", "").strip()
ALLOWED_ORIGINS = {"https://wang1375830242.github.io"}
ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
STATIC_DIRS = {"assets", "css", "js"}
STATIC_EXT = {
    ".html",
    ".css",
    ".js",
    ".svg",
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".gif",
    ".ico",
    ".woff",
    ".woff2",
    ".ttf",
    ".otf",
    ".mp3",
    ".ogg",
    ".wav",
    ".webmanifest",
    ".json",
    ".xml",
    ".txt",
}

class StateCorrupt(Exception):
    pass


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
    except (OSError, ValueError) as exc:
        raise StateCorrupt("hall state is corrupted") from exc
    if not isinstance(raw, dict):
        raise StateCorrupt("hall state is not an object")
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
    with _LOCK:
        if len(_RATE) > 2048:
            cutoff = now - window
            for key in list(_RATE):
                bucket = _RATE[key]
                if not bucket or max(bucket) < cutoff:
                    _RATE.pop(key, None)
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


def clean_guestbook_text(value: object) -> str:
    text = str(value or "").replace("\r", " ").replace("\n", " ").strip()
    text = re.sub(r"[\x00-\x1f\x7f\u200b\u200c\u200d\ufeff]", "", text)
    return text


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


def guestbook_connect() -> sqlite3.Connection:
    conn = sqlite3.connect(GUESTBOOK_DB, timeout=5)
    conn.row_factory = sqlite3.Row
    return conn


def init_guestbook() -> None:
    os.makedirs(DATA_DIR, exist_ok=True)
    with closing(guestbook_connect()) as conn:
        conn.executescript(
            """
            PRAGMA journal_mode=WAL;
            CREATE TABLE IF NOT EXISTS guestbook (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                text TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'visible',
                ip_hash TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_guestbook_status_time
            ON guestbook(status, id DESC);
            CREATE TABLE IF NOT EXISTS guestbook_moderation (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id INTEGER NOT NULL,
                action TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            """
        )


def visits_connect() -> sqlite3.Connection:
    conn = sqlite3.connect(VISITS_DB, timeout=5)
    conn.row_factory = sqlite3.Row
    return conn


def init_visits() -> None:
    os.makedirs(DATA_DIR, exist_ok=True)
    with closing(visits_connect()) as conn:
        conn.executescript(
            """
            PRAGMA journal_mode=WAL;
            CREATE TABLE IF NOT EXISTS visits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                day TEXT NOT NULL,
                visited_at TEXT NOT NULL,
                page TEXT NOT NULL,
                visitor TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_visits_day ON visits(day);
            CREATE TABLE IF NOT EXISTS visit_daily (
                day TEXT PRIMARY KEY,
                views INTEGER NOT NULL DEFAULT 0,
                visitors INTEGER NOT NULL DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS visit_pages (
                day TEXT NOT NULL,
                page TEXT NOT NULL,
                views INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY(day, page)
            );
            CREATE TABLE IF NOT EXISTS visit_visitors (
                day TEXT NOT NULL,
                visitor TEXT NOT NULL,
                PRIMARY KEY(day, visitor)
            );
            """
        )


def visit_page(raw_path: str) -> str | None:
    path = urlparse(raw_path).path
    return VISIT_PAGES.get(path)


def visitor_key(ip: str, day: str, ua: str) -> str:
    # Store only a salted digest; raw IP addresses never enter the database.
    material = f"{ip}|{day}|{ua}".encode("utf-8")
    return hmac.new(VISIT_SALT.encode("utf-8"), material, hashlib.sha256).hexdigest()[:32]


def record_visit(page: str, ip: str, ua: str) -> None:
    when = datetime.now(VISIT_TZ)
    day = when.date().isoformat()
    visitor = visitor_key(ip, day, ua)
    with closing(visits_connect()) as conn:
        with conn:
            cur = conn.execute(
                "INSERT OR IGNORE INTO visit_visitors(day, visitor) VALUES(?, ?)",
                (day, visitor),
            )
            is_new = cur.rowcount > 0
            conn.execute(
                "INSERT INTO visit_daily(day, views, visitors) VALUES(?, 1, ?) "
                "ON CONFLICT(day) DO UPDATE SET views = views + 1, visitors = visitors + ?",
                (day, 1 if is_new else 0, 1 if is_new else 0),
            )
            conn.execute(
                "INSERT INTO visit_pages(day, page, views) VALUES(?, ?, 1) "
                "ON CONFLICT(day, page) DO UPDATE SET views = views + 1",
                (day, page),
            )
            conn.execute(
                "INSERT INTO visits(day, visited_at, page, visitor) VALUES(?, ?, ?, ?)",
                (day, when.isoformat(timespec="seconds"), page, visitor),
            )


def guestbook_row(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "text": row["text"],
        "createdAt": row["created_at"],
    }


def guestbook_list(before: int | None = None, limit: int = 20) -> dict:
    limit = max(1, min(50, int(limit)))
    sql = "SELECT * FROM guestbook WHERE status = 'visible'"
    args: list[object] = []
    if before is not None:
        sql += " AND id < ?"
        args.append(before)
    sql += " ORDER BY id DESC LIMIT ?"
    args.append(limit + 1)
    with closing(guestbook_connect()) as conn:
        rows = conn.execute(sql, args).fetchall()
    has_more = len(rows) > limit
    rows = rows[:limit]
    return {
        "messages": [guestbook_row(row) for row in rows],
        "nextBefore": rows[-1]["id"] if has_more and rows else None,
    }


def guestbook_add(name: str, text: str, ip: str) -> dict:
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    with closing(guestbook_connect()) as conn:
        with conn:
            count = conn.execute("SELECT COUNT(*) FROM guestbook WHERE status = 'visible'").fetchone()[0]
            if count >= MAX_GUESTBOOK_ROWS:
                raise ValueError("guestbook is full")
            cursor = conn.execute(
                "INSERT INTO guestbook(name, text, status, ip_hash, created_at, updated_at) VALUES(?, ?, 'visible', '', ?, ?)",
                (name or "无名", text, now, now),
            )
            row = conn.execute("SELECT * FROM guestbook WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return guestbook_row(row)


class Handler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "YijieHall/1.1"
    timeout = 15

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def client_ip(self) -> str:
        """只信任回环代理传入的真实 IP，防止客户端直接伪造代理头。"""
        peer = self.client_address[0]
        if peer in ("127.0.0.1", "::1"):
            # Caddy/Nginx append the real peer to X-Forwarded-For. Trust the
            # rightmost hop, not the first (which the client can supply).
            forwarded = self.headers.get("X-Forwarded-For", "")
            candidates = [part.strip() for part in forwarded.split(",") if part.strip()]
            raw = candidates[-1] if candidates else self.headers.get("X-Real-IP", "").strip()
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
        self.send_header("Connection", "close")
        self.close_connection = True
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
        """只允许公开页面、样式、脚本和资源，按真实路径与扩展名校验。"""
        decoded = unquote(raw_path or "/")
        # Reject NUL and Windows separators before any os.path call. A
        # backslash can bypass the POSIX-style segment checks on Windows.
        if "\x00" in decoded or "\\" in decoded:
            return True
        path = posixpath.normpath(decoded)
        if not path.startswith("/"):
            return True
        parts = [part for part in path.split("/") if part]
        if not parts:
            return False
        if any(part in (".", "..") or part.startswith(".") for part in parts):
            return True
        if any(part != part.rstrip(". ") for part in parts):
            return True
        first = parts[0].casefold()
        if len(parts) == 1:
            name = parts[0].casefold()
            root_files = {"robots.txt", "sitemap.xml", "favicon.ico", "og.png", "apple-touch-icon.png"}
            if name not in root_files and not name.endswith(".html"):
                return True
        elif first not in STATIC_DIRS:
            return True
        ext = os.path.splitext(parts[-1].casefold())[1]
        if ext not in STATIC_EXT:
            return True
        try:
            root = os.path.realpath(ROOT)
            target = os.path.realpath(os.path.join(ROOT, *parts))
            if os.path.commonpath([root, target]) != root:
                return True
            data_root = os.path.realpath(DATA_DIR)
            if os.path.commonpath([data_root, target]) == data_root:
                return True
        except (ValueError, OSError):
            return True
        return False

    def _origin_allowed(self) -> bool:
        origin = self.headers.get("Origin", "")
        if not origin:
            return True
        if origin in ALLOWED_ORIGINS:
            return True
        host = self.headers.get("Host", "")
        return bool(host) and origin in (f"https://{host}", f"http://{host}")

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/hall":
            try:
                with _LOCK:
                    state = load_state()
            except StateCorrupt:
                self._json(503, {"error": "hall state unavailable"})
                return
            self._json(200, counts(state))
            return
        if path == "/api/guestbook":
            query = parse_qs(urlparse(self.path).query)
            try:
                raw_before = query.get("before", [""])[0]
                before = int(raw_before) if raw_before else None
                limit = int(query.get("limit", ["20"])[0])
                if before is not None and not (0 <= before <= 2**63 - 1):
                    raise ValueError
                if not (1 <= limit <= 50):
                    raise ValueError
            except (TypeError, ValueError):
                self._json(400, {"error": "invalid pagination"})
                return
            try:
                data = guestbook_list(before, limit)
            except (sqlite3.Error, OverflowError):
                self._json(503, {"error": "guestbook unavailable"})
                return
            self._json(200, data)
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
        if path not in ("/api/hall", "/api/candle", "/api/message", "/api/guestbook", "/api/visit"):
            self._json(404, {"error": "not found"})
            return
        self.send_response(204)
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Yijie-Write-Key")
        self.send_header("Access-Control-Max-Age", "600")
        self.send_header("Connection", "close")
        self.close_connection = True
        self.end_headers()

    def do_POST(self):
        path = urlparse(self.path).path
        if path == "/api/visit":
            if self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower() != "application/json":
                self._json(415, {"error": "json content type required"})
                return
            if not self._origin_allowed():
                self._json(403, {"error": "origin not allowed"})
                return
            if not allow_rate(self.client_ip(), "visit", 30, 60):
                self._json(429, {"error": "too many requests"})
                return
            data = self._read_json()
            if not data or not isinstance(data.get("path"), str):
                self._json(400, {"error": "invalid path"})
                return
            page = visit_page(data.get("path"))
            if not page:
                self._json(400, {"error": "unknown page"})
                return
            ua = self.headers.get("User-Agent", "")
            if VISIT_BOT_RE.search(ua):
                self._json(204, {})
                return
            try:
                record_visit(page, self.client_ip(), ua)
            except sqlite3.Error:
                self._json(503, {"error": "visit store unavailable"})
                return
            self._json(200, {"ok": True})
            return
        if path == "/api/guestbook":
            if self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower() != "application/json":
                self._json(415, {"error": "json content type required"})
                return
            if not self._origin_allowed():
                self._json(403, {"error": "origin not allowed"})
                return
            data = self._read_json()
            if not data:
                self._json(400, {"error": "invalid json"})
                return
            if str(data.get("website", "")).strip():
                self._json(400, {"error": "invalid submission"})
                return
            if not isinstance(data.get("text"), str) or (
                data.get("name") is not None and not isinstance(data.get("name"), str)
            ):
                self._json(400, {"error": "invalid fields"})
                return
            name = clean_guestbook_text(data.get("name")) or "无名"
            text = clean_guestbook_text(data.get("text"))
            if len(name) > MAX_GUESTBOOK_NAME or len(text) > MAX_GUESTBOOK_TEXT:
                self._json(400, {"error": "message too long"})
                return
            if not text:
                self._json(400, {"error": "empty message"})
                return
            if not allow_rate(self.client_ip(), "guestbook", 2, 60):
                self._json(429, {"error": "too many requests"})
                return
            try:
                message = guestbook_add(name, text, self.client_ip())
            except ValueError:
                self._json(503, {"error": "guestbook is full"})
                return
            except sqlite3.Error:
                self._json(503, {"error": "guestbook unavailable"})
                return
            self._json(201, {"message": message})
            return
        if path not in ("/api/candle", "/api/message"):
            self._json(404, {"error": "not found"})
            return
        if self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower() != "application/json":
            self._json(415, {"error": "json content type required"})
            return
        if not self._origin_allowed():
            self._json(403, {"error": "origin not allowed"})
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

        try:
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
        except StateCorrupt:
            self._json(503, {"error": "hall state unavailable"})
            return

def main():
    parser = argparse.ArgumentParser(description="一介凡人 · 本地服务器")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()

    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(DATA_FILE):
        save_state(empty_state())
    init_guestbook()
    init_visits()

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
