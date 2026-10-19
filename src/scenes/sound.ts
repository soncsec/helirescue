import type Phaser from 'phaser';
import { SOUNDS, soundFiles, type SoundKey } from '../config/audio';
import { loadSave, storeSave } from './storage';

/**
 * Sound helpers (roadmap M4, H7). Sounds are loaded once and shared by every
 * scene through Phaser's global sound manager. Browsers only allow sound after
 * the player's first key press or tap; Phaser unlocks it then, and anything
 * started before (the music) begins at that moment.
 */

/** How many times each sound has started, for the e2e test hook. */
export const soundLog: Partial<Record<SoundKey, number>> = {};

/**
 * Whether sound is off. Kept here rather than read back from Phaser: in
 * Chromium and WebKit, Phaser's `sound.mute` reads the old value until the
 * audio engine has applied the change.
 */
let muted = false;

export function isMuted(): boolean {
  return muted;
}

function setMuted(scene: Phaser.Scene, value: boolean): void {
  muted = value;
  scene.sound.mute = value;
}

/** Loads the sound effects with the scene; the music loads later (see ensureMusic). */
export function loadSounds(scene: Phaser.Scene): void {
  for (const key of Object.keys(SOUNDS) as SoundKey[]) {
    if (key !== 'music' && !scene.cache.audio.exists(key)) scene.load.audio(key, soundFiles(key));
  }
}

/**
 * Starts the music, loading it first in the background if needed, so the
 * title shows without waiting for it. Called from the title and the game, in
 * case the player starts before it has loaded.
 */
export function ensureMusic(scene: Phaser.Scene): void {
  if (scene.cache.audio.exists('music')) {
    startMusic(scene);
    return;
  }
  scene.load.audio('music', soundFiles('music'));
  scene.load.once('filecomplete-audio-music', () => startMusic(scene));
  scene.load.start();
}

/** Plays a one-off sound effect at its set volume (silent while muted). */
export function play(scene: Phaser.Scene, key: SoundKey): void {
  if (muted || !scene.cache.audio.exists(key)) return;
  scene.sound.play(key, { volume: SOUNDS[key].volume });
  soundLog[key] = (soundLog[key] ?? 0) + 1;
}

/** Starts the music loop once; it keeps playing across scenes. */
export function startMusic(scene: Phaser.Scene): void {
  if (!scene.cache.audio.exists('music')) return;
  const playing = scene.sound.get('music');
  if (playing) return;
  scene.sound.add('music', { volume: SOUNDS.music.volume, loop: true }).play();
  soundLog.music = (soundLog.music ?? 0) + 1;
}

/** Applies the saved sound setting (H9: the `muted` field of the one saved key). */
export function applySavedMute(scene: Phaser.Scene): void {
  setMuted(scene, loadSave().muted);
}

/** Turns sound on or off and saves the choice. Returns true when sound is now off. */
export function toggleMute(scene: Phaser.Scene): boolean {
  setMuted(scene, !muted);
  storeSave({ ...loadSave(), muted });
  return muted;
}
