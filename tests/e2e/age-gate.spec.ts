import { AGE_KEY, expect, test } from './fixtures';

test.describe('gate 18+', () => {
  test('primeiro acesso mostra o gate e deixa o catálogo inacessível', async ({ fresh: page }) => {
    const gate = page.getByRole('dialog', { name: 'Você tem 18 anos ou mais?' });
    await expect(gate).toBeVisible();
    await expect(gate).toContainText('Proibida a venda a menores de 18 anos');
    await expect(page.locator('#app')).toHaveAttribute('inert', '');
    await expect(page.locator('#v55')).toBeHidden();
    await expect(page.locator('#gate-title')).toBeFocused();
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      const inApp = await page.evaluate(() => Boolean(document.activeElement?.closest('#app')));
      expect(inApp).toBe(false);
    }
  });

  test('confirmar maioridade grava a chave e libera o site', async ({ fresh: page }) => {
    await page.getByRole('button', { name: 'Tenho 18 anos ou mais' }).click();
    await expect(page.locator('.age-gate')).toBeHidden();
    await expect(page.locator('#app')).not.toHaveAttribute('inert', '');
    await expect(page.locator('#hero-title')).toBeFocused();
    expect(await page.evaluate((k) => localStorage.getItem(k), AGE_KEY)).toBe('1');
    await expect(page.locator('.legal-strip')).toBeVisible();
    await expect(page.locator('.legal-strip')).toContainText('Proibida a venda para menores de 18 anos');
  });

  test('gate lembrado: reload sem gate', async ({ app: page }) => {
    await expect(page.locator('#app')).toBeVisible();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('.age-gate')).toBeHidden();
    await expect(page.locator('#v55')).toBeAttached();
  });

  test('recusa mostra acesso restrito, sem link de pedido, e reabre ao recarregar', async ({ fresh: page }) => {
    await page.getByRole('button', { name: 'Sou menor de 18 anos' }).click();
    await expect(page.getByRole('heading', { name: 'Acesso restrito' })).toBeVisible();
    await expect(page.getByRole('link', { name: /whatsapp|\(63\)/i })).toHaveCount(0);
    expect(await page.evaluate((k) => localStorage.getItem(k), AGE_KEY)).toBeNull();
    await page.getByRole('button', { name: 'Voltar' }).click();
    await expect(page.getByRole('heading', { name: 'Você tem 18 anos ou mais?' })).toBeVisible();
    await page.getByRole('button', { name: 'Sou menor de 18 anos' }).click();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Você tem 18 anos ou mais?' })).toBeVisible();
  });

  test('sem localStorage o site segue na sessão, sem erro', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL: baseURL ?? '' });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    await page.addInitScript(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException('blocked', 'SecurityError');
      };
      Storage.prototype.getItem = () => {
        throw new DOMException('blocked', 'SecurityError');
      };
    });
    await page.goto('./');
    await page.getByRole('button', { name: 'Tenho 18 anos ou mais' }).click();
    await expect(page.locator('#v55')).toBeVisible();
    expect(errors).toEqual([]);
    await context.close();
  });

  test('sem JavaScript mostra aviso e link do WhatsApp', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL: baseURL ?? '', javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('./');
    await expect(page.getByText('Ative o JavaScript para fazer pedidos')).toBeVisible();
    await expect(page.getByRole('link', { name: '(63) 98123-9498' })).toHaveAttribute('href', /wa\.me\/5563981239498/);
    await expect(page.locator('#app')).toBeHidden();
    await context.close();
  });
});
