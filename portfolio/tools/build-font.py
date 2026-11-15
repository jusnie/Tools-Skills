#!/usr/bin/env python3
"""Build the site's display face from the same 5x7 bitmap as the lettering.

The page had no display voice of its own: headings fell back to the platform
sans, which is the one thing a page like this cannot borrow. This compiles the
bitmap in tools/pixelfont.mjs into a real TTF and WOFF2, so headings are the
authored face, stay selectable text, wrap normally and add no network request.

    1 pixel = 100 units, unitsPerEm 1000, cap height 700

Which means font sizes that are multiples of 10 draw whole-pixel blocks: 40px is
4px per pixel, 30px is 3px. Anything else smears the grid, so the stylesheet only
uses 20 / 30 / 40.

    node tools/pixelfont.mjs --dump-glyphs > /tmp/glyphs.json
    python3 tools/build-font.py /tmp/glyphs.json assets/fonts
"""

import json
import sys
from pathlib import Path

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

PX = 100  # units per bitmap pixel
UPEM = 1000
CAP = 7 * PX
FAMILY = "Paperboy"

# advance is the glyph plus two pixels of side bearing, so the face sets solid
ADVANCE = 7 * PX


def rect(pen, x, y, w, h):
    """One pixel run, clockwise, which is the TrueType direction for fill."""
    pen.moveTo(((x, y + h)))
    pen.lineTo(((x + w, y + h)))
    pen.lineTo(((x + w, y)))
    pen.lineTo((x, y))
    pen.closePath()


def runs(row):
    out, start = [], -1
    for i in range(len(row) + 1):
        on = i < len(row) and row[i] == "1"
        if on and start < 0:
            start = i
        if not on and start >= 0:
            out.append((start, i - start))
            start = -1
    return out


def glyph_for(bitmap, glyph_w, glyph_h):
    pen = TTGlyphPen(None)
    for row_index, row in enumerate(bitmap):
        y = (glyph_h - 1 - row_index) * PX
        for x, w in runs(row):
            rect(pen, x * PX, y, w * PX, PX)
    return pen.glyph()


def main():
    src = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/glyphs.json")
    out_dir = Path(sys.argv[2] if len(sys.argv) > 2 else "assets/fonts")
    out_dir.mkdir(parents=True, exist_ok=True)

    data = json.loads(src.read_text())
    glyphs, glyph_w, glyph_h = data["glyphs"], data["glyphW"], data["glyphH"]

    order = [".notdef"]
    cmap = {}
    name_to_char = {}
    for char, bitmap in glyphs.items():
        name = "space" if char == " " else f"uni{ord(char):04X}"
        cmap[ord(char)] = name
        name_to_char.setdefault(name, char)
        if char.isalpha():
            cmap[ord(char.lower())] = name
        if name not in order:
            order.append(name)

    fb = FontBuilder(UPEM, isTTF=True)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap(cmap)

    glyph_order = order
    glyf = {".notdef": glyph_for(["00000"] * glyph_h, glyph_w, glyph_h)}
    for name in glyph_order:
        if name == ".notdef":
            continue
        glyf[name] = glyph_for(glyphs[name_to_char[name]], glyph_w, glyph_h)

    fb.setupGlyf(glyf)
    fb.setupHorizontalMetrics({name: (ADVANCE, 0) for name in glyph_order})
    fb.setupHorizontalHeader(ascent=8 * PX, descent=-2 * PX)
    fb.setupNameTable(
        {
            "familyName": FAMILY,
            "styleName": "Regular",
            "uniqueFontIdentifier": f"{FAMILY}-Regular",
            "fullName": f"{FAMILY} Regular",
            "psName": f"{FAMILY}-Regular",
            "version": "Version 1.000",
            "designer": "Drawn from the 5x7 bitmap in portfolio/tools/pixelfont.mjs",
            "licenseDescription": "Same licence as the site it was drawn for.",
        }
    )
    fb.setupOS2(sTypoAscender=8 * PX, sTypoDescender=-2 * PX, usWinAscent=8 * PX, usWinDescent=2 * PX)
    fb.setupPost()
    fb.font["head"].created = fb.font["head"].modified = 0

    ttf = out_dir / "paperboy.ttf"
    fb.save(ttf)
    fb.font.flavor = "woff2"
    fb.save(out_dir / "paperboy.woff2")

    for path in (ttf, out_dir / "paperboy.woff2"):
        print(f"{path} {path.stat().st_size / 1024:.1f}KB")


if __name__ == "__main__":
    main()
