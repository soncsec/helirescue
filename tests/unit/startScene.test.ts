import { describe, expect, it } from 'vitest';
import { startScene } from '../../src/logic/startScene';

describe('startScene', () => {
  it('opens the art viewer for ?scene=art', () => {
    expect(startScene('?scene=art')).toBe('Art');
    expect(startScene('?seed=4&scene=art')).toBe('Art');
  });

  it('opens the game otherwise', () => {
    expect(startScene('')).toBe('Game');
    expect(startScene('?scene=ART')).toBe('Game');
    expect(startScene('?scene=preview')).toBe('Game');
    expect(startScene('?seed=4')).toBe('Game');
  });
});
