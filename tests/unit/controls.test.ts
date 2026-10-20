import { describe, expect, it } from 'vitest';
import { KEY_CONTROLS, START_HINT, TOUCH_CONTROLS } from '../../src/config/controls';
import { GAME_HEIGHT, GAME_WIDTH, HUD, MISSION_BANNER, PAUSE } from '../../src/config/tuning';

/** Press Start 2P is a fixed-width font: 8 px per character at the HUD size. */
const width = (s: string): number => s.length * HUD.fontSize;

describe('controls list (owner, 2026-10-20)', () => {
  it('names the bomb on keyboards and touch screens', () => {
    expect(KEY_CONTROLS).toContainEqual(['X', 'DROP A BOMB']);
    expect(TOUCH_CONTROLS).toContainEqual(['BOMB', 'DROP A BOMB']);
    expect(START_HINT.keys).toContain('X: DROP A BOMB');
    expect(START_HINT.touch).toContain('BOMB: DROP A BOMB');
  });

  it('fits the pause panel: keys clear of actions, actions inside the panel', () => {
    const left = GAME_WIDTH / 2 - PAUSE.panelWidth / 2;
    const right = GAME_WIDTH / 2 + PAUSE.panelWidth / 2;
    for (const [key, action] of [...KEY_CONTROLS, ...TOUCH_CONTROLS]) {
      expect(PAUSE.keyX).toBeGreaterThan(left);
      expect(PAUSE.keyX + width(key)).toBeLessThan(PAUSE.actionX);
      expect(PAUSE.actionX + width(action)).toBeLessThanOrEqual(right - 2);
    }
  });

  it('stacks the pause rows top to bottom inside the panel, on the screen', () => {
    const rows = Math.max(KEY_CONTROLS.length, TOUCH_CONTROLS.length);
    const lastControl = PAUSE.controlsY + (rows - 1) * PAUSE.row + HUD.fontSize;
    expect(PAUSE.titleY + HUD.fontSize).toBeLessThan(PAUSE.controlsY);
    expect(lastControl).toBeLessThan(PAUSE.resumeY);
    // The SOUND line sits 24 px above the bottom; the touch button around it is 18 tall.
    expect(PAUSE.resumeY + HUD.fontSize).toBeLessThan(
      PAUSE.panelHeight - 20 - PAUSE.buttonHeight / 2,
    );
    expect(PAUSE.panelHeight).toBeLessThanOrEqual(GAME_HEIGHT - 2 * HUD.fontSize);
  });

  it('fits the mission 1 hint on the screen, below the banner', () => {
    for (const hint of Object.values(START_HINT)) {
      expect(width(hint)).toBeLessThanOrEqual(GAME_WIDTH - 32);
    }
    expect(MISSION_BANNER.hintGap).toBeGreaterThan(MISSION_BANNER.nameGap + HUD.fontSize);
    // It stays up longer than the banner, so it is not missed.
    expect(MISSION_BANNER.hintSeconds).toBeGreaterThan(MISSION_BANNER.holdSeconds);
  });
});
