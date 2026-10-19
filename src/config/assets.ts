/**
 * Art manifest: every sprite sheet and image the game loads, its frame size
 * and where it came from (chosen in the M1 art test). A unit test checks each
 * file's real size against it.
 */
export type ArtSource = 'Claude' | 'Pack' | 'Pack, recoloured' | 'CC0' | 'CC-BY 3.0';

export interface SheetSpec {
  key: string;
  file: string;
  frameWidth: number;
  frameHeight: number;
  frames: number;
  /** Animation speed in frames per second (0 = still). */
  fps: number;
  label: string;
  source: ArtSource;
}

export interface ImageSpec {
  key: string;
  file: string;
  width: number;
  height: number;
  label: string;
  source: ArtSource;
}

const sprites = 'assets/sprites/';
const tiles = 'assets/tiles/';
const backgrounds = 'assets/backgrounds/';

export const SHEETS: readonly SheetSpec[] = [
  {
    key: 'heli-side',
    file: `${sprites}heli-side.png`,
    frameWidth: 108,
    frameHeight: 48,
    frames: 4,
    fps: 20,
    label: 'Helicopter, side',
    source: 'Claude',
  },
  {
    key: 'heli-front',
    file: `${sprites}heli-front.png`,
    frameWidth: 80,
    frameHeight: 48,
    frames: 4,
    fps: 20,
    label: 'Helicopter, front',
    source: 'Claude',
  },
  {
    key: 'base',
    file: `${sprites}base.png`,
    frameWidth: 160,
    frameHeight: 96,
    frames: 2,
    fps: 3,
    label: 'Rescue base',
    source: 'Claude',
  },
  {
    key: 'civilian-blue',
    file: `${sprites}civilian-blue-walk.png`,
    frameWidth: 32,
    frameHeight: 32,
    frames: 6,
    fps: 10,
    label: 'Civilian',
    source: 'Pack, recoloured',
  },
  {
    key: 'civilian-green',
    file: `${sprites}civilian-green-walk.png`,
    frameWidth: 32,
    frameHeight: 32,
    frames: 6,
    fps: 10,
    label: 'Civilian',
    source: 'Pack, recoloured',
  },
  {
    key: 'civilian-yellow',
    file: `${sprites}civilian-yellow-walk.png`,
    frameWidth: 32,
    frameHeight: 32,
    frames: 6,
    fps: 10,
    label: 'Civilian',
    source: 'Pack, recoloured',
  },
  {
    key: 'soldier',
    file: `${sprites}soldier.png`,
    frameWidth: 75,
    frameHeight: 48,
    frames: 15,
    fps: 14,
    label: 'Enemy soldier',
    source: 'Pack, recoloured',
  },
  {
    key: 'tank',
    file: `${sprites}tank.png`,
    frameWidth: 128,
    frameHeight: 64,
    frames: 4,
    fps: 8,
    label: 'Tank',
    source: 'Pack',
  },
  {
    key: 'gunship',
    file: `${sprites}gunship.png`,
    frameWidth: 106,
    frameHeight: 77,
    frames: 8,
    fps: 12,
    label: 'Enemy gunship',
    source: 'Pack',
  },
  {
    key: 'aa-turret',
    file: `${sprites}aa-turret.png`,
    frameWidth: 50,
    frameHeight: 32,
    frames: 5,
    fps: 2,
    label: 'Anti-aircraft gun',
    source: 'CC-BY 3.0',
  },
  {
    key: 'explosion',
    file: `${sprites}explosion.png`,
    frameWidth: 64,
    frameHeight: 64,
    frames: 8,
    fps: 14,
    label: 'Explosion',
    source: 'Pack',
  },
  {
    key: 'bullet',
    file: `${sprites}bullet.png`,
    frameWidth: 8,
    frameHeight: 4,
    frames: 2,
    fps: 12,
    label: 'Bullet',
    source: 'Claude',
  },
  {
    key: 'bomb',
    file: `${sprites}bomb.png`,
    frameWidth: 8,
    frameHeight: 12,
    frames: 1,
    fps: 0,
    label: 'Bomb',
    source: 'Claude',
  },
  {
    key: 'spark',
    file: `${sprites}spark.png`,
    frameWidth: 12,
    frameHeight: 12,
    frames: 4,
    fps: 16,
    label: 'Bullet impact',
    source: 'Claude',
  },
  {
    key: 'buildings-night',
    file: `${tiles}buildings-night.png`,
    frameWidth: 16,
    frameHeight: 16,
    frames: 16,
    fps: 0,
    label: 'Building tiles, night',
    source: 'Claude',
  },
  {
    key: 'buildings-war',
    file: `${tiles}buildings-war.png`,
    frameWidth: 16,
    frameHeight: 16,
    frames: 16,
    fps: 0,
    label: 'Building tiles, war',
    source: 'Claude',
  },
];

export const IMAGES: readonly ImageSpec[] = [
  {
    key: 'vtol-jet',
    file: `${sprites}vtol-jet.png`,
    width: 141,
    height: 43,
    label: 'Enemy VTOL jet',
    source: 'CC0',
  },
  {
    key: 'city-sky',
    file: `${backgrounds}city-sky.png`,
    width: 288,
    height: 192,
    label: 'City sky',
    source: 'Pack',
  },
  {
    key: 'city-far',
    file: `${backgrounds}city-far.png`,
    width: 288,
    height: 192,
    label: 'City, far',
    source: 'Pack',
  },
  {
    key: 'city-near',
    file: `${backgrounds}city-near.png`,
    width: 288,
    height: 192,
    label: 'City, near',
    source: 'Pack',
  },
  {
    key: 'industrial-sky',
    file: `${backgrounds}industrial-sky.png`,
    width: 272,
    height: 160,
    label: 'Industrial sky',
    source: 'Pack',
  },
  {
    key: 'industrial-far',
    file: `${backgrounds}industrial-far.png`,
    width: 213,
    height: 142,
    label: 'Industrial, far',
    source: 'Pack',
  },
  {
    key: 'industrial-near',
    file: `${backgrounds}industrial-near.png`,
    width: 272,
    height: 150,
    label: 'Industrial, near',
    source: 'Pack',
  },
];

/** Building tile frames, in the order tools/art/buildings.mjs draws them. */
export const TILE = {
  roofLeft: 0,
  roofMid: 1,
  roofRight: 2,
  wallLeft: 3,
  windowLit: 4,
  windowDark: 5,
  windowBroken: 6,
  wallRight: 7,
  wallPlain: 8,
  door: 9,
  sign: 10,
  helipad: 11,
  acUnit: 12,
  antenna: 13,
  rubble: 14,
  roofDamaged: 15,
} as const;

/** The manifest entry for a sprite sheet; throws if the key is unknown. */
export function sheetSpec(key: string): SheetSpec {
  const s = SHEETS.find((x) => x.key === key);
  if (!s) throw new Error(`${key} is missing from the art manifest`);
  return s;
}
