import { findModel } from '../../data/catalog';
import { clampQty, countUnits, removeLine, resolveCart, setQty, subtotalCents, type ResolvedLine } from '../../lib/cart';
import { formatBRL } from '../../lib/money';
import type { State, Store } from '../store';
import { initCheckout } from './checkout';
import { actionOf, formatCount, qs, qsa, setText } from './dom';
import type { Announcer } from './live-region';

type Step = 'cart' | 'checkout';

export function initCartDialog(store: Store, live: Announcer): void {
  const dialog = qs<HTMLDialogElement>(document, '[data-cart-dialog]');
  const title = qs(dialog, '[data-title]');
  const emptyEl = qs(dialog, '[data-empty]');
  const filledEl = qs(dialog, '[data-filled]');
  const linesEl = qs(dialog, '[data-lines]');
  const summaryEl = qs(dialog, '[data-cart-summary]');
  const subtotalEl = qs(dialog, '[data-subtotal]');
  const clearArea = qs(dialog, '[data-clear-area]');
  const clearAsk = qs(dialog, '[data-action="clear-ask"]');
  const clearConfirm = qs(dialog, '[data-clear-confirm]');
  const template = qs<HTMLTemplateElement>(dialog, '#tpl-line');
  const badge = qs(document, '[data-badge]');
  const headerBtn = qs(document, '.cart-btn');
  const fab = qs(document, '[data-fab]');
  const fabText = qs(document, '[data-fab-text]');
  const steps = qsa(dialog, '[data-step]');
  const foots = qsa(dialog, '[data-step-foot]');

  let step: Step = 'cart';
  let opener: HTMLElement | null = null;
  const rows = new Map<string, HTMLElement>();
  let lastUnits = -1;

  const checkout = initCheckout({ dialog, store, live, goStep: (s) => {
      showStep(s, true);
    },
  });

  function showStep(next: Step, focus: boolean): void {
    step = next;
    for (const s of steps) s.hidden = s.dataset['step'] !== next;
    for (const f of foots) f.hidden = f.dataset['stepFoot'] !== next;
    renderAll(store.get());
    if (focus) title.focus();
  }

  function renderLine(line: ResolvedLine): HTMLElement {
    let row = rows.get(line.key);
    if (!row) {
      const fragment = template.content.cloneNode(true) as DocumentFragment;
      row = qs(fragment, '[data-line]');
      row.dataset['key'] = line.key;
      const dots = qs(row, '[data-l-dots]');
      const flavor = findModel(line.modelId)?.flavors.find((f) => f.id === line.flavorId);
      for (const token of flavor?.dots ?? []) {
        const dot = document.createElement('span');
        dot.className = 'dot';
        dot.dataset['flavor'] = token;
        dots.appendChild(dot);
      }
      setText(qs(row, '[data-l-model]'), line.modelName);
      setText(qs(row, '[data-l-flavor]'), line.flavorName);
      const label = `${line.modelName} ${line.flavorName}`;
      qs(row, '[data-action="line-dec"]').setAttribute('aria-label', `Diminuir quantidade de ${label}`);
      qs(row, '[data-action="line-inc"]').setAttribute('aria-label', `Aumentar quantidade de ${label}`);
      qs(row, '[data-l-qty]').setAttribute('aria-label', `Quantidade de ${label}`);
      qs(row, '[data-action="line-remove"]').setAttribute('aria-label', `Remover ${label}`);
      rows.set(line.key, row);
    }
    setText(qs(row, '[data-l-total]'), formatBRL(line.lineCents));
    setText(qs(row, '[data-l-unit]'), `${formatBRL(line.unitCents)} cada`);
    const input = qs<HTMLInputElement>(row, '[data-l-qty]');
    if (input !== document.activeElement || input.value === '') input.value = String(line.qty);
    qs<HTMLButtonElement>(row, '[data-action="line-dec"]').disabled = line.qty <= 1;
    return row;
  }

  function renderAll(state: State): void {
    const lines = resolveCart(state.cart);
    const units = countUnits(lines);
    const empty = lines.length === 0;

    // badge / FAB / botão do header
    badge.hidden = units === 0;
    setText(badge, String(units));
    headerBtn.setAttribute('aria-label', `Abrir carrinho, ${formatCount(units)}`);
    fab.hidden = units === 0;
    const subtotal = subtotalCents(lines);
    setText(fabText, `Carrinho · ${String(units)} · ${formatBRL(subtotal)}`);
    fab.setAttribute('aria-label', `Abrir carrinho, ${formatCount(units)}, ${formatBRL(subtotal)}`);
    if (lastUnits !== -1 && units > lastUnits) {
      badge.classList.remove('is-pulse');
      badge.getBoundingClientRect(); // força reflow para reiniciar a animação
      badge.classList.add('is-pulse');
    }
    lastUnits = units;

    if (step === 'cart') {
      setText(title, empty ? 'Seu carrinho' : `Seu carrinho (${formatCount(units)})`);
      emptyEl.hidden = !empty;
      filledEl.hidden = empty;
      summaryEl.hidden = empty;
      clearArea.hidden = empty;
      for (const f of foots) {
      if (f.dataset['stepFoot'] === 'cart') f.hidden = empty;
    }
      setText(subtotalEl, formatBRL(subtotal));
      const keys = new Set(lines.map((l) => l.key));
      for (const [key, row] of rows) {
        if (!keys.has(key)) {
          row.remove();
          rows.delete(key);
        }
      }
      lines.forEach((line, i) => {
        const row = renderLine(line);
        if (linesEl.children[i] !== row) linesEl.insertBefore(row, linesEl.children[i] ?? null);
      });
    } else {
      setText(title, 'Finalizar pedido');
      if (empty) showStep('cart', true);
    }
    checkout.render();
  }

  function open(from: HTMLElement | null): void {
    opener = from;
    clearConfirm.hidden = true;
    clearAsk.hidden = false;
    showStep('cart', false);
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('is-locked');
    title.focus();
  }

  function close(): void {
    if (dialog.open) dialog.close();
  }

  dialog.addEventListener('close', () => {
    document.body.classList.remove('is-locked');
    checkout.reset();
    if (opener?.isConnected && !opener.hidden) opener.focus();
    else headerBtn.focus();
  });

  // Clique no backdrop (fora do retângulo do dialog) fecha.
  dialog.addEventListener('click', (ev) => {
    const r = dialog.getBoundingClientRect();
    const outside = ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom;
    if (outside && ev.target === dialog) close();
  });

  for (const trigger of qsa(document, '[data-open-cart]')) {
    trigger.addEventListener('click', () => {
      open(trigger);
    });
  }

  const keyOf = (el: HTMLElement): string => el.closest<HTMLElement>('[data-line]')?.dataset['key'] ?? '';

  dialog.addEventListener('click', (ev) => {
    const hit = actionOf(ev.target);
    if (!hit) return;
    const { cart } = store.get();
    switch (hit.action) {
      case 'close-cart':
        close();
        break;
      case 'see-catalog':
        close();
        qs(document, '#catalogo').scrollIntoView();
        break;
      case 'go-checkout':
        showStep('checkout', true);
        break;
      case 'back-cart':
        showStep('cart', true);
        break;
      case 'line-dec':
      case 'line-inc': {
        const key = keyOf(hit.el);
        const cur = cart.find((l) => `${l.modelId}::${l.flavorId}` === key)?.qty ?? 1;
        const next = hit.action === 'line-dec' ? cur - 1 : cur + 1;
        const r = setQty(cart, key, Math.max(1, next));
        store.setCart(r.cart);
        const after = resolveCart(store.get().cart);
        live.announce(`Subtotal ${formatBRL(subtotalCents(after))}${r.hitMax ? '. Máximo de 10 unidades por item' : ''}`);
        break;
      }
      case 'line-remove':
        store.setCart(removeLine(cart, keyOf(hit.el)));
        live.announce('Item removido');
        if (store.get().cart.length > 0) title.focus();
        break;
      case 'clear-ask':
        clearAsk.hidden = true;
        clearConfirm.hidden = false;
        qs(clearConfirm, '[data-action="clear-cancel"]').focus();
        break;
      case 'clear-cancel':
        clearConfirm.hidden = true;
        clearAsk.hidden = false;
        clearAsk.focus();
        break;
      case 'clear-yes':
        store.setCart([]);
        live.announce('Carrinho limpo');
        title.focus();
        break;
    }
  });

  dialog.addEventListener('change', (ev) => {
    const input = ev.target;
    if (!(input instanceof HTMLInputElement) || !input.hasAttribute('data-l-qty')) return;
    const c = clampQty(input.value);
    const r = setQty(store.get().cart, keyOf(input), c.qty);
    input.value = String(c.qty);
    store.setCart(r.cart);
    live.announce(`Subtotal ${formatBRL(subtotalCents(resolveCart(store.get().cart)))}`);
  });

  store.subscribe(renderAll);
  renderAll(store.get());

  // Usado pelo checkout ("Voltar ao catálogo").
  dialog.addEventListener('nomad:to-catalog', () => {
    close();
    qs(document, '#catalogo').scrollIntoView();
  });
}
