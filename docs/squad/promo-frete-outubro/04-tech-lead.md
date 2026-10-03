# 04 - Tech Lead - promo-frete-outubro (NOMAD puffs) - PLANO

Entrada: briefing do coordenador, `CLAUDE.md`, `docs/squad/site-mvp/04-tech-lead.md` (ADR-001 e contratos vigentes), `docs/squad/promo-frete-outubro/03-design.md`, `src/data/catalog.ts`, `src/lib/*.ts`, `src/scripts/**`, `src/components/CartDialog.astro`, `src/layouts/BaseLayout.astro`, `public/age-init.js`, `vercel.json`, `deploy/static/*`, `tests/**`, `.github/workflows/ci.yml`.
Data deste plano: **03/10/2026 - a promoção já está valendo desde 01/10.** Prioridade de entrega: estado "ativa" + checkout/mensagem coerentes. Estados "breve" e "encerrada" são exigidos (testes), mas o "encerrada" só precisa estar em produção antes de 01/11 00:00.

> **Aviso de compliance (não técnico, mas obrigatório registrar).** A RDC Anvisa nº 855/2024 proíbe, além da comercialização, a **propaganda** de dispositivos eletrônicos para fumar (inclusive pods descartáveis). Uma landing de promoção e um banner são peças de propaganda. Este plano não reduz esse risco; ele recomenda manter o `noindex` (já forçado no alvo Vercel) e **não** aumentar a descoberta orgânica da página (sem sitemap, sem JSON-LD de produto, sem anúncios pagos). A decisão de publicar é do cliente, idealmente após orientação jurídica (ver também `docs/squad/pagamento-cartao/04-tech-lead.md`, seção 1).

---

## 1. Decisões (resumo)

| # | Decisão | Motivo |
|---|---|---|
| TD1 | Configuração da promoção em **`src/data/promos.ts`** (dados), lógica em **`src/lib/promo.ts`** (pura, sem `Date.now()` escondido) | mesmo padrão de `catalog.ts` + `src/lib`; testável com relógio injetado |
| TD2 | Período como **instantes absolutos** (ISO com offset `-03:00`) e intervalo **semiaberto `[início, fim)`**: `2026-10-01T00:00:00-03:00` até `2026-11-01T00:00:00-03:00` (exclusivo) | `America/Araguaina` é UTC-3 fixo (sem horário de verão desde 2013); comparar epoch ms não depende do fuso do aparelho nem de `Intl`; o fim exclusivo elimina a ambiguidade de "23:59:59.999" |
| TD3 | Regiões **elegíveis listadas explicitamente** (allowlist) + regiões excluídas listadas; teste garante que **elegíveis ∪ excluídas = todas as `REGIONS`** e que são disjuntas | região nova no futuro força decisão consciente (o teste quebra), em vez de entrar grátis por acidente |
| TD4 | Araras, Caribe e Polinésia como **áreas "a combinar"** nomeadas (`ARRANGE_AREAS`), separadas da tabela `REGIONS` (que continua só com taxa fixa em centavos) | não contamina `Region.feeCents` com `null`; o tipo continua garantindo "toda região da tabela tem taxa" |
| TD5 | **Estado inicial calculado no build** (HTML pré-renderizado sai com `data-promo` do momento do build) + **correção no cliente antes da primeira pintura** (`public/age-init.js`) + **recálculo no envio** + **rebuild agendado** nas viradas | site estático: o HTML não sabe a hora em que será lido; o cliente decide, o build só dá o melhor palpite |
| TD6 | "Outra região" continua **a combinar** (não ganha frete grátis) | o site não sabe a taxa normal nem se é em Palmas (D1 do design) |
| TD7 | A regra vale pelo **instante do envio do pedido** no aparelho do cliente; o atendente confirma | D4 do design; não há servidor para carimbar a hora; o relógio do cliente é manipulável, assim como já é todo o resto do pedido (o atendimento confere) |
| TD8 | `/outubro` é página **sem carrinho** (só gate, conteúdo e CTAs para `/#catalogo`), com **entrada de script própria** | design (seção 3) pede página leve; `main.ts` hoje exige os elementos do carrinho (`qs` lança se não achar) |

---

## 2. Modelagem de dados

### 2.1 `src/data/catalog.ts` (alterar)

```ts
// NOVO: áreas atendidas sem taxa tabelada (taxa combinada no WhatsApp). Não entram em REGIONS.
export interface ArrangeArea { readonly id: string; readonly label: string }

export const ARRANGE_AREAS: readonly ArrangeArea[] = [
  { id: 'araras', label: 'Araras' },
  { id: 'caribe', label: 'Caribe' },
  { id: 'polinesia', label: 'Polinésia' },
];

export function findArrangeArea(id: string): ArrangeArea | undefined;
```

