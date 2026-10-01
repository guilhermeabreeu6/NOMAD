import { confirmAge, isAgeConfirmed } from '../../lib/age-gate';
import type { KeyValueStore } from '../../lib/storage';
import { actionOf, qs } from './dom';

/** Gate 18+ declaratório. Retorna true se o app já está liberado. */
export function initAgeGate(storage: KeyValueStore): boolean {
  const root = document.documentElement;
  const app = qs(document, '#app');
  const gate = qs(document, '[data-age-gate]');
  const ask = qs(gate, '[data-gate-ask]');
  const denied = qs(gate, '[data-gate-denied]');
  const askTitle = qs(gate, '[data-gate-title]');
  const deniedTitle = qs(gate, '[data-denied-title]');

  const release = (): void => {
    root.setAttribute('data-age', 'ok');
    app.removeAttribute('inert');
    app.removeAttribute('aria-hidden');
  };

  if (isAgeConfirmed(storage)) {
    release();
    return true;
  }

  askTitle.focus();

  gate.addEventListener('click', (ev) => {
    const hit = actionOf(ev.target);
    if (!hit) return;
    if (hit.action === 'age-yes') {
      confirmAge(storage);
      release();
      qs(document, '[data-hero-title]').focus();
    } else if (hit.action === 'age-no') {
      // Recusa não grava nada (RN9/D2): recarregar reabre a pergunta.
      ask.hidden = true;
      denied.hidden = false;
      deniedTitle.focus();
    } else if (hit.action === 'age-back') {
      denied.hidden = true;
      ask.hidden = false;
      askTitle.focus();
    }
  });
  return false;
}
