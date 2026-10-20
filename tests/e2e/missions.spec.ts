import { expect, test, type Page } from '@playwright/test';
import { openGame } from './helpers';
import { LIVES, SCORING } from '../../src/config/tuning';
import { MISSIONS } from '../../src/missions';
import type { GameSnapshot } from '../../src/scenes/GameScene';
import type { ResultSnapshot } from '../../src/scenes/ResultScene';

/**
 * Roadmap M5.1: every mission loads with its own map and art, a banner names
 * it as it starts, the score carries from mission to mission, Retry keeps the
 * score the mission was entered with, and the furthest mission is saved (H9).
 * ?mission=N starts a mission directly, for play-testing.
 */

const KEY = 'helirescue';
const MOVE = { timeout: 40_000 };

async function snapshot(page: Page): Promise<GameSnapshot> {
  const snap = await page.evaluate(() => window.__game?.snapshot() ?? null);
  if (!snap) throw new Error('game scene is not running');
  return snap;
}

/** The snapshot, or null while the game scene is starting or paused behind a screen. */
const maybe = (page: Page): Promise<GameSnapshot | null> =>
  page.evaluate(() => window.__game?.snapshot() ?? null);

async function result(page: Page): Promise<ResultSnapshot> {
  await expect.poll(() => page.evaluate(() => window.__game?.result() !== null), MOVE).toBe(true);
  const r = await page.evaluate(() => window.__game?.result() ?? null);
  if (!r) throw new Error('no result screen');
  return r;
}

async function settle(page: Page, saved: number, lost: number): Promise<ResultSnapshot> {
  await page.evaluate(([s, l]) => window.__game?.settle(s, l), [saved, lost] as const);
  return result(page);
}

for (const [i, m] of MISSIONS.entries()) {
  const n = i + 1;
  test(`mission ${n} loads with its map, art, enemies and banner`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await openGame(page, `?mission=${n}`);
    const s = await snapshot(page);
    expect(s).toMatchObject({ mission: n, startScore: 0, worldWidth: m.map.width, missing: [] });
    expect(s.hud).toMatchObject({ total: m.map.people.length, score: 0, lives: LIVES.perMission });
    expect(s.enemies.guns).toHaveLength(m.map.aaGuns?.length ?? 0);
    expect(s.enemies.soldiers).toHaveLength(m.map.soldiers?.length ?? 0);
    expect(s.banner).toBe(true);
    // The banner fades out after a moment.
    await expect.poll(async () => (await maybe(page))?.banner, MOVE).toBe(false);
    expect(errors).toEqual([]);
  });
}

test('a bad ?mission= is ignored and mission 1 starts', async ({ page }) => {
  await openGame(page, '?mission=9');
  expect((await snapshot(page)).mission).toBe(1);
});

test('Retry after a game over restarts the mission with the score it was entered with', async ({
  page,
}) => {
  test.slow();
  await openGame(page);
  const first = await settle(page, 16, 0);
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await maybe(page))?.mission, MOVE).toBe(2);
  const entered = first.result.score;

  await page.evaluate(() => window.__game?.settle(3, 0));
  for (let k = 0; k < LIVES.perMission; k++) {
    await expect.poll(async () => (await maybe(page))?.mode ?? 'crashed', MOVE).not.toBe('crashed');
    await page.evaluate(() => window.__game?.crash());
  }
  const over = await result(page);
  expect(over).toMatchObject({ kind: 'gameover', mission: 2, startScore: entered });
  expect(over.total).toBe(entered + 3 * SCORING.perPerson);
  expect(over.lines).toContain(`EARLIER MISSIONS ${entered}`);
  expect(over.lines).toContain(`SCORE ${over.total}`);
  expect(over.lines).toContain('MISSION 2: FACTORY DISTRICT');
  expect(over.lines).toContain('PRESS ENTER TO RETRY');
  // The high score counts the earlier missions too.
  expect(over.highScore).toBe(over.total);

  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => window.__game?.result() ?? null)).toBeNull();
  await expect
    .poll(async () => {
      const s = await maybe(page);
      return (
        s && { mission: s.mission, score: s.hud.score, saved: s.hud.saved, lives: s.hud.lives }
      );
    }, MOVE)
    .toEqual({ mission: 2, score: entered, saved: 0, lives: LIVES.perMission });
});

test('after the last mission, the furthest is saved and Enter goes on to the victory screen', async ({
  page,
}) => {
  const last = MISSIONS.length;
  await openGame(page, `?mission=${last}`);
  const total = MISSIONS[last - 1]?.map.people.length ?? 0;
  const r = await settle(page, total, 0);
  expect(r).toMatchObject({ kind: 'complete', mission: last, next: false, victory: true });
  expect(r.lines).toContain('PRESS ENTER TO CONTINUE');
  const saved = JSON.parse(
    (await page.evaluate((k) => window.localStorage.getItem(k), KEY)) ?? '{}',
  ) as { furthestMission?: number };
  expect(saved.furthestMission).toBe(last);
  await page.keyboard.press('Enter');
  await expect
    .poll(() => page.evaluate(() => window.__game?.scene() ?? null), MOVE)
    .toBe('Victory');
});
