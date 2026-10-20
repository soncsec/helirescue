import { expect, test, type Page } from '@playwright/test';
import { fly } from './autopilot';
import { openGame, openTitle } from './helpers';
import { FLIGHT, HELI_SHAPE, LANDING, SCENERY, TOUCH } from '../../src/config/tuning';
import { bumpDamage } from '../../src/logic/landing';
import type { GameSnapshot } from '../../src/scenes/GameScene';

/** Records console errors, uncaught exceptions and requests to other hosts. */
function watchPage(page: Page): { errors: string[]; foreignRequests: string[] } {
  const errors: string[] = [];
  const foreignRequests: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (url.protocol.startsWith('http') && url.hostname !== 'localhost') {
      foreignRequests.push(req.url());
    }
  });
  return { errors, foreignRequests };
}

async function snapshot(page: Page): Promise<GameSnapshot> {
  const snap = await page.evaluate(() => window.__game?.snapshot() ?? null);
  if (!snap) throw new Error('game scene is not running');
  return snap;
}

/**
 * Headless browsers render the game slowly (Chromium about 38 fps, WebKit
 * slower still, and less with parallel workers), and Phaser caps each early
 * frame at 1/60 s, so the game runs in slow motion at first. Movement checks
 * wait on the game's own state with this generous timeout instead of assuming
 * real-time speed.
 */
const MOVE = { timeout: 40_000 };
/** Flight level well clear of every roof, for tests that fly across the city. */
const CLEAR_Y = 40;

test('boots with no console errors and no third-party requests', async ({ page }) => {
  const watched = watchPage(page);
  await openGame(page);
  await expect(page.locator('#game canvas')).toBeVisible();
  await page.waitForTimeout(1000);
  expect(watched.errors).toEqual([]);
  expect(watched.foreignRequests).toEqual([]);
});

test('the helicopter starts over the base, flies with tilt, and the camera follows', async ({
  page,
}) => {
  test.slow();
  await openGame(page);
  const start = await snapshot(page);
  expect(start.missing).toEqual([]);
  const base = start.roofs[0];
  expect(base?.base).toBe(true);
  expect(start.player.x).toBeGreaterThan(base?.left ?? Infinity);
  expect(start.player.x).toBeLessThan(base?.right ?? -Infinity);
  expect(start.player.y).toBeLessThan(base?.y ?? -Infinity);
  expect(start.worldWidth).toBeGreaterThan(960);

  // Climb well above the rooftops first, so the buildings don't block the way
  // (the tallest mission 1 roof is at y 94; it sinks slowly while drifting).
  await page.keyboard.down('ArrowUp');
  await expect.poll(async () => (await snapshot(page)).player.y, MOVE).toBeLessThan(CLEAR_Y);
  await page.keyboard.up('ArrowUp');

  await page.keyboard.down('ArrowRight');
  await expect.poll(async () => (await snapshot(page)).tilt, MOVE).toBeGreaterThan(0);
  await expect.poll(async () => (await snapshot(page)).cameraX, MOVE).toBeGreaterThan(100);
  const moving = await snapshot(page);
  await page.keyboard.up('ArrowRight');
  expect(moving.velocity.x).toBeGreaterThan(50);
  expect(moving.facing).toBe(1);
  // The helicopter stays in view.
  expect(moving.player.x).toBeGreaterThan(moving.cameraX);
  expect(moving.player.x).toBeLessThan(moving.cameraX + 480);
  // Released: it levels out and drifts to a stop.
  await expect.poll(async () => (await snapshot(page)).tilt, MOVE).toBe(0);
  await expect.poll(async () => Math.abs((await snapshot(page)).velocity.x), MOVE).toBeLessThan(5);

  // Up climbs again (it has been sinking slowly while drifting).
  const before = await snapshot(page);
  await page.keyboard.down('ArrowUp');
  await expect
    .poll(async () => (await snapshot(page)).player.y, MOVE)
    .toBeLessThan(Math.min(before.player.y - 10, CLEAR_Y));
  await page.keyboard.up('ArrowUp');

  // Fly left: it turns to face the way it flies (owner, 2026-10-20).
  await page.keyboard.down('ArrowLeft');
  await expect.poll(async () => (await snapshot(page)).facing, MOVE).toBe(-1);
  await expect.poll(async () => (await snapshot(page)).cameraX, MOVE).toBe(0);
  await page.waitForTimeout(1500);
  await page.keyboard.up('ArrowLeft');
  const left = await snapshot(page);
  // Stopped at the left edge of the world, fully on screen.
  expect(left.player.x).toBeGreaterThan(0);
  expect(left.velocity.x).toBeLessThanOrEqual(0);
});

