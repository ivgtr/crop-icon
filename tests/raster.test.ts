import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { rasterDimensions } from '../api/_lib/raster.js';
import { PNG, JPEG, GIF, WEBP } from './fixtures.js';

for (const [type, bytes] of [['png', PNG], ['jpg', JPEG], ['gif', GIF], ['webp', WEBP]] as const) {
  test(`raster gate retains ${type} dimensions`, () => {
    const result = rasterDimensions(bytes);
    assert.equal(result.type, type);
    assert.equal(result.width, 32);
    assert.equal(result.height, 16);
  });
}

for (const [name, hex] of [
  ['ICNS zero-sized entry', '69636e730000001869636e34000000000000000000000000'],
  ['JXL zero-sized box', '0000000c4a584c200d0a870a000000006a786c7000000000'],
  ['HEIF zero-sized box', '000000186674797068656963000000006d69663168656963000000006d65746100000000'],
  ['SVG', '3c73766720786d6c6e733d22687474703a2f2f7777772e77332e6f72672f323030302f737667222f3e'],
] as const) {
  test(`unsupported ${name} is rejected without blocking the event loop`, () => {
    // A parent-enforced timeout also catches synchronous parser regressions.
    const child = spawnSync(process.execPath, [fileURLToPath(new URL('./raster-rejection.js', import.meta.url)), hex], {
      timeout: 3000, encoding: 'utf8',
    });
    assert.equal(child.error, undefined, child.error?.message);
    assert.equal(child.status, 0, child.stderr);
  });
}

test('raster gate rejects empty, truncated and corrupt signatures', () => {
  for (const bytes of [Buffer.alloc(0), PNG.subarray(0, 7), JPEG.subarray(0, 2), GIF.subarray(0, 5), WEBP.subarray(0, 11)]) {
    assert.throws(() => rasterDimensions(bytes));
  }
  const corrupt = Buffer.from(PNG);
  corrupt[4] = 0;
  assert.throws(() => rasterDimensions(corrupt));
});
