import { expect, test, type Page } from '@playwright/test';
import { HELI_SHAPE, WEAPONS } from '../../src/config/tuning';
import type { GameSnapshot } from '../../src/scenes/GameScene';
import { fly } from './autopilot';
import { openGame } from './helpers';

/**
 * Friendly fire (owner, 2026-10-19): the helicopter's own bullets and bombs
 * can hit the people. They vanish and count as lost; no blood.
 */

const LONG = 300_000;
const WAIT = { timeout: 60_000 };

async function snapshot(page: Page): Promise<GameSnapshot> {
  const snap = await page.evaluate(() => window.__game?.snapshot() ?? null);
  if (!snap) throw new Error('game scene is not running');
  return snap;
}

/** The nearest group: its roof and its people. */
async function firstGroup(
  page: Page,
): Promise<{ roof: GameSnapshot['roofs'][number]; ids: number[]; left: number }> {
  const s = await snapshot(page);
  const roof = s.roofs.find(
    (r) => !r.base && s.people.some((p) => p.x >= r.left && p.x <= r.right),
  );
  if (!roof) throw new Error('no group');
  const group = s.people.filter((p) => p.x >= roof.left && p.x <= roof.right);
  return { roof, ids: group.map((p) => p.id), left: Math.min(...group.map((p) => p.x)) };
}

test('a bomb dropped on a waiting group hits people there', async ({ page }) => {
  test.setTimeout(LONG);
  await openGame(page);
  const g = await firstGroup(page);
  const floorY = g.roof.y - HELI_SHAPE.bottom;
  const x = g.left + 12; // over the middle of the group
  await fly(page, { kind: 'climb', x, floorY, controls: 'keys' });
  await fly(page, { kind: 'move', x, floorY, controls: 'keys' });
  await page.keyboard.press('x');
  await expect.poll(async () => (await snapshot(page)).weapons.blasts, WAIT).toBe(1);
  const s = await snapshot(page);
  expect(s.weapons.peopleHit).toBeGreaterThan(0);
  const lost = s.people.filter((p) => g.ids.includes(p.id) && p.mode === 'lost').length;
  expect(lost).toBe(s.weapons.peopleHit);
  expect(s.hud.saved).toBe(0);
});

test('bullets fired at a group on its roof hit the first person in line', async ({ page }) => {
  test.setTimeout(LONG);
  await openGame(page);
  const g = await firstGroup(page);
  // Level with the people, over the lower building before their roof, facing them.
  const x = g.roof.left - 60;
  const y = g.roof.y - 13 - WEAPONS.noseY;
  const floorY = g.roof.y - HELI_SHAPE.bottom;
  await fly(page, { kind: 'climb', x, floorY, controls: 'keys' });
  await fly(page, { kind: 'move', x, floorY, controls: 'keys' });
  await fly(page, { kind: 'move', x, y, floorY, controls: 'keys' });
  expect((await snapshot(page)).facing).toBe(1);
  // Fire while the autopilot holds it there, level (left alone it would sink onto a roof edge).
  await fly(page, {
    kind: 'hold',
    x,
    y,
    floorY,
    controls: 'keys',
    untilPeopleHit: true,
    forMs: 30_000,
    fire: true,
  });
  expect((await snapshot(page)).weapons.peopleHit).toBeGreaterThan(0);
  const s = await snapshot(page);
  const first = s.people.find((p) => p.x === g.left);
  expect(first?.mode).toBe('lost');
});
