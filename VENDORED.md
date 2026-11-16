# Vendored code

## pixelfx

| | |
| --- | --- |
| Upstream | https://github.com/patch-gg/pixelfx |
| Version | 0.3.1 (`pixelfx/package.json`, `pixelfx/.claude-plugin/plugin.json`) |
| Commit | `5294518ce7c72e48b6100a744596e0acf57f2826` — "Link pixelfx's page on Patch (#13)", 2026-11-12 |
| Vendored on | 2026-11-16 |
| Path | `pixelfx/` |
| License | MIT — see `pixelfx/LICENSE` and `pixelfx/NOTICE.md` |

Kept as a faithful copy so the pixelfx skill works offline from this repo: `SKILL.md` expects to run inside a
pixelfx checkout with `tools/render.mjs` next to `src/`.

Removed from the upstream tree (not part of the library):

- `.git/`
- `.github/workflows/` (upstream CI; this repo installs nothing)

Upstream files are unmodified. Local additions in this repo live outside `pixelfx/`: `.claude/skills/pixelfx`
(a symlink to `pixelfx/skills/pixelfx`), and the root `README.md`.

### Updating

```bash
git clone --depth 1 https://github.com/patch-gg/pixelfx /tmp/pixelfx
cp -a /tmp/pixelfx/. pixelfx/ && rm -rf pixelfx/.git pixelfx/.github
```

Then bump the commit and date above. Generated output (`records/`, `sheets/`, `node_modules/`) is ignored by
`pixelfx/.gitignore` and is safe to delete.
