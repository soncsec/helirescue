import { SAVE } from '../config/tuning';
import { DEFAULT_SAVE, parseSave, SAVE_KEY, serializeSave, type SaveData } from '../logic/save';

/**
 * The only code that touches localStorage (H9). Storage can be missing or
 * throw (private windows, blocked site data); the game then simply keeps no
 * high score between visits.
 */
export function loadSave(): SaveData {
  try {
    return parseSave(window.localStorage.getItem(SAVE_KEY), SAVE);
  } catch {
    return { ...DEFAULT_SAVE };
  }
}

export function storeSave(d: SaveData): void {
  try {
    window.localStorage.setItem(SAVE_KEY, serializeSave(d));
  } catch {
    // Not saved: the game still works.
  }
}
