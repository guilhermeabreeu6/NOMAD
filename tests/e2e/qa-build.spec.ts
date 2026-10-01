// QA: artefatos dos dois builds (noindex só onde deve) e build estático com BASE_PATH/SITE_URL.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const root = process.cwd();
const read = (p: string): string => readFileSync(path.join(root, p), 'utf8');

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)],
  );
}

test.describe('artefatos de build', () => {
  // eslint-disable-next-line no-empty-pattern
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'vercel-mobile', 'verificação de arquivos roda uma vez');
  });

  test('dist-vercel: noindex em index e 404, robots disallow, sem .htaccess', () => {
    for (const f of ['index.html', '404.html']) {
      expect(read(`dist-vercel/${f}`), f).toMatch(/<meta name="robots" content="noindex, nofollow"/);
    }
    expect(read('dist-vercel/robots.txt')).toContain('Disallow: /');
    expect(existsSync(path.join(root, 'dist-vercel/.htaccess'))).toBe(false);
  });

  test('vercel.json: noindex via header em todas as rotas e saída dist-vercel', () => {
    const cfg = JSON.parse(read('vercel.json')) as {
      outputDirectory: string;
      rewrites?: unknown;
      headers: { source: string; headers: { key: string; value: string }[] }[];
    };
    expect(cfg.outputDirectory).toBe('dist-vercel');
    const all = cfg.headers.find((h) => h.source === '/(.*)');
    expect(all?.headers).toContainEqual({ key: 'X-Robots-Tag', value: 'noindex, nofollow' });
    expect(cfg.rewrites).toBeUndefined();
  });

  test('dist-e2e-static (base /loja/): sem noindex, links/asset sob /loja/, .htaccess coerente', () => {
    const html = read('dist-e2e-static/index.html');
    expect(html).not.toMatch(/name="robots"/);
    const refs = [...html.matchAll(/(?:href|src|srcset)="(\/[^"]*)"/g)].map((m) => m[1] ?? '');
    expect(refs.length).toBeGreaterThan(0);
    for (const r of refs) expect(r.startsWith('/loja/'), r).toBe(true);
    expect(read('dist-e2e-static/robots.txt')).toContain('Allow: /');
    const ht = read('dist-e2e-static/.htaccess')
      .split(String.fromCharCode(10))
      .filter((l) => !l.trim().startsWith('#'))
      .join(' ');
    expect(ht).toContain('ErrorDocument 404 /loja/404.html');
    expect(ht).not.toMatch(/RewriteRule|X-Robots-Tag "noindex/);
    expect(ht).not.toMatch(/\{\{/);
  });

  test('nenhum build referencia recurso exclusivo da Vercel nem terceiros', () => {
    for (const dir of ['dist-vercel', 'dist-e2e-static']) {
      for (const f of walk(path.join(root, dir)).filter((x) => /\.(html|js|css)$/.test(x))) {
        const txt = readFileSync(f, 'utf8');
        expect(txt, f).not.toMatch(/_vercel\/|\/api\/|@vercel\//);
        expect(txt, f).not.toMatch(/googletagmanager|google-analytics|fonts\.googleapis|cdn\./);
      }
    }
  });

  test('nenhum segredo/chave em src ou dist', () => {
    for (const dir of ['dist-vercel', 'dist-e2e-static', 'src']) {
      for (const f of walk(path.join(root, dir)).filter((x) => /\.(html|js|css|ts|astro)$/.test(x))) {
        expect(readFileSync(f, 'utf8'), f).not.toMatch(/(api[_-]?key|secret|password|sk_live|BEGIN [A-Z ]*PRIVATE KEY)/i);
      }
    }
  });
});

test.describe('build estático parametrizado (BASE_PATH / SITE_URL / NOINDEX)', () => {
  test.describe.configure({ mode: 'serial' });
  // eslint-disable-next-line no-empty-pattern
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'vercel-mobile', 'compila uma vez');
  });

  function build(out: string, env: Record<string, string>, base?: string): { status: number | null; log: string } {
    rmSync(path.join(root, out), { recursive: true, force: true });
    const args = ['scripts/build.mjs', '--target=static', `--out=${out}`];
    if (base) args.push(`--base=${base}`);
    const r = spawnSync(process.execPath, args, { cwd: root, env: { ...process.env, ...env }, encoding: 'utf8' });
    return { status: r.status, log: `${r.stdout}${r.stderr}` };
  }

  test('BASE_PATH por env + SITE_URL + NOINDEX=true: canonical, noindex e htaccess', () => {
    const out = 'dist-qa-a';
    const r = build(out, { BASE_PATH: 'qa/sub', SITE_URL: 'https://exemplo.com.br', NOINDEX: 'true' });
    expect(r.status, r.log).toBe(0);
    const html = read(`${out}/index.html`);
    expect(html).toMatch(/<meta name="robots" content="noindex, nofollow"/);
    expect(html).toContain('rel="canonical" href="https://exemplo.com.br/qa/sub/"');
    for (const m of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) expect(m[1]?.startsWith('/qa/sub/'), m[1]).toBe(true);
    expect(read(`${out}/robots.txt`)).toContain('Disallow: /');
    expect(read(`${out}/.htaccess`)).toContain('Header always set X-Robots-Tag "noindex, nofollow"');
    expect(read(`${out}/.htaccess`)).toContain('ErrorDocument 404 /qa/sub/404.html');
    rmSync(path.join(root, out), { recursive: true, force: true });
  });

  test('NOINDEX ausente/false e base raiz: sem noindex em nenhum lugar', () => {
    const out = 'dist-qa-b';
    const r = build(out, { BASE_PATH: '', SITE_URL: '', NOINDEX: 'false' });
    expect(r.status, r.log).toBe(0);
    const html = read(`${out}/index.html`);
    expect(html).not.toMatch(/name="robots"/);
    expect(html).not.toMatch(/rel="canonical"/);
    expect(read(`${out}/404.html`)).not.toMatch(/name="robots"/);
    expect(read(`${out}/robots.txt`)).toContain('Allow: /');
    expect(read(`${out}/.htaccess`)).not.toMatch(/X-Robots-Tag "noindex/);
    for (const m of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) expect(m[1]?.startsWith('//'), m[1]).toBe(false);
    rmSync(path.join(root, out), { recursive: true, force: true });
  });
});
