import { expect, test, type Page } from '@playwright/test';
import type { GameSnapshot } from '../../src/scenes/GameScene';

/** Records console errors, uncaught exceptions and requests to other hosts. */
function watchPage(page: Page): { errors: string[]; foreignRequests: string[] } {
  const errors: string[] = [];
  const foreignRequests: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (url.protocol.startsWith('http') && url.hostname !== 'localhost') {
      foreignRequests.push(req.url());
    }
  });
  return { errors, foreignRequests };
}

async function snapshot(page: Page): Promise<GameSnapshot> {
  const snap = await page.evaluate(() => window.__game?.snapshot() ?? null);
  if (!snap) throw new Error('game scene is not running');
  return snap;
}

async function openGame(page: Page, query = ''): Promise<void> {
  await page.goto(`./${query}`);
  await expect
    .poll(() => page.evaluate(() => window.__game?.scene() ?? null), { timeout: 15_000 })
    .toBe('Game');
}

test('boots with no console errors and no third-party requests', async ({ page }) => {
  const watched = watchPage(page);
  await openGame(page);
  await expect(page.locator('#game canvas')).toBeVisible();
  await page.waitForTimeout(1000);
  expect(watched.errors).toEqual([]);
  expect(watched.foreignRequests).toEqual([]);
});

test('the helicopter starts over the base and the camera follows it', async ({ page }) => {
  await openGame(page);
  const start = await snapshot(page);
  expect(start.missing).toEqual([]);
  const base = start.roofs[0];
  expect(base?.base).toBe(true);
  expect(start.player.x).toBeGreaterThan(base?.left ?? Infinity);
  expect(start.player.x).toBeLessThan(base?.right ?? -Infinity);
  expect(start.player.y).toBeLessThan(base?.y ?? -Infinity);
  expect(start.worldWidth).toBeGreaterThan(960);

  await page.keyboard.down('ArrowRight');
  await expect.poll(async () => (await snapshot(page)).cameraX).toBeGreaterThan(100);
  await page.keyboard.up('ArrowRight');
  const moved = await snapshot(page);
  expect(moved.player.y).toBe(start.player.y);
  expect(moved.facing).toBe(1);
  // The helicopter stays in view.
  expect(moved.player.x).toBeGreaterThan(moved.cameraX);
  expect(moved.player.x).toBeLessThan(moved.cameraX + 480);

  await page.keyboard.down('ArrowLeft');
  await expect.poll(async () => (await snapshot(page)).facing).toBe(-1);
  await expect.poll(async () => (await snapshot(page)).cameraX, { timeout: 10_000 }).toBe(0);
  await page.waitForTimeout(500);
  await page.keyboard.up('ArrowLeft');
  const left = await snapshot(page);
  // Stopped at the left edge of the world, fully on screen.
  expect(left.player.x).toBeGreaterThan(0);
});

test('?seed= in the URL sets the random seed', async ({ page }) => {
  await openGame(page, '?seed=42');
  expect((await snapshot(page)).seed).toBe(42);
});
