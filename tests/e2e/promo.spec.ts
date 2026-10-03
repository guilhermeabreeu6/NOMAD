// promo-frete-outubro: banner da home + checkout + mensagem do WhatsApp, com relógio simulado nas bordas.
import type { Locator, Page } from '@playwright/test';
import { AGE_KEY, addToCart, decodeWaText, expect, openCart, test } from './fixtures';
import { ANTES_DO_INICIO, B2, B3, B4, EM_OUTUBRO } from '../instants';

const REGION_LABEL = 'Região de entrega (Palmas - TO)';
const FREE_LINE = 'Entrega: Quadras 700 Sul a 200 Norte/Sul - Frete grátis (promoção de outubro)';

async function toCheckout(page: Page): Promise<Locator> {
  const dialog = await openCart(page);
  await dialog.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(dialog.getByLabel(REGION_LABEL)).toBeVisible();
  return dialog;
}

/** Monta 1x V155 (R$ 110,00), escolhe região e PIX. */
async function prepareOrder(page: Page, regionId: string): Promise<Locator> {
  await addToCart(page, 'v155', 'Menthol', 1);
  const dialog = await toCheckout(page);
  await dialog.getByLabel(REGION_LABEL).selectOption(regionId);
  await dialog.getByRole('radio', { name: 'PIX' }).check();
  return dialog;
}

async function sendAndRead(page: Page, dialog: Locator): Promise<string> {
  const popup = page.waitForEvent('popup');
  await dialog.getByRole('button', { name: 'Enviar pedido pelo WhatsApp' }).click();
  return decodeWaText((await popup).url());
}

function option(dialog: Locator, id: string): Locator {
  return dialog.locator(`#region option[value="${id}"]`);
}

test.describe('antes da promoção (30/09 23:50)', () => {
  test.use({ now: ANTES_DO_INICIO });

  test('banner oculto, opção e total com a taxa normal, mensagem sem frete grátis', async ({ app: page }) => {
    await expect(page.locator('html')).toHaveAttribute('data-promo', 'breve');
    await expect(page.locator('[data-promo-banner]')).toBeHidden();
    const dialog = await prepareOrder(page, 'q700s-200');
    await expect(option(dialog, 'q700s-200')).toHaveText('Quadras 700 Sul a 200 Norte/Sul - R$ 8,00');
    await expect(dialog.locator('[data-fee-chip]')).toHaveText('Taxa de entrega: R$ 8,00');
    await expect(dialog.locator('[data-o-total]')).toHaveText('R$ 118,00');
    const text = await sendAndRead(page, dialog);
    expect(text).toContain('Entrega: Quadras 700 Sul a 200 Norte/Sul - R$ 8,00');
    expect(text).toContain('Total: R$ 118,00');
    expect(text).not.toContain('Frete grátis');
  });
});

for (const [name, now, timezoneId] of [
  ['B2: 01/10 00:00', B2, undefined],
  ['B2 com o aparelho em Tóquio', B2, 'Asia/Tokyo'],
  ['B3: 31/10 23:59', B3, undefined],
  ['B3 com o aparelho em Noronha', B3, 'America/Noronha'],
] as const) {
  test.describe(`promoção ativa (${name})`, () => {
    test.use({ now, ...(timezoneId ? { timezoneId } : {}) });

    test('banner visível (um único link para a landing) e frete grátis no checkout e na mensagem', async ({
      app: page,
    }) => {
      await expect(page.locator('html')).toHaveAttribute('data-promo', 'ativa');
      const banner = page.locator('[data-promo-banner]');
      await expect(banner).toBeVisible();
      await expect(banner).toHaveAttribute('href', /outubro\/$/);
      await expect(banner.locator('a')).toHaveCount(0);
      await expect(banner).toContainText('Frete grátis o mês todo');

      const dialog = await prepareOrder(page, 'q700s-200');
      await expect(option(dialog, 'q700s-200')).toHaveText('Quadras 700 Sul a 200 Norte/Sul - Grátis em outubro');
      await expect(option(dialog, 'taquari')).toHaveText('Taquari - R$ 35,00');
      await expect(dialog.locator('[data-fee-chip]')).toContainText('Taxa de entrega: grátis (promoção de outubro)');
      await expect(dialog.locator('[data-fee-chip] s')).toHaveText('R$ 8,00');
      await expect(dialog.locator('[data-o-fee]')).toHaveText('Grátis');
      await expect(dialog.locator('[data-o-total]')).toHaveText('R$ 110,00');
      const text = await sendAndRead(page, dialog);
      expect(text).toContain(FREE_LINE);
      expect(text).toContain('Total: R$ 110,00');
    });
  });
}

test.describe('região fora da promoção durante a promoção', () => {
  test.use({ now: B3 });

  test('Taquari: R$ 35,00, chip "fora da promoção" e mensagem sem mencionar a promoção', async ({ app: page }) => {
    const dialog = await prepareOrder(page, 'taquari');
    await expect(dialog.locator('[data-fee-chip]')).toHaveText('Taxa de entrega: R$ 35,00 (região fora da promoção)');
    await expect(dialog.locator('[data-o-total]')).toHaveText('R$ 145,00');
    const text = await sendAndRead(page, dialog);
    expect(text).toContain('Entrega: Taquari - R$ 35,00');
    expect(text).toContain('Total: R$ 145,00');
    expect(text).not.toMatch(/grátis|promoção/i);
  });
});

