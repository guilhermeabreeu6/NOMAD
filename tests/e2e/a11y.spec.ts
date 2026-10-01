import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { addToCart, expect, openCart, test } from './fixtures';

async function scan(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(
    serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
    'violações axe',
  ).toEqual([]);
}

test.describe('acessibilidade', () => {
  test('gate e gate recusado', async ({ fresh: page }) => {
    await scan(page);
    await page.getByRole('button', { name: 'Sou menor de 18 anos' }).click();
    await scan(page);
  });

  test('home', async ({ app: page }) => {
    await scan(page);
  });

  test('carrinho e checkout com erros', async ({ app: page }) => {
    await addToCart(page, 'v155', 'Menthol', 2);
    const dialog = await openCart(page);
    await scan(page);
    await dialog.getByRole('button', { name: 'Continuar', exact: true }).click();
    await dialog.getByRole('button', { name: 'Enviar pedido pelo WhatsApp' }).click();
    await scan(page);
  });

  test('alvos principais >= 44px', async ({ app: page, isMobile }) => {
    test.skip(!isMobile, 'medição de toque só no mobile');
    const c = page.locator('#v155');
    await c.scrollIntoViewIfNeeded();
    for (const loc of [
      c.getByRole('button', { name: /Adicionar ao carrinho/ }),
      c.getByRole('button', { name: /Aumentar/ }),
      c.getByRole('button', { name: /Diminuir/ }),
      c.getByRole('radio').first().locator('xpath=..'),
      page.locator('.cart-btn'),
    ]) {
      const box = await loc.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    }
  });

  test('reflow em 320px sem rolagem horizontal', async ({ app: page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('fluxo completo só por teclado até o carrinho', async ({ app: page }) => {
    const c = page.locator('#v55');
    await c.getByRole('radio', { name: 'Icy Mint' }).focus();
    await page.keyboard.press('Space');
    await c.getByRole('button', { name: /Adicionar ao carrinho/ }).focus();
    await page.keyboard.press('Enter');
    await page.locator('.cart-btn').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('prefers-reduced-motion respeitado', async ({ app: page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const dur = await page.evaluate(() => getComputedStyle(document.querySelector('.btn') as Element).transitionDuration);
    expect(parseFloat(dur)).toBeLessThan(0.01);
  });
});
