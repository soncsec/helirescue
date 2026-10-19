import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, HUD, PAUSE, RESULT } from '../config/tuning';

/** What the game scene hands the pause screen. */
export interface PauseData {
  touch: boolean;
}

/**
 * Pause (roadmap M3.4): a panel over the paused game. P, Esc, Enter, Space
 * or a tap resumes. The game opens it from the P or Esc key, the touch pause
 * button, or when the tab or app loses focus.
 */
export class PauseScene extends Phaser.Scene {
  private leaving = false;
  private touch = false;

  constructor() {
    super('Pause');
  }

  init(data: PauseData): void {
    this.touch = data.touch;
    this.leaving = false;
  }

  create(): void {
    this.add
      .rectangle(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        PAUSE.panelWidth,
        PAUSE.panelHeight,
        RESULT.panelColour,
        RESULT.panelAlpha,
      )
      .setStrokeStyle(2, RESULT.border);
    this.text(GAME_HEIGHT / 2 - 14, 'PAUSED', HUD.accent);
    this.text(GAME_HEIGHT / 2 + 6, this.touch ? 'TAP TO RESUME' : 'PRESS P TO RESUME');

    const resume = (): void => this.resume();
    const kb = this.input.keyboard;
    for (const key of ['P', 'ESC', 'ENTER', 'SPACE']) kb?.once(`keydown-${key}`, resume);
    this.input.once(Phaser.Input.Events.POINTER_DOWN, resume);
  }

  private resume(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.scene.stop();
    this.scene.resume('Game');
  }

  private text(y: number, s: string, colour: string = HUD.colour): void {
    this.add
      .text(GAME_WIDTH / 2, y, s, {
        fontFamily: HUD.font,
        fontSize: `${HUD.fontSize}px`,
        color: colour,
      })
      .setOrigin(0.5, 0)
      .setShadow(1, 1, HUD.shadow, 0, false, true);
  }
}
