/**
 * Boarding and unloading rules (H3): people wait on roofs, run to the
 * helicopter when it lands on their roof, ride along, and walk into the base
 * hut when it lands at base. Plain TypeScript, unit tested.
 */
import type { Blocker, Heli } from './landing';
import type { Roof } from './world';

/**
 * waiting: on a roof. running: to the landed helicopter. boarding: climbing in.
 * aboard: riding. unloading: getting out at base (hidden until `timer` reaches 0,
 * then walking to the hut). saved: inside the hut. lost: aboard a crashed helicopter.
 */
export type PersonMode =
  'waiting' | 'running' | 'boarding' | 'aboard' | 'unloading' | 'saved' | 'lost';

export interface Person {
  id: number;
  mode: PersonMode;
  /** Feet position. */
  x: number;
  y: number;
  /** The roof they stand on (waiting, running, boarding, unloading), else null. */
  roof: Roof | null;
  facing: 1 | -1;
  /** Seconds in the current step (boarding, or the unloading queue). */
  timer: number;
}

export interface PeopleTuning {
  /** Running to the helicopter, px/s. */
  runSpeed: number;
  /** Walking from the helicopter to the hut, px/s. */
  walkSpeed: number;
  /** Close enough to the door to climb in, px. */
  boardReach: number;
  boardSeconds: number;
  /** Most people aboard at once (scope: 8-12). */
  capacity: number;
  /** Seconds between people getting out at base. */
  unloadGap: number;
  /** Size as a landing blocker. */
  height: number;
  halfWidth: number;
}

export type PeopleEvent =
  { kind: 'boarded'; id: number } | { kind: 'saved'; id: number } | { kind: 'lost'; id: number };

/** A person waiting on `roof` at x. */
export function waitingOn(id: number, x: number, roof: Roof): Person {
  return { id, mode: 'waiting', x, y: roof.y, roof, facing: 1, timer: 0 };
}

export function sameRoof(a: Roof | null, b: Roof | null): boolean {
  return !!a && !!b && a.left === b.left && a.right === b.right && a.y === b.y;
}

/** People out in the open, where soldiers shoot at them: running to the helicopter or climbing in. */
export function exposed(p: Person): boolean {
  return p.mode === 'running' || p.mode === 'boarding';
}

/**
 * A person hit by a soldier: lost (they fall over and vanish; no blood).
 * Only exposed people can be hit; anyone else is left as they are.
 */
export function shootPerson(
  people: readonly Person[],
  id: number,
): { people: Person[]; event: PeopleEvent | null } {
  let event: PeopleEvent | null = null;
  const next = people.map((p) => {
    if (p.id !== id || !exposed(p)) return p;
    event = { kind: 'lost', id };
    return { ...p, mode: 'lost' as const, roof: null };
  });
  return { people: next, event };
}

/** People inside the helicopter, including those queued to get out. */
export function inHeli(p: Person): boolean {
  return p.mode === 'boarding' || p.mode === 'aboard' || (p.mode === 'unloading' && p.timer < 0);
}

/** True when the person should be drawn. */
export function visible(p: Person): boolean {
  return (
    p.mode === 'waiting' ||
    p.mode === 'running' ||
    p.mode === 'boarding' ||
    (p.mode === 'unloading' && p.timer >= 0)
  );
}

/** People standing on roofs, as things the helicopter may not land on. */
export function blockers(people: readonly Person[], t: PeopleTuning): Blocker[] {
  return people
    .filter((p) => p.roof && (p.mode === 'waiting' || p.mode === 'running'))
    .map((p) => ({ x: p.x, halfWidth: t.halfWidth, top: p.y - t.height }));
}

function moveToward(x: number, target: number, step: number): number {
  return x < target ? Math.min(target, x + step) : Math.max(target, x - step);
}

/** Advances everyone by `dt` seconds, given the helicopter's state after this frame. */
export function updatePeople(
  people: readonly Person[],
  heli: Heli,
  dt: number,
  hutDoorX: number,
  t: PeopleTuning,
): { people: Person[]; events: PeopleEvent[] } {
  const events: PeopleEvent[] = [];
  const landedOn = heli.mode === 'landed' ? heli.on : null;
  const atBase = !!landedOn?.base;
  const door = heli.flight.x;
  // Seats taken: people inside plus people already running to the door.
  let seats = people.filter((p) => inHeli(p) || p.mode === 'running').length;
  // Queue order for getting out at base.
  let queue = people.filter((p) => p.mode === 'unloading' && p.timer < 0).length;

  const next = people.map((p): Person => {
    switch (p.mode) {
      case 'waiting':
      case 'running': {
        if (!sameRoof(landedOn, p.roof) || atBase) {
          if (p.mode === 'running') seats--;
          return { ...p, mode: 'waiting' };
        }
        if (p.mode === 'waiting') {
          if (seats >= t.capacity) return p; // full: keep waiting
          seats++;
        }
        const x = moveToward(p.x, door, t.runSpeed * dt);
        const facing: 1 | -1 = door === p.x ? p.facing : door > p.x ? 1 : -1;
        if (Math.abs(door - x) <= t.boardReach) {
          return { ...p, mode: 'boarding', x, facing, timer: 0 };
        }
        return { ...p, mode: 'running', x, facing };
      }
      case 'boarding': {
        if (!sameRoof(landedOn, p.roof)) {
          seats--;
          return { ...p, mode: 'waiting', timer: 0 };
        }
        const timer = p.timer + dt;
        if (timer < t.boardSeconds) return { ...p, timer };
        events.push({ kind: 'boarded', id: p.id });
        return { ...p, mode: 'aboard', roof: null, timer: 0 };
      }
      case 'aboard': {
        if (heli.mode === 'crashed') {
          events.push({ kind: 'lost', id: p.id });
          return { ...p, mode: 'lost' };
        }
        if (atBase && landedOn) {
          // Line up to get out, one every unloadGap seconds.
          const timer = -queue * t.unloadGap;
          queue++;
          return { ...p, mode: 'unloading', roof: landedOn, x: door, y: landedOn.y, timer };
        }
        return { ...p, x: heli.flight.x, y: heli.flight.y };
      }
      case 'unloading': {
        if (p.timer < 0) {
          if (heli.mode === 'crashed') {
            events.push({ kind: 'lost', id: p.id });
            return { ...p, mode: 'lost' };
          }
          if (!atBase) return { ...p, mode: 'aboard', roof: null, timer: 0 };
          return { ...p, x: door, timer: p.timer + dt };
        }
        const x = moveToward(p.x, hutDoorX, t.walkSpeed * dt);
        if (x === hutDoorX) {
          events.push({ kind: 'saved', id: p.id });
          return { ...p, mode: 'saved', x, roof: null };
        }
        return { ...p, x, facing: hutDoorX > p.x ? 1 : -1, timer: p.timer + dt };
      }
      case 'saved':
      case 'lost':
        return p;
    }
  });
  return { people: next, events };
}

/** Counts of people by what matters to the player. */
export function tally(people: readonly Person[]): {
  total: number;
  saved: number;
  lost: number;
  aboard: number;
} {
  return {
    total: people.length,
    saved: people.filter((p) => p.mode === 'saved').length,
    lost: people.filter((p) => p.mode === 'lost').length,
    aboard: people.filter(inHeli).length,
  };
}
