# 05 - Dev - site-mvp (NOMAD puffs)

Implementado conforme `04-tech-lead.md` (Astro 7 estático + TS 6 + CSS com tokens) e `03-design.md`.

## Status das verificações (executadas de fato)
- `npm run lint`: ok (0 erros)
- `npm run typecheck` (astro check): 0 erros, 0 avisos
- `npm test`: 106 testes unitários passando (8 arquivos)
- `npm run build`: ok (dist-vercel e dist-static)
- `npm run test:e2e` (Chromium instalado): 117 passaram, 4 ignorados por projeto (a11y de toque só mobile; deploy.spec por projeto)

## Arquivos criados
- Config: `package.json`, `package-lock.json`, `astro.config.mjs`, `tsconfig.json`, `eslint.config.js`, `vitest.config.ts`, `playwright.config.ts`, `vercel.json`, `.env.example`; `.gitignore` (+ test-results/, playwright-report/).
- Deploy: `scripts/build.mjs`, `scripts/serve-static.mjs`, `deploy/static/htaccess.template`, `deploy/static/nginx.conf.example`, `public/age-init.js`, `public/favicon-32.png`, `public/apple-touch-icon.png` (gerados do `assets/brand/favicon.png`).
- Dados/lógica: `src/data/{catalog,product-images,csp,url}.ts`, `src/lib/{money,cart,order,whatsapp,storage,age-gate}.ts`.
- Cliente: `src/scripts/{main,store}.ts`, `src/scripts/ui/{dom,live-region,age-gate,product-card,cart-dialog,checkout,model-nav}.ts`.
- UI: `src/styles/{tokens,fonts,global,app}.css`, `src/layouts/BaseLayout.astro`, `src/pages/{index,404}.astro`, componentes em `src/components/`.
- Testes: `tests/unit/*.test.ts` (catalog, money, cart, order, whatsapp, storage, age-gate, deploy-config), `tests/e2e/*.spec.ts` + `fixtures.ts`.

## Como testar manualmente
```
export PATH="$HOME/.local/node:$PATH"
npm ci
npm run dev                       # http://localhost:4321
npm run build && npm run preview:vercel      # http://127.0.0.1:4321/ (noindex + headers)
BASE_PATH=/loja/ NOINDEX=true npm run build:static && npm run preview:static   # use BASE_PATH=/loja/ no preview também
```
Fluxo: gate 18+ -> escolher sabor -> adicionar -> carrinho -> Continuar -> região + pagamento -> Enviar (abre wa.me/5563981239498 com a mensagem). Testar também recusa (Acesso restrito), recarregar, localStorage bloqueado e JS desligado.
Nota Git Bash: argumentos que começam com `/` (ex. `--base /`) sofrem conversão de caminho do MSYS; use `MSYS_NO_PATHCONV=1` ao rodar scripts direto (via npm no Windows não ocorre).

## Decisões e desvios (com motivo)
1. **Injeção de valores de deploy**: usado `vite.define` (`__DEPLOY__`), alternativa prevista no plano 6.13, em vez de `astro:env`.
2. **Componentes**: não criados `Button`, `Eyebrow`, `InlineAlert`, `OrderSummary`, `EmptyState` como arquivos `.astro`; são classes CSS (`.btn`, `.eyebrow`, `.alert`, `.summary`, `.empty`) e markup no `CartDialog`/`ProductCard`. Menos arquivos, mesmo resultado visual.
3. **CSS**: estilos de componente ficam em `src/styles/app.css` (não `<style>` escopado por componente), importado pelo layout; evita estilos inline (CSP `style-src 'self'`) e simplifica o `inlineStylesheets: never`.
4. **Logo/Watermark em SVG próprio** (círculo + N + fumaça), em vez de usar os PNGs de `assets/brand` (o vertical é fundo claro; o horizontal tem muita margem). Só o favicon vem de `assets/brand`. Revisar fidelidade com o designer.
5. **Loading de 1,2 s no envio** (design 5.5) omitido: o painel de fallback aparece imediatamente após `window.open` síncrono (plano 6.7 já proibia atraso).
6. **Cores**: tokens copiados do design; NÃO foi feita amostragem de pixel (sem ferramenta) das cores das bolinhas e do cinza secundário; pendência do designer/QA.
7. **Gate recusado**: `role="alert"` no painel (não no `h1`) para manter a semântica de título.
8. **`htaccess`**: bloqueio de arquivos ocultos via `FilesMatch` (sem `RewriteRule`, como o plano exige). Template não testado em Apache real.
9. **Sem desfazer na remoção de item** (opcional/Could); anuncia "Item removido".
10. Imagens: `<Picture>` gera também fallback PNG (padrão do Astro) além de AVIF/WebP; mobile 360w AVIF ~10-30 KB.
11. Telemetria do Astro desativada localmente (`astro telemetry disable`, fora do repo).
12. Sem novas dependências além das do plano. `npm install` informa aviso de install-scripts do esbuild (benigno).
13. Não verificados: Lighthouse, leitor de tela, iOS/Android reais (M3), Apache real. CLAUDE.md não foi alterado (coordenador): corrigir o link `03-tech-lead.md` -> `04-tech-lead.md`.

## Observações para o QA
- A imagem dos cards contém preço "queimado"; a UI é a fonte de verdade.
- Gate é declaratório; HTML do catálogo está no documento (limitação aceita R5).
- E2E do pedido grande leva ~20 s (18 inclusões).

## Correções pós-revisão
Origem: seção "## Revisão" do `04-tech-lead.md` e BUG-01 do `06-qa.md`.
- **A1 / BUG-01**: cada linha do carrinho (`tpl-line` em `CartDialog.astro`) tem `<p data-l-max role="status" hidden>` com a mensagem de limite; `cart-dialog.ts` mostra no "+" em 10 e ao digitar 11 ou mais, e esconde ao diminuir (`toggleMax`). Removido o `test.fail` de `qa-edge.spec.ts`; novo E2E em `cart.spec.ts` (digitar 11 / diminuir).
- **A2**: `aria-describedby` de região, pagamento e sabor só referencia o erro enquanto ele está visível (helper `setDescribedBy` em `dom.ts`, usado em `checkout.ts` e `product-card.ts`). Novo E2E em `checkout.spec.ts` confere com/sem erro.
- **S1**: anúncio ao adicionar usa a quantidade efetivamente adicionada (e avisa o máximo/nada adicionado).
- **S2**: `cart-dialog.ts` usa `lineKey`. **S3**: indentação corrigida. **S4**: espaço em `Header.astro`.
- **S6**: `.htaccess` aceita `X-Forwarded-Proto: https` para HSTS; nota no README.
- **S7**: eslint proíbe também `parseFromString`, `createContextualFragment` e `srcdoc`.
- **S9**: RN1 do `02-po.md` corrigida (5 sabores do V400 do CLAUDE.md).
- S5 (opcional) e S8 não aplicados.
