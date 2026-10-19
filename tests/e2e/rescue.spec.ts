import { expect, test, type Page } from '@playwright/test';
import { landAt, PILOT, type Controls } from './autopilot';
import { openGame } from './helpers';
import { HELI_SHAPE, PEOPLE, SCORING } from '../../src/config/tuning';
import type { GameSnapshot } from '../../src/scenes/GameScene';

/**
 * Roadmap M2.7: a whole rescue, played through the game's real controls with
 * the in-page autopilot (./autopilot.ts).
 */

/** Two crossings of the city at headless speed. */
const RESCUE_MS = 420_000;
const WAIT = { timeout: 60_000 };

async function snapshot(page: Page): Promise<GameSnapshot> {
  const snap = await page.evaluate(() => window.__game?.snapshot() ?? null);
  if (!snap) throw new Error('game scene is not running');
  return snap;
}

/**
 * The rescue loop on mission 1: fly to the nearest group, land beside them,
 * they all board, fly home, they are all saved; everyone else keeps waiting.
 */
async function rescue(page: Page, controls: Controls): Promise<void> {
  const start = await snapshot(page);
  const total = start.people.length;
  expect(start.hud).toMatchObject({ saved: 0, total, aboard: 0, score: 0 });
  const base = start.roofs.find((r) => r.base);
  const roof = start.roofs.find(
    (r) => !r.base && start.people.some((p) => p.x >= r.left && p.x <= r.right),
  );
  if (!base || !roof) throw new Error('map has no base or no people on a roof');
  const onRoof = (p: { x: number }): boolean => p.x >= roof.left && p.x <= roof.right;
  const groupIds = start.people.filter(onRoof).map((p) => p.id);
  const groupLeft = Math.min(...start.people.filter(onRoof).map((p) => p.x));

  // Land in the middle of the clear stretch left of the group (people block
  // the skids), at a spot where the skids fit facing either way (the Turn
  // key mirrors the skid span; flying never turns it since M3.5).
  const reach = Math.max(HELI_SHAPE.skidBack, HELI_SHAPE.skidFront);
  const lo = roof.left + reach;
  const hi = groupLeft - PEOPLE.halfWidth - reach;
  expect(hi - lo).toBeGreaterThan(2 * PILOT.spot);
  await landAt(page, controls, (lo + hi) / 2, roof);
  // Wait until every one of them is all the way in: the HUD's aboard count
  // includes people still climbing in, who go back to waiting if it takes off.
  await expect
    .poll(async () => {
      const now = await snapshot(page);
      return now.people.filter((p) => groupIds.includes(p.id) && p.mode === 'aboard').length;
    }, WAIT)
    .toBe(groupIds.length);
  expect((await snapshot(page)).hud.aboard).toBe(groupIds.length);

  await landAt(page, controls, (base.left + base.right) / 2, base);
  await expect.poll(async () => (await snapshot(page)).hud.saved, WAIT).toBe(groupIds.length);
  const home = await snapshot(page);
  expect(home.hud).toMatchObject({
    saved: groupIds.length,
    total,
    aboard: 0,
    score: groupIds.length * SCORING.perPerson,
    health: 100,
  });
  for (const p of home.people) {
    expect(p.mode).toBe(groupIds.includes(p.id) ? 'saved' : 'waiting');
  }
  expect(home.events).not.toContain('hard-landing');
  expect(home.events).not.toContain('crashed');
}

test('a group rescue with the keyboard: fly out, land, board, fly home, score', async ({
  page,
}) => {
  test.setTimeout(RESCUE_MS);
  await openGame(page);
  await rescue(page, 'keys');
});

test('a group rescue with the touch D-pad on a phone', async ({ browser, browserName }) => {
  test.skip(browserName === 'firefox', 'Firefox has no mobile emulation in Playwright');
  test.setTimeout(RESCUE_MS);
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await openGame(page);
  expect((await snapshot(page)).input.touch).toBe(true);
  await rescue(page, 'dpad');
  await context.close();
});