test('with no input it sinks gently onto the base pad and lands safely', async ({ page }) => {
  await openGame(page);
  const start = await snapshot(page);
  expect(start.mode).not.toBe('landed');
  await expect.poll(async () => (await snapshot(page)).mode, MOVE).toBe('landed');
  const landed = await snapshot(page);
  expect(landed.on?.base).toBe(true);
  expect(landed.health).toBe(100);
  expect(landed.events).toEqual(['landed']);
  expect(landed.player.x).toBe(start.player.x);
});

test('up takes off; holding Down lands gently on the base (the flare)', async ({ page }) => {
  test.slow();
  await openGame(page);
  await expect.poll(async () => (await snapshot(page)).mode, MOVE).toBe('landed');
  await page.keyboard.down('ArrowUp');
  await expect.poll(async () => (await snapshot(page)).events, MOVE).toContain('took-off');
  await expect.poll(async () => (await snapshot(page)).player.y, MOVE).toBeLessThan(60);
  await page.keyboard.up('ArrowUp');
  await page.keyboard.down('ArrowDown');
  await expect.poll(async () => (await snapshot(page)).mode, MOVE).toBe('landed');
  await page.keyboard.up('ArrowDown');
  const after = await snapshot(page);
  expect(after.events).not.toContain('hard-landing');
  expect(after.health).toBe(100);
  expect(after.on?.base).toBe(true);
});

test('touching down while still flying sideways fast is a hard landing', async ({ page }) => {
  test.slow();
  await openGame(page);
  const base = (await snapshot(page)).roofs.find((r) => r.base);
  if (!base) throw new Error('no base');
  // Hover just above the left end of the base roof (its long, flat strip),
  // then come down while speeding up to the right (the autopilot's slide leg,
  // frame by frame, inside the page).
  const floorY = base.y - HELI_SHAPE.bottom;
  await fly(page, { kind: 'climb', x: 60, floorY, controls: 'keys' });
  await fly(page, { kind: 'move', x: 60, floorY, controls: 'keys' });
  await fly(page, { kind: 'move', x: 60, y: floorY - 20, floorY, controls: 'keys' });
  // Right and Down together from the start: the flare holds the sink to
  // 30 px/s, so it touches down about 0.7 s later, still over the base, at
  // around 85 px/s sideways.
  await fly(page, { kind: 'slide', x: 60, floorY, controls: 'keys', slideSpeed: 0 });
  const after = await snapshot(page);
  expect(after.events).toContain('hard-landing');
  expect(after.health).toBeLessThan(100);
  expect(after.on?.base).toBe(true);
});

test('flying low into a building stops at its wall, for a little damage', async ({ page }) => {
  test.slow();
  await openGame(page);
  const firstBuilding = (await snapshot(page)).roofs[1];
  if (!firstBuilding) throw new Error('no buildings');
  await page.keyboard.down('ArrowRight');
  await expect.poll(async () => (await snapshot(page)).events, MOVE).toContain('bumped');
  await page.keyboard.up('ArrowRight');
  const s = await snapshot(page);
  expect(s.player.x).toBeLessThan(firstBuilding.left);
  // A little damage (owner, 2026-10-20): never more than a full-speed hit costs.
  expect(s.health).toBeLessThan(100);
  expect(s.health).toBeGreaterThanOrEqual(100 - bumpDamage(160, LANDING));
});

test('the HUD shows the rescue status and groups wait on roofs across the city', async ({
  page,
}) => {
  await openGame(page);
  const s = await snapshot(page);
  expect(s.hud).toEqual({
    health: 100,
    maxHealth: 100,
    saved: 0,
    total: 16,
    // 70% of 16, rounded up (owner, 2026-10-20).
    needed: 12,
    aboard: 0,
    capacity: 10,
    score: 0,
    lives: 3,
  });
  expect(s.people).toHaveLength(16);
  expect(s.people.every((p) => p.mode === 'waiting')).toBe(true);
  const roofsWithPeople = s.roofs.filter((r) =>
    s.people.some((p) => p.x >= r.left && p.x <= r.right),
  );
  expect(roofsWithPeople.length).toBeGreaterThanOrEqual(4);
  expect(roofsWithPeople.every((r) => !r.base)).toBe(true);
  expect(Math.max(...s.people.map((p) => p.x))).toBeGreaterThan(3 * 480); // into the fourth screen
  expect(await page.evaluate(() => window.__game?.hudActive() ?? false)).toBe(true);
});

test('the HUD font is loaded and a desktop gets keyboard play at a whole-number zoom', async ({
  page,
}) => {
  await openGame(page);
  expect(await page.evaluate(() => document.fonts.check('8px "Press Start 2P"'))).toBe(true);
  await expect(page.locator('#rotate-note')).toBeHidden();
  const { input } = await snapshot(page);
  expect(input.touch).toBe(false);
  expect(Number.isInteger(input.zoom)).toBe(true);
  expect(input.zoom).toBeGreaterThanOrEqual(1);
});

