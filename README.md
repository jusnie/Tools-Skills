# Tools-Skills

A home for agent skills, usable with Claude Code, Codex and Google Antigravity,
and for the things they build.

## Site

[`portfolio/`](portfolio) — a one-page game portfolio in paper, ink and pixel art:
key art in a framed sleeve, four projects, a sprite sheet drawn at 16 × 16,
a 40 × 64 character of the author, an authored display face, and a bench-press
loading screen whose reps are the load percentage. Static HTML, CSS and one small script. Run it with
`python3 -m http.server 8000 --directory portfolio`.

## Skills

| Skill | What it does | License | Source |
| --- | --- | --- | --- |
| [`unslop`](skills/unslop/SKILL.md) | Finds the AI-looking UI tells, sets a direction from the product, then fixes spacing, color, icons, copy, type, layout, details, visuals and motion in that order. | CC BY 4.0 | [heydamir/unslop](https://github.com/heydamir/unslop) |
| [`impeccable`](skills/impeccable/SKILL.md) | A design director's vocabulary: 24 commands (shape, critique, audit, polish, bolder, quieter, distill, animate, document…), a craft floor with absolute bans, and 45 references. | Apache 2.0 | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) |
| [`ui-ux-pro-max`](skills/ui-ux-pro-max/SKILL.md) | Searchable local design intelligence: 80 styles, 192 product palettes, 74 font pairings, 120 UX rules, 25 chart types, 22 stacks. Runs offline with Python. | MIT | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) |
| [`taste`](skills/taste/SKILL.md) | Reverse-engineers a site's design DNA into tokens plus the trigger → decision → reason behind them. Needs the Playwright MCP server to capture a page. | MIT (per README) | [senlindesign/taste-skill](https://github.com/senlindesign/taste-skill) |

Attribution, licences and any changes are in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

## Install

### Claude Code, as a plugin (installs every skill in this repo)

```bash
claude plugin marketplace add jusnie/Tools-Skills
claude plugin install tools-skills@tools-skills
```

Add `--scope project` to install it for everyone working in the current project, or `--scope local` for just that project copy. Then start a new session, or run `/reload-plugins`.

Update later with `claude plugin update tools-skills@tools-skills`.

### Claude Code, one skill by hand

```bash
git clone https://github.com/jusnie/Tools-Skills
mkdir -p ~/.claude/skills && cp -r Tools-Skills/skills/unslop ~/.claude/skills/
```

For a single project, copy it into `.claude/skills/` inside that project instead.

### Codex

```bash
$skill-installer install https://github.com/jusnie/Tools-Skills/tree/main/skills/unslop
```

Or by hand into `~/.agents/skills/` (global) or `.agents/skills/` (one project):

```bash
mkdir -p ~/.agents/skills && cp -r Tools-Skills/skills/unslop ~/.agents/skills/
```

### Google Antigravity

```bash
mkdir -p ~/.gemini/config/skills && cp -r Tools-Skills/skills/unslop ~/.gemini/config/skills/
```

## Use

In Claude Code type `/unslop` with what you want; in Codex type `$unslop`. Or just ask in your own words.

```
/unslop this dashboard
/unslop the hero of https://example.com
/unslop my landing page and make the story video so I can post it
```

## Optional extras

Snapshotting a live URL and the story video need Playwright with Chromium; the video also needs ffmpeg on your `PATH`. Install them in the project where you run the skill:

```bash
npm install -D playwright
npx playwright install chromium
```

## Attribution and license

`skills/unslop` is by Damir Sokolovsky ([@heydamir](https://x.com/heydamir)), taken from [heydamir/unslop](https://github.com/heydamir/unslop) and licensed under [CC BY 4.0](skills/unslop/LICENSE). The credit inside `SKILL.md` is kept as the license requires. See [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
