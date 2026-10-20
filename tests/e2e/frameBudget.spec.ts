import { expect, test, type Page } from '@playwright/test';
import { HELI_SHAPE } from '../../src/config/tuning';
import type { GameSnapshot } from '../../src/scenes/GameScene';
import { fly } from './autopilot';
import { openGame } from './helpers';

/**
 * Roadmap M3.7, the frame-rate check (method approved by the owner on
 * 2026-10-19). Headless browsers here draw only 5 to 38 frames a second, so
 * this measures the game's own work per frame instead: how long each update
 * takes in a busy scene (every enemy active, the gun firing, bombs falling).
 * At 60 fps a frame lasts 16.7 ms; the update must fit in half of that, so
 * drawing and slower devices have room. Real smoothness is checked by the
 * owner's play-test on a laptop and a phone.
 */

/** Half a 60 fps frame. */
const BUDGET_MS = 8;
const LONG = 300_000;

async function snapshot(page: Page): Promise<GameSnapshot> {
  const snap = await page.evaluate(() => window.__game?.snapshot() ?? null);
  if (!snap) throw new Error('game scene is not running');
  return snap;
}

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] ?? 0;
}

test('a busy stretch of mission 1 keeps each update well inside a 60 fps frame', async ({
  page,
  browserName,
}) => {
  test.setTimeout(LONG);
  await openGame(page);
  const floorY = 254 - HELI_SHAPE.bottom;
  await fly(page, { kind: 'climb', x: 96, floorY, controls: 'keys' });
  // Bombs and bullets may hit people on the roofs (friendly fire): keep the
  // mission going, so the 70% rule doesn't end it mid-measurement.
  await page.evaluate(() => window.__game?.keepOpen());
  await page.evaluate(() => window.__game?.resetUpdateTimes());

  // Cross the city high up with the gun firing, bombing as we go.
  await page.keyboard.down('z');
  const bombs = setInterval(() => void page.keyboard.press('x').catch(() => undefined), 700);
  try {
    await fly(page, { kind: 'move', x: 1500, y: 40, floorY, controls: 'keys' });
  } finally {
    clearInterval(bombs);
    await page.keyboard.up('z');
  }

  const s = await snapshot(page);
  const times = await page.evaluate(() => window.__game?.updateTimes() ?? []);
  // The scene really was busy: shots, bombs and enemy fire.
  expect(s.weapons.fired).toBeGreaterThan(20);
  expect(s.weapons.dropped).toBeGreaterThan(3);
  expect(times.length).toBeGreaterThan(100);
  const p95 = percentile(times, 95);
  const p50 = percentile(times, 50);
  const max = Math.max(...times);
  console.log(
    `[${browserName}] update ms over ${times.length} frames: median ${p50.toFixed(2)}, p95 ${p95.toFixed(2)}, max ${max.toFixed(2)}`,
  );
  expect(p95).toBeLessThan(BUDGET_MS);
});
