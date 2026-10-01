import { OTHER_REGION_ID, findPayment, findRegion, type Region } from '../data/catalog';
import type { ResolvedLine } from './cart';

export type RegionChoice = { kind: 'region'; region: Region } | { kind: 'other' } | null;

export function parseRegionChoice(id: string | null | undefined): RegionChoice {
  if (!id) return null;
  if (id === OTHER_REGION_ID) return { kind: 'other' };
  const region = findRegion(id);
  return region ? { kind: 'region', region } : null;
}

export interface Totals {
  subtotalCents: number;
  feeCents: number | null;
  totalCents: number;
  feeToArrange: boolean;
}

export function computeTotals(subtotal: number, region: RegionChoice): Totals {
  if (region?.kind === 'region') {
    return {
      subtotalCents: subtotal,
      feeCents: region.region.feeCents,
      totalCents: subtotal + region.region.feeCents,
      feeToArrange: false,
    };
  }
  return {
    subtotalCents: subtotal,
    feeCents: null,
    totalCents: subtotal,
    feeToArrange: region?.kind === 'other',
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