- `REGIONS` **não muda** (as 9 regiões e taxas atuais; "Bertaville e Aurenys" e "Taquaralto e Lago Sul" continuam sendo uma região cada - ambas inteiras excluídas da promoção, ok).
- IDs não podem colidir entre `REGIONS`, `ARRANGE_AREAS` e `OTHER_REGION_ID` (teste).
- **D5 do design diverge do briefing**: o design sugeriu manter só "Outra região"; o briefing pede regiões novas. Este plano segue o briefing (3 opções próprias, uma por bairro, porque o cliente procura o nome do próprio bairro). Se o PO preferir agrupar ("Araras, Caribe e Polinésia - a combinar") basta um item em `ARRANGE_AREAS`; o código não muda. A copy da landing (bloco C: "No carrinho, escolha 'Outra região'") precisa ser ajustada para "escolha o seu bairro na lista".
- Atualizar a tabela de entrega do `CLAUDE.md` (coordenador) com as três áreas "a combinar".

### 2.2 `src/data/promos.ts` (criar)

```ts
import type { Region } from './catalog';

export interface DeliveryPromo {
  readonly slug: 'promo-frete-outubro';
  readonly label: string;            // 'Frete grátis (promoção de outubro)' - usado no checkout e na mensagem
  readonly startsAt: string;         // ISO com offset, inclusivo
  readonly endsAt: string;           // ISO com offset, EXCLUSIVO
  readonly timeZone: 'America/Araguaina'; // documental + teste de offset; a lógica usa só epoch ms
  readonly eligibleRegionIds: readonly Region['id'][];
  readonly excludedRegionIds: readonly Region['id'][];
  readonly pagePath: 'outubro/';     // rota da landing (sempre via withBase)
}

export const FRETE_OUTUBRO: DeliveryPromo = {
  slug: 'promo-frete-outubro',
  label: 'Frete grátis (promoção de outubro)',
  startsAt: '2026-10-01T00:00:00-03:00',
  endsAt: '2026-11-01T00:00:00-03:00',
  timeZone: 'America/Araguaina',
  eligibleRegionIds: ['q700s-200', 'q300n-600n', 'q800-1200', 'q1300s-1500s', 'santo-amaro'],
  excludedRegionIds: ['lago-norte', 'bertaville-aurenys', 'taquaralto-lago-sul', 'taquari'],
  pagePath: 'outubro/',
};

/** Promoções de frete conhecidas. Hoje só uma; o motor aceita N (sem sobreposição - teste). */
export const DELIVERY_PROMOS: readonly DeliveryPromo[] = [FRETE_OUTUBRO];
```

Por que não um booleano `ativo: true` no arquivo: exigiria deploy exatamente às 00:00 de 01/10 e 01/11. Com instantes, o mesmo build serve antes, durante e depois.

---

## 3. Lógica pura - `src/lib/promo.ts` (criar) e mudanças em `order.ts` / `whatsapp.ts`

### 3.1 Contratos

```ts
// src/lib/promo.ts - sem DOM, sem Date.now(); o "agora" sempre chega como parâmetro (epoch ms)
export type PromoPhase = 'breve' | 'ativa' | 'encerrada';   // mesmos nomes do design (data-promo)

export function promoWindow(p: DeliveryPromo): { startMs: number; endMs: number };
//   Date.parse dos ISO; lança se inválido (teste de carga do módulo garante que nunca lança em produção)

export function promoPhase(p: DeliveryPromo, nowMs: number): PromoPhase;
//   nowMs <  startMs -> 'breve'; startMs <= nowMs < endMs -> 'ativa'; nowMs >= endMs -> 'encerrada'
//   NaN/Infinity -> 'encerrada' (falha segura: cobra a taxa normal, nunca dá grátis por relógio quebrado)

export function nextBoundaryMs(p: DeliveryPromo, nowMs: number): number | null;
//   próximo instante em que a fase muda (startMs, endMs) ou null se já encerrada; usado pelo timer do cliente

export function activePromoFor(regionId: string, nowMs: number, promos?: readonly DeliveryPromo[]): DeliveryPromo | null;

export function daysLeft(p: DeliveryPromo, nowMs: number): number;
//   para o contador do design ("Termina em N dias" / "Último dia"); calculado em UTC-3 fixo:
//   dia civil de Palmas = Math.floor((ms - 3h) / 86_400_000)
```

