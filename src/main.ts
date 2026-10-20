import Phaser from 'phaser';
import './style.css';
import { GAME_HEIGHT, GAME_WIDTH, HUD } from './config/tuning';
import { isPortrait, wantsTouch } from './logic/device';
import { zoomFor } from './logic/scaling';
import { startScene } from './logic/startScene';
import { ArtScene } from './scenes/ArtScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';
import { CreditsScene } from './scenes/CreditsScene';
import { MusicScene } from './scenes/MusicScene';
import { PauseScene } from './scenes/PauseScene';
import { TitleScene } from './scenes/TitleScene';
import { ResultScene } from './scenes/ResultScene';

const matches = (query: string): boolean => window.matchMedia(query).matches;
// Touch devices get the on-screen D-pad and fit-to-screen scaling (H8).
const touch = wantsTouch(window.location.search, matches);
const zoomForWindow = (): number =>
  zoomFor(touch, window.innerWidth, window.innerHeight, GAME_WIDTH, GAME_HEIGHT);

// Canvas text can't wait for a web font, so load the HUD font before the game
// starts. If it fails, the game still runs with the fallback font.
await document.fonts.load(`${HUD.fontSize}px ${HUD.font}`).catch(() => undefined);

export const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#05070f',
  pixelArt: true,
  roundPixels: true,
  scale: {
    // The zoom sets the canvas's CSS size; the page's CSS centers the canvas.
    mode: Phaser.Scale.NONE,
    zoom: zoomForWindow(),
  },
  // ?scene=art opens the art viewer; otherwise the title screen. Phaser starts the first scene listed.
  scene:
    startScene(window.location.search) === 'Art'
      ? [
          ArtScene,
          TitleScene,
          GameScene,
          HudScene,
          ResultScene,
          PauseScene,
          CreditsScene,
          MusicScene,
        ]
      : [
          TitleScene,
          GameScene,
          HudScene,
          ResultScene,
          PauseScene,
          CreditsScene,
          ArtScene,
          MusicScene,
        ],
});

// Landscape only on touch devices: in portrait, pause and ask for a turn.
const rotateNote = document.getElementById('rotate-note');
/** False until the first screen exists: pausing the loop earlier would also stop the loader. */
let started = false;

function applyOrientation(): void {
  const portrait = touch && isPortrait(matches);
  if (rotateNote) rotateNote.hidden = !portrait;
  if (!started) return;
  if (portrait) game.pause();
  else game.resume();
}

function applyWindow(): void {
  const zoom = zoomForWindow();
  if (game.scale.zoom !== zoom) game.scale.setZoom(zoom);
  applyOrientation();
}

window.addEventListener('resize', applyWindow);
window.matchMedia('(orientation: portrait)').addEventListener('change', applyWindow);
// The note shows at once; the pause waits until the first screen has been created.
game.events.once(Phaser.Core.Events.READY, () => {
  applyOrientation();
  const first = game.scene.getScenes(false)[0];
  first?.events.once(Phaser.Scenes.Events.CREATE, () => {
    started = true;
    applyOrientation();
  });
});

// The e2e build adds a test hook. Vite replaces MODE at build time, so this
// branch and the hook module are left out of the normal build entirely.
if (import.meta.env.MODE === 'e2e') {
  void import('./debug/testHook').then(({ installTestHook }) => installTestHook(game));
}
