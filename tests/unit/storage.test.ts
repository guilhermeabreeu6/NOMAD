import { describe, expect, it, vi } from 'vitest';
import {
  CART_KEY,
  getSafeStorage,
  loadCart,
  saveCart,
  type KeyValueStore,
} from '../../src/lib/storage';

function mem(initial: Record<string, string> = {}): KeyValueStore & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const withCart = (json: string): KeyValueStore => mem({ [CART_KEY]: json });
const wrap = (lines: unknown, v: unknown = 1): string => JSON.stringify({ v, lines });

describe('loadCart tolerante', () => {
  it.each([
    ['vazio', null],
    ['JSON corrompido', '{not json'],
    ['null', 'null'],
    ['objeto vazio', '{}'],
    ['versão 2', wrap([{ m: 'v155', f: 'menthol', q: 1 }], 2)],
    ['lines não-array', wrap('x')],
    ['array na raiz', '[]'],
  ])('%s -> []', (_n, raw) => {
    const store = raw === null ? mem() : withCart(raw);
    expect(loadCart(store)).toEqual([]);
  });

  it('descarta itens inválidos e mantém os válidos', () => {
    const lines = [
      { m: 'v155', f: 'menthol', q: 2 },
      { m: 'v155', f: 'menthol', q: 'abc' },
      { m: 'v155', f: 'icy-mint', q: -3 },
      { m: 'v55', f: 'icy-mint', q: 99 },
      { m: 'modelo-removido', f: 'menthol', q: 1 },
      { m: 'v155', f: 'sabor-removido', q: 1 },
      { m: 5, f: 'x', q: 1 },
      'lixo',
      null,
      { m: 'v400-mix-slim', f: 'cherry-grape', q: 2.5 },
    ];
    expect(loadCart(withCart(wrap(lines)))).toEqual([
      { modelId: 'v155', flavorId: 'menthol', qty: 2 },
      { modelId: 'v55', flavorId: 'icy-mint', qty: 10 },
    ]);
  });

  it('funde duplicatas respeitando o teto', () => {
    const lines = [
      { m: 'v155', f: 'menthol', q: 6 },
      { m: 'v155', f: 'menthol', q: 7 },
    ];
    expect(loadCart(withCart(wrap(lines)))).toEqual([{ modelId: 'v155', flavorId: 'menthol', qty: 10 }]);
  });

  it('ignora preços salvos (só m/f/q são lidos)', () => {
    const lines = [{ m: 'v155', f: 'menthol', q: 1, price: 1, unitCents: 1 }];
    expect(loadCart(withCart(wrap(lines)))).toEqual([{ modelId: 'v155', flavorId: 'menthol', qty: 1 }]);
  });

  it('getItem que lança não propaga', () => {
    const store: KeyValueStore = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => undefined,
      removeItem: () => undefined,
    };
    expect(loadCart(store)).toEqual([]);
  });
});

describe('saveCart', () => {
  it('ida e volta', () => {
    const store = mem();
    saveCart(store, [{ modelId: 'v155', flavorId: 'menthol', qty: 2 }]);
    expect(JSON.parse(store.data.get(CART_KEY) ?? '')).toEqual({
      v: 1,
      lines: [{ m: 'v155', f: 'menthol', q: 2 }],
    });
    expect(loadCart(store)).toEqual([{ modelId: 'v155', flavorId: 'menthol', qty: 2 }]);
  });

  it('QuotaExceeded não propaga', () => {
    const store: KeyValueStore = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('quota', 'QuotaExceededError');
      },
      removeItem: () => undefined,
    };
    expect(() => {
      saveCart(store, [{ modelId: 'v155', flavorId: 'menthol', qty: 1 }]);
    }).not.toThrow();
  });
});

describe('getSafeStorage', () => {
  it('cai para memória quando localStorage lança', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => undefined,
    });
    const s = getSafeStorage();
    s.setItem('a', '1');
    expect(s.getItem('a')).toBe('1');
    expect(s.getItem('b')).toBeNull();
    s.removeItem('a');
    expect(s.getItem('a')).toBeNull();
    vi.unstubAllGlobals();
  });

  it('usa memória quando não há localStorage', () => {
    vi.stubGlobal('localStorage', undefined);
    const s = getSafeStorage();
    s.setItem('k', 'v');
    expect(s.getItem('k')).toBe('v');
    vi.unstubAllGlobals();
  });

  it('usa localStorage quando funciona', () => {
    const ls = mem();
    vi.stubGlobal('localStorage', ls);
    expect(getSafeStorage()).toBe(ls);
    vi.unstubAllGlobals();
  });
});
