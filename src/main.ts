import Phaser from 'phaser';
import './style.css';
import { GAME_HEIGHT, GAME_WIDTH, HUD } from './config/tuning';
import { isTouchOnly } from './logic/device';
import { integerZoom } from './logic/scaling';
import { startScene } from './logic/startScene';
import { ArtScene } from './scenes/ArtScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';

const zoomForWindow = (): number =>
  integerZoom(window.innerWidth, window.innerHeight, GAME_WIDTH, GAME_HEIGHT);

// Canvas text can't wait for a web font, so load the HUD font before the game
// starts. If it fails, the game still runs with the fallback font.
await document.fonts.load(`${HUD.fontSize}px ${HUD.font}`).catch(() => undefined);

// Phones and tablets: say touch controls are coming (until roadmap M2.6).
const note = document.getElementById('touch-note');
if (note) note.hidden = !isTouchOnly((q) => window.matchMedia(q).matches);

export const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#05070f',
  pixelArt: true,
  roundPixels: true,
  scale: {
    // Whole-number zoom keeps pixels crisp; the page's CSS centers the canvas.
    mode: Phaser.Scale.NONE,
    zoom: zoomForWindow(),
  },
  // ?scene=art opens the art viewer; Phaser starts the first scene listed.
  scene:
    startScene(window.location.search) === 'Art'
      ? [ArtScene, GameScene, HudScene]
      : [GameScene, HudScene, ArtScene],
});

window.addEventListener('resize', () => {
  const zoom = zoomForWindow();
  if (game.scale.zoom !== zoom) game.scale.setZoom(zoom);
});

// The e2e build adds a test hook. Vite replaces MODE at build time, so this
// branch and the hook module are left out of the normal build entirely.
if (import.meta.env.MODE === 'e2e') {
  void import('./debug/testHook').then(({ installTestHook }) => installTestHook(game));
}
