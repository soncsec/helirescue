import type Phaser from 'phaser';
import type { ArtScene, ArtSnapshot } from '../scenes/ArtScene';
import type { CreditsScene, CreditsSnapshot } from '../scenes/CreditsScene';
import { GameScene, type GameSnapshot } from '../scenes/GameScene';
import type { PauseScene, PauseSnapshot } from '../scenes/PauseScene';
import type { ResultScene, ResultSnapshot } from '../scenes/ResultScene';
import type { TitleScene, TitleSnapshot } from '../scenes/TitleScene';
import type { VictoryScene, VictorySnapshot } from '../scenes/VictoryScene';
import { isMuted, soundLog } from '../scenes/sound';

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
  /** Crashes the helicopter where it is (a real crash: uses up a helicopter). */
  crash(): void;
  /** Brings the next enemy jet pass forward to now (missions with jets, M5.3). */
  jetPass(): void;
  /** The title screen's text, while it is showing. */
  title(): TitleSnapshot | null;
  /** True while the pause screen is showing. */
  pauseShowing(): boolean;
  /** The pause screen's text (with the controls), while it is showing. */
  pause(): PauseSnapshot | null;
  /** The credits screen's text, while it is showing. */
  credits(): CreditsSnapshot | null;
  /** The victory screen (M5.5), while it is showing. */
  victory(): VictorySnapshot | null;
  /**
   * Sound (M4): muted or not, how many times each sound has started, which
   * sounds are loaded, and whether the music is playing (or waiting for the
   * browser to allow sound).
   */
  sound(): { muted: boolean; log: Record<string, number>; loaded: string[]; music: boolean };
  /**
   * How long each game update took, in ms, most recent last (M3.7 frame-time
   * budget): the game's own work per frame, without the browser's drawing.
   */
  updateTimes(): number[];
  resetUpdateTimes(): void;
}

/** Recent GameScene.update durations, in ms. */
const updateTimes: number[] = [];
const KEEP = 5000;

/**
 * Times every GameScene update (e2e build only; the player build never loads
 * this file). Wraps the method once, on the class, so restarts are timed too.
 */
function timeUpdates(): void {
  const proto = GameScene.prototype as unknown as {
    update: (time: number, delta: number) => void;
    __timed?: boolean;
  };
  if (proto.__timed) return;
  const original = proto.update;
  proto.update = function timed(this: GameScene, time: number, delta: number): void {
    const start = performance.now();
    original.call(this, time, delta);
    updateTimes.push(performance.now() - start);
    if (updateTimes.length > KEEP) updateTimes.shift();
  };
  proto.__timed = true;
}

declare global {
  interface Window {
    __game?: TestHook;
  }
}

export function installTestHook(game: Phaser.Game): void {
  timeUpdates();
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
    title: () => {
      const s = game.scene.getScene('Title') as TitleScene | null;
      return s && game.scene.isActive('Title') ? s.snapshot() : null;
    },
    pauseShowing: () => game.scene.isActive('Pause'),
    pause: () => {
      const s = game.scene.getScene('Pause') as PauseScene | null;
      return s && game.scene.isActive('Pause') ? s.snapshot() : null;
    },
    sound: () => {
      const music = game.sound.get('music');
      return {
        muted: isMuted(),
        log: { ...soundLog } as Record<string, number>,
        loaded: game.cache.audio.getKeys(),
        music: music !== null && (music.isPlaying || game.sound.locked),
      };
    },
    credits: () => {
      const s = game.scene.getScene('Credits') as CreditsScene | null;
      return s && game.scene.isActive('Credits') ? s.snapshot() : null;
    },
    updateTimes: () => [...updateTimes],
    resetUpdateTimes: () => {
      updateTimes.length = 0;
    },
    crash: () => {
      const s = game.scene.getScene('Game') as GameScene | null;
      s?.crashForTest();
    },
    victory: () => {
      const s = game.scene.getScene('Victory') as VictoryScene | null;
      return s && game.scene.isActive('Victory') ? s.snapshot() : null;
    },
    jetPass: () => {
      const s = game.scene.getScene('Game') as GameScene | null;
      s?.jetPassForTest();
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
