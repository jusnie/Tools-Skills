# Portfolio site

A one-page portfolio for Jusnie: paper and ink palette, 2px rules, hard offset
shadows, no rounded corners, and everything on the page drawn in code or cut
down to a single 35-colour palette.

Static files. No build step, no dependencies, no framework.

```
portfolio/
├── index.html              the page
├── styles.css              all styling, hand-written, one file
├── main.js                 menu, nav spy, copy button, Paddle
├── DESIGN.md               the committed world: tokens and the reasons behind them
├── assets/
│   ├── img/                key art + three scenes, WebP + PNG fallback
│   ├── fonts/              paperboy.woff2 (1.4KB) + .ttf, the display face
│   └── svg/                mark, favicon, six sheet sprites + the avatar pair
└── tools/
    ├── pixelfont.mjs       5×7 bitmap face → sprite mark, and the glyph dump
    ├── build-font.py       that bitmap → a real TTF/WOFF2 display face
    ├── avatar.sprite.json  the 16×16 mark, as ASCII art plus a colour key
    ├── sprites/            six 16×16 sprites for the sheet, same format
    │   ├── avatar.json      the 40×40 portrait, drawn from a photo
    │   └── avatar-full.json the 40×64 full body: hood, headphones, onyx v5 pants
    ├── preview.py          rasterizes the generated SVGs without a browser
    ├── build-images.sh     generated art → shared palette → pixel PNG
    ├── palette.txt         35 colours, in order
    ├── palette.png         the same list as a swatch, read by ImageMagick
    └── smoke.mjs           jsdom test: boots the page and plays the game
```

## Run it

```bash
python3 -m http.server 8000 --directory portfolio
```

Then open `http://localhost:8000`. Or serve the folder with anything else; it is
plain static HTML. `main.js` is a classic script, so it also runs from `file://`.

## The art

Two things carry the game-portfolio argument, both static:

- **Key art** (`assets/img/keyart.*`, 384 × 216) in a 2px frame with a credits
  strip — title, engine, status. No video, no canvas.
- **A sprite sheet** at `#art`: six 16 × 16 sprites plus the author's own 40 × 40
  portrait, authored as ASCII in `tools/sprites/*.json`, compiled to SVG by
  `tools/pixelfont.mjs`, and shown at 4× on the same 35 colours as the scenes.
  Change a sprite by editing its JSON and rerunning:

```bash
node tools/pixelfont.mjs --sprite tools/sprites/sheep.json --out assets/svg/sprite-sheep.svg --scale 1
python3 tools/preview.py assets/svg/sprite-sheep.svg /tmp/sheep.png 8   # look at it
```

## The face

Headings, the wordmark and the contact line are set in **Paperboy**, a 5×7 bitmap
face compiled from `tools/pixelfont.mjs` into `assets/fonts/paperboy.woff2`.
It is real text: it wraps, it is selectable, it is read by screen readers, and it
costs one 1.4KB request.

```bash
node tools/pixelfont.mjs --dump-glyphs > /tmp/glyphs.json
python3 tools/build-font.py /tmp/glyphs.json assets/fonts   # needs fonttools + brotli
python3 tools/build-font.py --help 2>/dev/null || true
```

1 pixel is 100 units on a 1000 unit em, so **only use sizes that are multiples of
10px** (20 / 30 / 40). 40px is 4px per font pixel, 30px is 3px; anything else puts
the grid on fractional pixels. The stylesheet has no display sizes outside that
set; keep it that way when you change the headline copy.

## Change the content

Everything is literal in `index.html`: name, email, projects, the "Now" list, the
footer. The wordmark and the contact line are ordinary text, so they are edited in
place. The sprite mark is generated:

```bash
node tools/pixelfont.mjs --sprite tools/avatar.sprite.json --out assets/svg/mark.svg --scale 2
```

## Change the art

Any generated scene goes through the same two steps: cut it down to a real pixel
grid, then force it onto the shared palette.

```bash
tools/build-images.sh ~/Desktop/meadowlight_raw.png meadowlight 352
```

`tools/palette.txt` holds the 35 colours; `tools/palette.png` is the same list as
a 35×1 swatch for ImageMagick's `-remap`. Adding a colour is fine, but add it to
both and regenerate every image, or the set drifts.

The covers are 352×196 and displayed larger, which is the point: the browser does
the scaling with neighbouring pixels, not a resampler.

## Tests

```bash
# syntax, dead selectors and a full game over, no browser needed
npm i jsdom
node tools/smoke.mjs

# rasterize the sprite mark to check it by eye
python3 tools/preview.py assets/svg/mark.svg /tmp/mark.png 8

# check the display face itself (needs pillow)
python3 -c "from PIL import ImageFont; ImageFont.truetype('assets/fonts/paperboy.ttf', 40)"
```

`smoke.mjs` boots `index.html` in jsdom and checks structure: one h1, four nav
links that all resolve, exactly one current section, six sprites, alt text
everywhere, no leftover canvas. Then it opens and closes the mobile menu and fails
on any runtime error. It checks every asset path too, `srcset` included.

## Deploy

Any static host. On Vercel, import the repo and set the project root to
`portfolio`; there is no build command and the output directory is the folder
itself. Then point `og:image` at an absolute URL, since relative Open Graph
images are ignored by most crawlers.

## Decisions

`DESIGN.md` holds the palette, type scale, spacing and — for each call that
mattered — the trigger, the decision and the reason. Read it before changing the
world; it is the difference between a refinement and a re-skin.

## Colours

| Token | Value | Used for |
| --- | --- | --- |
| paper | `#f4efe4` | page |
| paper-hi | `#fbf7ec` | cards, raised surfaces |
| paper-lo | `#e8dfce` | the tools band, shadows on paper |
| ink | `#16181f` | text, borders, the bezel, buttons |
| ink-2 | `#31353f` | body text, secondary |
| muted | `#5c6572` | meta and captions (5:1 on paper) |
| ember | `#b4441f` | the one accent: markers, links, focus |
| moss / gold | `#356049` / `#b98a1e` | art and the mock, never chrome |
