// @ts-check
// Servidor estático sem rewrite (404 real) que aplica os headers do vercel.json. Uso em preview/E2E.
//   node scripts/serve-static.mjs --dir dist-vercel --port 4321 [--base /loja/]
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @param {string} name @param {string} fallback */
function arg(name, fallback) {
  const prefix = `--${name}=`;
  const i = process.argv.findIndex((a) => a === `--${name}` || a.startsWith(prefix));
  if (i === -1) return fallback;
  const a = process.argv[i] ?? '';
  return a.startsWith(prefix) ? a.slice(prefix.length) : (process.argv[i + 1] ?? fallback);
}

const dir = path.resolve(root, arg('dir', 'dist-static'));
const port = Number(arg('port', '4322'));
let base = arg('base', process.env['BASE_PATH'] || '/');
if (!base.startsWith('/')) base = `/${base}`;
if (!base.endsWith('/')) base += '/';

/** @type {{ headers: { source: string, headers: { key: string, value: string }[] }[] }} */
const vercel = JSON.parse(readFileSync(path.join(root, 'vercel.json'), 'utf8'));
const globalHeaders = vercel.headers.find((h) => h.source === '/(.*)')?.headers ?? [];

const MIME = /** @type {Record<string, string>} */ ({
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon',
});

/** @param {import('node:http').ServerResponse} res @param {number} status @param {string} type @param {Buffer|string} body @param {string} [cache] */
function send(res, status, type, body, cache) {
  for (const h of globalHeaders) res.setHeader(h.key, h.value);
  // O build static com NOINDEX=false não deve herdar o noindex da Vercel.
  if (process.env['SERVE_INDEXABLE'] === 'true') res.removeHeader('X-Robots-Tag');
  res.setHeader('Content-Type', type);
  if (cache) res.setHeader('Cache-Control', cache);
  res.statusCode = status;
  res.end(body);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    let pathname = decodeURIComponent(url.pathname);
    const notFound = async () => {
      const page = path.join(dir, '404.html');
      /** @type {Buffer|string} */
      let body = 'Not found';
      try {
        body = await readFile(page);
      } catch {
        /* sem 404.html */
      }
      send(res, 404, 'text/html; charset=utf-8', body, 'no-cache');
    };
    if (!pathname.startsWith(base)) return notFound();
    pathname = pathname.slice(base.length);
    let file = path.resolve(dir, pathname);
    if (file !== dir && !file.startsWith(dir + path.sep)) return notFound();
    try {
      const s = await stat(file);
      if (s.isDirectory()) file = path.join(file, 'index.html');
    } catch {
      return notFound();
    }
    let body;
    try {
      body = await readFile(file);
    } catch {
      return notFound();
    }
    const ext = path.extname(file);
    const cache = file.includes(`${path.sep}_astro${path.sep}`)
      ? 'public, max-age=31536000, immutable'
      : ext === '.html'
        ? 'public, max-age=0, must-revalidate'
        : 'public, max-age=3600';
    send(res, 200, MIME[ext] ?? 'application/octet-stream', body, cache);
  } catch {
    send(res, 500, 'text/plain', 'Erro');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`[serve] ${dir} em http://127.0.0.1:${port}${base}`);
});
