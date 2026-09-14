import { lookup } from 'node:dns/promises';
import { get as httpGet, type IncomingMessage } from 'node:http';
import { get as httpsGet } from 'node:https';
import { BlockList, isIP } from 'node:net';
import { MAX_BYTES, MAX_PIXELS, type Source } from './model.js';
import { rasterDimensions } from './raster.js';
import { validateUrl } from './url.js';

export class SourceError extends Error {
  constructor(public readonly code: string) { super(code); }
}
const blocked = new BlockList();
for (const [ip, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 3],
] as const) blocked.addSubnet(ip, prefix, 'ipv4');
for (const [ip, prefix] of [
  ['2001::', 23], ['2001:db8::', 32], ['2002::', 16], ['3fff::', 20],
] as const) blocked.addSubnet(ip, prefix, 'ipv6');
const globalV6 = new BlockList();
globalV6.addSubnet('2000::', 3, 'ipv6');

export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !blocked.check(address, 'ipv4');
  // Reject IPv4-mapped IPv6 and transition ranges rather than relying on textual spellings.
  return family === 6 && globalV6.check(address, 'ipv6') && !blocked.check(address, 'ipv6');
}

export function inspectImage(bytes: Buffer): Source {
  if (!bytes.length || bytes.length > MAX_BYTES) throw new SourceError('source_too_large');
  let dimensions;
  try { dimensions = rasterDimensions(bytes); } catch { throw new SourceError('invalid_image'); }
  const mime: Record<string, string> = { jpg: 'jpeg', png: 'png', gif: 'gif', webp: 'webp' };
  if (!dimensions.type || !mime[dimensions.type] || !dimensions.width || !dimensions.height ||
      dimensions.width > 16384 || dimensions.height > 16384 || dimensions.width * dimensions.height > MAX_PIXELS) {
    throw new SourceError('invalid_image');
  }
  const rotated = [5, 6, 7, 8].includes(dimensions.orientation ?? 1);
  return {
    data: `data:image/${mime[dimensions.type]};base64,${bytes.toString('base64')}`,
    width: rotated ? dimensions.height : dimensions.width,
    height: rotated ? dimensions.width : dimensions.height,
  };
}

export async function readBody(response: IncomingMessage): Promise<Buffer> {
  if (response.headers['content-encoding'] && response.headers['content-encoding'] !== 'identity') {
    response.destroy();
    throw new SourceError('invalid_image');
  }
  if (Number(response.headers['content-length']) > MAX_BYTES) {
    response.destroy();
    throw new SourceError('source_too_large');
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of response) {
    size += chunk.length;
    if (size > MAX_BYTES) { response.destroy(); throw new SourceError('source_too_large'); }
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export type Resolver = (host: string) => Promise<{ address: string; family: number }[]>;
export async function resolvePublic(url: URL, resolve: Resolver = host => lookup(host, { all: true })) {
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(host) ? [{ address: host, family: isIP(host) }] : await resolve(host);
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) throw new SourceError('blocked_source');
  return addresses[0];
}

// Dependency injection is limited to IO, so network policy itself is exercised in tests.
export async function loadRemote(url: string, resolve?: Resolver, timeout = 8000): Promise<Source> {
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(new SourceError('source_timeout')), timeout);
  let abort: () => void = () => {};
  const aborted = new Promise<never>((_, reject) => {
    abort = () => reject(controller.signal.reason);
    controller.signal.addEventListener('abort', abort, { once: true });
  });
  async function download(value: string, redirects: number): Promise<Source> {
    const target = validateUrl(value);
    const pinned = await resolvePublic(target, resolve);
    controller.signal.throwIfAborted();
    const response = await new Promise<IncomingMessage>((accept, reject) => {
      const get = target.protocol === 'https:' ? httpsGet : httpGet;
      const request = get(target, {
        signal: controller.signal, agent: false, family: pinned.family,
        lookup: (_host, _options, callback) => callback(null, pinned.address, pinned.family),
        headers: { Accept: 'image/png,image/jpeg,image/gif,image/webp', 'Accept-Encoding': 'identity', 'User-Agent': 'crop-icon/1.0' },
      }, accept);
      request.on('error', reject);
    });
    if ([301, 302, 303, 307, 308].includes(response.statusCode ?? 0)) {
      const location = response.headers.location;
      response.destroy();
      if (!location || redirects >= 3) throw new SourceError('source_unavailable');
      return download(new URL(location, target).href, redirects + 1);
    }
    if (response.statusCode !== 200) { response.destroy(); throw new SourceError('source_unavailable'); }
    return inspectImage(await readBody(response));
  }
  try { return await Promise.race([download(url, 0), aborted]); }
  finally { clearTimeout(deadline); controller.signal.removeEventListener('abort', abort); }
}
