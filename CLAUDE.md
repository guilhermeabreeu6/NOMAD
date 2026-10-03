# NOMAD puffs — site da loja

Loja de pods descartáveis em Palmas – TO. Pedidos pelo WhatsApp (63) 98123-9498.
Slogan: "VAPOR SEM FRONTEIRAS". Proibida a venda para menores de 18 anos.

## Stack
- Linguagem/framework: Astro (saída estática) + TypeScript — ADR em `docs/squad/site-mvp/04-tech-lead.md`
- Testes: Vitest (lógica em src/lib) + Playwright/Chromium + axe (E2E)
- Banco: nenhum no MVP (catálogo em arquivo de dados versionado)

## Comandos
- Node portátil: `export PATH="$HOME/.local/node:$PATH"` antes de qualquer `npm`/`npx` (Node v24 LTS, npm 11)
- instalar: `npm ci` (+ `npm run test:e2e:install` uma vez, para o Chromium)
- dev:      `npm run dev`
- build:    `npm run build` (gera `dist-vercel/`, `dist-static/` e `dist-cloudflare/`; ou `build:vercel` / `build:static` / `build:cloudflare`)
- teste:    `npm test` (unitários) · `npm run test:e2e` (E2E)
- lint:     `npm run lint` · `npm run typecheck` · tudo junto: `npm run check`

## Versões de deploy (mesmo código-fonte)
0. **Cloudflare Pages — PRODUÇÃO em nomadpuffs.com.br** (plano gratuito, uso comercial permitido).
   `npm run build:cloudflare` → `dist-cloudflare/` + `_headers` (de `deploy/cloudflare/headers.template`).
   noindex por padrão (só `NOINDEX=false` libera); guia em `docs/deploy-cloudflare.md`.
1. **Vercel** — só visualização (`nomad-v1-nine.vercel.app`, `vercel.json`); Hobby não permite uso comercial.
2. **Estático genérico** — `dist-static/` com `.htaccess` para Apache/Nginx/cPanel (contingência).

## Dados do catálogo (fonte: docs/catalogo.pdf)
| Modelo | Preço | Sabores |
|---|---|---|
| V55 | R$ 85 | Pineapple Ice, Uva Ice, Icy Mint |
| V155 | R$ 110 | Pineapple Ice, Menthol, Grape Ice, Watermelon Ice, Icy Mint |
| V400 Mix Slim | R$ 140 | Icy Mint + Peach Grape, Menthol + Mighty Melon, Mango + Passion Fruit Guava, Strawberry Grape Ice + Kiwi Watermelon, Cherry + Grape |
| Elfbar Pro 40K | R$ 140 | Sour Apple Ice, Strawberry Blend, Pink Lemonade, Watermelon + Peach Frost, Tropical Baja |

Taxa de entrega em Palmas:
| Região | Taxa |
|---|---|
| Quadras 700 Sul a 200 Norte/Sul | R$ 8 |
| Quadras 300 Norte a 600 Norte | R$ 10 |
| Quadras 800 a 1200 | R$ 10 |
| Quadras 1300 a 1500 Sul | R$ 15 |
| Santo Amaro | R$ 15 |
| Lago Norte | R$ 20 |
| Bertaville e Aurenys | R$ 30 |
| Taquaralto e Lago Sul | R$ 35 |
| Taquari | R$ 35 |

Áreas atendidas sem taxa tabelada (taxa a combinar no WhatsApp, `ARRANGE_AREAS`): Araras, Caribe, Polinésia.
Bairro não listado: "Outra região" (a combinar).

Promoção de frete em vigor (`src/data/promos.ts`, lógica em `src/lib/promo.ts`, docs em `docs/squad/promo-frete-outubro/`):
- **Frete grátis de outubro** — de 01/10/2026 00:00 até 31/10/2026 23:59:59 (Palmas, UTC-3; intervalo `[início, fim)`).
- Grátis: Quadras 700 Sul a 200 Norte/Sul, 300 Norte a 600 Norte, 800 a 1200, 1300 a 1500 Sul e Santo Amaro.
- Taxa normal: Lago Norte, Bertaville, Aurenys, Taquaralto, Lago Sul, Taquari. A combinar: Araras, Caribe, Polinésia e outros bairros.
- Landing `/outubro` + banner na home; estado `html[data-promo]` (breve/ativa/encerrada) gravado por `public/age-init.js`
  (instantes duplicados ali em epoch ms; teste trava a igualdade). Nunca usar `Date.now()` em `src/lib`/`src/scripts`
  fora de `src/scripts/clock.ts` (lint).

Formas de pagamento: PIX, cartão de débito, cartão de crédito (na entrega).

## Identidade visual (assets/brand, assets/produtos)
- Fundo: quase preto `#131416`; texto creme `#E8DCC4`; destaque laranja `#E38A4E`; texto secundário cinza quente.
- Tipografia: sans geométrica extra-larga e pesada para títulos (estilo "NOMAD"/"V155"),
  serifada itálica para "puffs", rótulos em caixa alta com tracking largo.
- Marca d'água do ícone "N" em círculo, em cinza muito escuro, nos cantos.
- Cada sabor tem uma bolinha colorida (amarelo, azul claro, roxo, rosa, verde…), ver `assets/produtos/*.png`.

## Convenções
- Todo texto da interface em português do Brasil.
- Mobile-first (a maioria dos clientes vem do Instagram/WhatsApp no celular).
- Acessibilidade WCAG AA; nenhum segredo no código.
- Nunca fazer `git push` de dentro dos agentes; o coordenador faz.

## Squad Bot
Fluxo: pm -> po -> designer -> tech-lead -> dev -> qa -> tech-lead (revisão) -> devops.
Artefatos em docs/squad/<slug>/ (01-pm, 02-po, 03-designer, 04-tech-lead, 05-dev, 06-qa, 07-devops).
Referência do time (Squad Bot Universal v2): `docs/squad-bot/`. Os agentes em uso são os globais (~/.claude/agents).
