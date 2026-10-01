import { STORE, type PaymentMethod } from '../data/catalog';
import { subtotalCents, type ResolvedLine } from './cart';
import { formatBRL } from './money';
import { computeTotals, type RegionChoice } from './order';

export interface OrderInput {
  lines: readonly ResolvedLine[];
  region: Exclude<RegionChoice, null>;
  payment: PaymentMethod;
}

// Faixas removidas (por codigo, sem depender de caracteres invisiveis no fonte):
// controles C0/C1, bidi overrides/isolates, zero-width e BOM.
const STRIP_RANGES: readonly (readonly [number, number])[] = [
  [0x0000, 0x001f],
  [0x007f, 0x009f],
  [0x200b, 0x200d],
  [0x202a, 0x202e],
  [0x2066, 0x2069],
  [0xfeff, 0xfeff],
];

function shouldStrip(code: number): boolean {
  return STRIP_RANGES.some(([from, to]) => code >= from && code <= to);
}

/** Remove controles, bidi overrides e zero-width; colapsa espacos. */
export function sanitizeText(s: string): string {
  let out = '';
  for (const ch of s) {
    out += shouldStrip(ch.codePointAt(0) ?? 0) ? ' ' : ch;
  }
  return out.replace(/\s+/g, ' ').trim();
}

export function buildOrderMessage(input: OrderInput): string {
  const subtotal = subtotalCents(input.lines);
  const totals = computeTotals(subtotal, input.region);
  const items = input.lines.map(
    (l) =>
      `- ${l.qty}x ${sanitizeText(l.modelName)} - ${sanitizeText(l.flavorName)} - ${formatBRL(l.lineCents)}`,
  );
  const delivery =
    input.region.kind === 'region' && totals.feeCents !== null
      ? `Entrega: ${sanitizeText(input.region.region.label)} - ${formatBRL(totals.feeCents)}`
      : 'Entrega: Outra região (a combinar)';
  const total = totals.feeToArrange
    ? `Total: ${formatBRL(subtotal)} + entrega a combinar`
    : `Total: ${formatBRL(totals.totalCents)}`;
  return [
    `Olá! Quero fazer um pedido na ${STORE.name}:`,
    '',
    'Itens:',
    ...items,
    '',
    `Subtotal: ${formatBRL(subtotal)}`,
    delivery,
    `Pagamento: ${sanitizeText(input.payment.label)} (na entrega)`,
    total,
  ].join('\n');
}

export function buildWhatsAppUrl(message: string, phoneE164: string = STORE.whatsappE164): string {
  if (!/^\d{12,13}$/.test(phoneE164)) throw new Error('Telefone inválido');
  return `https://wa.me/${phoneE164}?text=${encodeURIComponent(message)}`;
}
