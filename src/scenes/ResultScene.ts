import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, HUD, RESULT } from '../config/tuning';
import type { MissionResult } from '../logic/score';

/** What the game scene hands the result screen. */
export interface ResultData {
  result: MissionResult;
  highScore: number;
  newHigh: boolean;
  /** Touch devices are told to tap instead of pressing Enter. */
  touch: boolean;
}

/** Read-only view for the e2e test hook. */
export interface ResultSnapshot extends ResultData {
  lines: string[];
}

/**
 * The end of a mission (roadmap M3.2): a panel over the paused game with the
 * people saved, the points, the bonus, the score and the high score. Enter,
 * Space or a tap plays the mission again. The title screen comes in M3.4.
 */
export class ResultScene extends Phaser.Scene {
  private data_!: ResultData;
  private lines: string[] = [];
  private leaving = false;

  constructor() {
    super('Result');
  }

  init(data: ResultData): void {
    this.data_ = data;
    this.leaving = false;
  }

  create(): void {
    const { result: r, highScore, newHigh, touch } = this.data_;
    const R = RESULT;
    this.add
      .rectangle(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        R.panelWidth,
        R.panelHeight,
        R.panelColour,
        R.panelAlpha,
      )
      .setStrokeStyle(2, R.border);

    const perfect = r.lost === 0;
    const rows: [string, string, (string | undefined)?][] = [
      [perfect ? 'PERFECT RESCUE!' : 'MISSION COMPLETE', '', HUD.accent],
      ['', ''],
      ['SAVED', `${r.saved}/${r.total}`],
      ['LOST', `${r.lost}`],
      ['RESCUE', `${r.rescue}`],
      ['BONUS', `${r.bonus}`],
      ['PERFECT', `${r.perfect}`],
      ['SCORE', `${r.score}`, HUD.accent],
      [
        'HIGH SCORE',
        newHigh ? `NEW! ${highScore}` : `${highScore}`,
        newHigh ? HUD.accent : undefined,
      ],
      ['', ''],
      [touch ? 'TAP TO PLAY AGAIN' : 'PRESS ENTER TO PLAY AGAIN', ''],
    ];
    this.lines = [];
    rows.forEach(([label, value, colour], i) => {
      const y = R.top + i * R.row;
      const centred = value === '' && label !== '';
      if (centred) {
        this.text(GAME_WIDTH / 2, y, label, colour).setOrigin(0.5, 0);
      } else if (label !== '') {
        this.text(R.labelX, y, label, colour);
        this.text(R.valueRight, y, value, colour).setOrigin(1, 0);
      }
      const line = value === '' ? label : `${label} ${value}`;
      if (line) this.lines.push(line);
    });

    const again = (): void => this.again();
    this.input.keyboard?.once('keydown-ENTER', again);
    this.input.keyboard?.once('keydown-SPACE', again);
    this.input.once(Phaser.Input.Events.POINTER_DOWN, again);
  }

  snapshot(): ResultSnapshot {
    return { ...this.data_, lines: [...this.lines] };
  }

  private again(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.scene.stop();
    this.scene.start('Game');
  }

  private text(x: number, y: number, s: string, colour?: string): Phaser.GameObjects.Text {
    return this.add
      .text(x, y, s, {
        fontFamily: HUD.font,
        fontSize: `${HUD.fontSize}px`,
        color: colour ?? HUD.colour,
      })
      .setShadow(1, 1, HUD.shadow, 0, false, true);
  }
}
