import type { Page } from '@playwright/test';
import { addToCart, expect, openCart, test } from './fixtures';

const VIEWPORTS = [
  { width: 360, height: 740 },
  { width: 390, height: 844 },
  { width: 1366, height: 768 },
] as const;

interface Overflow {
  el: string;
  right: number;
}

/** Elementos visíveis que passam da borda direita da viewport (inclusive dentro de containers com overflow oculto). */
async function rightOverflows(page: Page): Promise<Overflow[]> {
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))));
  return page.evaluate(() => {
    const limit = window.innerWidth + 0.5;
    const out: { el: string; right: number }[] = [];
    // exclui: decorativos cortados de propósito, rolagem horizontal intencional (chips) e utilitários ocultos
    const skip = '.watermark, .watermark *, .model-nav ul, .model-nav ul *, .skip-link, .visually-hidden, .live';
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*'))) {
      if (el.matches(skip)) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || el.closest('[hidden]')) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right > limit) {
        out.push({ el: `${el.tagName.toLowerCase()}.${el.className}`, right: Math.round(r.right) });
      }
    }
    return out;
  });
}

/** Conteúdo cortado: scrollWidth > clientWidth nos blocos principais. */
async function clipped(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const sel = 'h1, h2, h3, .product__name, .product__panel, .product, .price-list, .hero__copy, .hero__side, .summary, .qty-row';
    return Array.from(document.querySelectorAll<HTMLElement>(sel))
      .filter((el) => el.offsetParent !== null && el.scrollWidth > el.clientWidth + 1)
      .map((el) => `${el.tagName.toLowerCase()}.${el.className} ${String(el.scrollWidth)}>${String(el.clientWidth)}`);
  });
}

for (const vp of VIEWPORTS) {
  test.describe(`layout ${String(vp.width)}px`, () => {
    test.use({ viewport: vp });

    test('nada passa da borda direita nem fica cortado', async ({ app: page }) => {
      await page.waitForLoadState('load');
      expect(await rightOverflows(page), 'passa da viewport').toEqual([]);
      expect(await clipped(page), 'conteúdo cortado').toEqual([]);
      const scroll = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(scroll).toBeLessThanOrEqual(0);
    });

    test('títulos dos produtos em 1 linha, sem quebra no meio da palavra', async ({ app: page }) => {
      const titles = page.locator('.product__name [data-title]');
      await expect(titles).toHaveCount(4);
      const info = await titles.evaluateAll((els) =>
        els.map((el) => ({
          text: el.textContent,
          rects: el.getClientRects().length,
          overflow: (el.parentElement as HTMLElement).scrollWidth - (el.parentElement as HTMLElement).clientWidth,
        })),
      );
      for (const t of info) {
        expect(t.rects, `título ${t.text} quebrou em várias linhas`).toBe(1);
        expect(t.overflow, `título ${t.text} vaza`).toBeLessThanOrEqual(1);
      }
      // stepper dentro do painel
      const out = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLElement>('.product')).filter((p) => {
          const panel = p.querySelector('.product__panel')?.getBoundingClientRect();
          const st = p.querySelector('.stepper')?.getBoundingClientRect();
          return !panel || !st || st.right > panel.right + 0.5 || st.left < panel.left - 0.5;
        }).length,
      );
      expect(out).toBe(0);
    });

    test('carrinho e checkout abertos também respeitam a viewport', async ({ app: page }) => {
      await addToCart(page, 'v400-mix-slim', 'Strawberry Grape Ice + Kiwi Watermelon', 2);
      const dialog = await openCart(page);
      expect(await rightOverflows(page), 'carrinho').toEqual([]);
      await dialog.getByRole('button', { name: 'Continuar', exact: true }).click();
      await dialog.getByLabel('Região de entrega (Palmas - TO)').selectOption('q700s-200');
      expect(await rightOverflows(page), 'checkout').toEqual([]);
    });
  });
}
