# 04 - Tech Lead - site-mvp (NOMAD puffs) - PLANO

Entrada: `CLAUDE.md`, `01-pm.md`, `02-po.md`, `03-design.md`, inventário de `assets/` (8 PNGs, produtos 1080x1920 ~180-240 KB cada).
Estado do repo: sem código; `.gitignore` já prevê `node_modules/`, `dist/`, `dist-*/`, `.vercel/`, `.astro/`, `coverage/`, `.env*`.
Ambiente: Windows 11 + Git Bash, Node v24.21 / npm 11.19 portáteis, caminho com espaço (`site NOMAD`). Versões abaixo conferidas no registro npm em 2026-10-01.

> **Correção de dados (prevalece sobre 02-po RN1 e 03-design 2.2):** os sabores do V400 Mix Slim são os do `CLAUDE.md` atual:
> "Icy Mint + Peach Grape", "Menthol + Mighty Melon", "Mango + Passion Fruit Guava", "Strawberry Grape Ice + Kiwi Watermelon", "Cherry + Grape".
> O PO listava "Strawberry Grape Ice + Kiwi" e "Watermelon + Cherry + Grape" (erro de quebra de linha da imagem). Isso fecha a divergência D11 do design para o V400.

---

## 1. ADR-001 - Stack

**Decisão:** **Astro 7 (saída 100% estática, sem adapter) + TypeScript estrito + CSS puro com tokens + JS de cliente em TypeScript vanilla.**

| Critério | Astro 7 (escolhido) | Vite 8 + TS vanilla |
|---|---|---|
| HTML gerado no build a partir do arquivo de dados (catálogo, regiões, sabores) | nativo (componentes `.astro`, zero JS por padrão) | precisaria de template manual ou plugin |
| Otimização de imagens (AVIF/WebP + `srcset` + `width/height` p/ CLS 0) | nativo (`astro:assets` + sharp) | plugin extra (vite-imagetools) |
| `base` / `site` configuráveis por build | nativo (`base`, `site`, `outDir`, API programática `build()`) | `base` nativo, resto manual |
| JS de cliente mínimo, bundle com hash | sim (Vite por baixo) | sim |
| Dois builds do mesmo fonte sem recurso da Vercel | sim (sem `@astrojs/vercel`; Vercel só serve a pasta) | sim |
| Dependências diretas de runtime de build | astro, sharp, 3x @fontsource | vite + plugins + templating |
| Manutenção | muito ativo (7.3.5 em 2026-09-24), docs fortes | muito ativo |

Motivos: o site é essencialmente conteúdo estático gerado a partir de dados + uma ilha de interatividade (gate, carrinho, checkout). Astro entrega HTML pronto (texto/preço utilizáveis antes de qualquer JS, requisito do PO), pipeline de imagem e base path configurável sem plugins, e continua sendo Vite por baixo (mesmo ecossistema do Vitest). Sem framework de UI (React/Vue/Svelte): a interatividade é pequena e o design pede componentes próprios; manipulação de DOM com `textContent`/`<template>`.

Rejeitados: Next.js (pesado, orientado a servidor/Vercel), Vite vanilla (reimplementar templating e imagens), SvelteKit/Eleventy (sem ganho relevante e menor familiaridade com pipeline de imagens tipado).

Consequências: precisa de `sharp` (binário nativo; tem prebuild para win32-x64 e linux-x64 da Vercel). Saída sempre `output: 'static'`. Nada de SSR, endpoints em runtime, middleware, edge ou funções.

## 2. Dependências (todas justificadas)

`dependencies` (necessárias no build da Vercel):
| Pacote | Versão | Por quê |
|---|---|---|
| `astro` | `^7.3.5` | framework/SSG (ADR-001) |
| `sharp` | `^0.35.5` | serviço de imagem do `astro:assets` (é opcional no Astro; declarar explicitamente para garantir instalação) |
| `@fontsource/syne` | `^5.3.0` | self-host de Syne 800 (design 2.3, LGPD: sem Google Fonts) |
| `@fontsource/lexend` | `^5.3.0` | self-host Lexend 400/500/600 |
| `@fontsource/lora` | `^5.3.0` | self-host Lora 500 italic |

`devDependencies`:
| Pacote | Versão | Por quê |
|---|---|---|
| `typescript` | `~6.0.3` | **não usar 7.x**: `typescript-eslint` exige `<6.1.0` e `@astrojs/check` exige `^5 \|\| ^6` |
| `@astrojs/check` | `^0.9.10` | `astro check` (typecheck de `.astro` + `.ts`) |
| `@types/node` | `^24.19.0` | scripts Node (`scripts/*.mjs` via `// @ts-check`) |
| `vitest` | `^5.0.3` | unitários (Vite 8 compatível, ESM nativo) |
| `@playwright/test` | `^1.63.0` | E2E (só Chromium, ver seção 9) |
| `@axe-core/playwright` | `^4.13.0` | checagem automática WCAG no E2E (substitui plugin de lint a11y) |
| `eslint` | `^10.11.0` | lint |
| `@eslint/js` | `^10.0.1` | config recomendada |
| `typescript-eslint` | `^8.71.0` | regras TS |
| `eslint-plugin-astro` | `^3.2.1` | lint de `.astro` |
| `globals` | `^17.13.0` | globals browser/node no flat config |

Não adicionar: `cross-env` (resolvido com wrapper Node), framework de UI, bibliotecas de estado, CSS frameworks, analytics, prettier (opcional futuro). Qualquer dependência nova exige justificativa no `05-dev.md`.
`package.json`: `"type": "module"`, `"private": true`, `"engines": { "node": ">=22.12 <25" }` (Vercel usa Node 24.x).

## 3. Estrutura de pastas (arquivos a criar)

