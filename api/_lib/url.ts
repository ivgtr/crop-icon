export function validateUrl(value: string): URL {
  if (value.length > 4096) throw new Error('Image URL is too long.');
  const url = new URL(value);
  const defaultPort = url.protocol === 'https:' ? '443' : '80';
  const authority = url.href.slice(url.protocol.length + 2).split('/', 1)[0];
  const hasCredentials = authority.includes('@');
  if (!['https:', 'http:'].includes(url.protocol) || hasCredentials || (url.port && url.port !== defaultPort)) {
    throw new Error('Use a public HTTP(S) image URL without credentials or a custom port.');
  }
  url.hash = '';
  return url;
}
