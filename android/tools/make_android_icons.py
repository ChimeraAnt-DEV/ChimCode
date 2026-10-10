#!/usr/bin/env python3
"""Generate Android launcher icons from the shared vector icon art.

Writes legacy mipmap PNGs (square + round) plus adaptive-icon foreground and
background layers for every density bucket, rendering the same SVG used by the
web icon so web and Android stay identical.
"""
from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ICON_DIR = HERE.parent.parent / "frontend" / "assets" / "icon"
RES = HERE.parent / "app" / "src" / "main" / "res"

# Legacy launcher icon sizes (48dp baseline).
LEGACY = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
# Adaptive icon layers are 108dp.
ADAPTIVE = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}


def renderer() -> str:
    exe = shutil.which("rsvg-convert")
    if not exe:
        sys.exit("rsvg-convert is required (apt-get install librsvg2-bin)")
    return exe


def rasterize(svg: Path, size: int, out: Path) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [renderer(), "-w", str(size), "-h", str(size), str(svg), "-o", str(out)],
        check=True,
    )
    print("wrote", out.relative_to(RES), size)


def main() -> None:
    icon = ICON_DIR / "icon.svg"
    fg = ICON_DIR / "icon-foreground.svg"
    bg = ICON_DIR / "icon-background.svg"
    for path in (icon, fg, bg):
        if not path.exists():
            sys.exit(f"missing {path}")

    for bucket, size in LEGACY.items():
        rasterize(icon, size, RES / f"mipmap-{bucket}" / "ic_launcher.png")
        rasterize(icon, size, RES / f"mipmap-{bucket}" / "ic_launcher_round.png")
    for bucket, size in ADAPTIVE.items():
        rasterize(fg, size, RES / f"mipmap-{bucket}" / "ic_launcher_foreground.png")
        rasterize(bg, size, RES / f"mipmap-{bucket}" / "ic_launcher_background.png")


if __name__ == "__main__":
    main()
