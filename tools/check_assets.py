#!/usr/bin/env python3
"""Guard against the two mistakes that silently break the app.

1. Absolute asset paths (`/engine.js`). The Android app loads index.html from
   `file:///android_asset/www/`, so an absolute path resolves to
   `file:///engine.js` and never loads. The page then dies with a blank screen.
2. Emoji used as UI icons or currency, which look inconsistent and cheap.

Exits non-zero if either is found.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

FRONTEND = Path(__file__).resolve().parent.parent / "frontend"
HTML = FRONTEND / "index.html"

# Files that must not contain emoji (data files emit icon names instead).
SOURCE_FILES = [
    "index.html", "app.js", "local.js", "api.js", "engine.js",
    "editor.js", "bot.js", "icons.js", "styles.css",
]

REF_RE = re.compile(r'(?:src|href)="([^"]+)"')


def check_relative_assets() -> list[str]:
    problems = []
    html = HTML.read_text()
    for ref in REF_RE.findall(html):
        if ref.startswith(("http://", "https://", "#", "data:")):
            continue
        if ref.startswith("/"):
            problems.append(f'{HTML.name}: absolute path "{ref}" (use "{ref.lstrip("/")}")')
            continue
        if not (FRONTEND / ref).exists():
            problems.append(f'{HTML.name}: referenced file missing: {ref}')
    return problems


def check_no_emoji() -> list[str]:
    problems = []
    for name in SOURCE_FILES:
        path = FRONTEND / name
        if not path.exists():
            continue
        for lineno, line in enumerate(path.read_text().split("\n"), 1):
            hits = {c for c in line if ord(c) > 0x2190 and c not in "\u2192\u2190"}
            if hits:
                problems.append(f"{name}:{lineno}: emoji {sorted(hits)} — use window.icon()")
    return problems


def check_data_icons() -> list[str]:
    problems = []
    data = FRONTEND / "data" / "chimdata.js"
    if not data.exists():
        return [f"{data.name} missing — run tools/export_static_data.py"]
    for lineno, line in enumerate(data.read_text().split("\n"), 1):
        hits = {c for c in line if ord(c) > 0x2190}
        if hits:
            problems.append(f"data/chimdata.js:{lineno}: emoji {sorted(hits)} — regenerate the data")
    return problems


def main() -> None:
    problems = check_relative_assets() + check_no_emoji() + check_data_icons()
    if problems:
        print("FAILED asset/icon checks:\n")
        for p in problems:
            print("  -", p)
        sys.exit(1)
    print("OK  asset paths are relative and all referenced files exist")
    print("OK  no emoji used as UI icons or currency")
    print("OK  generated data uses icon names")


if __name__ == "__main__":
    main()
