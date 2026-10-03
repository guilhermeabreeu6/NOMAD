import { FRETE_OUTUBRO, type DeliveryPromo } from '../../data/promos';
import { nextBoundaryMs, promoPhase } from '../../lib/promo';
import type { Clock } from '../clock';

/** Evento disparado no document quando a fase da promoção muda com a página aberta. */
export const PROMO_PHASE_EVENT = 'nomad:promo-phase';

// setTimeout aceita no máximo 2^31-1 ms (~24,8 dias); acima disso reagenda.
const MAX_DELAY = 2_147_483_647;

/**
 * Mantém `html[data-promo]` coerente com o relógio. O valor inicial já vem do build e é corrigido
 * antes da primeira pintura por public/age-init.js; aqui só tratamos a virada com a página aberta
 * (timer até a próxima fronteira) e a volta do segundo plano (visibilitychange).
 */
export function watchPromoPhase(clock: Clock, promo: DeliveryPromo = FRETE_OUTUBRO): void {
  const root = document.documentElement;
  let timer: number | undefined;

  const sync = (): void => {
    const now = clock();
    const phase = promoPhase(promo, now);
    if (root.dataset['promo'] !== phase) {
      root.dataset['promo'] = phase;
      document.dispatchEvent(new CustomEvent(PROMO_PHASE_EVENT, { detail: phase }));
    }
    window.clearTimeout(timer);
    const next = nextBoundaryMs(promo, now);
    if (next !== null) timer = window.setTimeout(sync, Math.min(Math.max(next - now, 0), MAX_DELAY));
  };

  sync();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') sync();
  });
}
