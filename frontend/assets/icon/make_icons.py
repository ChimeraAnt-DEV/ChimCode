#!/usr/bin/env python3
"""Rasterize the ChimCode icon set from vector SVG.

The icon is designed once as clean vector art (icon.svg) and rendered at every
size with rsvg-convert, so it stays crisp instead of being drawn as pixels.
"""
from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SIZES = (16, 32, 48, 64, 128, 192, 256, 512, 1024)


def renderer() -> str:
    exe = shutil.which("rsvg-convert")
    if not exe:
        sys.exit("rsvg-convert is required (apt-get install librsvg2-bin)")
    return exe


def rasterize(svg: Path, size: int, out: Path) -> None:
    subprocess.run(
        [renderer(), "-w", str(size), "-h", str(size), str(svg), "-o", str(out)],
        check=True,
    )


def main() -> None:
    icon = HERE / "icon.svg"
    if not icon.exists():
        sys.exit("icon.svg missing")
    for size in SIZES:
        rasterize(icon, size, HERE / f"icon-{size}.png")
        print(f"icon-{size}.png")
    # The favicon is the same vector art.
    shutil.copyfile(icon, HERE / "favicon.svg")
    print("favicon.svg")


if __name__ == "__main__":
    main()
