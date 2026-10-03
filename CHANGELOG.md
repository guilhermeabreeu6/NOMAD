# Changelog

Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). Versionamento: [SemVer](https://semver.org/lang/pt-BR/).

## [0.2.1] - 2026-10-03
### Adicionado
- Alvo de build `cloudflare` (`npm run build:cloudflare` → `dist-cloudflare/`) para produção na Cloudflare Pages em
  nomadpuffs.com.br: gera `_headers` com a mesma CSP e os mesmos cabeçalhos de segurança dos outros alvos, cache longo
  só em `/_astro/*`, noindex por padrão e previews `*.pages.dev` sempre noindex.
- Guia `docs/deploy-cloudflare.md` (projeto Pages, variáveis, domínio e DNS no Registro.br, verificação).
### Alterado
- README e CLAUDE.md: produção passa a ser a Cloudflare Pages; link da Vercel corrigido para nomad-v1-nine.vercel.app.

## [0.2.0] - 2026-10-03
### Adicionado
- Promoção de frete grátis de outubro (`promo-frete-outubro`): de 01/10/2026 00:00 a 31/10/2026 23:59:59
  (horário de Palmas) nas Quadras 700 Sul a 200 Norte/Sul, 300 Norte a 600 Norte, 800 a 1200, 1300 a 1500 Sul
  e Santo Amaro. Lago Norte, Bertaville, Aurenys, Taquaralto, Lago Sul e Taquari seguem com a taxa normal.
- Checkout e mensagem do WhatsApp com "Frete grátis (promoção de outubro)" e total coerente; aviso
  "fora da promoção" para regiões excluídas; recheque no envio se a promoção virar com o carrinho aberto.
- Áreas Araras, Caribe e Polinésia no checkout, com taxa a combinar no WhatsApp.
- Landing `/outubro` (estados "em breve", "ativa" e "encerrada") e banner na home que leva a ela.
- Testes unitários das bordas de data e E2E com relógio simulado (inclusive com o aparelho em outro fuso).

### Alterado
- `computeTotals` e `buildOrderMessage` passam a receber o instante (`nowMs`); relógio injetado no cliente
  (`src/scripts/clock.ts`), com lint proibindo `Date.now()` no resto de `src/lib` e `src/scripts`.

## [0.1.0] - 2026-10-01
### Adicionado
- Site da NOMAD puffs (Astro estatico): catalogo, carrinho, pedido via WhatsApp, gate 18+.
- Duas saidas do mesmo codigo: `dist-vercel/` (preview noindex) e `dist-static/` (dominio proprio).
- CI (GitHub Actions), `npm run package:static`, exemplos de `.htaccess` e Nginx.