```ts
// src/lib/order.ts (alterar)
export type RegionChoice =
  | { kind: 'region'; region: Region }
  | { kind: 'arrange'; area: ArrangeArea }   // NOVO: Araras/Caribe/Polinésia
  | { kind: 'other' }
  | null;

export type DeliveryQuote =
  | { kind: 'fixed'; feeCents: number; region: Region; excludedFrom: DeliveryPromo | null }
  //     excludedFrom != null quando há promo ativa mas a região não participa (chip "fora da promoção")
  | { kind: 'free'; feeCents: 0; baseFeeCents: number; region: Region; promo: DeliveryPromo }
  | { kind: 'arrange'; label: string }       // área a combinar ou "Outra região"
  | { kind: 'unselected' };

export function quoteDelivery(choice: RegionChoice, nowMs: number, promos?: readonly DeliveryPromo[]): DeliveryQuote;

export interface Totals {
  subtotalCents: number;
  feeCents: number | null;      // 0 quando grátis; null quando a combinar / não escolhido
  totalCents: number;
  feeToArrange: boolean;
  quote: DeliveryQuote;         // NOVO: a UI e a mensagem leem daqui (fonte única)
}
export function computeTotals(subtotal: number, region: RegionChoice, nowMs: number): Totals;
//   nowMs OBRIGATÓRIO (sem default) - o compilador aponta todo chamador esquecido
```

```ts
// src/lib/whatsapp.ts (alterar)
export interface OrderInput {
  lines: readonly ResolvedLine[];
  region: Exclude<RegionChoice, null>;
  payment: PaymentMethod;
  nowMs: number;                // NOVO
}
```

### 3.2 Mensagem do WhatsApp (RN12 estendida)

Linha "Entrega" por caso (estrutura RN12 intacta, sem emoji, tudo via `sanitizeText`):

| Caso | Linha Entrega | Linha Total |
|---|---|---|
| fixa, sem promo | `Entrega: Quadras 700 Sul a 200 Norte/Sul - R$ 8,00` (igual hoje) | `Total: R$ 118,00` |
| **grátis (promo ativa)** | `Entrega: Quadras 700 Sul a 200 Norte/Sul - Frete grátis (promoção de outubro)` | `Total: R$ 110,00` |
| fixa, região excluída durante a promo | `Entrega: Taquari - R$ 35,00` (sem menção à promo: evita discussão) | `Total: R$ 145,00` |
| área a combinar | `Entrega: Araras (taxa a combinar)` | `Total: R$ 110,00 + entrega a combinar` |
| outra região | `Entrega: Outra região (a combinar)` (igual hoje) | igual hoje |

Nota sobre o design (5.4): o design sugeriu `Entrega: Grátis (promoção de outubro)` **sem** a região; este plano mantém o label da região na linha, porque o atendente precisa do bairro para a rota e para conferir a elegibilidade. O texto "Frete grátis (promoção de outubro)" vem de `FRETE_OUTUBRO.label` (fonte única para chip, select e mensagem).

### 3.3 UI do checkout (cliente)

`src/scripts/ui/checkout.ts`:
- Recebe `clock: () => number` nas `Options` (produção: `Date.now`; testes: Playwright `page.clock`). Nenhum outro módulo de UI chama `Date.now()` diretamente (regra de lint `no-restricted-properties` para `Date.now` em `src/lib/**` e `src/scripts/ui/**`, com exceção apenas em `src/scripts/clock.ts`).
- `render()` usa `computeTotals(subtotal, region, clock())` e:
  - **reescreve o texto das `<option>`** das regiões elegíveis enquanto `ativa` (`Quadras 700 Sul a 200 Norte/Sul - Grátis em outubro`) e restaura `- R$ 8,00` fora dela (o texto original fica em `data-label-base` no HTML do build). As opções só ficam visíveis com o drawer aberto: sem CLS.
  - `fee-chip`: `Taxa de entrega: grátis (promoção de outubro)` + valor base riscado (`<s>` com `aria-hidden` no riscado e `visually-hidden` "antes R$ 8,00"); excluída: `Taxa de entrega: R$ 30,00 (região fora da promoção)`; área: `Taxa de entrega: a combinar`.
  - resumo: `Entrega` = `Grátis` / valor / `a combinar`.
