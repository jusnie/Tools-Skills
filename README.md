# Animation

Skills and tools for animation, kept in one place so an agent can pick them up straight from this repo.

## What's here

| Path | What it is |
| --- | --- |
| [`pixelfx/`](pixelfx/) | [pixelfx](https://github.com/patch-gg/pixelfx) v0.3.1 — 244 pixel art effects and animations, every one a small piece of code (fire, explosions, ice, lightning, melee, projectiles, weather, UI, pickups, critters…), plus sprite sheet export and a live gallery. |
| [`.claude/skills/pixelfx`](.claude/skills/pixelfx) | Symlink to `pixelfx/skills/pixelfx`, so Claude Code finds the **pixelfx skill** in this repo without copying it. |

Everything runs on plain Node (>= 18). No `npm install` needed: the render, list and check tools have no dependencies.
`esbuild` is only used to rebuild the gallery, and `ffmpeg` is only needed for `--gif` / `--mp4` previews.

## Use it

```bash
cd pixelfx

node tools/list.mjs frost                 # search the library by words
node tools/render.mjs fire/torch          # contact sheet -> records/fire/torch/contact.png
node tools/render.mjs ice/frost-nova --gif
node tools/render.mjs fire/explosion --sheet      # sprite sheet + Aseprite-style JSON for any engine
node tools/check.mjs ice/frost-nova       # spills, seams, unseeded randomness
node tools/serve.mjs                      # the gallery, locally
```

Options go through `--opts`, e.g. a blue fire:

```bash
node tools/render.mjs fire/torch --gif --opts '{"palette": ["#102","#215","#43a","#8cf","#cff","#fff"]}'
```

In a browser game the code is the effect — no image assets:

```js
import { createFrame, clearFrame, createFx, composite } from "pixelfx";
import * as frostNova from "pixelfx/fx/ice/frost-nova";
```

Full details: [`pixelfx/README.md`](pixelfx/README.md), the effect catalog in
[`pixelfx/docs/CATALOG.md`](pixelfx/docs/CATALOG.md), and the authoring contract in
[`pixelfx/docs/AUTHORING.md`](pixelfx/docs/AUTHORING.md).

## The skill

`pixelfx/skills/pixelfx/SKILL.md` teaches an agent to find, use, export and *make* effects — draft, render, look,
refine — instead of one-shotting them. It is already discoverable at `.claude/skills/pixelfx`.

To install it outside this repo, either point Claude Code at this checkout, or use upstream's plugin:

```
/plugin marketplace add patch-gg/pixelfx
/plugin install pixelfx@pixelfx
```

Then ask for what you want: *"a frost nova for my mage's ultimate"*, *"export the fire category as sprite sheets for
Godot"*, *"this hit effect feels floaty — make it punchier"*.

## License

pixelfx is MIT, code and effects, commercial use included. See [`pixelfx/LICENSE`](pixelfx/LICENSE) and
[`pixelfx/NOTICE.md`](pixelfx/NOTICE.md) — parts adapt Hugo Duprez's MIT effects and Hollow Crown's MIT source, and
the Patch Pixel font in `pixelfx/gallery/fonts` is Patch's own and not MIT.

Provenance of the vendored copy: [`VENDORED.md`](VENDORED.md).
