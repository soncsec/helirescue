import Phaser from 'phaser';
import { CREDITS } from '../config/credits';
import { CREDITS_SCREEN, GAME_HEIGHT, GAME_WIDTH, HUD, RESULT } from '../config/tuning';
import { wantsTouch } from '../logic/device';

/** Read-only view for the e2e test hook. */
export interface CreditsSnapshot {
  lines: string[];
}

/**
 * The credits (owner, 2026-10-19), opened from the title screen: every art
 * source with its licence, in full for the CC-BY gun. Esc, Enter, Space, K or
 * a tap goes back to the title.
 */
export class CreditsScene extends Phaser.Scene {
  private lines: string[] = [];
  private leaving = false;

  constructor() {
    super('Credits');
  }

  create(): void {
    this.leaving = false;
    this.lines = [];
    const C = CREDITS_SCREEN;
    this.cameras.main.setBackgroundColor(RESULT.panelColour);
    let y = C.top;
    this.text(GAME_WIDTH / 2, y, 'CREDITS', HUD.accent, 0.5);
    y += C.row + C.gap;
    for (const section of CREDITS) {
      this.text(C.left, y, section.heading, HUD.accent);
      y += C.row;
      for (const line of section.lines) {
        this.text(C.left, y, line);
        y += C.row;
      }
      y += C.gap;
    }
    const touch = wantsTouch(window.location.search, (q) => window.matchMedia(q).matches);
    this.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT - C.bottom,
      touch ? 'TAP TO GO BACK' : 'PRESS ESC TO GO BACK',
      HUD.colour,
      0.5,
    );

    const back = (): void => this.back();
    for (const key of ['ESC', 'ENTER', 'SPACE', 'K'])
      this.input.keyboard?.once(`keydown-${key}`, back);
    this.input.once(Phaser.Input.Events.POINTER_DOWN, back);
  }

  snapshot(): CreditsSnapshot {
    return { lines: [...this.lines] };
  }

  private back(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.scene.start('Title');
  }

  private text(x: number, y: number, s: string, colour: string = HUD.colour, originX = 0): void {
    this.lines.push(s.trim());
    this.add
      .text(x, y, s, { fontFamily: HUD.font, fontSize: `${HUD.fontSize}px`, color: colour })
      .setOrigin(originX, 0)
      .setShadow(1, 1, HUD.shadow, 0, false, true);
  }
}
