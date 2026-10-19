import { expect, test, type Page } from '@playwright/test';
import { openGame } from './helpers';
import { LIVES, SCORING } from '../../src/config/tuning';
import type { GameSnapshot } from '../../src/scenes/GameScene';

/**
 * Roadmap M3.3: 3 helicopters per mission; each crash uses one; with none
 * left it is game over, and Retry restarts the mission with 3 again. The test
 * hook crashes the helicopter through the same path as a real crash (the
 * crash rules themselves are unit tested in landing.test.ts).
 */

const MOVE = { timeout: 40_000 };

async function snapshot(page: Page): Promise<GameSnapshot> {
  const snap = await page.evaluate(() => window.__game?.snapshot() ?? null);
  if (!snap) throw new Error('game scene is not running');
  return snap;
}

/** Crashes, then waits for the next helicopter (or the game-over screen). */
async function crash(page: Page): Promise<void> {
  await expect.poll(async () => (await snapshot(page)).mode, MOVE).not.toBe('crashed');
  await page.evaluate(() => window.__game?.crash());
  expect((await snapshot(page)).mode).toBe('crashed');
}

test('each crash uses a helicopter and a new one starts at the base', async ({ page }) => {
  test.slow();
  await openGame(page);
  expect((await snapshot(page)).hud.lives).toBe(LIVES.perMission);

  await crash(page);
  expect((await snapshot(page)).hud.lives).toBe(LIVES.perMission - 1);
  await expect.poll(async () => (await snapshot(page)).events, MOVE).toContain('respawned');
  const next = await snapshot(page);
  expect(next.mode).not.toBe('crashed');
  expect(next.health).toBe(100);
  expect(next.hud.lives).toBe(LIVES.perMission - 1);
});

test('losing the last helicopter is game over, and Retry starts the mission again', async ({
  page,
}) => {
  test.slow();
  await openGame(page);
  // Two people saved first, so game over keeps their points.
  await page.evaluate(() => window.__game?.settle(2, 0));
  for (let i = 0; i < LIVES.perMission; i++) await crash(page);

  await expect
    .poll(() => page.evaluate(() => window.__game?.result() ?? null), MOVE)
    .not.toBeNull();
  const r = await page.evaluate(() => window.__game?.result() ?? null);
  expect(r?.kind).toBe('gameover');
  expect(r?.result).toMatchObject({
    saved: 2,
    bonus: 0,
    perfect: 0,
    score: 2 * SCORING.perPerson,
  });
  expect(r?.lines).toContain('GAME OVER');
  expect(r?.lines).toContain('NO HELICOPTERS LEFT');
  expect(r?.lines).toContain('PRESS ENTER TO RETRY');
  expect(r).toMatchObject({ newHigh: true, highScore: 2 * SCORING.perPerson });

  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => window.__game?.result() ?? null)).toBeNull();
  await expect
    .poll(async () => (await page.evaluate(() => window.__game?.snapshot() ?? null))?.hud ?? null)
    .toMatchObject({ lives: LIVES.perMission, saved: 0, score: 0, health: 100 });
  expect((await snapshot(page)).people.every((p) => p.mode === 'waiting')).toBe(true);
});

test('the last wreck stays down: no new helicopter after game over', async ({ page }) => {
  test.slow();
  await openGame(page);
  for (let i = 0; i < LIVES.perMission; i++) await crash(page);
  // Watch until the game freezes behind the game-over screen; keep the last
  // state seen. The wreck shows longer than a respawn takes (tuning test).
  let last: GameSnapshot | null = null;
  await expect
    .poll(async () => {
      const s = await page.evaluate(() => window.__game?.snapshot() ?? null);
      if (s) last = s;
      return s === null;
    }, MOVE)
    .toBe(true);
  const seen = last as GameSnapshot | null;
  expect(seen?.mode).toBe('crashed');
  expect(seen?.hud.lives).toBe(0);
  expect(seen?.events.filter((e) => e === 'respawned')).toHaveLength(LIVES.perMission - 1);
  expect(await page.evaluate(() => window.__game?.result()?.kind ?? null)).toBe('gameover');
});
