import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, HUD, RESULT } from '../config/tuning';
import type { MissionResult } from '../logic/score';
import { play } from './sound';

/** What the game scene hands the result screen. */
export interface ResultData {
  /** Everyone saved or lost, or no helicopters left. */
  kind: 'complete' | 'gameover';
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
 * The end of a mission (roadmap M3.2, M3.3): a panel over the paused game
 * with the people saved, the points, the bonus, the score and the high score;
 * or GAME OVER when no helicopters are left. Enter, Space or a tap plays the
 * mission again (Retry). The title screen comes in M3.4.
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
    const { kind, result: r, highScore, newHigh, touch } = this.data_;
    play(this, kind === 'gameover' ? 'sfx-game-over' : 'sfx-complete');
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

    const over = kind === 'gameover';
    const title = over ? 'GAME OVER' : r.lost === 0 ? 'PERFECT RESCUE!' : 'MISSION COMPLETE';
    const action = over ? 'RETRY' : 'PLAY AGAIN';
    const high = newHigh ? `NEW! ${highScore}` : `${highScore}`;
    type Row = [string, string, (string | undefined)?];
    const middle: Row[] = over
      ? [
          ['NO HELICOPTERS LEFT', ''],
          ['', ''],
        ]
      : [
          ['BONUS', `${r.bonus}`],
          ['PERFECT', `${r.perfect}`],
        ];
    const rows: Row[] = [
      [title, '', over ? RESULT.danger : HUD.accent],
      ['', ''],
      ['SAVED', `${r.saved}/${r.total}`],
      ['LOST', `${r.lost}`],
      ['RESCUE', `${r.rescue}`],
      ...middle,
      ['SCORE', `${r.score}`, HUD.accent],
      ['HIGH SCORE', high, newHigh ? HUD.accent : undefined],
      ['', ''],
      [touch ? `TAP TO ${action}` : `PRESS ENTER TO ${action}`, ''],
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
    play(this, 'sfx-select');
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