- **Recheque no envio** (`send()`): recalcula com `clock()`; se o `quote.kind` mudou desde o último `render()` (ex.: cliente abriu o carrinho 31/10 23:59 e enviou 01/11 00:00:05), **não abre o WhatsApp nesse clique**: re-renderiza, anuncia no live region "A promoção de frete terminou. O total foi atualizado." e mostra o mesmo texto num `alert--info` acima do resumo; o próximo clique envia. Isso garante que a mensagem nunca diverge do que estava na tela.
- **Timer de virada**: ao abrir o drawer, `setTimeout(render, min(nextBoundaryMs - now, 2^31-1))`; cancelado ao fechar. Também re-renderiza em `visibilitychange` (aba volta do segundo plano, celular desbloqueado).

`src/components/CartDialog.astro`:
- Opções: `REGIONS` (com `data-label-base`), depois `ARRANGE_AREAS` (`Araras - taxa a combinar`), depois "Outra região".
- Texto de ajuda `region-help`: inalterado; a explicação da promo fica no chip.

### 3.4 Banner na home e estado global `data-promo`

- `BaseLayout.astro`: `<html lang="pt-BR" class="no-js" data-promo={buildPhase}>` onde `buildPhase = promoPhase(FRETE_OUTUBRO, Date.now())` **no build** (único `Date.now()` permitido fora de `clock.ts`, comentado como "palpite do build").
- `public/age-init.js` (script clássico bloqueante, já `'self'`): passa a também calcular a fase e gravar `document.documentElement.dataset.promo` **antes da primeira pintura**, como o design pede (2.1). Como `public/` não passa pelo bundler, os dois instantes ficam **duplicados** ali como números (epoch ms); **teste unitário trava a igualdade** com `promos.ts` (mesmo padrão do teste que já trava `AGE_KEY` em `age-init.js`). Falha de parse/exceção -> não mexe no atributo (fica o palpite do build).
- `src/components/PromoBanner.astro` (novo): renderizado **somente se** o build não estiver em `encerrada` (após a virada + rebuild, o banner some do HTML). Visibilidade por CSS em arquivo: `html:not([data-promo='ativa']) .promo-banner { display: none }`. Sem `style=""` (CSP).
- CLS: o build de outubro sai com `data-promo="ativa"`, igual ao que o cliente calcula -> nada se move. Só quem tiver o relógio errado ou acessar após 01/11 um HTML antigo vê o banner sumir, e isso ocorre antes da primeira pintura (age-init roda no `<head>`).

### 3.5 Lidando com o HTML pré-renderizado (resumo do TD5)

| Camada | Quando decide | Papel |
|---|---|---|
| Build (`BaseLayout`, `PromoBanner`) | no `npm run build` | palpite inicial (`data-promo`), remove o banner do HTML se já encerrada |
| `age-init.js` no `<head>` | antes da primeira pintura | corrige `data-promo` pelo relógio do aparelho; sem flash |
| `checkout.ts` | a cada render, no timer de virada e no envio | taxa, chip, opções, mensagem; recheque impede divergência |
| Rebuild agendado | 01/10 00:05 e **01/11 00:05** (Palmas) | limpa o HTML (banner fora, `/outubro` passa a sair como "encerrada" no build) |
| Atendimento | ao responder o WhatsApp | autoridade final (relógio do cliente é manipulável; a copy já diz isso) |

Rebuild agendado:
- **Vercel**: Deploy Hook (URL secreta, guardada como secret `VERCEL_DEPLOY_HOOK_URL` no GitHub) acionado por workflow `.github/workflows/promo-rebuild.yml` com `schedule: - cron: '5 3 1 11 *'` (03:05 UTC = 00:05 de Palmas). O cron do GitHub pode atrasar até ~1 h: aceitável, porque o cliente já corrige sozinho. Alternativa equivalente: Vercel Cron Job não serve aqui (dispara função, não build).
- **Hospedagem própria**: DevOps gera `npm run package:static` em 01/11 e publica (tarefa no `07-devops.md`). Se atrasar, o site continua correto pelo cliente; só carrega o markup do banner escondido.
- Cache: HTML já sai com `max-age=0, must-revalidate` (Vercel e `.htaccess`), então o rebuild vale na próxima visita.

### 3.6 Rota `/outubro`

