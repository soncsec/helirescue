import { expect, test, type Page } from '@playwright/test';
import { openGame } from './helpers';
import { SCORING } from '../../src/config/tuning';
import type { ResultSnapshot } from '../../src/scenes/ResultScene';

/**
 * Roadmap M3.2: the mission ends when everyone is saved or lost, the result
 * screen shows the score with the bonus, the high score is kept in the one
 * localStorage key (H9), and a win goes on to the next mission (M5.1). The test hook
 * settles the outcome so these checks don't need every trip flown (the full
 * flight loop is covered by rescue.spec.ts).
 */

const KEY = 'helirescue';
const TOTAL = 16;

async function settle(page: Page, saved: number, lost: number): Promise<ResultSnapshot> {
  await page.evaluate(([s, l]) => window.__game?.settle(s, l), [saved, lost] as const);
  await expect.poll(() => page.evaluate(() => window.__game?.result() !== null)).toBe(true);
  const r = await page.evaluate(() => window.__game?.result() ?? null);
  if (!r) throw new Error('no result screen');
  return r;
}

const stored = (page: Page): Promise<string | null> =>
  page.evaluate((k) => window.localStorage.getItem(k), KEY);

test('saving everyone ends the mission with the full and perfect bonus, and a new high score', async ({
  page,
}) => {
  await openGame(page);
  expect(await stored(page)).toBeNull();
  const r = await settle(page, TOTAL, 0);
  const score = TOTAL * SCORING.perPerson + SCORING.missionBonus + SCORING.perfectBonus;
  expect(r.result).toEqual({
    saved: TOTAL,
    lost: 0,
    total: TOTAL,
    rescue: TOTAL * SCORING.perPerson,
    bonus: SCORING.missionBonus,
    perfect: SCORING.perfectBonus,
    score,
  });
  expect(r).toMatchObject({ highScore: score, newHigh: true, touch: false });
  expect(r.lines).toContain('PERFECT RESCUE!');
  expect(r.lines).toContain('MISSION 1: NIGHT CITY');
  expect(r.lines).toContain(`SCORE ${score}`);
  expect(r.lines).toContain(`HIGH SCORE NEW! ${score}`);
  expect(r.lines).toContain('PRESS ENTER TO CONTINUE');
  // Mission 1 has no earlier missions to add.
  expect(r.lines.some((l) => l.startsWith('EARLIER'))).toBe(false);
  // The game is frozen behind the result screen.
  expect(await page.evaluate(() => window.__game?.snapshot() ?? null)).toBeNull();
  // Exactly the three H9 fields, nothing else; mission 2 is now reached.
  expect(JSON.parse((await stored(page)) ?? '')).toEqual({
    highScore: score,
    muted: false,
    furthestMission: 2,
  });
});

test('losing people scales the bonus down and keeps a higher stored high score', async ({
  page,
}) => {
  await page.addInitScript((k) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem(k, '{"highScore":5000,"muted":false,"furthestMission":1}');
      sessionStorage.setItem('seeded', '1');
    }
  }, KEY);
  await openGame(page);
  const r = await settle(page, 8, 8);
  expect(r.result).toMatchObject({
    saved: 8,
    lost: 8,
    bonus: SCORING.missionBonus / 2,
    perfect: 0,
    score: 8 * SCORING.perPerson + SCORING.missionBonus / 2,
  });
  expect(r).toMatchObject({ highScore: 5000, newHigh: false });
  expect(r.lines).toContain('MISSION COMPLETE');
  expect(JSON.parse((await stored(page)) ?? '').highScore).toBe(5000);
});

test('a corrupt save is ignored and replaced, and the high score survives a reload', async ({
  page,
}) => {
  // Two page loads, each through the title screen: give it the slow-test time limit.
  test.slow();
  await page.addInitScript((k) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem(k, '{"highScore":"<script>","muted":7}');
      sessionStorage.setItem('seeded', '1');
    }
  }, KEY);
  await openGame(page);
  const first = await settle(page, 4, 12);
  expect(first).toMatchObject({ newHigh: true, highScore: first.result.score });

  await page.reload();
  // Mission 2 is reached now, so the title would start there (M5.5): pick mission 1 again.
  await openGame(page, '?mission=1');
  const second = await settle(page, 2, 14);
  expect(second.result.score).toBeLessThan(first.result.score);
  expect(second).toMatchObject({ newHigh: false, highScore: first.result.score });
});

test('Enter after a win starts mission 2, carrying the score over', async ({ page }) => {
  await openGame(page);
  const r = await settle(page, 10, 6);
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => window.__game?.result() ?? null)).toBeNull();
  await expect
    .poll(async () => (await page.evaluate(() => window.__game?.snapshot() ?? null))?.mission)
    .toBe(2);
  const s = await page.evaluate(() => window.__game?.snapshot() ?? null);
  expect(s?.startScore).toBe(r.result.score);
  expect(s?.hud).toMatchObject({ saved: 0, score: r.result.score, health: 100 });
  expect(s?.hud.total).toBeGreaterThan(TOTAL);
  expect(s?.people.every((p) => p.mode === 'waiting')).toBe(true);
  expect(s?.events).toEqual([]);
  expect(await page.evaluate(() => window.__game?.hudActive() ?? false)).toBe(true);
});

test('on a phone the result says tap, and a tap goes on to the next mission', async ({
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
  await openGame(page);
  const r = await settle(page, TOTAL, 0);
  expect(r.touch).toBe(true);
  expect(r.lines).toContain('TAP TO CONTINUE');
  await page.locator('#game canvas').tap();
  await expect.poll(() => page.evaluate(() => window.__game?.result() ?? null)).toBeNull();
  await expect
    .poll(async () => {
      const s = await page.evaluate(() => window.__game?.snapshot() ?? null);
      return s && { mission: s.mission, saved: s.hud.saved };
    })
    .toEqual({ mission: 2, saved: 0 });
  await context.close();
});
