# 05 - Dev - promo-frete-outubro (NOMAD puffs)

Entrada: `03-design.md`, `04-tech-lead.md`, regras confirmadas pelo cliente (briefing do coordenador).
Escopo entregue: **Lote 1 + Lote 2** (dados/lógica, checkout e mensagem, áreas a combinar, landing `/outubro`,
banner da home, `age-init.js`). Fora de escopo (não implementado): upgrades dos docs, pagamento online, painel admin.
Versão: **0.2.0**. Branch: `feat/promo-frete-outubro` (sem commit; o coordenador faz).

## 1. Regras implementadas

| Regra | Onde |
|---|---|
| Frete grátis de 01/10/2026 00:00 a 31/10/2026 23:59:59 (Palmas, UTC-3), intervalo `[2026-10-01T00:00-03:00, 2026-11-01T00:00-03:00)` | `src/data/promos.ts` (`FRETE_OUTUBRO`), `src/lib/promo.ts` |
| Grátis: Quadras 700 Sul a 200 Norte/Sul, 300 Norte a 600 Norte, 800 a 1200, 1300 a 1500 Sul, Santo Amaro | `eligibleRegionIds` |
| Taxa normal: Lago Norte, Bertaville e Aurenys, Taquaralto e Lago Sul, Taquari | `excludedRegionIds` |
| Araras, Caribe, Polinésia: opções próprias no checkout, "a combinar no WhatsApp" | `ARRANGE_AREAS` em `src/data/catalog.ts` |
| "Outra região": continua a combinar | inalterado |
| Carrinho/mensagem: "Frete grátis (promoção de outubro)" e total = subtotal | `quoteDelivery` / `computeTotals` / `buildOrderMessage` |
| Relógio inválido (NaN/Infinity) -> "encerrada" (nunca grátis por relógio quebrado) | `promoPhase` |

Mensagem (linha "Entrega"): grátis `Entrega: <região> - Frete grátis (promoção de outubro)`; excluída
`Entrega: Taquari - R$ 35,00` (sem citar a promoção); área `Entrega: Araras (taxa a combinar)`; outra
`Entrega: Outra região (a combinar)`.

## 2. Arquivos

Criados:
- `src/data/promos.ts` — `DeliveryPromo`, `FRETE_OUTUBRO`, `DELIVERY_PROMOS`, `REGION_NEIGHBORHOODS`.
- `src/lib/promo.ts` — `promoWindow`, `promoPhase`, `nextBoundaryMs`, `activePromoFor`, `activePromo`, `daysLeft`, `countdownText` (puras, "agora" injetado).
- `src/scripts/clock.ts` — `systemClock` (único `Date.now()` do cliente).
- `src/scripts/ui/promo-state.ts` — mantém `html[data-promo]` na virada com a página aberta (timer até a próxima fronteira + `visibilitychange`) e dispara `nomad:promo-phase`.
- `src/scripts/ui/promo-countdown.ts`, `src/scripts/promo-page.ts` — contador e entrada da landing (sem carrinho).
- `src/components/PromoBanner.astro`, `src/components/RegionBoard.astro`, `src/pages/outubro.astro`.
- `src/styles/promo.css` — estados por `data-promo-only`, banner, landing, frete grátis no checkout.
- `tests/instants.ts` (bordas B1-B4 compartilhadas), `tests/unit/promo.test.ts`, `tests/e2e/promo.spec.ts`, `tests/e2e/promo-page.spec.ts`.

Alterados:
- `src/data/catalog.ts` — `ArrangeArea`, `ARRANGE_AREAS`, `findArrangeArea`.
- `src/lib/order.ts` — `RegionChoice.arrange`, `DeliveryQuote`, `quoteDelivery`, `computeTotals(subtotal, region, nowMs)` (com `quote`).
- `src/lib/whatsapp.ts` — `OrderInput.nowMs`, linha de entrega por caso.
- `src/scripts/main.ts`, `src/scripts/ui/cart-dialog.ts`, `src/scripts/ui/checkout.ts` — relógio injetado; opções "- Grátis em outubro"; chip com valor riscado + texto oculto; "Grátis" no resumo; chip "(região fora da promoção)"; recheque no envio; re-render na virada.
- `src/components/CartDialog.astro` — `data-label-base`, opções das áreas, `alert--info` do recheque.
- `src/components/Header.astro` — variante `promo` (logo volta para a loja + "Ver catálogo").
- `src/layouts/BaseLayout.astro` — `data-promo` do build e `promo.css`.
- `src/pages/index.astro` — `<PromoBanner />` no topo do `<main>`.
- `src/styles/tokens.css` — `--color-accent-soft`, `--color-accent-line`, `--fs-promo-serif`.
- `public/age-init.js` — fase da promoção antes da primeira pintura (epoch ms duplicados; teste trava).
- `eslint.config.js` — `no-restricted-properties` para `Date.now` em `src/lib`/`src/scripts` (exceto `clock.ts`).
- `playwright.config.ts` — `promo-page.spec.ts` também no projeto desktop.
- Testes: `fixtures.ts` (opções `now` e `startPath`), `checkout.spec.ts` e `whatsapp.spec.ts` fixados em setembro (`SEM_PROMO`), `order/whatsapp/qa-edge/catalog.test.ts`.
- `CLAUDE.md`, `README.md`, `CHANGELOG.md`, `package.json`/`package-lock.json` (0.2.0).

