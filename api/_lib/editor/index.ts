import { MAX_BYTES, MAX_PIXELS, isPattern, type Pattern, type Source, type Options } from '../model.js';
import { parseOptions, toQuery } from '../options.js';
import { escapeXml, renderSvg } from '../renderer.js';
import { validateUrl } from '../url.js';
import { isLocale, translate, type MessageValues } from '../i18n.js';
import type { MessageKey } from '../locales/en.js';
import { localizeDocument, readLocale, saveLocale } from './i18n.js';
import { elements } from './elements.js';
import { ShapePreviews } from './shape-previews.js';

const $ = <K extends keyof typeof elements>(id: K): (typeof elements)[K] => elements[id];
const shapePreviews = new ShapePreviews($('shapes'));
let locale = readLocale();
const t = (key: MessageKey, values?: MessageValues): string => translate(locale, key, values);
class EditorError extends Error {
  constructor(readonly key: MessageKey) { super(key); }
}
const errorKey = (error: unknown, fallback: MessageKey): MessageKey => error instanceof EditorError ? error.key : fallback;
let pattern: Pattern = 'circle';
let source: Source | null = null;
let sourceName = '';
let remoteUrl = '';
let previewUrl = '';
let svg = '';
let requestId = 0;
let controller: AbortController | undefined;
let pending = false;
let frame = 0;
let statusKey: MessageKey = 'loadingSource';
const copyIds = ['copy-url', 'copy-md', 'copy-html', 'copy-editor'] as const;

