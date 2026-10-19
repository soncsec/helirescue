import Phaser from 'phaser';
import { CC_BY_CREDIT } from '../config/credits';
import { sheetSpec } from '../config/assets';
import { GAME_WIDTH, HUD, RESULT, SCENERY, TITLE } from '../config/tuning';
import { wantsTouch } from '../logic/device';
import { addBackdrop, loadArt, makeAnims } from './scenery';
import { loadSave } from './storage';

/** Read-only view for the e2e test hook. */
export interface TitleSnapshot {
  lines: string[];
  touch: boolean;
  highScore: number;
}

const SIDE = sheetSpec('heli-side');

/**
 * Title screen (roadmap M3.4): the name, what to do, the controls for this
 * device, the high score and the CC-BY art credit. Enter, Space or a tap
 * starts mission 1.
 */
export class TitleScene extends Phaser.Scene {
  private lines: string[] = [];
  private touch = false;
  private highScore = 0;
  private leaving = false;

  constructor() {
    super('Title');
  }

  preload(): void {
    loadArt(this);
  }

  create(): void {
    this.leaving = false;
    this.lines = [];
    this.touch = wantsTouch(window.location.search, (q) => window.matchMedia(q).matches);
    this.highScore = loadSave().highScore;
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
        ];
    controls.forEach(([key, action], i) => {
      const y = TITLE.controlsY + i * TITLE.row;
      this.text(TITLE.keyX, y, key, HUD.colour, HUD.fontSize, 0);
      this.text(TITLE.actionX, y, action, HUD.colour, HUD.fontSize, 0);
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
    this.text(GAME_WIDTH / 2, TITLE.creditY, CC_BY_CREDIT, HUD.colour, HUD.fontSize, 0.5, 1);

    const go = (): void => this.start();
    this.input.keyboard?.once('keydown-ENTER', go);
    this.input.keyboard?.once('keydown-SPACE', go);
    this.input.once(Phaser.Input.Events.POINTER_DOWN, go);
  }

  snapshot(): TitleSnapshot {
    return { lines: [...this.lines], touch: this.touch, highScore: this.highScore };
  }

  private start(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.scene.start('Game');
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
