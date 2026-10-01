import { REGIONS } from '../../src/data/catalog';
import { formatBRL } from '../../src/lib/money';
import { addToCart, decodeWaText, expect, openCart, test, WA_PHONE } from './fixtures';
import type { Page } from '@playwright/test';

async function toCheckout(page: Page): Promise<ReturnType<Page['locator']>> {
  const dialog = await openCart(page);
  await dialog.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(dialog.getByLabel('Região de entrega (Palmas - TO)')).toBeVisible();
  return dialog;
}

test.describe('checkout', () => {
  for (const region of REGIONS) {
    test(`taxa e total para ${region.label}`, async ({ app: page }) => {
      await addToCart(page, 'v155', 'Menthol', 1); // R$ 110,00
      const dialog = await toCheckout(page);
      await dialog.getByLabel('Região de entrega (Palmas - TO)').selectOption(region.id);
      await expect(dialog.getByText(`Taxa de entrega: ${formatBRL(region.feeCents)}`)).toBeVisible();
      await expect(dialog.locator('[data-o-total]')).toHaveText(formatBRL(11000 + region.feeCents));
    });
  }

  test('região e pagamento obrigatórios: erros, foco e resumo', async ({ app: page }) => {
    await addToCart(page, 'v155', 'Menthol', 1);
    const popups: string[] = [];
    page.on('popup', (p) => popups.push(p.url()));
    const dialog = await toCheckout(page);
    await dialog.getByRole('button', { name: 'Enviar pedido pelo WhatsApp' }).click();
    await expect(dialog.getByText('Escolha sua região de entrega')).toBeVisible();
    await expect(dialog.getByText('Escolha a forma de pagamento')).toBeVisible();
    await expect(dialog.getByText('Faltam 2 informações para enviar o pedido')).toBeVisible();
    await expect(dialog.getByLabel('Região de entrega (Palmas - TO)')).toBeFocused();
    await expect(dialog.getByLabel('Região de entrega (Palmas - TO)')).toHaveAttribute('aria-invalid', 'true');
    expect(popups).toEqual([]);

    await dialog.getByLabel('Região de entrega (Palmas - TO)').selectOption('lago-norte');
    await dialog.getByRole('button', { name: 'Enviar pedido pelo WhatsApp' }).click();
    await expect(dialog.getByText('Escolha a forma de pagamento')).toBeVisible();
    await expect(dialog.getByRole('radio').first()).toBeFocused();
    expect(popups).toEqual([]);
  });

  test('formas de pagamento exatas, sem pré-seleção', async ({ app: page }) => {
    await addToCart(page, 'v55', 'Icy Mint', 1);
    const dialog = await toCheckout(page);
    await expect(dialog.getByText('Pagamento na entrega.')).toBeVisible();
    await expect(dialog.locator('.radio-card span')).toHaveText(['PIX', 'Cartão de débito', 'Cartão de crédito']);
    await expect(dialog.getByRole('radio', { checked: true })).toHaveCount(0);
  });

  test('outra região: a combinar e envio permitido', async ({ app: page }) => {
    await addToCart(page, 'v155', 'Menthol', 2);
    await addToCart(page, 'elfbar-pro-40k', 'Pink Lemonade', 1);
    const dialog = await toCheckout(page);
    await dialog.getByLabel('Região de entrega (Palmas - TO)').selectOption('outra');
    await expect(dialog.locator('[data-o-total]')).toHaveText('R$ 360,00 + entrega a combinar');
    await expect(dialog.locator('[data-o-fee]')).toHaveText('a combinar');
    await dialog.getByRole('radio', { name: 'PIX' }).check();
    const popup = page.waitForEvent('popup');
    await dialog.getByRole('button', { name: 'Enviar pedido pelo WhatsApp' }).click();
    const url = (await popup).url();
    expect(url).toContain(`https://wa.me/${WA_PHONE}?text=`);
    expect(decodeWaText(url)).toContain('Entrega: Outra região (a combinar)');
    expect(decodeWaText(url)).toContain('Total: R$ 360,00 + entrega a combinar');
  });

  test('alterar quantidade no carrinho recalcula o total do checkout', async ({ app: page }) => {
    await addToCart(page, 'v155', 'Menthol', 1);
    const dialog = await toCheckout(page);
    await dialog.getByLabel('Região de entrega (Palmas - TO)').selectOption('taquari');
    await expect(dialog.locator('[data-o-total]')).toHaveText('R$ 145,00');
    await dialog.getByRole('button', { name: /Voltar ao carrinho/ }).click();
    await dialog.getByRole('button', { name: 'Aumentar quantidade de V155 Menthol' }).click();
    await dialog.getByRole('button', { name: 'Continuar', exact: true }).click();
    await expect(dialog.locator('[data-o-total]')).toHaveText('R$ 255,00');
  });
});
