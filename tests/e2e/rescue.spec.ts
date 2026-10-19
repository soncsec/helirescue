import { expect, test, type Page } from '@playwright/test';
import { GAME_WIDTH, HELI_SHAPE, LANDING, PEOPLE, SCORING, TOUCH } from '../../src/config/tuning';
import type { Roof } from '../../src/logic/world';
import type { GameSnapshot } from '../../src/scenes/GameScene';

/**
 * Roadmap M2.7: a whole rescue, played through the game's real controls.
 *
 * Headless browsers render this game at only a few frames per second, and
 * each Playwright call waits for a frame, so steering from the test process
 * reacts far too late and overshoots. Instead an autopilot runs inside the
 * page, once per animation frame: it reads the game state and sends ordinary
 * DOM events (arrow-key presses, or mouse presses on the on-screen D-pad), so
 * the game's own keyboard and pointer handling does the rest.
 */

type Controls = 'keys' | 'dpad';

interface Leg {
  /** climb: up to cruise height. move: stop over x. land: come down gently. */
  kind: 'climb' | 'move' | 'land';
  x: number;
  /** Helicopter centre y when landed on the target roof. */
  floorY: number;
  controls: Controls;
}

/** Autopilot settings, passed into the page. */
const PILOT = {
  /** Cruise height: helicopter centre y, above every roof. */
  cruiseY: 60,
  /** Close enough to the spot (px) and slow enough to stop (px/s). */
  spot: 10,
  still: 6,
  /** Nearly level: tilt in degrees. */
  level: 2,
  /** Wanted speed is distance x approach (per second), at most cruise px/s. */
  approach: 1.2,
  cruise: 140,
  /** Push only when the speed is this far off (px/s). */
  slack: 8,
  /** Coming down: brake with Up above this sink rate (px/s), half the hard-landing speed. */
  sinkRate: LANDING.safeSpeed / 2,
  /** Within this many px of the roof, stop pushing Down and sink with no input (about 12 px/s). */
  glide: 40,
  /** D-pad centre and arrow distance in game pixels, and the game width. */
  padX: TOUCH.padX,
  padY: TOUCH.padY,
  arrow: TOUCH.arrow,
  gameWidth: GAME_WIDTH,
  timeoutMs: 90_000,
};

/** Two crossings of the city at headless speed. */
const RESCUE_MS = 420_000;
const WAIT = { timeout: 60_000 };

async function snapshot(page: Page): Promise<GameSnapshot> {
  const snap = await page.evaluate(() => window.__game?.snapshot() ?? null);
  if (!snap) throw new Error('game scene is not running');
  return snap;
}

async function openGame(page: Page): Promise<void> {
  await page.goto('./');
  await expect
    .poll(() => page.evaluate(() => window.__game?.scene() ?? null), { timeout: 15_000 })
    .toBe('Game');
}

