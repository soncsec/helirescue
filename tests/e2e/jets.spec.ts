import { expect, test, type Page } from '@playwright/test';
import { HELI_SHAPE, JETS, SCENERY, WEAPONS } from '../../src/config/tuning';
import { MISSIONS } from '../../src/missions';
import type { GameSnapshot } from '../../src/scenes/GameScene';
import { fly } from './autopilot';
import { openGame } from './helpers';

/**
 * Roadmap M5.3: from mission 2, enemy VTOL jets make fast strafing passes,
 * warned of at the screen edge first; their shots take health; two bullets
 * bring one down. The test hook brings a pass forward so the tests don't wait
 * for the mission's own timing.
 */

const LONG = 300_000;
const WAIT = { timeout: 60_000 };
const FLOOR = SCENERY.groundY - HELI_SHAPE.bottom;
// Over mission 2, near the base: short of its first gun (578), so nothing else can hit it.
const SAFE_X = 300;

async function snapshot(page: Page): Promise<GameSnapshot> {
  const snap = await page.evaluate(() => window.__game?.snapshot() ?? null);
  if (!snap) throw new Error('game scene is not running');
  return snap;
}

const jetPass = (page: Page): Promise<void> => page.evaluate(() => window.__game?.jetPass());

async function warning(page: Page): Promise<NonNullable<GameSnapshot['enemies']['jetWarning']>> {
  await expect.poll(async () => (await snapshot(page)).enemies.jetWarning, WAIT).not.toBeNull();
  const w = (await snapshot(page)).enemies.jetWarning;
  if (!w) throw new Error('no warning');
  return w;
}

test('mission 1 has no jets; mission 2 has passes about every half minute', async ({ page }) => {
  await openGame(page);
  const one = await snapshot(page);
  expect(one.enemies.jets.every((j) => !j.alive)).toBe(true);
  expect(one.enemies.nextPass).toBe(Number.POSITIVE_INFINITY);
  await page.evaluate(() => window.__game?.jetPass());
  await page.waitForTimeout(2500);
  expect((await snapshot(page)).enemies.jets.every((j) => !j.alive)).toBe(true);

  await page.goto('./?mission=2');
  await expect.poll(() => page.evaluate(() => window.__game?.scene() ?? null), WAIT).toBe('Title');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await snapshot(page).catch(() => null))?.mission, WAIT).toBe(2);
  const first = MISSIONS[1]?.map.jets?.first ?? 0;
  const two = await snapshot(page);
  expect(two.enemies.nextPass).toBeGreaterThan(first - 5);
  expect(two.enemies.nextPass).toBeLessThanOrEqual(first);
});

test('a pass is warned of at the screen edge, then a jet crosses and leaves', async ({ page }) => {
  test.setTimeout(LONG);
  await openGame(page, '?mission=2');
  await jetPass(page);
  const w = await warning(page);
  expect([-1, 1]).toContain(w.side);
  expect(w.y).toBeGreaterThanOrEqual(JETS.topY);
  await expect
    .poll(async () => (await snapshot(page)).enemies.jets.some((j) => j.alive), WAIT)
    .toBe(true);
  const s = await snapshot(page);
  const jet = s.enemies.jets.find((j) => j.alive);
  expect(jet?.y).toBe(w.y);
  expect(jet?.facing).toBe(w.side === -1 ? 1 : -1);
  expect(s.enemies.jetWarning).toBeNull();
  expect(s.events).toContain('jet-in');
  expect(s.missing).toEqual([]);
  await expect
    .poll(async () => (await snapshot(page)).enemies.jets.every((j) => !j.alive), WAIT)
    .toBe(true);
});

test('a jet strafes a helicopter flying high and its shots take health', async ({ page }) => {
  test.setTimeout(LONG);
  await openGame(page, '?mission=2');
  const y = 50;
  await fly(page, { kind: 'climb', x: SAFE_X, floorY: FLOOR, controls: 'keys' });
  await fly(page, { kind: 'move', x: SAFE_X, y, floorY: FLOOR, controls: 'keys' });
  expect((await snapshot(page)).enemies.hitsTaken).toBe(0);
  await jetPass(page);
  await fly(page, {
    kind: 'hold',
    x: SAFE_X,
    y,
    floorY: FLOOR,
    controls: 'keys',
    untilHits: 1,
    forMs: 20_000,
  });
  const s = await snapshot(page);
  expect(s.enemies.hitsTaken).toBeGreaterThan(0);
  expect(s.health).toBeLessThan(100);
  expect(s.health).toBeGreaterThanOrEqual(100 - JETS.burst * JETS.shotDamage);
});

test('bullets bring a jet down', async ({ page }) => {
  test.setTimeout(LONG);
  await openGame(page, '?mission=2');
  await fly(page, { kind: 'climb', x: SAFE_X, floorY: FLOOR, controls: 'keys' });
  await fly(page, { kind: 'move', x: SAFE_X, y: 50, floorY: FLOOR, controls: 'keys' });
  await jetPass(page);
  const w = await warning(page);
  // Face the jet, with the gun level with its path.
  const facing = w.side;
  if ((await snapshot(page)).facing !== facing) await page.keyboard.press('c');
  await expect.poll(async () => (await snapshot(page)).facing, WAIT).toBe(facing);
  await fly(page, {
    kind: 'hold',
    x: SAFE_X,
    y: w.y - WEAPONS.noseY,
    floorY: FLOOR,
    controls: 'keys',
    untilJetDown: true,
    forMs: 15_000,
    fire: true,
  });
  const s = await snapshot(page);
  expect(s.events).toContain('jet-down');
  expect(s.enemies.jets.every((j) => !j.alive)).toBe(true);
});
