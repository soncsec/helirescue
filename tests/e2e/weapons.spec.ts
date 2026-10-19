import { expect, test, type Page } from '@playwright/test';
import { GAME_WIDTH, TOUCH, WEAPONS } from '../../src/config/tuning';
import type { GameSnapshot } from '../../src/scenes/GameScene';
import { openGame } from './helpers';

/**
 * Roadmap M3.5: the forward gun (Z or Space, held) and bombs (X), the touch
 * FIRE and BOMB buttons, and pooled shots and effects.
 */

const MOVE = { timeout: 40_000 };

async function snapshot(page: Page): Promise<GameSnapshot> {
  const snap = await page.evaluate(() => window.__game?.snapshot() ?? null);
  if (!snap) throw new Error('game scene is not running');
  return snap;
}

const weapons = async (page: Page): Promise<GameSnapshot['weapons']> =>
  (await snapshot(page)).weapons;

/** Climbs clear of the roofs so shots fly over the city. */
async function climb(page: Page, y = 60): Promise<void> {
  await page.keyboard.down('ArrowUp');
  await expect.poll(async () => (await snapshot(page)).player.y, MOVE).toBeLessThan(y);
  await page.keyboard.up('ArrowUp');
}

test('holding Z fires forward; bullets hit the wall ahead with a spark', async ({ page }) => {
  test.slow();
  await openGame(page);
  const start = await snapshot(page);
  expect(start.mode).toBe('flying');
  // At the start the first building's wall is straight ahead of the nose.
  await page.keyboard.down('z');
  await expect.poll(async () => (await weapons(page)).impacts, MOVE).toBeGreaterThan(1);
  const w = await weapons(page);
  await page.keyboard.up('z');
  expect(w.fired).toBeGreaterThan(1);
  expect(w.bullets).toBeLessThanOrEqual(WEAPONS.maxBullets);
  expect(w.shots.filter((s) => s.kind === 'bullet').every((s) => s.vx > 0)).toBe(true);
});

test('after turning around, Space fires the other way', async ({ page }) => {
  test.slow();
  await openGame(page);
  await climb(page);
  await page.keyboard.press('c');
  await expect.poll(async () => (await snapshot(page)).facing, MOVE).toBe(-1);
  await page.keyboard.down('Space');
  await expect.poll(async () => (await weapons(page)).bullets, MOVE).toBeGreaterThan(0);
  const w = await weapons(page);
  await page.keyboard.up('Space');
  expect(w.shots.filter((s) => s.kind === 'bullet').every((s) => s.vx < 0)).toBe(true);
});

test('X drops one bomb per press, and it explodes on what it lands on', async ({ page }) => {
  test.slow();
  await openGame(page);
  await climb(page);
  await page.keyboard.press('x');
  await expect.poll(async () => (await weapons(page)).dropped, MOVE).toBe(1);
  await expect.poll(async () => (await weapons(page)).blasts, MOVE).toBe(1);
  const s = await snapshot(page);
  expect(s.events).toEqual(expect.arrayContaining(['dropped', 'blast']));
  expect(s.weapons.bombs).toBe(0);
});

test('shots and effects are pooled: firing for a while creates no new game objects', async ({
  page,
}) => {
  test.slow();
  await openGame(page);
  const before = (await weapons(page)).objects;
  // From high up, so it stays in the air (and armed) the whole time.
  await climb(page, 30);
  await page.keyboard.down('z');
  await expect
    .poll(async () => (await weapons(page)).fired, MOVE)
    .toBeGreaterThan(WEAPONS.maxBullets * 2);
  await page.keyboard.up('z');
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('x');
    await page.waitForTimeout(WEAPONS.bombEvery * 1000 + 100);
  }
  await expect.poll(async () => (await weapons(page)).blasts, MOVE).toBeGreaterThan(0);
  // The "+100" popups are the only other objects ever added, and nobody is saved here.
  expect((await weapons(page)).objects).toBe(before);
});

test('no shooting or bombing while landed', async ({ page }) => {
  test.slow();
  await openGame(page);
  await expect.poll(async () => (await snapshot(page)).mode, MOVE).toBe('landed');
  await page.keyboard.down('z');
  await page.keyboard.press('x');
  await page.waitForTimeout(800);
  await page.keyboard.up('z');
  expect(await weapons(page)).toMatchObject({ fired: 0, dropped: 0 });
});

test('on a phone, holding FIRE shoots and BOMB drops a bomb', async ({ browser, browserName }) => {
  test.skip(browserName === 'firefox', 'Firefox has no mobile emulation in Playwright');
  test.slow();
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await openGame(page);
  const box = await page.locator('#game canvas').boundingBox();
  if (!box) throw new Error('no canvas');
  const zoom = box.width / GAME_WIDTH;
  const at = (b: { x: number; y: number }) => [box.x + b.x * zoom, box.y + b.y * zoom] as const;
  const [fx, fy] = at(TOUCH.buttons.fire);
  await page.mouse.move(fx, fy);
  await page.mouse.down();
  await expect.poll(async () => (await weapons(page)).fired, MOVE).toBeGreaterThan(2);
  await page.mouse.up();
  const stopped = (await weapons(page)).fired;
  await page.waitForTimeout(600);
  expect((await weapons(page)).fired).toBe(stopped);

  const [bx, by] = at(TOUCH.buttons.bomb);
  await page.mouse.click(bx, by);
  await expect.poll(async () => (await weapons(page)).dropped, MOVE).toBe(1);
  await context.close();
});