```
site NOMAD/
  package.json, package-lock.json        # npm (lockfile versionado; Vercel usa `npm ci`)
  astro.config.mjs                       # lê env setado por scripts/build.mjs
  tsconfig.json                          # extends "astro/tsconfigs/strictest"; include src, tests, scripts
  eslint.config.js                       # flat config (seção 8)
  vitest.config.ts                       # environment 'node', include tests/unit/**/*.test.ts, coverage v8 opcional
  playwright.config.ts                   # seção 9
  vercel.json                            # build + headers (seção 7)
  .env.example                           # SITE_URL=, BASE_PATH=/, NOINDEX=false (sem segredos)
  README.md                              # comandos + guia de publicação estática (Apache/Nginx/cPanel)
  assets/                                # (existe) fonte original dos PNGs; importados pelo Astro, não copiar
  deploy/
    static/htaccess.template             # Apache: headers, cache, MIME, 404, -Indexes (copiado p/ .htaccess no build static)
    static/nginx.conf.example            # equivalente Nginx (documentação; não vai p/ a pasta publicada)
  public/
    age-init.js                          # script clássico bloqueante (gate sem flash), seção 6.6
    favicon-32.png, apple-touch-icon.png # gerados 1x a partir de assets/brand/favicon.png (sharp) e commitados
  scripts/
    build.mjs                            # wrapper: --target=vercel|static, --base, --out; chama build() do Astro; pós-build
    serve-static.mjs                     # servidor estático Node sem rewrite (node:http), aplica headers do vercel.json
  src/
    env.d.ts
    data/
      catalog.ts                         # FONTE ÚNICA: modelos, sabores, preços, regiões, pagamentos, WhatsApp, limites
      product-images.ts                  # modelId -> import de assets/produtos/*.png (só build; nunca importado no cliente)
    lib/                                 # lógica PURA (sem DOM), 100% testada
      money.ts
      cart.ts
      order.ts
      whatsapp.ts
      storage.ts
      age-gate.ts
    scripts/                             # cliente (DOM), importa src/lib + src/data/catalog
      main.ts                            # bootstrap: gate, store, wiring
      store.ts                           # estado em memória + pub/sub + persistência
      ui/age-gate.ts, ui/product-card.ts, ui/cart-dialog.ts, ui/checkout.ts,
      ui/live-region.ts, ui/model-nav.ts, ui/dom.ts (helpers: qs, el, setText; proíbe innerHTML)
    styles/
      tokens.css                         # tokens do 03-design seção 2 (cores, sabores, fontes, espaços, raios, movimento)
      fonts.css                          # imports @fontsource (apenas pesos/subsets usados)
      global.css                         # reset, base, utilitários (.visually-hidden, focus-visible, reduced-motion)
    layouts/
      BaseLayout.astro                   # <html lang="pt-BR" class="no-js">, head (meta, robots, CSP meta, ícones, age-init.js)
    components/
      Logo.astro, Watermark.astro, Button.astro, Eyebrow.astro, PriceTag.astro, FlavorDots.astro,
      FlavorGroup.astro, QuantityStepper.astro, ProductCard.astro, ModelNav.astro, Header.astro,
      CartFab.astro, CartDialog.astro (contém passos Carrinho e Checkout + <template> de CartLine),
      OrderSummary.astro, InlineAlert.astro, LiveRegion.astro, AgeGate.astro, EmptyState.astro,
      Footer.astro, LegalStrip.astro, NoScriptNotice.astro
    pages/
      index.astro                        # página única (hero + catálogo); sem outras rotas
      404.astro                          # página simples com link para a home (base-aware) + aviso legal
  tests/
    unit/  money.test.ts, catalog.test.ts, cart.test.ts, order.test.ts, whatsapp.test.ts,
           storage.test.ts, age-gate.test.ts, deploy-config.test.ts
    e2e/   fixtures.ts, age-gate.spec.ts, catalog.spec.ts, cart.spec.ts, checkout.spec.ts,
           whatsapp.spec.ts, a11y.spec.ts, deploy.spec.ts
```

Nomes de componentes seguem o 03-design (C1-C26). Componentes `.astro` só renderizam HTML no build; comportamento fica em `src/scripts/ui/*`, ligado por `data-*` (ex.: `data-product="v155"`, `data-action="add"`), nunca por classes de estilo.

## 4. Contrato de dados - `src/data/catalog.ts`

Preços e taxas em **centavos inteiros** (sem float). IDs estáveis (slug) são o que vai para o localStorage; nomes/preços são sempre lidos do catálogo atual.

```ts
export type FlavorToken = 'pineapple' | 'grape' | 'mint' | 'menthol' | 'watermelon' | 'peach' | 'melon'
  | 'mango' | 'passion' | 'strawberry' | 'kiwi' | 'cherry' | 'apple' | 'lemonade' | 'tropical';

export interface Flavor { readonly id: string; readonly name: string; readonly dots: readonly FlavorToken[] }
export interface Model {
  readonly id: 'v55' | 'v155' | 'v400-mix-slim' | 'elfbar-pro-40k';
  readonly name: string;          // nome completo usado no carrinho, aria-label e mensagem
  readonly title: string;         // parte Syne ("V400")
  readonly subtitle?: string;     // parte serifada ("Mix Slim", "Pro 40K")
  readonly priceCents: number;
  readonly flavors: readonly Flavor[];
}
export interface Region { readonly id: string; readonly label: string; readonly feeCents: number }
export interface PaymentMethod { readonly id: 'pix' | 'debito' | 'credito'; readonly label: string }

export const STORE: { readonly name: 'NOMAD puffs'; readonly city: 'Palmas - TO';
  readonly whatsappE164: '5563981239498'; readonly whatsappDisplay: '(63) 98123-9498' };
export const MAX_QTY_PER_ITEM = 10;
export const OTHER_REGION_ID = 'outra' as const;
export const OTHER_REGION_LABEL = 'Outra região, combinar no WhatsApp';
export const MODELS: readonly Model[];
export const REGIONS: readonly Region[];          // ordem da tabela do CLAUDE.md
export const PAYMENT_METHODS: readonly PaymentMethod[];
export function findModel(id: string): Model | undefined;
export function findFlavor(model: Model, flavorId: string): Flavor | undefined;
export function findRegion(id: string): Region | undefined;
export function findPayment(id: string): PaymentMethod | undefined;
```

Valores obrigatórios (conferidos com CLAUDE.md; o teste `catalog.test.ts` trava cada um):

| Model id | name | price | Sabores (id: name [dots]) |
|---|---|---|---|
| `v55` | V55 | 8500 | `pineapple-ice`: Pineapple Ice [pineapple]; `uva-ice`: Uva Ice [grape]; `icy-mint`: Icy Mint [mint] |
| `v155` | V155 | 11000 | `pineapple-ice` [pineapple]; `menthol` [menthol]; `grape-ice`: Grape Ice [grape]; `watermelon-ice` [watermelon]; `icy-mint` [mint] |
| `v400-mix-slim` | V400 Mix Slim | 14000 | `icy-mint-peach-grape`: Icy Mint + Peach Grape [mint, peach]; `menthol-mighty-melon`: Menthol + Mighty Melon [menthol, melon]; `mango-passion-fruit-guava`: Mango + Passion Fruit Guava [mango, passion]; `strawberry-grape-ice-kiwi-watermelon`: Strawberry Grape Ice + Kiwi Watermelon [strawberry, kiwi]; `cherry-grape`: Cherry + Grape [cherry, grape] |
| `elfbar-pro-40k` | Elfbar Pro 40K | 14000 | `sour-apple-ice` [apple]; `strawberry-blend` [strawberry]; `pink-lemonade` [lemonade]; `watermelon-peach-frost`: Watermelon + Peach Frost [watermelon, peach]; `tropical-baja` [tropical] |

Regiões (`id`, label exato do CLAUDE.md, feeCents): `q700s-200`: "Quadras 700 Sul a 200 Norte/Sul" 800; `q300n-600n`: "Quadras 300 Norte a 600 Norte" 1000; `q800-1200`: "Quadras 800 a 1200" 1000; `q1300s-1500s`: "Quadras 1300 a 1500 Sul" 1500; `santo-amaro`: "Santo Amaro" 1500; `lago-norte`: "Lago Norte" 2000; `bertaville-aurenys`: "Bertaville e Aurenys" 3000; `taquaralto-lago-sul`: "Taquaralto e Lago Sul" 3500; `taquari`: "Taquari" 3500. "Outra região" **não** está em `REGIONS` (é `OTHER_REGION_ID`, sem taxa).
Pagamentos: `pix` "PIX"; `debito` "Cartão de débito"; `credito` "Cartão de crédito". Sufixo fixo "(na entrega)" na mensagem e "Pagamento na entrega." na UI.

