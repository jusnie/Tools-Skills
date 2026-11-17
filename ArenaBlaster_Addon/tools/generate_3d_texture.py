#!/usr/bin/env python3
"""Generate the polished 64x64 3D texture for the Instellar Arena Device.
UV layout (matches instellar_device.geo.json):
  (0,0) body | (16,0) barrel | (32,0) lens | (48,0) cell
  (0,16) grip | (16,16) fin | (32,16) muzzle | (48,16) rear
  (0,32) vent | (16,32) stripe
"""
from PIL import Image, ImageDraw
import os

BASE = os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(BASE, "ArenaBlaster_RP", "textures", "items", "instellar_device_3d.png")

img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

def region(x0, y0, base, panel=None, accent=None):
    """Fill a 16x16 region with base color + panel lines + accent."""
    for y in range(16):
        for x in range(16):
            img.putpixel((x0 + x, y0 + y), base + (255,))
    if panel:
        # panel lines every 4px
        for i in range(0, 16, 4):
            d.line([(x0 + i, y0), (x0 + i, y0 + 15)], fill=panel + (255,))
            d.line([(x0, y0 + i), (x0 + 15, y0 + i)], fill=panel + (255,))
    if accent:
        d.rectangle([x0 + 2, y0 + 2, x0 + 13, y0 + 13], outline=accent + (255,), width=1)

# Body metal - dark slate with panels + rivets
region(0, 0, (45, 52, 70), panel=(30, 35, 50), accent=(90, 100, 130))
for rx, ry in [(3, 3), (12, 3), (3, 12), (12, 12)]:
    d.rectangle([rx, ry, rx + 1, ry + 1], fill=(140, 155, 185, 255))

# Barrel - darker metal with rings
region(16, 0, (30, 35, 50), panel=(20, 24, 36))
for i in [3, 7, 11]:
    d.line([(16 + i, 0), (16 + i, 15)], fill=(60, 70, 95, 255), width=1)

# Lens - cyan glow
region(32, 0, (0, 229, 255), panel=(0, 176, 204))
d.rectangle([36, 4, 43, 11], fill=(180, 250, 255, 255))
d.rectangle([38, 6, 41, 9], fill=(255, 255, 255, 255))

# Energy cell - orange
region(48, 0, (255, 106, 0), panel=(204, 85, 0))
d.rectangle([52, 4, 59, 11], fill=(255, 196, 0, 255))
d.rectangle([54, 6, 57, 9], fill=(255, 255, 255, 255))

# Grip - dark rubber with grip lines
region(0, 16, (35, 40, 55), panel=(22, 26, 38))
for i in [3, 6, 9, 12]:
    d.line([(0, 16 + i), (15, 16 + i)], fill=(55, 65, 85, 255), width=1)

# Fin / sight - metal with cyan stripe
region(16, 16, (60, 70, 95), panel=(45, 52, 70))
d.rectangle([18, 22, 29, 24], fill=(0, 229, 255, 255))

# Muzzle ring - black with cyan stripe
region(32, 16, (20, 24, 36), panel=(10, 12, 20))
d.rectangle([34, 22, 45, 24], fill=(0, 229, 255, 255))

# Rear cap - metal with vents
region(48, 16, (45, 52, 70), panel=(30, 35, 50))
for i in [4, 8, 12]:
    d.line([(48, 16 + i), (63, 16 + i)], fill=(20, 24, 36, 255), width=1)

# Vent detail - dark with slats
region(0, 32, (25, 30, 44), panel=(15, 18, 28))
for i in [2, 5, 8, 11, 14]:
    d.line([(0, 32 + i), (15, 32 + i)], fill=(70, 80, 105, 255), width=1)

# Top stripe - cyan on dark
region(16, 32, (30, 35, 50), panel=(20, 24, 36))
d.rectangle([18, 38, 29, 40], fill=(0, 229, 255, 255))

os.makedirs(os.path.dirname(OUT), exist_ok=True)
img.save(OUT)
print(f"saved {OUT} {img.size}")
