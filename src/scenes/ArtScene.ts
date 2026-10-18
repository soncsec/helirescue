import Phaser from 'phaser';
import { IMAGES, SHEETS, TILE } from '../config/assets';
import { CC_BY_CREDIT } from '../config/credits';
import { ART_VIEWER, DEFAULT_SEED, GAME_HEIGHT, GAME_WIDTH } from '../config/tuning';
import { layoutBuilding } from '../logic/buildingLayout';
import { createRng } from '../logic/rng';
import {
  addBackdrop,
  addBuilding,
  addStreet,
  loadArt,
  makeAnims,
  missingArt,
  scrollBackdrop,
  type ParallaxLayer,
} from './scenery';

type Mode = 'night' | 'war' | 'friendly' | 'enemies';

/** Which sprites each line-up page shows. */
const PAGES: Record<'friendly' | 'enemies', readonly string[]> = {
  friendly: ['heli-side', 'heli-front', 'civilian-blue', 'civilian-green', 'civilian-yellow'],
  enemies: ['soldier', 'tank', 'gunship', 'aa-turret', 'explosion', 'vtol-jet'],
};
interface ArtData {
  mode?: Mode;
}

/** Read-only view of the art viewer, used by the e2e test hook. */
export interface ArtSnapshot {
  mode: Mode;
  /** Manifest keys whose texture failed to load. */
  missing: string[];
}

const A = ART_VIEWER;

/**
 * Art viewer (from the M1 art test): shows the game's art in two mock gameplay
 * scenes and labelled line-ups, for checking new or changed art. Developer
 * page, not linked from the game. Open with ?scene=art.
 */
export class ArtScene extends Phaser.Scene {
  private mode: Mode = 'night';
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private layers: ParallaxLayer[] = [];

  constructor() {
    super('Art');
  }

  init(data: ArtData): void {
    this.mode = data.mode ?? 'night';
    this.layers = [];
  }

  preload(): void {
    loadArt(this);
  }

  create(): void {
    makeAnims(this);
    if (this.mode === 'friendly' || this.mode === 'enemies') this.buildLineup(this.mode);
    else this.buildMock(this.mode);
    this.buildHud();

    const kb = this.input.keyboard;
    if (!kb) throw new Error('keyboard input is not available');
    this.cursors = kb.createCursorKeys();
    const go = (mode: Mode): void => {
      this.scene.restart({ mode } satisfies ArtData);
    };
    kb.on('keydown-ONE', () => go('night'));
    kb.on('keydown-TWO', () => go('war'));
    kb.on('keydown-THREE', () => go('friendly'));
    kb.on('keydown-FOUR', () => go('enemies'));
  }

  override update(_time: number, deltaMs: number): void {
    if (this.mode === 'friendly' || this.mode === 'enemies' || !this.cursors) return;
    const cam = this.cameras.main;
    const dir = (this.cursors.right.isDown ? 1 : 0) - (this.cursors.left.isDown ? 1 : 0);
    cam.scrollX += (dir * A.scrollSpeed * deltaMs) / 1000;
    scrollBackdrop(this.layers, cam.scrollX);
  }

  snapshot(): ArtSnapshot {
    return { mode: this.mode, missing: missingArt(this) };
  }

  private buildMock(theme: 'night' | 'war'): void {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, A.worldWidth, GAME_HEIGHT);
    this.layers = addBackdrop(this, theme);
    addStreet(this, theme, A.worldWidth);

    const tiles = `buildings-${theme}`;
    const rng = createRng(DEFAULT_SEED);
    const roofs = A.buildings.map((b) => {
      const r = addBuilding(this, theme, b, rng);
      return { x: r.left, width: r.right - r.left, y: r.y };
    });
    const roof = (i: number): { x: number; width: number; y: number } => {
      const r = roofs[i];
      if (!r) throw new Error(`no building ${i}`);
      return r;
    };

    // Roof props.
    const r5 = roof(5);
    this.add.image(r5.x + A.tile, r5.y, tiles, TILE.antenna).setOrigin(0, 1);
    this.add.image(r5.x + 3 * A.tile, r5.y, tiles, TILE.acUnit).setOrigin(0, 1);

    // Landed helicopter, front view, with civilians walking to it.
    const r0 = roof(0);
    const pad = r0.x + r0.width / 2;
    this.add
      .sprite(pad, r0.y + 1, 'heli-front')
      .setOrigin(0.5, 1)
      .play('heli-front');
    ['civilian-blue', 'civilian-green', 'civilian-yellow'].forEach((key, i) => {
      const c = this.add
        .sprite(r0.x + 4 + i * 12, r0.y, key)
        .setOrigin(0.5, 1)
        .play(key);
      this.tweens.add({
        targets: c,
        x: c.x + A.civilianWalk,
        duration: A.civilianWalkMs,
        delay: i * 300,
        yoyo: true,
        repeat: -1,
        onYoyo: () => c.setFlipX(true),
        onRepeat: () => c.setFlipX(false),
      });
    });

