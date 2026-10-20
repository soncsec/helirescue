import Phaser from 'phaser';
import { CREDITS } from '../config/credits';
import { GAME_HEIGHT, GAME_WIDTH, HUD, VICTORY } from '../config/tuning';
import { MISSIONS } from '../missions';
import { addBackdrop, scrollBackdrop, type ParallaxLayer } from './scenery';
import { play } from './sound';

/** What the result screen hands the victory screen. */
export interface VictoryData {
  score: number;
  highScore: number;
  newHigh: boolean;
  touch: boolean;
}

/** Read-only view for the e2e test hook. */
export interface VictorySnapshot extends VictoryData {
  lines: string[];
  /** How far the text has scrolled up, px, and whether the credits have finished rolling. */
  scrolled: number;
  done: boolean;
}

/**
 * The end of the game (roadmap M5.5): after the last mission, MISSION
 * ACCOMPLISHED with the final score, then the credits scrolling up over the
 * city (owner, 2026-10-19), in full for the CC-BY art. Enter, Space, Esc or a
 * tap goes back to the title at any time.
 */
export class VictoryScene extends Phaser.Scene {
  private data_!: VictoryData;
  private lines: string[] = [];
  private roll!: Phaser.GameObjects.Container;
  private height_ = 0;
  private elapsed = 0;
  private scrolled = 0;
  private done = false;
  private leaving = false;
  private layers: ParallaxLayer[] = [];
  private prompt: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('Victory');
  }

  init(data: VictoryData): void {
    this.data_ = data;
    this.lines = [];
    this.elapsed = 0;
    this.scrolled = 0;
    this.done = false;
    this.leaving = false;
    this.prompt = null;
  }

  create(): void {
    const V = VICTORY;
    play(this, 'sfx-complete');
    this.layers = addBackdrop(this, 'night');
    this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b0814, V.shadeAlpha)
      .setOrigin(0, 0)
      .setScrollFactor(0);

    const { score, highScore, newHigh, touch } = this.data_;
    this.roll = this.add.container(0, V.top);
    let y = 0;
    const line = (s: string, colour: string = HUD.colour, size: number = HUD.fontSize): void => {
      if (s !== '') {
        this.lines.push(s.trim());
        this.roll.add(
          this.add
            .text(GAME_WIDTH / 2, y, s.trim(), {
              fontFamily: HUD.font,
              fontSize: `${size}px`,
              color: colour,
            })
            .setOrigin(0.5, 0)
            .setShadow(1, 1, HUD.shadow, 0, false, true),
        );
      }
      y += size === HUD.fontSize ? V.row : size + V.row / 2;
    };
    line('MISSION ACCOMPLISHED', HUD.accent, V.titleSize);
    line(`ALL ${MISSIONS.length} MISSIONS COMPLETE`);
    y += V.gap;
    line(`FINAL SCORE ${score}`, HUD.accent);
    line(
      newHigh ? `NEW HIGH SCORE!` : `HIGH SCORE ${highScore}`,
      newHigh ? HUD.accent : HUD.colour,
    );
    y += V.gap * 4;
    line('CREDITS', HUD.accent);
    y += V.gap;
    for (const section of CREDITS) {
      line(section.heading, HUD.accent);
      for (const l of section.lines) line(l);
      y += V.gap;
    }
    y += V.gap * 2;
    line('THANK YOU FOR PLAYING', HUD.accent);
    this.height_ = y;

    const leave = (): void => this.leave();
    for (const key of ['ENTER', 'SPACE', 'ESC']) this.input.keyboard?.once(`keydown-${key}`, leave);
    this.input.once(Phaser.Input.Events.POINTER_DOWN, leave);
    this.prompt = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - V.bottom, touch ? 'TAP TO GO ON' : 'PRESS ENTER', {
        fontFamily: HUD.font,
        fontSize: `${HUD.fontSize}px`,
        color: HUD.colour,
      })
      .setOrigin(0.5, 0)
      .setShadow(1, 1, HUD.shadow, 0, false, true)
      .setVisible(false);
  }

  override update(_time: number, deltaMs: number): void {
    const V = VICTORY;
    const dt = deltaMs / 1000;
    this.elapsed += dt;
    // The city drifts by slowly behind the text.
    scrollBackdrop(this.layers, this.elapsed * V.speed * 2);
    if (this.done || this.elapsed < V.holdSeconds) return;
    // Rolls until "THANK YOU FOR PLAYING" sits in the middle of the screen.
    const end = V.top + this.height_ - GAME_HEIGHT / 2;
    this.scrolled = Math.min(end, this.scrolled + V.speed * dt);
    this.roll.y = V.top - this.scrolled;
    if (this.scrolled >= end) {
      this.done = true;
      this.prompt?.setVisible(true);
    }
  }

  snapshot(): VictorySnapshot {
    return { ...this.data_, lines: [...this.lines], scrolled: this.scrolled, done: this.done };
  }

  private leave(): void {
    if (this.leaving) return;
    this.leaving = true;
    play(this, 'sfx-select');
    this.scene.start('Title');
  }
}
