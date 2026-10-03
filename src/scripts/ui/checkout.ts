import { findPayment, findRegion } from '../../data/catalog';
import { resolveCart, subtotalCents } from '../../lib/cart';
import { formatBRL } from '../../lib/money';
import { computeTotals, parseRegionChoice, quoteDelivery, validateCheckout, type DeliveryQuote } from '../../lib/order';
import { buildOrderMessage, buildWhatsAppUrl } from '../../lib/whatsapp';
import type { Clock } from '../clock';
import type { Store } from '../store';
import { actionOf, qs, qsa, setDescribedBy, setText } from './dom';
import type { Announcer } from './live-region';
import { PROMO_PHASE_EVENT } from './promo-state';

interface Options {
  dialog: HTMLDialogElement;
  store: Store;
  live: Announcer;
  /** Relógio injetado (produção: Date.now; E2E: relógio simulado). */
  clock: Clock;
  goStep: (step: 'cart' | 'checkout') => void;
}

export interface CheckoutController {
  render(): void;
  reset(): void;
}

/** Assinatura da cotação mostrada: se mudar entre a tela e o envio, o envio é barrado e a tela atualizada. */
function quoteKey(q: DeliveryQuote): string {
  return q.kind === 'fixed' || q.kind === 'free' ? `${q.kind}:${String(q.feeCents)}` : q.kind;
}