- `src/pages/outubro.astro` -> `outubro/index.html` (formato `directory` já configurado; funciona com qualquer `base`, inclusive `/loja/`, sem rewrite). Todos os links via `withBase()`; CTAs para `withBase('') + '#catalogo'`.
- Usa `BaseLayout` (title/description do design 3), `NoScriptNotice`, `AgeGate`, `#app inert`, `Footer`, `LegalStrip`. `h1` com `data-hero-title tabindex="-1"` (requisito do `initAgeGate`).
- Os três estados (`breve`/`ativa`/`encerrada`) ficam **todos no HTML**, alternados por CSS via `html[data-promo]` (sem JS de renderização; acessível porque `display:none` remove da árvore de acessibilidade).
- Quadro de regiões gerado no build a partir de `FRETE_OUTUBRO` + `REGIONS` + `ARRANGE_AREAS` (nunca texto digitado à mão; o design pede bairros um por linha: o split "Bertaville e Aurenys" -> 2 linhas sai de um campo `neighborhoods: readonly string[]` opcional em `Region`, ou de um mapa `REGION_NEIGHBORHOODS` em `promos.ts` - preferir o mapa para não mexer em `Region`).
- Script: `src/scripts/promo-page.ts` (nova entrada) importa só `initAgeGate` + `ui/promo-countdown.ts` (contador "Termina em N dias", calculado uma vez no load, sem `aria-live`). Refatoração pequena em `main.ts` não é necessária.
- `/outubro` após encerrada: continua publicada (D6), estado "encerrada". Remoção futura via redirect 301 em `vercel.json` (`redirects`) e `.htaccess` (`Redirect 301`).
- `og:*` específicos da página (título/descrição já passam por props). `og:image` é upgrade U1 (seção 7), condicionado ao jurídico.

---

## 4. Arquivos

Criar:
| Arquivo | Conteúdo |
|---|---|
| `src/data/promos.ts` | config (2.2) + `REGION_NEIGHBORHOODS` |
| `src/lib/promo.ts` | funções puras (3.1) |
| `src/scripts/clock.ts` | `export const systemClock = (): number => Date.now()` (único ponto com `Date.now` no cliente) |
| `src/scripts/promo-page.ts` | entrada da `/outubro` |
| `src/scripts/ui/promo-countdown.ts` | contador da landing |
| `src/components/PromoBanner.astro` | banner da home (design 5) |
| `src/components/RegionBoard.astro` | quadro de regiões (landing; reaproveitável na home depois - U9 do design) |
| `src/pages/outubro.astro` | landing |
| `tests/unit/promo.test.ts` | seção 5.1 |
| `tests/e2e/promo.spec.ts`, `tests/e2e/promo-page.spec.ts` | seção 5.2 |
| `.github/workflows/promo-rebuild.yml` | rebuild agendado (Vercel) |

Alterar:
| Arquivo | Mudança |
|---|---|
| `src/data/catalog.ts` | `ArrangeArea`, `ARRANGE_AREAS`, `findArrangeArea` |
| `src/lib/order.ts` | `RegionChoice.arrange`, `DeliveryQuote`, `quoteDelivery`, `computeTotals(..., nowMs)`, `validateCheckout` aceita área |
| `src/lib/whatsapp.ts` | `OrderInput.nowMs`, linha de entrega por caso (3.2) |
| `src/scripts/main.ts` | injeta `systemClock` no checkout |
| `src/scripts/ui/cart-dialog.ts` | repassa `clock`; timer de virada ao abrir/fechar |
| `src/scripts/ui/checkout.ts` | 3.3 |
| `src/components/CartDialog.astro` | opções de área, `data-label-base`, `alert--info` do recheque |
| `src/layouts/BaseLayout.astro` | `data-promo` do build |
| `src/pages/index.astro` | `<PromoBanner />` primeiro dentro de `<main>` |
| `public/age-init.js` | cálculo de fase (3.4) |
| `src/styles/app.css`, `src/styles/tokens.css` | classes/tokens do design (seções 6-7 do 03-design) |
| `eslint.config.js` | `no-restricted-properties` para `Date.now` fora de `clock.ts`/`BaseLayout`/`PromoBanner` |
| `tests/unit/order.test.ts`, `whatsapp.test.ts`, `catalog.test.ts`, `deploy-config.test.ts` | novos casos; `computeTotals` com `nowMs` |
| `tests/e2e/fixtures.ts` | opção `now` (ver 5.2) |
| `README.md`, `CLAUDE.md` (coordenador) | regiões a combinar, promo, rebuild agendado |

Sem dependência nova. Sem mudança de CSP (tudo `'self'`, nenhum inline). Orçamento: +~1,5 KB gzip de JS na home.

---

## 5. Plano de testes

Instantes de borda (todos em horário de Palmas, UTC-3):

