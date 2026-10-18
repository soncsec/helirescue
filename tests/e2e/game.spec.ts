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

/**
 * Headless browsers render the game slowly (Chromium about 38 fps, less with
 * parallel workers), and Phaser caps each early frame at 1/60 s, so the game
 * runs in slow motion at first. Movement checks wait on the game's own state
 * with this generous timeout instead of assuming real-time speed.
 */
const MOVE = { timeout: 20_000 };

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

test('the helicopter starts over the base, flies with tilt, and the camera follows', async ({
  page,
}) => {
  await openGame(page);
  const start = await snapshot(page);
  expect(start.missing).toEqual([]);
  const base = start.roofs[0];
  expect(base?.base).toBe(true);
  expect(start.player.x).toBeGreaterThan(base?.left ?? Infinity);
  expect(start.player.x).toBeLessThan(base?.right ?? -Infinity);
  expect(start.player.y).toBeLessThan(base?.y ?? -Infinity);
  expect(start.worldWidth).toBeGreaterThan(960);

  // Climb above the rooftops first, so the buildings don't block the way.
  await page.keyboard.down('ArrowUp');
  await expect.poll(async () => (await snapshot(page)).player.y, MOVE).toBeLessThan(70);
  await page.keyboard.up('ArrowUp');

  await page.keyboard.down('ArrowRight');
  await expect.poll(async () => (await snapshot(page)).tilt, MOVE).toBeGreaterThan(0);
  await expect.poll(async () => (await snapshot(page)).cameraX, MOVE).toBeGreaterThan(100);
  const moving = await snapshot(page);
  await page.keyboard.up('ArrowRight');
  expect(moving.velocity.x).toBeGreaterThan(50);
  expect(moving.facing).toBe(1);
  // The helicopter stays in view.
  expect(moving.player.x).toBeGreaterThan(moving.cameraX);
  expect(moving.player.x).toBeLessThan(moving.cameraX + 480);
  // Released: it levels out and drifts to a stop.
  await expect.poll(async () => (await snapshot(page)).tilt, MOVE).toBe(0);
  await expect.poll(async () => Math.abs((await snapshot(page)).velocity.x), MOVE).toBeLessThan(5);

  // Up climbs again (it has been sinking slowly while drifting).
  const before = await snapshot(page);
  await page.keyboard.down('ArrowUp');
  await expect
    .poll(async () => (await snapshot(page)).player.y, MOVE)
    .toBeLessThan(before.player.y - 10);
  await page.keyboard.up('ArrowUp');

  await page.keyboard.down('ArrowLeft');
  await expect.poll(async () => (await snapshot(page)).facing, MOVE).toBe(-1);
  await expect.poll(async () => (await snapshot(page)).cameraX, MOVE).toBe(0);
  await page.waitForTimeout(1500);
  await page.keyboard.up('ArrowLeft');
  const left = await snapshot(page);
  // Stopped at the left edge of the world, fully on screen.
  expect(left.player.x).toBeGreaterThan(0);
  expect(left.velocity.x).toBeLessThanOrEqual(0);
});

test('with no input it sinks gently onto the base pad and lands safely', async ({ page }) => {
  await openGame(page);
  const start = await snapshot(page);
  expect(start.mode).not.toBe('landed');
  await expect.poll(async () => (await snapshot(page)).mode, MOVE).toBe('landed');
  const landed = await snapshot(page);
  expect(landed.on?.base).toBe(true);
  expect(landed.health).toBe(100);
  expect(landed.events).toEqual(['landed']);
  expect(landed.player.x).toBe(start.player.x);
});

test('up takes off; diving onto a roof is a hard landing that costs health', async ({ page }) => {
  test.slow();
  await openGame(page);
  await expect.poll(async () => (await snapshot(page)).mode, MOVE).toBe('landed');
  await page.keyboard.down('ArrowUp');
  await expect.poll(async () => (await snapshot(page)).events, MOVE).toContain('took-off');
  await expect.poll(async () => (await snapshot(page)).player.y, MOVE).toBeLessThan(60);
  await page.keyboard.up('ArrowUp');
  await page.keyboard.down('ArrowDown');
  await expect.poll(async () => (await snapshot(page)).mode, MOVE).toBe('landed');
  await page.keyboard.up('ArrowDown');
  const after = await snapshot(page);
  expect(after.events).toContain('hard-landing');
  expect(after.health).toBeLessThan(100);
  expect(after.health).toBeGreaterThan(0);
  expect(after.on?.base).toBe(true);
});

test('flying low into a building stops at its wall', async ({ page }) => {
  test.slow();
  await openGame(page);
  const firstBuilding = (await snapshot(page)).roofs[1];
  if (!firstBuilding) throw new Error('no buildings');
  await page.keyboard.down('ArrowRight');
  await expect.poll(async () => (await snapshot(page)).events, MOVE).toContain('bumped');
  await page.keyboard.up('ArrowRight');
  const s = await snapshot(page);
  expect(s.player.x).toBeLessThan(firstBuilding.left);
  expect(s.health).toBe(100);
});

test('?seed= in the URL sets the random seed', async ({ page }) => {
  await openGame(page, '?seed=42');
  expect((await snapshot(page)).seed).toBe(42);
});
