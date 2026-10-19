import { expect, test, type Page } from '@playwright/test';
import { CC_BY_ART } from '../../src/config/credits';
import { GAME_WIDTH, TITLE } from '../../src/config/tuning';
import { openTitle } from './helpers';

/** Roadmap M3.4: the title screen with the controls, high score and CC-BY credit. */

const title = (page: Page) => page.evaluate(() => window.__game?.title() ?? null);
const scene = (page: Page) => page.evaluate(() => window.__game?.scene() ?? null);

test('the title shows the name, the keyboard controls, the high score and the credits prompt', async ({
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
      'Z / SPACE SHOOT (HOLD)',
      'X DROP A BOMB',
      'C TURN AROUND',
      'P / ESC PAUSE',
      'HIGH SCORE 0',
      'PRESS ENTER TO START',
      'PRESS C FOR CREDITS',
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
  expect(t?.lines).toEqual(
    expect.arrayContaining([
      'D-PAD FLY',
      'FIRE SHOOT (HOLD)',
      'BOMB DROP A BOMB',
      'TURN TURN AROUND',
      'II PAUSE',
      'TAP TO START',
    ]),
  );
  await page.locator('#game canvas').tap();
  await expect.poll(() => scene(page)).toBe('Game');
  await context.close();
});

test('C opens the credits with the full CC-BY attribution; Esc goes back', async ({ page }) => {
  await openTitle(page);
  await page.keyboard.press('c');
  await expect.poll(() => scene(page)).toBe('Credits');
  const lines = (await page.evaluate(() => window.__game?.credits() ?? null))?.lines ?? [];
  const text = lines.join('\n');
  for (const part of [CC_BY_ART.title, CC_BY_ART.author, CC_BY_ART.url, CC_BY_ART.licenceUrl]) {
    expect(text).toContain(part);
  }
  expect(lines).toContain('PRESS ESC TO GO BACK');
  await page.keyboard.press('Escape');
  await expect.poll(() => scene(page)).toBe('Title');
  // And the game still starts from the title afterwards.
  await page.keyboard.press('Enter');
  await expect.poll(() => scene(page)).toBe('Game');
});

test('on a phone, the CREDITS button opens the credits and a tap goes back', async ({
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
  await page.mouse.click(box.x + (GAME_WIDTH / 2) * zoom, box.y + TITLE.creditY * zoom);
  await expect.poll(() => scene(page)).toBe('Credits');
  expect((await page.evaluate(() => window.__game?.credits() ?? null))?.lines).toContain(
    'TAP TO GO BACK',
  );
  await page.locator('#game canvas').tap();
  await expect.poll(() => scene(page)).toBe('Title');
  await context.close();
});
