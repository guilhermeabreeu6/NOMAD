import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CSP } from '../../src/data/csp';
import { AGE_KEY } from '../../src/lib/storage';

const root = path.resolve(import.meta.dirname, '..', '..');
const read = (p: string): string => readFileSync(path.join(root, p), 'utf8');

interface VercelConfig {
  framework: unknown;
  outputDirectory: string;
  headers: { source: string; headers: { key: string; value: string }[] }[];
}
const vercel = JSON.parse(read('vercel.json')) as VercelConfig;
const globalHeaders = Object.fromEntries(
  (vercel.headers.find((h) => h.source === '/(.*)')?.headers ?? []).map((h) => [h.key, h.value]),
);
const htaccess = read('deploy/static/htaccess.template');
const nginx = read('deploy/static/nginx.conf.example');
const cfHeaders = read('deploy/cloudflare/headers.template');

describe('configuração de deploy', () => {
  it('CSP idêntica em csp.ts, vercel.json, .htaccess, nginx e _headers (Cloudflare)', () => {
    expect(globalHeaders['Content-Security-Policy']).toBe(CSP);
    expect(cfHeaders).toContain(`  Content-Security-Policy: ${CSP}\n`);
    expect(htaccess).toContain(`"${CSP}"`);
    expect(nginx).toContain(`"${CSP}"`);
  });

  it('CSP sem unsafe-inline/unsafe-eval', () => {
    expect(CSP).not.toMatch(/unsafe-/);
  });

  it('mesmos headers de segurança em todos os alvos', () => {
    for (const key of [
      'X-Content-Type-Options',
      'Referrer-Policy',
      'X-Frame-Options',
      'Permissions-Policy',
      'Cross-Origin-Opener-Policy',
    ]) {
      const value = globalHeaders[key];
      expect(value, key).toBeTruthy();
      expect(htaccess).toContain(`${key} "${value ?? ''}"`);
      expect(cfHeaders).toContain(`  ${key}: ${value ?? ''}\n`);
    }
  });

  it('cloudflare: placeholder de noindex, previews *.pages.dev sempre noindex, cache só em /_astro/', () => {
    expect(cfHeaders).toContain('{{NOINDEX_BLOCK}}');
    expect(cfHeaders).toMatch(/https:\/\/:project\.pages\.dev\/\*\n\s+X-Robots-Tag: noindex, nofollow/);
    // Regras do _headers se somam: Cache-Control em /* duplicaria o valor em /_astro/*.
    expect(cfHeaders.match(/Cache-Control:/g)).toHaveLength(1);
    expect(cfHeaders).toMatch(/\/_astro\/\*\n\s+Cache-Control: public, max-age=31536000, immutable/);
  });

  it('vercel: noindex, framework nulo e dist-vercel', () => {
    expect(globalHeaders['X-Robots-Tag']).toBe('noindex, nofollow');
    expect(vercel.outputDirectory).toBe('dist-vercel');
    expect(vercel.framework).toBeNull();
  });

  it('htaccess: sem RewriteRule de roteamento, com placeholders de build', () => {
    expect(htaccess).toContain('{{BASE}}');
    expect(htaccess).toContain('{{NOINDEX_BLOCK}}');
    expect(htaccess).toContain('Options -Indexes');
    expect(htaccess).not.toMatch(/RewriteRule\s+\^/);
  });

  it('age-init.js usa a mesma chave de AGE_KEY', () => {
    expect(read('public/age-init.js')).toContain(AGE_KEY);
  });

  it('nenhum segredo em src/', () => {
    const files: string[] = [];
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        const full = path.join(dir, name);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.(ts|astro|css|js)$/.test(name)) files.push(full);
      }
    };
    walk(path.join(root, 'src'));
    expect(files.length).toBeGreaterThan(10);
    for (const f of files) {
      expect(readFileSync(f, 'utf8'), f).not.toMatch(/api[_-]?key|secret|password/i);
    }
  });
});
