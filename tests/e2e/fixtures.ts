import { expect, test as base, type Locator, type Page } from '@playwright/test';
import { findModel } from '../../src/data/catalog';

export const AGE_KEY = 'nomad:age-ok:v1';
export const CART_KEY = 'nomad:cart:v1';
export const WA_PHONE = '5563981239498';

interface Fixtures {
  /** Página com gate já confirmado, wa.me interceptado e falha em erro de console/CSP. */
  app: Page;
  /** Página sem confirmar idade (mesmas proteções). */
  fresh: Page;
}

async function instrument(page: Page, confirmed: boolean): Promise<() => Promise<void>> {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.context().route('https://wa.me/**', (route) => route.fulfill({ status: 200, body: 'ok', contentType: 'text/html' }));
  await page.addInitScript(
    ({ key, confirm }) => {
      (window as unknown as { __csp: string[] }).__csp = [];
      document.addEventListener('securitypolicyviolation', (e) => {
        (window as unknown as { __csp: string[] }).__csp.push(`${e.violatedDirective} ${e.blockedURI}`);
      });
      if (confirm && !sessionStorage.getItem('__init')) {
        sessionStorage.setItem('__init', '1');
        localStorage.setItem(key, '1');
      }
    },
    { key: AGE_KEY, confirm: confirmed },
  );
  return async () => {
    const csp = await page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? []).catch(() => []);
    expect(csp, 'violações de CSP').toEqual([]);
    expect(errors, 'erros de console').toEqual([]);
  };
}

export const test = base.extend<Fixtures>({
  app: async ({ page }, use) => {
    const check = await instrument(page, true);
    await page.goto('./');
    await use(page);
    await check();
  },
  fresh: async ({ page }, use) => {
    const check = await instrument(page, false);
    await page.goto('./');
    await use(page);
    await check();
  },
});

export { expect };

export function card(page: Page, modelId: string): Locator {
  return page.locator(`#${modelId}`);
}

export async function addToCart(page: Page, modelId: string, flavorName: string, qty = 1): Promise<void> {
  const c = card(page, modelId);
  await c.getByRole('radio', { name: flavorName, exact: true }).check();
  if (qty !== 1) await c.locator('[data-qty]').fill(String(qty));
  await c.getByRole('button', { name: /Adicionar ao carrinho/ }).click();
}

export async function openCart(page: Page): Promise<Locator> {
  await page.locator('.cart-btn').click();
  const dialog = page.getByRole('dialog', { name: /carrinho|Finalizar/i });
  await expect(dialog).toBeVisible();
  return dialog;
}

export function modelName(id: string): string {
  const m = findModel(id);
  if (!m) throw new Error(`modelo ${id}`);
  return m.name;
}

/** Decodifica o `text` de uma URL wa.me. */
export function decodeWaText(url: string): string {
  const q = url.split('?text=')[1] ?? '';
  return decodeURIComponent(q);
}
