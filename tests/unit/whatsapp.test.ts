import { describe, expect, it } from 'vitest';
import { MODELS, findPayment, findRegion } from '../../src/data/catalog';
import { resolveCart, type Cart } from '../../src/lib/cart';
import { parseRegionChoice } from '../../src/lib/order';
import { buildOrderMessage, buildWhatsAppUrl, sanitizeText, type OrderInput } from '../../src/lib/whatsapp';

function input(cart: Cart, regionId: string, paymentId: string): OrderInput {
  const region = parseRegionChoice(regionId);
  const payment = findPayment(paymentId);
  if (!region || !payment) throw new Error('fixture inválida');
  return { lines: resolveCart(cart), region, payment };
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
