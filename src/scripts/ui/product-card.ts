import { MAX_QTY_PER_ITEM, findModel } from '../../data/catalog';
import { addItem, clampQty } from '../../lib/cart';
import { formatBRL } from '../../lib/money';
import type { Store } from '../store';
import { actionOf, qs, qsa, setText } from './dom';
import type { Announcer } from './live-region';

function initCard(card: HTMLElement, store: Store, live: Announcer): void {
  const modelId = card.dataset['product'] ?? '';
  const model = findModel(modelId);
  if (!model) return;

  const group = qs<HTMLFieldSetElement>(card, '[data-flavors]');
  const flavorError = qs(card, '[data-error="flavor"]');
  const qtyInput = qs<HTMLInputElement>(card, '[data-qty]');
  const stepper = qs(card, '[data-stepper]');
  const dec = qs<HTMLButtonElement>(card, '[data-action="dec"]');
  const qtyMsg = qs(card, '[data-qty-msg]');
  const addBtn = qs<HTMLButtonElement>(card, '[data-action="add"]');
  const addLabel = qs(card, '[data-add-label]');
  const radios = qsa<HTMLInputElement>(card, 'input[type="radio"]');
  let doneTimer: number | undefined;

  const selectedFlavorId = (): string | null => radios.find((r) => r.checked)?.value ?? null;
  const qty = (): number => clampQty(qtyInput.value).qty;

  const refresh = (): void => {
    dec.disabled = qty() <= 1;
    if (addBtn.classList.contains('is-done')) return;
    setText(
      addLabel,
      selectedFlavorId()
        ? `Adicionar ao carrinho - ${formatBRL(model.priceCents * qty())}`
        : 'Adicionar ao carrinho',
    );
  };

  const showMax = (): void => {
    qtyMsg.hidden = false;
    stepper.classList.remove('is-shake');
    stepper.getBoundingClientRect(); // força reflow para reiniciar a animação
    stepper.classList.add('is-shake');
  };

  const setQtyValue = (n: number): void => {
    qtyInput.value = String(n);
    refresh();
  };

  const clearFlavorError = (): void => {
    flavorError.hidden = true;
    group.classList.remove('has-error');
  };

  card.addEventListener('change', (ev) => {
    if (ev.target instanceof HTMLInputElement && ev.target.type === 'radio') {
      clearFlavorError();
      window.clearTimeout(doneTimer);
      addBtn.classList.remove('is-done');
      refresh();
    }
  });

  qtyInput.addEventListener('change', () => {
    const c = clampQty(qtyInput.value);
    setQtyValue(c.qty);
    if (c.clamped === 'max') showMax();
    else qtyMsg.hidden = true;
  });
  qtyInput.addEventListener('input', refresh);

  card.addEventListener('click', (ev) => {
    const hit = actionOf(ev.target);
    if (!hit) return;
    switch (hit.action) {
      case 'dec':
        qtyMsg.hidden = true;
        setQtyValue(Math.max(1, qty() - 1));
        break;
      case 'inc':
        if (qty() >= MAX_QTY_PER_ITEM) {
          setQtyValue(MAX_QTY_PER_ITEM);
          showMax();
        } else {
          qtyMsg.hidden = true;
          setQtyValue(qty() + 1);
        }
        break;
      case 'add': {
        const flavorId = selectedFlavorId();
        if (!flavorId) {
          flavorError.hidden = false;
          group.classList.add('has-error');
          radios[0]?.focus();
          return;
        }
        const n = qty();
        const result = addItem(store.get().cart, modelId, flavorId, n);
        store.setCart(result.cart);
        const flavorName = model.flavors.find((f) => f.id === flavorId)?.name ?? '';
        live.announce(
          `${model.name} ${flavorName}, ${String(n)} ${n === 1 ? 'unidade' : 'unidades'}, adicionado ao carrinho`,
        );
        if (result.hitMax) showMax();
        else qtyMsg.hidden = true;
        for (const r of radios) r.checked = false;
        qtyInput.value = '1';
        addBtn.classList.add('is-done');
        setText(addLabel, 'Adicionado');
        window.clearTimeout(doneTimer);
        doneTimer = window.setTimeout(() => {
          addBtn.classList.remove('is-done');
          refresh();
        }, 1600);
        refresh();
        break;
      }
    }
  });

  // Imagem com erro: mantém nome/preço/sabores e mostra aviso.
  const img = card.querySelector('img');
  const broken = qs(card, '[data-broken]');
  const markBroken = (): void => {
    broken.hidden = false;
    img?.setAttribute('hidden', '');
  };
  if (img) {
    img.addEventListener('error', markBroken);
    if (img.complete && img.naturalWidth === 0 && img.currentSrc !== '') markBroken();
  }

  refresh();
}

export function initProductCards(store: Store, live: Announcer): void {
  for (const card of qsa(document, '[data-product]')) initCard(card, store, live);
}