export function initCheckout({ dialog, store, live, clock, goStep }: Options): CheckoutController {
  const form = qs<HTMLFormElement>(dialog, '[data-step="checkout"]');
  const foot = qs(dialog, '[data-step-foot="checkout"]');
  const select = qs<HTMLSelectElement>(form, '[data-region]');
  const paymentGroup = qs<HTMLFieldSetElement>(form, '[data-payment]');
  const paymentRadios = qsa<HTMLInputElement>(paymentGroup, 'input[type="radio"]');
  const regionError = qs(form, '[data-error="region"]');
  const paymentError = qs(form, '[data-error="payment"]');
  const summaryError = qs(form, '[data-error-summary]');
  const promoChanged = qs(form, '[data-promo-changed]');
  const regionOptions = qsa<HTMLOptionElement>(select, 'option[data-label-base]');
  const feeChip = qs(form, '[data-fee-chip]');
  const linesEl = qs(form, '[data-summary-lines]');
  const oSubtotal = qs(form, '[data-o-subtotal]');
  const oFee = qs(form, '[data-o-fee]');
  const oTotal = qs(form, '[data-o-total]');
  const oTotalLabel = qs(form, '[data-o-total-label]');
  const sent = qs(form, '[data-sent]');
  const sentTitle = qs(sent, '#sent-title');
  const waLink = qs<HTMLAnchorElement>(sent, '[data-wa-link]');
  const copyStatus = qs(sent, '[data-copy-status]');
  const copyFallback = qs(sent, '[data-copy-fallback]');
  const orderText = qs<HTMLTextAreaElement>(sent, '[data-order-text]');
  const sendLabel = qs(foot, '[data-send-label]');
  let message = '';
  let shownQuote = '';

  const clearErrors = (): void => {
    regionError.hidden = true;
    paymentError.hidden = true;
    summaryError.hidden = true;
    promoChanged.hidden = true;
    select.removeAttribute('aria-invalid');
    paymentGroup.removeAttribute('aria-invalid');
    setDescribedBy(select, regionError.id, false);
    setDescribedBy(paymentGroup, paymentError.id, false);
  };

  const hideSent = (): void => {
    sent.hidden = true;
    copyStatus.hidden = true;
    copyFallback.hidden = true;
    sendLabel.parentElement?.removeAttribute('aria-busy');
    if (!form.hidden) foot.hidden = false;
  };

  function render(): void {
    const state = store.get();
    const lines = resolveCart(state.cart);
    const subtotal = subtotalCents(lines);
    const region = parseRegionChoice(state.regionId);
    const now = clock();
    const totals = computeTotals(subtotal, region, now);
    const { quote } = totals;
    shownQuote = quoteKey(quote);
    renderRegionOptions(now);

    linesEl.replaceChildren(
      ...lines.map((l) => {
        const li = document.createElement('li');
        li.textContent = `${String(l.qty)}x ${l.modelName} - ${l.flavorName} - ${formatBRL(l.lineCents)}`;
        return li;
      }),
    );
    setText(oSubtotal, formatBRL(subtotal));
    oFee.classList.toggle('is-free', quote.kind === 'free');
    feeChip.classList.toggle('fee-chip--free', quote.kind === 'free');
    switch (quote.kind) {
      case 'free': {
        setText(oFee, 'Grátis');
        feeChip.hidden = false;
        // O riscado não é anunciado por leitores de tela: o valor normal vai também em texto oculto.
        const old = document.createElement('s');
        old.className = 'fee-old';
        old.setAttribute('aria-hidden', 'true');
        old.textContent = formatBRL(quote.baseFeeCents);
        const sr = document.createElement('span');
        sr.className = 'visually-hidden';
        sr.textContent = `, taxa normal ${formatBRL(quote.baseFeeCents)}`;
        feeChip.replaceChildren(`Taxa de entrega: grátis (promoção de outubro) `, old, sr);
        break;
      }
      case 'fixed':
        setText(oFee, formatBRL(quote.feeCents));
        feeChip.hidden = false;
        setText(
          feeChip,
          `Taxa de entrega: ${formatBRL(quote.feeCents)}${quote.excludedFrom ? ' (região fora da promoção)' : ''}`,
        );
        break;
      case 'arrange':
        setText(oFee, 'a combinar');
        feeChip.hidden = false;
        setText(feeChip, 'Taxa de entrega: a combinar');
        break;
      case 'unselected':
        setText(oFee, 'escolha a região');
        feeChip.hidden = true;
        break;
    }
    setText(oTotalLabel, region ? 'Total' : 'Total parcial');
    setText(oTotal, totals.feeToArrange ? `${formatBRL(subtotal)} + entrega a combinar` : formatBRL(totals.totalCents));
  }

  /** Opções das regiões: "- Grátis em outubro" durante a promoção, taxa normal fora dela. */
  function renderRegionOptions(now: number): void {
    for (const opt of regionOptions) {
      const region = findRegion(opt.value);
      const base = opt.dataset['labelBase'] ?? opt.text;
      const q = region ? quoteDelivery({ kind: 'region', region }, now) : null;
      const text = q?.kind === 'free' ? `${region?.label ?? ''} - ${q.promo.optionLabel}` : base;
      if (opt.text !== text) opt.text = text;
    }
  }

  // Virada da promoção com o drawer aberto (timer em promo-state) ou volta do segundo plano.
  document.addEventListener(PROMO_PHASE_EVENT, render);

  select.addEventListener('change', () => {
    store.setRegion(select.value || null);
    regionError.hidden = true;
    select.removeAttribute('aria-invalid');
    setDescribedBy(select, regionError.id, false);
  });

  paymentGroup.addEventListener('change', () => {
    store.setPayment(paymentRadios.find((r) => r.checked)?.value ?? null);
    paymentError.hidden = true;
    paymentGroup.removeAttribute('aria-invalid');
    setDescribedBy(paymentGroup, paymentError.id, false);
  });

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
  });

  // Qualquer mudança no carrinho invalida o painel de "pedido pronto".
  store.subscribe(() => {
    if (!sent.hidden) hideSent();
  });

  function send(): void {
    const state = store.get();
    const lines = resolveCart(state.cart);
    const errors = validateCheckout({ lines, regionId: state.regionId, paymentId: state.paymentId });
    clearErrors();
    if (errors.includes('empty')) {
      goStep('cart');
      return;
    }
    if (errors.length > 0) {
      if (errors.includes('region')) {
        regionError.hidden = false;
        select.setAttribute('aria-invalid', 'true');
        setDescribedBy(select, regionError.id, true);
      }
      if (errors.includes('payment')) {
        paymentError.hidden = false;
        paymentGroup.setAttribute('aria-invalid', 'true');
        setDescribedBy(paymentGroup, paymentError.id, true);
      }
      if (errors.length >= 2) {
        summaryError.hidden = false;
        setText(summaryError, `Faltam ${String(errors.length)} informações para enviar o pedido`);
      }
      if (errors[0] === 'region') select.focus();
      else paymentRadios[0]?.focus();
      return;
    }
    const region = parseRegionChoice(state.regionId);
    const payment = state.paymentId ? findPayment(state.paymentId) : undefined;
    if (!region || !payment) return;
    const nowMs = clock();
    // Recheque no envio: se a promoção virou entre a tela e o clique, não envia uma mensagem diferente
    // do que estava na tela. Atualiza, avisa e o próximo clique envia.
    const quote = quoteDelivery(region, nowMs);
    if (quoteKey(quote) !== shownQuote) {
      render();
      const text =
        quote.kind === 'free'
          ? 'A promoção de frete começou. O total foi atualizado.'
          : 'A promoção de frete terminou. O total foi atualizado.';
      setText(promoChanged, text);
      promoChanged.hidden = false;
      live.announce(text);
      promoChanged.scrollIntoView({ block: 'nearest' });
      return;
    }
    message = buildOrderMessage({ lines, region, payment, nowMs });
    const url = buildWhatsAppUrl(message);
    // Síncrono dentro do gesto do usuário: evita bloqueio de pop-up.
    window.open(url, '_blank', 'noopener,noreferrer');
    waLink.href = url;
    orderText.value = message;
    sent.hidden = false;
    foot.hidden = true;
    sentTitle.focus();
    sent.scrollIntoView({ block: 'nearest' });
  }

  async function copy(): Promise<void> {
    try {
      if (!('clipboard' in navigator)) throw new Error('sem clipboard');
      await navigator.clipboard.writeText(message);
      copyFallback.hidden = true;
      copyStatus.hidden = false;
      setText(copyStatus, 'Mensagem copiada');
    } catch {
      copyStatus.hidden = true;
      copyFallback.hidden = false;
      orderText.focus();
      orderText.select();
    }
  }

  dialog.addEventListener('click', (ev) => {
    const hit = actionOf(ev.target);
    if (!hit) return;
    switch (hit.action) {
      case 'send':
        send();
        break;
      case 'copy':
        void copy();
        break;
      case 'clear-after':
        store.setCart([]);
        live.announce('Carrinho limpo');
        break;
      case 'to-catalog':
        dialog.dispatchEvent(new CustomEvent('nomad:to-catalog'));
        break;
    }
  });

  return {
    render,
    reset(): void {
      clearErrors();
      hideSent();
    },
  };
}
