// Testes de borda do QA (independentes dos testes do dev): valores conferidos
// direto contra o CLAUDE.md e entradas hostis.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MODELS, PAYMENT_METHODS, REGIONS, STORE, findFlavor, findModel, findPayment, findRegion } from '../../src/data/catalog';
import { addItem, clampQty, removeLine, resolveCart, setQty, subtotalCents, type Cart, type ResolvedLine } from '../../src/lib/cart';
import { confirmAge, isAgeConfirmed } from '../../src/lib/age-gate';
import { formatBRL } from '../../src/lib/money';
import { computeTotals, parseRegionChoice, validateCheckout } from '../../src/lib/order';
import { CART_KEY, loadCart, type KeyValueStore } from '../../src/lib/storage';
import { buildOrderMessage, buildWhatsAppUrl, sanitizeText } from '../../src/lib/whatsapp';
import { SEM_PROMO } from '../instants';

const claude = readFileSync(new URL('../../CLAUDE.md', import.meta.url), 'utf8');
const rows = (header: RegExp): string[][] => {
  const lines = claude.split('\n');
  const start = lines.findIndex((l) => header.test(l));
  const out: string[][] = [];
  for (let i = start + 2; i < lines.length && lines[i]?.startsWith('|'); i++) {
    out.push((lines[i] ?? '').split('|').slice(1, -1).map((c) => c.trim()));
  }
  return out;
};
const reais = (s: string): number => Number(/R\$\s*(\d+)/.exec(s)?.[1]) * 100;

describe('catálogo x CLAUDE.md (fonte da verdade)', () => {
  const table = rows(/^\| Modelo \| Preço \| Sabores \|/);
  it('a tabela do CLAUDE.md foi lida (4 modelos)', () => {
    expect(table).toHaveLength(4);
  });
  it.each([0, 1, 2, 3])('modelo %i: nome, preço e sabores idênticos, na mesma ordem', (i) => {
    const [name, price, flavors] = table[i] ?? [];
    const m = MODELS[i];
    expect(m?.name).toBe(name);
    expect(m?.priceCents).toBe(reais(price ?? ''));
    expect(m?.flavors.map((f) => f.name)).toEqual((flavors ?? '').split(', '));
  });
  it('V400: sabores literais (guarda contra o erro de digitação da RN1 do PO)', () => {
    expect(findModel('v400-mix-slim')?.flavors.map((f) => f.name)).toEqual([
      'Icy Mint + Peach Grape',
      'Menthol + Mighty Melon',
      'Mango + Passion Fruit Guava',
      'Strawberry Grape Ice + Kiwi Watermelon',
      'Cherry + Grape',
    ]);
  });
  it('taxas e rótulos das 9 regiões idênticos ao CLAUDE.md', () => {
    const t = rows(/^\| Região \| Taxa \|/);
    expect(t).toHaveLength(9);
    expect(REGIONS.map((r) => [r.label, r.feeCents])).toEqual(t.map(([l, f]) => [l, reais(f ?? '')]));
  });
  it('pagamentos exatos e número do WhatsApp', () => {
    expect(PAYMENT_METHODS.map((p) => p.label)).toEqual(['PIX', 'Cartão de débito', 'Cartão de crédito']);
    expect(STORE.whatsappE164).toBe('5563981239498');
    expect(claude).toContain('(63) 98123-9498');
  });
  it('ids de sabor únicos por modelo e preço inteiro em centavos', () => {
    for (const m of MODELS) {
      expect(new Set(m.flavors.map((f) => f.id)).size).toBe(m.flavors.length);
      expect(Number.isInteger(m.priceCents)).toBe(true);
    }
  });
});

