import { MAX_BYTES, MAX_PIXELS, parseOptions, renderSvg, toQuery, validateUrl, escapeXml } from './core.js';

const $ = id => document.getElementById(id);
const label = p => p === 'hart' || p === 'heart' ? 'Heart' : p[0].toUpperCase() + p.slice(1);
let pattern = 'circle';
let source = null;
let remoteUrl = '';
let previewUrl = '';
let svg = '';
let requestId = 0;
let controller;
let pending = false;
let frame = 0;
const copyIds = ['copy-url', 'copy-md', 'copy-html', 'copy-editor'];

function status(message, error = false) {
  $('status').textContent = message;
  $('status').classList.toggle('error', error);
}
function setAvailable(available) {
  $('download-svg').disabled = $('download-png').disabled = !available;
  for (const id of copyIds) $(id).disabled = !available || !remoteUrl;
}
function busy(value) {
  pending = value;
  $('preview-area').setAttribute('aria-busy', String(value));
  $('load').textContent = value ? 'Loading…' : 'Load ↗';
  if (value) {
    source = null; remoteUrl = ''; svg = '';
    $('original').removeAttribute('src'); $('result').removeAttribute('src');
    setAvailable(false); $('embed').value = '';
  }
}
function options() {
  const params = new URLSearchParams(new FormData($('options')));
  params.set('url', remoteUrl);
  params.set('p', pattern);
  if ($('transparent').checked) params.set('bg', 'transparent');
  if (!$('options').checkValidity()) throw new Error('Use dimensions between 1 and 4096 whole pixels.');
  return parseOptions(params);
}
function render() {
  frame = 0;
  for (const [key, suffix] of [['zoom', '×'], ['x', '%'], ['y', '%'], ['border', ' px']]) $(key + '-value').value = $(key).value + suffix;
  for (const button of $('shapes').children) button.setAttribute('aria-pressed', String(button.dataset.pattern === (pattern === 'heart' ? 'hart' : pattern)));
  $('bg').disabled = $('transparent').checked;
  if (!source || pending) return;
  try {
    const settings = options();
    svg = renderSvg(source, settings);
    const old = previewUrl;
    previewUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    $('result').src = previewUrl;
    if (old) URL.revokeObjectURL(old);
    $('original').src = source.data;
    $('shape-label').textContent = label(pattern);
    $('dimensions').textContent = `${settings.width} × ${settings.height}`;
    $('embed').value = remoteUrl ? new URL('/api?' + toQuery(settings), location.origin).href : '';
    setAvailable(true);
    if ($('status').classList.contains('error')) status('Preview updated.');
  } catch (error) {
    svg = '';
    $('embed').value = '';
    setAvailable(false);
    status(error.message, true);
  }
}
function scheduleRender() {
  if (!frame) frame = requestAnimationFrame(render);
}
function loadImage(data) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('This image could not be decoded. Try PNG, JPG, GIF or WebP.'));
    image.src = data;
  });
}
async function acceptSource(data, url, description, id) {
  const image = await loadImage(data);
  if (id !== requestId) return;
  if (!image.naturalWidth || image.naturalWidth > 16384 || image.naturalHeight > 16384 || image.naturalWidth * image.naturalHeight > MAX_PIXELS) throw new Error('Image is too large (maximum 40 megapixels).');
  source = { data, width: image.naturalWidth, height: image.naturalHeight };
  remoteUrl = url;
  $('privacy').textContent = description;
  $('source-info').textContent = `${source.width} × ${source.height} source · ${url ? 'Public URL' : 'On-device'}`;
  busy(false);
  render();
  status(url ? 'Ready. Adjust locally, then copy a live embed or download a snapshot.' : 'Ready. Your image stays on this device. SVG and PNG downloads are available.');
}
async function loadUrl(value) {
  const id = ++requestId;
  controller?.abort();
  controller = new AbortController();
  busy(true);
  status('Loading the image through the API…');
  try {
    const url = validateUrl(value.trim()).href;
    // Fetch once; all subsequent edits are local. Fixed dimensions allow large source images.
    const response = await fetch('/api?' + new URLSearchParams({ url, p: 'square', width: '512', height: '512' }), { signal: controller.signal });
    if (!response.ok) {
      const messages = { blocked_source: 'Use a publicly accessible image URL. Private networks are not supported.', source_too_large: 'Image exceeds the 3 MiB limit.', source_timeout: 'The image host took too long to respond.', invalid_image: 'Use a PNG, JPG, GIF or WebP image (up to 40 megapixels).' };
      throw new Error(messages[response.headers.get('x-crop-error')] || 'Could not load this image. Check that the URL is public and points directly to an image.');
    }
    const text = await response.text();
    const document = new DOMParser().parseFromString(text, 'image/svg+xml');
    const data = document.querySelector('image')?.getAttribute('href');
    if (!data || !/^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/]+=*$/.test(data) || data.length > MAX_BYTES * 4 / 3 + 64) throw new Error('Unexpected image response.');
    await acceptSource(data, url, 'Public source · fetched once, edited on-device', id);
  } catch (error) {
    if (id !== requestId) return;
    busy(false);
    remoteUrl = '';
    svg = '';
    setAvailable(false);
    status(error.message, true);
  }
}
async function loadFile(file) {
  if (!file) return;
  const id = ++requestId;
  controller?.abort();
  busy(true);
  try {
    if (!file.size || file.size > MAX_BYTES) throw new Error('Choose an image smaller than 3 MiB.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    // Do not trust a file extension or caller-supplied MIME type (especially SVG/HTML).
    const ascii = (start, end) => String.fromCharCode(...bytes.slice(start, end));
    let mime;
    if (bytes[0] === 137 && ascii(1, 4) === 'PNG') mime = 'image/png';
    else if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) mime = 'image/jpeg';
    else if (['GIF87a', 'GIF89a'].includes(ascii(0, 6))) mime = 'image/gif';
    else if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') mime = 'image/webp';
    else throw new Error('Choose a PNG, JPG, GIF or WebP image. SVG input is not accepted.');
    const data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Could not read this file.'));
      reader.readAsDataURL(new Blob([bytes], { type: mime }));
    });
    if (id !== requestId) return;
    $('url').value = '';
    await acceptSource(data, '', `${file.name} · on-device, never uploaded`, id);
  } catch (error) {
    if (id !== requestId) return;
    busy(false);
    remoteUrl = '';
    svg = '';
    setAvailable(false);
    status(error.message, true);
  } finally { $('file').value = ''; }
}
function applySettings(settings) {
  pattern = settings.pattern;
  for (const key of ['width', 'height', 'fit', 'x', 'y', 'zoom', 'border', 'color', 'bg']) {
    if (settings[key] !== undefined && settings[key] !== 'transparent') $(key).value = settings[key];
  }
  $('transparent').checked = settings.bg === 'transparent';
  scheduleRender();
}
function download(blob, extension) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `crop-icon-${pattern}.${extension}`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function copy(text) {
  try { await navigator.clipboard.writeText(text); status('Copied. Ready to paste.'); }
  catch {
    $('embed').value = text;
    $('embed').focus();
    $('embed').select();
    status('Clipboard unavailable. The text is selected above; copy it manually.');
  }
}
// html.ts renders the controls; this script progressively adds editor behavior.
for (const button of document.querySelectorAll('#shapes [data-pattern]')) {
  button.addEventListener('click', () => { pattern = button.dataset.pattern; scheduleRender(); });
}
$('source-form').addEventListener('submit', event => { event.preventDefault(); if ($('url').value) loadUrl($('url').value); });
$('file').addEventListener('change', () => loadFile($('file').files[0]));
$('options').addEventListener('submit', event => event.preventDefault());
$('options').addEventListener('input', scheduleRender);
$('reset').addEventListener('click', () => {
  $('options').reset(); pattern = 'circle'; render(); status('Edits reset. Your source image is unchanged.');
});
for (const button of document.querySelectorAll('[data-preset]')) {
  button.addEventListener('click', () => {
    const presets = { avatar: { p: 'circle', width: '256', height: '256', border: '0' }, sticker: { p: 'flower', width: '512', height: '512', border: '12' }, token: { p: 'hexagon', width: '256', height: '256', border: '8', color: 'e95432' } };
    applySettings(parseOptions({ ...presets[button.dataset.preset], fit: 'cover' }));
    status('Starting point applied. Keep adjusting to make it yours.');
  });
}
for (const event of ['dragenter', 'dragover']) $('drop-zone').addEventListener(event, e => { e.preventDefault(); $('drop-zone').classList.add('dragging'); });
for (const event of ['dragleave', 'drop']) $('drop-zone').addEventListener(event, e => { e.preventDefault(); $('drop-zone').classList.remove('dragging'); });
$('drop-zone').addEventListener('drop', e => loadFile(e.dataTransfer.files[0]));
// Prevent a file dropped outside the target from navigating away from an unsaved edit.
window.addEventListener('dragover', e => { if (e.dataTransfer.types.includes('Files')) e.preventDefault(); });
window.addEventListener('drop', e => { if (e.dataTransfer.types.includes('Files')) e.preventDefault(); });
$('download-svg').addEventListener('click', () => { if (svg) download(new Blob([svg], { type: 'image/svg+xml' }), 'svg'); });
$('download-png').addEventListener('click', async () => {
  if (!svg || pending) return;
  const snapshot = svg;
  const settings = options();
  const object = URL.createObjectURL(new Blob([snapshot], { type: 'image/svg+xml' }));
  try {
    const image = await loadImage(object);
    const canvas = document.createElement('canvas');
    canvas.width = settings.width;
    canvas.height = settings.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is not available in this browser. Download SVG instead.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('PNG export failed. Try a smaller output size.');
    download(blob, 'png'); status('PNG downloaded. Animated sources are captured as a single frame.');
  } catch (error) { status(error.message, true); }
  finally { URL.revokeObjectURL(object); }
});
$('copy-url').addEventListener('click', () => copy(new URL('/api?' + toQuery(options()), location.origin).href));
$('copy-md').addEventListener('click', () => copy(`![icon](${new URL('/api?' + toQuery(options()), location.origin).href})`));
$('copy-html').addEventListener('click', () => copy(`<img src="${escapeXml(new URL('/api?' + toQuery(options()), location.origin).href)}" alt="icon" width="${options().width}" height="${options().height}">`));
$('copy-editor').addEventListener('click', () => copy(new URL('/#' + toQuery(options()), location.origin).href));

