import { qsa } from './dom';

/** Marca no ModelNav o modelo visível (aria-current). */
export function initModelNav(): void {
  const links = qsa<HTMLAnchorElement>(document, '[data-nav]');
  const cards = qsa(document, '[data-product]');
  if (typeof IntersectionObserver === 'undefined') return;
  const obs = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        for (const l of links) {
          if (l.dataset['nav'] === e.target.id) l.setAttribute('aria-current', 'true');
          else l.removeAttribute('aria-current');
        }
      }
    },
    { rootMargin: '-40% 0px -50% 0px' },
  );
  for (const c of cards) obs.observe(c);
}
