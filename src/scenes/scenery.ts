import Phaser from 'phaser';
import { IMAGES, SHEETS, THEMES, TILE } from '../config/assets';
import { GAME_HEIGHT, GAME_WIDTH, SCENERY } from '../config/tuning';
import { layoutBuilding } from '../logic/buildingLayout';
import type { Rng } from '../logic/rng';
import { roofOf, type PlacedBuilding, type Roof, type Theme } from '../logic/world';

/** Drawing helpers shared by the game and the art viewer. */

const S = SCENERY;

export interface ParallaxLayer {
  sprite: Phaser.GameObjects.TileSprite;
  factor: number;
}

/** Queues every sprite sheet and image in the art manifest; logs any that fail. */
export function loadArt(scene: Phaser.Scene): void {
  scene.load.on('loaderror', (file: Phaser.Loader.File) => {
    console.error(`could not load ${file.key} (${String(file.src)})`);
  });
  for (const s of SHEETS) {
    scene.load.spritesheet(s.key, s.file, { frameWidth: s.frameWidth, frameHeight: s.frameHeight });
  }
  for (const img of IMAGES) scene.load.image(img.key, img.file);
}

/** Creates a looping animation for every animated sheet (once per game). */
export function makeAnims(scene: Phaser.Scene): void {
  for (const s of SHEETS) {
    if (s.fps === 0 || scene.anims.exists(s.key)) continue;
    scene.anims.create({
      key: s.key,
      frames: scene.anims.generateFrameNumbers(s.key, { start: 0, end: s.frames - 1 }),
      frameRate: s.fps,
      repeat: -1,
    });
  }
}

/** Keys of every manifest texture that failed to load. */
export function missingArt(scene: Phaser.Scene): string[] {
  return [...SHEETS, ...IMAGES]
    .map((a) => a.key)
    .filter((k) => !scene.textures.exists(k) || scene.textures.get(k).key === '__MISSING');
}

/** Sky colour plus the theme's background layers, fixed to the screen. Move them with scrollBackdrop. */
export function addBackdrop(scene: Phaser.Scene, theme: Theme): ParallaxLayer[] {
  scene.cameras.main.setBackgroundColor(S.skyColour[theme]);
  return THEMES[theme].layers.map(({ key, factor }) => {
    const tex = scene.textures.get(key).getSourceImage();
    const sprite = scene.add
      .tileSprite(0, S.groundY, GAME_WIDTH, tex.height, key)
      .setOrigin(0, 1)
      .setScrollFactor(0);
    return { sprite, factor };
  });
}

/** Shifts each background layer for the camera's position (parallax). */
export function scrollBackdrop(layers: readonly ParallaxLayer[], scrollX: number): void {
  for (const l of layers) l.sprite.tilePositionX = scrollX * l.factor;
}

/** The street along the bottom of the world. */
export function addStreet(scene: Phaser.Scene, theme: Theme, worldWidth: number): void {
  scene.add
    .rectangle(0, S.groundY, worldWidth, GAME_HEIGHT - S.groundY, S.streetColour[theme])
    .setOrigin(0, 0);
  scene.add.rectangle(0, S.groundY, worldWidth, 1, S.streetEdgeColour[theme]).setOrigin(0, 0);
}

/** Draws a building from tiles, with rubble at its right foot. Returns its roof. */
export function addBuilding(
  scene: Phaser.Scene,
  theme: Theme,
  b: PlacedBuilding,
  rng: Rng,
  base = false,
): Roof {
  const { tiles } = THEMES[theme];
  const roof = roofOf(b, S, base);
  layoutBuilding(b, rng).forEach((row, y) =>
    row.forEach((name, x) => {
      scene.add.image(b.x + x * S.tile, roof.y + y * S.tile, tiles, TILE[name]).setOrigin(0, 0);
    }),
  );
  if (!base) scene.add.image(roof.right, S.groundY, tiles, TILE.rubble).setOrigin(0, 1);
  return roof;
}
