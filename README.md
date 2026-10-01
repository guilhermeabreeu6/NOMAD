# NOMAD puffs - site da loja

Astro (estático) + TypeScript. Comandos em `CLAUDE.md`. Node portátil: `export PATH="$HOME/.local/node:$PATH"`.

## Builds (mesmo código)
- `npm run build:vercel` -> `dist-vercel/` (noindex forçado; `vercel.json` na raiz).
- `npm run build:static` -> `dist-static/` para qualquer hospedagem. Variáveis (ver `.env.example`):
  `BASE_PATH` (ex. `/loja/`), `SITE_URL` (canonical/og), `NOINDEX` (`true` adiciona meta robots, X-Robots-Tag e robots.txt Disallow).

## Publicar o build estático (Apache/cPanel)
1. `BASE_PATH=/ npm run build:static` (ou `/loja/` se for subpasta).
2. Envie TODO o conteúdo de `dist-static/` (inclusive `.htaccess`, arquivo oculto) para `public_html/` (ou `public_html/loja/`).
3. Nginx: veja `deploy/static/nginx.conf.example`.
4. `robots.txt` só vale na raiz do domínio; em subpasta copie-o para a raiz se quiser controlar indexação.

## Preços
As imagens em `assets/produtos` têm o preço desenhado; ao mudar `src/data/catalog.ts`, refaça o PNG.