describe('quantidade (0 / 11 / negativa / lixo)', () => {
  it.each([
    [0, 1, 'invalid'],
    [-1, 1, 'invalid'],
    [-100, 1, 'invalid'],
    [11, 10, 'max'],
    [1000, 10, 'max'],
    [10, 10, null],
    [1, 1, null],
    [0.5, 1, 'invalid'],
    [Number.NaN, 1, 'invalid'],
    [Number.POSITIVE_INFINITY, 1, 'invalid'],
    [Number.NEGATIVE_INFINITY, 1, 'invalid'],
    ['-3', 1, 'invalid'],
    ['1e1', 1, 'invalid'],
    ['0x5', 1, 'invalid'],
    [' 7 ', 7, null],
    ['', 1, 'invalid'],
    [undefined, 1, 'invalid'],
    [{}, 1, 'invalid'],
    [[5], 1, 'invalid'],
    [true, 1, 'invalid'],
  ])('clampQty(%j) -> %i (%s)', (raw, qty, clamped) => {
    expect(clampQty(raw)).toEqual({ qty, clamped });
  });

  it('addItem com qty 0/11/negativa nunca cria linha inválida', () => {
    for (const q of [0, -5, 11, 99, Number.NaN]) {
      const { cart } = addItem([], 'v55', 'icy-mint', q);
      expect(cart).toHaveLength(1);
      expect(cart[0]?.qty).toBeGreaterThanOrEqual(1);
      expect(cart[0]?.qty).toBeLessThanOrEqual(10);
    }
  });
  it('setQty inexistente não altera o carrinho e setQty(0) vira 1 (nunca remove)', () => {
    const c: Cart = [{ modelId: 'v55', flavorId: 'icy-mint', qty: 4 }];
    expect(setQty(c, 'nao::existe', 9).cart).toEqual(c);
    expect(setQty(c, 'v55::icy-mint', 0).cart[0]?.qty).toBe(1);
    expect(setQty(c, 'v55::icy-mint', 11)).toMatchObject({ hitMax: true });
  });
  it('removeLine de chave inexistente é no-op', () => {
    const c: Cart = [{ modelId: 'v55', flavorId: 'icy-mint', qty: 4 }];
    expect(removeLine(c, 'x::y')).toEqual(c);
  });
});

describe('sabor / modelo / região inexistentes', () => {
  it.each([
    ['v55', 'menthol'],
    ['v155', 'uva-ice'],
    ['nao-existe', 'menthol'],
    ['', ''],
    ['__proto__', 'x'],
    ['constructor', 'constructor'],
    ['V55', 'icy-mint'],
  ])('addItem(%j, %j) lança', (m, f) => {
    expect(() => addItem([], m, f, 1)).toThrow();
  });
  it('findModel/findRegion/findPayment não resolvem chaves de protótipo', () => {
    for (const k of ['__proto__', 'constructor', 'toString', 'hasOwnProperty']) {
      expect(findModel(k)).toBeUndefined();
      expect(findRegion(k)).toBeUndefined();
      expect(findPayment(k)).toBeUndefined();
      expect(parseRegionChoice(k)).toBeNull();
    }
    const v55 = findModel('v55');
    expect(v55 && findFlavor(v55, '__proto__')).toBeUndefined();
  });
  it.each([null, undefined, '', ' ', 'LAGO-NORTE', 'lago norte', 'Lago Norte', 'lago-norte '])(
    'parseRegionChoice(%j) -> null (id é case/espaço sensível)',
    (id) => {
      expect(parseRegionChoice(id)).toBeNull();
    },
  );
  it('validateCheckout: região/pagamento inexistentes, vazio e ordem dos erros', () => {
    const lines = resolveCart([{ modelId: 'v55', flavorId: 'icy-mint', qty: 1 }]);
    expect(validateCheckout({ lines, regionId: 'marte', paymentId: 'boleto' })).toEqual(['region', 'payment']);
    expect(validateCheckout({ lines, regionId: 'outra', paymentId: 'pix' })).toEqual([]);
    expect(validateCheckout({ lines: [], regionId: 'outra', paymentId: 'pix' })).toEqual(['empty']);
  });
});

describe('preços: o carrinho usa sempre o catálogo atual', () => {
  it('resolveCart ignora preço injetado na linha', () => {
    const hostile = [{ modelId: 'v55', flavorId: 'icy-mint', qty: 2, unitCents: 1, lineCents: 2, priceCents: 1 }] as unknown as Cart;
    const [l] = resolveCart(hostile);
    expect(l?.unitCents).toBe(8500);
    expect(l?.lineCents).toBe(17000);
  });
  it('subtotal e total com todos os modelos x qtd 10 (soma independente)', () => {
    const cart: Cart = MODELS.flatMap((m) => m.flavors.map((f) => ({ modelId: m.id, flavorId: f.id, qty: 10 })));
    const lines = resolveCart(cart);
    expect(subtotalCents(lines)).toBe(22050 * 100);
    const t = computeTotals(subtotalCents(lines), parseRegionChoice('taquaralto-lago-sul'), SEM_PROMO);
    expect(formatBRL(t.totalCents)).toBe('R$ 22.085,00');
  });
  it('"outra" e região nula não somam taxa', () => {
    expect(computeTotals(11000, parseRegionChoice('outra'), SEM_PROMO)).toMatchObject({ subtotalCents: 11000, feeCents: null, totalCents: 11000, feeToArrange: true });
    expect(computeTotals(11000, null, SEM_PROMO)).toMatchObject({ feeCents: null, feeToArrange: false });
  });
});

function line(over: Partial<ResolvedLine>): ResolvedLine {
  return { modelId: 'v55', flavorId: 'icy-mint', qty: 1, key: 'v55::icy-mint', modelName: 'V55', flavorName: 'Icy Mint', unitCents: 8500, lineCents: 8500, ...over };
}
const region = parseRegionChoice('lago-norte');
const pix = findPayment('pix');

