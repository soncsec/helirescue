/** Scenes that can be opened directly from the URL. */
export type StartScene = 'Game' | 'Art';

/**
 * Picks the first scene from the page's query string: `?scene=art` opens the
 * art viewer; anything else opens the game.
 */
export function startScene(search: string): StartScene {
  return new URLSearchParams(search).get('scene') === 'art' ? 'Art' : 'Game';
}
