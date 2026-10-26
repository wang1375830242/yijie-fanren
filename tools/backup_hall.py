#!/usr/bin/env python3
"""Copy the public hall state into a timestamped backup and prune old copies."""

from __future__ import annotations

import argparse
import os
import pathlib
import shutil
import time


def main() -> int:
    parser = argparse.ArgumentParser(description="Back up yijie hall data")
    parser.add_argument("--source", required=True)
    parser.add_argument("--dest", required=True)
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

    cutoff = time.time() - max(1, args.days) * 86400
    for old in dest.glob("hall-*.json"):
        if old.is_file() and old.stat().st_mtime < cutoff:
            old.unlink()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
