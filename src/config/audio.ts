/**
 * Sound manifest (roadmap M4, H7): every sound the game plays, built by
 * tools/audio/build_audio.py from owner-approved CC0 packs (CREDITS.md).
 * Each sound ships as Ogg (most browsers) and M4A (iPhone Safari); Phaser
 * loads whichever the browser can play. Volumes are 0 to 1.
 */
export interface SoundSpec {
  volume: number;
  loop?: boolean;
}

export const AUDIO_DIR = 'assets/audio/';

export const SOUNDS = {
  music: { volume: 0.35, loop: true },
  'sfx-rotor': { volume: 0.25, loop: true },
  'sfx-gun': { volume: 0.25 },
  'sfx-bomb-drop': { volume: 0.4 },
  'sfx-blast': { volume: 0.6 },
  'sfx-crash': { volume: 0.8 },
  'sfx-flak': { volume: 0.35 },
  'sfx-heli-hit': { volume: 0.6 },
  'sfx-soldier-shot': { volume: 0.3 },
  'sfx-spark': { volume: 0.2 },
  'sfx-land': { volume: 0.5 },
  'sfx-hard-land': { volume: 0.7 },
  'sfx-board': { volume: 0.5 },
  'sfx-saved': { volume: 0.6 },
  'sfx-lost': { volume: 0.5 },
  'sfx-complete': { volume: 0.7 },
  'sfx-game-over': { volume: 0.7 },
  'sfx-select': { volume: 0.5 },
} as const satisfies Record<string, SoundSpec>;

export type SoundKey = keyof typeof SOUNDS;

/** The two files for a sound, in the order the browser should try them. */
export function soundFiles(key: SoundKey): string[] {
  return [`${AUDIO_DIR}${key}.ogg`, `${AUDIO_DIR}${key}.m4a`];
}
