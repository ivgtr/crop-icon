import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import https from 'node:https';
import { syncBuiltinESMExports } from 'node:module';
import { EventEmitter } from 'node:events';
import { Readable, PassThrough } from 'node:stream';
import { inspectImage, isPublicAddress, readBody, resolvePublic, loadRemote } from '../build/api/_lib/source.js';
import { MAX_BYTES } from '../public/core.js';
import { PNG, JPEG, GIF, WEBP, ROTATED_JPEG } from './fixtures.mjs';

for (const address of ['127.0.0.1', '0.0.0.0', '10.1.2.3', '172.16.0.1', '192.168.2.1', '169.254.169.254', '100.64.0.1', '192.0.2.1', '192.88.99.1', '198.18.0.1', '198.51.100.1', '203.0.113.1', '224.0.0.1', '255.255.255.255', '::', '::1', 'fc00::1', 'fe80::1', 'ff02::1', '::ffff:127.0.0.1', '::ffff:7f00:1', '2001:db8::1', '2002:7f00:1::1', '3fff::1', 'not-an-address']) {
  test(`block non-public destination ${address}`, () => assert.equal(isPublicAddress(address), false));
}
for (const address of ['8.8.8.8', '1.1.1.1', '185.199.108.133', '2606:4700:4700::1111', '2001:4860:4860::8888']) {
  test(`allow public destination ${address}`, () => assert.equal(isPublicAddress(address), true));
}
test('mixed public/private DNS answers fail closed', async () => {
  await assert.rejects(resolvePublic(new URL('https://example.com'), async () => [{ address: '8.8.8.8', family: 4 }, { address: '10.0.0.1', family: 4 }]), /blocked_source/);
  await assert.rejects(resolvePublic(new URL('https://example.com'), async () => []), /blocked_source/);
});
for (const url of ['http://2130706433/a', 'http://0x7f000001/a', 'http://0177.0.0.1/a', 'http://[::ffff:127.0.0.1]/a']) {
  test(`normalized numeric IP cannot bypass policy: ${url}`, async () => assert.rejects(loadRemote(url), /blocked_source/));
}
for (const [bytes, type] of [[PNG, 'png'], [JPEG, 'jpeg'], [GIF, 'gif'], [WEBP, 'webp']]) {
  test(`detect ${type} from content, not an upstream MIME header`, () => {
    const source = inspectImage(bytes);
    assert.equal(source.width, 32); assert.equal(source.height, 16);
    assert.ok(source.data.startsWith(`data:image/${type};base64,`));
  });
}
test('reject non-images, active SVG and oversized source metadata', () => {
  for (const value of ['<html>hello</html>', '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="16"><script>alert(1)</script></svg>']) assert.throws(() => inspectImage(Buffer.from(value)), /invalid_image/);
  assert.throws(() => inspectImage(Buffer.alloc(MAX_BYTES + 1)), /source_too_large/);
  const huge = Buffer.from(PNG); huge.writeUInt32BE(20000, 16);
  assert.throws(() => inspectImage(huge), /invalid_image/);
});
function response(chunks, headers = {}, statusCode = 200) {
  return Object.assign(Readable.from(chunks), { headers, statusCode });
}
test('bound streamed bytes even when Content-Length is missing or dishonest', async () => {
  for (const headers of [{}, { 'content-length': '1' }]) {
    const stream = response([Buffer.alloc(MAX_BYTES), Buffer.from('x')], headers);
    await assert.rejects(readBody(stream), /source_too_large/); assert.ok(stream.destroyed);
  }
});
test('reject compressed or advertised-oversize upstream bodies before buffering', async () => {
  for (const headers of [{ 'content-encoding': 'gzip' }, { 'content-length': String(MAX_BYTES + 1) }]) {
    const stream = response([PNG], headers);
    await assert.rejects(readBody(stream)); assert.ok(stream.destroyed);
  }
});
test('read normal image streams without changing their bytes', async () => assert.deepEqual(await readBody(response([PNG.subarray(0, 20), PNG.subarray(20)])), PNG));

