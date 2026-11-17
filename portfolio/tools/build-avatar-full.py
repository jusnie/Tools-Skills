#!/usr/bin/env python3
"""Draws the About sprite: the author in a fighting-game guard stance, 80 x 112.

Built from a capsule skeleton rather than stacked blocks, so limbs bend and
taper, then shaded once per limb with hard cel bands (light from the upper
left) and outlined with selout - each contour takes a dark tone of the
material it wraps instead of flat black.

    python3 tools/build-avatar-full.py

Writes tools/sprites/avatar-full.json, which pixelfont.mjs turns into SVG:

See the "The About sprite" section in README.md for the full command pair.
"""

import json
import math
import os

W, H = 80, 112

RAMP = {
 'hood': ['#6a7d9e', '#45546e', '#2a3346', '#191f2b'],
 'hoodd':['#4b5870', '#313b4c', '#1d2531', '#12171f'],
 'skin': ['#f8d5b0', '#e4b083', '#c08a5c', '#96643c'],
 'hair': ['#414861', '#2a2f42', '#181b27', '#0f111a'],
 'cup':  ['#4e5a6f', '#303a4a', '#181f29', '#0c1017'],
 'cyan': ['#bff6ff', '#5ecfea', '#2f9cbd', '#1a6a83'],
 'pant': ['#3d5384', '#283c66', '#182646', '#0f1728'],
 'shoe': ['#ffffff', '#f1ece2', '#cdc6b8', '#9a9488'],
 'lip':  ['#96604f', '#6f4038', '#4b2721'],
}
SEL = {'hood':'#0a0d13','hoodd':'#080b10','skin':'#6b3f27','hair':'#090b12',
       'cup':'#04060a','cyan':'#0f4c60','pant':'#070d18','shoe':'#4a473f','lip':'#3a1c17'}

cells = [[None]*W for _ in range(H)]
over = {}

def put(x, y, sid, mat):
    if 0 <= x < W and 0 <= y < H: cells[y][x] = (sid, mat)

def disc(sid, mat, cx, cy, r):
    for y in range(int(cy-r)-1, int(cy+r)+2):
        for x in range(int(cx-r)-1, int(cx+r)+2):
            if (x-cx)**2 + (y-cy)**2 <= r*r: put(x, y, sid, mat)

def cap(sid, mat, p0, p1, r0, r1=None):
    (x0,y0),(x1,y1) = p0, p1
    r1 = r0 if r1 is None else r1
    n = int(math.hypot(x1-x0, y1-y0) * 3) + 1
    for i in range(n+1):
        t = i/n
        disc(sid, mat, x0+(x1-x0)*t, y0+(y1-y0)*t, r0+(r1-r0)*t)

def shape(sid, mat, y0, y1, xa0, xb0, xa1, xb1):
    for y in range(y0, y1+1):
        t = (y-y0)/max(1, y1-y0)
        a = round(xa0+(xa1-xa0)*t); b = round(xb0+(xb1-xb0)*t)
        for x in range(min(a,b), max(a,b)+1): put(x, y, sid, mat)

def rrect(sid, mat, y0, y1, x0, x1, cut=1):
    for y in range(y0, y1+1):
        c = cut if y in (y0, y1) else 0
        for x in range(x0+c, x1-c+1): put(x, y, sid, mat)

# ============ body (back to front) ============
shape('cowl','hoodd', 9, 25, 28, 52, 24, 56)
shape('neck','skin', 30, 33, 38, 42, 38, 42)

# torso: shoulders -> waist -> hem (waist narrows, hem flares)
shape('tor', 'hood', 31, 39, 23, 57, 26, 54)
shape('tor2','hood', 39, 47, 26, 54, 32, 48)
shape('tor3','hood', 47, 61, 32, 48, 30, 50)

# arms: shoulder -> elbow -> wrist
cap('armL', 'hood', (26,34), (18,49), 4.5)
cap('defL', 'hood', (18,49), (26,41), 4)
cap('armR', 'hood', (55,35), (61,50), 4.5)
cap('defR', 'hood', (61,50), (56,63), 4)

