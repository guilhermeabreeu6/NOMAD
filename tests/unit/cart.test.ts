import { describe, expect, it } from 'vitest';
import {
  addItem,
  clampQty,
  countUnits,
  lineKey,
  removeLine,
  resolveCart,
  setQty,
  subtotalCents,
  type Cart,
} from '../../src/lib/cart';

describe('clampQty', () => {
  it.each<[unknown, number, 'max' | 'invalid' | null]>([
    [1, 1, null],
    [10, 10, null],
    [11, 10, 'max'],
    [15, 10, 'max'],
    ['3', 3, null],
    [' 4 ', 4, null],
    [0, 1, 'invalid'],
    [-1, 1, 'invalid'],
    ['', 1, 'invalid'],
    [' ', 1, 'invalid'],
    [2.5, 1, 'invalid'],
    ['abc', 1, 'invalid'],
    [NaN, 1, 'invalid'],
    [Infinity, 1, 'invalid'],
    [null, 1, 'invalid'],
    [undefined, 1, 'invalid'],
  ])('%s -> %i (%s)', (raw, qty, clamped) => {
    expect(clampQty(raw)).toEqual({ qty, clamped });
  });
});

describe('addItem', () => {
  it('adiciona nova linha', () => {
    const r = addItem([], 'v155', 'menthol', 2);
    expect(r.cart).toEqual([{ modelId: 'v155', flavorId: 'menthol', qty: 2 }]);
    expect(r.hitMax).toBe(false);
  });

  it('soma na linha existente (RN2)', () => {
    const a = addItem([], 'v155', 'menthol', 2).cart;
    const b = addItem(a, 'v155', 'menthol', 1);
    expect(b.cart).toEqual([{ modelId: 'v155', flavorId: 'menthol', qty: 3 }]);
  });

  it('sabores diferentes são linhas separadas, em ordem de inserção', () => {
    let c: Cart = [];
    c = addItem(c, 'v155', 'menthol', 1).cart;
    c = addItem(c, 'v55', 'icy-mint', 1).cart;
    c = addItem(c, 'v155', 'icy-mint', 1).cart;
    expect(c.map((l) => lineKey(l.modelId, l.flavorId))).toEqual([
      'v155::menthol',
      'v55::icy-mint',
      'v155::icy-mint',
    ]);
  });

  it('mesmo sabor em modelos diferentes são linhas separadas', () => {
    let c: Cart = [];
    c = addItem(c, 'v55', 'icy-mint', 1).cart;
    c = addItem(c, 'v155', 'icy-mint', 1).cart;
    expect(c).toHaveLength(2);
  });

  it('limita a 10 e sinaliza hitMax (8 + 5)', () => {
    const a = addItem([], 'v155', 'menthol', 8).cart;
    const r = addItem(a, 'v155', 'menthol', 5);
    expect(r.cart[0]?.qty).toBe(10);
    expect(r.hitMax).toBe(true);
  });

  it('10 exato não é hitMax', () => {
    const a = addItem([], 'v155', 'menthol', 5).cart;
    expect(addItem(a, 'v155', 'menthol', 5).hitMax).toBe(false);
  });

  it('qtd acima de 10 em linha nova é limitada com hitMax', () => {
    const r = addItem([], 'v55', 'icy-mint', 99);
    expect(r.cart[0]?.qty).toBe(10);
    expect(r.hitMax).toBe(true);
  });

  it('lança para modelo/sabor inexistente', () => {
    expect(() => addItem([], 'x', 'menthol', 1)).toThrow();
    expect(() => addItem([], 'v155', 'x', 1)).toThrow();
  });

  it('não muta o carrinho original', () => {
    const a: Cart = Object.freeze([{ modelId: 'v155', flavorId: 'menthol', qty: 1 }]);
    addItem(a, 'v155', 'menthol', 1);
    expect(a[0]?.qty).toBe(1);
  });
});

describe('setQty / removeLine', () => {
  const base = addItem(addItem([], 'v155', 'menthol', 2).cart, 'v55', 'icy-mint', 1).cart;

  it('altera quantidade', () => {
    expect(setQty(base, 'v155::menthol', 4).cart[0]?.qty).toBe(4);
  });

  it('limita 11 -> 10 com hitMax', () => {
    const r = setQty(base, 'v155::menthol', 11);
    expect(r.cart[0]?.qty).toBe(10);
    expect(r.hitMax).toBe(true);
  });

  it('inválido vira 1', () => {
    expect(setQty(base, 'v155::menthol', 0).cart[0]?.qty).toBe(1);
  });

  it('remove linha', () => {
    expect(removeLine(base, 'v155::menthol')).toEqual([{ modelId: 'v55', flavorId: 'icy-mint', qty: 1 }]);
    expect(removeLine(base, 'nao::existe')).toHaveLength(2);
  });
});

describe('resolveCart / totais', () => {
  it('calcula linhas, unidades e subtotal com preço do catálogo', () => {
    const cart: Cart = [
      { modelId: 'v155', flavorId: 'menthol', qty: 2 },
      { modelId: 'elfbar-pro-40k', flavorId: 'pink-lemonade', qty: 1 },
    ];
    const lines = resolveCart(cart);
    expect(lines[0]).toMatchObject({
      key: 'v155::menthol',
      modelName: 'V155',
      flavorName: 'Menthol',
      unitCents: 11000,
      lineCents: 22000,
    });
    expect(subtotalCents(lines)).toBe(36000);
    expect(countUnits(cart)).toBe(3);
  });

  it('descarta linhas inválidas e normaliza qty', () => {
    const cart: Cart = [
      { modelId: 'x', flavorId: 'menthol', qty: 1 },
      { modelId: 'v155', flavorId: 'x', qty: 1 },
      { modelId: 'v55', flavorId: 'icy-mint', qty: 99 },
    ];
    const lines = resolveCart(cart);
    expect(lines).toHaveLength(1);
    expect(lines[0]?.qty).toBe(10);
  });

  it('carrinho vazio -> subtotal 0', () => {
    expect(subtotalCents(resolveCart([]))).toBe(0);
  });
});