| Nome | Instante local | ISO UTC | Fase esperada |
|---|---|---|---|
| B1 | 30/09/2026 23:59:59.999 | `2026-10-01T02:59:59.999Z` | `breve` (taxa normal) |
| B2 | 01/10/2026 00:00:00.000 | `2026-10-01T03:00:00.000Z` | `ativa` |
| B3 | 31/10/2026 23:59:00 e 23:59:59.999 | `2026-11-01T02:59:00Z` / `02:59:59.999Z` | `ativa` |
| B4 | 01/11/2026 00:00:00.000 | `2026-11-01T03:00:00.000Z` | `encerrada` |

### 5.1 Unitários (Vitest) - `tests/unit/promo.test.ts` + atualizações

- `promoPhase` em B1-B4, em `startMs-1`, `startMs`, `endMs-1`, `endMs`, e `NaN`/`Infinity` -> `encerrada`.
- **Independência de fuso**: rodar a suíte com `process.env.TZ` variando não é confiável no mesmo processo; em vez disso, construir os instantes por ISO com offset explícito e, adicionalmente, um teste que confirma via `Intl.DateTimeFormat('en-US', { timeZone: 'America/Araguaina', timeZoneName: 'longOffset' })` que o offset em 01/10/2026 e 31/10/2026 é `GMT-03:00` (protege contra mudança de regra de horário de verão: se o Tocantins voltar a ter DST, o teste quebra e obriga revisar os ISO). Script npm opcional `test:tz` roda a suíte com `TZ=Asia/Tokyo` e `TZ=America/Sao_Paulo` no CI.
- Partição: `eligible ∩ excluded = ∅`, `eligible ∪ excluded = REGIONS.map(id)`; todo id existe em `REGIONS`; `excluded` contém exatamente `lago-norte`, `bertaville-aurenys`, `taquaralto-lago-sul`, `taquari`; nenhuma área de `ARRANGE_AREAS` está em nenhuma das listas; promoções de `DELIVERY_PROMOS` não se sobrepõem; `startMs < endMs`.
- `quoteDelivery`: cada região elegível em B2/B3 -> `free` com `baseFeeCents` correto; em B1/B4 -> `fixed`; excluída em B2 -> `fixed` com `excludedFrom`; área e "outra" -> `arrange` em qualquer data; `null` -> `unselected`.
- `computeTotals`: tabela atual (`order.test.ts`) repetida com `nowMs = B1` (valores de hoje) e nova tabela com `nowMs = B2` (elegíveis = subtotal).
- `buildOrderMessage`: snapshot literal das 5 variações da tabela 3.2; garante que "Frete grátis (promoção de outubro)" aparece só no caso grátis; `buildWhatsAppUrl` continua codificando `+` e acentos corretamente.
- `nextBoundaryMs` e `daysLeft` (01/10 -> 31 dias; 31/10 10:00 -> "último dia"; 31/10 23:59 ainda último dia).
- `catalog.test.ts`: `ARRANGE_AREAS` exatos; ids únicos entre `REGIONS`, áreas e `outra`.
- `deploy-config.test.ts`: os epoch ms em `public/age-init.js` = `promoWindow(FRETE_OUTUBRO)`.

### 5.2 E2E (Playwright, projetos `vercel-mobile`, `static-mobile` em `/loja/`, `vercel-desktop` para a11y)

Relógio: Playwright `page.clock.setFixedTime(...)` / `page.clock.install({ time })` **antes do `goto`** (o fixture `app` hoje navega antes do teste). Mudança no `fixtures.ts`: opção de fixture `now: [undefined, { option: true }]`; se definida, `await page.clock.install({ time: now })` antes de `page.goto('./')`. Fuso do aparelho variado com `test.use({ timezoneId: 'Asia/Tokyo' })` e `'America/Noronha'` para provar independência.

`tests/e2e/promo.spec.ts` (home + checkout):
1. B1: banner oculto; opção "Quadras 700... - R$ 8,00"; total com taxa; mensagem sem "Frete grátis".
2. B2 (e repetido com `timezoneId: 'Asia/Tokyo'`): banner visível e é um único link para `outubro/`; opção "... - Grátis em outubro"; chip "grátis (promoção de outubro)"; total = subtotal; URL `wa.me` decodificada contém `Entrega: Quadras 700 Sul a 200 Norte/Sul - Frete grátis (promoção de outubro)`.
3. B3 (31/10 23:59): igual B2. Região excluída (Taquari) -> R$ 35,00 + chip "fora da promoção"; mensagem sem menção à promo.
4. B4: igual B1; banner oculto.
5. Virada com o drawer aberto: `install` em 31/10 23:59:50, abrir checkout com região elegível, `page.clock.fastForward('00:15')` -> resumo passa a mostrar R$ 8,00 sem recarregar (timer de virada).
6. Recheque no envio: `install` em 31/10 23:59:58, montar pedido, `page.clock.pauseAt(B4)` (ou `setFixedTime`) sem disparar timers e clicar "Enviar" -> WhatsApp **não** abre, alerta "A promoção de frete terminou..." visível, total atualizado; segundo clique envia mensagem com taxa normal.
7. Áreas: "Araras - taxa a combinar" -> total "+ entrega a combinar"; mensagem `Entrega: Araras (taxa a combinar)`; validação aceita a área.
8. Sem flash: em B4 com HTML do build "ativa" (build normal de outubro), checar que o banner não está visível no primeiro frame (`expect(...).toBeHidden()` logo após `domcontentloaded` + nenhuma mudança de layout medida via `PerformanceObserver('layout-shift')` < 0.01).

