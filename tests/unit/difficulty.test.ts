import { describe, expect, it } from 'vitest';
import { DIFFICULTY, ENEMIES, SOLDIERS, TANKS } from '../../src/config/tuning';
import { DIFFICULTY_LIMITS, difficulty } from '../../src/logic/difficulty';

const base = { enemies: ENEMIES, soldiers: SOLDIERS, tanks: TANKS };
const at = (
  m: number,
): ReturnType<typeof difficulty<typeof ENEMIES, typeof SOLDIERS, typeof TANKS>> =>
  difficulty(m, base, DIFFICULTY);
const missions = Array.from({ length: DIFFICULTY.lastMission }, (_, i) => i + 1);
const avgReload = (r: { aaReloadMin: number; aaReloadMax: number }): number =>
  (r.aaReloadMin + r.aaReloadMax) / 2;

describe('difficulty', () => {
  it('keeps mission 1 exactly as play-tested', () => {
    expect(at(1)).toEqual(base);
  });

  it('stays within the limits (H4)', () => {
    expect(DIFFICULTY.fireRateAtLast).toBeLessThanOrEqual(DIFFICULTY_LIMITS.fireRateAtLast);
    expect(DIFFICULTY.shotSpeedAtLast).toBeLessThanOrEqual(DIFFICULTY_LIMITS.shotSpeedAtLast);
    expect(DIFFICULTY.rangeAtLast).toBeLessThanOrEqual(DIFFICULTY_LIMITS.rangeAtLast);
    for (const m of missions) {
      const { enemies: e, soldiers: s, tanks: k } = at(m);
      expect(TANKS.reloadMin / k.reloadMin).toBeLessThanOrEqual(2 + 1e-9);
      expect(k.shellSpeed / TANKS.shellSpeed).toBeLessThanOrEqual(1.3 + 1e-9);
      expect(k.range / TANKS.range).toBeLessThanOrEqual(1.2 + 1e-9);
      expect(ENEMIES.aaReloadMin / e.aaReloadMin).toBeLessThanOrEqual(2 + 1e-9);
      expect(SOLDIERS.reloadMin / s.reloadMin).toBeLessThanOrEqual(2 + 1e-9);
      expect(e.flakSpeed / ENEMIES.flakSpeed).toBeLessThanOrEqual(1.3 + 1e-9);
      expect(s.shotSpeed / SOLDIERS.shotSpeed).toBeLessThanOrEqual(1.3 + 1e-9);
      expect(e.aaRange / ENEMIES.aaRange).toBeLessThanOrEqual(1.2 + 1e-9);
      expect(s.range / SOLDIERS.range).toBeLessThanOrEqual(1.2 + 1e-9);
    }
  });

  it('reaches the curve at the last mission', () => {
    const last = at(DIFFICULTY.lastMission);
    expect(avgReload(ENEMIES) / avgReload(last.enemies)).toBeCloseTo(DIFFICULTY.fireRateAtLast);
    expect(last.soldiers.shotSpeed).toBeCloseTo(SOLDIERS.shotSpeed * DIFFICULTY.shotSpeedAtLast);
    expect(last.enemies.aaRange).toBeCloseTo(ENEMIES.aaRange * DIFFICULTY.rangeAtLast);
  });

  it('gets harder every mission, by the same fire-rate step each time', () => {
    const steps = missions
      .slice(1)
      .map((m) => avgReload(at(m - 1).enemies) / avgReload(at(m).enemies));
    for (const step of steps) {
      expect(step).toBeGreaterThan(1);
      expect(step).toBeCloseTo(steps[0] ?? 0);
    }
    for (const m of missions.slice(1)) {
      expect(at(m).soldiers.range).toBeGreaterThan(at(m - 1).soldiers.range);
      expect(at(m).enemies.flakSpeed).toBeGreaterThan(at(m - 1).enemies.flakSpeed);
      expect(at(m).tanks.reloadMax).toBeLessThan(at(m - 1).tanks.reloadMax);
    }
  });

  it('never changes damage, hit points, the first-shot grace period or sizes', () => {
    for (const m of missions) {
      const { enemies: e, soldiers: s, tanks: k } = at(m);
      expect(k).toMatchObject({
        shellDamage: TANKS.shellDamage,
        hp: TANKS.hp,
        firstShot: TANKS.firstShot,
        speed: TANKS.speed,
        maxElevation: TANKS.maxElevation,
        halfWidth: TANKS.halfWidth,
      });
      expect(e).toMatchObject({
        flakDamage: ENEMIES.flakDamage,
        aaHp: ENEMIES.aaHp,
        firstShot: ENEMIES.firstShot,
        flakLife: ENEMIES.flakLife,
        maxFlak: ENEMIES.maxFlak,
        heliHalfWidth: ENEMIES.heliHalfWidth,
      });
      expect(s).toMatchObject({
        firstShot: SOLDIERS.firstShot,
        shotLife: SOLDIERS.shotLife,
        maxShots: SOLDIERS.maxShots,
        halfWidth: SOLDIERS.halfWidth,
        walkSpeed: SOLDIERS.walkSpeed,
      });
    }
  });

  it('keeps the reload range in order', () => {
    for (const m of missions) {
      const { enemies: e, soldiers: s, tanks: k } = at(m);
      expect(k.reloadMin).toBeLessThan(k.reloadMax);
      expect(e.aaReloadMin).toBeLessThan(e.aaReloadMax);
      expect(s.reloadMin).toBeLessThan(s.reloadMax);
    }
  });

  it('rejects missions outside 1 to the last', () => {
    for (const m of [0, 6, 1.5, Number.NaN]) {
      expect(() => difficulty(m, base, DIFFICULTY)).toThrow(RangeError);
    }
  });

  it('treats a one-mission curve as mission 1', () => {
    expect(difficulty(1, base, { ...DIFFICULTY, lastMission: 1 })).toEqual(base);
  });
});
