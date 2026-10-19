import Phaser from 'phaser';
import { sheetSpec } from '../config/assets';
import { GAME_WIDTH, HUD, RESULT, SCENERY, TITLE } from '../config/tuning';
import { wantsTouch } from '../logic/device';
import { addBackdrop, loadArt, makeAnims } from './scenery';
import { loadSave } from './storage';
import { applySavedMute, isMuted, loadSounds, play, startMusic, toggleMute } from './sound';

/** Read-only view for the e2e test hook. */
export interface TitleSnapshot {
  lines: string[];
  touch: boolean;
  highScore: number;
}

const SIDE = sheetSpec('heli-side');

/**
 * Title screen (roadmap M3.4): the name, what to do, the controls for this
 * device and the high score. Enter, Space or a tap starts mission 1; K or the
 * CREDITS button opens the credits (CreditsScene).
 */
export class TitleScene extends Phaser.Scene {
  private lines: string[] = [];
  private touch = false;
  private highScore = 0;
  private leaving = false;
  private soundText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('Title');
  }

  preload(): void {
    loadArt(this);
    loadSounds(this);
  }

  create(): void {
    this.leaving = false;
    this.soundText = null;
    this.lines = [];
    this.touch = wantsTouch(window.location.search, (q) => window.matchMedia(q).matches);
    this.highScore = loadSave().highScore;
    applySavedMute(this);
    // Starts now, or at the first key press or tap if the browser is still locking sound.
    startMusic(this);
    makeAnims(this);
    addBackdrop(this, 'night');
    this.add.rectangle(0, SCENERY.groundY, GAME_WIDTH, 16, 0x0b0814).setOrigin(0, 0);
    this.add
      .sprite(GAME_WIDTH - 70, TITLE.nameY + 24, SIDE.key)
      .play(SIDE.key)
      .setFlipX(true)
      .setAngle(-6);

    this.add
      .rectangle(
        GAME_WIDTH / 2,
        TITLE.panelTop,
        TITLE.panelWidth,
        TITLE.panelBottom - TITLE.panelTop,
        RESULT.panelColour,
        TITLE.panelAlpha,
      )
      .setOrigin(0.5, 0)
      .setStrokeStyle(2, RESULT.border);
    this.text(GAME_WIDTH / 2, TITLE.nameY, 'HELIRESCUE', HUD.accent, TITLE.nameSize);
    this.text(GAME_WIDTH / 2, TITLE.taglineY, 'LAND ON THE ROOFTOPS.');
    this.text(GAME_WIDTH / 2, TITLE.taglineY + TITLE.row, 'BRING EVERYONE HOME.');

    const controls: [string, string][] = this.touch
      ? [
          ['D-PAD', 'FLY'],
          ['FIRE', 'SHOOT (HOLD)'],
          ['BOMB', 'DROP A BOMB'],
          ['TURN', 'TURN AROUND'],
          ['II', 'PAUSE'],
        ]
      : [
          ['ARROWS / WASD', 'FLY'],
          ['Z / SPACE', 'SHOOT (HOLD)'],
          ['X', 'DROP A BOMB'],
          ['C', 'TURN AROUND'],
          ['P / ESC', 'PAUSE'],
          ['M', this.soundLabel()],
        ];
    controls.forEach(([key, action], i) => {
      const y = TITLE.controlsY + i * TITLE.row;
      this.text(TITLE.keyX, y, key, HUD.colour, HUD.fontSize, 0);
      const t = this.text(TITLE.actionX, y, action, HUD.colour, HUD.fontSize, 0);
      if (key === 'M') this.soundText = t;
      this.lines.push(`${key} ${action}`);
    });

    this.text(GAME_WIDTH / 2, TITLE.highY, `HIGH SCORE ${this.highScore}`, HUD.accent);
    const start = this.text(
      GAME_WIDTH / 2,
      TITLE.startY,
      this.touch ? 'TAP TO START' : 'PRESS ENTER TO START',
    );
    this.tweens.add({
      targets: start,
      alpha: 0.2,
      duration: TITLE.blinkMs,
      yoyo: true,
      repeat: -1,
    });
    // Credits (owner, 2026-10-19): K on a keyboard (C turns the helicopter), a CREDITS button on
    // touch. Sound (M4): M on a keyboard, a SOUND button on touch.
    const bw = TITLE.creditButtonWidth;
    const bh = TITLE.creditButtonHeight;
    const creditX = this.touch ? GAME_WIDTH / 2 - TITLE.buttonSpread : GAME_WIDTH / 2;
    const soundX = GAME_WIDTH / 2 + TITLE.buttonSpread;
    if (this.touch) {
      for (const x of [creditX, soundX]) {
        this.add
          .rectangle(x, TITLE.creditY, bw, bh, RESULT.panelColour, TITLE.panelAlpha)
          .setStrokeStyle(2, RESULT.border);
      }
      this.text(creditX, TITLE.creditY, 'CREDITS', HUD.colour, HUD.fontSize, 0.5, 0.5);
      this.soundText = this.text(
        soundX,
        TITLE.creditY,
        this.soundLabel(),
        HUD.colour,
        HUD.fontSize,
        0.5,
        0.5,
      );
    } else {
      this.text(
        GAME_WIDTH / 2,
        TITLE.creditY,
        'PRESS K FOR CREDITS',
        HUD.colour,
        HUD.fontSize,
        0.5,
        0.5,
      );
    }

    const go = (): void => this.start();
    const credits = (): void => this.credits();
    this.input.keyboard?.once('keydown-ENTER', go);
    this.input.keyboard?.once('keydown-SPACE', go);
    this.input.keyboard?.once('keydown-K', credits);
    this.input.keyboard?.on('keydown-M', () => this.toggleSound());
    const on = (p: Phaser.Input.Pointer, x: number): boolean =>
      this.touch && Math.abs(p.x - x) <= bw / 2 && Math.abs(p.y - TITLE.creditY) <= bh / 2;
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => {
      if (on(p, soundX)) this.toggleSound();
      else if (on(p, creditX)) credits();
      else go();
    });
  }

  snapshot(): TitleSnapshot {
    return { lines: [...this.lines], touch: this.touch, highScore: this.highScore };
  }

  private start(): void {
    if (this.leaving) return;
    this.leaving = true;
    play(this, 'sfx-select');
    this.scene.start('Game');
  }

  private soundLabel(): string {
    return isMuted() ? 'SOUND: OFF' : 'SOUND: ON';
  }

  /** M or the SOUND button: turns sound on or off (saved) and updates the label. */
  private toggleSound(): void {
    toggleMute(this);
    const label = this.soundLabel();
    this.soundText?.setText(label);
    this.lines = this.lines.map((l) =>
      l.startsWith('SOUND:') ? label : l.startsWith('M SOUND:') ? `M ${label}` : l,
    );
    play(this, 'sfx-select');
  }

  private credits(): void {
    if (this.leaving) return;
    this.leaving = true;
    play(this, 'sfx-select');
    this.scene.start('Credits');
  }

  /** Adds centred (originX 0.5) or left-aligned (0) text and records it for the test hook. */
  private text(
    x: number,
    y: number,
    s: string,
    colour: string = HUD.colour,
    size: number = HUD.fontSize,
    originX = 0.5,
    originY = 0,
  ): Phaser.GameObjects.Text {
    if (originX !== 0) this.lines.push(s);
    return this.add
      .text(x, y, s, { fontFamily: HUD.font, fontSize: `${size}px`, color: colour })
      .setOrigin(originX, originY)
      .setShadow(1, 1, HUD.shadow, 0, false, true);
  }
}
