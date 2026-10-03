import { FRETE_OUTUBRO } from '../../data/promos';
import { countdownText } from '../../lib/promo';
import type { Clock } from '../clock';
import { setText } from './dom';
import { PROMO_PHASE_EVENT } from './promo-state';

/** Contador discreto da landing ("Termina em N dias"). Sem aria-live: calculado no load e na virada de fase. */
export function initPromoCountdown(clock: Clock): void {
  const el = document.querySelector<HTMLElement>('[data-countdown]');
  const text = el?.querySelector<HTMLElement>('[data-countdown-text]');
  if (!el || !text) return;
  const render = (): void => {
    const value = countdownText(FRETE_OUTUBRO, clock());
    el.hidden = value === null;
    if (value !== null) setText(text, value);
  };
  render();
  document.addEventListener(PROMO_PHASE_EVENT, render);
}
