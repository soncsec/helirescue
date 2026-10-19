import Phaser from 'phaser';
import { HUD, TOUCH } from '../config/tuning';
import type { Axis } from '../logic/movement';
import { buttonHit, dpadAxis, padHit, type TouchState } from '../logic/touch';

const PE = Phaser.Input.Events;
const DIRECTIONS: { x: 1 | -1 | 0; y: 1 | -1 | 0 }[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

/**
 * On-screen D-pad for phones and tablets (roadmap M2.6), drawn in the HUD
 * scene's bottom-left corner. One finger takes hold of the pad and steers
 * until it lifts; the rules are in src/logic/touch.ts. A pause button sits
 * top right, and FIRE (held), BOMB and TURN bottom right for the right thumb.
 */
export class TouchControls {
  private readonly pad: Phaser.GameObjects.Graphics;
  private pointerId: number | null = null;
  /** The finger holding FIRE, if any. */
  private firePointer: number | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly state: TouchState,
  ) {
    // Two more touch points than Phaser's default, for the buttons to come.
    scene.input.addPointer(2);
    this.pad = scene.add.graphics().setPosition(TOUCH.padX, TOUCH.padY).setAlpha(TOUCH.alpha);
    this.draw({ x: 0, y: 0 });
    // Pause button: a framed "II" under the score.
    const h = TOUCH.pauseHalf;
    scene.add
      .graphics()
      .setPosition(TOUCH.pauseX, TOUCH.pauseY)
      .setAlpha(TOUCH.alpha)
      .fillStyle(TOUCH.fill, 1)
      .fillRect(-h, -h, 2 * h, 2 * h)
      .lineStyle(2, TOUCH.line, 1)
      .strokeRect(-h, -h, 2 * h, 2 * h)
      .fillStyle(TOUCH.line, 1)
      .fillRect(-5, -6, 3, 12)
      .fillRect(2, -6, 3, 12);
    this.button(TOUCH.buttons.turn);
    this.button(TOUCH.buttons.fire);
    this.button(TOUCH.buttons.bomb);
    const input = scene.input;
    input.on(PE.POINTER_DOWN, this.onDown, this);
    input.on(PE.POINTER_MOVE, this.onMove, this);
    input.on(PE.POINTER_UP, this.onUp, this);
    input.on(PE.POINTER_UP_OUTSIDE, this.onUp, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      input.off(PE.POINTER_DOWN, this.onDown, this);
      input.off(PE.POINTER_MOVE, this.onMove, this);
      input.off(PE.POINTER_UP, this.onUp, this);
      input.off(PE.POINTER_UP_OUTSIDE, this.onUp, this);
    });
  }

  private onDown(p: Phaser.Input.Pointer): void {
    const h = TOUCH.pauseHalf;
    if (Math.abs(p.x - TOUCH.pauseX) <= h && Math.abs(p.y - TOUCH.pauseY) <= h) {
      this.state.pause = true;
      return;
    }
    const { turn, fire, bomb } = TOUCH.buttons;
    if (buttonHit(p.x - turn.x, p.y - turn.y, turn.r)) {
      this.state.turn = true;
      return;
    }
    if (buttonHit(p.x - bomb.x, p.y - bomb.y, bomb.r)) {
      this.state.bomb = true;
      return;
    }
    if (buttonHit(p.x - fire.x, p.y - fire.y, fire.r)) {
      this.firePointer = p.id;
      this.state.fire = true;
      return;
    }
    if (this.pointerId !== null) return;
    const dx = p.x - TOUCH.padX;
    const dy = p.y - TOUCH.padY;
    if (!padHit(dx, dy, TOUCH)) return;
    this.pointerId = p.id;
    this.set(dx, dy);
  }

  /** A round labelled button for the right thumb. */
  private button(b: { x: number; y: number; r: number; label: string }): void {
    this.scene.add
      .graphics()
      .setPosition(b.x, b.y)
      .setAlpha(TOUCH.alpha)
      .fillStyle(TOUCH.fill, 1)
      .fillCircle(0, 0, b.r)
      .lineStyle(2, TOUCH.line, 1)
      .strokeCircle(0, 0, b.r);
    this.scene.add
      .text(b.x, b.y, b.label, {
        fontFamily: HUD.font,
        fontSize: `${HUD.fontSize}px`,
        color: HUD.colour,
      })
      .setOrigin(0.5, 0.5)
      .setAlpha(TOUCH.alpha + 0.3);
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (p.id === this.pointerId) this.set(p.x - TOUCH.padX, p.y - TOUCH.padY);
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (p.id === this.firePointer) {
      this.firePointer = null;
      this.state.fire = false;
      return;
    }
    if (p.id !== this.pointerId) return;
    this.pointerId = null;
    this.set(0, 0);
  }

  private set(dx: number, dy: number): void {
    const axis = dpadAxis(dx, dy, TOUCH);
    const old = this.state.axis;
    if (axis.x === old.x && axis.y === old.y) return;
    this.state.axis = axis;
    this.draw(axis);
  }

  /** A dark disc with four arrows; the pressed arrows light up. */
  private draw(axis: Axis): void {
    const g = this.pad;
    g.clear();
    g.fillStyle(TOUCH.fill, 1).fillCircle(0, 0, TOUCH.radius);
    g.lineStyle(2, TOUCH.line, 1).strokeCircle(0, 0, TOUCH.radius);
    for (const d of DIRECTIONS) {
      const pressed = (d.x !== 0 && d.x === axis.x) || (d.y !== 0 && d.y === axis.y);
      g.fillStyle(pressed ? TOUCH.pressed : TOUCH.line, 1);
      const cx = d.x * TOUCH.arrow;
      const cy = d.y * TOUCH.arrow;
      const s = TOUCH.arrowSize;
      // Triangle pointing outward: tip at (cx + d*s), base across the other axis.
      g.fillTriangle(
        cx + d.x * s,
        cy + d.y * s,
        cx - d.x * s + d.y * s,
        cy - d.y * s + d.x * s,
        cx - d.x * s - d.y * s,
        cy - d.y * s - d.x * s,
      );
    }
    // Hide the scene's keyboard-only hint: nothing to do, the pad is the hint.
    this.scene.children.bringToTop(g);
  }
}