`src/data/product-images.ts`: `export const PRODUCT_IMAGES: Record<Model['id'], ImageMetadata>` com imports de `../../assets/produtos/*.png`. **Nunca** importar este arquivo em `src/scripts/**` (puxaria assets para o bundle de cliente); regra de lint `no-restricted-imports` garante.

## 5. Contratos da lógica pura (`src/lib`, sem DOM, sem `window`)

```ts
// money.ts - formatador determinístico (NÃO usar Intl: gera NBSP e varia por runtime)
export function formatBRL(cents: number): string;            // 8500 -> "R$ 85,00"; 2290000 -> "R$ 22.900,00"; espaço normal U+0020
export function formatBRLShort(cents: number): string;       // 8500 -> "85" (PriceTag grande do card)

// cart.ts - imutável; toda função retorna novo array
export interface CartLine { readonly modelId: string; readonly flavorId: string; readonly qty: number }
export type Cart = readonly CartLine[];
export interface ResolvedLine extends CartLine {
  readonly key: string; readonly modelName: string; readonly flavorName: string;
  readonly unitCents: number; readonly lineCents: number;
}
export const lineKey: (modelId: string, flavorId: string) => string;            // `${modelId}::${flavorId}`
export function clampQty(raw: unknown): { qty: number; clamped: 'max' | 'invalid' | null };
//   inteiro 1..10 -> igual; >10 -> 10 ('max'); 0, negativo, vazio, NaN, decimal, texto -> 1 ('invalid'); "3" -> 3
export function addItem(cart: Cart, modelId: string, flavorId: string, qty: number): { cart: Cart; hitMax: boolean };
//   soma na linha existente (RN2), mantém ordem de inserção, teto 10 (RN4); lança Error se modelo/sabor inexistente
export function setQty(cart: Cart, key: string, qty: number): { cart: Cart; hitMax: boolean };
export function removeLine(cart: Cart, key: string): Cart;
export function resolveCart(cart: Cart): ResolvedLine[];      // descarta linhas inválidas; preços SEMPRE do catálogo atual
export function countUnits(cart: Cart): number;
export function subtotalCents(lines: readonly ResolvedLine[]): number;

// order.ts
export type RegionChoice = { kind: 'region'; region: Region } | { kind: 'other' } | null;
export function parseRegionChoice(id: string | null | undefined): RegionChoice;
export interface Totals { subtotalCents: number; feeCents: number | null; totalCents: number; feeToArrange: boolean }
export function computeTotals(subtotal: number, region: RegionChoice): Totals;  // null -> fee null, total = subtotal (parcial)
export type CheckoutError = 'empty' | 'region' | 'payment';
export function validateCheckout(input: { lines: readonly ResolvedLine[]; regionId: string | null; paymentId: string | null }): CheckoutError[];
//   ordem dos erros = ordem dos campos na tela (region antes de payment) -> foco no primeiro

// whatsapp.ts
export interface OrderInput { lines: readonly ResolvedLine[]; region: Exclude<RegionChoice, null>; payment: PaymentMethod }
export function buildOrderMessage(input: OrderInput): string;   // formato exato RN12, '\n' como quebra
export function buildWhatsAppUrl(message: string, phoneE164?: string): string;
//   `https://wa.me/${phone}?text=${encodeURIComponent(message)}` (NUNCA URLSearchParams: codifica espaço como '+',
//   e '+' literal viraria espaço no WhatsApp). Telefone validado por /^\d{12,13}$/ ou lança.
export function sanitizeText(s: string): string;
//   remove caracteres de controle (U+0000-U+001F, U+007F-U+009F), bidi overrides (U+202A-U+202E, U+2066-U+2069)
//   e zero-width (U+200B-U+200D, U+FEFF); colapsa espaços; trim. Aplicada a TODO valor interpolado na mensagem.

// storage.ts - tolerante a falhas
export interface KeyValueStore { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }
export const CART_KEY = 'nomad:cart:v1';
export const AGE_KEY = 'nomad:age-ok:v1';
export function getSafeStorage(): KeyValueStore;
//   tenta window.localStorage com teste de escrita em try/catch; se falhar, devolve store em memória (Map)
export function loadCart(store: KeyValueStore): Cart;
//   JSON inválido, versão diferente, não-array, linhas com tipos errados, modelo/sabor inexistente -> descarta (sem throw);
//   qty normalizada por clampQty; duplicatas fundidas; nunca lê preço salvo. Formato salvo: {"v":1,"lines":[{"m":"v155","f":"menthol","q":2}]}
export function saveCart(store: KeyValueStore, cart: Cart): void;   // engole QuotaExceeded/SecurityError

// age-gate.ts
export function isAgeConfirmed(store: KeyValueStore): boolean;     // true só se valor === '1'
export function confirmAge(store: KeyValueStore): void;            // grava '1' (falha silenciosa)
//   Recusa NÃO grava nada (RN9/D2).
```

Mensagem (RN12) - linhas geradas, nessa ordem:
```
Olá! Quero fazer um pedido na NOMAD puffs:
(linha vazia)
Itens:
- {qty}x {modelName} - {flavorName} - {formatBRL(lineCents)}
(linha vazia)
Subtotal: {formatBRL(subtotal)}
Entrega: {region.label} - {formatBRL(fee)}        | Entrega: Outra região (a combinar)
Pagamento: {payment.label} (na entrega)
Total: {formatBRL(total)}                         | Total: {formatBRL(subtotal)} + entrega a combinar
```
Sem emoji, sem campo livre do usuário no MVP (D7 fora). Se D7 for aprovado depois, o texto passa por `sanitizeText` + limite de 300 caracteres e entra só na mensagem.

## 6. Decisões de implementação do cliente

1. **Página única** (`index.astro`) com âncoras (`#catalogo`, `#v55`...). Sem roteamento: funciona em qualquer host sem rewrite e com qualquer `base`.
2. **Todas as URLs internas** via `import.meta.env.BASE_URL` (ou `astro:assets`, que já respeita `base`). Proibido `href="/..."` hardcoded em componentes (exceto URLs externas). Teste E2E em `/loja/` pega regressão.
3. **Renderização dinâmica** (linhas do carrinho, resumo, erros) com `<template>` + `cloneNode` + `textContent`. **Proibido** `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write` e `set:html` (lint, seção 8).
4. **Store** (`src/scripts/store.ts`): estado `{ cart, regionId, paymentId }` em memória; `subscribe(fn)`; cada mudança de `cart` chama `saveCart`. Região/pagamento **não** são persistidos (minimização de dados). Carrinho é carregado antes de pintar o badge (badge começa `hidden`).
5. **Carrinho/checkout** em `<dialog>` nativo com `showModal()` (foco preso e fundo inerte nativos; `cancel` via ESC fecha; clique no backdrop fecha; foco devolvido ao botão que abriu; `overflow:hidden` no `body` enquanto aberto). Bottom sheet/painel lateral só via CSS.
6. **Gate 18+ sem flash e sem inline script**:
   - HTML do build sai com `<html class="no-js">`, gate visível e `<div id="app" inert aria-hidden="true">`.
   - `<head>` carrega `public/age-init.js` como script **clássico bloqueante** (`<script src={base + 'age-init.js'}>`, ~300 bytes, try/catch): remove `no-js`, adiciona `js`; se `localStorage['nomad:age-ok:v1'] === '1'` define `document.documentElement.dataset.age = 'ok'`.
   - CSS: `html.no-js` mostra só `NoScriptNotice` (+ link wa.me + aviso legal); `html:not([data-age="ok"]) #app { visibility: hidden }`; `html[data-age="ok"] .age-gate { display: none }`.
   - `main.ts` (módulo): se confirmado, remove `inert`/`aria-hidden` do `#app`; senão foca o título do gate. "Tenho 18+" -> `confirmAge` + `data-age="ok"` + libera app + foco no `h1`. "Sou menor" -> troca para `AgeDenied` (role=alert), **sem** nenhum link wa.me no DOM visível/acessível (o `#app` continua `inert` e `visibility:hidden`); "Voltar" reabre a pergunta.
   - A chave `nomad:age-ok:v1` existe em dois lugares (`age-init.js` e `storage.ts`): `deploy-config.test.ts` lê `public/age-init.js` e garante que contém `AGE_KEY`.
   - Limitação aceita (R5): gate é declaratório e o HTML do catálogo está no documento; não é controle de acesso.