# hips and legs
shape('hips','pant', 61, 67, 31, 49, 30, 50)
cap('legL','pant', (37,65), (31,83), 6.5)
cap('legL2','pant',(31,83), (27,101), 6, 5.5)
cap('legR','pant', (43,65), (51,85), 6.5)
cap('legR2','pant',(51,85), (55,100), 6, 5.5)
rrect('shoeL','shoe', 100, 107, 15, 34, cut=1)
rrect('shoeR','shoe',  99, 106, 47, 68, cut=1)

# fists: 8 wide x 7 tall, cut corners, so the hand is shorter than it is wide
rrect('fistL','skin', 34, 39, 23, 30, cut=1)
rrect('fistR','skin', 56, 61, 52, 59, cut=1)

# head: face 15 wide, hair tucked, cups hugging the skull
shape('hairB','hair',  5, 14, 35, 45, 31, 49)
shape('hairS','hair', 13, 24, 32, 50, 33, 49)
shape('face', 'skin', 10, 29, 33, 47, 36, 44)
shape('fringe','hair', 9, 16, 31, 49, 33, 47)
rrect('cupL','cup',  12, 28, 23, 31, cut=2)
rrect('cupR','cup',  12, 28, 49, 57, cut=2)
rrect('cupLi','cup', 16, 25, 25, 29, cut=1)
rrect('cupRi','cup', 16, 25, 51, 55, cut=1)

# ============ shading: one band pass per shape ============
per = {}
for y in range(H):
    for x in range(W):
        if cells[y][x]: per.setdefault(cells[y][x][0], {}).setdefault(y, []).append(x)

shade = [['.']*W for _ in range(H)]
for sid, ys in per.items():
    ylist = sorted(ys)
    for y in ylist:
        xs = ys[y]; a, b = min(xs), max(xs); mat = cells[y][xs[0]][1]; ramp = RAMP[mat]
        for x in xs:
            f = (x-a)/max(1, b-a)
            k = 0 if f < 0.24 else (1 if f < 0.58 else (2 if f < 0.86 else 3))
            k = min(k, len(ramp)-1)
            if y == ylist[0] and k > 0: k -= 1
            if y >= ylist[-1]-0 and len(ylist) > 3 and k < len(ramp)-1: k += 0
            shade[y][x] = ramp[k]

def px(x, y, c): over[(x, y)] = c

# ---- cloth folds ----
for (y, x0, x1) in ((45, 28, 34), (55, 33, 39)):
    for x in range(x0, x1+1): px(x, y, RAMP['hood'][2])
for (y, x0, x1) in ((73, 31, 37), (79, 32, 38), (87, 28, 33)):
    for x in range(x0, x1+1): px(x, y, RAMP['pant'][2])
# zip
for y in range(34, 60):
    px(39, y, RAMP['cyan'][1]); px(40, y, RAMP['cyan'][2])

for y in range(64, 69):                       # two hanging cords
    px(39, y, '#efe7d8'); px(41, y, '#efe7d8')
px(40, 64, '#efe7d8')
for y in (66, 68):
    px(39, y, '#cbc2b2'); px(41, y, '#cbc2b2')
# ---- cuffs / hem shadow ----
for x in range(30, 51): px(x, 60, RAMP['hood'][2])
for x in range(32, 49): px(x, 61, RAMP['hood'][3])
# ---- hands: knuckle row, short finger notches, thumb edge, wrist crease ----
for x in range(24, 30): px(x, 34, RAMP['skin'][1])       # knuckle tops
for x in (26, 28):
    px(x, 35, RAMP['skin'][2]); px(x, 36, RAMP['skin'][2])  # two short notches
for y in (35, 36): px(23, y, RAMP['skin'][2])               # thumb edge
px(24, 37, RAMP['skin'][2]); px(25, 37, RAMP['skin'][2]); px(26, 37, RAMP['skin'][2])
for x in range(24, 30): px(x, 38, RAMP['skin'][3])          # wrist crease
for x in range(23, 31): px(x, 39, RAMP['hood'][2])          # sleeve cuff, hand ends here
for x in range(53, 59): px(x, 56, RAMP['skin'][1])
for x in (55, 57):
    px(x, 57, RAMP['skin'][2]); px(x, 58, RAMP['skin'][2])
