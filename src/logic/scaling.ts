/**
 * Largest whole-number zoom at which the game still fits the window.
 * Whole numbers keep every art pixel the same size on screen (no blurry or uneven pixels).
 * Never below 1, even if the window is smaller than the game.
 */
export function integerZoom(
  viewWidth: number,
  viewHeight: number,
  gameWidth: number,
  gameHeight: number,
): number {
  checkGameSize(gameWidth, gameHeight);
  const fit = fitRatio(viewWidth, viewHeight, gameWidth, gameHeight);
  return Number.isFinite(fit) ? Math.max(1, Math.floor(fit)) : 1;
}

/** Smallest zoom allowed when fitting, so a broken window size never hides the game. */
const MIN_FIT = 0.5;

/**
 * The zoom that fills the window in one direction while keeping the 16:9 shape
 * (H8, phones and tablets): a phone at 844x390 gets about 1.44 instead of 1.
 */
export function fitZoom(
  viewWidth: number,
  viewHeight: number,
  gameWidth: number,
  gameHeight: number,
): number {
  checkGameSize(gameWidth, gameHeight);
  const fit = fitRatio(viewWidth, viewHeight, gameWidth, gameHeight);
  return Number.isFinite(fit) ? Math.max(MIN_FIT, fit) : 1;
}

/** Whole-number zoom on desktop, fit-to-screen on touch devices (H8). */
export function zoomFor(
  touch: boolean,
  viewWidth: number,
  viewHeight: number,
  gameWidth: number,
  gameHeight: number,
): number {
  return (touch ? fitZoom : integerZoom)(viewWidth, viewHeight, gameWidth, gameHeight);
}

function fitRatio(vw: number, vh: number, gw: number, gh: number): number {
  return Math.min(vw / gw, vh / gh);
}

function checkGameSize(gameWidth: number, gameHeight: number): void {
  if (gameWidth <= 0 || gameHeight <= 0) throw new RangeError('game size must be positive');
}
