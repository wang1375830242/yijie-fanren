#!/usr/bin/env python3
"""导出 LeanCloud 四个数据类，供停服前迁移使用。

用法：
  set LEAN_APP_ID=...
  set LEAN_APP_KEY=...
  set LEAN_MASTER_KEY=...
  set LEAN_SERVER_URL=https://...
  python tools/export_leancloud.py output.json
"""
from __future__ import annotations

import json
import os
import sys
import urllib.parse
import urllib.request

CLASSES = ["SiteVisit", "SiteVisitor", "HallCandle", "HallMessage"]


def main() -> int:
    base = os.environ.get("LEAN_SERVER_URL", "").rstrip("/")
    app_id = os.environ.get("LEAN_APP_ID", "")
    app_key = os.environ.get("LEAN_APP_KEY", "")
    master = os.environ.get("LEAN_MASTER_KEY", "")
    if not all([base, app_id, app_key, master]):
        print("需要 LEAN_SERVER_URL / LEAN_APP_ID / LEAN_APP_KEY / LEAN_MASTER_KEY", file=sys.stderr)
        return 2
    target = sys.argv[1] if len(sys.argv) > 1 else "leancloud-export.json"
    headers = {
        "X-LC-Id": app_id,
        "X-LC-Key": f"{master},master",
        "Accept": "application/json",
    }
    data = {}
    for cls in CLASSES:
        rows = []
        skip = 0
        while True:
            query = urllib.parse.urlencode({"limit": 1000, "skip": skip, "order": "createdAt"})
            req = urllib.request.Request(f"{base}/1.1/classes/{cls}?{query}", headers=headers)
            with urllib.request.urlopen(req, timeout=30) as res:
                payload = json.load(res)
            batch = payload.get("results", [])
            rows.extend(batch)
            if len(batch) < 1000:
                break
            skip += 1000
        data[cls] = rows
        print(f"{cls}: {len(rows)}")
    with open(target, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
    print(f"written: {target}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
