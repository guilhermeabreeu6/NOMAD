import { addToCart, expect, openCart, test } from './fixtures';

test.describe('build vercel', () => {
  // eslint-disable-next-line no-empty-pattern
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'vercel-mobile', 'só no projeto Vercel');
  });

  test('noindex em meta, header e robots.txt; CSP presente', async ({ app: page, request }) => {
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
    const res = await request.get('./');
    expect(res.headers()['x-robots-tag']).toBe('noindex, nofollow');
    expect(res.headers()['content-security-policy']).toContain("script-src 'self'");
    const robots = await request.get('robots.txt');
    expect(await robots.text()).toContain('Disallow: /');
  });
});

test.describe('build estático em subpasta (/loja/)', () => {
  // eslint-disable-next-line no-empty-pattern
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'static-mobile', 'só no projeto estático');
  });

  test('todos os assets sob /loja/, sem 404 e sem terceiros além do wa.me', async ({ page }) => {
    const bad: string[] = [];
    const external: string[] = [];
    page.on('response', (r) => {
      const url = new URL(r.url());
      if (url.hostname !== '127.0.0.1') return;
      if (!url.pathname.startsWith('/loja/')) bad.push(`fora da base: ${url.pathname}`);
      if (r.status() >= 400) bad.push(`${String(r.status())} ${url.pathname}`);
    });
    page.on('request', (r) => {
      const url = new URL(r.url());
      if (!['127.0.0.1', 'wa.me'].includes(url.hostname) && !r.url().startsWith('data:')) external.push(r.url());
    });
    await page.context().route('https://wa.me/**', (route) => route.fulfill({ status: 200, body: 'ok' }));
    await page.addInitScript((k) => {
      localStorage.setItem(k, '1');
    }, 'nomad:age-ok:v1');
    await page.goto('./');
    await addToCart(page, 'v155', 'Menthol', 1);
    const dialog = await openCart(page);
    await dialog.getByRole('button', { name: 'Continuar', exact: true }).click();
    await page.reload();
    await expect(page.locator('#v155')).toBeAttached();
    expect(bad).toEqual([]);
    expect(external).toEqual([]);
  });

  test('sem meta noindex quando NOINDEX=false e página 404 real', async ({ page, request }) => {
    await page.goto('./');
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    const res = await request.get('nao-existe');
    expect(res.status()).toBe(404);
    expect(await res.text()).toContain('Página não encontrada');
    const robots = await request.get('robots.txt');
    expect(await robots.text()).toContain('Allow: /');
  });
});
