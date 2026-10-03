import { describe, expect, it } from 'vitest';
import { MODELS, findPayment, findRegion } from '../../src/data/catalog';
import { resolveCart, type Cart } from '../../src/lib/cart';
import { parseRegionChoice } from '../../src/lib/order';
import { buildOrderMessage, buildWhatsAppUrl, sanitizeText, type OrderInput } from '../../src/lib/whatsapp';
import { B1, B2, B3, B4, EM_OUTUBRO, SEM_PROMO } from '../instants';

function input(cart: Cart, regionId: string, paymentId: string, nowMs: number = SEM_PROMO): OrderInput {
  const region = parseRegionChoice(regionId);
  const payment = findPayment(paymentId);
  if (!region || !payment) throw new Error('fixture inválida');
  return { lines: resolveCart(cart), region, payment, nowMs };
}

const happyCart: Cart = [
  { modelId: 'v155', flavorId: 'menthol', qty: 2 },
  { modelId: 'elfbar-pro-40k', flavorId: 'pink-lemonade', qty: 1 },
];

describe('buildOrderMessage', () => {
  it('caminho feliz segue a RN12 exatamente', () => {
    expect(buildOrderMessage(input(happyCart, 'lago-norte', 'pix'))).toBe(
      [
        'Olá! Quero fazer um pedido na NOMAD puffs:',
        '',
        'Itens:',
        '- 2x V155 - Menthol - R$ 220,00',
        '- 1x Elfbar Pro 40K - Pink Lemonade - R$ 140,00',
        '',
        'Subtotal: R$ 360,00',
        'Entrega: Lago Norte - R$ 20,00',
        'Pagamento: PIX (na entrega)',
        'Total: R$ 380,00',
      ].join('\n'),
    );
  });

  it('outra região', () => {
    const msg = buildOrderMessage(input(happyCart, 'outra', 'pix')).split('\n');
    expect(msg.slice(-4)).toEqual([
      'Subtotal: R$ 360,00',
      'Entrega: Outra região (a combinar)',
      'Pagamento: PIX (na entrega)',
      'Total: R$ 360,00 + entrega a combinar',
    ]);
  });

  it('cartão de crédito', () => {
    expect(buildOrderMessage(input(happyCart, 'taquari', 'credito'))).toContain(
      'Pagamento: Cartão de crédito (na entrega)',
    );
  });

  it('não contém emoji', () => {
    expect(buildOrderMessage(input(happyCart, 'taquari', 'credito'))).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it('pedido grande: 18 sabores x 10 mantém todas as linhas e URL < 4096', () => {
    const cart: Cart = MODELS.flatMap((m) => m.flavors.map((f) => ({ modelId: m.id, flavorId: f.id, qty: 10 })));
    expect(cart).toHaveLength(18);
    const msg = buildOrderMessage(input(cart, 'taquari', 'pix'));
    expect(msg.split('\n').filter((l) => l.startsWith('- '))).toHaveLength(18);
    expect(msg).toContain('Subtotal: R$ 22.050,00');
    expect(msg).toContain('Total: R$ 22.085,00');
    expect(buildWhatsAppUrl(msg).length).toBeLessThan(4096);
  });
});

describe('buildWhatsAppUrl', () => {
  const msg = 'Olá! Icy Mint + Peach Grape\nlinha 2';
  const url = buildWhatsAppUrl(msg);

  it('usa wa.me com o número da loja', () => {
    expect(url.startsWith('https://wa.me/5563981239498?text=')).toBe(true);
  });
  it('codifica + espaço quebra e acentos', () => {
    expect(url).toContain('%2B');
    expect(url).toContain('%20');
    expect(url).toContain('%0A');
    expect(url).toContain('Ol%C3%A1');
    expect(url).not.toContain('+');
  });
  it('ida e volta', () => {
    expect(decodeURIComponent(url.split('?text=')[1] ?? '')).toBe(msg);
  });
  it('valida telefone', () => {
    expect(() => buildWhatsAppUrl('x', '123')).toThrow();
    expect(() => buildWhatsAppUrl('x', '55639812394ab')).toThrow();
    expect(buildWhatsAppUrl('x', '556398123949').startsWith('https://wa.me/556398123949?')).toBe(true);
  });
});

describe('sanitizeText', () => {
  it('remove NUL, RLO, zero-width e normaliza quebras', () => {
    const dirty = ['a', String.fromCharCode(0), 'b', String.fromCharCode(0x202e), 'c', String.fromCharCode(0x200b), 'd'].join('');
    expect(sanitizeText(dirty)).toBe('a b c d');
    expect(sanitizeText('  a\r\nb  c ')).toBe('a b c');
    expect(sanitizeText('Icy Mint + Peach')).toBe('Icy Mint + Peach');
  });
  it('região existe para o teste de label', () => {
    expect(findRegion('lago-norte')?.label).toBe('Lago Norte');
  });
});

describe('buildOrderMessage com a promoção de frete de outubro (tabela 3.2 do 04-tech-lead)', () => {
  const cart: Cart = [{ modelId: 'v155', flavorId: 'menthol', qty: 1 }]; // R$ 110,00
  const tail = (regionId: string, nowMs: number): string[] =>
    buildOrderMessage(input(cart, regionId, 'pix', nowMs)).split('\n').slice(-4);

  it('região fixa sem promoção (setembro): igual a hoje', () => {
    expect(tail('q700s-200', SEM_PROMO)).toEqual([
      'Subtotal: R$ 110,00',
      'Entrega: Quadras 700 Sul a 200 Norte/Sul - R$ 8,00',
      'Pagamento: PIX (na entrega)',
      'Total: R$ 118,00',
    ]);
  });

  it.each([B2, EM_OUTUBRO, B3])('região participante com promoção ativa (%i): frete grátis e total = subtotal', (now) => {
    expect(tail('q700s-200', now)).toEqual([
      'Subtotal: R$ 110,00',
      'Entrega: Quadras 700 Sul a 200 Norte/Sul - Frete grátis (promoção de outubro)',
      'Pagamento: PIX (na entrega)',
      'Total: R$ 110,00',
    ]);
  });

  it.each([B1, B4])('região participante fora do período (%i): taxa normal', (now) => {
    const msg = tail('santo-amaro', now);
    expect(msg[1]).toBe('Entrega: Santo Amaro - R$ 15,00');
    expect(msg[3]).toBe('Total: R$ 125,00');
  });

  it('região excluída durante a promoção: taxa normal, sem mencionar a promoção', () => {
    const full = buildOrderMessage(input(cart, 'taquari', 'pix', EM_OUTUBRO));
    expect(full.split('\n').slice(-4)).toEqual([
      'Subtotal: R$ 110,00',
      'Entrega: Taquari - R$ 35,00',
      'Pagamento: PIX (na entrega)',
      'Total: R$ 145,00',
    ]);
    expect(full).not.toMatch(/grátis|promoção/i);
  });

  it.each([
    ['araras', 'Araras'],
    ['caribe', 'Caribe'],
    ['polinesia', 'Polinésia'],
  ])('área a combinar (%s) em qualquer data', (id, label) => {
    for (const now of [SEM_PROMO, EM_OUTUBRO, B4]) {
      expect(tail(id, now)).toEqual([
        'Subtotal: R$ 110,00',
        `Entrega: ${label} (taxa a combinar)`,
        'Pagamento: PIX (na entrega)',
        'Total: R$ 110,00 + entrega a combinar',
      ]);
    }
  });

  it('outra região durante a promoção: continua a combinar (igual a hoje)', () => {
    expect(tail('outra', EM_OUTUBRO)).toEqual([
      'Subtotal: R$ 110,00',
      'Entrega: Outra região (a combinar)',
      'Pagamento: PIX (na entrega)',
      'Total: R$ 110,00 + entrega a combinar',
    ]);
  });

  it('"Frete grátis (promoção de outubro)" só aparece no caso grátis', () => {
    const ids = ['q700s-200', 'lago-norte', 'araras', 'outra'];
    const hits = ids.filter((id) =>
      buildOrderMessage(input(cart, id, 'pix', EM_OUTUBRO)).includes('Frete grátis (promoção de outubro)'),
    );
    expect(hits).toEqual(['q700s-200']);
  });

  it('URL do caso grátis codifica acentos e faz ida e volta', () => {
    const msg = buildOrderMessage(input(cart, 'q800-1200', 'credito', EM_OUTUBRO));
    const url = buildWhatsAppUrl(msg);
    expect(url).toContain('gr%C3%A1tis');
    expect(decodeURIComponent(url.split('?text=')[1] ?? '')).toBe(msg);
  });
});
