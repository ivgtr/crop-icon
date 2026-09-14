import { test, expect, type Page, type Route } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { PNG } from '../fixtures.js';
import { parseOptions, renderSvg } from '../../api/_lib/core.js';
import { en } from '../../api/_lib/locales/en.js';
import { ja } from '../../api/_lib/locales/ja.js';

async function imageResponse(route: Route): Promise<void> {
  const options = parseOptions(new URL(route.request().url()).searchParams);
  await route.fulfill({ contentType: 'image/svg+xml', body: renderSvg({ data: `data:image/png;base64,${PNG.toString('base64')}`, width: 32, height: 16 }, options) });
}
async function openDemo(page: Page, path = '/'): Promise<void> {
  await page.route('**/api?*', imageResponse);
  await page.goto(path);
  await expect(page.locator('#download-svg')).toBeEnabled();
}
async function downloadSvg(page: Page): Promise<string> {
  const received = page.waitForEvent('download');
  await page.locator('#download-svg').click();
  const file = await received;
  expect(await file.failure()).toBeNull();
  const path = await file.path();
  expect(path).not.toBeNull();
  return readFile(path!, 'utf8');
}

test('language changes preserve local source, edits and SVG, without making network requests', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await openDemo(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.locator('#file').setInputFiles({ name: '<photo>.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.locator('#privacy')).toContainText('<photo>.png');
  await page.locator('#width').fill('128');
  await page.locator('#height').fill('96');
  await page.locator('#fit').selectOption('contain');
  await page.locator('#shapes [data-pattern="heart"]').click();
  await expect(page.locator('#dimensions')).toHaveText('128 × 96');
  await expect(page.locator('#shape-label')).toHaveText('Heart');
  const before = await downloadSvg(page);
  const preview = await page.locator('#result').getAttribute('src');
  expect(preview).not.toBeNull();
  const network: string[] = [];
  page.on('request', request => { if (/^https?:/.test(request.url())) network.push(request.url()); });
  await page.locator('#language').selectOption('ja');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
  await expect(page).toHaveTitle(ja.title);
  await expect(page.locator('h1')).toHaveText(ja.introTitle);
  await expect(page.locator('#language')).toHaveAttribute('aria-label', ja.language);
  await expect(page.locator('#original')).toHaveAttribute('alt', ja.originalAlt);
  await expect(page.locator('#result')).toHaveAttribute('alt', ja.resultAlt);
  await expect(page.locator('#shapes [data-pattern="heart"]')).toHaveAttribute('aria-label', ja.heart);
  await expect(page.locator('#shape-label')).toHaveText(ja.heart);
  await expect(page.locator('#privacy')).toHaveText('<photo>.png ／ 端末内で編集・アップロードなし');
  await expect(page.locator('#privacy img')).toHaveCount(0);
  await expect(page.locator('#width')).toHaveValue('128');
  await expect(page.locator('#height')).toHaveValue('96');
  await expect(page.locator('#fit')).toHaveValue('contain');
  await expect(page.locator('#copy-url')).toBeDisabled();
  await expect(page.locator('#result')).toHaveAttribute('src', preview!);
  expect(await downloadSvg(page)).toBe(before);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('studio-ja.png'), fullPage: true });
  await page.locator('#language').selectOption('en');
  await expect(page.locator('#shape-label')).toHaveText('Heart');
  await expect(page.locator('#result')).toHaveAttribute('src', preview!);
  expect(await downloadSvg(page)).toBe(before);
  expect(network).toEqual([]);
  expect(errors).toEqual([]);
});

test('language changes translate existing errors, reset feedback and persist across reload', async ({ page }) => {
  await openDemo(page);
  await page.locator('#width').fill('0');
  await expect(page.locator('#status')).toHaveText(en.invalidDimensions);
  await page.locator('#language').selectOption('ja');
  await expect(page.locator('#status')).toHaveText(ja.invalidDimensions);
  await expect(page.locator('#status')).toHaveClass(/error/);
  await expect(page.locator('#download-svg')).toBeDisabled();
  await page.locator('#reset').click();
  await expect(page.locator('#status')).toHaveText(ja.resetDone);
  await expect(page.locator('#shape-label')).toHaveText(ja.circle);
  await expect(page.locator('#download-svg')).toBeEnabled();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
  await expect(page.locator('#language')).toHaveValue('ja');
  await expect(page.locator('#status')).toHaveText(ja.readyRemote);
});