## 3. Decisões e desvios do plano (04-tech-lead)

1. **Banner sempre no HTML** (plano: só se o build não estiver "encerrada"). Visibilidade só por CSS/`data-promo`. Motivo: o mesmo build serve qualquer data e os E2E não dependem da data do build. Custo: ~0,6 KB de HTML oculto após 01/11.
2. **Sem `.github/workflows/promo-rebuild.yml`**. Com o item 1 o rebuild de 01/11 vira só limpeza: `age-init.js` já corrige o estado antes da pintura e o checkout decide pelo relógio. Evita secret de Deploy Hook. Se o DevOps quiser, o rebuild continua sendo opcional.
3. **Timer de virada global** (`promo-state.ts`) em vez de timer por abertura do drawer: um só `setTimeout` (limitado a 2^31-1 ms e reagendado) atualiza `data-promo` e avisa o checkout por evento. Cobre banner, landing e checkout.
4. `DeliveryQuote.arrange` carrega `area: ArrangeArea | null` (null = "Outra região") em vez de `label: string`.
5. Campo `optionLabel: 'Grátis em outubro'` em `DeliveryPromo` (fonte única do texto das opções).
6. Contador: `daysLeft` conta o dia de hoje (01/10 -> 31). Textos: "Termina em N dias", "Termina amanhã às 23h59" (N=2), "Último dia: termina hoje às 23h59" (N=1).
7. Design 5.4 sugeria um `alert--info` com link para `/outubro/#regioes` acima do select: **não feito** (o plano manteve o `region-help`; as opções e o chip já explicam).
8. Landing: bloco C diz "No carrinho, escolha o seu bairro na lista" (as áreas viraram opções próprias, como o plano previu). Regras incluem "Bairros não listados: taxa a combinar no WhatsApp".
9. Selo circular (6.3) e animação de entrada do hero (opcionais no design): não feitos.
10. Header da landing em telas < 375px: logo e gutter um pouco menores para "Ver catálogo" caber em 320px.
11. E2E "breve" usa 30/09 23:50 (`ANTES_DO_INICIO`): o relógio simulado continua correndo, então B1 exato (1 ms antes) viraria "ativa" durante o teste. A borda exata B1 está nos unitários e a virada breve -> ativa tem teste próprio (`promo-page.spec.ts`).

## 4. Como testar

```bash
export PATH="$HOME/.local/node:$PATH"
npm run lint && npm run typecheck && npm test && npm run build
npm run test:e2e        # primeira vez: npm run test:e2e:install
```

Manual: `npm run dev` e abrir `/` (banner) e `/outubro`. Para ver outros estados, mudar o relógio do aparelho ou,
no DevTools, `document.documentElement.dataset.promo = 'encerrada'` (só visual; o checkout usa o relógio).
No checkout (outubro): "Quadras 700 Sul a 200 Norte/Sul - Grátis em outubro" -> resumo "Grátis", total = subtotal;
Taquari -> "R$ 35,00 (região fora da promoção)"; Araras -> "+ entrega a combinar".

No Windows/Git Bash, rodar `node scripts/build.mjs --base=/loja/` exige `MSYS_NO_PATHCONV=1` (o MSYS converte
`/loja/` em caminho do Windows); via `npm run ...` ou PowerShell não acontece.

## 5. Resultados (03/10/2026)

- `npm run lint`: ok · `npm run typecheck`: 0 erros · `npm test`: 10 arquivos, 247 testes ok · `npm run build`: ok (3 páginas por alvo)
- `npm run test:e2e`: 236 passaram, 11 pulados (pulos condicionais por projeto já existentes), 0 falhas.

## 6. Pendências / para o PO-QA

- "Sem valor mínimo de pedido" nas regras da landing é default de design (D3): confirmar com o cliente.
- Regra vale pelo instante do **envio** no aparelho do cliente; o atendimento confirma (copy já diz isso).
- Aviso regulatório do 04-tech-lead (RDC Anvisa 855/2024, propaganda) continua valendo; `noindex` mantido na Vercel.
- Após a campanha: remover banner/rota ou redirecionar `/outubro` (301) junto da próxima promoção.
