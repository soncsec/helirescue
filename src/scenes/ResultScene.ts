import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, HUD, RESULT } from '../config/tuning';
import type { MissionStart } from '../logic/progress';
import type { MissionResult } from '../logic/score';
import { play } from './sound';

/** What the game scene hands the result screen. */
export interface ResultData {
  /** Everyone saved or lost, or no helicopters left. */
  kind: 'complete' | 'gameover';
  /** This mission's points. */
  result: MissionResult;
  /** The mission (from 1) and its name. */
  mission: number;
  name: string;
  /** Score brought in from earlier missions, and the running total with this mission. */
  startScore: number;
  total: number;
  /** True when a win leads on to another mission. */
  next: boolean;
  /** The mission the button starts: the next one, or this one again (Retry). */
  then: MissionStart;
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
 * or GAME OVER when no helicopters are left. Enter, Space or a tap goes on
 * to the next mission (M5.1), or after a game over plays the mission again
 * with the score it was entered with (Retry).
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
    const { kind, result: r, highScore, newHigh, touch, mission, name } = this.data_;
    const { startScore, total, next } = this.data_;
    play(this, kind === 'gameover' ? 'sfx-game-over' : 'sfx-complete');
    const R = RESULT;

    const over = kind === 'gameover';
    const title = over ? 'GAME OVER' : r.lost === 0 ? 'PERFECT RESCUE!' : 'MISSION COMPLETE';
    const action = over ? 'RETRY' : next ? 'CONTINUE' : 'PLAY AGAIN';
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
    // Score from earlier missions, once there is some (M5.1).
    const earlier: Row[] = startScore > 0 ? [['EARLIER MISSIONS', `${startScore}`]] : [];
    const rows: Row[] = [
      [title, '', over ? RESULT.danger : HUD.accent],
      [`MISSION ${mission}: ${name}`, ''],
      ['SAVED', `${r.saved}/${r.total}`],
      ['LOST', `${r.lost}`],
      ['RESCUE', `${r.rescue}`],
      ...middle,
      ...earlier,
      ['SCORE', `${total}`, HUD.accent],
      ['HIGH SCORE', high, newHigh ? HUD.accent : undefined],
      ['', ''],
      [touch ? `TAP TO ${action}` : `PRESS ENTER TO ${action}`, ''],
    ];
    // The panel fits its rows, centred on the screen, with even space above and below.
    const textHeight = (rows.length - 1) * R.row + HUD.fontSize;
    const top = Math.round((GAME_HEIGHT - textHeight) / 2);
    this.add
      .rectangle(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        R.panelWidth,
        textHeight + 2 * R.pad,
        R.panelColour,
        R.panelAlpha,
      )
      .setStrokeStyle(2, R.border);
    this.lines = [];
    rows.forEach(([label, value, colour], i) => {
      const y = top + i * R.row;
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
    this.scene.start('Game', this.data_.then);
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
