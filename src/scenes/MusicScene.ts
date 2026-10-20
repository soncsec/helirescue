import Phaser from 'phaser';
import { soundFiles } from '../config/audio';
import { startMusic } from './sound';

/**
 * Loads and plays the music on its own (roadmap M4). The title launches it
 * once and it keeps running, invisible. A scene ignores the keyboard while
 * it loads, so loading the music inside the title or the game would leave
 * the controls dead for a moment on a slow connection.
 */
export class MusicScene extends Phaser.Scene {
  constructor() {
    super('Music');
  }

  preload(): void {
    if (!this.cache.audio.exists('music')) this.load.audio('music', soundFiles('music'));
  }

  create(): void {
    startMusic(this);
  }
}