// A procedural raster demo means the first render needs neither a network request nor an upload.
const canvas = document.createElement('canvas');
canvas.width = canvas.height = 640;
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#f3ba79'; ctx.fillRect(0, 0, 640, 640);
ctx.fillStyle = '#e95432'; ctx.beginPath(); ctx.arc(320, 320, 250, 0, Math.PI * 2); ctx.fill();
ctx.strokeStyle = '#202a25'; ctx.lineWidth = 26; ctx.lineCap = 'square';
ctx.beginPath(); ctx.moveTo(248, 146); ctx.lineTo(248, 392); ctx.lineTo(492, 392); ctx.moveTo(146, 248); ctx.lineTo(392, 248); ctx.lineTo(392, 492); ctx.stroke();
setAvailable(false);
const shared = location.hash.slice(1);
if (shared) {
  try {
    const settings = parseOptions(new URLSearchParams(shared));
    if (!settings.url) throw new Error('This edit link has no public source.');
    applySettings(settings);
    $('url').value = settings.url;
    loadUrl(settings.url).then(() => {
      if (!source) return;
      if (settings.width === undefined) $('width').value = source.width;
      if (settings.height === undefined) $('height').value = source.height;
      render();
    });
  } catch (error) { status('Invalid edit link: ' + error.message, true); }
} else {
  source = { data: canvas.toDataURL('image/png'), width: 640, height: 640 };
  render();
}
