// promo-frete-outubro: landing /outubro (gate, três estados, regiões, CTAs com base, axe).
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { ANTES_DO_INICIO, B1, B2, B3, B4, EM_OUTUBRO } from '../instants';

test.use({ startPath: 'outubro/' });

async function scan(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(
    serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
    'violações axe',
  ).toEqual([]);
}

const hero = (page: Page) => page.locator('[data-hero-title]');

test.describe('gate 18+ na landing', () => {
  test.use({ now: EM_OUTUBRO });

  test('visitante novo vê o gate; ao confirmar, o foco vai para o h1 da promoção', async ({ fresh: page }) => {
    await expect(page.getByRole('dialog', { name: 'Você tem 18 anos ou mais?' })).toBeVisible();
    await expect(hero(page)).toBeHidden();
    await page.getByRole('button', { name: 'Tenho 18 anos ou mais' }).click();
    await expect(hero(page)).toBeFocused();
    await expect(hero(page)).toHaveText('Frete grátis', { useInnerText: true });
    await expect(page.locator('[data-legal-strip]')).toBeVisible();
  });

  test('recusa: "Acesso restrito" e nada da promoção visível', async ({ fresh: page }) => {
    await page.getByRole('button', { name: 'Sou menor de 18 anos' }).click();
    await expect(page.getByRole('heading', { name: 'Acesso restrito' })).toBeFocused();
    await expect(page.locator('#app')).toBeHidden();
    await expect(page.getByRole('link', { name: /Montar meu pedido/ })).toHaveCount(0);
  });
});

