import { expect, test, type Page } from '@playwright/test';
import { HELI_SHAPE, PEOPLE } from '../../src/config/tuning';
import type { GameSnapshot } from '../../src/scenes/GameScene';
import { fly, landAt } from './autopilot';
import { openGame } from './helpers';

/**
 * Roadmap M3.6: soldiers patrol roofs and the street, shoot at people running
 * to the helicopter (who are lost when hit), and go down to a bomb.
 */

const LONG = 300_000;
const WAIT = { timeout: 60_000 };

async function snapshot(page: Page): Promise<GameSnapshot> {
  const snap = await page.evaluate(() => window.__game?.snapshot() ?? null);
  if (!snap) throw new Error('game scene is not running');
  return snap;
}

test('soldiers patrol their posts on the street and on a roof', async ({ page }) => {
  await openGame(page);
  const first = (await snapshot(page)).enemies.soldiers;
  expect(first.length).toBeGreaterThanOrEqual(2);
  const onStreet = first.filter((s) => s.y === 254);
  const onRoof = first.filter((s) => s.y < 254);
  expect(onStreet.length).toBeGreaterThan(0);
  expect(onRoof.length).toBeGreaterThan(0);
  await expect
    .poll(async () => {
      const now = (await snapshot(page)).enemies.soldiers;
      return now.some((s, i) => Math.abs(s.x - (first[i]?.x ?? s.x)) > 4);
    }, WAIT)
    .toBe(true);
  expect((await snapshot(page)).enemies.soldiers.every((s) => s.mode === 'patrol')).toBe(true);
});

test('a soldier shoots people running to the helicopter; anyone hit is lost', async ({ page }) => {
  test.setTimeout(LONG);
  await openGame(page);
  const start = await snapshot(page);
  // The group whose roof has a soldier in the street beside it.
  const soldier = start.enemies.soldiers[0];
  if (!soldier) throw new Error('no soldier');
  const roof = start.roofs
    .filter((r) => !r.base && r.right <= soldier.x)
    .sort((a, b) => b.right - a.right)[0];
  if (!roof) throw new Error('no roof beside the soldier');
  const group = start.people.filter((p) => p.x >= roof.left && p.x <= roof.right);
  expect(group.length).toBeGreaterThan(0);
  const groupLeft = Math.min(...group.map((p) => p.x));
  const reach = Math.max(HELI_SHAPE.skidBack, HELI_SHAPE.skidFront);
  const x = (roof.left + reach + groupLeft - PEOPLE.halfWidth - reach) / 2;
  await landAt(page, 'keys', x, roof);
  // Wait until everyone in the group is either aboard or lost.
  await expect
    .poll(async () => {
      const now = await snapshot(page);
      const ids = new Set(group.map((p) => p.id));
      return now.people
        .filter((p) => ids.has(p.id))
        .every((p) => p.mode === 'aboard' || p.mode === 'lost');
    }, WAIT)
    .toBe(true);
  const s = await snapshot(page);
  const lost = s.people.filter((p) => p.mode === 'lost').length;
  expect(s.enemies.peopleHit).toBeGreaterThan(0);
  expect(lost).toBe(s.enemies.peopleHit);
  expect(s.events).toContain('lost');
});

test('a bomb takes down a soldier', async ({ page }) => {
  test.setTimeout(LONG);
  await openGame(page);
  const start = await snapshot(page);
  const i = start.enemies.soldiers.findIndex((s) => s.y < 254); // the roof soldier
  const soldier = start.enemies.soldiers[i];
  if (!soldier) throw new Error('no roof soldier');
  const floorY = soldier.y - HELI_SHAPE.bottom;
  await fly(page, { kind: 'climb', x: soldier.x, floorY, controls: 'keys' });
  await fly(page, { kind: 'move', x: soldier.x, floorY, controls: 'keys' });
  // Drop when it is right below, so its patrol can't carry it out of the blast.
  await expect
    .poll(async () => {
      const s = await snapshot(page);
      const now = s.enemies.soldiers[i];
      return Math.abs((now?.x ?? 0) - s.player.x) < 6;
    }, WAIT)
    .toBe(true);
  await page.keyboard.press('x');
  await expect
    .poll(async () => (await snapshot(page)).enemies.soldiers[i]?.mode, WAIT)
    .toMatch(/down|gone/);
  expect((await snapshot(page)).events).toContain('soldier-down');
  await expect
    .poll(async () => (await snapshot(page)).enemies.soldiers[i]?.mode, WAIT)
    .toBe('gone');
});
