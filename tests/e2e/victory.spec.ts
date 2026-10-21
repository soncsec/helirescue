import { expect, test, type Page } from '@playwright/test';
import { SCORING, TITLE } from '../../src/config/tuning';
import { MISSIONS } from '../../src/missions';
import { openGame, openTitle } from './helpers';

/**
 * Roadmap M5.5: the title starts a new game from any mission up to the
 * furthest reached (H9); winning the last mission leads to the victory screen
 * with the final score and the scrolling credits, then back to the title.
 */

const KEY = 'helirescue';
const WAIT = { timeout: 60_000 };
const LAST = MISSIONS.length;

const title = (page: Page) => page.evaluate(() => window.__game?.title() ?? null);
const victory = (page: Page) => page.evaluate(() => window.__game?.victory() ?? null);
const scene = (page: Page) => page.evaluate(() => window.__game?.scene() ?? null);

/** Saved data as if the player had reached `furthest` before. */
async function reached(page: Page, furthest: number, highScore = 0): Promise<void> {
  await page.addInitScript(
    ([k, f, h]) => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem(
          k as string,
          JSON.stringify({ highScore: h, muted: false, furthestMission: f }),
        );
        sessionStorage.setItem('seeded', '1');
      }
    },
    [KEY, furthest, highScore] as const,
  );
}

/** Waits for `n` animation frames in the page, so the game has handled earlier input. */
async function frames(page: Page, n: number): Promise<void> {
  await page.evaluate(
    (count) =>
      new Promise<void>((done) => {
        const step = (left: number): void => {
          if (left <= 0) done();
          else requestAnimationFrame(() => step(left - 1));
        };
        step(count);
      }),
    n,
  );
}

test('a first game starts at mission 1, with nothing else on offer', async ({ page }) => {
  await openTitle(page);
  const t = await title(page);
  expect(t).toMatchObject({ mission: 1, choices: [1] });
  expect(t?.lines).toContain('  MISSION 1: NIGHT CITY  ');
  await page.keyboard.press('ArrowRight');
  expect((await title(page))?.mission).toBe(1);
});

test('the title offers every mission reached, starting at the furthest', async ({ page }) => {
  await reached(page, 3);
  await openTitle(page);
  expect(await title(page)).toMatchObject({ mission: 3, choices: [1, 2, 3] });
  expect((await title(page))?.lines).toContain('< MISSION 3: DOWNTOWN  ');
  await page.keyboard.press('ArrowLeft');
  await expect.poll(async () => (await title(page))?.mission).toBe(2);
  expect((await title(page))?.lines).toContain('< MISSION 2: FACTORY DISTRICT >');
  // One press at a time, each seen to land: on CI, Right, Right and Left sent within
  // 25 ms once left the Left unhandled. The second Right changes nothing (3 is the
  // furthest), so give it two frames to be handled before checking it stayed at 3.
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await title(page))?.mission).toBe(3);
  await page.keyboard.press('ArrowRight');
  await frames(page, 2);
  await expect.poll(async () => (await title(page))?.mission).toBe(3);
  await page.keyboard.press('ArrowLeft');
  // Let the picker take the press before starting (Enter could otherwise win the race).
  await expect.poll(async () => (await title(page))?.mission).toBe(2);
  await page.keyboard.press('Enter');
  await expect.poll(() => scene(page), WAIT).toBe('Game');
  const s = await page.evaluate(() => window.__game?.snapshot() ?? null);
  expect(s).toMatchObject({ mission: 2, startScore: 0 });
});

test('on a phone, tapping the arrows picks the mission', async ({ browser, browserName }) => {
  test.skip(browserName === 'firefox', 'Firefox has no mobile emulation in Playwright');
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await reached(page, 2);
  await openTitle(page);
  expect((await title(page))?.mission).toBe(2);
  const canvas = page.locator('#game canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('no canvas');
  const zoom = await page.evaluate(() => window.__game?.snapshot()?.input.zoom ?? null);
  // The game is not running yet; work the zoom out from the canvas size.
  const z = zoom ?? box.width / 480;
  const label = (await title(page))?.lines.find((l) => l.includes('MISSION 2')) ?? '';
  const halfText = (label.length * 8) / 2;
  const y = box.y + (TITLE.missionY + 4) * z;
  await page.touchscreen.tap(box.x + (240 - halfText + 4) * z, y);
  await expect.poll(async () => (await title(page))?.mission).toBe(1);
  expect(await scene(page)).toBe('Title');
  await context.close();
});

test('winning the last mission shows the victory screen and the credits roll', async ({ page }) => {
  test.slow();
  await openGame(page, `?mission=${LAST}`);
  const total = MISSIONS[LAST - 1]?.map.people.length ?? 0;
  await page.evaluate((n) => window.__game?.settle(n, 0), total);
  await expect
    .poll(() => page.evaluate(() => window.__game?.result() ?? null), WAIT)
    .not.toBeNull();
  const r = await page.evaluate(() => window.__game?.result() ?? null);
  expect(r).toMatchObject({ victory: true, next: false });
  expect(r?.lines).toContain('PRESS ENTER TO CONTINUE');
  const score = total * SCORING.perPerson + SCORING.missionBonus + SCORING.perfectBonus;

  await page.keyboard.press('Enter');
  await expect.poll(() => scene(page), WAIT).toBe('Victory');
  expect(await page.evaluate(() => window.__game?.hudActive() ?? true)).toBe(false);
  const v = await victory(page);
  expect(v).toMatchObject({ score, highScore: score, newHigh: true, done: false });
  expect(v?.lines).toEqual(
    expect.arrayContaining([
      'MISSION ACCOMPLISHED',
      `ALL ${LAST} MISSIONS COMPLETE`,
      `FINAL SCORE ${score}`,
      'NEW HIGH SCORE!',
      'CREDITS',
      'THANK YOU FOR PLAYING',
    ]),
  );
  // The full CC-BY credit rolls by.
  expect(v?.lines.some((l) => l.includes('master484'))).toBe(true);
  expect(v?.lines.some((l) => l.includes('creativecommons.org/licenses/by/3.0/'))).toBe(true);
  // It holds, then scrolls up.
  await expect.poll(async () => (await victory(page))?.scrolled ?? 0, WAIT).toBeGreaterThan(20);

  await page.keyboard.press('Enter');
  await expect.poll(() => scene(page), WAIT).toBe('Title');
  // Every mission is now on offer, starting from the last.
  expect(await title(page)).toMatchObject({ mission: LAST, highScore: score });
});
