import { MODELS } from '../../src/data/catalog';
import { addToCart, decodeWaText, expect, openCart, test, WA_PHONE } from './fixtures';

const EXPECTED = [
  'Olá! Quero fazer um pedido na NOMAD puffs:',
  '',
  'Itens:',
  '- 2x V155 - Menthol - R$ 220,00',
  '- 1x Elfbar Pro 40K - Pink Lemonade - R$ 140,00',
  '',
  'Subtotal: R$ 360,00',
  'Entrega: Lago Norte - R$ 20,00',
  'Pagamento: PIX (na entrega)',
  'Total: R$ 380,00',
].join('\n');

test.describe('envio pelo WhatsApp', () => {
  test('caminho feliz: popup com a mensagem da RN12', async ({ app: page }) => {
    await addToCart(page, 'v155', 'Menthol', 2);
    await addToCart(page, 'elfbar-pro-40k', 'Pink Lemonade', 1);
    const dialog = await openCart(page);
    await dialog.getByRole('button', { name: 'Continuar', exact: true }).click();
    await dialog.getByLabel('Região de entrega (Palmas - TO)').selectOption('lago-norte');
    await dialog.getByRole('radio', { name: 'PIX' }).check();
    await expect(dialog.locator('[data-o-total]')).toHaveText('R$ 380,00');

    const popup = page.waitForEvent('popup');
    await dialog.getByRole('button', { name: 'Enviar pedido pelo WhatsApp' }).click();
    const url = (await popup).url();
    expect(url.startsWith(`https://wa.me/${WA_PHONE}?text=`)).toBe(true);
    expect(decodeWaText(url)).toBe(EXPECTED);

    // fallback sempre visível
    await expect(dialog.getByRole('heading', { name: 'Pedido pronto para enviar' })).toBeFocused();
    const link = dialog.getByRole('link', { name: 'Abrir WhatsApp' });
    await expect(link).toHaveAttribute('href', url);
    await expect(link).toHaveAttribute('rel', /noopener/);
    // carrinho permanece
    await expect(page.locator('[data-badge]')).toHaveText('3');
  });

  test('sabores com + chegam codificados', async ({ app: page }) => {
    await addToCart(page, 'v400-mix-slim', 'Icy Mint + Peach Grape', 1);
    const dialog = await openCart(page);
    await dialog.getByRole('button', { name: 'Continuar', exact: true }).click();
    await dialog.getByLabel('Região de entrega (Palmas - TO)').selectOption('santo-amaro');
    await dialog.getByRole('radio', { name: 'Cartão de crédito' }).check();
    const popup = page.waitForEvent('popup');
    await dialog.getByRole('button', { name: 'Enviar pedido pelo WhatsApp' }).click();
    const url = (await popup).url();
    expect(url).toContain('Icy%20Mint%20%2B%20Peach%20Grape');
    expect(decodeWaText(url)).toContain('Pagamento: Cartão de crédito (na entrega)');
  });

  test('pedido grande (todos os sabores x10) gera URL completa', async ({ app: page }) => {
    test.setTimeout(120_000);
    for (const m of MODELS) {
      for (const f of m.flavors) await addToCart(page, m.id, f.name, 10);
    }
    const dialog = await openCart(page);
    await dialog.getByRole('button', { name: 'Continuar', exact: true }).click();
    await dialog.getByLabel('Região de entrega (Palmas - TO)').selectOption('taquari');
    await dialog.getByRole('radio', { name: 'PIX' }).check();
    const popup = page.waitForEvent('popup');
    await dialog.getByRole('button', { name: 'Enviar pedido pelo WhatsApp' }).click();
    const url = (await popup).url();
    const text = decodeWaText(url);
    expect(text.split('\n').filter((l) => l.startsWith('- '))).toHaveLength(18);
    expect(text).toContain('Total: R$ 22.085,00');
  });

  test('mensagem coerente com a tela e copiar com fallback', async ({ app: page, context }) => {
    await addToCart(page, 'v55', 'Uva Ice', 3);
    const dialog = await openCart(page);
    await dialog.getByRole('button', { name: 'Continuar', exact: true }).click();
    await dialog.getByLabel('Região de entrega (Palmas - TO)').selectOption('q300n-600n');
    await dialog.getByRole('radio', { name: 'Cartão de débito' }).check();
    const screenTotal = await dialog.locator('[data-o-total]').innerText();
    const popup = page.waitForEvent('popup');
    await dialog.getByRole('button', { name: 'Enviar pedido pelo WhatsApp' }).click();
    const text = decodeWaText((await popup).url());
    expect(text).toContain(`Total: ${screenTotal}`);

    // clipboard negado -> textarea
    await dialog.getByRole('button', { name: 'Copiar mensagem do pedido' }).click();
    const feedback = dialog.locator('[data-copy-status]:visible, [data-copy-fallback]:visible');
    await expect(feedback).toHaveCount(1);

    await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => undefined);
    await dialog.getByRole('button', { name: 'Copiar mensagem do pedido' }).click();
    await expect(feedback).toHaveCount(1);

    await dialog.getByRole('button', { name: 'Limpar carrinho' }).click();
    await expect(dialog.getByText('Seu carrinho está vazio')).toBeVisible();
  });
});
