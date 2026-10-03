import {
  OTHER_REGION_ID,
  findArrangeArea,
  findPayment,
  findRegion,
  type ArrangeArea,
  type Region,
} from '../data/catalog';
import { DELIVERY_PROMOS, type DeliveryPromo } from '../data/promos';
import type { ResolvedLine } from './cart';
import { activePromo, activePromoFor } from './promo';

export type RegionChoice =
  | { kind: 'region'; region: Region }
  | { kind: 'arrange'; area: ArrangeArea }
  | { kind: 'other' }
  | null;

export function parseRegionChoice(id: string | null | undefined): RegionChoice {
  if (!id) return null;
  if (id === OTHER_REGION_ID) return { kind: 'other' };
  const region = findRegion(id);
  if (region) return { kind: 'region', region };
  const area = findArrangeArea(id);
  return area ? { kind: 'arrange', area } : null;
}

/** Cotação da entrega no instante `nowMs`: fonte única para tela e mensagem. */
export type DeliveryQuote =
  /** Taxa da tabela. `excludedFrom` != null quando há promoção ativa, mas a região não participa. */
  | { kind: 'fixed'; feeCents: number; region: Region; excludedFrom: DeliveryPromo | null }
  | { kind: 'free'; feeCents: 0; baseFeeCents: number; region: Region; promo: DeliveryPromo }
  /** Área a combinar (Araras/Caribe/Polinésia) ou "Outra região". */
  | { kind: 'arrange'; area: ArrangeArea | null }
  | { kind: 'unselected' };

export function quoteDelivery(
  choice: RegionChoice,
  nowMs: number,
  promos: readonly DeliveryPromo[] = DELIVERY_PROMOS,
): DeliveryQuote {
  if (!choice) return { kind: 'unselected' };
  if (choice.kind === 'other') return { kind: 'arrange', area: null };
  if (choice.kind === 'arrange') return { kind: 'arrange', area: choice.area };
  const { region } = choice;
  const promo = activePromoFor(region.id, nowMs, promos);
  if (promo) return { kind: 'free', feeCents: 0, baseFeeCents: region.feeCents, region, promo };
  return { kind: 'fixed', feeCents: region.feeCents, region, excludedFrom: activePromo(nowMs, promos) };
}

export interface Totals {
  subtotalCents: number;
  /** 0 quando grátis; null quando a combinar ou região não escolhida. */
  feeCents: number | null;
  totalCents: number;
  feeToArrange: boolean;
  quote: DeliveryQuote;
}

/** `nowMs` é obrigatório: a taxa depende do instante (promoções de frete). */
export function computeTotals(subtotal: number, region: RegionChoice, nowMs: number): Totals {
  const quote = quoteDelivery(region, nowMs);
  if (quote.kind === 'fixed' || quote.kind === 'free') {
    return {
      subtotalCents: subtotal,
      feeCents: quote.feeCents,
      totalCents: subtotal + quote.feeCents,
      feeToArrange: false,
      quote,
    };
  }
  return {
    subtotalCents: subtotal,
    feeCents: null,
    totalCents: subtotal,
    feeToArrange: quote.kind === 'arrange',
    quote,
  };
}

export type CheckoutError = 'empty' | 'region' | 'payment';

export function validateCheckout(input: {
  lines: readonly ResolvedLine[];
  regionId: string | null;
  paymentId: string | null;
}): CheckoutError[] {
  if (input.lines.length === 0) return ['empty'];
  const errors: CheckoutError[] = [];
  if (!parseRegionChoice(input.regionId)) errors.push('region');
  if (!input.paymentId || !findPayment(input.paymentId)) errors.push('payment');
  return errors;
}
