import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { rasterDimensions } from '../api/_lib/raster.js';
import { inspectImage } from '../api/_lib/source.js';
import { PNG, JPEG, GIF, WEBP, PROGRESSIVE_JPEG, LOSSLESS_WEBP, ALPHA_WEBP, ANIMATED_WEBP } from './fixtures.js';

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
  ['JPEG zero-length segment', 'ffd8ffe10000'],
  ['WebP overflowing chunk', '52494646100000005745425056503820ffffffff00000000'],
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

for (const [name, bytes] of [
  ['progressive JPEG', PROGRESSIVE_JPEG], ['lossless VP8L', LOSSLESS_WEBP],
  ['extended VP8X with alpha', ALPHA_WEBP], ['animated VP8X', ANIMATED_WEBP],
] as const) {
  test(`supported ${name} reports the displayed canvas`, () => {
    assert.equal(rasterDimensions(bytes).width, 32);
    assert.equal(rasterDimensions(bytes).height, 16);
    assert.equal(inspectImage(bytes).width, 32);
    // A view into a larger buffer must not read a neighboring image's header.
    const joined = Buffer.concat([PNG, bytes, GIF]);
    assert.deepEqual(rasterDimensions(joined.subarray(PNG.length, PNG.length + bytes.length)), rasterDimensions(bytes));
  });
}

function jpegWithExif(orientation: number, littleEndian: boolean, afterFrame = false): Buffer {
  const tiff = Buffer.alloc(26);
  const short = (value: number, at: number) => littleEndian ? tiff.writeUInt16LE(value, at) : tiff.writeUInt16BE(value, at);
  const long = (value: number, at: number) => littleEndian ? tiff.writeUInt32LE(value, at) : tiff.writeUInt32BE(value, at);
  tiff.write(littleEndian ? 'II' : 'MM');
  short(42, 2); long(8, 4); short(1, 8);
  short(0x112, 10); short(3, 12); long(1, 14); short(orientation, 18);
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1, 0, 34]), Buffer.from('Exif\0\0'), tiff]);
  const at = afterFrame ? JPEG.indexOf(Buffer.from([0xff, 0xda])) : 2;
  return Buffer.concat([JPEG.subarray(0, at), app1, JPEG.subarray(at)]);
}

for (const littleEndian of [false, true]) for (const afterFrame of [false, true]) for (let orientation = 1; orientation <= 8; orientation++) {
  test(`JPEG orientation ${orientation}, ${littleEndian ? 'LE' : 'BE'}, APP1 ${afterFrame ? 'after' : 'before'} SOF`, () => {
    const bytes = jpegWithExif(orientation, littleEndian, afterFrame);
    assert.equal(rasterDimensions(bytes).orientation, orientation);
    const displayed = inspectImage(bytes);
    assert.equal(displayed.width, orientation >= 5 ? 16 : 32);
    assert.equal(displayed.height, orientation >= 5 ? 32 : 16);
  });
}

test('GIF89a and GIF87a both use the logical screen dimensions', () => {
  const bytes = Buffer.from(GIF); bytes.write('GIF89a');
  assert.deepEqual(rasterDimensions(bytes), { type: 'gif', width: 32, height: 16 });
});

test('PNG requires a complete, correctly sized IHDR and nonzero dimensions', () => {
  for (const [offset, value] of [[8, 0], [8, 12], [8, 14], [12, 0], [16, 0], [20, 0], [16, 0xffffffff]]) {
    const bytes = Buffer.from(PNG); bytes.writeUInt32BE(value, offset);
    assert.throws(() => rasterDimensions(bytes));
  }
  for (let length = 8; length < 33; length++) assert.throws(() => rasterDimensions(PNG.subarray(0, length)));
});

