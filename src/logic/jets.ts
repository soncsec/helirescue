/**
 * Enemy VTOL jets (roadmap M5.3, H5), from mission 2: fast strafing passes
 * that are easy to dodge. Before each pass a warning shows at the screen edge
 * the jet will come from, at the height it will fly. It then crosses the
 * screen in a straight line above the rooftops and fires a short level burst
 * at the helicopter when it is ahead of the nose and level with it. Jets and
 * their shots live in fixed pools; timing and sides use the seeded RNG. Two
 * bullets bring a jet down. Plain TypeScript, unit tested.
 */
import { moveShell, targetable, type EnemyEvent, type Flak, type ShellRules } from './enemies';
import type { Heli } from './landing';
import type { Rng } from './rng';
import type { Arena, Box } from './weapons';

/** When jets come in a mission (part of the map). */
export interface Raid {
  /** Seconds before the first pass. */
  first: number;
  /** Seconds between passes (varied by up to `t.everyJitter` either way). */
  every: number;
}

export interface Jet {
  alive: boolean;
  x: number;
  y: number;
  /** 1 flying right (as drawn), -1 flying left. */
  facing: 1 | -1;
  hp: number;
  /** Shots left in this pass, and seconds until the next may fire. */
  shotsLeft: number;
  fireTimer: number;
}

export interface JetTuning extends ShellRules {
  speed: number;
  hp: number;
  /** Hit box: half width and half height around the centre. */
  halfWidth: number;
  halfHeight: number;
  /** Nose (where shots leave) from the centre, facing right. */
  noseX: number;
  noseY: number;
  shotSpeed: number;
  shotLife: number;
  shotDamage: number;
  maxShots: number;
  maxJets: number;
  /** Shots per pass and the gap between them, s. */
  burst: number;
  burstGap: number;
  /** Fires when the helicopter is ahead within this far, and this close in height, px. */
  fireRange: number;
  fireHeight: number;
  /** The warning shows this long before the jet comes on screen, s. */
  warnSeconds: number;
  /** Jets start and end this far beyond the screen edge, px. */
  offscreen: number;
  /** The highest a jet flies (centre y), px. */
  topY: number;
  /** How far a pass's height may differ from the helicopter's, px. */
  heightJitter: number;
  /** Fraction the time between passes varies either way. */
  everyJitter: number;
}

/** A pass that is coming: the side it comes from and its height. */
export interface Warning {
  side: 1 | -1;
  y: number;
}

export interface Sky {
  jets: Jet[];
  shots: Flak[];
  /** Seconds until the next jet comes on screen. */
  nextPass: number;
  warning: Warning | null;
}

export type JetEvent =
  | { kind: 'jet-warning'; side: 1 | -1; y: number }
  | { kind: 'jet-in'; jet: number }
  | { kind: 'jet-fired'; jet: number; x: number; y: number }
  | { kind: 'jet-down'; jet: number; x: number; y: number }
  | Extract<EnemyEvent, { kind: 'heli-hit' | 'burst' }>;

/** The screen's left and right edges in the world, and the lowest a pass may fly. */
export interface View {
  left: number;
  right: number;
  /** Lowest centre y: clear of the tallest roof. */
  bottomY: number;
}

export function newSky(raid: Raid | undefined, t: JetTuning): Sky {
  return {
    jets: Array.from({ length: t.maxJets }, () => ({
      alive: false,
      x: 0,
      y: 0,
      facing: 1,
      hp: t.hp,
      shotsLeft: 0,
      fireTimer: 0,
    })),
    shots: Array.from({ length: t.maxShots }, () => ({
      alive: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      age: 0,
    })),
    nextPass: raid ? raid.first : Number.POSITIVE_INFINITY,
    warning: null,
  };
}

/** The box a jet can be hit in (null when not flying). */
export function jetBox(j: Jet, t: JetTuning): Box | null {
  if (!j.alive) return null;
  return {
    left: j.x - t.halfWidth,
    right: j.x + t.halfWidth,
    top: j.y - t.halfHeight,
    bottom: j.y + t.halfHeight,
  };
}

/** Damages a jet; returns the event when that brings it down. */
export function hitJet(s: Sky, i: number, damage: number): JetEvent | null {
  const j = s.jets[i];
  if (!j?.alive) return null;
  j.hp = Math.max(0, j.hp - damage);
  if (j.hp > 0) return null;
  j.alive = false;
  return { kind: 'jet-down', jet: i, x: j.x, y: j.y };
}

/** The height of a pass: near the helicopter's, but never below the rooftops' clearance. */
export function passHeight(heliY: number, v: View, t: JetTuning, rng: Rng): number {
  const y = heliY + rng.range(-t.heightJitter, t.heightJitter);
  return Math.min(v.bottomY, Math.max(t.topY, y));
}

/**
 * Warns of, launches and flies the jets, and moves their shots. Changes `s` in
 * place. The scene applies the damage from `heli-hit` events.
 */
export function updateJets(
  s: Sky,
  h: Heli,
  dt: number,
  arena: Arena,
  view: View,
  raid: Raid | undefined,
  t: JetTuning,
  rng: Rng,
): JetEvent[] {
  const events: JetEvent[] = [];
  for (const shot of s.shots) {
    const e = moveShell(shot, h, dt, arena, t, t.shotLife, t.shotDamage);
    if (e?.kind === 'heli-hit' || e?.kind === 'burst') events.push(e);
  }

  if (raid) {
    s.nextPass -= dt;
    if (!s.warning && s.nextPass <= t.warnSeconds) {
      const side: 1 | -1 = rng.next() < 0.5 ? -1 : 1;
      s.warning = { side, y: passHeight(h.flight.y, view, t, rng) };
      events.push({ kind: 'jet-warning', ...s.warning });
    }
    if (s.warning && s.nextPass <= 0) {
      const i = s.jets.findIndex((j) => !j.alive);
      const j = s.jets[i];
      if (j) {
        const { side, y } = s.warning;
        // Coming from the left edge means flying right.
        Object.assign(j, {
          alive: true,
          facing: side === -1 ? 1 : -1,
          x: side === -1 ? view.left - t.offscreen : view.right + t.offscreen,
          y,
          hp: t.hp,
          shotsLeft: t.burst,
          fireTimer: 0,
        });
        events.push({ kind: 'jet-in', jet: i });
      }
      s.warning = null;
      s.nextPass = raid.every * (1 + rng.range(-t.everyJitter, t.everyJitter));
    }
  }

  const f = h.flight;
  s.jets.forEach((j, i) => {
    if (!j.alive) return;
    j.x += j.facing * t.speed * dt;
    j.fireTimer = Math.max(0, j.fireTimer - dt);
    const ahead = (f.x - j.x) * j.facing;
    const level = Math.abs(f.y - j.y) <= t.fireHeight;
    if (
      targetable(h) &&
      j.shotsLeft > 0 &&
      j.fireTimer <= 0 &&
      ahead > t.noseX &&
      ahead <= t.fireRange &&
      level
    ) {
      const shot = s.shots.find((x) => !x.alive);
      if (shot) {
        const x = j.x + j.facing * t.noseX;
        const y = j.y + t.noseY;
        Object.assign(shot, { alive: true, x, y, vx: j.facing * t.shotSpeed, vy: 0, age: 0 });
        j.shotsLeft--;
        j.fireTimer = t.burstGap;
        events.push({ kind: 'jet-fired', jet: i, x, y });
      }
    }
    // Gone once well past the far edge of the screen.
    const past = j.facing === 1 ? j.x > view.right + t.offscreen : j.x < view.left - t.offscreen;
    if (past) j.alive = false;
  });
  return events;
}