describe('mensagem/URL do WhatsApp com texto hostil', () => {
  const payloads = [
    'Ação & "aspas" <script>alert(1)</script> #hash ?q=1 %41 +plus',
    'linha1\nlinha2\r\nlinha3',
    '日本語 émoji 😀 çãõ',
    '&text=INJETADO&phone=5511999999999',
    '%0A%0AINJETADO',
    'a‮b​c\u0000d',
  ];
  for (const p of payloads) {
    it(`URL mantém um único parâmetro text e ida-e-volta íntegra: ${JSON.stringify(p).slice(0, 40)}`, () => {
      if (!region || !pix) throw new Error('fixture');
      const msg = buildOrderMessage({ lines: [line({ flavorName: p })], region, payment: pix, nowMs: SEM_PROMO });
      const url = buildWhatsAppUrl(msg);
      const u = new URL(url);
      expect(u.host).toBe('wa.me');
      expect(u.pathname).toBe('/5563981239498');
      expect([...u.searchParams.keys()]).toEqual(['text']);
      expect(u.hash).toBe('');
      expect(url.slice(url.indexOf('?text=') + 6)).toMatch(/^[A-Za-z0-9\-_.!~*'()%]*$/);
      expect(u.searchParams.get('text')).toBe(msg);
      // quebras de linha injetadas viram espaço: a estrutura (nº de linhas) não muda
      expect(msg.split('\n')).toHaveLength(9);
      expect(Array.from(msg.replaceAll(String.fromCharCode(10), '')).filter((c) => /[\p{Cc}\p{Cf}]/u.test(c))).toEqual([]);
    });
  }
  it('unicode (acentos, CJK, emoji) faz ida e volta pela URL', () => {
    const s = 'Olá ção 日本 😀';
    expect(decodeURIComponent(buildWhatsAppUrl(s).split('?text=')[1] ?? '')).toBe(s);
  });
  it('sanitizeText: texto vazio e só controles', () => {
    expect(sanitizeText('')).toBe('');
    expect(sanitizeText('\u0000​‮')).toBe('');
  });
  it('buildWhatsAppUrl rejeita telefone com injeção', () => {
    for (const bad of ['5563981239498/../x', '5563981239498?x=1', '+5563981239498', '', ' 5563981239498', '5563981239498\n']) {
      expect(() => buildWhatsAppUrl('x', bad)).toThrow();
    }
  });
});

describe('localStorage hostil', () => {
  const mem = (raw: string | null): KeyValueStore => ({
    getItem: (k) => (k === CART_KEY ? raw : null),
    setItem: () => undefined,
    removeItem: () => undefined,
  });
  it.each([
    ['__proto__ como modelo', '{"v":1,"lines":[{"m":"__proto__","f":"x","q":1}]}'],
    ['constructor', '{"v":1,"lines":[{"m":"constructor","f":"constructor","q":1}]}'],
    ['__proto__ na raiz', '{"__proto__":{"v":1},"lines":[]}'],
    ['5000 itens inválidos', JSON.stringify({ v: 1, lines: Array.from({ length: 5000 }, () => ({ m: 'nope', f: 'x', q: 1 })) })],
    ['aninhado', '[[[[[[[[[[]]]]]]]]]]'],
    ['número', '42'],
    ['string JSON', '"texto"'],
    ['true', 'true'],
  ])('%s -> carrinho vazio sem exceção', (_n, raw) => {
    expect(loadCart(mem(raw))).toEqual([]);
  });
  it('mil duplicatas válidas somam no teto de 10', () => {
    const lines = Array.from({ length: 1000 }, () => ({ m: 'v55', f: 'icy-mint', q: 3 }));
    expect(loadCart(mem(JSON.stringify({ v: 1, lines })))).toEqual([{ modelId: 'v55', flavorId: 'icy-mint', qty: 10 }]);
  });
  it('getItem retornando não-string não quebra o gate', () => {
    const s = { getItem: () => 1 as unknown as string, setItem: () => undefined, removeItem: () => undefined };
    expect(isAgeConfirmed(s)).toBe(false);
  });
  it('gate: só "1" confirma; confirmAge grava e isAgeConfirmed lê', () => {
    const data = new Map<string, string>();
    const s: KeyValueStore = { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
    expect(isAgeConfirmed(s)).toBe(false);
    confirmAge(s);
    expect(isAgeConfirmed(s)).toBe(true);
    for (const v of ['true', 'yes', '01', ' 1', '1 ', '']) {
      data.set('nomad:age-ok:v1', v);
      expect(isAgeConfirmed(s)).toBe(false);
    }
  });
});
