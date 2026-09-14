import { test, expect, type Page } from '@playwright/test';
import { parseOptions, renderSvg } from '../../api/_lib/core.js';
import { PNG } from '../fixtures.js';

declare global {
  interface Window {
    cropTestBlobs: Map<string, Blob>;
    cropTestRevoked: string[];
  }
}

async function observeBlobs(page: Page): Promise<void> {
  // Inspect created bytes without fetching blob: URLs, which connect-src excludes.
  // Keep the real URL lifecycle and the production CSP intact.
  await page.addInitScript(() => {
    window.cropTestBlobs = new Map();
    window.cropTestRevoked = [];
    const create = URL.createObjectURL.bind(URL);
    const revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = object => {
      const url = create(object);
      if (object instanceof Blob) window.cropTestBlobs.set(url, object);
      return url;
    };
    URL.revokeObjectURL = url => {
      window.cropTestRevoked.push(url);
      window.cropTestBlobs.delete(url);
      revoke(url);
    };
  });
}

async function openDemo(page: Page): Promise<void> {
  await page.route('**/api?*', route => route.fulfill({
    contentType: 'image/svg+xml',
    body: renderSvg({ data: `data:image/png;base64,${PNG.toString('base64')}`, width: 32, height: 16 },
      parseOptions(new URL(route.request().url()).searchParams)),
  }));
  await page.goto('/');
  await expect(page.locator('#download-png')).toBeEnabled();
  await expect.poll(() => page.locator('#shapes img').evaluateAll(images =>
    images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
}

test('results and downloads precede settings; en/ja fit narrow and wide screens', async ({ page }) => {
  await openDemo(page);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const locale of ['en', 'ja']) {
      await page.locator('#language').selectOption(locale);
      await page.evaluate(() => scrollTo(0, 0));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}/${locale}`).toBe(true);
      const original = await page.locator('#original').boundingBox();
      const result = await page.locator('#result').boundingBox();
      const download = await page.locator('#download-png').boundingBox();
      expect(result!.width).toBeGreaterThan(original!.width * 1.5);
      expect(result!.y + result!.height).toBeLessThan(900);
      expect(download!.y + download!.height).toBeLessThan(900);
      await expect(page.locator('#shapes button')).toHaveCount(11);
    }
  }
});

test('shape thumbnails share crop geometry and update without more source requests', async ({ page }) => {
  await observeBlobs(page);
  const requests: string[] = [];
  page.on('request', request => { if (/\/api\?/.test(request.url())) requests.push(request.url()); });
  await openDemo(page);
  await page.locator('#width').fill('300');
  await page.locator('#height').fill('180');
  await page.locator('#fit').selectOption('contain');
  await page.locator('#zoom').evaluate((input: HTMLInputElement) => {
    input.value = '.5'; input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.locator('[data-pattern="hexagon"]').click();
  await expect(page.locator('#dimensions')).toHaveText('300 × 180');
  await expect(page.locator('#zoom-value')).toHaveText('0.5×');
  const geometry = await page.evaluate(async () => {
    const read = async (selector: string) => {
      const image = document.querySelector<HTMLImageElement>(selector)!;
      const blob = window.cropTestBlobs.get(image.src);
      if (!blob) throw new Error('Missing generated preview Blob.');
      const svg = new DOMParser().parseFromString(await blob.text(), 'image/svg+xml');
      return {
        viewBox: svg.documentElement.getAttribute('viewBox'),
        shape: svg.querySelector('clipPath')!.innerHTML,
        image: ['x', 'y', 'width', 'height'].map(key => svg.querySelector('image')!.getAttribute(key)),
      };
    };
    return [await read('#result'), await read('[data-shape-preview="hexagon"]')];
  });
  expect(geometry[1]).toEqual(geometry[0]);
  expect(requests).toHaveLength(1);
  const before = await page.locator('[data-shape-preview="circle"]').getAttribute('src');
  await page.locator('[data-pattern="star"]').click();
  await expect(page.locator('#shape-label')).toHaveText('Star');
  await expect(page.locator('[data-shape-preview="circle"]')).toHaveAttribute('src', before!);
});

test('source failures clear comparison images and a local file restores them', async ({ page }) => {
  await observeBlobs(page);
  await openDemo(page);
  const previous = await page.locator('[data-shape-preview="circle"]').getAttribute('src');
  await page.route('**/api?*', route => route.fulfill({ status: 404, body: '' }));
  await page.locator('#load').click();
  await expect(page.locator('#download-png')).toBeDisabled();
  await expect(page.locator('#shapes img:not([hidden])')).toHaveCount(0);
  await expect(page.locator('#shapes svg:not([hidden])')).toHaveCount(11);
  expect(await page.evaluate(url => window.cropTestRevoked.includes(url!), previous)).toBe(true);
  await page.locator('#file').setInputFiles({ name: 'local.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.locator('#download-png')).toBeEnabled();
  await expect(page.locator('#shapes img:not([hidden])')).toHaveCount(11);
  await expect(page.locator('#copy-url')).toBeDisabled();
});

test('mobile settings keep the crop visible without covering the active slider', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openDemo(page);
  await page.locator('#zoom').evaluate(element => element.scrollIntoView({ block: 'center' }));
  const preview = await page.locator('.preview-panel').boundingBox();
  const slider = await page.locator('#zoom').boundingBox();
  expect(preview!.y).toBeGreaterThanOrEqual(0);
  expect(preview!.y).toBeLessThan(2);
  expect(preview!.y + preview!.height).toBeLessThan(slider!.y);
  await page.locator('#zoom').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#zoom-value')).toHaveText('1.05×');
});

test('shape selection works with a keyboard and the API link opens its reference', async ({ page }) => {
  await openDemo(page);
  await page.locator('[data-pattern="heart"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-pattern="heart"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#shape-label')).toHaveText('Heart');
  await page.locator('nav a[href="#usage"]').click();
  await expect(page.locator('#usage')).toHaveAttribute('open', '');
  await expect(page.locator('#usage code')).toBeVisible();
  await expect(page.locator('#usage a[href$="#api"]')).toBeVisible();
});
