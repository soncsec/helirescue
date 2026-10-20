import { describe, expect, it } from 'vitest';
import { onPress, type KeyEvents } from '../../src/scenes/keys';

/** A stand-in for Phaser's keyboard plugin: handlers by event name. */
function fakeKeyboard(): KeyEvents & { emit(name: string, e: KeyboardEvent): void } {
  const handlers = new Map<string, ((e: KeyboardEvent) => void)[]>();
  return {
    on(name, fn) {
      handlers.set(name, [...(handlers.get(name) ?? []), fn]);
      return this;
    },
    emit(name, e) {
      for (const fn of handlers.get(name) ?? []) fn(e);
    },
  };
}

const press = (): KeyboardEvent => ({}) as KeyboardEvent;

describe('onPress', () => {
  it('counts each press once, even if the same event comes twice', () => {
    const kb = fakeKeyboard();
    let n = 0;
    onPress(kb, ['M'], () => n++);
    const e = press();
    kb.emit('keydown-M', e);
    kb.emit('keydown-M', e); // the same event handed over again
    expect(n).toBe(1);
    kb.emit('keydown-M', press());
    expect(n).toBe(2);
  });

  it('listens on every key name given', () => {
    const kb = fakeKeyboard();
    let n = 0;
    onPress(kb, ['LEFT', 'A'], () => n++);
    kb.emit('keydown-LEFT', press());
    kb.emit('keydown-A', press());
    kb.emit('keydown-RIGHT', press());
    expect(n).toBe(2);
  });

  it('does nothing without a keyboard', () => {
    expect(() => onPress(null, ['M'], () => undefined)).not.toThrow();
  });
});
