#!/usr/bin/env python3
"""Generate all PNG textures for Arena Blaster addon."""
from PIL import Image, ImageDraw
import math, os

BASE = os.path.join(os.path.dirname(__file__), "..")
RP = os.path.join(BASE, "ArenaBlaster_RP")
BP = os.path.join(BASE, "ArenaBlaster_BP")

def save(img, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path)
    print(f"saved {path} {img.size}")

# ---------- Item: Instellar Arena Device (16x16) ----------
def make_item():
    img = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # Body - dark metal blaster shape (diagonal gun)
    # Main barrel
    d.rectangle([2, 6, 13, 9], fill=(45, 52, 70, 255))      # body
    d.rectangle([10, 5, 14, 10], fill=(60, 70, 95, 255))    # head
    d.rectangle([12, 6, 15, 8], fill=(30, 35, 50, 255))     # muzzle
    # Cyan core / lens
    d.rectangle([11, 6, 13, 8], fill=(0, 229, 255, 255))
    d.rectangle([11, 6, 12, 7], fill=(180, 250, 255, 255))
    # Orange energy cell
    d.rectangle([5, 7, 8, 8], fill=(255, 106, 0, 255))
    d.rectangle([5, 7, 6, 7], fill=(255, 196, 0, 255))
    # Grip
    d.rectangle([4, 9, 6, 13], fill=(35, 40, 55, 255))
    d.rectangle([4, 9, 5, 12], fill=(55, 65, 85, 255))
    # Top fin / antenna
    d.rectangle([7, 3, 8, 6], fill=(60, 70, 95, 255))
    d.rectangle([7, 2, 8, 3], fill=(0, 229, 255, 255))
    # Side details
    d.rectangle([2, 6, 3, 9], fill=(90, 100, 130, 255))
    d.rectangle([8, 9, 10, 10], fill=(0, 229, 255, 255))
    # Outline pixels
    d.point((2, 6), fill=(15, 18, 28, 255))
    d.point((13, 5), fill=(15, 18, 28, 255))
    d.point((15, 8), fill=(15, 18, 28, 255))
    save(img, os.path.join(RP, "textures/items/instellar_device.png"))

# ---------- Particle textures (16x16, white so tint works) ----------
def make_particle(name, kind):
    img = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx, cy = 8, 8
    if kind == "dot":
        for y in range(16):
            for x in range(16):
                dist = math.hypot(x - cx, y - cy)
                if dist <= 5:
                    alpha = int(255 * (1 - dist / 6))
                    img.putpixel((x, y), (255, 255, 255, max(0, alpha)))
    elif kind == "ring":
        for y in range(16):
            for x in range(16):
                dist = math.hypot(x - cx, y - cy)
                if 4 <= dist <= 7:
                    alpha = int(255 * (1 - abs(dist - 5.5) / 2))
                    img.putpixel((x, y), (255, 255, 255, max(0, min(255, alpha))))
    elif kind == "spark":
        # 4-point star
        for i in range(16):
            d.line([(8, 1), (8, 15)], fill=(255, 255, 255, 200), width=1)
            d.line([(1, 8), (15, 8)], fill=(255, 255, 255, 200), width=1)
        for y in range(16):
            for x in range(16):
                dist = math.hypot(x - cx, y - cy)
                if dist <= 2:
                    img.putpixel((x, y), (255, 255, 255, 255))
    save(img, os.path.join(RP, f"textures/particles/{name}.png"))

# ---------- Pack icons (256x256) ----------
def make_icon(path, title):
    img = Image.new("RGB", (256, 256), (15, 18, 32))
    d = ImageDraw.Draw(img)
    # Background gradient blocks
    for y in range(256):
        c = int(15 + (y / 256) * 30)
        d.line([(0, y), (256, y)], fill=(c, c + 5, c + 25))
    # Explosion burst
    cx, cy = 128, 110
    for r, col in [(70, (255, 61, 0)), (55, (255, 106, 0)), (40, (255, 196, 0)), (22, (255, 255, 255))]:
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)
    # Sparks lines
    for ang in range(0, 360, 30):
        rad = math.radians(ang)
        x1 = cx + math.cos(rad) * 75
        y1 = cy + math.sin(rad) * 75
        x2 = cx + math.cos(rad) * 105
        y2 = cy + math.sin(rad) * 105
        d.line([(x1, y1), (x2, y2)], fill=(255, 235, 59), width=6)
    # Ring at bottom
    d.ellipse([48, 175, 208, 215], outline=(0, 229, 255), width=8)
    d.ellipse([68, 185, 188, 205], outline=(0, 176, 255), width=5)
    # Device silhouette (simple gun)
    d.rectangle([78, 150, 178, 172], fill=(45, 52, 70))
    d.rectangle([150, 142, 185, 175], fill=(60, 70, 95))
    d.rectangle([160, 150, 175, 165], fill=(0, 229, 255))
    d.rectangle([95, 172, 112, 205], fill=(35, 40, 55))
    save(img, path)

if __name__ == "__main__":
    make_item()
    make_particle("explosion", "dot")
    make_particle("sparks", "spark")
    make_particle("ring", "ring")
    make_particle("beam", "dot")
    make_particle("charge", "dot")
    make_icon(os.path.join(BP, "pack_icon.png"), "BP")
    make_icon(os.path.join(RP, "pack_icon.png"), "RP")
    print("All textures generated!")