test('JPEG rejects zero, undersized, overflowing and truncated segment lengths', () => {
  for (const size of [0, 1, 0xffff]) {
    const bytes = Buffer.from(JPEG); bytes.writeUInt16BE(size, 4);
    assert.throws(() => rasterDimensions(bytes));
  }
  const scan = JPEG.indexOf(Buffer.from([0xff, 0xda]));
  for (let length = 2; length < scan + 14; length++) assert.throws(() => rasterDimensions(JPEG.subarray(0, length)), `length=${length}`);
  // Legal marker fill bytes are skipped; unknown empty APP segments still advance.
  const padding = Buffer.from([0xff, 0xff, 0xe2, 0, 2]);
  assert.equal(rasterDimensions(Buffer.concat([JPEG.subarray(0, 2), padding, JPEG.subarray(2)])).width, 32);
});

test('EXIF rejects invalid endian, magic, orientation, IFD offsets, entry counts and types', () => {
  for (const [offset, hex] of [
    [12, '5a5a'], [14, '0000'], [16, 'ffffffff'], [16, '00000000'],
    [20, 'ffff'], [24, '0004'], [26, 'ffffffff'], [30, '0000'], [30, '0009'],
  ] as const) {
    const bytes = jpegWithExif(6, false); Buffer.from(hex, 'hex').copy(bytes, offset);
    assert.throws(() => rasterDimensions(bytes), `offset=${offset}, value=${hex}`);
  }
});

test('WebP rejects forged RIFF/chunk lengths and truncated padding', () => {
  for (const value of [0, 1, 0xffffffff, WEBP.length - 9, WEBP.length - 7]) {
    const bytes = Buffer.from(WEBP); bytes.writeUInt32LE(value, 4);
    assert.throws(() => rasterDimensions(bytes));
  }
  for (const value of [0, 1, 9, 0xffffffff]) {
    const bytes = Buffer.from(WEBP); bytes.writeUInt32LE(value, 16);
    assert.throws(() => rasterDimensions(bytes));
  }
  for (let length = 12; length < WEBP.length; length++) assert.throws(() => rasterDimensions(WEBP.subarray(0, length)));
});

test('WebP validates VP8 start codes, VP8L versions and VP8X canvas/frame bounds', () => {
  const invalid: Buffer[] = [];
  const vp8 = Buffer.from(WEBP); vp8[23] = 0; invalid.push(vp8);
  const vp8l = Buffer.from(LOSSLESS_WEBP); vp8l[24] |= 0xe0; invalid.push(vp8l);
  const vp8x = Buffer.from(ALPHA_WEBP); vp8x.writeUIntLE(32, 24, 3); invalid.push(vp8x);
  const reserved = Buffer.from(ALPHA_WEBP); reserved[21] = 1; invalid.push(reserved);
  const animated = Buffer.from(ANIMATED_WEBP);
  const frame = animated.indexOf(Buffer.from('ANMF'));
  assert.ok(frame > 0);
  animated.writeUIntLE(32, frame + 8, 3); invalid.push(animated);
  const subchunk = Buffer.from(ANIMATED_WEBP); subchunk.writeUInt32LE(0xffffffff, frame + 8 + 16 + 4); invalid.push(subchunk);
  for (const bytes of invalid) assert.throws(() => rasterDimensions(bytes));
});

test('all formats reject zero dimensions or dimensions beyond application limits', () => {
  const gif = Buffer.from(GIF); gif.writeUInt16LE(0, 6);
  assert.throws(() => rasterDimensions(gif));
  const jpeg = Buffer.from(JPEG); const frame = jpeg.indexOf(Buffer.from([0xff, 0xc0])); jpeg.writeUInt16BE(0, frame + 7);
  assert.throws(() => rasterDimensions(jpeg));
  const webp = Buffer.from(WEBP); webp.writeUInt16LE(0, 26);
  assert.throws(() => rasterDimensions(webp));
  const large = Buffer.from(PNG); large.writeUInt32BE(16385, 16);
  assert.throws(() => inspectImage(large));
});
