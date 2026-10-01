import { describe, expect, it } from 'vitest';
import {
  FLAVOR_TOKENS,
  MAX_QTY_PER_ITEM,
  MODELS,
  OTHER_REGION_ID,
  PAYMENT_METHODS,
  REGIONS,
  STORE,
  findFlavor,
  findModel,
  findPayment,
  findRegion,
} from '../../src/data/catalog';
import { PRODUCT_IMAGES } from '../../src/data/product-images';

describe('catálogo', () => {
  it('tem os 4 modelos com preços corretos', () => {
    expect(MODELS.map((m) => [m.id, m.name, m.priceCents])).toEqual([
      ['v55', 'V55', 8500],
      ['v155', 'V155', 11000],
      ['v400-mix-slim', 'V400 Mix Slim', 14000],
      ['elfbar-pro-40k', 'Elfbar Pro 40K', 14000],
    ]);
  });

  it('lista exata de sabores, na ordem', () => {
    const names = (id: string): string[] => (findModel(id)?.flavors ?? []).map((f) => f.name);
    expect(names('v55')).toEqual(['Pineapple Ice', 'Uva Ice', 'Icy Mint']);
    expect(names('v155')).toEqual(['Pineapple Ice', 'Menthol', 'Grape Ice', 'Watermelon Ice', 'Icy Mint']);
    expect(names('v400-mix-slim')).toEqual([
      'Icy Mint + Peach Grape',
      'Menthol + Mighty Melon',
      'Mango + Passion Fruit Guava',
      'Strawberry Grape Ice + Kiwi Watermelon',
      'Cherry + Grape',
    ]);
    expect(names('elfbar-pro-40k')).toEqual([
      'Sour Apple Ice',
      'Strawberry Blend',
      'Pink Lemonade',
      'Watermelon + Peach Frost',
      'Tropical Baja',
    ]);
  });

  it('tem as 9 regiões com labels e taxas exatos', () => {
    expect(REGIONS.map((r) => [r.label, r.feeCents])).toEqual([
      ['Quadras 700 Sul a 200 Norte/Sul', 800],
      ['Quadras 300 Norte a 600 Norte', 1000],
      ['Quadras 800 a 1200', 1000],
      ['Quadras 1300 a 1500 Sul', 1500],
      ['Santo Amaro', 1500],
      ['Lago Norte', 2000],
      ['Bertaville e Aurenys', 3000],
      ['Taquaralto e Lago Sul', 3500],
      ['Taquari', 3500],
    ]);
    expect(findRegion(OTHER_REGION_ID)).toBeUndefined();
  });

  it('tem 3 formas de pagamento', () => {
    expect(PAYMENT_METHODS.map((p) => p.label)).toEqual(['PIX', 'Cartão de débito', 'Cartão de crédito']);
    expect(findPayment('pix')?.label).toBe('PIX');
    expect(findPayment('x')).toBeUndefined();
  });

  it('WhatsApp e limite de quantidade', () => {
    expect(STORE.whatsappE164).toBe('5563981239498');
    expect(MAX_QTY_PER_ITEM).toBe(10);
  });

  it('ids únicos, slugs válidos e dots válidos', () => {
    const slug = /^[a-z0-9-]+$/;
    expect(new Set(MODELS.map((m) => m.id)).size).toBe(MODELS.length);
    expect(new Set(REGIONS.map((r) => r.id)).size).toBe(REGIONS.length);
    for (const m of MODELS) {
      expect(m.id).toMatch(slug);
      expect(new Set(m.flavors.map((f) => f.id)).size).toBe(m.flavors.length);
      for (const f of m.flavors) {
        expect(f.id).toMatch(slug);
        expect(f.dots.length).toBeGreaterThan(0);
        for (const d of f.dots) expect(FLAVOR_TOKENS).toContain(d);
      }
    }
  });

  it('findFlavor encontra e falha corretamente', () => {
    const v155 = findModel('v155');
    expect(v155).toBeDefined();
    if (!v155) return;
    expect(findFlavor(v155, 'menthol')?.name).toBe('Menthol');
    expect(findFlavor(v155, 'nao-existe')).toBeUndefined();
    expect(findModel('nope')).toBeUndefined();
  });

  it('todo modelo tem imagem', () => {
    for (const m of MODELS) expect(PRODUCT_IMAGES[m.id]).toBeDefined();
  });
});
