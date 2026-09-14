import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { PNG, JPEG, GIF, WEBP } from '../fixtures.js';

async function openStudio(page: Page): Promise<void> {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  expect(response?.headers()['content-security-policy']).toContain("script-src 'sha256-");
  await expect(page.locator('#download-svg')).toBeEnabled();
  await expect.poll(() => page.locator('#result').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
}

async function download(page: Page, extension: 'svg' | 'png'): Promise<Buffer> {
  const received = page.waitForEvent('download');
  await page.locator(`#download-${extension}`).click();
  const file = await received;
  expect(file.suggestedFilename()).toMatch(new RegExp(`^crop-icon-.*\\.${extension}$`));
  expect(await file.failure()).toBeNull();
  const path = await file.path();
  expect(path).not.toBeNull();
  return readFile(path!);
}

test('inline editor, all shapes and responsive layout work under CSP', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && /Content Security Policy|Refused to execute|Refused to apply/i.test(message.text())) errors.push(message.text()); });
  await openStudio(page);
  await expect(page.locator('#copy-url')).toBeDisabled();
  const shapes = page.locator('#shapes button[data-pattern]');
  await expect(shapes).toHaveCount(11);
  for (const button of await shapes.all()) {
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#download-svg')).toBeEnabled();
  }
  await page.locator('#reset').click();
  await expect(page.locator('#shape-label')).toHaveText('Circle');
  await expect(page.locator('#dimensions')).toHaveText('512 × 512');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('studio.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('local raster edits export real SVG and PNG without uploading', async ({ page }) => {
  await openStudio(page);
  const network: string[] = [];
  page.on('request', request => { if (/^https?:/.test(request.url())) network.push(request.url()); });
  for (const [name, mimeType, buffer] of [
    ['fixture.png', 'image/png', PNG], ['fixture.jpg', 'image/jpeg', JPEG],
    ['fixture.gif', 'image/gif', GIF], ['fixture.webp', 'image/webp', WEBP],
  ] as const) {
    await page.locator('#file').setInputFiles({ name, mimeType, buffer });
    await expect(page.locator('#privacy')).toContainText(`${name} · on-device, never uploaded`);
    await expect(page.locator('#source-info')).toContainText('32 × 16');
    await expect(page.locator('#download-png')).toBeEnabled();
  }
  await page.locator('#width').fill('128');
  await page.locator('#height').fill('96');
  await page.locator('#fit').selectOption('contain');
  await page.locator('#shapes button[data-pattern="hexagon"]').click();
  await expect(page.locator('#dimensions')).toHaveText('128 × 96');
  await expect(page.locator('#shape-label')).toHaveText('Hexagon');
  const svg = (await download(page, 'svg')).toString('utf8');
  expect(svg).toContain('width="128"');
  expect(svg).toContain('height="96"');
  expect(svg).toContain('data:image/webp;base64,');
  const png = await download(page, 'png');
  expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(png.readUInt32BE(16)).toBe(128);
  expect(png.readUInt32BE(20)).toBe(96);
  const alpha = await page.evaluate(async data => {
    const image = new Image(); image.src = data; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Missing canvas');
    ctx.drawImage(image, 0, 0);
    return [ctx.getImageData(64, 48, 1, 1).data[3], ctx.getImageData(0, 0, 1, 1).data[3]];
  }, `data:image/png;base64,${png.toString('base64')}`);
  expect(alpha).toEqual([255, 0]);
  await expect(page.locator('#copy-url')).toBeDisabled();
  expect(network).toEqual([]);
});

test('invalid inputs disable export and a valid file recovers', async ({ page }) => {
  await openStudio(page);
  await page.locator('#width').fill('0');
  await expect(page.locator('#download-svg')).toBeDisabled();
  await page.locator('#width').fill('256');
  await expect(page.locator('#download-svg')).toBeEnabled();
  await page.locator('#file').setInputFiles({ name: 'unsupported.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>') });
  await expect(page.locator('#status')).toContainText('SVG input is not accepted');
  await expect(page.locator('#download-png')).toBeDisabled();
  await page.locator('#file').setInputFiles({ name: 'valid.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.locator('#download-png')).toBeEnabled();
  await expect(page.locator('#privacy')).toContainText('valid.png');
});

test('public GitHub image, live embeds and edit links work end to end', async ({ page, context, baseURL }) => {
  await openStudio(page);
  await page.locator('#url').fill('https://github.com/ivgtr.png');
  await page.locator('#load').click();
  await expect(page.locator('#status')).toContainText('Ready.', { timeout: 20000 });
  await expect(page.locator('#copy-url')).toBeEnabled();
  await page.locator('#width').fill('128');
  await page.locator('#height').fill('128');
  await page.locator('#shapes button[data-pattern="hart"]').click();
  await expect(page.locator('#dimensions')).toHaveText('128 × 128');
  await expect(page.locator('#shape-label')).toHaveText('Heart');
  await page.locator('#copy-url').click();
  const live = await page.evaluate(() => navigator.clipboard.readText());
  expect(new URL(live).origin).toBe(new URL(baseURL!).origin);
  expect(new URL(live).searchParams.get('p')).toBe('hart');
  const image = await page.request.get(live);
  expect(image.status()).toBe(200);
  expect(image.headers()['content-type']).toContain('image/svg+xml');
  expect(image.headers()['cache-control']).toContain('max-age=86400');
  await page.locator('#copy-md').click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`![icon](${live})`);
  await page.locator('#copy-html').click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('<img src=');
  await page.locator('#copy-editor').click();
  const edit = await page.evaluate(() => navigator.clipboard.readText());
  expect(new URL(edit).hash).toContain('p=hart');
  const shared = await context.newPage();
  await shared.goto(edit);
  await expect(shared.locator('#status')).toContainText('Ready.', { timeout: 20000 });
  await expect(shared.locator('#shape-label')).toHaveText('Heart');
  await expect(shared.locator('#dimensions')).toHaveText('128 × 128');
  expect((await download(shared, 'svg')).toString('utf8')).toContain('data:image/');
  expect((await download(shared, 'png')).readUInt32BE(16)).toBe(128);
});

test('entry aliases work and internal files are not publicly served', async ({ request }) => {
  for (const path of ['/', '/api', '/api/', '/index.html']) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    expect(response.headers()['content-type']).toContain('text/html');
  }
  for (const path of ['/app.js', '/core.js', '/public/app.js', '/api/_lib/editor/index.ts', '/build/api/index.js']) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
});
