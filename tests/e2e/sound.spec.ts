import { expect, test, type Page } from '@playwright/test';
import { GAME_WIDTH, TITLE } from '../../src/config/tuning';
import { SOUNDS } from '../../src/config/audio';
import { openGame, openTitle } from './helpers';

/**
 * Roadmap M4: sound effects and music (CC0, CREDITS.md), M or a SOUND button
 * to turn sound off and on, remembered in the saved-data key (H9). Headless
 * browsers can't be listened to, so these check what the game plays.
 */

const sound = (page: Page) => page.evaluate(() => window.__game?.sound() ?? null);

test('every sound loads, and the music starts', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  await openTitle(page);
  const s = await sound(page);
  expect(s?.loaded.sort()).toEqual(Object.keys(SOUNDS).sort());
  expect(s?.muted).toBe(false);
  expect(s?.music).toBe(true);
  expect(errors).toEqual([]);
});

test('playing makes the matching sounds: the gun, a bomb, and landing', async ({ page }) => {
  test.slow();
  await openGame(page);
  // It sinks onto the base at the start: a landing thud.
  await expect
    .poll(async () => (await sound(page))?.log['sfx-land'] ?? 0, { timeout: 40_000 })
    .toBeGreaterThan(0);
  await page.keyboard.down('ArrowUp');
  await expect
    .poll(async () => await page.evaluate(() => window.__game?.snapshot()?.player.y ?? 999), {
      timeout: 40_000,
    })
    .toBeLessThan(100);
  await page.keyboard.up('ArrowUp');
  await page.keyboard.down('z');
  await expect
    .poll(async () => (await sound(page))?.log['sfx-gun'] ?? 0, { timeout: 40_000 })
    .toBeGreaterThan(1);
  await page.keyboard.up('z');
  await page.keyboard.press('x');
  await expect
    .poll(async () => (await sound(page))?.log['sfx-bomb-drop'] ?? 0, { timeout: 40_000 })
    .toBe(1);
});

test('M turns sound off and on, and the choice is remembered', async ({ page }) => {
  test.slow();
  await openTitle(page);
  await page.keyboard.press('m');
  await expect.poll(async () => (await sound(page))?.muted).toBe(true);
  expect((await page.evaluate(() => window.__game?.title() ?? null))?.lines).toContain(
    'M SOUND: OFF',
  );
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('helirescue') ?? '{}').muted),
  ).toBe(true);
  await page.reload();
  await openTitle(page);
  expect((await sound(page))?.muted).toBe(true);
  // Muted, firing plays nothing.
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => window.__game?.scene() ?? null)).toBe('Game');
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(800);
  await page.keyboard.up('ArrowUp');
  await page.keyboard.down('z');
  await page.waitForTimeout(800);
  await page.keyboard.up('z');
  expect((await sound(page))?.log['sfx-gun'] ?? 0).toBe(0);
  // M in the game turns it back on.
  await page.keyboard.press('m');
  await expect.poll(async () => (await sound(page))?.muted).toBe(false);
});

test('the pause screen shows the sound setting and M changes it', async ({ page }) => {
  await openGame(page);
  await page.keyboard.press('p');
  await expect.poll(() => page.evaluate(() => window.__game?.pauseShowing() ?? false)).toBe(true);
  await page.keyboard.press('m');
  await expect.poll(async () => (await sound(page))?.muted).toBe(true);
  // Still paused: M doesn't resume.
  expect(await page.evaluate(() => window.__game?.pauseShowing() ?? false)).toBe(true);
});

test('on a phone, the SOUND button on the title turns sound off', async ({
  browser,
  browserName,
}) => {
  test.skip(browserName === 'firefox', 'Firefox has no mobile emulation in Playwright');
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await openTitle(page);
  const box = await page.locator('#game canvas').boundingBox();
  if (!box) throw new Error('no canvas');
  const zoom = box.width / GAME_WIDTH;
  await page.mouse.click(
    box.x + (GAME_WIDTH / 2 + TITLE.buttonSpread) * zoom,
    box.y + TITLE.creditY * zoom,
  );
  await expect.poll(async () => (await sound(page))?.muted).toBe(true);
  // Still on the title: the button doesn't start the game.
  expect(await page.evaluate(() => window.__game?.scene() ?? null)).toBe('Title');
  expect((await page.evaluate(() => window.__game?.title() ?? null))?.lines).toContain(
    'SOUND: OFF',
  );
  await context.close();
});
