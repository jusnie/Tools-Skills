#!/usr/bin/env node
/**
 * pixelfont.mjs — turns a string into a pixel-lettered SVG.
 *
 * The face is a 5x7 bitmap, drawn as merged horizontal runs so the output is a
 * handful of <path> subpaths instead of hundreds of <rect>s. Every glyph sits on
 * the same grid, so the result is crisp at any integer scale.
 *
 *   node tools/pixelfont.mjs "JUSNIE" --out assets/svg/wordmark.svg --scale 3 --shadow "#b4441f"
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const GLYPHS = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10011', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  2: ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  3: ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  5: ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  6: ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  9: ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ',': ['00000', '00000', '00000', '00000', '01100', '00100', '01000'],
  '-': ['00000', '00000', '00000', '01110', '00000', '00000', '00000'],
  "'": ['00100', '00100', '00000', '00000', '00000', '00000', '00000'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '·': ['00000', '00000', '00000', '01100', '01100', '00000', '00000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '?': ['01110', '10001', '00001', '00110', '00100', '00000', '00100'],
  '&': ['01100', '10010', '10100', '01000', '10101', '10010', '01101'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '=': ['00000', '00000', '11111', '00000', '11111', '00000', '00000'],
  '#': ['01010', '01010', '11111', '01010', '11111', '01010', '01010'],
};

const GLYPH_W = 5;
const GLYPH_H = 7;

/** Merge lit pixels of one row into runs: [[x, width], ...] */
function runs(row) {
  const out = [];
  let start = -1;
  for (let i = 0; i <= row.length; i += 1) {
    const on = row[i] === '1';
    if (on && start < 0) start = i;
    if (!on && start >= 0) {
      out.push([start, i - start]);
      start = -1;
    }
  }
  return out;
}

/** Build one path for a whole string. Returns { d, width }. */
function buildPath(text, { scale = 1, tracking = 1 } = {}) {
  const subpaths = [];
  let cursor = 0;
  for (const raw of text.toUpperCase()) {
    const glyph = GLYPHS[raw] ?? GLYPHS['?'];
    glyph.forEach((row, y) => {
      for (const [x, w] of runs(row)) {
        const px = (cursor + x) * scale;
        const py = y * scale;
        const pw = w * scale;
        subpaths.push(`M${px} ${py}h${pw}v${scale}h-${pw}z`);
      }
    });
    cursor += GLYPH_W + tracking;
  }
  const width = Math.max(cursor - tracking, 0) * scale;
  return { d: subpaths.join(''), width };
}

function svg(text, { scale = 3, tracking = 1, color = '#16181f', shadow = null, label = null } = {}) {
  const { d, width } = buildPath(text, { scale, tracking });
  const height = GLYPH_H * scale;
  const pad = shadow ? scale : 0;
  const shadowPath = shadow
    ? `<path d="${d}" fill="${shadow}" transform="translate(${scale} ${scale})"/>`
    : '';
  const title = label ? `<title>${label}</title>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width + pad}" height="${height + pad}" viewBox="0 0 ${width + pad} ${height + pad}" fill="none" shape-rendering="crispEdges">${title}${shadowPath}<path d="${d}" fill="${color}"/></svg>\n`;
}

/** Sprite: ASCII art + colour key -> SVG of same-colour runs per row. */
function sprite(art, key, scale = 1) {
  const w = Math.max(...art.map((r) => r.length));
  const rows = art.map((r) => r.padEnd(w, '.'));
  const h = rows.length;
  const groups = new Map();
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = key[row[x]] ? row[x] : '.';
      let len = 1;
      while (x + len < row.length && (key[row[x + len]] ? row[x + len] : '.') === ch) len += 1;
      if (ch !== '.') {
        if (!groups.has(ch)) groups.set(ch, []);
        groups.get(ch).push(`M${x * scale} ${y * scale}h${len * scale}v${scale}h-${len * scale}z`);
      }
      x += len;
    }
  });
  const body = [...groups.entries()]
    .map(([ch, subs]) => `<path d="${subs.join('')}" fill="${key[ch]}"/>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w * scale}" height="${h * scale}" viewBox="0 0 ${w * scale} ${h * scale}" fill="none" shape-rendering="crispEdges">${body}</svg>\n`;
}

function args(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) out[key] = true;
      else {
        out[key] = next;
        i += 1;
      }
    } else out._.push(a);
  }
  return out;
}

const cli = args(process.argv.slice(2));
if (cli.help || (!cli._.length && !cli.sprite && !cli.art)) {
  process.stdout.write(
    'usage: pixelfont.mjs "TEXT" --out file.svg [--scale 3] [--color #16181f] [--shadow #b4441f] [--tracking 1] [--label "alt"]\n'
  );
  process.exit(0);
}

if (cli.sprite) {
  // sprite mode reads a JSON file: { art: ["...","..."], key: { h: "#31353f" }, scale: 4 }
  const spec = JSON.parse(
    (await import('node:fs')).readFileSync(resolve(String(cli.sprite)), 'utf8')
  );
  const out = resolve(String(cli.out ?? 'sprite.svg'));
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, sprite(spec.art, spec.key, Number(cli.scale ?? spec.scale ?? 1)));
  process.stdout.write(`${out}\n`);
} else {
  const text = cli._.join(' ');
  const out = resolve(String(cli.out ?? 'word.svg'));
  mkdirSync(dirname(out), { recursive: true });
  const markup = svg(text, {
    scale: Number(cli.scale ?? 3),
    tracking: Number(cli.tracking ?? 1),
    color: String(cli.color ?? '#16181f'),
    shadow: cli.shadow ? String(cli.shadow) : null,
    label: cli.label ? String(cli.label) : null,
  });
  writeFileSync(out, markup);
  process.stdout.write(`${out} ${markup.length}b\n`);
}