`tests/e2e/promo-page.spec.ts` (`/outubro`):
- Gate aparece para visitante novo; após confirmar, foco no `h1`; recusa não mostra nada da promo.
- B1/B2/B3/B4: estado correto (selo, contador "Termina em 31 dias"/"Último dia", textos "encerrada").
- Lista de regiões contém os 9 bairros excluídos por nome e os 5 grupos elegíveis.
- CTAs apontam para `#catalogo` da home respeitando a base (`/loja/` no projeto estático).
- axe sem violações nos três estados (desktop e mobile); nenhum erro de console e nenhuma violação de CSP (já garantido pelo fixture).

Comandos: `npm test`, `npm run test:e2e` (sem mudança de script). CI inalterado, salvo o novo workflow de rebuild.

---

## 6. Riscos

| # | Risco | Mitigação |
|---|---|---|
| R1 | Relógio do aparelho errado/manipulado dá frete grátis indevido (ou nega) | atendimento confirma (copy); falha segura para NaN; é o mesmo nível de confiança do resto do pedido (montado no cliente) |
| R2 | Instantes duplicados em `age-init.js` divergirem de `promos.ts` | teste unitário trava a igualdade |
| R3 | Rebuild de 01/11 não rodar | cliente corrige sozinho; rebuild é limpeza, não requisito de correção |
| R4 | Tocantins voltar a ter horário de verão | teste de offset via `Intl` quebra e obriga revisão |
| R5 | Promo já está no ar (hoje é 03/10): cada dia sem o checkout coerente gera divergência entre o que o cliente vê na divulgação e o total do site | entregar em 2 lotes: **Lote 1 (urgente, ~1,5 dia)** = `promos.ts` + `promo.ts` + checkout/mensagem + áreas a combinar + testes; **Lote 2 (~1,5-2 dias)** = landing `/outubro` + banner + `age-init` + rebuild agendado |
| R6 | Regulatório (propaganda - RDC 855/2024) | ver aviso no topo; manter `noindex`; decisão do cliente com jurídico |

Estimativa total: **3-4 dias de dev + 1 dia de QA**.

---

## 7. Upgrades técnicos

Estado atual (medido na revisão do MVP): JS 6,5 KB gzip, CSS 5,1 KB gzip, maior AVIF ~44 KB, CSP estrita sem inline, zero terceiros, CI com lint/typecheck/unit/build/E2E/axe. O site já é rápido e seguro; os ganhos abaixo são de **operação, medição e robustez**, não de reescrita.

Esforço: P (até 1 dia) / M (2-4 dias) / G (1 semana ou mais). Impacto: Alto / Médio / Baixo.

