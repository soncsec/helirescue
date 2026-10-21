import { expect, test, type Page } from '@playwright/test';
import { HELI_SHAPE, SCENERY, TANKS, WEAPONS } from '../../src/config/tuning';
import { MISSIONS } from '../../src/missions';
import type { GameSnapshot } from '../../src/scenes/GameScene';
import { fly } from './autopilot';
import { openGame } from './helpers';

/**
 * Roadmap M5.2: from mission 2, tanks patrol open street, stop and turn to
 * face a helicopter that comes close, and fire shells up at it when it is low.
 * A bomb or a few bullets destroy them. Flown with the in-page autopilot
 * (./autopilot.ts) and the real keyboard.
 */

const LONG = 300_000;
const WAIT = { timeout: 60_000 };
const GROUND = SCENERY.groundY;
const FLOOR = GROUND - HELI_SHAPE.bottom;

async function snapshot(page: Page): Promise<GameSnapshot> {
  const snap = await page.evaluate(() => window.__game?.snapshot() ?? null);
  if (!snap) throw new Error('game scene is not running');
  return snap;
}

async function tank(page: Page): Promise<GameSnapshot['enemies']['tanks'][number]> {
  const k = (await snapshot(page)).enemies.tanks[0];
  if (!k) throw new Error('no tanks on the map');
  return k;
}

/** Flies high over the yard's middle, so the tank stops to face the helicopter. */
async function overYard(page: Page): Promise<void> {
  const post = MISSIONS[1]?.map.tanks?.[0];
  if (!post) throw new Error('mission 2 has no tank');
  await fly(page, { kind: 'climb', x: post.x, floorY: FLOOR, controls: 'keys' });
  await fly(page, { kind: 'move', x: post.x, floorY: FLOOR, controls: 'keys' });
  await expect.poll(async () => (await tank(page)).engaged, WAIT).toBe(true);
}

test('mission 1 has no tanks; mission 2 has a tank patrolling the street', async ({ page }) => {
  await openGame(page);
  expect((await snapshot(page)).enemies.tanks).toEqual([]);

  await page.goto('./?mission=2');
  await expect.poll(() => page.evaluate(() => window.__game?.scene() ?? null), WAIT).toBe('Title');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await snapshot(page).catch(() => null))?.mission, WAIT).toBe(2);
  const first = await tank(page);
  const post = MISSIONS[1]?.map.tanks?.[0];
  expect(first).toMatchObject({ y: GROUND, alive: true, hp: TANKS.hp, engaged: false });
  // It drives along its stretch of street while the helicopter sits at base.
  await expect.poll(async () => (await tank(page)).x, WAIT).not.toBe(first.x);
  for (let i = 0; i < 5; i++) {
    const k = await tank(page);
    expect(k.x).toBeGreaterThanOrEqual((post?.x ?? 0) - (post?.patrol ?? 0));
    expect(k.x).toBeLessThanOrEqual((post?.x ?? 0) + (post?.patrol ?? 0));
    await page.waitForTimeout(400);
  }
  expect((await snapshot(page)).missing).toEqual([]);
});

test('a tank fires up at a low helicopter and its shells take health', async ({ page }) => {
  test.setTimeout(LONG);
  await openGame(page, '?mission=2');
  await overYard(page);
  const k = await tank(page);
  // Low and to one side of the tank, inside the yard, in its barrel's reach.
  const x = k.x >= 960 ? k.x - 110 : k.x + 110;
  const y = 170;
  // Stop on a tank shell's hit, not any hit: a gun passed on the way may already have hit.
  const until = { untilEvent: 'tank-hit' } as const;
  await fly(page, { kind: 'move', x, floorY: FLOOR, controls: 'keys', ...until });
  await fly(page, { kind: 'move', x, y, floorY: FLOOR, controls: 'keys', ...until });
  await fly(page, {
    kind: 'hold',
    x,
    y,
    floorY: FLOOR,
    controls: 'keys',
    ...until,
    forMs: 30_000,
  });
  const s = await snapshot(page);
  expect(s.events).toContain('tank-hit');
  expect(s.enemies.hitsTaken).toBeGreaterThan(0);
  expect(s.health).toBeLessThan(100);
  // It turned to face the helicopter.
  expect(s.enemies.tanks[0]?.facing).toBe(x > k.x ? 1 : -1);
});

test('a bomb dropped on a tank destroys it', async ({ page }) => {
  test.setTimeout(LONG);
  await openGame(page, '?mission=2');
  await overYard(page);
  const k = await tank(page);
  // Right above it: far too steep for its barrel, so it cannot fire back.
  const y = 150;
  await fly(page, { kind: 'move', x: k.x, y, floorY: FLOOR, controls: 'keys' });
  await page.keyboard.press('x');
  await fly(page, {
    kind: 'hold',
    x: k.x,
    y,
    floorY: FLOOR,
    controls: 'keys',
    untilTankDown: 0,
    forMs: 10_000,
  });
  const s = await snapshot(page);
  expect(s.enemies.tanks[0]?.alive).toBe(false);
  expect(s.events).toContain('tank-destroyed');
  expect(s.weapons.dropped).toBe(1);
  // Nothing more comes from a destroyed tank.
  await expect.poll(async () => (await snapshot(page)).enemies.tankShells, WAIT).toBe(0);
});

test('bullets at tank height destroy it after a few hits', async ({ page }) => {
  test.setTimeout(LONG);
  await openGame(page, '?mission=2');
  await overYard(page);
  const k = await tank(page);
  // Level with the hull, facing the tank, inside the yard.
  const left = k.x >= 960;
  const x = left ? k.x - 110 : k.x + 110;
  const y = GROUND - TANKS.height / 2 - WEAPONS.noseY;
  await fly(page, { kind: 'move', x, floorY: FLOOR, controls: 'keys' });
  if ((await snapshot(page)).facing !== (left ? 1 : -1)) await page.keyboard.press('c');
  await expect.poll(async () => (await snapshot(page)).facing, WAIT).toBe(left ? 1 : -1);
  await fly(page, { kind: 'move', x, y, floorY: FLOOR, controls: 'keys' });
  await fly(page, {
    kind: 'hold',
    x,
    y,
    floorY: FLOOR,
    controls: 'keys',
    untilTankDown: 0,
    forMs: 15_000,
    fire: true,
  });
  const s = await snapshot(page);
  expect(s.enemies.tanks[0]?.alive).toBe(false);
  expect(s.weapons.impacts).toBeGreaterThanOrEqual(TANKS.hp);
});
