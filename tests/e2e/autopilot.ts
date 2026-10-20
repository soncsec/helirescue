import { expect, type Page } from '@playwright/test';
import { GAME_WIDTH, HELI_SHAPE, LANDING, TOUCH } from '../../src/config/tuning';
import type { Roof } from '../../src/logic/world';
import type { GameSnapshot } from '../../src/scenes/GameScene';

/**
 * In-page autopilot for e2e tests (M2.7, shared since M3.6).
 *
 * Headless browsers render this game at only a few frames per second, and
 * each Playwright call waits for a frame, so steering from the test process
 * reacts far too late and overshoots. Instead an autopilot runs inside the
 * page, once per animation frame: it reads the game state and sends ordinary
 * DOM events (arrow-key presses, or mouse presses on the on-screen D-pad), so
 * the game's own keyboard and pointer handling does the rest.
 */

export type Controls = 'keys' | 'dpad';

export interface Leg {
  /**
   * climb: up to cruise height. move: stop over x (at height y, or cruise
   * height). land: come down gently. hold: stay at x and y until the gun
   * `untilGunDown` is destroyed.
   */
  kind: 'climb' | 'move' | 'land' | 'hold' | 'slide';
  x: number;
  /** Helicopter centre y when landed on the target roof. */
  floorY: number;
  controls: Controls;
  /** Height to fly or hold at (helicopter centre y); cruise height when left out. */
  y?: number;
  untilGunDown?: number;
  /** hold: stop once this tank is destroyed (M5.2). */
  untilTankDown?: number;
  /** hold: stop once a jet has been shot down (M5.3). */
  untilJetDown?: boolean;
  /** hold: stop once this event is in the game's event log (M5.3). */
  untilEvent?: GameSnapshot['events'][number];
  /** hold: stop after this long even if the gun still stands (ms). */
  forMs?: number;
  /** hold: stop once the helicopter's own fire has hit a person (friendly fire). */
  untilPeopleHit?: boolean;
  /** move or hold: stop once the helicopter has taken this many flak hits. */
  untilHits?: number;
  /**
   * slide: hold height y while speeding up to the right, then come down still
   * pushing right once moving at least this fast (px/s); ends on touch-down.
   */
  slideSpeed?: number;
}

/** Autopilot settings, passed into the page. */
export const PILOT = {
  /** Cruise height: helicopter centre y, above every roof. */
  cruiseY: 60,
  /** Holding a height: descend only when this far above it (px), climb when below. */
  band: 8,
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

/** Flies one leg with the in-page autopilot and returns the state at the end. */
export async function fly(page: Page, leg: Leg): Promise<GameSnapshot> {
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
          if (leg.kind === 'slide') return s.mode === 'landed' || s.mode === 'crashed';
          if (leg.kind === 'hold') {
            const gunDown =
              s.enemies.guns[leg.untilGunDown ?? -1]?.alive === false ||
              s.enemies.tanks[leg.untilTankDown ?? -1]?.alive === false ||
              (leg.untilJetDown === true && s.events.includes('jet-down')) ||
              (leg.untilEvent !== undefined && s.events.includes(leg.untilEvent));
            const hit =
              (leg.untilHits !== undefined && s.enemies.hitsTaken >= leg.untilHits) ||
              (leg.untilPeopleHit === true && s.weapons.peopleHit > 0);
            return (
              gunDown || hit || (leg.forMs !== undefined && performance.now() - began >= leg.forMs)
            );
          }
          if (leg.untilHits !== undefined && s.enemies.hitsTaken >= leg.untilHits) return true;
          // Stopped and nearly level: any tilt left would keep pushing it sideways.
          // With a height to fly at, it must be there too.
          const atHeight = leg.y === undefined || Math.abs(s.player.y - leg.y) <= p.band;
          return (
            atHeight &&
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
          if (leg.kind === 'slide') {
            const fast = s.velocity.x >= (leg.slideSpeed ?? 0);
            const ty = leg.y ?? p.cruiseY;
            return [1, fast ? 1 : s.player.y > ty ? -1 : 0];
          }
          if (leg.kind === 'land') {
            // Correct only a real drift, so it is not rocking as it touches down.
            const x = Math.abs(leg.x - s.player.x) > p.spot ? hold(s) : 0;
            if (s.velocity.y > p.sinkRate) return [x, -1];
            return [x, s.player.y < leg.floorY - p.glide ? 1 : 0];
          }
          const ty = leg.y ?? p.cruiseY;
          return [hold(s), s.player.y > ty ? -1 : s.player.y < ty - p.band ? 1 : 0];
        };

        const w = window as unknown as { __trail?: string[] };
        w.__trail ??= [];
        const trail = w.__trail;
        trail.push(`== ${leg.kind} ${Math.round(leg.x)}`);
        const began = performance.now();
        const deadline = began + p.timeoutMs;
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
export async function landAt(page: Page, controls: Controls, x: number, roof: Roof): Promise<void> {
  const floorY = roof.y - HELI_SHAPE.bottom;
  await fly(page, { kind: 'climb', x, floorY, controls });
  await fly(page, { kind: 'move', x, floorY, controls });
  const landed = await fly(page, { kind: 'land', x, floorY, controls });
  expect(landed.on).toEqual(roof);
}