7. **Abertura do WhatsApp**: no handler de clique de "Enviar pedido" (gesto do usuário), validar e chamar **imediatamente** `window.open(url, '_blank', 'noopener,noreferrer')`. O "loading 1,2 s" do design vira só feedback visual **depois** do `window.open` (atrasar a abertura com `setTimeout` faria o navegador bloquear o pop-up). Em seguida sempre mostrar o painel de fallback com `<a href={url} target="_blank" rel="noopener noreferrer">Abrir WhatsApp</a>` e "Copiar mensagem do pedido" (`navigator.clipboard.writeText`; se falhar/indisponível -> `textarea readonly`). Carrinho não é limpo.
8. **Mensagem igual à tela**: tela e mensagem usam a mesma chamada `resolveCart` -> `computeTotals` -> `formatBRL`. Proibido recalcular total em outro lugar.
9. **Quantidade**: stepper usa `clampQty` em `blur`/`change`; botões `-`/`+` com `disabled` nos limites (`-` em 1; `+` em 10 mostra a mensagem de máximo exata do PO).
10. **Imagens de produto**: `<Picture>` do `astro:assets`, `formats={['avif','webp']}`, `widths={[360, 540, 720, 1080]}`, `sizes="(min-width: 1200px) 270px, (min-width: 640px) 45vw, min(100vw - 48px, 360px)"`, `quality` 72, `loading="lazy"` e `decoding="async"` (o 1º card `loading="eager"`), `width/height` sempre (CLS 0), fallback `onerror` tratado em `product-card.ts` (classe `is-broken` mostra "Imagem indisponível"). Alt: "Card do catálogo NOMAD puffs: {name}" (sem preço). Logos: `<Image>` WebP nos tamanhos de uso (2x).
11. **Fontes**: `src/styles/fonts.css` importa somente `@fontsource/syne/latin-800.css`, `@fontsource/lexend/latin-400.css`, `latin-500.css`, `latin-600.css`, `@fontsource/lora/latin-500-italic.css` (subset `latin` cobre pt-BR; `font-display: swap` já vem). Arquivos vão para `_astro/` com hash. Preload apenas de Syne 800 e Lexend 400 (`<link rel="preload" as="font" type="font/woff2" crossorigin>` via import `?url`).
12. **CSS**: tokens do 03-design em `tokens.css`; estilos de componente em `<style>` escopado do Astro. Sem `define:vars`, sem atributo `style=` (CSP `style-src 'self'`); exceção documentada se o Astro gerar estilo inline em algum caso (ver risco T4).
13. **`astro.config.mjs`**: `output: 'static'`, `site` = `SITE_URL` (opcional), `base` = `BASE_PATH` (default `/`), `trailingSlash: 'ignore'`, `build: { format: 'directory', inlineStylesheets: 'never', assets: '_astro' }`, `vite: { build: { assetsInlineLimit: 0 } }` (garante nenhum script/estilo inline -> CSP sem `unsafe-inline`), `devToolbar: { enabled: false }`, `compressHTML: true`. Valores de deploy expostos às páginas via `astro:env` (`envField`): `NOINDEX` (boolean, default false), `DEPLOY_TARGET` (`'vercel' | 'static' | 'dev'`), `SITE_URL` (string opcional). Se `astro:env` der atrito, alternativa aceita: `vite.define` de um objeto `__DEPLOY__` tipado em `env.d.ts`.
14. **Head (`BaseLayout.astro`)**: `<meta charset>`, viewport, `<title>NOMAD puffs - Pods em Palmas - TO</title>`, description neutra (sem alegação de saúde), `theme-color #131416`, ícones, `<meta name="robots" content="noindex, nofollow">` quando `NOINDEX`, `<link rel="canonical">` e `og:*` absolutos **só se** `SITE_URL` definido, `<meta http-equiv="Content-Security-Policy">` **somente em produção** (`import.meta.env.PROD`) com a mesma política do header menos `frame-ancestors` (defesa para hosts sem `mod_headers`). `<meta name="referrer" content="no-referrer">`.

## 7. Builds e deploy (mesmo fonte)

### 7.1 `scripts/build.mjs` (wrapper multiplataforma)
npm no Windows executa scripts em `cmd.exe`, então `VAR=x astro build` não funciona; o wrapper resolve sem `cross-env`.
```
node scripts/build.mjs --target=vercel|static [--base=/loja/] [--out=dist-xyz]
```
- Lê `SITE_URL`, `BASE_PATH`, `NOINDEX` de `process.env` (e de `.env` local se existir, via `process.loadEnvFile` do Node 24, ignorando ausência).
- `vercel`: `outDir=dist-vercel`, `base=/`, **`NOINDEX=true` forçado**, `SITE_URL` opcional (se ausente, pode usar `https://${VERCEL_PROJECT_PRODUCTION_URL}` só para og:image; nunca obrigatório).
- `static`: `outDir=dist-static` (ou `--out`), `base` = `--base` || `BASE_PATH` || `/` (normalizado para começar e terminar com `/`), `NOINDEX` = `NOINDEX === 'true'` (default **false**), sem nenhuma leitura de `VERCEL_*`.
- Seta `process.env.DEPLOY_TARGET/NOINDEX/SITE_URL` e chama `import { build } from 'astro'; await build({ outDir, base, site, mode: 'production' })`.
- Pós-build:
  - escreve `robots.txt` no `outDir`: NOINDEX -> `User-agent: *\nDisallow: /`; senão `User-agent: *\nAllow: /` (+ `Sitemap:` só se houver sitemap futuro). Observação: com `base` diferente de `/`, robots.txt só vale se copiado para a raiz do domínio (documentar no README).
  - `static`: gera `outDir/.htaccess` a partir de `deploy/static/htaccess.template` substituindo `{{BASE}}` e incluindo o bloco `X-Robots-Tag "noindex, nofollow"` apenas se NOINDEX.
  - `vercel`: não copia `.htaccess`.
  - Falha com exit code != 0 em qualquer erro (caminho com espaço: usar `fileURLToPath`/`path.join`, nunca concatenação de string com shell).

