import { MAX_QTY_PER_ITEM, findFlavor, findModel } from '../data/catalog';

export interface CartLine {
  readonly modelId: string;
  readonly flavorId: string;
  readonly qty: number;
}
export type Cart = readonly CartLine[];

export interface ResolvedLine extends CartLine {
  readonly key: string;
  readonly modelName: string;
  readonly flavorName: string;
  readonly unitCents: number;
  readonly lineCents: number;
}

export const lineKey = (modelId: string, flavorId: string): string => `${modelId}::${flavorId}`;

/** Normaliza quantidade: inteiro 1..MAX; >MAX -> MAX ('max'); inválido -> 1 ('invalid'). */
export function clampQty(raw: unknown): { qty: number; clamped: 'max' | 'invalid' | null } {
  let n: number;
  if (typeof raw === 'number') {
    n = raw;
  } else if (typeof raw === 'string' && /^\s*\d+\s*$/.test(raw)) {
    n = Number(raw);
  } else {
    return { qty: 1, clamped: 'invalid' };
  }
  if (!Number.isInteger(n) || n < 1) return { qty: 1, clamped: 'invalid' };
  if (n > MAX_QTY_PER_ITEM) return { qty: MAX_QTY_PER_ITEM, clamped: 'max' };
  return { qty: n, clamped: null };
}

export function addItem(
  cart: Cart,
  modelId: string,
  flavorId: string,
  qty: number,
): { cart: Cart; hitMax: boolean } {
  const model = findModel(modelId);
  if (!model || !findFlavor(model, flavorId)) {
    throw new Error(`Item inexistente: ${modelId}/${flavorId}`);
  }
  const add = clampQty(qty);
  const key = lineKey(modelId, flavorId);
  const existing = cart.find((l) => lineKey(l.modelId, l.flavorId) === key);
  if (!existing) {
    return { cart: [...cart, { modelId, flavorId, qty: add.qty }], hitMax: add.clamped === 'max' };
  }
  const sum = existing.qty + add.qty;
  const hitMax = sum > MAX_QTY_PER_ITEM;
  const next = Math.min(sum, MAX_QTY_PER_ITEM);
  return {
    cart: cart.map((l) => (lineKey(l.modelId, l.flavorId) === key ? { ...l, qty: next } : l)),
    hitMax,
  };
}

export function setQty(cart: Cart, key: string, qty: number): { cart: Cart; hitMax: boolean } {
  const c = clampQty(qty);
  return {
    cart: cart.map((l) => (lineKey(l.modelId, l.flavorId) === key ? { ...l, qty: c.qty } : l)),
    hitMax: c.clamped === 'max',
  };
}

export function removeLine(cart: Cart, key: string): Cart {
  return cart.filter((l) => lineKey(l.modelId, l.flavorId) !== key);
}

export function resolveCart(cart: Cart): ResolvedLine[] {
  const out: ResolvedLine[] = [];
  for (const l of cart) {
    const model = findModel(l.modelId);
    const flavor = model ? findFlavor(model, l.flavorId) : undefined;
    if (!model || !flavor) continue;
    const qty = clampQty(l.qty).qty;
    out.push({
      modelId: l.modelId,
      flavorId: l.flavorId,
      qty,
      key: lineKey(l.modelId, l.flavorId),
      modelName: model.name,
      flavorName: flavor.name,
      unitCents: model.priceCents,
      lineCents: model.priceCents * qty,
    });
  }
  return out;
}

export function countUnits(cart: Cart): number {
  return cart.reduce((sum, l) => sum + l.qty, 0);
}

export function subtotalCents(lines: readonly ResolvedLine[]): number {
  return lines.reduce((sum, l) => sum + l.lineCents, 0);
}