| # | Upgrade | Esforço | Impacto | Notas |
|---|---|---|---|---|
| **U1** | **Código do pedido na mensagem do WhatsApp** (`Pedido NMD-7K3F`, 4-6 caracteres base32 gerados no cliente com `crypto.getRandomValues`) + coluna correspondente na planilha `planilha/NOMAD-puffs-controle.xlsx` | P | **Alto** | conciliação pedido x entrega x pagamento na maquininha, referência em conversa, base para qualquer backend futuro. Sem dado pessoal |
| **U2** | **Analytics sem cookies e sem dado pessoal** medindo o funil (visita -> add ao carrinho -> checkout -> clique "Enviar") e origem por `utm_source` (Instagram, status do WhatsApp, banner/`/outubro`) | M | **Alto** | Vercel: Web Analytics (cookieless; script em `/_vercel/insights/*`, mesma origem -> CSP `'self'` intacta) só no alvo Vercel. Hospedagem própria: Umami/Plausible self-hosted no mesmo domínio (proxy) ou endpoint próprio `navigator.sendBeacon`. Hoje a única métrica é contagem manual no WhatsApp. Atualizar política de privacidade |
| **U3** | **CI mais forte**: Lighthouse CI com orçamento (LCP < 2,5 s, CLS < 0,05, TBT, peso), `npm audit --omit=dev` como etapa, Dependabot/Renovate (agrupado, semanal), actions fixadas por SHA, workflow agendado de E2E diário contra a URL de produção (smoke: home 200, gate, WhatsApp URL) e o `promo-rebuild.yml` | P-M | **Alto** | transforma pendências manuais do DevOps em gates; o smoke agendado é a "observabilidade" possível sem backend |
| **U4** | **Prévia de compartilhamento**: `og:image` 1200x630 (gerada no build com `sharp` a partir da Capa; uma específica para `/outubro`), `og:locale=pt_BR`, `og:site_name`, `twitter:card=summary_large_image`, `og:image:alt` | P | Alto (conversão de links) | exige `SITE_URL` absoluto (já suportado). **Condicionado ao jurídico** (propaganda - RDC 855/2024). Não incluir sitemap/JSON-LD de produto pelo mesmo motivo; manter `noindex` na Vercel |
| **U5** | **Endurecimento de CSP e headers**: `require-trusted-types-for 'script'; trusted-types 'none'` (viável porque o código não usa sinks de HTML - lint já proíbe), `Cross-Origin-Resource-Policy: same-origin`, HSTS com `preload` no domínio próprio (já no `.htaccess`; validar proxy - S6 do MVP), `Report-To`/`report-uri` quando houver endpoint (U8) | P | Médio | defesa em profundidade quase grátis; testar Trusted Types no E2E (fixture já captura `securitypolicyviolation`) |
| U6 | **Estoque/disponibilidade por sabor sem deploy** ("esgotado") | M (JSON em Vercel Blob/Edge Config) / G (painel) | Alto para operação | hoje trocar disponibilidade exige commit. Exige `connect-src` para a origem do JSON ou servir o JSON do mesmo domínio (rebuild por webhook). Decidir após U1/U2 |
| U7 | **PWA mínimo**: `manifest.webmanifest` (nome, ícones 192/512 maskable, `theme_color` #131416, `display: standalone`) | P | Baixo-Médio | `manifest-src 'self'` já está na CSP. **Sem service worker por enquanto**: cache offline de HTML com preço/promo é risco de mostrar preço/frete velho; se vier, só `network-first` para HTML e `cache-first` para `/_astro/*` |
| U8 | **Observabilidade de erros no cliente**: `window.onerror`/`unhandledrejection` -> `sendBeacon` para endpoint próprio (Vercel Function, mesma origem) com amostragem e sem PII; alternativa Sentry exige `connect-src` de terceiro | M | Médio | hoje um erro de JS no celular de um cliente é invisível; é o primeiro uso de backend e prepara o terreno para pagamento/pedidos |
| U9 | **Performance fina**: `fetchpriority="high"` na imagem do 1º card (LCP), `<link rel="preload" as="image" imagesrcset>` do LCP, subset de fontes só com glifos usados (Syne é só títulos), `Speculation-Rules` via header HTTP para pré-carregar `/` a partir de `/outubro` (sem script inline) | P | Baixo-Médio | já está dentro do orçamento; ganho marginal em 3G/4G fraco |
| U10 | **Motor genérico de campanhas** (o `promos.ts` deste plano) com tipos `frete-gratis`, `desconto-por-modelo`, `leve-x-pague-y`, sempre com instantes `[início, fim)` e teste de não sobreposição | M | Médio | próximas promoções viram dado + teste, sem código novo. Fazer só quando a segunda campanha for confirmada |
| U11 | **Testes de mutação / cobertura** em `src/lib` (Vitest coverage v8 com limiar 95% + Stryker opcional) | P | Médio | dinheiro e datas são a parte crítica; o limiar evita regressão silenciosa |
| U12 | **Imagens de produto sem preço "queimado"** (dependência do design U13): preço vem só do dado | G (depende de arte) | Médio | elimina o risco T9 do MVP (PNG com preço desatualizado) |

**Top 5 por impacto/esforço:** U1 (código do pedido), U2 (analytics sem cookies), U3 (CI + smoke agendado), U4 (prévia de compartilhamento - condicionado ao jurídico) e U5 (Trusted Types + headers).

Fora de escopo deliberado: SSR/adapters, framework de UI, CDN de terceiros, pixels de anúncio (Meta/Google proíbem anúncio de vape e há o risco regulatório), sitemap/JSON-LD de produto.