function refreshText(): void {
  $('load').textContent = t(pending ? 'loading' : 'load');
  $('shape-label').textContent = t(pattern);
  $('status').textContent = t(statusKey);
  $('privacy').textContent = source ? t(remoteUrl ? 'publicSource' : 'localSource', { name: sourceName }) : '';
  $('source-info').textContent = source ? t('sourceInfo', { width: source.width, height: source.height, kind: t(remoteUrl ? 'publicKind' : 'localKind') }) : '';
}
function status(key: MessageKey, error = false): void {
  statusKey = key;
  $('status').textContent = t(key);
  $('status').classList.toggle('error', error);
}
function setAvailable(available: boolean): void {
  $('download-svg').disabled = $('download-png').disabled = !available;
  for (const id of copyIds) $(id).disabled = !available || !remoteUrl;
}
function busy(value: boolean): void {
  pending = value;
  $('preview-area').setAttribute('aria-busy', String(value));
  if (value) {
    source = null; remoteUrl = ''; svg = ''; sourceName = '';
    shapePreviews.clear();
    $('original').removeAttribute('src'); $('result').removeAttribute('src');
    if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = ''; }
    setAvailable(false); $('embed').value = '';
  }
  refreshText();
}
function options(): Options & { width: number; height: number } {
  const params = new URLSearchParams();
  for (const [key, value] of new FormData($('options'))) {
    if (typeof value !== 'string') throw new EditorError('invalidSettings');
    params.append(key, value);
  }
  params.set('url', remoteUrl);
  params.set('p', pattern);
  if ($('transparent').checked) params.set('bg', 'transparent');
  if (!$('options').checkValidity()) throw new EditorError('invalidDimensions');
  const settings = parseOptions(params);
  if (settings.width === undefined || settings.height === undefined) throw new EditorError('invalidDimensions');
  return { ...settings, width: settings.width, height: settings.height };
}
function render(): void {
  frame = 0;
  for (const [key, suffix] of [['zoom', '×'], ['x', '%'], ['y', '%'], ['border', ' px']] as const) $(`${key}-value` as const).value = $(key).value + suffix;
  for (const button of $('shapes').querySelectorAll<HTMLButtonElement>('button[data-pattern]')) button.setAttribute('aria-pressed', String(button.dataset.pattern === pattern));
  $('bg').disabled = $('transparent').checked;
  $('shape-label').textContent = t(pattern);
  if (!source || pending) return;
  try {
    const settings = options();
    svg = renderSvg(source, settings);
    const old = previewUrl;
    previewUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    $('result').src = previewUrl;
    if (old) URL.revokeObjectURL(old);
    $('original').src = source.data;
    $('dimensions').textContent = `${settings.width} × ${settings.height}`;
    $('embed').value = remoteUrl ? new URL('/api?' + toQuery(settings), location.origin).href : '';
    setAvailable(true);
    shapePreviews.render(settings);
    if ($('status').classList.contains('error')) status('previewUpdated');
  } catch (error) {
    svg = '';
    $('embed').value = '';
    setAvailable(false);
    status(errorKey(error, 'invalidSettings'), true);
  }
}
function scheduleRender(): void {
  if (!frame) frame = requestAnimationFrame(render);
}
function loadImage(data: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new EditorError('decodeError'));
    image.src = data;
  });
}
async function acceptSource(data: string, url: string, name: string, id: number): Promise<void> {
  const image = await loadImage(data);
  if (id !== requestId) return;
  if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth > 16384 || image.naturalHeight > 16384 || image.naturalWidth * image.naturalHeight > MAX_PIXELS) throw new EditorError('imageTooLarge');
  source = { data, width: image.naturalWidth, height: image.naturalHeight };
  shapePreviews.setSource(image);
  remoteUrl = url;
  sourceName = name;
  busy(false);
  render();
  if (svg) status(url ? 'readyRemote' : 'readyLocal');
}
async function loadUrl(value: string): Promise<void> {
  const id = ++requestId;
  controller?.abort();
  controller = new AbortController();
  busy(true);
  status('loadingSource');
  try {
    let url: string;
    try { url = validateUrl(value.trim()).href; }
    catch { throw new EditorError('invalidUrl'); }
    const response = await fetch('/api?' + new URLSearchParams({ url, p: 'square', width: '512', height: '512' }), { signal: controller.signal });
    if (!response.ok) {
      const messages: Record<string, MessageKey> = { blocked_source: 'blockedSource', source_too_large: 'sourceTooLarge', source_timeout: 'sourceTimeout', invalid_image: 'invalidImage' };
      throw new EditorError(messages[response.headers.get('x-crop-error') ?? ''] || 'loadError');
    }
    const text = await response.text();
    const document = new DOMParser().parseFromString(text, 'image/svg+xml');
    const data = document.querySelector('image')?.getAttribute('href');
    if (!data || !/^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/]+=*$/.test(data) || data.length > MAX_BYTES * 4 / 3 + 64) throw new EditorError('unexpectedResponse');
    await acceptSource(data, url, '', id);
  } catch (error) {
    if (id !== requestId) return;
    busy(false);
    remoteUrl = '';
    svg = '';
    setAvailable(false);
    status(errorKey(error, 'loadError'), true);
  }
}
async function loadFile(file: File | undefined): Promise<void> {
  if (!file) return;
  const id = ++requestId;
  controller?.abort();
  busy(true);
  try {
    if (!file.size || file.size > MAX_BYTES) throw new EditorError('fileSizeError');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const ascii = (start: number, end: number): string => String.fromCharCode(...bytes.slice(start, end));
    let mime;
    if (bytes[0] === 137 && ascii(1, 4) === 'PNG') mime = 'image/png';
    else if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) mime = 'image/jpeg';
    else if (['GIF87a', 'GIF89a'].includes(ascii(0, 6))) mime = 'image/gif';
    else if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') mime = 'image/webp';
    else throw new EditorError('fileTypeError');
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new EditorError('fileReadError'));
      reader.onerror = () => reject(new EditorError('fileReadError'));
      reader.readAsDataURL(new Blob([bytes], { type: mime }));
    });
    if (id !== requestId) return;
    $('url').value = '';
    await acceptSource(data, '', file.name, id);
  } catch (error) {
    if (id !== requestId) return;
    busy(false);
    remoteUrl = '';
    svg = '';
    setAvailable(false);
    status(errorKey(error, 'fileReadError'), true);
  } finally { $('file').value = ''; }
}
function applySettings(settings: Options): void {
  pattern = settings.pattern;
  for (const key of ['width', 'height', 'fit', 'x', 'y', 'zoom', 'border', 'color', 'bg'] as const) {
    if (settings[key] !== undefined && settings[key] !== 'transparent') $(key).value = String(settings[key]);
  }
  $('transparent').checked = settings.bg === 'transparent';
  scheduleRender();
}
function download(blob: Blob, extension: 'svg' | 'png'): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `crop-icon-${pattern}.${extension}`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function copy(text: string): Promise<void> {
  try { await navigator.clipboard.writeText(text); status('copied'); }
  catch {
    $('embed').value = text;
    $('embed').focus();
    $('embed').select();
    status('clipboardUnavailable');
  }
}
// html.ts renders the controls; this module progressively adds editor behavior.
const usage = document.querySelector<HTMLDetailsElement>('#usage');
document.querySelector('a[href="#usage"]')?.addEventListener('click', () => { if (usage) usage.open = true; });
if (location.hash === '#usage' && usage) usage.open = true;
$('language').value = locale;
localizeDocument(locale);
$('language').addEventListener('change', () => {
  const next = $('language').value;
  if (!isLocale(next)) return;
  locale = next;
  saveLocale(locale);
  localizeDocument(locale);
  refreshText();
});
for (const button of document.querySelectorAll<HTMLButtonElement>('#shapes [data-pattern]')) {
  button.addEventListener('click', () => {
    const next = button.dataset.pattern;
    if (isPattern(next)) { pattern = next; scheduleRender(); }
  });
}
$('source-form').addEventListener('submit', event => { event.preventDefault(); if ($('url').value) loadUrl($('url').value); });
$('file').addEventListener('change', () => loadFile($('file').files?.[0]));
$('options').addEventListener('submit', event => event.preventDefault());
$('options').addEventListener('input', scheduleRender);
$('reset').addEventListener('click', () => {
  $('options').reset(); pattern = 'circle'; render(); status('resetDone');
});
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-preset]')) {
  button.addEventListener('click', () => {
    const presets: Record<string, Record<string, string>> = { avatar: { p: 'circle', width: '256', height: '256', border: '0' }, sticker: { p: 'flower', width: '512', height: '512', border: '12' }, token: { p: 'hexagon', width: '256', height: '256', border: '8', color: 'e95432' } };
    applySettings(parseOptions({ ...presets[button.dataset.preset ?? 'avatar'], fit: 'cover' }));
    status('presetDone');
  });
}
for (const event of ['dragenter', 'dragover']) $('drop-zone').addEventListener(event, e => { e.preventDefault(); $('drop-zone').classList.add('dragging'); });
for (const event of ['dragleave', 'drop']) $('drop-zone').addEventListener(event, e => { e.preventDefault(); $('drop-zone').classList.remove('dragging'); });
$('drop-zone').addEventListener('drop', e => loadFile(e.dataTransfer?.files[0]));
window.addEventListener('dragover', e => { if (e.dataTransfer?.types.includes('Files')) e.preventDefault(); });
window.addEventListener('drop', e => { if (e.dataTransfer?.types.includes('Files')) e.preventDefault(); });
$('download-svg').addEventListener('click', () => { if (svg) download(new Blob([svg], { type: 'image/svg+xml' }), 'svg'); });
$('download-png').addEventListener('click', async () => {
  if (!svg || pending) return;
  const object = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const settings = options();
    const image = await loadImage(object);
    const canvas = document.createElement('canvas');
    canvas.width = settings.width;
    canvas.height = settings.height;
    const context = canvas.getContext('2d');
    if (!context) throw new EditorError('canvasError');
    context.drawImage(image, 0, 0);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new EditorError('pngError');
    download(blob, 'png'); status('pngDownloaded');
  } catch (error) { status(errorKey(error, 'pngError'), true); }
  finally { URL.revokeObjectURL(object); }
});
$('copy-url').addEventListener('click', () => copy(new URL('/api?' + toQuery(options()), location.origin).href));
$('copy-md').addEventListener('click', () => copy(`![icon](${new URL('/api?' + toQuery(options()), location.origin).href})`));
$('copy-html').addEventListener('click', () => copy(`<img src="${escapeXml(new URL('/api?' + toQuery(options()), location.origin).href)}" alt="icon" width="${options().width}" height="${options().height}">`));
$('copy-editor').addEventListener('click', () => copy(new URL('/#' + toQuery(options()), location.origin).href));

setAvailable(false);
refreshText();
const shared = location.hash.slice(1);
if (shared && shared !== 'usage') {
  try {
    const settings = parseOptions(new URLSearchParams(shared));
    if (!settings.url) throw new EditorError('invalidEditLink');
    applySettings(settings);
    $('url').value = settings.url;
    loadUrl(settings.url).then(() => {
      if (!source) return;
      if (settings.width === undefined) $('width').value = String(source.width);
      if (settings.height === undefined) $('height').value = String(source.height);
      render();
    });
  } catch { status('invalidEditLink', true); }
} else {
  void loadUrl($('url').value);
}
