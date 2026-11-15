/* Headless smoke test: boots index.html in jsdom, stubs the canvas, and plays
   Paddle for 90 simulated seconds. Catches runtime errors, dead selectors and
   broken asset paths without a browser.

   node /tmp/domtest/run.mjs            */

import { JSDOM } from 'jsdom';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const root = '/home/user/Tools-Skills/portfolio';
const html = readFileSync(`${root}/index.html`, 'utf8');

const dom = new JSDOM(html, { url: 'http://localhost/', pretendToBeVisual: true, runScripts: 'outside-only' });
const { window } = dom;
const doc = window.document;

/* --- stubs --- */
const calls = { fillRect: 0 };
window.HTMLCanvasElement.prototype.getContext = function getContext() {
  return {
    save() {}, restore() {}, translate() {},
    fillRect() { calls.fillRect += 1; },
    set fillStyle(v) {}, get fillStyle() { return '#000'; },
  };
};
window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
window.IntersectionObserver = class {
  constructor(cb) { this.cb = cb; }
  observe() { this.cb([{ isIntersecting: true }]); }
};
Object.defineProperty(window.navigator, 'clipboard', { value: { writeText: async () => {} } });

/* manual frame clock */
let queue = [];
let now = 0;
window.requestAnimationFrame = (cb) => { queue.push(cb); return queue.length; };
window.cancelAnimationFrame = () => {};
const tick = (ms = 16) => {
  now += ms;
  const batch = queue;
  queue = [];
  for (const cb of batch) cb(now);
};

/* --- boot --- */
window.eval(readFileSync(`${root}/main.js`, 'utf8'));

const problems = [];
const $ = (sel) => doc.querySelector(sel);

const assets = [...doc.querySelectorAll('img[src], link[href], source[srcset]')]
  .map((el) => el.getAttribute('src') || el.getAttribute('href') || el.getAttribute('srcset'))
  .filter((p) => p && !p.startsWith('http') && !p.startsWith('#'))
  .map((p) => resolve(root, p));
for (const file of assets) {
  if (!existsSync(file)) problems.push(`missing asset: ${file}`);
}

const overlay = $('[data-overlay]');
const scoreEl = $('[data-score]');
const livesEl = $('[data-lives]');
const statusEl = $('[data-status]');

if (!overlay) problems.push('no overlay');
if (overlay && overlay.hidden) problems.push('overlay should be visible on load');

/* start */
$('[data-play]').click();
if (overlay && !overlay.hidden) problems.push('overlay still visible after start');
if (livesEl?.textContent !== '3') problems.push(`lives should be 3, got ${livesEl?.textContent}`);

/* serve with the space bar */
doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: ' ', bubbles: true }));
if (!statusEl?.textContent.includes('Playing')) problems.push(`unexpected status after serve: ${statusEl?.textContent}`);

/* paddle chases the ball with the arrow keys for a while, then stand still */
for (let i = 0; i < 60; i += 1) {
  doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: i % 2 ? 'ArrowRight' : 'ArrowLeft', bubbles: true }));
  tick(16);
  doc.dispatchEvent(new window.KeyboardEvent('keyup', { key: 'ArrowRight', bubbles: true }));
  doc.dispatchEvent(new window.KeyboardEvent('keyup', { key: 'ArrowLeft', bubbles: true }));
}

/* play on: serve again whenever the ball comes to rest */
for (let i = 0; i < 60 * 120; i += 1) {
  if (i % 20 === 0) {
    doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: ' ', bubbles: true }));
  }
  tick(16);
}

const score = Number(scoreEl?.textContent ?? '0');
const status = statusEl?.textContent ?? '';

if (calls.fillRect < 100) problems.push(`canvas barely drawn: ${calls.fillRect} fills`);
if (!status.includes('Game over')) problems.push(`expected game over, status was: "${status}"`);
if (score <= 0) problems.push('score never went up, ball may not hit bricks');

/* pause / resume */
$('[data-play]').click();
doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: ' ', bubbles: true }));
tick(16);
$('[data-pause]').click();
if (!statusEl?.textContent.includes('Paused')) problems.push(`pause failed: ${statusEl?.textContent}`);
$('[data-pause]').click();
if (!statusEl?.textContent.includes('Playing')) problems.push(`resume failed: ${statusEl?.textContent}`);

/* mobile menu */
const toggle = $('.nav__toggle');
toggle.click();
if ($('#nav-menu').hidden) problems.push('menu did not open');
doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
if (!$('#nav-menu').hidden) problems.push('escape did not close the menu');

console.log(`score after run: ${score}`);
console.log(`canvas fills: ${calls.fillRect}`);
console.log(`assets checked: ${assets.length}`);
if (problems.length) {
  console.log('\nFAIL');
  for (const p of problems) console.log(' -', p);
  process.exit(1);
}
console.log('\nPASS');
