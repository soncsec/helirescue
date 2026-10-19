import type Phaser from 'phaser';
import type { ArtScene, ArtSnapshot } from '../scenes/ArtScene';
import type { GameScene, GameSnapshot } from '../scenes/GameScene';
import type { ResultScene, ResultSnapshot } from '../scenes/ResultScene';

/**
 * Test-only hook for Playwright (ADR-006). It is loaded only in the e2e build
 * (`vite build --mode e2e`), so the build players get never includes it.
 * Add controls here as the game grows (spawn an enemy, skip a level, ...).
 */
export interface TestHook {
  /** The key of the scene that is running, or null while loading. */
  scene(): string | null;
  snapshot(): GameSnapshot | null;
  /** True while the HUD scene is running on top of the game. */
  hudActive(): boolean;
  /** The art viewer's state, while it is running. */
  art(): ArtSnapshot | null;
  /** True while the game is paused (portrait on a touch device). */
  paused(): boolean;
  /** The result screen's contents, while it is showing. */
  result(): ResultSnapshot | null;
  /** Settles the mission: the first `saved` people saved, the next `lost` lost. */
  settle(saved: number, lost: number): void;
}

declare global {
  interface Window {
    __game?: TestHook;
  }
}

export function installTestHook(game: Phaser.Game): void {
  window.__game = {
    scene: () => game.scene.getScenes(true)[0]?.scene.key ?? null,
    snapshot: () => {
      const s = game.scene.getScene('Game') as GameScene | null;
      return s && game.scene.isActive('Game') ? s.snapshot() : null;
    },
    hudActive: () => game.scene.isActive('Hud'),
    paused: () => game.isPaused,
    result: () => {
      const s = game.scene.getScene('Result') as ResultScene | null;
      return s && game.scene.isActive('Result') ? s.snapshot() : null;
    },
    settle: (saved, lost) => {
      const s = game.scene.getScene('Game') as GameScene | null;
      s?.settleForTest(saved, lost);
    },
    art: () => {
      const s = game.scene.getScene('Art') as ArtScene | null;
      return s && game.scene.isActive('Art') ? s.snapshot() : null;
    },
  };
}
