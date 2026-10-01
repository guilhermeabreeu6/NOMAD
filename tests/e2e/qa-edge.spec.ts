// Testes de borda do QA: teclado/foco, 360px, storage indisponível, gate, carrinho.
import type { Locator, Page } from '@playwright/test';
import { formatBRL } from '../../src/lib/money';
import { AGE_KEY, addToCart, card, expect, openCart, test } from './fixtures';

async function noHScroll(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

async function activeInside(page: Page, selector: string): Promise<boolean> {
  return page.evaluate((s) => Boolean(document.activeElement?.closest(s)), selector);
}

test.describe('viewport 360px', () => {
  test('home, carrinho e checkout sem rolagem horizontal', async ({ app: page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    expect(await noHScroll(page)).toBeLessThanOrEqual(0);
    for (const id of ['v55', 'v155', 'v400-mix-slim', 'elfbar-pro-40k']) {
      await card(page, id).scrollIntoViewIfNeeded();
      expect(await noHScroll(page), id).toBeLessThanOrEqual(0);
    }
    await addToCart(page, 'v400-mix-slim', 'Strawberry Grape Ice + Kiwi Watermelon', 1); // nome mais longo
    expect(await noHScroll(page)).toBeLessThanOrEqual(0);
    const dialog = await openCart(page);
    const box = await dialog.boundingBox();
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(360 + 0.5);
    expect(await noHScroll(page)).toBeLessThanOrEqual(0);
    await dialog.getByRole('button', { name: 'Continuar', exact: true }).click();
    await dialog.getByLabel('Região de entrega (Palmas - TO)').selectOption('outra');
    expect(await noHScroll(page)).toBeLessThanOrEqual(0);
    // nada dentro do diálogo vaza para a direita
    const overflowing = await dialog.evaluate((d) => {
      const r = d.getBoundingClientRect();
      return [...d.querySelectorAll('*')]
        .filter((el) => el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().right > r.right + 1)
        .map((el) => el.tagName + '.' + el.className);
    });
    expect(overflowing).toEqual([]);
  });

  test('gate em 360px cabe sem rolagem horizontal', async ({ fresh: page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    expect(await noHScroll(page)).toBeLessThanOrEqual(0);
    await page.getByRole('button', { name: 'Sou menor de 18 anos' }).click();
    expect(await noHScroll(page)).toBeLessThanOrEqual(0);
  });
});

test.describe('gate 18+ (bordas)', () => {
  test('teclado: Enter no botão confirma e Esc não fecha o gate', async ({ fresh: page }) => {
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Você tem 18 anos ou mais?' })).toBeVisible();
    await page.getByRole('button', { name: 'Tenho 18 anos ou mais' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.age-gate')).toBeHidden();
    await expect(page.locator('#v55')).toBeVisible();
  });

  test('recusado: catálogo/carrinho inalcançáveis por Tab e sem chave gravada', async ({ fresh: page }) => {
    await page.getByRole('button', { name: 'Sou menor de 18 anos' }).click();
    await expect(page.getByRole('heading', { name: 'Acesso restrito' })).toBeVisible();
    await expect(page.locator('#app')).toHaveAttribute('inert', '');
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      expect(await activeInside(page, '#app')).toBe(false);
    }
    await expect(page.locator('.cart-btn')).toBeHidden();
    await expect(page.locator('a[href*="wa.me"]:visible')).toHaveCount(0);
    expect(await page.evaluate((k) => localStorage.getItem(k), AGE_KEY)).toBeNull();
  });

  test('valores inválidos na chave do gate não liberam o site', async ({ page }) => {
    await page.addInitScript((k) => {
      localStorage.setItem(k, 'true');
    }, AGE_KEY);
    await page.goto('./');
    await expect(page.getByRole('dialog', { name: 'Você tem 18 anos ou mais?' })).toBeVisible();
  });

  test('lembrado entre abas/contextos de mesma origem: nova aba não mostra o gate', async ({ fresh: page, context }) => {
    await page.getByRole('button', { name: 'Tenho 18 anos ou mais' }).click();
    const second = await context.newPage();
    await second.goto('./');
    await expect(second.locator('.age-gate')).toBeHidden();
    await expect(second.locator('#v55')).toBeVisible();
  });

  test('aviso legal visível no catálogo, no carrinho e no checkout', async ({ app: page }) => {
    await expect(page.locator('.legal-strip')).toContainText('Proibida a venda para menores de 18 anos');
    await addToCart(page, 'v55', 'Icy Mint', 1);
    const dialog = await openCart(page);
    await expect(dialog.locator('.sheet__legal').first()).toContainText('Proibida a venda para menores de 18 anos');
  });
});

test.describe('storage indisponível', () => {
  test('carrinho funciona na sessão sem localStorage (add, abrir, enviar)', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL: baseURL ?? '' });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    await context.route('https://wa.me/**', (r) => r.fulfill({ status: 200, body: 'ok' }));
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('blocked', 'SecurityError');
        },
      });
    });
    await page.goto('./');
    await page.getByRole('button', { name: 'Tenho 18 anos ou mais' }).click();
    await addToCart(page, 'v155', 'Menthol', 2);
    await expect(page.locator('[data-badge]')).toHaveText('2');
    const dialog = await openCart(page);
    await dialog.getByRole('button', { name: 'Continuar', exact: true }).click();
    await dialog.getByLabel('Região de entrega (Palmas - TO)').selectOption('lago-norte');
    await dialog.getByRole('radio', { name: 'PIX' }).check();
    const popup = page.waitForEvent('popup');
    await dialog.getByRole('button', { name: 'Enviar pedido pelo WhatsApp' }).click();
    expect((await popup).url()).toContain('https://wa.me/5563981239498?text=');
    expect(errors).toEqual([]);
    await context.close();
  });

  test('quota estourada ao salvar não gera erro e o carrinho segue', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL: baseURL ?? '' });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript((k) => {
      localStorage.setItem(k, '1');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const orig = Storage.prototype.setItem;
      Storage.prototype.setItem = function (this: Storage, key: string, v: string) {
        if (key.startsWith('nomad:cart')) throw new DOMException('quota', 'QuotaExceededError');
        orig.call(this, key, v);
      };
    }, AGE_KEY);
    await page.goto('./');
    await addToCart(page, 'v55', 'Icy Mint', 3);
    await expect(page.locator('[data-badge]')).toHaveText('3');
    expect(errors).toEqual([]);
    await context.close();
  });
});