for y in (57, 58): px(52, y, RAMP['skin'][2])
px(53, 59, RAMP['skin'][2]); px(54, 59, RAMP['skin'][2]); px(55, 59, RAMP['skin'][2])
for x in range(53, 59): px(x, 60, RAMP['skin'][3])
for x in range(52, 60): px(x, 61, RAMP['hood'][2])

# ---- face: hairline y17, lash-line eyes, 1px nose, single-row mouth ----
for x in range(38, 48):                       # fringe casts a shadow down-right
    px(x, 17, RAMP['skin'][2])
for x in range(41, 48):
    px(x, 18, RAMP['skin'][2])
for xa in (34, 42):
    for x in range(xa, xa+4): px(x, 19, RAMP['hair'][2])
    for x in range(xa, xa+4):
        px(x, 20, RAMP['hair'][2]); px(x, 21, RAMP['hair'][1])
    px(xa, 20, '#f7f2e8'); px(xa+1, 20, '#f7f2e8')
    for x in range(xa, xa+4): px(x, 22, RAMP['skin'][2])
px(40, 24, RAMP['skin'][2]); px(40, 25, RAMP['skin'][1])
for x in range(37, 43): px(x, 26, RAMP['lip'][1])
for x in range(38, 42): px(x, 27, RAMP['skin'][2])

for x in range(36, 45): px(x, 30, RAMP['skin'][2])
for x in range(37, 44): px(x, 31, RAMP['skin'][3])

# ---- cups: lit crown + rim ----
for x0, x1 in ((23, 31), (49, 57)):
    for x in range(x0+2, x1-1): px(x, 13, RAMP['cup'][0]); px(x, 14, RAMP['cup'][0])
    for y in range(15, 27):
        if cells[y][x0+1] and cells[y][x0+1][1] == 'cup': px(x0+1, y, RAMP['cup'][0])
    for y in range(17, 24):
        px(x0+2, y, RAMP['cup'][3]); px(x1-2, y, RAMP['cup'][3])
# ---- sneakers: toe cap, sole, laces ----
for x in range(15, 35): px(x, 106, RAMP['shoe'][2])
for x in range(16, 34): px(x, 107, RAMP['shoe'][3])
for x in range(47, 69): px(x, 104, RAMP['shoe'][2])
for x in range(48, 68): px(x, 105, RAMP['shoe'][3])
for y in (102, 104): px(25, y, RAMP['shoe'][2]); px(27, y, RAMP['shoe'][2])
for y in (100, 102): px(57, y, RAMP['shoe'][2]); px(59, y, RAMP['shoe'][2])

# ============ compose + selout ============
out = [[shade[y][x] for x in range(W)] for y in range(H)]
for (x, y), c in over.items():
    if out[y][x] != '.': out[y][x] = c
final = [r[:] for r in out]
for y in range(H):
    for x in range(W):
        if out[y][x] != '.': continue
        for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
            nx, ny = x+dx, y+dy
            if 0 <= nx < W and 0 <= ny < H and out[ny][nx] != '.':
                final[y][x] = SEL[cells[ny][nx][1] if cells[ny][nx] else 'hood']; break

chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
seen, key, rows = {}, {}, []
for row in final:
    r = []
    for c in row:
        if c == '.': r.append('.'); continue
        if c not in seen: seen[c] = chars[len(seen)]; key[seen[c]] = c
        r.append(seen[c])
    rows.append(''.join(r))
out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sprites', 'avatar-full.json')
with open(out_path, 'w') as fh:
    json.dump({'art': rows, 'key': key, 'scale': 1}, fh, indent=1)
    fh.write('\n')
print('%s  %dx%d, %d colours' % (os.path.relpath(out_path), W, H, len(key)))
