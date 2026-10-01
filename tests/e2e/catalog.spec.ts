import { MODELS } from '../../src/data/catalog';
import { formatBRL } from '../../src/lib/money';
import { card, expect, test } from './fixtures';

test.describe('catálogo', () => {
  for (const model of MODELS) {
    test(`${model.name}: preço, sabores e imagem`, async ({ app: page }) => {
      const c = card(page, model.id);
      await c.scrollIntoViewIfNeeded();
      await expect(c.locator('.price')).toHaveAttribute('aria-label', formatBRL(model.priceCents));
      const names = await c.locator('.flavor__name').allTextContents();
      expect(names).toEqual(model.flavors.map((f) => f.name));
      // nenhum sabor pré-selecionado
      await expect(c.getByRole('radio', { checked: true })).toHaveCount(0);
      const img = c.locator('img');
      const alt = await img.getAttribute('alt');
      expect(alt).toBe(`Card do catálogo NOMAD puffs: ${model.name}`);
      expect(alt).not.toMatch(/R\$|\d{2,3},/);
      await expect(img).toHaveAttribute('width', /\d+/);
      await expect(img).toHaveAttribute('height', /\d+/);
    });
  }

  test('imagem que falha mantém nome, preço e sabores', async ({ page }) => {
    await page.route(/\/_astro\/.*\.(avif|webp|png)$/, (r) => r.fulfill({ status: 404, body: '' }));
    await page.addInitScript((k) => {
      localStorage.setItem(k, '1');
    }, 'nomad:age-ok:v1');
    await page.goto('./');
    const c = card(page, 'v155');
    await c.scrollIntoViewIfNeeded();
    await expect(c.getByText('Imagem indisponível')).toBeVisible();
    await expect(c.locator('.flavor__name')).toHaveCount(5);
    await expect(c.locator('.price')).toHaveAttribute('aria-label', 'R$ 110,00');
  });

  test('página com lang pt-BR e um único h1', async ({ app: page }) => {
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
    await expect(page.locator('h1:visible')).toHaveCount(1);
  });
});
