import { expect, test, type Page } from '@playwright/test';
import { ENEMIES, HELI_SHAPE, WEAPONS } from '../../src/config/tuning';
import type { GameSnapshot } from '../../src/scenes/GameScene';
import { fly } from './autopilot';
import { openGame } from './helpers';

/**
 * Roadmap M3.6: anti-aircraft guns aim at the helicopter and fire flak that
 * takes its health; bombs and bullets destroy them. Flown with the in-page
 * autopilot (./autopilot.ts) and the real keyboard.
 */

const LONG = 300_000;
const WAIT = { timeout: 60_000 };

async function snapshot(page: Page): Promise<GameSnapshot> {
  const snap = await page.evaluate(() => window.__game?.snapshot() ?? null);
  if (!snap) throw new Error('game scene is not running');
  return snap;
}

/** The first gun on the map and the y the helicopter would land at on its roof. */
async function firstGun(page: Page): Promise<{ x: number; y: number; floorY: number }> {
  const g = (await snapshot(page)).enemies.guns[0];
  if (!g) throw new Error('no guns on the map');
  return { x: g.x, y: g.y, floorY: g.y - HELI_SHAPE.bottom };
}

test('a gun aims at the helicopter above it and flak takes its health', async ({ page }) => {
  test.setTimeout(LONG);
  await openGame(page);
  const g = await firstGun(page);
  const before = await snapshot(page);
  expect(before.enemies.guns.every((x) => x.alive && x.hp === ENEMIES.aaHp)).toBe(true);
  await fly(page, { kind: 'climb', x: g.x, floorY: g.floorY, controls: 'keys' });
  // Hover up and to the left of the gun, in range.
  const x = g.x - 60;
  // Fly in until the first hit: staying in range long enough would get it shot down.
  await fly(page, { kind: 'move', x, floorY: g.floorY, controls: 'keys', untilHits: 1 });
  // Stay until the first flak hit, if the approach got none (staying long enough to be shot down would end the test).
  await fly(page, {
    kind: 'hold',
    x,
    floorY: g.floorY,
    controls: 'keys',
    untilHits: 1,
    forMs: 30_000,
  });
  const s = await snapshot(page);
  expect(s.enemies.hitsTaken).toBeGreaterThan(0);
  expect(s.health).toBeLessThan(100);
  expect(s.enemies.guns[0]?.aim).toBeLessThan(2); // aiming up and to the left
});

test('a bomb dropped on a gun destroys it', async ({ page }) => {
  test.setTimeout(LONG);
  await openGame(page);
  const g = await firstGun(page);
  await fly(page, { kind: 'climb', x: g.x, floorY: g.floorY, controls: 'keys' });
  await fly(page, { kind: 'move', x: g.x, floorY: g.floorY, controls: 'keys' });
  await page.keyboard.press('x');
  await fly(page, {
    kind: 'hold',
    x: g.x,
    floorY: g.floorY,
    controls: 'keys',
    untilGunDown: 0,
    forMs: 10_000,
  });
  const s = await snapshot(page);
  expect(s.enemies.guns[0]?.alive).toBe(false);
  expect(s.events).toContain('gun-destroyed');
  expect(s.weapons.dropped).toBe(1);
  // The other gun still stands.
  expect(s.enemies.guns[1]?.alive).toBe(true);
});

test('bullets at roof height destroy a gun after a few hits', async ({ page }) => {
  test.setTimeout(LONG);
  await openGame(page);
  const g = await firstGun(page);
  // Level with the gun, before its building, facing it. Get there safely: fly
  // in out of the gun's range, drop to its height (it only fires upward, so it
  // can't reach a helicopter level with it), then close in.
  const x = g.x - 140;
  const y = g.y - ENEMIES.gunHeight / 2 - WEAPONS.noseY;
  const safeX = g.x - ENEMIES.aaRange - 90;
  await fly(page, { kind: 'climb', x: safeX, floorY: g.floorY, controls: 'keys' });
  await fly(page, { kind: 'move', x: safeX, floorY: g.floorY, controls: 'keys' });
  await fly(page, { kind: 'move', x: safeX, y, floorY: g.floorY, controls: 'keys' });
  await fly(page, { kind: 'move', x, y, floorY: g.floorY, controls: 'keys' });
  expect((await snapshot(page)).facing).toBe(1);
  await page.keyboard.down('z');
  await fly(page, {
    kind: 'hold',
    x,
    y,
    floorY: g.floorY,
    controls: 'keys',
    untilGunDown: 0,
    forMs: 15_000,
  });
  await page.keyboard.up('z');
  const s = await snapshot(page);
  expect(s.enemies.guns[0]?.alive).toBe(false);
  expect(s.weapons.impacts).toBeGreaterThanOrEqual(ENEMIES.aaHp);
});

test('the game state has the mission guns, standing on roofs', async ({ page }) => {
  await openGame(page);
  const s = await snapshot(page);
  expect(s.enemies.guns.length).toBeGreaterThanOrEqual(1);
  for (const g of s.enemies.guns) {
    expect(s.roofs.some((r) => !r.base && g.x > r.left && g.x < r.right && r.y === g.y)).toBe(true);
  }
  await expect.poll(async () => (await snapshot(page)).enemies.flak, WAIT).toBe(0);
});
