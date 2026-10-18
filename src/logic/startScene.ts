/** Scenes that can be opened directly from the URL. */
export type StartScene = 'Game' | 'Art';

/**
 * Picks the first scene from the page's query string: `?scene=art` opens the
 * art test (roadmap M1); anything else opens the game.
 */
export function startScene(search: string): StartScene {
  return new URLSearchParams(search).get('scene') === 'art' ? 'Art' : 'Game';
}
