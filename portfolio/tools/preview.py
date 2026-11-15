#!/usr/bin/env python3
"""Rasterize the pixel SVGs this project generates, without a browser.

Every shape pixelfont.mjs writes is an axis aligned `M x y h w v s h -w z` run,
so a handful of regexes is enough. Dev utility, not part of the site.

    python3 tools/preview.py assets/svg/mark.svg /tmp/mark.png 8
"""

import re
import subprocess
import sys

RUN = re.compile(r"M(-?\d+) (-?\d+)h(-?\d+)v(-?\d+)h(-?\d+)z")
PATH = re.compile(r'<path d="([^"]*)"(?: fill="([^"]+)")?')


def hex_rgb(value):
    value = value.lstrip("#")
    if len(value) == 3:
        value = "".join(c * 2 for c in value)
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def render(svg_text, zoom=1, background=(244, 239, 228)):
    size = re.search(r'width="(\d+)" height="(\d+)"', svg_text)
    if not size:
        raise SystemExit("no integer width/height on the svg")
    w, h = int(size.group(1)), int(size.group(2))
    px = [[background for _ in range(w)] for _ in range(h)]

    for d, fill in PATH.findall(svg_text):
        if not fill:
            continue
        colour = hex_rgb(fill)
        for x, y, rw, rh, back in RUN.findall(d):
            x, y, rw, rh = int(x), int(y), int(rw), int(rh)
            if back.lstrip("-") != str(rw):
                raise SystemExit(f"bad run in {d[:40]}: {rw} vs {back}")
            for yy in range(max(y, 0), min(y + rh, h)):
                for xx in range(max(x, 0), min(x + rw, w)):
                    px[yy][xx] = colour

    body = bytearray()
    for row in px:
        line = bytearray()
        for r, g, b in row:
            line.extend((r, g, b) * zoom)
        for _ in range(zoom):
            body.extend(line)
    header = f"P6\n{w * zoom} {h * zoom}\n255\n".encode()
    return header + bytes(body), w, h


def main():
    src, dst = sys.argv[1], sys.argv[2]
    zoom = int(sys.argv[3]) if len(sys.argv) > 3 else 1
    data, w, h = render(open(src).read(), zoom)
    proc = subprocess.run(["convert", "ppm:-", dst], input=data, check=True)
    print(f"{dst} {w * zoom}x{h * zoom} from {src}")
    return proc.returncode


if __name__ == "__main__":
    raise SystemExit(main())
