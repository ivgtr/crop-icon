import test from 'node:test';
import assert from 'node:assert/strict';
import { PATTERNS, MAX_BYTES, escapeXml, parseOptions, renderSvg, shapeMarkup, toQuery, validateUrl } from '../public/core.js';
import { PNG } from './fixtures.mjs';
const source = { width: 32, height: 16, data: 'data:image/png;base64,' + PNG.toString('base64') };
const base = { url: 'https://example.com/avatar.png' };

test('legacy default is circle, natural dimensions, contain, centered, no decoration', () => {
  const options = parseOptions(base);
  assert.deepEqual(options, { url: base.url, pattern: 'circle', width: undefined, height: undefined, fit: 'contain', x: 50, y: 50, zoom: 1, border: 0, color: '#ffffff', bg: 'transparent' });
  const svg = renderSvg(source, options);
  assert.match(svg, /viewBox="0 0 32 16"/);
  assert.match(svg, /x="0" y="0" width="32" height="16"/);
});
test('legacy width and height independently override natural source dimensions', () => {
  assert.match(renderSvg(source, parseOptions({ ...base, width: '80' })), /viewBox="0 0 80 16"/);
  assert.match(renderSvg(source, parseOptions({ ...base, height: '80' })), /viewBox="0 0 32 80"/);
  assert.match(renderSvg(source, parseOptions({ ...base, width: '80', height: '80' })), /x="0" y="20" width="80" height="40"/);
});
test('legacy star keeps original self-intersecting polygon coordinates', () => {
  assert.match(shapeMarkup('star', 320, 200), /points="160,0 60,200 320,67 0,67 260,200"/);
});
test('legacy hart preserves its width-based geometry; heart is an exact alias', () => {
  assert.equal(shapeMarkup('heart', 320, 200), shapeMarkup('hart', 320, 200));
  assert.match(shapeMarkup('hart', 320, 200), /M32,96 A64,64,0,0,1,160,96/);
  assert.match(shapeMarkup('hart', 320, 200), /160,288/);
});
test('legacy non-square circle uses SVG normalized-diagonal radius', () => {
  const radius = Number(shapeMarkup('circle', 320, 200).match(/r="([^"]+)"/)[1]);
  assert.ok(Math.abs(radius - Math.hypot(320, 200) / Math.sqrt(8)) < 1e-9);
});
for (const pattern of PATTERNS) test(`self-contained SVG: ${pattern}`, () => {
  const svg = renderSvg(source, parseOptions({ ...base, p: pattern, width: '256', height: '256', border: '8', color: 'abc', bg: '112233' }));
  assert.match(svg, /data:image\/png;base64,/);
  assert.match(svg, /stroke-width="16"/);
  assert.doesNotMatch(svg, /undefined|NaN|Infinity|https:\/\/example|<script|foreignObject/);
});
test('cover, zoom and focus use a single deterministic transform', () => {
  const svg = renderSvg(source, parseOptions({ ...base, width: '32', height: '32', fit: 'cover', zoom: '2', x: '100', y: '0' }));
  assert.match(svg, /x="-96" y="0" width="128" height="64"/);
});
test('URL serialization round-trips source query, colors and all controls', () => {
  const options = parseOptions({ ...base, url: 'https://example.com/avatar?a=1&b=two words', p: 'heart', width: '256', height: '128', fit: 'cover', zoom: '1.5', x: '20', y: '75', border: '9', color: '#abcdef', bg: '#12345678' });
  assert.deepEqual(parseOptions(toQuery(options)), options);
});
for (const [key, value] of [
  ['width', '-1'], ['height', '0'], ['width', '4097'], ['width', '1.5'], ['width', 'Infinity'], ['width', '1e3'],
  ['width', '1" onload="alert(1)'], ['zoom', '5'], ['x', '101'], ['y', '-1'], ['border', '65'],
  ['p', 'unknown'], ['fit', 'stretch'], ['color', 'url(https://example.com)'], ['bg', '"><script>'],
]) test(`reject malformed ${key}=${value}`, () => assert.throws(() => parseOptions({ ...base, [key]: value })));
test('repeated values are rejected rather than implicitly coerced', () => {
  for (const key of ['url', 'p', 'width', 'bg']) {
    const query = new URLSearchParams(base); query.append(key, 'x'); query.append(key, 'y');
    assert.throws(() => parseOptions(query));
    assert.throws(() => parseOptions({ ...base, [key]: ['a', 'b'] }));
  }
});
test('empty optional parameters and unrelated query parameters remain harmless', () => {
  assert.deepEqual(parseOptions({ ...base, width: '', ignored: 'x' }), parseOptions(base));
});
for (const url of ['file:///etc/passwd', 'data:image/png;base64,abc', 'ftp://example.com/a', 'http://user:pass@example.com', 'http://example.com:8080/a', 'x'.repeat(4097)]) {
  test(`reject unsafe URL ${url.slice(0, 50)}`, () => assert.throws(() => validateUrl(url)));
}
test('SVG escapes strings and refuses active or external source data', () => {
  assert.equal(escapeXml('&<>"\''), '&amp;&lt;&gt;&quot;&apos;');
  assert.throws(() => renderSvg({ ...source, data: 'data:image/svg+xml;base64,PHN2Zz4=' }, parseOptions(base)));
  assert.throws(() => renderSvg({ ...source, data: 'https://example.com/image' }, parseOptions(base)));
  assert.throws(() => renderSvg({ ...source, width: 5000, height: 10000 }, parseOptions(base)));
});
test('maximum embedded input leaves room below a 4.5 MB response', () => {
  const svg = renderSvg({ ...source, data: 'data:image/png;base64,' + Buffer.alloc(MAX_BYTES).toString('base64') }, parseOptions(base));
  assert.ok(Buffer.byteLength(svg) < 4_500_000);
});
