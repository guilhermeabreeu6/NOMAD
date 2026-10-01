import { describe, expect, it } from 'vitest';
import { REGIONS } from '../../src/data/catalog';
import { resolveCart } from '../../src/lib/cart';
import { computeTotals, parseRegionChoice, validateCheckout } from '../../src/lib/order';

const lines = resolveCart([{ modelId: 'v155', flavorId: 'menthol', qty: 1 }]); // R$ 110,00

describe('parseRegionChoice', () => {
  it('reconhece região, outra e inválidos', () => {
    expect(parseRegionChoice('lago-norte')).toMatchObject({ kind: 'region' });
    expect(parseRegionChoice('outra')).toEqual({ kind: 'other' });
    expect(parseRegionChoice('xx')).toBeNull();
    expect(parseRegionChoice('')).toBeNull();
    expect(parseRegionChoice(null)).toBeNull();
    expect(parseRegionChoice(undefined)).toBeNull();
  });
});

describe('computeTotals', () => {
  const expected: Record<string, number> = {
    'q700s-200': 11800,
    'q300n-600n': 12000,
    'q800-1200': 12000,
    'q1300s-1500s': 12500,
    'santo-amaro': 12500,
    'lago-norte': 13000,
    'bertaville-aurenys': 14000,
    'taquaralto-lago-sul': 14500,
    taquari: 14500,
  };

  it.each(REGIONS.map((r) => [r.id, r.feeCents] as const))('região %s (taxa %i)', (id, fee) => {
    const t = computeTotals(11000, parseRegionChoice(id));
    expect(t.feeCents).toBe(fee);
    expect(t.totalCents).toBe(expected[id]);
    expect(t.feeToArrange).toBe(false);
  });

  it('outra região: taxa a combinar, total = subtotal', () => {
    const t = computeTotals(11000, { kind: 'other' });
    expect(t).toEqual({ subtotalCents: 11000, feeCents: null, totalCents: 11000, feeToArrange: true });
  });

  it('sem região: total parcial', () => {
    const t = computeTotals(11000, null);
    expect(t).toEqual({ subtotalCents: 11000, feeCents: null, totalCents: 11000, feeToArrange: false });
  });
});

describe('validateCheckout', () => {
  it('carrinho vazio', () => {
    expect(validateCheckout({ lines: [], regionId: 'lago-norte', paymentId: 'pix' })).toEqual(['empty']);
  });
  it('sem região e pagamento: ordem region, payment', () => {
    expect(validateCheckout({ lines, regionId: null, paymentId: null })).toEqual(['region', 'payment']);
  });
  it('região inválida', () => {
    expect(validateCheckout({ lines, regionId: 'xx', paymentId: 'pix' })).toEqual(['region']);
  });
  it('pagamento inválido', () => {
    expect(validateCheckout({ lines, regionId: 'outra', paymentId: 'boleto' })).toEqual(['payment']);
  });
  it('válido', () => {
    expect(validateCheckout({ lines, regionId: 'lago-norte', paymentId: 'credito' })).toEqual([]);
  });
});
