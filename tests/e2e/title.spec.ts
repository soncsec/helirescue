import { expect, test, type Page } from '@playwright/test';
import { CC_BY_CREDIT } from '../../src/config/credits';
import { openTitle } from './helpers';

/** Roadmap M3.4: the title screen with the controls, high score and CC-BY credit. */

const title = (page: Page) => page.evaluate(() => window.__game?.title() ?? null);
const scene = (page: Page) => page.evaluate(() => window.__game?.scene() ?? null);

test('the title shows the name, the keyboard controls, the high score and the art credit', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await openTitle(page);
  const t = await title(page);
  expect(t?.touch).toBe(false);
  expect(t?.lines).toEqual(
    expect.arrayContaining([
      'HELIRESCUE',
      'ARROWS / WASD FLY',
      'P / ESC PAUSE',
      'HIGH SCORE 0',
      'PRESS ENTER TO START',
      CC_BY_CREDIT,
    ]),
  );
  expect(errors).toEqual([]);
});

test('the title shows the stored high score, and Space starts the game', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('helirescue', '{"highScore":4321,"muted":false,"furthestMission":1}');
  });
  await openTitle(page);
  expect((await title(page))?.highScore).toBe(4321);
  expect((await title(page))?.lines).toContain('HIGH SCORE 4321');
  await page.keyboard.press('Space');
  await expect.poll(() => scene(page)).toBe('Game');
  expect(await title(page)).toBeNull();
});

test('on a phone the title shows the touch controls, and a tap starts the game', async ({
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
  const t = await title(page);
  expect(t?.touch).toBe(true);
  expect(t?.lines).toEqual(expect.arrayContaining(['D-PAD FLY', 'II PAUSE', 'TAP TO START']));
  await page.locator('#game canvas').tap();
  await expect.poll(() => scene(page)).toBe('Game');
  await context.close();
});
