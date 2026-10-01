// Helpers de DOM. Proibido innerHTML/outerHTML/insertAdjacentHTML (lint): só textContent e atributos.

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- genérico só no retorno, por conveniência
export function qs<T extends Element = HTMLElement>(root: ParentNode, selector: string): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`Elemento não encontrado: ${selector}`);
  return el;
}

export function qsa<T extends Element = HTMLElement>(root: ParentNode, selector: string): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

export function setText(el: Element, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}

export function setVisible(el: HTMLElement, visible: boolean): void {
  el.hidden = !visible;
}

/** Elemento com data-action mais próximo do alvo do evento. */
export function actionOf(target: EventTarget | null): { el: HTMLElement; action: string } | null {
  if (!(target instanceof Element)) return null;
  const el = target.closest<HTMLElement>('[data-action]');
  const action = el?.dataset['action'];
  return el && action ? { el, action } : null;
}

export function formatCount(units: number): string {
  return units === 1 ? '1 item' : `${String(units)} itens`;
}
