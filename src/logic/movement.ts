/** Shared movement types: keyboard direction, points and rectangular bounds. */

export interface Axis {
  /** -1 left, 0 none, 1 right */
  x: -1 | 0 | 1;
  /** -1 up, 0 none, 1 down */
  y: -1 | 0 | 1;
}

export interface Point {
  x: number;
  y: number;
}

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}
