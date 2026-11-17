#!/usr/bin/env python3
"""Generate the 64x64 alien spaceship texture.
UV layout (matches alien_ship.geo.json):
  (0,0) main disc | (0,16) upper disc | (32,16) dome | (48,16) dome top
  (0,32) bottom core | (16,32) light ring | (32,32) antenna | (48,32) pods
"""
from PIL import Image, ImageDraw
import os

BASE = os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(BASE, "ArenaBlaster_RP", "textures", "entity", "alien_ship.png")

img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

def region(x0, y0, base, panel=None):
    for y in range(16):
        for x in range(16):
            img.putpixel((x0 + x, y0 + y), base + (255,))
    if panel:
        for i in range(0, 16, 4):
            d.line([(x0 + i, y0), (x0 + i, y0 + 15)], fill=panel + (255,))
            d.line([(x0, y0 + i), (x0 + 15, y0 + i)], fill=panel + (255,))

# Main disc - dark hull with cyan lights around edge
region(0, 0, (45, 52, 70), panel=(30, 35, 50))
for i in range(0, 16, 3):
    d.rectangle([i, 0, i + 1, 1], fill=(0, 229, 255, 255))
    d.rectangle([i, 14, i + 1, 15], fill=(0, 229, 255, 255))
    d.rectangle([0, i, 1, i + 1], fill=(0, 229, 255, 255))
    d.rectangle([14, i, 15, i + 1], fill=(0, 229, 255, 255))

# Upper disc - lighter metal
region(0, 16, (60, 70, 95), panel=(45, 52, 70))
d.rectangle([4, 20, 11, 27], outline=(0, 229, 255, 255), width=1)

# Dome - glass cyan
region(32, 16, (0, 180, 220), panel=(0, 140, 180))
d.rectangle([36, 20, 43, 27], fill=(180, 250, 255, 255))

# Dome top - metal + cyan tip
region(48, 16, (45, 52, 70), panel=(30, 35, 50))
d.rectangle([52, 20, 59, 23], fill=(0, 229, 255, 255))

# Bottom core - orange glow (beam emitter)
region(0, 32, (255, 106, 0), panel=(204, 85, 0))
d.rectangle([4, 36, 11, 43], fill=(255, 196, 0, 255))
d.rectangle([6, 38, 9, 41], fill=(255, 255, 255, 255))

# Light ring - cyan strip
region(16, 32, (0, 229, 255), panel=(0, 176, 204))
d.rectangle([18, 38, 29, 40], fill=(255, 255, 255, 255))

# Antenna - metal
region(32, 32, (60, 70, 95), panel=(45, 52, 70))
d.rectangle([36, 36, 39, 39], fill=(255, 106, 0, 255))

# Side pods - metal with orange lights
region(48, 32, (45, 52, 70), panel=(30, 35, 50))
d.rectangle([52, 36, 55, 39], fill=(255, 106, 0, 255))
d.rectangle([56, 36, 59, 39], fill=(255, 106, 0, 255))

os.makedirs(os.path.dirname(OUT), exist_ok=True)

# --- extra UV regions used by the enlarged 12-cube hull ---
def flat(x0, y0, base, panel=None):
    for y in range(16):
        for x in range(16):
            img.putpixel((x0 + x, y0 + y), base + (255,))
    if panel:
        for i in range(0, 16, 4):
            d.line([(x0 + i, y0), (x0 + i, y0 + 15)], fill=panel + (255,))
            d.line([(x0, y0 + i), (x0 + 15, y0 + i)], fill=panel + (255,))

flat(0, 0, (45, 52, 70), panel=(30, 35, 50))     # lower hull
flat(0, 31, (58, 68, 92), panel=(42, 50, 68))    # mid hull / engine pod
flat(32, 0, (34, 40, 55), panel=(22, 26, 38))    # fins / dark plates
flat(32, 31, (38, 44, 60), panel=(26, 30, 44))   # belly
flat(48, 31, (60, 70, 95), panel=(45, 52, 70))   # core housing

# cyan rim lights on the hull plates
for i in range(0, 16, 3):
    img.putpixel((i, 31), (0, 229, 255, 255))
    img.putpixel((i, 0), (0, 229, 255, 255))
    img.putpixel((32 + i, 31), (0, 229, 255, 255))

# glowing core
for y in range(32, 47):
    for x in range(34, 46):
        d.point((x, y), fill=(140, 245, 255, 255))
d.rectangle([35, 33, 45, 46], fill=(0, 229, 255, 255))
d.rectangle([37, 35, 43, 44], fill=(220, 255, 255, 255))

img.save(OUT)
print(f"saved {OUT} {img.size}")
