import { describe, expect, it } from 'vitest';
import { confirmAge, isAgeConfirmed } from '../../src/lib/age-gate';
import { AGE_KEY, type KeyValueStore } from '../../src/lib/storage';

function mem(initial: Record<string, string> = {}): KeyValueStore {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const throwing: KeyValueStore = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
  removeItem: () => undefined,
};

describe('gate 18+', () => {
  it('vazio -> não confirmado', () => {
    expect(isAgeConfirmed(mem())).toBe(false);
  });
  it("só '1' confirma", () => {
    expect(isAgeConfirmed(mem({ [AGE_KEY]: '1' }))).toBe(true);
    for (const v of ['true', '0', 'x', '']) expect(isAgeConfirmed(mem({ [AGE_KEY]: v }))).toBe(false);
  });
  it("confirmAge grava '1'", () => {
    const s = mem();
    confirmAge(s);
    expect(s.getItem(AGE_KEY)).toBe('1');
    expect(isAgeConfirmed(s)).toBe(true);
  });
  it('store que lança: sem exceção', () => {
    expect(() => {
      confirmAge(throwing);
    }).not.toThrow();
    expect(isAgeConfirmed(throwing)).toBe(false);
  });
});
