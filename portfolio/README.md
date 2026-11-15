# Portfolio site

A one-page portfolio for Jusnie: paper and ink palette, 2px rules, hard offset
shadows, no rounded corners, and everything on the page drawn in code or cut
down to a single 35-colour palette.

Static files. No build step, no dependencies, no framework.

```
portfolio/
├── index.html              the page
├── styles.css              all styling, hand-written, one file
├── main.js                 menu, copy button, Paddle
├── assets/
│   ├── img/                four PNGs, stored at real pixel size (352×196, 176×96)
│   └── svg/                wordmark, contact lettering, sprite mark, favicon
└── tools/
    ├── pixelfont.mjs       5×7 bitmap face → SVG lettering and the sprite mark
    ├── avatar.sprite.json  the 16×16 sprite, as ASCII art plus a colour key
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

## The cabinet

`Paddle` is a real game on a 192 × 120 canvas, drawn with `fillRect` and scaled
up with `image-rendering: pixelated`, so the pixels stay square at any size.

- ← → or A / D move the paddle, space serves, P pauses, pointer and touch work too.
- Three lives, four waves of bricks, the ball speeds up as it goes.
- It pauses itself when the tab is hidden or the cabinet scrolls out of view.
- With `prefers-reduced-motion` there is no screen shake and no brick debris.
- Score and lives are real DOM text next to the canvas, and game events are
  announced through a polite live region, so the cabinet is not a black box.

## Change the content

Everything is literal in `index.html`: name, email, projects, the "Now" list, the
footer. Two things are generated and need a command to change:

```bash
node tools/pixelfont.mjs "JUSNIE" --out assets/svg/wordmark.svg --scale 3 --color "#16181f" --shadow "#c2532a"
node tools/pixelfont.mjs "LET'S TALK" --out assets/svg/lets-talk.svg --scale 4 --color "#16181f" --shadow "#c2532a"
node tools/pixelfont.mjs --sprite tools/avatar.sprite.json --out assets/svg/mark.svg --scale 2
```

The wordmark and the contact line are `<img>` tags, so update their `alt` and
their `width`/`height` when the text changes. Keep the scale an integer; the face
is a 5×7 grid and half pixels are the enemy.

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

# rasterize the lettering to check it by eye
python3 tools/preview.py assets/svg/wordmark.svg /tmp/wordmark.png 4
```

`smoke.mjs` boots `index.html` in jsdom with a stubbed canvas, starts the game,
serves, loses three lives, and checks the overlay, the HUD, pause/resume and the
mobile menu.

## Deploy

Any static host. On Vercel, import the repo and set the project root to
`portfolio`; there is no build command and the output directory is the folder
itself. Then point `og:image` at an absolute URL, since relative Open Graph
images are ignored by most crawlers.

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
