import type { Cart } from '../lib/cart';
import { loadCart, saveCart, type KeyValueStore } from '../lib/storage';

export interface State {
  readonly cart: Cart;
  readonly regionId: string | null;
  readonly paymentId: string | null;
}

export interface Store {
  get(): State;
  subscribe(fn: (state: State) => void): void;
  setCart(cart: Cart): void;
  setRegion(id: string | null): void;
  setPayment(id: string | null): void;
}

/** Estado em memória + pub/sub. Só o carrinho é persistido (região/pagamento não: minimização de dados). */
export function createStore(storage: KeyValueStore): Store {
  let state: State = { cart: loadCart(storage), regionId: null, paymentId: null };
  const listeners: ((s: State) => void)[] = [];
  const emit = (): void => {
    for (const fn of listeners) fn(state);
  };
  return {
    get: () => state,
    subscribe(fn) {
      listeners.push(fn);
    },
    setCart(cart) {
      state = { ...state, cart };
      saveCart(storage, cart);
      emit();
    },
    setRegion(id) {
      state = { ...state, regionId: id };
      emit();
    },
    setPayment(id) {
      state = { ...state, paymentId: id };
      emit();
    },
  };
}