test.describe('depois da promoção (B4: 01/11 00:00)', () => {
  test.use({ now: B4 });

  test('banner oculto e taxa normal', async ({ app: page }) => {
    await expect(page.locator('html')).toHaveAttribute('data-promo', 'encerrada');
    await expect(page.locator('[data-promo-banner]')).toBeHidden();
    const dialog = await prepareOrder(page, 'santo-amaro');
    await expect(option(dialog, 'santo-amaro')).toHaveText('Santo Amaro - R$ 15,00');
    await expect(dialog.locator('[data-o-total]')).toHaveText('R$ 125,00');
    const text = await sendAndRead(page, dialog);
    expect(text).toContain('Entrega: Santo Amaro - R$ 15,00');
    expect(text).not.toContain('Frete grátis');
  });
});

test.describe('áreas a combinar (Araras, Caribe, Polinésia)', () => {
  test.use({ now: EM_OUTUBRO });

  test('Araras: total + entrega a combinar e mensagem própria', async ({ app: page }) => {
    const dialog = await prepareOrder(page, 'araras');
    await expect(option(dialog, 'araras')).toHaveText('Araras - taxa a combinar');
    await expect(option(dialog, 'polinesia')).toHaveText('Polinésia - taxa a combinar');
    await expect(dialog.locator('[data-fee-chip]')).toHaveText('Taxa de entrega: a combinar');
    await expect(dialog.locator('[data-o-total]')).toHaveText('R$ 110,00 + entrega a combinar');
    const text = await sendAndRead(page, dialog);
    expect(text).toContain('Entrega: Araras (taxa a combinar)');
    expect(text).toContain('Total: R$ 110,00 + entrega a combinar');
  });

  test('outra região continua a combinar durante a promoção', async ({ app: page }) => {
    const dialog = await prepareOrder(page, 'outra');
    await expect(dialog.locator('[data-o-total]')).toHaveText('R$ 110,00 + entrega a combinar');
    const text = await sendAndRead(page, dialog);
    expect(text).toContain('Entrega: Outra região (a combinar)');
  });
});

test.describe('virada da promoção com a página aberta', () => {
  test.describe('drawer aberto às 31/10 23:59:30', () => {
    test.use({ now: B4 - 30_000 });

    test('ao passar de 00:00 o checkout volta para a taxa normal sem recarregar', async ({ app: page }) => {
      const dialog = await prepareOrder(page, 'q700s-200');
      await expect(dialog.locator('[data-o-total]')).toHaveText('R$ 110,00');
      await expect(page.locator('html')).toHaveAttribute('data-promo', 'ativa');
      await page.clock.fastForward('00:35');
      await expect(dialog.locator('[data-o-total]')).toHaveText('R$ 118,00');
      await expect(dialog.locator('[data-o-fee]')).toHaveText('R$ 8,00');
      await expect(option(dialog, 'q700s-200')).toHaveText('Quadras 700 Sul a 200 Norte/Sul - R$ 8,00');
      await expect(page.locator('html')).toHaveAttribute('data-promo', 'encerrada');
      await expect(page.locator('[data-promo-banner]')).toBeHidden();
    });
  });

  test.describe('envio depois da virada sem o timer ter rodado', () => {
    test.use({ now: B4 - 60_000 });

    test('recheque no envio: não abre o WhatsApp, avisa e atualiza; o próximo clique envia com a taxa normal', async ({
      app: page,
    }) => {
      const popups: string[] = [];
      page.on('popup', (p) => popups.push(p.url()));
      const dialog = await prepareOrder(page, 'q700s-200');
      await expect(dialog.locator('[data-o-total]')).toHaveText('R$ 110,00');
      // muda a hora do sistema sem disparar timers (simula aparelho suspenso/aba congelada)
      await page.clock.setSystemTime(B4 + 1_000);
      await dialog.getByRole('button', { name: 'Enviar pedido pelo WhatsApp' }).click();
      await expect(dialog.locator('[data-promo-changed]')).toHaveText(
        'A promoção de frete terminou. O total foi atualizado.',
      );
      await expect(dialog.locator('[data-o-total]')).toHaveText('R$ 118,00');
      expect(popups).toEqual([]);

      const text = await sendAndRead(page, dialog);
      expect(text).toContain('Entrega: Quadras 700 Sul a 200 Norte/Sul - R$ 8,00');
      expect(text).toContain('Total: R$ 118,00');
    });
  });
});

test.describe('sem flash de estado errado', () => {
  test('em 01/11 com HTML gerado em outubro, o banner já está oculto no DOMContentLoaded', async ({ page }) => {
    await page.clock.install({ time: B4 + 5 * 60_000 });
    await page.addInitScript((key) => {
      localStorage.setItem(key, '1');
      document.addEventListener('DOMContentLoaded', () => {
        const banner = document.querySelector('[data-promo-banner]');
        (window as unknown as { __first: unknown }).__first = {
          phase: document.documentElement.dataset['promo'],
          bannerShown: banner ? getComputedStyle(banner).display !== 'none' && (banner as HTMLElement).offsetHeight > 0 : false,
        };
      });
    }, AGE_KEY);
    await page.goto('./');
    const first = await page.evaluate(() => (window as unknown as { __first: unknown }).__first);
    expect(first).toEqual({ phase: 'encerrada', bannerShown: false });
  });

  test('em outubro o banner aparece sem deslocar o layout (CLS < 0,01)', async ({ page }) => {
    await page.clock.install({ time: EM_OUTUBRO });
    await page.addInitScript((key) => {
      localStorage.setItem(key, '1');
      (window as unknown as { __cls: number }).__cls = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
          if (!e.hadRecentInput) (window as unknown as { __cls: number }).__cls += e.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    }, AGE_KEY);
    await page.goto('./');
    await expect(page.locator('[data-promo-banner]')).toBeVisible();
    await page.clock.runFor(500);
    const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
    expect(cls).toBeLessThan(0.01);
  });
});
