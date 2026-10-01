import { MAX_QTY_PER_ITEM, findFlavor, findModel } from '../data/catalog';
import { clampQty, lineKey, type Cart, type CartLine } from './cart';

export interface KeyValueStore {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

export const CART_KEY = 'nomad:cart:v1';
export const AGE_KEY = 'nomad:age-ok:v1';

function memoryStore(): KeyValueStore {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

/** localStorage com teste de escrita; cai para memória se indisponível. */
export function getSafeStorage(): KeyValueStore {
  try {
    const ls = (globalThis as { localStorage?: KeyValueStore }).localStorage;
    if (!ls) return memoryStore();
    const probe = 'nomad:probe';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return memoryStore();
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Lê o carrinho salvo; qualquer dado inválido é descartado em silêncio. Nunca lê preço. */
export function loadCart(store: KeyValueStore): Cart {
  try {
    const raw = store.getItem(CART_KEY);
    if (!raw) return [];
    const data: unknown = JSON.parse(raw);
    if (!isRecord(data) || data['v'] !== 1 || !Array.isArray(data['lines'])) return [];
    const merged = new Map<string, CartLine>();
    for (const item of data['lines'] as unknown[]) {
      if (!isRecord(item)) continue;
      const m = item['m'];
      const f = item['f'];
      const q = item['q'];
      if (typeof m !== 'string' || typeof f !== 'string') continue;
      const model = findModel(m);
      if (!model || !findFlavor(model, f)) continue;
      if (typeof q !== 'number' || !Number.isInteger(q) || q < 1) continue;
      const qty = clampQty(q).qty;
      const key = lineKey(m, f);
      const prev = merged.get(key);
      merged.set(key, { modelId: m, flavorId: f, qty: Math.min(MAX_QTY_PER_ITEM, (prev?.qty ?? 0) + qty) });
    }
    return [...merged.values()];
  } catch {
    return [];
  }
}

export function saveCart(store: KeyValueStore, cart: Cart): void {
  try {
    const lines = cart.map((l) => ({ m: l.modelId, f: l.flavorId, q: l.qty }));
    store.setItem(CART_KEY, JSON.stringify({ v: 1, lines }));
  } catch {
    // quota/SecurityError: segue só em memória
  }
}
