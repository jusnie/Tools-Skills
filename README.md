# Animation

Persona 3-style personal site (React + Vite), cloned from
[blairxu13/persona3-website](https://github.com/blairxu13/persona3-website) and made responsive.

## Running the live preview

```bash
cd persona3-website
npm install
npm run dev        # dev server on 0.0.0.0:5173
```

`vite.config.js` is set up for sandbox/preview hosting (`host: 0.0.0.0`, `allowedHosts: true`)
so the proxied preview URL can reach the dev server.

## Responsive — same UI on every platform

The design is unchanged: same video backgrounds, same skewed Anton menu, same bar-list pages, same
transitions. It now scales to fit phones, tablets and laptops instead of only a wide desktop.

**Menu (`src/P3Menu.jsx`)** — the whole menu is laid out at its authored size and then scaled
proportionally with a stage factor:

```js
k = clamp(min(window.innerWidth / 860, window.innerHeight / 760))   // 0.34 … 1
```

Label sizes, highlight shapes, row offsets, padding, the rotated name tag and the footer hints are
all multiplied by `k`, so the composition stays identical at any size (desktop `k = 1`, a 390 px
phone lands around `k = 0.45`). On touch devices the hint bar reads `TAP SELECT` instead of
`↑↓ / ↵`.

**Pages (`AboutMe`, `Socials`, `ResumePage`)** — widths were already `vw`-based, so the fixed `px`
typography and heights are adjusted with media queries appended to each component's style block:

| Breakpoint | What changes |
| --- | --- |
| ≤1100 px | bars 64vw, smaller role/label/stat type, scaled nav + info bar, smaller reveal panel |
| ≤640 px | bars 98vw, phone-sized type, character cut-outs hidden so text stays readable, reveal panel de-rotated to −6° |
| ≤560 px tall (landscape) | bars 38px, resume list on the left with the detail panel beside it |

Desktop (≥1100 px wide) is untouched — the same pixels as the original repo.

**`src/ComingSoon.jsx`** — the menu links to `/github` and `/sideproj`, which the source repo never
built. They used to render a blank page; a catch-all route now sends them to a P3-styled notice.

## Notes on assets

The upstream repo git-ignores three large videos (`src/assets/Mainn.mp4`, `main2.mp4`,
`main3.mp4`) that live in a Google Drive folder linked from the upstream README. Those files are
not in the repository and the sandbox cannot reach Google Drive, so they are symlinked to the
bundled `main1.mp4` here — every page does play a background video, just not the exact clip the
author used. All other assets (characters, icons, photos, tarot card) ship with the repo.

To use the real clips, drop `Mainn.mp4`, `main2.mp4` and `main3.mp4` into
`persona3-website/src/assets/`, replacing the symlinks.

The clone is listed in `.gitignore` (nested upstream repo with ~34 MB of third-party media), so this
repo tracks this README and the ignore rules only; the site itself lives in the workspace.