    // Hovering helicopter, side view.
    const side = this.add.sprite(A.hoverX, A.hoverY, 'heli-side').play('heli-side');
    this.tweens.add({
      targets: side,
      y: A.hoverY + A.hoverBob,
      duration: A.hoverBobMs,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Anti-aircraft gun on a roof, sweeping its barrel.
    const r1 = roof(1);
    this.add
      .sprite(r1.x + r1.width / 2, r1.y + 1, 'aa-turret')
      .setOrigin(0.5, 1)
      .play('aa-turret');

    // Explosion on a damaged roof.
    const r3 = roof(3);
    const boom = this.add.sprite(r3.x + r3.width / 2, r3.y + 8, 'explosion').setOrigin(0.5, 1);
    boom.play({ key: 'explosion', repeat: -1, repeatDelay: A.explosionDelayMs });

    // Ground troops: two running, one shooting.
    const s1 = this.add
      .sprite(r3.x - 40, A.groundY, 'soldier')
      .setOrigin(0.5, 1)
      .setFlipX(true);
    s1.play('soldier');
    this.tweens.add({
      targets: s1,
      x: s1.x - A.soldierWalk,
      duration: A.soldierWalkMs,
      yoyo: true,
      repeat: -1,
      onYoyo: () => s1.setFlipX(false),
      onRepeat: () => s1.setFlipX(true),
    });
    const s2 = this.add.sprite(r3.x - 90, A.groundY, 'soldier', 10).setOrigin(0.5, 1);
    if (!this.anims.exists('soldier-shoot')) {
      this.anims.create({
        key: 'soldier-shoot',
        frames: this.anims.generateFrameNumbers('soldier', { start: 10, end: 11 }),
        frameRate: 6,
        repeat: -1,
      });
    }
    s2.play('soldier-shoot');

    // Tank driving along the street.
    const tank = this.add
      .sprite(A.tankX, A.groundY + 2, 'tank')
      .setOrigin(0.5, 1)
      .play('tank');
    this.tweens.add({
      targets: tank,
      x: A.tankX + A.tankDrive,
      duration: A.tankDriveMs,
      yoyo: true,
      repeat: -1,
    });

    // Aircraft crossing the sky from right to left.
    const gunship = this.add.sprite(A.worldWidth + 60, A.gunshipY, 'gunship').play('gunship');
    this.tweens.add({ targets: gunship, x: -60, duration: A.gunshipFlyMs, repeat: -1 });
    const jet = this.add.image(A.worldWidth + 80, A.jetY, 'vtol-jet').setFlipX(true);
    this.tweens.add({
      targets: jet,
      x: -80,
      duration: A.jetFlyMs,
      repeat: -1,
      repeatDelay: A.jetDelayMs,
    });
  }

  private buildLineup(page: 'friendly' | 'enemies'): void {
    const L = A.lineup;
    this.cameras.main.setBackgroundColor(L.background);
    const items: { key: string; label: string; source: string; w: number; h: number }[] = [
      ...SHEETS.filter((s) => s.fps > 0).map((s) => ({
        key: s.key,
        label: s.label,
        source: s.source,
        w: s.frameWidth,
        h: s.frameHeight,
      })),
      ...IMAGES.filter((i) => i.key === 'vtol-jet').map((i) => ({
        key: i.key,
        label: i.label,
        source: i.source,
        w: i.width,
        h: i.height,
      })),
    ].filter((item) => PAGES[page].includes(item.key));
    let x = L.margin;
    let y = L.top;
    let rowHeight = 0;
    for (const item of items) {
      if (x + item.w > GAME_WIDTH - L.margin) {
        x = L.margin;
        y += rowHeight + L.labelHeight + L.gap;
        rowHeight = 0;
      }
      const spr = this.add.sprite(x, y, item.key).setOrigin(0, 0);
      if (this.anims.exists(item.key)) spr.play(item.key);
      this.label(x, y + item.h + 1, `${item.label}\n${item.source}`);
      x += Math.max(item.w, 64) + L.gap;
      rowHeight = Math.max(rowHeight, item.h);
    }
    if (page === 'enemies') return;
    // One small sample building per tile set.
    const rng = createRng(DEFAULT_SEED);
    (['night', 'war'] as const).forEach((theme, i) => {
      const bx = GAME_WIDTH - L.margin - (2 - i) * (6 * A.tile + L.gap);
      const rows = layoutBuilding({ width: 5, height: 4, damage: 0.3, helipad: true }, rng);
      const by = GAME_HEIGHT - L.labelHeight - rows.length * A.tile;
      rows.forEach((row, ry) =>
        row.forEach((name, rx) =>
          this.add
            .image(bx + rx * A.tile, by + ry * A.tile, `buildings-${theme}`, TILE[name])
            .setOrigin(0, 0),
        ),
      );
      this.label(bx, GAME_HEIGHT - L.labelHeight + 1, `Buildings, ${theme}\nClaude`);
    });
  }

  private buildHud(): void {
    const style = {
      fontFamily: 'monospace',
      fontSize: A.hud.fontSize,
      color: A.hud.colour,
      backgroundColor: A.hud.background,
      padding: { x: 3, y: 2 },
    };
    this.add
      .text(
        4,
        4,
        'ART VIEWER  1 night city  2 war zone  3 friendly  4 enemies  arrows scroll',
        style,
      )
      .setScrollFactor(0);
    this.add
      .text(GAME_WIDTH - 4, GAME_HEIGHT - 2, CC_BY_CREDIT, style)
      .setOrigin(1, 1)
      .setScrollFactor(0);
  }

  private label(x: number, y: number, text: string): void {
    this.add.text(x, y, text, {
      fontFamily: 'monospace',
      fontSize: A.hud.fontSize,
      color: A.hud.colour,
    });
  }
}