/** Flies one leg with the in-page autopilot and returns the state at the end. */
async function fly(page: Page, leg: Leg): Promise<GameSnapshot> {
  return page.evaluate(
    ({ leg, p }) =>
      new Promise<GameSnapshot>((resolve, reject) => {
        const game = window.__game;
        const canvas = document.querySelector<HTMLCanvasElement>('#game canvas');
        if (!game || !canvas) {
          reject(new Error('game not running'));
          return;
        }
        type Dir = -1 | 0 | 1;
        const sign = (n: number): Dir => (n > 0 ? 1 : n < 0 ? -1 : 0);
        const codes: Record<string, number> = {
          ArrowLeft: 37,
          ArrowUp: 38,
          ArrowRight: 39,
          ArrowDown: 40,
        };
        const held = new Set<string>();
        let fingerDown = false;

        const key = (type: 'keydown' | 'keyup', k: string): void => {
          const e = new KeyboardEvent(type, { key: k, code: k, bubbles: true });
          // Phaser reads the legacy keyCode, which the constructor leaves at 0.
          Object.defineProperty(e, 'keyCode', { get: () => codes[k] });
          window.dispatchEvent(e);
        };
        const mouse = (type: string, x: number, y: number): void => {
          canvas.dispatchEvent(
            new MouseEvent(type, {
              clientX: x,
              clientY: y,
              button: 0,
              buttons: type === 'mouseup' ? 0 : 1,
              bubbles: true,
            }),
          );
        };

        const press = (x: Dir, y: Dir): void => {
          if (leg.controls === 'keys') {
            const want = new Set<string>();
            if (x < 0) want.add('ArrowLeft');
            if (x > 0) want.add('ArrowRight');
            if (y < 0) want.add('ArrowUp');
            if (y > 0) want.add('ArrowDown');
            for (const k of [...held]) {
              if (!want.has(k)) {
                key('keyup', k);
                held.delete(k);
              }
            }
            for (const k of want) {
              if (!held.has(k)) {
                key('keydown', k);
                held.add(k);
              }
            }
            return;
          }
          const box = canvas.getBoundingClientRect();
          const zoom = box.width / p.gameWidth;
          const cx = box.left + p.padX * zoom;
          const cy = box.top + p.padY * zoom;
          if (x === 0 && y === 0) {
            if (fingerDown) mouse('mouseup', cx, cy);
            fingerDown = false;
            return;
          }
          const fx = cx + x * p.arrow * zoom;
          const fy = cy + y * p.arrow * zoom;
          mouse('mousemove', fx, fy);
          if (!fingerDown) mouse('mousedown', fx, fy);
          fingerDown = true;
        };

        const done = (s: GameSnapshot): boolean => {
          if (leg.kind === 'climb') return s.player.y < p.cruiseY;
          if (leg.kind === 'land') return s.mode === 'landed';
          // Stopped and nearly level: any tilt left would keep pushing it sideways.
          return (
            Math.abs(s.player.x - leg.x) <= p.spot &&
            Math.abs(s.velocity.x) < p.still &&
            Math.abs(s.tilt) < p.level
          );
        };
        // Wanted speed shrinks with the distance left, so it arrives slowly.
        const hold = (s: GameSnapshot): Dir => {
          const dist = leg.x - s.player.x;
          const wanted = Math.max(-p.cruise, Math.min(p.cruise, dist * p.approach));
          const off = wanted - s.velocity.x;
          return Math.abs(off) > p.slack ? sign(off) : 0;
        };
        const steer = (s: GameSnapshot): [Dir, Dir] => {
          if (leg.kind === 'climb') return [0, -1];
          if (leg.kind === 'land') {
            // Correct only a real drift, so it is not rocking as it touches down.
            const x = Math.abs(leg.x - s.player.x) > p.spot ? hold(s) : 0;
            if (s.velocity.y > p.sinkRate) return [x, -1];
            return [x, s.player.y < leg.floorY - p.glide ? 1 : 0];
          }
          return [hold(s), s.player.y > p.cruiseY ? -1 : 0];
        };

        const w = window as unknown as { __trail?: string[] };
        w.__trail ??= [];
        const trail = w.__trail;
        trail.push(`== ${leg.kind} ${Math.round(leg.x)}`);
        const deadline = performance.now() + p.timeoutMs;
        const frame = (): void => {
          const s = game.snapshot();
          if (!s) {
            reject(new Error('game scene stopped'));
            return;
          }
          if (done(s) && leg.kind === 'land' && Math.abs(s.player.y - leg.floorY) > 2) {
            press(0, 0);
            reject(
              new Error(
                `landed at y ${Math.round(s.player.y)}, not ${leg.floorY}: ${trail.filter((_, i) => i % 10 === 0).join(' | ')}`,
              ),
            );
            return;
          }
          if (done(s)) {
            press(0, 0);
            resolve(s);
            return;
          }
          if (s.mode === 'crashed' || performance.now() > deadline) {
            press(0, 0);
            const at = `x ${Math.round(s.player.x)} y ${Math.round(s.player.y)} vx ${Math.round(s.velocity.x)}`;
            reject(
              new Error(
                `${leg.kind} ${leg.x}: ${s.mode} at ${at}: ${trail.filter((_, i) => i % 10 === 0).join(' | ')}`,
              ),
            );
            return;
          }
          const [x, y] = steer(s);
          trail.push(
            `${Math.round(s.player.x)},${Math.round(s.player.y)} v${Math.round(s.velocity.x)},${Math.round(s.velocity.y)} ${s.mode[0]} ${x},${y}`,
          );
          if (trail.length > 3000) trail.shift();
          press(x, y);
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      }),
    { leg, p: PILOT },
  );
}

/** Climbs to cruise height, flies over x, stops, and lands gently on `roof`. */
async function landAt(page: Page, controls: Controls, x: number, roof: Roof): Promise<void> {
  const floorY = roof.y - HELI_SHAPE.bottom;
  await fly(page, { kind: 'climb', x, floorY, controls });
  await fly(page, { kind: 'move', x, floorY, controls });
  const landed = await fly(page, { kind: 'land', x, floorY, controls });
  expect(landed.on).toEqual(roof);
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
  // the skids), at a spot where the skids fit facing either way: braking can
  // flip the helicopter round, which mirrors the skid span.
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
