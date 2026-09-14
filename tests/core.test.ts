import test from 'node:test';
import assert from 'node:assert/strict';
import { PATTERNS, parseOptions, renderSvg, shapeMarkup, toQuery, validateUrl, MAX_BYTES } from '../api/_lib/core.js';
import { PNG } from './fixtures.js';
const source = { data: `data:image/png;base64,${PNG.toString('base64')}`, width: 320, height: 160 };
const base = { url: 'https://example.com/image.png' };

test('legacy default is circle, natural dimensions, contain, centered, no decoration', () => {
  const options = parseOptions(base);
  assert.equal(options.pattern, 'circle'); assert.equal(options.fit, 'contain');
  assert.equal(options.width, undefined); assert.equal(options.height, undefined);
  assert.equal(options.x, 50); assert.equal(options.y, 50); assert.equal(options.zoom, 1); assert.equal(options.border, 0);
  assert.match(renderSvg(source, options), /viewBox="0 0 320 160"/);
});
test('legacy width and height independently override natural source dimensions', () => {
  assert.match(renderSvg(source, parseOptions({ ...base, width: '80' })), /viewBox="0 0 80 160"/);
  assert.match(renderSvg(source, parseOptions({ ...base, height: '80' })), /viewBox="0 0 320 80"/);
  assert.match(renderSvg(source, parseOptions({ ...base, width: '80', height: '80' })), /x="0" y="20" width="80" height="40"/);
});
test('legacy star keeps original self-intersecting polygon coordinates', () => {
  assert.match(shapeMarkup('star', 320, 200), /points="160,0 60,200 320,67 0,67 260,200"/);
});
test('heart preserves its width-based geometry without accepting the old typo', () => {
  assert.throws(() => parseOptions({ ...base, p: 'hart' }), /Unknown shape/);
  assert.match(shapeMarkup('heart', 320, 200), /M32,96 A64,64,0,0,1,160,96/);
  assert.match(shapeMarkup('heart', 320, 200), /160,288/);
});
test('legacy non-square circle uses SVG normalized-diagonal radius', () => {
  const radius = Number(shapeMarkup('circle', 320, 200).match(/r="([^"]+)"/)?.[1]);
  assert.ok(Math.abs(radius - Math.hypot(320, 200) / Math.sqrt(8)) < 1e-9);
});
for (const pattern of PATTERNS) test(`self-contained SVG: ${pattern}`, () => {
  const svg = renderSvg(source, parseOptions({ ...base, p: pattern, width: '256', height: '256', border: '8', color: 'abc', bg: '112233' }));
  assert.match(svg, /data:image\/png;base64,/);
  assert.match(svg, /stroke-width="16"/);
  assert.doesNotMatch(svg, /undefined|NaN|Infinity|https:\/\/example|<script|foreignObject/);
});
test('cover, zoom and focus use a single deterministic transform', () => {
  const svg = renderSvg(source, parseOptions({ ...base, p: 'square', width: '100', height: '100', fit: 'cover', zoom: '2', x: '100', y: '0' }));
  assert.match(svg, /x="-300" y="0" width="400" height="200"/);
});
test('URL serialization round-trips source query, colors and all controls', () => {
  const original = parseOptions({ url: 'https://example.com/a?x=1&y=2', p: 'heart', width: '256', height: '128', fit: 'cover', x: '0', y: '100', zoom: '1.5', border: '8', color: '#abc', bg: '12345678' });
  assert.deepEqual(parseOptions(toQuery(original)), original);
});
for (const [key, value] of [['width', '-1'], ['height', '0'], ['width', '4097'], ['width', '1.5'], ['width', 'Infinity'], ['width', '1e3'], ['width', '1" onload="alert(1)'], ['zoom', '5'], ['x', '101'], ['y', '-1'], ['border', '65'], ['p', 'unknown'], ['fit', 'stretch'], ['color', 'url(https://example.com)'], ['bg', '"><script>']]) {
  test(`reject malformed ${key}=${value}`, () => assert.throws(() => parseOptions({ ...base, [key]: value })));
}
test('repeated values are rejected rather than implicitly coerced', () => {
  assert.throws(() => parseOptions(new URLSearchParams('url=https://example.com&width=1&width=2')));
  assert.throws(() => parseOptions({ ...base, width: ['1', '2'] }));
});
test('empty optional parameters and unrelated query parameters remain harmless', () => {
  assert.deepEqual(parseOptions({ ...base, width: '', height: '', ignored: 'x' }), parseOptions(base));
});
for (const url of ['file:///etc/passwd', 'data:image/png;base64,abc', 'ftp://example.com/a', 'https://user:pass@example.com', 'http://example.com:8080/a', 'x'.repeat(4097)]) {
  test(`reject unsafe URL ${url.slice(0, 50)}`, () => assert.throws(() => validateUrl(url)));
}
test('SVG escapes strings and refuses active or external source data', () => {
  for (const data of ['https://example.com/a', 'data:image/svg+xml;base64,PHN2Zz4=', 'data:text/html;base64,PHNjcmlwdD4=']) assert.throws(() => renderSvg({ ...source, data }, parseOptions(base)));
  assert.match(renderSvg(source, { ...parseOptions(base), color: '"<&', border: 1 }), /&quot;&lt;&amp;/);
});
test('maximum embedded input leaves room below a 4.5 MB response', () => {
  const data = `data:image/png;base64,${Buffer.alloc(MAX_BYTES).toString('base64')}`;
  assert.ok(Buffer.byteLength(renderSvg({ ...source, data }, parseOptions(base))) < 4_500_000);
});
