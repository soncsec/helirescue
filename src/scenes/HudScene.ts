import Phaser from 'phaser';
import { HUD } from '../config/tuning';
import type { TouchState } from '../logic/touch';
import { TouchControls } from './touchControls';

/** What the HUD shows, read from the game scene every frame. */
export interface HudState {
  health: number;
  maxHealth: number;
  saved: number;
  total: number;
  aboard: number;
  capacity: number;
  score: number;
}

/**
 * Heads-up display in its own scene on top of the game, so camera shake and
 * scrolling never move it. Along the top: health bar, SAVED, ABOARD, SCORE.
 * On touch devices it also holds the on-screen D-pad (touchControls.ts).
 */
export class HudScene extends Phaser.Scene {
  private fill!: Phaser.GameObjects.Rectangle;
  private saved!: Phaser.GameObjects.Text;
  private aboard!: Phaser.GameObjects.Text;
  private score!: Phaser.GameObjects.Text;
  private read: () => HudState | null = () => null;
  private touch: TouchState | null = null;

  constructor() {
    super('Hud');
  }

  init(data: { read: () => HudState | null; touch: TouchState | null }): void {
    this.read = data.read;
    this.touch = data.touch;
  }

  create(): void {
    if (this.touch) new TouchControls(this, this.touch);
    const B = HUD.bar;
    this.add.rectangle(B.x - 1, B.y - 1, B.width + 2, B.height + 2, B.frame).setOrigin(0, 0);
    this.add.rectangle(B.x, B.y, B.width, B.height, B.empty).setOrigin(0, 0);
    this.fill = this.add.rectangle(B.x, B.y, B.width, B.height, B.colour).setOrigin(0, 0);
    this.saved = this.text(HUD.savedX);
    this.aboard = this.text(HUD.aboardX);
    this.score = this.text(HUD.scoreRight).setOrigin(1, 0);
  }

  override update(): void {
    const s = this.read();
    if (!s) return;
    const B = HUD.bar;
    this.fill.width = (B.width * s.health) / s.maxHealth;
    this.fill.fillColor = s.health > B.lowAt ? B.colour : B.lowColour;
    this.saved.setText(`SAVED ${s.saved}/${s.total}`);
    this.aboard.setText(`ABOARD ${s.aboard}/${s.capacity}`);
    this.score.setText(`SCORE ${s.score}`);
  }

  private text(x: number): Phaser.GameObjects.Text {
    return this.add
      .text(x, HUD.textY, '', {
        fontFamily: HUD.font,
        fontSize: `${HUD.fontSize}px`,
        color: HUD.colour,
      })
      .setShadow(1, 1, HUD.shadow, 0, false, true);
  }
}
