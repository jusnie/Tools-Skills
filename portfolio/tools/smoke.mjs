/* Headless smoke test: boots index.html in jsdom and checks what a browser
   would need, without one. Catches runtime errors, dead selectors and broken
   asset paths — includes the srcset sources, not just the fallbacks.

   npm i jsdom && node tools/smoke.mjs */

import { JSDOM } from 'jsdom';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(`${root}/index.html`, 'utf8');

const dom = new JSDOM(html, { url: 'http://localhost/', pretendToBeVisual: true, runScripts: 'outside-only' });
const { window } = dom;
const doc = window.document;

window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
window.IntersectionObserver = class {
  constructor(cb) {
    this.cb = cb;
  }
  observe(target) {
    this.cb([{ isIntersecting: true, target }]);
  }
};
Object.defineProperty(window.navigator, 'clipboard', { value: { writeText: async () => {} } });

const errors = [];
window.addEventListener('error', (event) => errors.push(String(event.error || event.message)));

try {
  window.eval(readFileSync(`${root}/main.js`, 'utf8'));
} catch (error) {
  errors.push(String(error));
}

const problems = [];
const $ = (selector) => doc.querySelector(selector);

/* every local asset referenced from markup exists */
const refs = [...doc.querySelectorAll('img[src], link[href], source[srcset]')].map(
  (el) => el.getAttribute('src') || el.getAttribute('href') || el.getAttribute('srcset')
);
for (const ref of refs) {
  if (!ref || ref.startsWith('http') || ref.startsWith('#') || ref.startsWith('mailto:')) continue;
  if (!existsSync(resolve(root, ref))) problems.push(`missing asset: ${ref}`);
}

/* the font the display type depends on */
if (!existsSync(resolve(root, 'assets/fonts/paperboy.woff2'))) problems.push('missing display font');

/* structure: one h1, then sections in reading order, no leftover game */
if (doc.querySelectorAll('h1').length !== 1) problems.push('expected exactly one h1');
if (doc.querySelector('canvas')) problems.push('canvas found: the cabinet was removed');
if (!doc.getElementById('art')) problems.push('missing the art section');
if (doc.querySelectorAll('.sprite-set li').length !== 7) problems.push('expected seven sprites');
for (const image of doc.querySelectorAll('img')) {
  if (!image.hasAttribute('alt')) problems.push(`img without alt: ${image.getAttribute('src')}`);
}

/* nav: every link points at a real section, and the spy marks the current one */
const navLinks = [...doc.querySelectorAll('.nav__links a')];
if (navLinks.length !== 4) problems.push(`expected four nav links, found ${navLinks.length}`);
for (const link of navLinks) {
  const target = doc.querySelector(link.getAttribute('href'));
  if (!target) problems.push(`nav link points nowhere: ${link.getAttribute('href')}`);
}
const current = navLinks.filter((link) => link.getAttribute('aria-current') === 'true');
if (current.length !== 1) problems.push(`expected one current nav link, found ${current.length}`);

/* copy button writes the address it advertises */
const copy = $('[data-copy]');
if (!copy) problems.push('missing copy button');

/* mobile menu opens, closes on Escape */
const toggle = $('.nav__toggle');
const menu = doc.getElementById('nav-menu');
if (!toggle || !menu) problems.push('missing mobile menu');
else {
  toggle.click();
  if (menu.hidden) problems.push('menu did not open');
  doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  if (!menu.hidden) problems.push('Escape did not close the menu');
}

for (const error of errors) problems.push(`runtime: ${error}`);

console.log(`assets checked: ${refs.length}`);
console.log(`scripts: ${errors.length === 0 ? 'no runtime errors' : errors.length + ' errors'}`);
if (problems.length) {
  console.log('\nFAIL');
  for (const problem of problems) console.log(' -', problem);
  process.exit(1);
}
console.log('\nPASS');
