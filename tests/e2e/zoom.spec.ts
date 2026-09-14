import { test, expect, type BrowserContext, type Page, type Route } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { parseOptions } from '../../api/_lib/options.js';
import { MAX_ZOOM, MIN_ZOOM } from '../../api/_lib/model.js';
import { renderSvg } from '../../api/_lib/renderer.js';
import { PNG } from '../fixtures.js';

const source = { data: `data:image/png;base64,${PNG.toString('base64')}`, width: 32, height: 16 };

async function imageResponse(route: Route): Promise<void> {
  const options = parseOptions(new URL(route.request().url()).searchParams);
  await route.fulfill({ contentType: 'image/svg+xml', body: renderSvg(source, options) });
}

async function installImageRoute(context: BrowserContext): Promise<void> {
  await context.route('**/api?*', imageResponse);
}

async function previewSvg(page: Page): Promise<string> {
  return page.locator('#result').evaluate(async (image: HTMLImageElement) => (await fetch(image.src)).text());
}

async function downloadPng(page: Page): Promise<Buffer> {
  const received = page.waitForEvent('download');
  await page.locator('#download-png').click();
  const file = await received;
  expect(await file.failure()).toBeNull();
  const path = await file.path();
  expect(path).not.toBeNull();
  return readFile(path!);
}

test('zoom-out uses shared limits in the editor, embed URL, edit link and PNG export', async ({ page, context }) => {
  await installImageRoute(context);
  await page.goto('/');
  await expect(page.locator('#download-svg')).toBeEnabled();

  const zoom = page.locator('#zoom');
  await expect(zoom).toHaveAttribute('min', String(MIN_ZOOM));
  await expect(zoom).toHaveAttribute('max', String(MAX_ZOOM));
  await zoom.fill('0.5');
  await expect(page.locator('#zoom-value')).toHaveValue('0.5×');

  const svg = await previewSvg(page);
  expect(svg).toContain('x="128" y="192" width="256" height="128"');

  const embed = await page.locator('#embed').inputValue();
  expect(new URL(embed).searchParams.get('zoom')).toBe('0.5');
  const embeddedSvg = await page.evaluate(async url => (await fetch(url)).text(), embed);
  expect(embeddedSvg).toContain('x="128" y="192" width="256" height="128"');

  await page.locator('#copy-editor').click();
  const editLink = await page.evaluate(() => navigator.clipboard.readText());
  expect(new URLSearchParams(new URL(editLink).hash.slice(1)).get('zoom')).toBe('0.5');

  const shared = await context.newPage();
  await shared.goto(editLink);
  await expect(shared.locator('#zoom')).toHaveValue('0.5');
  expect(await previewSvg(shared)).toContain('x="128" y="192" width="256" height="128"');

  const png = await downloadPng(page);
  const alpha = await page.evaluate(async data => {
    const image = new Image();
    image.src = data;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Missing canvas');
    context.drawImage(image, 0, 0);
    return [
      context.getImageData(256, 256, 1, 1).data[3],
      context.getImageData(256, 150, 1, 1).data[3],
    ];
  }, `data:image/png;base64,${png.toString('base64')}`);
  expect(alpha).toEqual([255, 0]);
});
