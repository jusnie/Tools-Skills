# Animation

Persona 3-style personal site (React + Vite) cloned from
[blairxu13/persona3-website](https://github.com/blairxu13/persona3-website) for previewing
in this workspace.

## Running the live preview

```bash
cd persona3-website
npm install
npm run dev        # dev server on 0.0.0.0:5173
```

`vite.config.js` is set up for sandbox/preview hosting (`host: 0.0.0.0`, `allowedHosts: true`)
so the proxied preview URL can reach the dev server.

## Notes on assets

The upstream repo git-ignores three large videos (`src/assets/Mainn.mp4`, `main2.mp4`,
`main3.mp4`) that live in a Google Drive folder linked from the upstream README. Those files
are not in the repository and the sandbox cannot reach Google Drive, so they are symlinked to
the bundled `main1.mp4` here. Every other asset (characters, icons, photos) ship with the repo.

To use the real videos, drop `Mainn.mp4`, `main2.mp4` and `main3.mp4` into
`persona3-website/src/assets/`, replacing the symlinks.

The clone is listed in `.gitignore` (it is a nested upstream repo with ~34 MB of media), so this
repo only tracks this README and ignore rules.
