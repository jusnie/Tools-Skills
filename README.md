# Animation

Persona 3-style personal site (React + Vite), cloned from
[blairxu13/persona3-website](https://github.com/blairxu13/persona3-website) and extended so it
works on every platform instead of only on a laptop.

## Running the live preview

```bash
cd persona3-website
npm install
npm run dev        # dev server on 0.0.0.0:5173
```

`vite.config.js` is set up for sandbox/preview hosting (`host: 0.0.0.0`, `allowedHosts: true`)
so the proxied preview URL can reach the dev server.

## One site, three interfaces

The original build is a fixed 100vh, hover + arrow-key UI. It now picks a UI per platform in
`src/useDevice.js` (`mobile` / `tablet` / `desktop`), so each device gets something designed for
it rather than a squashed desktop page.

| Platform | Detection | Interface |
| --- | --- | --- |
| Desktop | ≥1200px wide, ≥700px tall, fine pointer | Original art-directed build: video menu, skewed Anton rows, hover + ↑↓/↵ navigation, bar-list pages |
| Tablet | 768–1200px, or a coarse-pointer device under 1440px | Compact list + live art preview pane; scrollable accordion pages with a sticky character panel |
| Phone | <768px wide or <520px tall (incl. landscape phones) | Portrait touch UI: HUD brand + clock, thumb-sized tap targets, accordion cards, scrollable pages |

Compact UIs live in `src/compact/`:

- `CompactMenu.jsx` – tap-to-select menu with a live clock and per-entry preview art on tablets
- `CompactPage.jsx` – shared chrome (back button, scroll column, side art, swipe-right to go back)
- `CompactAbout.jsx` / `CompactSocials.jsx` / `CompactResume.jsx` – accordion pages that reuse the
  same content constants as the desktop pages (`ITEMS`, `REVEAL_CONTENT`, `EDUCATION_ROWS`, …), so
  editing copy once updates every platform
- `Accordion.jsx`, `AmbientBg.jsx`, `compact.css` – shared touch components and styling

Other platform work:

- `PageTransition.jsx` gets a portrait `compact` transition (vertical slabs) and honours
  `prefers-reduced-motion`
- `ComingSoon.jsx` catches `/github`, `/sideproj` and unknown routes — those menu entries were
  dead ends before
- Safe-area insets (`env(safe-area-inset-*)`), `100dvh` heights, `viewport-fit=cover`, theme color,
  no 300ms tap delay, and no autoplaying 28 MB video on phones (compact pages use stills instead)

## Notes on assets

The upstream repo git-ignores three large videos (`src/assets/Mainn.mp4`, `main2.mp4`,
`main3.mp4`) that live in a Google Drive folder linked from the upstream README. Those files are
not in the repository and the sandbox cannot reach Google Drive, so they are symlinked to the
bundled `main1.mp4` here. Every other asset (characters, icons, photos, tarot card) ships with the
repo.

To use the real videos, drop `Mainn.mp4`, `main2.mp4` and `main3.mp4` into
`persona3-website/src/assets/`, replacing the symlinks.

The clone is listed in `.gitignore` (nested upstream repo with ~34 MB of third-party media), so this
repo tracks this README and the ignore rules only; the site itself lives in the workspace.