test.describe('carrinho e foco (bordas)', () => {
  test('foco preso no diálogo do carrinho e devolvido ao fechar', async ({ app: page }) => {
    await addToCart(page, 'v55', 'Icy Mint', 1);
    await addToCart(page, 'v155', 'Menthol', 1);
    await openCart(page);
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press('Tab');
      expect(await activeInside(page, '#app'), `Tab ${String(i)} saiu para a página atrás do modal`).toBe(false);
    }
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press('Shift+Tab');
      expect(await activeInside(page, '#app'), `Shift+Tab ${String(i)} saiu para a página atrás do modal`).toBe(false);
    }
  });

  test('diálogo: campos de quantidade rejeitam 0, negativo, vazio, decimal, texto e 11', async ({ app: page }) => {
    await addToCart(page, 'v155', 'Menthol', 4);
    const dialog = await openCart(page);
    const input = dialog.locator('[data-l-qty]');
    for (const [typed, expected] of [['0', '1'], ['-5', '1'], ['', '1'], ['3.7', '1'], ['dez', '1'], ['11', '10'], ['999', '10'], ['7', '7']] as const) {
      await input.fill(typed);
      await input.blur();
      await expect(input, `digitado "${typed}"`).toHaveValue(expected);
      await expect(dialog.locator('[data-subtotal]')).toHaveText(formatBRL(11000 * Number(expected)));
    }
  });

  test('diálogo: diminuir em 1 fica desabilitado e aumentar em 10 mantém 10 (anuncia o limite)', async ({ app: page }) => {
    await addToCart(page, 'v55', 'Icy Mint', 1);
    const dialog = await openCart(page);
    await expect(dialog.getByRole('button', { name: /Diminuir quantidade/ })).toBeDisabled();
    await dialog.locator('[data-l-qty]').fill('10');
    await dialog.locator('[data-l-qty]').blur();
    await dialog.getByRole('button', { name: /Aumentar quantidade/ }).click();
    await expect(dialog.locator('[data-l-qty]')).toHaveValue('10');
    await expect(page.locator('[aria-live]').filter({ hasText: 'Máximo de 10 unidades por item' })).toHaveCount(1);
  });

  // BUG-01 (ver 06-qa.md): no carrinho o limite só é anunciado a leitores de tela; PO exige mensagem visível.
  test('diálogo: limite de 10 mostra mensagem VISÍVEL (PO: Quantidade máxima por item)', async ({ app: page }) => {
    test.fail(true, 'BUG-01: mensagem de máximo não é exibida visualmente no carrinho');
    await addToCart(page, 'v55', 'Icy Mint', 10);
    const dialog = await openCart(page);
    await dialog.getByRole('button', { name: /Aumentar quantidade/ }).click();
    await expect(dialog.getByText(/Máximo de 10 unidades por item/).filter({ visible: true })).toBeVisible({ timeout: 1500 });
  });

  test('carrinho vazio: ação de voltar ao catálogo e nenhum botão de envio', async ({ app: page }) => {
    const dialog = await openCart(page);
    await expect(dialog.getByText('Seu carrinho está vazio')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Enviar pedido pelo WhatsApp' })).toBeHidden();
    await dialog.getByRole('button', { name: 'Ver catálogo' }).click();
    await expect(dialog).toBeHidden();
  });

  test('esvaziar depois de escolher região/pagamento: total some e envio fica inacessível', async ({ app: page }) => {
    await addToCart(page, 'v55', 'Icy Mint', 1);
    const dialog = await openCart(page);
    await dialog.getByRole('button', { name: 'Continuar', exact: true }).click();
    await dialog.getByLabel('Região de entrega (Palmas - TO)').selectOption('taquari');
    await dialog.getByRole('radio', { name: 'PIX' }).check();
    await dialog.getByRole('button', { name: /Voltar ao carrinho/ }).click();
    await dialog.getByRole('button', { name: 'Remover V55 Icy Mint' }).click();
    await expect(dialog.getByText('Seu carrinho está vazio')).toBeVisible();
    await expect(dialog.locator('[data-o-total]')).toBeHidden();
    await expect(dialog.getByRole('button', { name: 'Enviar pedido pelo WhatsApp' })).toBeHidden();
    await expect(page.locator('[data-badge]')).toBeHidden();
  });

  test('navegação por teclado entre sabores (setas) e seleção com Space', async ({ app: page }) => {
    const c = card(page, 'v155');
    await c.getByRole('radio').first().focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    const checked = c.getByRole('radio', { checked: true });
    await expect(checked).toHaveCount(1);
    await expect(checked).toBeFocused();
  });

  test('cada sabor tem nome textual (bolinha nunca é o único indicador)', async ({ app: page }) => {
    const names: Locator = page.locator('.flavor__name');
    expect(await names.count()).toBe(18);
    for (const t of await names.allTextContents()) expect(t.trim().length).toBeGreaterThan(2);
  });
});
