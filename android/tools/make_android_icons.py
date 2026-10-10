#!/usr/bin/env python3
"""Generate Android launcher icons from the shared ChimCode icon renderer.

Writes legacy mipmap PNGs (square + round) plus an adaptive-icon foreground
layer for every density bucket. Standard library only.
"""
from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent / "frontend" / "assets" / "icon"))
import make_icons  # noqa: E402

RES = HERE.parent / "app" / "src" / "main" / "res"

DENSITIES = {
    "mdpi": 48,
    "hdpi": 72,
    "xhdpi": 96,
    "xxhdpi": 144,
    "xxxhdpi": 192,
}

# Adaptive icon foreground is 108dp; the safe zone is the centre 72dp.
FOREGROUND = {
    "mdpi": 108,
    "hdpi": 162,
    "xhdpi": 216,
    "xxhdpi": 324,
    "xxxhdpi": 432,
}


def write(path: Path, size: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(make_icons.render(size))
    print("wrote", path.relative_to(RES), size)


def main() -> None:
    for bucket, size in DENSITIES.items():
        write(RES / f"mipmap-{bucket}" / "ic_launcher.png", size)
        write(RES / f"mipmap-{bucket}" / "ic_launcher_round.png", size)
    for bucket, size in FOREGROUND.items():
        write(RES / f"mipmap-{bucket}" / "ic_launcher_foreground.png", size)


if __name__ == "__main__":
    main()
