import { getSafeStorage } from '../lib/storage';
import { systemClock } from './clock';
import { createStore } from './store';
import { initAgeGate } from './ui/age-gate';
import { initCartDialog } from './ui/cart-dialog';
import { qs } from './ui/dom';
import { createAnnouncer } from './ui/live-region';
import { initModelNav } from './ui/model-nav';
import { initProductCards } from './ui/product-card';
import { watchPromoPhase } from './ui/promo-state';

const storage = getSafeStorage();
const live = createAnnouncer(qs(document, '[data-live]'));
const store = createStore(storage);

watchPromoPhase(systemClock);
initAgeGate(storage);
initProductCards(store, live);
initCartDialog(store, live, systemClock);
initModelNav();
