import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOptions, toQuery } from '../api/_lib/options.js';
import { parseOptions as coreParseOptions } from '../api/_lib/core.js';
import { parseRequest } from '../api/_lib/parser.js';
import { MAX_ZOOM, MIN_ZOOM } from '../api/_lib/model.js';
import { renderSvg } from '../api/_lib/renderer.js';
import { PNG } from './fixtures.js';

const base = { url: 'https://example.com/image.png' };
const source = { data: `data:image/png;base64,${PNG.toString('base64')}`, width: 32, height: 16 };

test('option parsing has one canonical implementation for browser and API entry points', () => {
  assert.equal(coreParseOptions, parseOptions);
  for (const zoom of [String(MIN_ZOOM), '0.5', '1', String(MAX_ZOOM)]) {
    const expected = parseOptions({ ...base, zoom });
    assert.deepEqual(parseRequest({ ...base, zoom }), expected);
    assert.deepEqual(parseOptions(toQuery(expected)), expected);
  }
});

test('zoom accepts shrink values and rejects values outside the shared range', () => {
  assert.equal(parseOptions({ ...base, zoom: '0.1' }).zoom, MIN_ZOOM);
  assert.equal(parseOptions({ ...base, zoom: '0.5' }).zoom, 0.5);
  for (const zoom of ['0', '0.09', '4.01', '5']) {
    assert.throws(() => parseOptions({ ...base, zoom }), new RegExp(`zoom must be between ${MIN_ZOOM} and ${MAX_ZOOM}`));
  }
});

test('renderer centers a shrunken image and exposes the surrounding background', () => {
  const options = parseOptions({ ...base, p: 'square', width: '100', height: '100', fit: 'contain', zoom: '0.5' });
  const svg = renderSvg(source, options);
  assert.match(svg, /<image[^>]+x="25" y="37\.5" width="50" height="25"/);
});
