import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import h, { text } from '../build/api/_lib/utils/tag.js';
import s from '../build/api/_lib/utils/style.js';
import { html, inlineStyles } from '../build/api/_lib/html.js';
import { parseRequest } from '../build/api/_lib/perser.js';
import { cropImage } from '../build/api/_lib/cropImage/index.js';
import { PATTERNS, parseOptions, renderSvg } from '../public/core.js';
import { PNG } from './fixtures.mjs';

// Protect the original composition model, not just the presence of a styled screenshot.
test('h still composes nested markup and handles the original void elements', () => {
  assert.equal(h('div', { class: 'container' }, h('img', { src: '/api?url=x' }), h('p', {}, 'Hello')),
    '<div class="container"><img src="/api?url=x"><p>Hello</p></div>');
  assert.equal(h('meta', { charset: 'UTF-8' }), '<meta charset="UTF-8">');
});
test('h escapes attribute values without escaping nested markup', () => {
  assert.equal(h('a', { title: '"<&\'>' }, h('span', {}, 'label')),
    '<a title="&quot;&lt;&amp;&#39;&gt;"><span>label</span></a>');
});
test('text is explicit for untrusted child content', () => {
  assert.equal(h('pre', {}, text('<img src=x onerror=alert(1)>')), '<pre>&lt;img src=x onerror=alert(1)&gt;</pre>');
});
test('boolean HTML controls serialize correctly while ARIA remains a string', () => {
  assert.equal(h('input', { checked: true, disabled: false, value: undefined, 'aria-checked': 'true' }), '<input checked aria-checked="true">');
});
test('s retains original camelCase declarations and media-rule composition', () => {
  assert.equal(s('.container', { maxWidth: '724px', margin: '0 auto 0' }), '.container { max-width: 724px; margin: 0 auto 0;}');
  assert.equal(s('@media (max-width: 760px)', {}, s('.studio', { display: 'block' })), '@media (max-width: 760px) {.studio { display: block;}}');
});
test('html() is deterministic and embeds exactly the shared style string once', () => {
  const page = html();
  assert.equal(page, html());
  assert.ok(page.startsWith('<!DOCTYPE html><html'));
  assert.equal([...page.matchAll(/<style\b/g)].length, 1);
  assert.equal(page.match(/<style id="studio-style">([\s\S]*?)<\/style>/)[1], inlineStyles);
  assert.match(inlineStyles, /@media \(max-width: 760px\)/);
  assert.match(inlineStyles, /\.studio \{ display: grid;/);
  assert.doesNotMatch(page, /style\.css|rel="stylesheet"|\sstyle="|\son[a-z]+="/i);
});
test('shape controls are server-rendered once and use the shared shape definitions', () => {
  const page = html();
  assert.equal([...page.matchAll(/data-pattern=/g)].length, PATTERNS.length);
  for (const pattern of PATTERNS) assert.match(page, new RegExp(`data-pattern="${pattern}"`));
  assert.equal([...page.matchAll(/aria-pressed="true"/g)].length, 1);
  const script = readFileSync('public/app.js', 'utf8');
  assert.doesNotMatch(script, /createElement\('button'\)|innerHTML|shapeMarkup/);
});
test('the server document contains each editor hook exactly once', () => {
  const ids = [...html().matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size);
  for (const id of ['source-form', 'url', 'load', 'drop-zone', 'file', 'privacy', 'shapes', 'reset', 'options', 'width', 'height', 'fit',
    'zoom', 'zoom-value', 'x', 'x-value', 'y', 'y-value', 'border', 'border-value', 'color', 'bg', 'transparent', 'preview-area',
    'original', 'result', 'dimensions', 'shape-label', 'source-info', 'download-svg', 'download-png', 'embed', 'copy-url', 'copy-md',
    'copy-html', 'copy-editor', 'status', 'usage']) assert.ok(ids.includes(id), `Missing editor hook: ${id}`);
});
test('original Markdown examples, shape names and project links work without JavaScript', () => {
  const page = html();
  assert.match(page, /<noscript>/);
  assert.match(page, /Copy-paste this into your markdown/);
  for (const pattern of ['circle', 'hart', 'star']) assert.ok(page.includes(`/api?p=${pattern}&amp;url=https://github.com/ivgtr.png`));
  assert.match(page, /href="https:\/\/github.com\/ivgtr\/crop-icon"/);
  assert.doesNotMatch(page, /target="_brank"/);
});
test('the original parser entry point shares browser/API defaults and validation', () => {
  for (const p of ['circle', 'hart', 'star', 'hexagon']) {
    const query = new URLSearchParams({ url: 'https://github.com/ivgtr.png', p, width: '256' });
    assert.deepEqual(parseRequest(query), parseOptions(query));
  }
  assert.throws(() => parseRequest({ width: '-1' }));
});
test('cropImage retains the image-generation responsibility and shared rendering', async () => {
  const options = parseRequest({ url: 'https://github.com/ivgtr.png', p: 'hart', width: '256' });
  const source = { data: `data:image/png;base64,${PNG.toString('base64')}`, width: 1, height: 1 };
  let calls = 0;
  const actual = await cropImage(options, async url => { assert.equal(url, options.url); calls++; return source; });
  assert.equal(calls, 1);
  assert.equal(actual, renderSvg(source, options));
});
test('Vercel and local serving do not depend on a duplicated HTML or external stylesheet', () => {
  assert.equal(existsSync('public/index.html'), false);
  assert.equal(existsSync('public/style.css'), false);
  const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
  assert.ok(config.rewrites.some(rule => rule.source === '/' && rule.destination === '/api'));
  assert.equal(config.functions['api/index.ts'].includeFiles, undefined);
  assert.doesNotMatch(readFileSync('api/index.ts', 'utf8'), /readFileSync|process\.cwd|public\/index\.html/);
  assert.doesNotMatch(readFileSync('scripts/dev.mjs', 'utf8'), /style\.css/);
});
