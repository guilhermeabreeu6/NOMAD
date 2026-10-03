// Entrada da landing /outubro: sem carrinho (só gate, estado da promoção e contador).
import { getSafeStorage } from '../lib/storage';
import { systemClock } from './clock';
import { initAgeGate } from './ui/age-gate';
import { initPromoCountdown } from './ui/promo-countdown';
import { watchPromoPhase } from './ui/promo-state';

watchPromoPhase(systemClock);
initAgeGate(getSafeStorage());
initPromoCountdown(systemClock);
