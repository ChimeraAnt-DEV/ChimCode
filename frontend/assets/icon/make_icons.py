"""Generate ChimCode app icons (PNG) with no external dependencies.

Draws the Mochi robot mark on a rounded gradient tile and writes RGBA PNGs
using only the standard library, so the build works anywhere.
"""
from __future__ import annotations

import math
import struct
import zlib
from pathlib import Path

OUT = Path(__file__).resolve().parent


def lerp(a, b, t):
    return a + (b - a) * t


def mix(c1, c2, t):
    return tuple(int(lerp(c1[i], c2[i], t)) for i in range(3))


def rounded_alpha(x, y, w, h, radius):
    cx = min(max(x, radius), w - radius)
    cy = min(max(y, radius), h - radius)
    dx, dy = x - cx, y - cy
    dist = (dx * dx + dy * dy) ** 0.5
    if dist <= radius - 1:
        return 1.0
    if dist >= radius + 1:
        return 0.0
    return (radius + 1 - dist) / 2


def circle_alpha(x, y, cx, cy, r):
    d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
    if d <= r - 1:
        return 1.0
    if d >= r + 1:
        return 0.0
    return (r + 1 - d) / 2


def blend(dst, src, a):
    return tuple(int(dst[i] * (1 - a) + src[i] * a) for i in range(3))


def render(size: int) -> bytes:
    s = size
    px = [[(0, 0, 0, 0)] * s for _ in range(s)]

    c1 = (124, 92, 255)
    c2 = (34, 211, 238)
    c3 = (244, 114, 182)

    for y in range(s):
        for x in range(s):
            t = (x + y) / (2 * s)
            col = mix(c1, c2, t / 0.5) if t < 0.5 else mix(c2, c3, (t - 0.5) / 0.5)
            alpha = rounded_alpha(x, y, s, s, s * 0.23)
            px[y][x] = (col[0], col[1], col[2], int(alpha * 255))

    plate = (12, 12, 26)
    inset = s * 0.14
    for y in range(s):
        for x in range(s):
            a = rounded_alpha(x, y, s, s, s * 0.23)
            if a <= 0:
                continue
            pa = rounded_alpha(x - inset, y - inset, s - 2 * inset, s - 2 * inset, s * 0.16)
            if pa > 0:
                r, g, b, _ = px[y][x]
                nr, ng, nb = blend((r, g, b), plate, pa * 0.92)
                px[y][x] = (nr, ng, nb, int(a * 255))

    visor = (8, 8, 18)
    vx0, vy0 = s * 0.20, s * 0.34
    vx1, vy1 = s * 0.80, s * 0.62
    for y in range(int(vy0), int(vy1)):
        for x in range(int(vx0), int(vx1)):
            pa = rounded_alpha(x - vx0, y - vy0, vx1 - vx0, vy1 - vy0, s * 0.10)
            if pa > 0:
                r, g, b, a = px[y][x]
                nr, ng, nb = blend((r, g, b), visor, pa)
                px[y][x] = (nr, ng, nb, a)

    glow = (34, 211, 238)
    for cx, cy in ((s * 0.37, s * 0.48), (s * 0.63, s * 0.48)):
        r_eye = s * 0.075
        for y in range(int(cy - r_eye * 2.4), int(cy + r_eye * 2.4)):
            for x in range(int(cx - r_eye * 2.4), int(cx + r_eye * 2.4)):
                if 0 <= x < s and 0 <= y < s:
                    d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
                    core = circle_alpha(x, y, cx, cy, r_eye)
                    halo = max(0.0, 1 - d / (r_eye * 2.4)) * 0.5
                    a = max(core, halo)
                    if a > 0:
                        rr, gg, bb, aa = px[y][x]
                        nr, ng, nb = blend((rr, gg, bb), glow, a)
                        px[y][x] = (nr, ng, nb, max(aa, int(255 * min(1, a + 0.3))))

    ax = s * 0.5
    for y in range(int(s * 0.10), int(s * 0.26)):
        for x in range(int(ax - s * 0.018), int(ax + s * 0.018)):
            if 0 <= x < s and 0 <= y < s:
                rr, gg, bb, aa = px[y][x]
                px[y][x] = (230, 235, 255, max(aa, 235))
    for y in range(s):
        for x in range(s):
            a = circle_alpha(x, y, ax, s * 0.095, s * 0.045)
            if a > 0:
                rr, gg, bb, aa = px[y][x]
                nr, ng, nb = blend((rr, gg, bb), (251, 191, 36), a)
                px[y][x] = (nr, ng, nb, max(aa, int(255 * min(1, a + 0.4))))

    for t in range(0, 180):
        ang = math.radians(200 + t * 0.78)
        mx = s * 0.5 + math.cos(ang) * s * 0.14
        my = s * 0.72 + math.sin(ang) * s * 0.09
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                x, y = int(mx + dx), int(my + dy)
                if 0 <= x < s and 0 <= y < s:
                    rr, gg, bb, aa = px[y][x]
                    nr, ng, nb = blend((rr, gg, bb), glow, 0.9)
                    px[y][x] = (nr, ng, nb, max(aa, 235))

    raw = bytearray()
    for y in range(s):
        raw.append(0)
        for x in range(s):
            r, g, b, a = px[y][x]
            raw += bytes((r, g, b, a))

    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", s, s, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b"")
    return png


def main() -> None:
    for size in (16, 32, 48, 64, 128, 192, 256, 512, 1024):
        data = render(size)
        (OUT / f"icon-{size}.png").write_bytes(data)
        print(f"icon-{size}.png", len(data), "bytes")


if __name__ == "__main__":
    main()
