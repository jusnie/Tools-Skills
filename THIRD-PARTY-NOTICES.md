# Third-party notices

Skills in `skills/` are vendored copies of other people's work. Each keeps its
upstream licence file and its own attribution, and none of them has been edited
beyond what is noted here.

## unslop

- **Skill:** `skills/unslop`
- **Author:** Damir Sokolovsky ([@heydamir](https://x.com/heydamir), [heydamir.design/unslop](https://heydamir.design/unslop))
- **Source:** https://github.com/heydamir/unslop (`skills/unslop`)
- **License:** Creative Commons Attribution 4.0 International (CC BY 4.0), full text in [`skills/unslop/LICENSE`](skills/unslop/LICENSE)
- **Changes:** none to the skill content. The upstream `LICENSE` was copied alongside it.

CC BY 4.0 requires credit to the author and a link to the license when the work is
shared or adapted. Keep the author line at the top of `skills/unslop/SKILL.md`,
and this file, with any copy.

## impeccable

- **Skill:** `skills/impeccable`
- **Author:** Paul Bakaus ([impeccable.style](https://impeccable.style))
- **Source:** https://github.com/pbakaus/impeccable (`plugin/skills/impeccable`, v4.9.1)
- **License:** Apache License 2.0, full text in [`skills/impeccable/LICENSE`](skills/impeccable/LICENSE) and [`NOTICE.md`](skills/impeccable/NOTICE.md)
- **Changes:** none to the skill content. Copied from the plugin's built skill
  folder, which is what upstream ships to agents; the repo's Rust engine and its
  release artifacts are not vendored. `scripts/impeccable` is the launcher
  upstream ships, and it downloads its engine binary on first run, so the skill
  works without the engine by reading `reference/` directly (upstream documents
  that fallback in `SKILL.md`).

## ui-ux-pro-max

- **Skill:** `skills/ui-ux-pro-max`
- **Author:** NextLevelBuilder ([uupm.cc](https://uupm.cc))
- **Source:** https://github.com/nextlevelbuilder/ui-ux-pro-max-skill (`.claude/skills/ui-ux-pro-max`, v2.15.0)
- **License:** MIT, full text in [`skills/ui-ux-pro-max/LICENSE`](skills/ui-ux-pro-max/LICENSE)
- **Changes:** none to the skill content, data or scripts. The suite's other
  skills (`design`, `design-system`, `brand`, `ui-styling`, `slides`,
  `banner-design`) are not copied.

## taste

- **Skill:** `skills/taste`
- **Author:** Senlin ([senlindesign](https://github.com/senlindesign))
- **Source:** https://github.com/senlindesign/taste-skill (v1.1.0)
- **License:** MIT, as stated in the repository's README badge; upstream ships no
  `LICENSE` file, so the full text is not vendored. Treated as MIT.
- **Changes:** `SKILL.md` and `references/` only; the repo's demo site and
  `docs/` assets are not copied. The skill needs the Playwright MCP server to
  capture a page, which is a runtime dependency, not part of the copy.

## Images on the portfolio

The four scenes and the portrait in `portfolio/assets/img/` were generated for
this site, then reduced to one 35-colour palette with ImageMagick. They are not
third-party assets. `portfolio/assets/fonts/paperboy.*` is drawn from this
repository's own 5×7 bitmap in `portfolio/tools/pixelfont.mjs`.
