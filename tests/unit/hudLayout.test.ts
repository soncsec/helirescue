import { describe, expect, it } from 'vitest';
import { GAME_WIDTH, HUD, PEOPLE } from '../../src/config/tuning';

/** Press Start 2P is a fixed-width font: 8 px per character at the HUD size. */
const width = (s: string): number => s.length * HUD.fontSize;

describe('HUD text row', () => {
  it('keeps SAVED, ABOARD and SCORE apart at their widest', () => {
    const saved = HUD.savedX + width('SAVED 99/99');
    const aboard = HUD.aboardX + width(`ABOARD ${PEOPLE.capacity}/${PEOPLE.capacity}`);
    expect(HUD.savedX).toBeGreaterThan(HUD.bar.x + HUD.bar.width);
    expect(saved).toBeLessThan(HUD.aboardX);
    expect(aboard).toBeLessThan(HUD.scoreRight - width('SCORE 9999999'));
    expect(HUD.scoreRight).toBeLessThanOrEqual(GAME_WIDTH);
  });
});