test.describe('estado "breve" (30/09 23:50)', () => {
  test.use({ now: ANTES_DO_INICIO });

  test('selo "Começa em 01/10", sem contador e CTA "Ver catálogo"', async ({ app: page }) => {
    await expect(page.locator('html')).toHaveAttribute('data-promo', 'breve');
    await expect(hero(page)).toHaveText('Frete grátis', { useInnerText: true });
    await expect(page.getByText('Começa em 01/10')).toBeVisible();
    await expect(page.locator('[data-countdown]')).toBeHidden();
    await expect(page.locator('.promo-hero').getByRole('link', { name: 'Ver catálogo' })).toBeVisible();
    await expect(page.getByText('A partir de 01/10')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Já pode escolher seu pod' })).toBeVisible();
    await scan(page);
  });
});

test.describe('virada para "ativa" com a landing aberta (B1 - 5 s)', () => {
  test.use({ now: B1 - 5_000 });

  test('à 00:00 de 01/10 a página passa a "ativa" e o contador aparece, sem recarregar', async ({ app: page }) => {
    await expect(page.locator('html')).toHaveAttribute('data-promo', 'breve');
    await expect(page.locator('[data-countdown]')).toBeHidden();
    await page.clock.fastForward('00:10');
    await expect(page.locator('html')).toHaveAttribute('data-promo', 'ativa');
    await expect(page.locator('[data-countdown]')).toHaveText('Termina em 31 dias');
    await expect(page.locator('.promo-hero').getByRole('link', { name: 'Montar meu pedido' })).toBeVisible();
  });
});

for (const [name, now, countdown] of [
  ['B2: 01/10 00:00', B2, 'Termina em 31 dias'],
  ['meio de outubro', EM_OUTUBRO, 'Termina em 17 dias'],
  ['B3: 31/10 23:59', B3, 'Último dia: termina hoje às 23h59'],
] as const) {
  test.describe(`estado "ativa" (${name})`, () => {
    test.use({ now });

    test('selo do período, contador, CTAs e regras visíveis', async ({ app: page }) => {
      await expect(page.locator('html')).toHaveAttribute('data-promo', 'ativa');
      await expect(page).toHaveTitle('Frete grátis em outubro - NOMAD puffs');
      await expect(hero(page)).toHaveText('Frete grátis', { useInnerText: true });
      await expect(page.locator('.period-badge:visible')).toHaveText('01/10 a 31/10 de 2026');
      await expect(page.locator('[data-countdown]')).toHaveText(countdown);
      await expect(page.locator('[data-countdown]')).not.toHaveAttribute('aria-live', /.+/);
      await expect(page.getByRole('heading', { name: 'Regras da promoção' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Aproveite enquanto é outubro' })).toBeVisible();
      await expect(page.getByText('Promoção encerrada')).toBeHidden();
    });
  });
}

test.describe('regiões e links (ativa)', () => {
  test.use({ now: EM_OUTUBRO });

  test('quadro: 5 regiões grátis, 6 bairros com taxa normal e 3 a combinar, um por linha', async ({ app: page }) => {
    const free = page.locator('[data-region-free] .region-row__name');
    await expect(free).toHaveText([
      'Quadras 700 Sul a 200 Norte/Sul',
      'Quadras 300 Norte a 600 Norte',
      'Quadras 800 a 1200',
      'Quadras 1300 a 1500 Sul',
      'Santo Amaro',
    ]);
    await expect(page.locator('[data-region-free] .fee-new')).toHaveText(Array(5).fill('Grátis'));
    await expect(page.locator('[data-region-free] s').first()).toHaveText('R$ 8,00');
    await expect(page.locator('[data-region-excluded] .region-row__name')).toHaveText([
      'Lago Norte',
      'Bertaville',
      'Aurenys',
      'Taquaralto',
      'Lago Sul',
      'Taquari',
    ]);
    await expect(page.locator('[data-region-excluded] .region-row__fee')).toHaveText([
      'R$ 20,00',
      'R$ 30,00',
      'R$ 30,00',
      'R$ 35,00',
      'R$ 35,00',
      'R$ 35,00',
    ]);
    await expect(page.locator('[data-region-arrange] .region-row__name')).toHaveText(['Araras', 'Caribe', 'Polinésia']);
    await expect(page.locator('[data-region-arrange] .region-row__fee')).toHaveText(Array(3).fill('a combinar'));
  });

  test('CTAs levam ao catálogo da home respeitando a base; "Ver onde vale" é âncora local', async ({ app: page, baseURL }) => {
    const base = new URL(baseURL ?? '').pathname; // "/" ou "/loja/"
    const cta = page.locator('.promo-hero').getByRole('link', { name: 'Montar meu pedido' });
    await expect(cta).toHaveAttribute('href', `${base}#catalogo`);
    await expect(page.getByRole('link', { name: 'Ver onde vale' })).toHaveAttribute('href', '#regioes');
    await expect(page.getByRole('link', { name: 'NOMAD puffs, voltar para a loja' })).toHaveAttribute('href', base);
    for (const href of await page.locator('.price-list--capa a').evaluateAll((as) => as.map((a) => a.getAttribute('href')))) {
      expect(href).toMatch(new RegExp(`^${base.replaceAll('/', '\\/')}#(v55|v155|v400-mix-slim|elfbar-pro-40k)$`));
    }
    await cta.click();
    await expect(page).toHaveURL(/#catalogo$/);
    await expect(page.locator('#catalogo')).toBeVisible();
    await expect(page.locator('[data-promo-banner]')).toBeVisible();
  });

  test('banner da home leva à landing', async ({ app: page }) => {
    await page.goto('./');
    await page.locator('[data-promo-banner]').click();
    await expect(page).toHaveURL(/outubro\/$/);
    await expect(hero(page)).toHaveText('Frete grátis', { useInnerText: true });
  });

  test('links do WhatsApp abrem em nova aba com rel seguro', async ({ app: page }) => {
    const links = page.locator('main a[href^="https://wa.me/"]');
    await expect(links).toHaveCount(2);
    for (const l of await links.all()) {
      await expect(l).toHaveAttribute('target', '_blank');
      await expect(l).toHaveAttribute('rel', /noopener/);
    }
  });

  test('sem rolagem horizontal em 320px e axe sem violações', async ({ app: page }) => {
    await scan(page);
    await page.setViewportSize({ width: 320, height: 700 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('estado "encerrada" (B4)', () => {
  test.use({ now: B4 });

  test('"Valeu, outubro", tabela normal de taxas, sem contador nem regras', async ({ app: page }) => {
    await expect(page.locator('html')).toHaveAttribute('data-promo', 'encerrada');
    await expect(hero(page)).toHaveText('Valeu, outubro', { useInnerText: true });
    await expect(page.getByText('Promoção encerrada')).toBeVisible();
    await expect(page.getByText('Encerrada em 31/10/2026')).toBeVisible();
    await expect(page.locator('[data-countdown]')).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Taxas de entrega em Palmas' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Regras da promoção' })).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Do catálogo ao WhatsApp' })).toBeHidden();
    await expect(page.locator('[data-region-free]')).toBeHidden();
    await expect(page.locator('.region-board--single .region-row')).toHaveCount(9 + 3 + 1);
    await expect(page.locator('.region-board--single .region-row__name').first()).toHaveText('Quadras 700 Sul a 200 Norte/Sul');
    await expect(page.locator('.region-board--single .region-row__fee').first()).toHaveText('R$ 8,00');
    await expect(page.getByRole('heading', { name: 'Seu próximo pod está no catálogo' })).toBeVisible();
    await scan(page);
  });
});
