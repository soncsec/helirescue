import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, HUD, PAUSE, RESULT } from '../config/tuning';
import { onPress } from './keys';
import { isMuted, play, toggleMute } from './sound';

/** What the game scene hands the pause screen. */
export interface PauseData {
  touch: boolean;
}

/**
 * Pause (roadmap M3.4): a panel over the paused game. P, Esc, Enter, Space
 * or a tap resumes; M or the SOUND button turns sound on or off (M4). The game opens it from the P or Esc key, the touch pause
 * button, or when the tab or app loses focus.
 */
export class PauseScene extends Phaser.Scene {
  private leaving = false;
  private touch = false;
  private soundText: Phaser.GameObjects.Text | null = null;

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
    const top = GAME_HEIGHT / 2 - PAUSE.panelHeight / 2;
    this.text(top + 14, 'PAUSED', HUD.accent);
    this.text(top + 34, this.touch ? 'TAP TO RESUME' : 'PRESS P TO RESUME');
    // Sound on or off (M4): M on a keyboard, a SOUND button on touch.
    const by = top + PAUSE.panelHeight - 20;
    if (this.touch) {
      this.add
        .rectangle(GAME_WIDTH / 2, by, PAUSE.buttonWidth, PAUSE.buttonHeight, RESULT.panelColour, 1)
        .setStrokeStyle(2, RESULT.border);
    }
    this.soundText = this.text(by - 4, this.soundLabel());

    const resume = (): void => this.resume();
    const kb = this.input.keyboard;
    for (const key of ['P', 'ESC', 'ENTER', 'SPACE']) kb?.once(`keydown-${key}`, resume);
    onPress(kb, ['M'], () => this.toggleSound());
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => {
      const onSound =
        this.touch &&
        Math.abs(p.x - GAME_WIDTH / 2) <= PAUSE.buttonWidth / 2 &&
        Math.abs(p.y - by) <= PAUSE.buttonHeight / 2;
      if (onSound) this.toggleSound();
      else resume();
    });
  }

  private soundLabel(): string {
    const state = isMuted() ? 'OFF' : 'ON';
    return this.touch ? `SOUND: ${state}` : `M  SOUND: ${state}`;
  }

  private toggleSound(): void {
    toggleMute(this);
    this.soundText?.setText(this.soundLabel());
    play(this, 'sfx-select');
  }

  private resume(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.scene.stop();
    this.scene.resume('Game');
  }

  private text(y: number, s: string, colour: string = HUD.colour): Phaser.GameObjects.Text {
    return this.add
      .text(GAME_WIDTH / 2, y, s, {
        fontFamily: HUD.font,
        fontSize: `${HUD.fontSize}px`,
        color: colour,
      })
      .setOrigin(0.5, 0)
      .setShadow(1, 1, HUD.shadow, 0, false, true);
  }
}