test('English is the default even with a Japanese browser, and unsupported saved locales are ignored', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'language', { get: () => 'ja-JP' });
    localStorage.setItem('crop-icon:language', 'fr');
  });
  await openDemo(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('#language')).toHaveValue('en');
  await expect(page.locator('#status')).toHaveText(en.readyRemote);
});

test('language switching remains usable when storage is disabled', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage disabled', 'SecurityError'); } });
  });
  await openDemo(page);
  await page.locator('#language').selectOption('ja');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
  await expect(page.locator('#status')).toHaveText(ja.readyRemote);
  await expect(page.locator('#download-svg')).toBeEnabled();
});

test('default-source failure does not restore a generated sample and local files recover', async ({ page }) => {
  await page.route('**/api?*', route => route.fulfill({ status: 404, headers: { 'x-crop-error': 'source_timeout' }, body: '' }));
  await page.goto('/');
  await expect(page.locator('#url')).toHaveValue('https://github.com/ivgtr.png');
  await expect(page.locator('#status')).toHaveText(en.sourceTimeout);
  await expect(page.locator('#download-svg')).toBeDisabled();
  await expect(page.locator('#result')).not.toHaveAttribute('src');
  await expect(page.locator('#original')).not.toHaveAttribute('src');
  await page.locator('#language').selectOption('ja');
  await expect(page.locator('#status')).toHaveText(ja.sourceTimeout);
  await page.locator('#file').setInputFiles({ name: 'local.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.locator('#status')).toHaveText(ja.readyLocal);
  await expect(page.locator('#download-svg')).toBeEnabled();
  await expect(page.locator('#copy-url')).toBeDisabled();
});

test('switching language while the default source loads updates both loading and completion messages', async ({ page }) => {
  let release: () => void = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api?*', async route => { await gate; await imageResponse(route); });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#load')).toHaveText(en.loading);
  await page.locator('#language').selectOption('ja');
  await expect(page.locator('#load')).toHaveText(ja.loading);
  await expect(page.locator('#status')).toHaveText(ja.loadingSource);
  release();
  await expect(page.locator('#status')).toHaveText(ja.readyRemote);
  await expect(page.locator('#load')).toHaveText(ja.load);
});

test('shared source takes precedence over the default and retains crop settings', async ({ page }) => {
  const loads: string[] = [];
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname === '/api') loads.push(url.searchParams.get('url') ?? '');
  });
  const url = 'https://example.com/shared.png';
  await openDemo(page, '/#' + new URLSearchParams({ url, p: 'hexagon', width: '128', height: '96', zoom: '2' }));
  expect(loads).toEqual([url]);
  await expect(page.locator('#url')).toHaveValue(url);
  await expect(page.locator('#shape-label')).toHaveText(en.hexagon);
  await expect(page.locator('#zoom')).toHaveValue('2');
  const embed = await page.locator('#embed').inputValue();
  await page.locator('#language').selectOption('ja');
  await expect(page.locator('#embed')).toHaveValue(embed);
  await expect(page.locator('#shape-label')).toHaveText(ja.hexagon);
  await expect(page.locator('#zoom')).toHaveValue('2');
});

test('usage anchor loads the default, while an invalid edit link is reported without fetching', async ({ page }) => {
  await openDemo(page, '/#usage');
  await expect(page.locator('#url')).toHaveValue('https://github.com/ivgtr.png');
  const loads: string[] = [];
  page.on('request', request => { if (new URL(request.url()).pathname === '/api') loads.push(request.url()); });
  await page.goto('/#p=unknown', { waitUntil: 'domcontentloaded' });
  await page.reload();
  await expect(page.locator('#status')).toHaveText(en.invalidEditLink);
  await expect(page.locator('#download-svg')).toBeDisabled();
  expect(loads).toEqual([]);
});
