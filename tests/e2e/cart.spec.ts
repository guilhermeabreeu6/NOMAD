import { CART_KEY, addToCart, card, expect, openCart, test } from './fixtures';

test.describe('carrinho', () => {
  test('adiciona com sabor e quantidade: linha e badge', async ({ app: page }) => {
    await addToCart(page, 'v155', 'Menthol', 2);
    await expect(page.locator('[data-badge]')).toHaveText('2');
    const dialog = await openCart(page);
    await expect(dialog.locator('[data-line]')).toHaveCount(1);
    await expect(dialog.locator('[data-l-model]')).toHaveText('V155');
    await expect(dialog.locator('[data-l-flavor]')).toHaveText('Menthol');
    await expect(dialog.locator('[data-l-total]')).toHaveText('R$ 220,00');
    await expect(dialog.locator('[data-subtotal]')).toHaveText('R$ 220,00');
  });

  test('sabor é obrigatório', async ({ app: page }) => {
    const c = card(page, 'v55');
    await c.getByRole('button', { name: /Adicionar ao carrinho/ }).click();
    await expect(c.getByRole('alert').filter({ hasText: 'Escolha um sabor' })).toBeVisible();
    await expect(c.getByRole('radio').first()).toBeFocused();
    await expect(page.locator('[data-badge]')).toBeHidden();
    await c.getByRole('radio', { name: 'Icy Mint' }).check();
    await expect(c.getByRole('alert').filter({ hasText: 'Escolha um sabor' })).toBeHidden();
  });

  test('mesmo item soma; sabores diferentes são linhas separadas', async ({ app: page }) => {
    await addToCart(page, 'v155', 'Menthol', 2);
    await addToCart(page, 'v155', 'Menthol', 1);
    await addToCart(page, 'v155', 'Icy Mint', 1);
    const dialog = await openCart(page);
    await expect(dialog.locator('[data-line]')).toHaveCount(2);
    await expect(dialog.locator('[data-line]').first().locator('[data-l-qty]')).toHaveValue('3');
  });

  test('quantidade: mínimo 1 e máximo 10 com mensagem', async ({ app: page }) => {
    const c = card(page, 'v55');
    await expect(c.getByRole('button', { name: /Diminuir/ })).toBeDisabled();
    await addToCart(page, 'v55', 'Icy Mint', 8);
    await addToCart(page, 'v55', 'Icy Mint', 5);
    await expect(c.getByText('Máximo de 10 unidades por item. Para mais, fale com a gente no WhatsApp.')).toBeVisible();
    const dialog = await openCart(page);
    await expect(dialog.locator('[data-l-qty]')).toHaveValue('10');
  });

  for (const [typed, expected] of [['0', '1'], ['-2', '1'], ['', '1'], ['2.5', '1'], ['abc', '1'], ['15', '10']] as const) {
    test(`quantidade digitada "${typed}" vira ${expected}`, async ({ app: page }) => {
      const input = card(page, 'v155').locator('[data-qty]');
      await input.fill(typed);
      await input.blur();
      await expect(input).toHaveValue(expected);
    });
  }

  test('remover recalcula e carrinho vazio mostra estado vazio', async ({ app: page }) => {
    await addToCart(page, 'v55', 'Icy Mint', 1);
    await addToCart(page, 'v155', 'Menthol', 1);
    const dialog = await openCart(page);
    await dialog.getByRole('button', { name: 'Remover V55 Icy Mint' }).click();
    await expect(dialog.locator('[data-subtotal]')).toHaveText('R$ 110,00');
    await dialog.getByRole('button', { name: 'Remover V155 Menthol' }).click();
    await expect(dialog.getByText('Seu carrinho está vazio')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Continuar', exact: true })).toBeHidden();
  });

  test('persiste após recarregar', async ({ app: page }) => {
    await addToCart(page, 'v400-mix-slim', 'Cherry + Grape', 2);
    await page.reload();
    await expect(page.locator('[data-badge]')).toHaveText('2');
  });

  test('dados corrompidos no storage: site carrega e mantém só itens válidos', async ({ page }) => {
    await page.addInitScript(
      ({ ak, ck }) => {
        localStorage.setItem(ak, '1');
        localStorage.setItem(
          ck,
          JSON.stringify({
            v: 1,
            lines: [
              { m: 'v155', f: 'menthol', q: 2, price: 1 },
              { m: 'inexistente', f: 'x', q: 1 },
              { m: 'v55', f: 'icy-mint', q: 'abc' },
            ],
          }),
        );
      },
      { ak: 'nomad:age-ok:v1', ck: CART_KEY },
    );
    await page.goto('./');
    await expect(page.locator('[data-badge]')).toHaveText('2');
    const dialog = await openCart(page);
    await expect(dialog.locator('[data-l-total]')).toHaveText('R$ 220,00');
  });

  test('JSON inválido no storage: carrega com carrinho vazio', async ({ page }) => {
    await page.addInitScript(
      ({ ak, ck }) => {
        localStorage.setItem(ak, '1');
        localStorage.setItem(ck, '{lixo');
      },
      { ak: 'nomad:age-ok:v1', ck: CART_KEY },
    );
    await page.goto('./');
    await expect(page.locator('#v55')).toBeVisible();
    await expect(page.locator('[data-badge]')).toBeHidden();
  });

  test('ESC fecha o carrinho e devolve o foco ao gatilho', async ({ app: page }) => {
    await addToCart(page, 'v55', 'Icy Mint', 1);
    await openCart(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.locator('.cart-btn')).toBeFocused();
  });
});
