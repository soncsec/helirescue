import { expect, test, type Page } from '@playwright/test';
import { GUNSHIPS, HELI_SHAPE, SCENERY, WEAPONS } from '../../src/config/tuning';
import { MISSIONS } from '../../src/missions';
import type { GameSnapshot } from '../../src/scenes/GameScene';
import { fly } from './autopilot';
import { openGame } from './helpers';

/**
 * Roadmap M5.3: from mission 4, a gunship hovers high over its stretch of the
 * map, stops and turns to fire aimed bursts at a helicopter in range, and
 * goes down after enough bullets. Flown with the in-page autopilot.
 */

const LONG = 300_000;
const WAIT = { timeout: 60_000 };
const FLOOR = SCENERY.groundY - HELI_SHAPE.bottom;
// Mission 4: over yard 1, left of the gunship's stretch. Out of reach of the
// guns, and too steep above the yard's tank for its barrel.
const SPOT_X = 1080;

async function snapshot(page: Page): Promise<GameSnapshot> {
  const snap = await page.evaluate(() => window.__game?.snapshot() ?? null);
  if (!snap) throw new Error('game scene is not running');
  return snap;
}

async function ship(page: Page): Promise<GameSnapshot['enemies']['gunships'][number]> {
  const g = (await snapshot(page)).enemies.gunships[0];
  if (!g) throw new Error('no gunship');
  return g;
}

test('missions 1 to 3 have no gunships; mission 4 has one hovering', async ({ page }) => {
  await openGame(page, '?mission=3');
  expect((await snapshot(page)).enemies.gunships).toEqual([]);

  await page.goto('./?mission=4');
  await expect.poll(() => page.evaluate(() => window.__game?.scene() ?? null), WAIT).toBe('Title');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await snapshot(page).catch(() => null))?.mission, WAIT).toBe(4);
  const post = MISSIONS[3]?.map.gunships?.[0];
  const first = await ship(page);
  expect(first).toMatchObject({ alive: true, hp: GUNSHIPS.hp, engaged: false });
  await expect.poll(async () => (await ship(page)).x, WAIT).not.toBe(first.x);
  for (let i = 0; i < 5; i++) {
    const g = await ship(page);
    expect(Math.abs(g.x - (post?.x ?? 0))).toBeLessThanOrEqual(post?.patrol ?? 0);
    expect(Math.abs(g.y - (post?.y ?? 0))).toBeLessThanOrEqual(GUNSHIPS.bob + 0.01);
    await page.waitForTimeout(300);
  }
  expect((await snapshot(page)).missing).toEqual([]);
});

test('a gunship turns to a helicopter in range and fires aimed bursts', async ({ page }) => {
  test.setTimeout(LONG);
  await openGame(page, '?mission=4');
  const y = 44;
  await fly(page, { kind: 'climb', x: SPOT_X, floorY: FLOOR, controls: 'keys' });
  await fly(page, { kind: 'move', x: SPOT_X, y, floorY: FLOOR, controls: 'keys' });
  await fly(page, { kind: 'hold', x: SPOT_X, y, floorY: FLOOR, controls: 'keys', forMs: 4500 });
  const s = await snapshot(page);
  const g = s.enemies.gunships[0];
  expect(g?.engaged).toBe(true);
  expect(g?.facing).toBe(-1); // toward the helicopter, on its left
  expect(s.enemies.gunshipFired).toBeGreaterThanOrEqual(GUNSHIPS.burst);
});

test('bullets bring a gunship down', async ({ page }) => {
  test.setTimeout(LONG);
  await openGame(page, '?mission=4');
  await fly(page, { kind: 'climb', x: SPOT_X, floorY: FLOOR, controls: 'keys' });
  await fly(page, { kind: 'move', x: SPOT_X, y: 44, floorY: FLOOR, controls: 'keys' });
  // Level with the gunship, facing it (it is to the right).
  await expect.poll(async () => (await ship(page)).engaged, WAIT).toBe(true);
  const g = await ship(page);
  if ((await snapshot(page)).facing !== 1) await page.keyboard.press('c');
  await expect.poll(async () => (await snapshot(page)).facing, WAIT).toBe(1);
  await fly(page, {
    kind: 'hold',
    x: SPOT_X,
    y: g.y - WEAPONS.noseY,
    floorY: FLOOR,
    controls: 'keys',
    untilEvent: 'gunship-down',
    forMs: 20_000,
    fire: true,
  });
  const s = await snapshot(page);
  expect(s.events).toContain('gunship-down');
  expect(s.enemies.gunships[0]?.alive).toBe(false);
  expect(s.weapons.impacts).toBeGreaterThanOrEqual(GUNSHIPS.hp);
});