### 7.2 `vercel.json`
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": null,
  "installCommand": "npm ci",
  "buildCommand": "npm run build:vercel",
  "outputDirectory": "dist-vercel",
  "cleanUrls": true,
  "headers": [
    { "source": "/(.*)", "headers": [
      { "key": "Content-Security-Policy", "value": "<CSP abaixo>" },
      { "key": "X-Content-Type-Options", "value": "nosniff" },
      { "key": "Referrer-Policy", "value": "no-referrer" },
      { "key": "X-Frame-Options", "value": "DENY" },
      { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
      { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
      { "key": "X-Robots-Tag", "value": "noindex, nofollow" }
    ]},
    { "source": "/_astro/(.*)", "headers": [ { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" } ] },
    { "source": "/(.*)\\.html", "headers": [ { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" } ] },
    { "source": "/(age-init\\.js|favicon-32\\.png|apple-touch-icon\\.png|robots\\.txt)", "headers": [ { "key": "Cache-Control", "value": "public, max-age=3600" } ] }
  ]
}
```
`framework: null` evita que a Vercel injete adapter/otimizações próprias: ela apenas serve `dist-vercel`. HSTS a Vercel já aplica. Nenhuma env var da Vercel é necessária.

**CSP (fonte única, idêntica nos dois alvos):**
```
default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests
```
(Abrir `wa.me` é navegação/`window.open`, não é afetada por CSP. `data:` em img só para SVG/placeholder do Astro.)

### 7.3 Build estático genérico (`deploy/static/htaccess.template`)
Conteúdo mínimo (o Dev escreve; QA confere equivalência):
- `Options -Indexes`, `DirectoryIndex index.html`, `ErrorDocument 404 {{BASE}}404.html`.
- `<IfModule mod_headers.c>`: os mesmos headers de segurança do `vercel.json` (CSP string idêntica), `Strict-Transport-Security "max-age=31536000"` dentro de `<If "%{HTTPS} == 'on'">`; bloco `X-Robots-Tag` condicional (inserido pelo build).
- Cache: `_astro/` -> `public, max-age=31536000, immutable`; `*.html` -> `max-age=0, must-revalidate`; demais 1h.
- `<IfModule mod_mime.c>`: `AddType image/avif .avif`, `image/webp .webp`, `font/woff2 .woff2`, `text/javascript .js`.
- `<IfModule mod_deflate.c>` para html/css/js/svg/txt.
- Bloquear arquivos ocultos exceto `.well-known`.
- **Sem RewriteRule**: não há rotas a reescrever.
`deploy/static/nginx.conf.example`: `location {{BASE}} { try_files $uri $uri/ =404; }`, `error_page 404`, mesmos `add_header ... always`, `location {{BASE}}_astro/ { expires 1y; add_header Cache-Control "public, immutable"; }`, `gzip on`.
README: passo a passo cPanel (upload do conteúdo de `dist-static/` para `public_html/` ou `public_html/loja/` com `BASE_PATH` correspondente; mostrar arquivos ocultos para ver `.htaccess`).

### 7.4 Variáveis (nenhuma é segredo)
| Var | Alvo | Default | Efeito |
|---|---|---|---|
| `BASE_PATH` | static | `/` | prefixo de todas as URLs (`/loja/`) |
| `SITE_URL` | ambos (opcional) | vazio | canonical/og absolutos |
| `NOINDEX` | static | `false` | meta robots + X-Robots-Tag + robots.txt |
| (forçado) | vercel | `NOINDEX=true`, `BASE=/` | preview nunca indexável |

## 8. Lint, typecheck, convenções

- `eslint.config.js`: `@eslint/js` recommended + `typescript-eslint` `strictTypeChecked` (para `src/**/*.ts`) + `eslint-plugin-astro` `recommended`; globals browser em `src/scripts`, node em `scripts/` e configs. Regras do projeto:
  - `no-restricted-syntax`: atribuição a `innerHTML`/`outerHTML`, chamadas `insertAdjacentHTML`, `document.write`, `eval`, `new Function`.
  - `astro/no-set-html-directive: error`.
  - `no-restricted-imports`: `src/scripts/**` não importa `src/data/product-images` nem `astro:*`; `src/lib/**` não usa `window`/`document` (`no-restricted-globals`).
  - Ignorar `dist*/`, `.astro/`, `node_modules/`, `test-results/`, `playwright-report/`.
- `tsconfig.json`: `extends: "astro/tsconfigs/strictest"`, `noUncheckedIndexedAccess` já incluso.
- Commits pequenos por tarefa T4-T12; mensagens em PT-BR; sem `git push`.

## 9. Testes

### 9.1 Ferramentas
- **Unitários: Vitest** (`environment: 'node'`; a lógica em `src/lib` não toca DOM). Store em memória para storage.
- **E2E: Playwright, só Chromium** (`npx playwright install chromium`, ~150 MB uma vez, cache em `%LOCALAPPDATA%\ms-playwright`; sem WebKit/Firefox no MVP). Viável no Windows e em CI. Safari/iOS fica no teste manual (M3 do PO).
- **A11y automática:** `@axe-core/playwright` com tags `wcag2a, wcag2aa, wcag21aa`.
- `playwright.config.ts`:
  - `webServer`: dois processos `node scripts/serve-static.mjs --dir dist-vercel --port 4321 --base /` e `--dir dist-e2e-static --port 4322 --base /loja/`. O servidor é Node puro, **sem rewrite** (404 real para caminho inexistente), serve `404.html` e **aplica os headers do `vercel.json`** (inclusive CSP) para que violações de CSP apareçam no E2E.
  - Projetos: `vercel-mobile` (device "Pixel 7", baseURL `http://127.0.0.1:4321/`), `static-mobile` (Pixel 7, `http://127.0.0.1:4322/loja/`), `vercel-desktop` (Desktop Chrome; só specs de layout/a11y/teclado).
  - `fixtures.ts`: fixture `confirmedAge` (seta `nomad:age-ok:v1` via `addInitScript`), coletor de `console` errors e `securitypolicyviolation` que falha o teste, e interceptação `context.route('https://wa.me/**', r => r.fulfill({ status: 200, body: 'ok' }))` + captura da URL do popup (`page.waitForEvent('popup')`).
  - Locale `pt-BR`, `retries: 1` só em CI, `trace: 'on-first-retry'`.

### 9.2 Scripts npm (registrar no CLAUDE.md - o coordenador atualiza)
```json
{
  "dev": "astro dev",
  "build": "npm run build:vercel && npm run build:static",
  "build:vercel": "node scripts/build.mjs --target=vercel",
  "build:static": "node scripts/build.mjs --target=static",
  "preview:vercel": "node scripts/serve-static.mjs --dir dist-vercel --port 4321 --base /",
  "preview:static": "node scripts/serve-static.mjs --dir dist-static --port 4322",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e:install": "playwright install chromium",
  "test:e2e": "node scripts/build.mjs --target=vercel && node scripts/build.mjs --target=static --base=/loja/ --out=dist-e2e-static && playwright test",
  "lint": "eslint .",
  "typecheck": "astro check",
  "check": "npm run lint && npm run typecheck && npm test && npm run build"
}
```
`preview:static` lê `BASE_PATH` do ambiente (default `/`). Adicionar `test-results/` e `playwright-report/` ao `.gitignore` (`dist-e2e-static/` já é coberto por `dist-*/`).

### 9.3 Plano de testes para o QA (mapeado ao 02-po)

**Unitários (Vitest) - obrigatórios, cobertura alvo 100% de linhas em `src/lib`:**
| Arquivo | Casos | PO |
|---|---|---|
| `catalog.test.ts` | 4 modelos, preços 8500/11000/14000/14000; lista exata e ordem de sabores (V400 conforme CLAUDE.md, incl. "Strawberry Grape Ice + Kiwi Watermelon" e "Cherry + Grape"); 9 regiões com labels/taxas exatos; 3 pagamentos; IDs únicos e slug `[a-z0-9-]`; todo `dots` é `FlavorToken` válido; `whatsappE164 === '5563981239498'`; `MAX_QTY_PER_ITEM === 10`; todo modelo tem entrada em `PRODUCT_IMAGES` (teste importa o mapa de ids) | RN1, RN6, RN8, RN11, H8 |
| `money.test.ts` | 0, 800, 8500, 11000, 38000, 140000, 2290000 -> "R$ 0,00", "R$ 8,00", "R$ 85,00", "R$ 110,00", "R$ 380,00", "R$ 1.400,00", "R$ 22.900,00"; sem NBSP | RN5 |
| `cart.test.ts` | add nova linha; mesmo modelo+sabor soma (2+1=3); sabores diferentes = 2 linhas; 8+5 -> 10 com `hitMax`; setQty 11 -> 10; `clampQty` para 0, -1, '', ' ', 2.5, '3', 'abc', NaN, Infinity, null, 10, 11; removeLine; ordem de inserção; `addItem` com sabor/modelo inexistente lança; `resolveCart` descarta inválidos e usa preço atual | RN2, RN3 (lógica), RN4, H4 |
| `order.test.ts` | tabela das 9 regiões com subtotal 11000 -> taxa e total do Esquema do Cenário; "outra" -> fee null, `feeToArrange`; região null -> total parcial = subtotal; `validateCheckout`: vazio -> ['empty']; sem região e pagamento -> ['region','payment'] nessa ordem; região inválida -> 'region'; pagamento inválido -> 'payment' | RN5-RN8, H5, H6, H12 |
| `whatsapp.test.ts` | caminho feliz gera **exatamente** o bloco da RN12 (2x V155 Menthol + 1x Elfbar Pink Lemonade, Lago Norte, PIX, Total R$ 380,00); variante "Outra região" (2 linhas exatas); "Cartão de crédito (na entrega)"; URL começa com `https://wa.me/5563981239498?text=`; `+` vira `%2B`, espaço `%20`, `\n` `%0A`, "Olá" `Ol%C3%A1`; `decodeURIComponent(text)` === mensagem; pedido grande (18 sabores x 10) contém 18 linhas de item, total "R$ 22.050,00" (subtotal 2205000) e URL < 4096 caracteres; `sanitizeText` remove NUL (U+0000), RLO (U+202E), zero-width space (U+200B) e `\r\n` interno; sem emoji | RN12, H7, R4 |
| `storage.test.ts` | JSON corrompido, `null`, `{}`, versão 2, `lines` não-array, item com q "abc"/-3/99, modelo removido, sabor removido, duplicatas -> resultado válido sem throw; preços salvos ignorados; `saveCart`/`getItem` que lançam (quota/SecurityError) não propagam; `getSafeStorage` cai para memória quando `localStorage` lança | H11, persistência corrompida, sem storage |
| `age-gate.test.ts` | vazio -> false; '1' -> true; 'true'/'0'/'x' -> false; confirm grava '1'; store que lança -> confirm não lança, `isAgeConfirmed` false | RN9 |
| `deploy-config.test.ts` | CSP do `vercel.json` === CSP do `htaccess.template`; mesmos headers de segurança presentes nos dois; `vercel.json` tem X-Robots-Tag noindex e `outputDirectory: dist-vercel`; `public/age-init.js` contém `AGE_KEY`; nenhum arquivo em `src/` contém padrão de segredo (`/api[_-]?key|secret|token/i`) | H10, H13, Segurança |

**E2E (Playwright, viewport mobile) - specs e cenários:**
| Spec | Cenários Gherkin cobertos |
|---|---|
| `age-gate.spec.ts` | Primeiro acesso exibe o gate (texto legal, foco no gate, `#app` com `inert`; Tab não alcança botão do catálogo); Confirmar maioridade (grava `nomad:age-ok:v1`); Gate lembrado (reload sem gate e sem flash: screenshot/`isVisible` imediatamente após `load`); Gate recusado (mensagem "Acesso restrito", `page.getByRole('link', { name: /whatsapp/i })` não acessível, catálogo invisível); Recusa + reload volta o gate; Aviso legal permanente (LegalStrip visível pós-gate e com sheet aberto); Sem localStorage (`addInitScript` que faz `localStorage.setItem` lançar) -> usa o site sem erro de console; JS desabilitado (`javaScriptEnabled: false`) mostra "Ative o JavaScript para fazer pedidos" + link wa.me |
| `catalog.spec.ts` | 4 modelos com preços R$ 85/110/140/140 e sabores exatos (lidos de `MODELS` importado no teste - mesma fonte); `alt` sem preço; imagens com `width/height`; imagem falha (`route` de `**/_astro/*.{avif,webp,png}` -> 404) mantém nome/preço/sabores e mostra "Imagem indisponível"; "Dados de arquivo único" coberto por unitário + este teste usar `MODELS` |
| `cart.spec.ts` | Adicionar com sabor (qtd 2, linha e badge "2"); Sabor obrigatório ("Escolha um sabor", `role=alert`, nada adicionado); Mesmo item soma; Sabores diferentes = 2 linhas; Qtd mínima (`-` disabled); Qtd máxima e soma 8+5 -> 10 com mensagem exata; Qtd inválida digitada (0, -2, vazio, 2.5, "abc", 15); Remover recalcula; Carrinho vazio (texto, sem botão de envio ativo); Persistência (reload e novo `page` no mesmo contexto); Persistência corrompida (`addInitScript` grava JSON inválido e item inexistente -> site carrega, itens válidos mantidos, preço do catálogo); ESC fecha e foco volta ao gatilho |
| `checkout.spec.ts` | Esquema do Cenário das 9 regiões (subtotal R$ 110,00 -> taxa/total); Região obrigatória (sem popup, erro, foco no select); Pagamento obrigatório; Múltiplas pendências (2 erros, foco no 1º, resumo "Faltam 2 informações"); Opções de pagamento exatas + "Pagamento na entrega."; Outra região ("a combinar", envio permitido); Alterar qtd recalcula; Esvaziar após escolher região -> estado vazio |
| `whatsapp.spec.ts` | Caminho feliz: popup para `wa.me/5563981239498`, `text` decodificado === mensagem esperada da RN12 e total R$ 380,00; Caracteres especiais ("Icy Mint + Peach Grape" chega com `+`); Pedido grande (todos os sabores x10) URL completa; Mensagem coerente com a tela (comparar subtotal/entrega/total do DOM com o texto); Pop-up bloqueado/sem WhatsApp: painel com link "Abrir WhatsApp" (href correto, `rel` com noopener) e "Copiar mensagem do pedido" (com `clipboard-write` concedido e negado -> textarea); Carrinho após envio continua + "Limpar carrinho" |
| `a11y.spec.ts` | axe sem violações sérias/críticas em: gate, gate recusado, home, carrinho aberto, checkout com erros; navegação só por teclado do fluxo completo; `lang="pt-BR"`, um único `h1`; alvos >= 44 px nos controles principais (bounding box); reflow em 320 px sem scroll horizontal; `prefers-reduced-motion` emulado |
| `deploy.spec.ts` | Projeto vercel: meta robots noindex, header `X-Robots-Tag`, `/robots.txt` com `Disallow: /`; header CSP presente e **zero** `securitypolicyviolation` no fluxo completo. Projeto static (`/loja/`): todos os requests de assets começam com `/loja/` (nenhum 404 na aba de rede), fluxo completo funciona, `reload` na página não dá 404, sem meta noindex (build com NOINDEX=false); nenhum request para domínio externo além de `wa.me` (fontes/imagens locais) |

**Verificações manuais do QA (registrar no 06-qa.md):**
- Lighthouse mobile (DevTools, throttling 4G) em `npm run preview:vercel`: Performance >= 90, LCP <= 2,5 s, CLS <= 0,1, Accessibility >= 95. Orçamento: JS de cliente <= 30 KB gzip total; CSS <= 25 KB gzip; fontes <= 5 arquivos woff2; maior imagem servida no mobile <= 60 KB (AVIF/WebP 540w).
- Mensagem real em Android e iOS (M3): enviar para o número de teste via preview Vercel, conferir `+`, acentos e quebras.
- `npm run build:static` com `BASE_PATH=/loja/` e `NOINDEX=true`, conferir `.htaccess` gerado (bloco X-Robots-Tag presente) e com `NOINDEX=false` (ausente) - cenário "noindex configurável".
- Leitor de tela (TalkBack ou NVDA) no gate, erro de sabor, carrinho e checkout.
- Inspecionar `dist-static/` e `dist-vercel/` com busca textual: nenhum `vercel` em código de runtime do static, nenhum script/estilo inline (`<script>` sem `src` e `style=` ausentes).

## 10. Segurança e privacidade (resumo)
- Sem segredos, sem `.env` versionado (só `.env.example` com valores vazios/default); número do WhatsApp é dado público no `catalog.ts`.
- Sem entrada livre do usuário no MVP; toda string da mensagem vem do catálogo e ainda passa por `sanitizeText`; URL com `encodeURIComponent`; telefone validado.
- DOM só via `textContent`/atributos; lint bloqueia sinks de HTML.
- CSP restritiva sem `unsafe-inline`/`unsafe-eval` (header nos dois alvos + meta em produção); `frame-ancestors 'none'`/`X-Frame-Options DENY`; `nosniff`; `Referrer-Policy: no-referrer`; `Permissions-Policy` fechando APIs sensíveis; links externos com `rel="noopener noreferrer"`.
- Zero request a terceiros (fontes/imagens self-hosted, sem analytics/pixels/CDN) - LGPD.
- localStorage guarda só `nomad:cart:v1` (ids + qty) e `nomad:age-ok:v1`; região/pagamento não persistem.
- `npm audit --omit=dev` sem vulnerabilidades altas/críticas antes do deploy (DevOps).

## 11. Riscos técnicos
| # | Risco | Mitigação |
|---|---|---|
| T1 | `sharp` falhar ao instalar no Windows ou na Vercel | versão fixada com prebuild win32/linux-x64; se falhar, `image.service` passthrough + PNGs pré-convertidos (último recurso) |
| T2 | TypeScript 7 instalado por engano quebra lint/check | `typescript: ~6.0.3` fixo; não aceitar upgrade sem revisar peers |
| T3 | Astro 7 mudar API de `astro:env`/`build()` em minor | lockfile versionado; alternativa `vite.define` descrita em 6.13 |
| T4 | Astro emitir script/estilo inline (ex.: scripts pequenos, estilos de imagem) quebrando CSP `'self'` | `assetsInlineLimit: 0`, `inlineStylesheets: 'never'`, teste E2E de `securitypolicyviolation`; se inevitável, usar hash (`'sha256-...'`) - nunca `unsafe-inline` em script |
| T5 | Pop-up bloqueado / WhatsApp Desktop vs Web | `window.open` síncrono no gesto + painel de fallback sempre visível |
| T6 | Gate com flash do catálogo para quem já confirmou ou flash do gate | script clássico bloqueante `age-init.js` antes do body; `visibility:hidden` padrão no app |
| T7 | Caminho com espaço / `cmd.exe` em scripts npm | toda lógica de build em Node (`scripts/*.mjs`), sem variáveis inline nos scripts |
| T8 | Hospedagem sem `mod_headers` (cPanel barato) | CSP também em `<meta>`; site funciona sem headers (são defesa extra) |
| T9 | Imagens com preço "queimado" divergirem do arquivo de dados | UI textual é a fonte; alt sem preço; registrar no README que trocar preço exige novo PNG |
| T10 | Divergência de dados entre docs (PO RN1 x CLAUDE.md no V400) | CLAUDE.md prevalece; `catalog.test.ts` trava os valores |

## 12. Ordem de implementação sugerida ao Dev
1. T5 scaffold: `package.json` (deps acima, `npm install`), configs, `scripts/build.mjs`, `scripts/serve-static.mjs`, `vercel.json`, `deploy/static/*`, página mínima; `npm run check` verde.
2. T4 dados + `src/lib/*` com unitários (TDD; tudo antes de UI).
3. T6 tokens/fontes/layout/Logo/Watermark; T7 gate (+ `age-init.js`, NoScriptNotice, LegalStrip, Footer).
4. T8 ProductCard; T9 store + CartDialog; T10 checkout; T11 envio + fallback.
5. T12 E2E + a11y; ajustes de performance (orçamento da 9.3).

## 13. Comandos (para o coordenador registrar no CLAUDE.md)
Sempre antes: `export PATH="$HOME/.local/node:$PATH"`
- instalar: `npm ci` (primeira vez sem lockfile: `npm install`); E2E: `npm run test:e2e:install` (Chromium, uma vez)
- dev: `npm run dev` (http://localhost:4321)
- build: `npm run build:vercel` (-> `dist-vercel/`, noindex forçado) | `npm run build:static` (-> `dist-static/`; env `BASE_PATH`, `SITE_URL`, `NOINDEX`) | `npm run build` (ambos)
- preview: `npm run preview:vercel` | `npm run preview:static`
- teste: `npm test` (Vitest) | `npm run test:e2e` (builds + Playwright Chromium)
- lint: `npm run lint` | typecheck: `npm run typecheck` | tudo: `npm run check`
- Stack: Astro 7 estático + TypeScript 6.0 + CSS com tokens; ADR em `docs/squad/site-mvp/04-tech-lead.md` (o CLAUDE.md hoje aponta para `03-tech-lead.md`, corrigir o caminho).

---

## Revisão

Data: 2026-10-01. Escopo: `git diff main...HEAD` na branch `feat/site-mvp` (commits ee15933, 8f3e15e, 1dcb002, cadd976; binários de imagem ignorados).

### Verificações executadas (de fato, nesta revisão)
| Comando | Resultado |
|---|---|
| `npm run lint` | exit 0, 0 problemas |
| `npm run typecheck` | `Result (64 files): 0 errors, 0 warnings, 0 hints` |
| `npm test` | `Test Files 9 passed (9) / Tests 178 passed (178)` |
| `npm run build` | ok; `dist-vercel` e `dist-static` (base=/, noindex=false), 2 páginas |
| `npm run test:e2e` | não reexecutado (QA: 158 passed, 11 skipped, inclui o `test.fail` do BUG-01) |

Medições do build: JS de cliente 17,3 KB (6,5 KB gzip, 1 arquivo); CSS 22,3 KB (5,1 KB gzip); 5 woff2 (2 com preload); maior AVIF ~44 KB (1080w); `index.html` 37,5 KB; nenhum `<script>` sem `src` e nenhum `style=` no HTML; 1º card `loading="eager"`, demais `lazy`, todos com `width/height`. Orçamento da 9.3 atendido.

### Veredito: **APROVADO**

Nenhum achado crítico. Lógica de dinheiro/taxa/total, mensagem RN12 e URL `wa.me` estão corretas e com fonte única (`resolveCart` -> `computeTotals` -> `formatBRL` usados pela tela e pela mensagem). Segurança aderente ao plano: CSP idêntica nos dois alvos (travada por teste), sem `unsafe-inline`, sem sinks de HTML (grep e lint limpos), localStorage tratado como não confiável (`loadCart` valida tipo, catálogo, inteiro, funde duplicatas e nunca lê preço; gate só aceita `'1'`). Arquitetura conforme ADR-001 (Astro estático, `src/lib` puro, DOM em `src/scripts/ui`, `product-images` fora do cliente). Os desvios registrados no `05-dev.md` (vite.define, componentes como classes CSS, CSS global em `app.css`, sem loading de 1,2 s) são aceitos.

**Condição para o merge em `main` (não bloqueia o preview na Vercel):** corrigir BUG-01 e o aviso A1 nesta branch. São mudanças pequenas, de baixo risco, já cobertas por teste; não exigem nova revisão completa, apenas `npm run check` + `npm run test:e2e` verdes (com o `test.fail` removido).

### Crítico
Nenhum.

### Aviso
- **A1 (BUG-01 do QA) - limite de 10 no carrinho sem mensagem visível.** `src/scripts/ui/cart-dialog.ts:181-190` (e `:215-223` para digitação de 11+). Contraria o Gherkin "Quantidade máxima por item" e o plano 6.9; o card do catálogo faz certo (`product-card.ts:38-43`). **Decisão: corrigir agora**, antes do merge. Correção: adicionar ao `<template id="tpl-line">` (`src/components/CartDialog.astro:111-127`) um `<p class="alert alert--info" data-l-max role="status" hidden>Máximo de 10 unidades por item. Para mais, fale com a gente no WhatsApp.</p>`; em `line-inc` e no `change`, quando `r.hitMax`/`c.clamped === 'max'`, mostrar esse parágrafo da linha (e escondê-lo em `line-dec`/qty < 10); manter o anúncio do subtotal no live region. Remover o `test.fail` de `tests/e2e/qa-edge.spec.ts:190`.
- **A2 - descrições de erro sempre lidas por leitores de tela.** `src/components/CartDialog.astro:53` (`aria-describedby="region-help region-error"`), `:62` (`payment-help payment-error`) e `src/components/FlavorGroup.astro:11` (`aria-describedby={errId}`) referenciam elementos com `hidden`. Pelo cálculo de nome acessível, conteúdo oculto referenciado diretamente por `aria-describedby` **é** incluído (Chrome/TalkBack/NVDA leem): o usuário ouve "Escolha sua região de entrega"/"Escolha um sabor" mesmo sem erro. O axe não pega isso. Correção: deixar no markup só o `*-help`; em `checkout.ts` (`send`/`clearErrors`, linhas 46-52 e 123-131) e `product-card.ts` (linhas 50-53 e 91-95) acrescentar/remover o id do erro em `aria-describedby` junto com o `hidden`. Recomendo corrigir junto com A1 (mesma rodada).

### Sugestão
- **S1** `src/scripts/ui/product-card.ts:101-104`: o anúncio diz "N unidades, adicionado" mesmo quando o teto cortou a soma (8+5 adiciona 2; linha já em 10 adiciona 0). Anunciar a quantidade efetiva (diferença antes/depois) ou "Máximo de 10 unidades por item" quando `hitMax`.
- **S2** `src/scripts/ui/cart-dialog.ts:184`: recompõe a chave com template literal; usar `lineKey` de `src/lib/cart.ts` (fonte única do formato da chave).
- **S3** `src/scripts/ui/cart-dialog.ts:105-107`: indentação quebrada dentro do `for`; considerar Prettier (já previsto como opcional) para evitar isso.
- **S4** `src/components/Header.astro:6`: falta espaço entre `class="logo-link"` e `aria-label` (o navegador tolera, mas é erro de parse HTML).
- **S5** `vercel.json:31-34`: com `cleanUrls: true` as requisições chegam como `/` e `/404`, então a regra `/(.*)\.html` quase nunca casa. Funciona hoje porque o default da Vercel para HTML já é `max-age=0, must-revalidate`; se quiser explícito, usar `source` que case `/` e caminhos sem extensão (ex. `"/((?!_astro/).*)"` antes da regra de `_astro`).
- **S6** `deploy/static/htaccess.template:56-58`: em hospedagens atrás de proxy/CDN (`%{HTTPS}` off no origin) o HSTS não sai; documentar no README ou aceitar `X-Forwarded-Proto`. Template ainda não validado em Apache real (risco T8, pendência do DevOps).
- **S7** `eslint.config.js:6-21`: ampliar a lista de sinks com `DOMParser.parseFromString`, `createContextualFragment` e atribuição a `srcdoc` (defesa em profundidade; nenhum uso hoje).
- **S8** Escopo do PR: o commit `ee15933 feat(planilha)` (`planilha/gerar_planilha.py`, `planilha/NOMAD-puffs-controle.xlsx` 166 KB) não pertence ao site-mvp; preferir PR separado ou mencioná-lo explicitamente na descrição do PR.
- **S9** `docs/squad/site-mvp/02-po.md` RN1 (V400) ainda tem o erro de digitação apontado pelo QA; o `CLAUDE.md` já aponta para `04-tech-lead.md` (pendência anterior resolvida).

### Pendências não verificáveis aqui (para DevOps/QA manual, não bloqueiam)
Lighthouse mobile, leitor de tela real, envio real ao WhatsApp em Android/iOS (M3), Apache/Nginx reais, `npm audit --omit=dev` antes do deploy.