async function transport(responses, run) {
  const calls = [];
  const fake = (url, options, callback) => {
    calls.push({ url, options });
    const request = new EventEmitter();
    const item = responses.shift();
    assert.ok(item, 'Unexpected network request');
    options.signal.addEventListener('abort', () => { item.destroy(options.signal.reason); request.emit('error', options.signal.reason); }, { once: true });
    queueMicrotask(() => callback(item));
    return request;
  };
  mock.method(http, 'get', fake); mock.method(https, 'get', fake); syncBuiltinESMExports();
  try { await run(calls); } finally { mock.restoreAll(); syncBuiltinESMExports(); }
}
const publicDNS = async () => [{ address: '8.8.8.8', family: 4 }];
test('the socket lookup is pinned to the validated address (no second DNS lookup)', async () => {
  let lookups = 0;
  await transport([response([PNG], { 'content-type': 'text/html' })], async calls => {
    const source = await loadRemote('https://example.com/a', async () => { lookups++; return publicDNS(); });
    assert.ok(source.data.startsWith('data:image/png;'));
    assert.equal(lookups, 1); assert.equal(calls.length, 1);
    calls[0].options.lookup('example.com', {}, (error, address, family) => { assert.equal(error, null); assert.equal(address, '8.8.8.8'); assert.equal(family, 4); });
    assert.equal(calls[0].options.agent, false);
    assert.equal(calls[0].options.family, 4);
  });
});
test('relative redirects still work, with each hop revalidated', async () => {
  let lookups = 0;
  await transport([response([], { location: '/b' }, 302), response([PNG])], async calls => {
    await loadRemote('https://example.com/a', async () => { lookups++; return publicDNS(); });
    assert.equal(lookups, 2); assert.equal(calls[1].url.href, 'https://example.com/b');
  });
});
test('redirects to metadata/private networks are stopped before a second request', async () => {
  await transport([response([], { location: 'http://169.254.169.254/latest/meta-data/' }, 302)], async calls => {
    await assert.rejects(loadRemote('https://example.com/a', publicDNS), /blocked_source/);
    assert.equal(calls.length, 1);
  });
});
test('DNS rebinding on a redirect is rejected', async () => {
  let lookups = 0;
  await transport([response([], { location: '/b' }, 301)], async calls => {
    await assert.rejects(loadRemote('https://example.com/a', async () => [{ address: ++lookups === 1 ? '8.8.8.8' : '127.0.0.1', family: 4 }]), /blocked_source/);
    assert.equal(calls.length, 1);
  });
});
test('redirect loops and upstream failures are bounded', async () => {
  await transport(Array.from({ length: 4 }, () => response([], { location: '/again' }, 302)), async calls => {
    await assert.rejects(loadRemote('https://example.com/a', publicDNS), /source_unavailable/);
    assert.equal(calls.length, 4);
  });
  await transport([response([], {}, 500)], async () => assert.rejects(loadRemote('https://example.com/a', publicDNS), /source_unavailable/));
});
test('deadline covers DNS resolution, not just socket inactivity', async () => {
  const start = Date.now();
  await assert.rejects(loadRemote('https://example.com/a', () => new Promise(() => {}), 25), /source_timeout/);
  assert.ok(Date.now() - start < 1000);
});
test('deadline aborts a body that never finishes', async () => {
  const stream = Object.assign(new PassThrough(), { statusCode: 200, headers: {} });
  await transport([stream], async () => {
    await assert.rejects(loadRemote('https://example.com/a', publicDNS, 25), /source_timeout/);
    assert.ok(stream.destroyed);
  });
});

test('JPEG EXIF rotation agrees with browser natural dimensions', () => {
  const source = inspectImage(ROTATED_JPEG);
  assert.equal(source.width, 16); assert.equal(source.height, 32);
});
