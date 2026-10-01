// @ts-check
// Wrapper multiplataforma (Windows/cmd.exe) para os dois builds do mesmo código.
//   node scripts/build.mjs --target=vercel|static [--base=/loja/] [--out=dist-xyz]
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);

/** @param {string} name */
function arg(name) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

/** Normaliza para começar e terminar com "/". @param {string | undefined} raw */
function normalizeBase(raw) {
  let b = (raw ?? '').trim();
  if (b === '' || b === '/') return '/';
  if (!b.startsWith('/')) b = `/${b}`;
  if (!b.endsWith('/')) b = `${b}/`;
  return b;
}

async function main() {
  const target = arg('target');
  if (target !== 'vercel' && target !== 'static') {
    throw new Error('Use --target=vercel ou --target=static');
  }

  // .env local é opcional (não versionado).
  const envFile = path.join(root, '.env');
  if (existsSync(envFile) && typeof process.loadEnvFile === 'function') process.loadEnvFile(envFile);

  const env = process.env;
  let outDir;
  let base;
  let noindex;
  let siteUrl = (env['SITE_URL'] ?? '').trim();

  if (target === 'vercel') {
    outDir = arg('out') ?? 'dist-vercel';
    base = '/';
    noindex = true;
    if (!siteUrl && env['VERCEL_PROJECT_PRODUCTION_URL']) {
      siteUrl = `https://${env['VERCEL_PROJECT_PRODUCTION_URL']}`;
    }
  } else {
    outDir = arg('out') ?? 'dist-static';
    base = normalizeBase(arg('base') ?? env['BASE_PATH']);
    noindex = env['NOINDEX'] === 'true';
  }

  env['DEPLOY_TARGET'] = target;
  env['BASE_PATH'] = base;
  env['NOINDEX'] = String(noindex);
  env['SITE_URL'] = siteUrl;

  const outAbs = path.resolve(root, outDir);
  const { build } = await import('astro');
  await build({ root, outDir: outAbs, base, ...(siteUrl ? { site: siteUrl } : {}), mode: 'production' });

  await writeFile(
    path.join(outAbs, 'robots.txt'),
    noindex ? 'User-agent: *\nDisallow: /\n' : 'User-agent: *\nAllow: /\n',
  );

  if (target === 'static') {
    const tpl = await readFile(path.join(root, 'deploy', 'static', 'htaccess.template'), 'utf8');
    const block = noindex ? '  Header always set X-Robots-Tag "noindex, nofollow"' : '  # NOINDEX=false: sem X-Robots-Tag';
    const out = tpl.replaceAll('{{BASE}}', base).replace('{{NOINDEX_BLOCK}}', block);
    await mkdir(outAbs, { recursive: true });
    await writeFile(path.join(outAbs, '.htaccess'), out);
  }

  console.log(`[build] ${target} -> ${outDir} (base=${base}, noindex=${noindex})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
