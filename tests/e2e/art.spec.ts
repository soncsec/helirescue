import { expect, test, type Page } from '@playwright/test';
import type { ArtSnapshot } from '../../src/scenes/ArtScene';

async function art(page: Page): Promise<ArtSnapshot | null> {
  return page.evaluate(() => window.__game?.art() ?? null);
}

test('the art viewer loads all the art with no errors or third-party requests', async ({
  page,
}) => {
  const errors: string[] = [];
  const foreign: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (url.protocol.startsWith('http') && url.hostname !== 'localhost') foreign.push(req.url());
  });

  await page.goto('./?scene=art');
  await expect.poll(() => art(page), { timeout: 15_000 }).toMatchObject({ mode: 'night' });
  expect((await art(page))?.missing).toEqual([]);

  await page.keyboard.press('2');
  await expect.poll(async () => (await art(page))?.mode).toBe('war');
  await page.keyboard.press('3');
  await expect.poll(async () => (await art(page))?.mode).toBe('friendly');
  await page.keyboard.press('4');
  await expect.poll(async () => (await art(page))?.mode).toBe('enemies');
  await page.keyboard.press('1');
  await expect.poll(async () => (await art(page))?.mode).toBe('night');

  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
  expect(foreign).toEqual([]);
});

test('without ?scene=art the title screen opens', async ({ page }) => {
  await page.goto('./');
  await expect
    .poll(() => page.evaluate(() => window.__game?.scene() ?? null), { timeout: 15_000 })
    .toBe('Title');
});
