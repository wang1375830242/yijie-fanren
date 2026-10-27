#!/usr/bin/env python3
"""Copy the public hall/guestbook state into timestamped backups and prune old copies."""

from __future__ import annotations

import argparse
import os
import pathlib
import shutil
import sqlite3
import time


def backup_sqlite(source: pathlib.Path, target: pathlib.Path) -> None:
    temporary = target.with_name(target.name + ".tmp")
    source_db = sqlite3.connect(f"file:{source}?mode=ro", uri=True)
    target_db = sqlite3.connect(temporary)
    try:
        source_db.backup(target_db)
    finally:
        target_db.close()
        source_db.close()
    os.replace(temporary, target)


def main() -> int:
    parser = argparse.ArgumentParser(description="Back up yijie public data")
    parser.add_argument("--source", required=True)
    parser.add_argument("--dest", required=True)
    parser.add_argument("--guestbook-source", default="")
    parser.add_argument("--days", type=int, default=30)
    args = parser.parse_args()

    source = pathlib.Path(args.source)
    dest = pathlib.Path(args.dest)
    if not source.is_file():
        return 1

    dest.mkdir(parents=True, exist_ok=True)
    stamp = time.strftime("%Y%m%d-%H%M%S")
    target = dest / f"hall-{stamp}.json"
    temporary = target.with_name(target.name + ".tmp")
    shutil.copy2(source, temporary)
    os.replace(temporary, target)

    guestbook_source = pathlib.Path(args.guestbook_source) if args.guestbook_source else None
    if guestbook_source and guestbook_source.is_file():
        backup_sqlite(guestbook_source, dest / f"guestbook-{stamp}.db")

    cutoff = time.time() - max(1, args.days) * 86400
    for pattern in ("hall-*.json", "guestbook-*.db"):
        for old in dest.glob(pattern):
            if old.is_file() and old.stat().st_mtime < cutoff:
                old.unlink()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
