import { AGE_KEY, type KeyValueStore } from './storage';

export function isAgeConfirmed(store: KeyValueStore): boolean {
  try {
    return store.getItem(AGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function confirmAge(store: KeyValueStore): void {
  try {
    store.setItem(AGE_KEY, '1');
  } catch {
    // falha silenciosa: segue na sessão
  }
}
