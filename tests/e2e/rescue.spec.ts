import { expect, test, type Page } from '@playwright/test';
import { GAME_WIDTH, HELI_SHAPE, LANDING, PEOPLE, TOUCH } from '../../src/config/tuning';
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
  spot: 16,
  still: 6,
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
          return Math.abs(s.player.x - leg.x) <= p.spot && Math.abs(s.velocity.x) < p.still;
        };
        const steer = (s: GameSnapshot): [Dir, Dir] => {
          if (leg.kind === 'climb') return [0, -1];
          if (leg.kind === 'land') {
            if (s.velocity.y > p.sinkRate) return [0, -1];
            return [0, s.player.y < leg.floorY - p.glide ? 1 : 0];
          }
          // Wanted speed shrinks with the distance left, so it arrives slowly.
          const dist = leg.x - s.player.x;
          const wanted = Math.max(-p.cruise, Math.min(p.cruise, dist * p.approach));
          const off = wanted - s.velocity.x;
          return [Math.abs(off) > p.slack ? sign(off) : 0, s.player.y > p.cruiseY ? -1 : 0];
        };

        const deadline = performance.now() + p.timeoutMs;
        const frame = (): void => {
          const s = game.snapshot();
          if (!s) {
            reject(new Error('game scene stopped'));
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
            reject(new Error(`${leg.kind} ${leg.x}: ${s.mode} at ${at}`));
            return;
          }
          const [x, y] = steer(s);
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

/** The full M2 loop: fly out, land by the person, they board, fly home, they are saved. */
async function rescue(page: Page, controls: Controls): Promise<void> {
  const start = await snapshot(page);
  expect(start.hud).toMatchObject({ saved: 0, total: 1, aboard: 0, score: 0 });
  const base = start.roofs.find((r) => r.base);
  const person = start.people[0];
  if (!base || !person) throw new Error('map has no base or no person');
  const roof = start.roofs.find((r) => !r.base && person.x >= r.left && person.x <= r.right);
  if (!roof) throw new Error('the person is not on a roof');

  // Land facing right, well clear of the person (they block the skids).
  const pickup = person.x - PEOPLE.halfWidth - HELI_SHAPE.skidFront - 30;
  expect(pickup - PILOT.spot - HELI_SHAPE.skidBack).toBeGreaterThan(roof.left);
  await landAt(page, controls, pickup, roof);
  await expect.poll(async () => (await snapshot(page)).events, WAIT).toContain('boarded');
  expect((await snapshot(page)).hud.aboard).toBe(1);

  await landAt(page, controls, (base.left + base.right) / 2, base);
  await expect.poll(async () => (await snapshot(page)).events, WAIT).toContain('saved');
  const home = await snapshot(page);
  expect(home.hud).toMatchObject({ saved: 1, total: 1, aboard: 0, score: 100, health: 100 });
  expect(home.people[0]?.mode).toBe('saved');
  expect(home.events).not.toContain('hard-landing');
  expect(home.events).not.toContain('crashed');
}

test('a full rescue with the keyboard: fly out, land, board, fly home, score', async ({ page }) => {
  test.setTimeout(RESCUE_MS);
  await openGame(page);
  await rescue(page, 'keys');
});

test('a full rescue with the touch D-pad on a phone', async ({ browser, browserName }) => {
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