test('the touch D-pad flies the helicopter', async ({ page }) => {
  test.slow();
  await openGame(page, '?touch=1');
  const before = await snapshot(page);
  expect(before.input).toMatchObject({ touch: true, touchAxis: { x: 0, y: 0 } });

  // Press up-right on the pad: canvas position times zoom gives the pad's screen spot.
  const box = await page.locator('#game canvas').boundingBox();
  if (!box) throw new Error('no canvas');
  const zoom = box.width / 480;
  const padX = box.x + TOUCH.padX * zoom;
  const padY = box.y + TOUCH.padY * zoom;
  const reach = TOUCH.arrow * zoom;
  await page.mouse.move(padX + reach, padY - reach);
  await page.mouse.down();
  await expect.poll(async () => (await snapshot(page)).input.touchAxis).toEqual({ x: 1, y: -1 });
  await expect
    .poll(async () => {
      const s = await snapshot(page);
      return s.player.x > before.player.x + 20 && s.player.y < before.player.y - 20;
    }, MOVE)
    .toBe(true);

  await page.mouse.up();
  await expect.poll(async () => (await snapshot(page)).input.touchAxis).toEqual({ x: 0, y: 0 });
});

test('a phone in landscape gets the D-pad at a fit-to-screen zoom', async ({
  browser,
  browserName,
}) => {
  test.skip(browserName === 'firefox', 'Firefox has no mobile emulation in Playwright');
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await openGame(page);
  await expect(page.locator('#rotate-note')).toBeHidden();
  const { input } = await snapshot(page);
  expect(input.touch).toBe(true);
  expect(input.zoom).toBeCloseTo(390 / 270, 2);
  const box = await page.locator('#game canvas').boundingBox();
  expect(box?.height).toBeCloseTo(390, 0);
  await context.close();
});

test('a phone held upright is asked to turn, and the game pauses', async ({
  browser,
  browserName,
}) => {
  test.skip(browserName === 'firefox', 'Firefox has no mobile emulation in Playwright');
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  // Upright, the whole game pauses on the title screen: it can't be started.
  await openTitle(page);
  await expect(page.locator('#rotate-note')).toBeVisible();
  await expect(page.locator('#rotate-note')).toContainText('Turn your phone sideways');
  await expect.poll(() => page.evaluate(() => window.__game?.paused() ?? null)).toBe(true);

  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('#rotate-note')).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.__game?.paused() ?? null)).toBe(false);
  await page.locator('#game canvas').tap();
  await expect.poll(() => page.evaluate(() => window.__game?.scene() ?? null)).toBe('Game');
  await context.close();
});

test('it faces the way it flies; while hovering C turns it, once per press', async ({ page }) => {
  test.slow();
  await openGame(page);
  // Out from the base at cruise height (the autopilot holds it there): the base
  // is only ~40 px from the world's left edge, too close to speed up flying left.
  const floorY = SCENERY.groundY - HELI_SHAPE.bottom;
  await fly(page, { kind: 'climb', x: 96, floorY, controls: 'keys' });
  await fly(page, { kind: 'move', x: 400, floorY, controls: 'keys' });
  // Flying right faced it right.
  expect((await snapshot(page)).facing).toBe(1);
  // Flying left turns it left once it is faster than turnSpeed (owner, 2026-10-20).
  await page.keyboard.down('ArrowLeft');
  await expect
    .poll(async () => (await snapshot(page)).velocity.x, MOVE)
    .toBeLessThan(-FLIGHT.turnSpeed);
  await expect.poll(async () => (await snapshot(page)).facing, MOVE).toBe(-1);
  await page.keyboard.up('ArrowLeft');
  // Hovering again (held at cruise height): one press of C, one turn.
  await fly(page, { kind: 'move', x: 300, floorY, controls: 'keys' });
  const f = (await snapshot(page)).facing;
  await page.keyboard.press('c');
  await expect.poll(async () => (await snapshot(page)).facing, MOVE).toBe(-f);
  await page.waitForTimeout(300);
  expect((await snapshot(page)).facing).toBe(-f);
  await page.keyboard.press('c');
  await expect.poll(async () => (await snapshot(page)).facing, MOVE).toBe(f);
});

test('the touch Turn button turns the helicopter around', async ({ browser, browserName }) => {
  test.skip(browserName === 'firefox', 'Firefox has no mobile emulation in Playwright');
  test.slow();
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await openGame(page);
  // Take off first: it cannot turn while landed.
  await expect.poll(async () => (await snapshot(page)).mode, MOVE).not.toBe('landed');
  const box = await page.locator('#game canvas').boundingBox();
  if (!box) throw new Error('no canvas');
  const zoom = box.width / 480;
  const t = TOUCH.buttons.turn;
  await page.mouse.click(box.x + t.x * zoom, box.y + t.y * zoom);
  await expect.poll(async () => (await snapshot(page)).facing, MOVE).toBe(-1);
  await context.close();
});

test('?seed= in the URL sets the random seed', async ({ page }) => {
  await openGame(page, '?seed=42');
  expect((await snapshot(page)).seed).toBe(42);
});
