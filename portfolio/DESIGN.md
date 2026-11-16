# Design

The committed world for this page, and the reasons behind each decision. Written
in the shape the taste skill asks for: tokens first, then the trade-off behind
them, so the next person changes the page on purpose instead of by vibe.

Surface: **Experience** — a portfolio, where the visitor is inside the work and
the interface recedes. Product: the work of one game developer and pixel artist.

## World

A printed game manual that came with a cartridge. Paper and ink for the page,
ember for the one thing that should be touched, and one piece of key art framed
like a sleeve, lit from inside by its own scene.

Warm paper was chosen over the genre default of dark mode. A pixel portfolio on
near-black is the category's uniform; paper makes the art read as printed work
rather than a screenshot, and it makes the one lit scene the brightest thing on
the page instead of the darkest.

## Palette

| Token | Value | Role | On paper |
| --- | --- | --- | --- |
| paper | `#f4efe4` | page | — |
| paper-hi | `#fbf7ec` | cards, screen | — |
| paper-lo | `#e8dfce` | the tools band, art shadow | — |
| ink | `#16181f` | text, rules, bezel | 15.1:1 |
| ink-2 | `#31353f` | body text | 10.6:1 |
| muted | `#5c6572` | meta, captions | 5.0:1 |
| ember | `#b4441f` | the accent: markers, links, focus, the word "pixel" | 4.8:1 |
| moss / gold / slate | `#356049` / `#b98a1e` / `#616a77` | art and the game only, never chrome | — |

The accent covers a few percent of the page: the marker blocks, the word "pixel",
the primary button's hover neighbour, the selection colour, the focus ring, the
brick rows. Nothing glows. There are no hue gradients anywhere, on surfaces or in
text.

## Type

Three roles, no more:

- **Display — Paperboy.** A 5×7 bitmap face compiled to a 1.4KB WOFF2 by
  `tools/build-font.py`, from the same grid as the sprite mark. It is the
  page's own face, so headings are not the platform sans wearing a costume.
  Sizes are **20 / 30 / 40px only**, because 1 pixel = 0.1em: at 40px every font
  pixel is exactly 4 CSS px, at 30px exactly 3. Anything between smears the grid.
- **Body — the system sans.** Paragraphs, card blurbs, ledes. Measures 54–68ch.
- **Mono — data and labels.** The HUD, the table's figures, meta lines, tags,
  buttons. It earns its place where numbers, keys and measurements live.

Headings carry no kicker, no eyebrow, no `01 —` numbering. The heading is the
label; a small label above it is a decoration that costs the reader a line.

## Space and chrome

- 4px grid throughout; section padding 88px desktop / 64px mobile.
- Square corners, 2px ink rules, shadow `6px 6px 0 ink` (8px on the key art
  frame, 3–4px on buttons). The hard block shadow is deliberate here: this world is
  printed ink on paper, where a shadow has an edge and no blur. It is not the
  neobrutalist default borrowed wholesale — it is the only depth cue the world
  allows, and it is used at four sizes, never softened.
- One accent, one texture (a 12px grid at 5% on the sprite band), one signature:
  the 8px ember block with a 2px hard shadow. It appears twice — before the
  "currently learning" line and as the offset under the wordmark — and nowhere
  else.

## Motion

One authored entrance: the hero's four children and the key art rise 10px and
fade, staggered 60ms, 460ms, `cubic-bezier(0.22, 1, 0.36, 1)`. Hovers are 140ms
colour and transform changes, presses move 2px into their own shadow, and card
hover answers `:focus-within` too. Nothing loops. `prefers-reduced-motion` cuts
entrances and transitions to 1ms and stops smooth scrolling; the state change
still happens, instantly.

## Decisions

| Trigger | Decision | Reason |
| --- | --- | --- |
| Pixel art is the subject, and every stock pixel site is dark | Warm paper ground, ink text | The art has to look printed, not backlit. Paper also keeps the key art the only lit surface, so it reads as the one bright moment. |
| The page had a canvas minigame in the hero | Removed it; the hero is key art in a framed sleeve with a credits strip | A demo competes with the work it is meant to introduce. The scene is the argument, and the frame plus the credits strip gives it presence a bare screenshot does not. |
| `#tools` sat between two nav entries but had none of its own | Added a fifth nav link and a 2px read-position rule under the header | A one-page site's nav is the only map, and a section the map cannot reach is a dead end. The bar reuses the loading screen's track language instead of inventing a widget. |
| The copy button said "Copied" and nothing said it out loud | A `role="status"` line carries the confirmation | Changing a focused button's label is announced by some screen readers and dropped by others; a live region is the one mechanism that is not a guess. Colour only changes the button's border, never the message. |
| Every portfolio opens on a blank paint or a spinner | Open on a 72 × 48 bench press where one rep is 20% of the load | The first second is the only moment a visitor is guaranteed to look. A lift that is honestly tied to load — capped at 92% until the assets land — turns the wait into the character, and it is a static sprite sheet, not a game: nothing to click, nothing to win. |
| A generated illustration stood in for the person | Replace it with a sprite of the actual author, drawn from his photo (32 × 32 portrait in the sheet, 40 × 64 full body in About) | A portfolio's about section is the one place a stand-in is indefensible. The sprite is also the cheapest proof of the claim the sheet makes. |
| Art skill is a claim until you see the grid | A six-cell sprite sheet at 16×16, one palette, labelled | People who know the craft read a sprite sheet the way others read case studies. Nothing on it animates, so it is also the cheapest possible proof. |
| Card feet ended in "case study on request", which is not an action | Each foot is a mailto naming the project in the subject | A portfolio's job is to make the next step one click, and the link states what it does instead of leaving the visitor to guess the address. |
| Headings would otherwise be the platform sans | Author a 5×7 face and self-host it | A world this specific cannot borrow the system font for its voice. Compiling the bitmap that already draws the sprite costs 1.4KB and no network request. |
| The face is a grid | Sizes restricted to multiples of 10px | Whole-pixel blocks. A 34px heading would put every font pixel on a fractional boundary and undo the point of the face. |
| ui-ux-pro-max: the current section should be visible in the nav | Scroll-spy with `aria-current` | On a one-page site the nav is the only map; without it every link looks equally current. |
| Craft floor: no eyebrow above a heading, no section numbers | Deleted all five kickers, renumbered nothing, moved the location into the hero subhead | The ban is explicit, and the headings read stronger without a label arguing with them. |
| Craft floor: browser surfaces ship as someone else's defaults | Themed `::selection`, scrollbar, focus ring, underline offsets | Cheapest signal that a page was built. The scrollbar is square, 2px bordered, in the palette. |
| The four covers are 352×196 PNGs | Served as WebP with the PNG as fallback | Lossless WebP keeps the pixel grid exact; the fallback keeps older engines sharp. |

## Do not

Gradient text, coloured glows, emoji as icons, pill radii, a second accent,
section numbers, kickers above headings, looping motion, a dark-mode variant of
this same page.
