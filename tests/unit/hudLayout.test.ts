import { describe, expect, it } from 'vitest';
import { GAME_HEIGHT, GAME_WIDTH, HUD, PEOPLE, RESULT } from '../../src/config/tuning';
import { MISSIONS } from '../../src/missions';

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

describe('result panel (M5.1)', () => {
  it('fits on the screen with every row shown', () => {
    // Title, mission, saved, lost, rescue, bonus, perfect, earlier, score, high, gap, action.
    const rows = 13;
    const height = (rows - 1) * RESULT.row + HUD.fontSize + 2 * RESULT.pad;
    expect(height).toBeLessThanOrEqual(GAME_HEIGHT - 2 * HUD.fontSize);
  });

  it('fits every mission name, in the result panel and the banner', () => {
    for (const [i, m] of MISSIONS.entries()) {
      expect(width(`MISSION ${i + 1}: ${m.name}`)).toBeLessThanOrEqual(RESULT.panelWidth - 16);
      expect(m.name).toMatch(/^[A-Z0-9 ]+$/);
    }
    expect(width('EARLIER MISSIONS') + RESULT.labelX).toBeLessThan(
      RESULT.valueRight - width('9999999'),
    );
    expect(width('PRESS ENTER TO PLAY AGAIN')).toBeLessThanOrEqual(RESULT.panelWidth - 16);
  });
});
