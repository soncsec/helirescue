import { expect, test, type Page } from '@playwright/test';
import { GAME_WIDTH, TOUCH } from '../../src/config/tuning';
import { openGame } from './helpers';

/**
 * Roadmap M3.4: pause with P or Esc, the touch pause button, or when the tab
 * or app loses focus; the game is frozen while paused and resumes on a key or
 * a tap.
 */

const showing = (page: Page) => page.evaluate(() => window.__game?.pauseShowing() ?? false);
const player = (page: Page) => page.evaluate(() => window.__game?.snapshot()?.player ?? null);

/** Waits until the game is frozen behind the pause screen, and checks nothing moves. */
async function expectFrozen(page: Page): Promise<void> {
  await expect.poll(() => showing(page)).toBe(true);
  // A paused game scene is not active, so it reports no state.
  expect(await player(page)).toBeNull();
  await page.waitForTimeout(500);
  expect(await showing(page)).toBe(true);
}

async function expectRunning(page: Page): Promise<void> {
  await expect.poll(() => showing(page)).toBe(false);
  await expect.poll(() => player(page)).not.toBeNull();
}

test('P pauses and resumes; the helicopter does not move while paused', async ({ page }) => {
  await openGame(page);
  await page.keyboard.press('p');
  await expectFrozen(page);
  await page.keyboard.press('p');
  await expectRunning(page);
  // It carries on from where it was: sinking slowly over the base.
  const a = await player(page);
  await page.waitForTimeout(600);
  const b = await player(page);
  expect(b?.y).not.toBe(a?.y);
});

test('Esc pauses and Enter resumes', async ({ page }) => {
  await openGame(page);
  await page.keyboard.press('Escape');
  await expectFrozen(page);
  await page.keyboard.press('Enter');
  await expectRunning(page);
});

test('losing focus pauses: the window losing focus, or the tab being hidden', async ({ page }) => {
  await openGame(page);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expectFrozen(page);
  await page.keyboard.press('p');
  await expectRunning(page);

  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expectFrozen(page);
});

test('pause does not open over the result screen', async ({ page }) => {
  await openGame(page);
  await page.evaluate(() => window.__game?.settle(16, 0));
  await expect.poll(() => page.evaluate(() => window.__game?.result() !== null)).toBe(true);
  await page.keyboard.press('p');
  await page.waitForTimeout(300);
  expect(await showing(page)).toBe(false);
});

test('on a phone the pause button pauses and a tap resumes', async ({ browser, browserName }) => {
  test.skip(browserName === 'firefox', 'Firefox has no mobile emulation in Playwright');
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
  await page.mouse.click(box.x + TOUCH.pauseX * zoom, box.y + TOUCH.pauseY * zoom);
  await expectFrozen(page);
  expect(await page.evaluate(() => window.__game?.scene() ?? null)).not.toBe('Game');
  await page.locator('#game canvas').tap();
  await expectRunning(page);
  await context.close();
});
