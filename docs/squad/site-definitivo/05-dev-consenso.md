# 05 - Dev Full Stack - Rodada de consenso (site-definitivo)

Data: 03/10/2026. Papel: Dev Full Stack sênior (quem implementa). Branch: `docs/escopo-site-definitivo` (somente este documento; nenhum código de produção alterado, nenhum commit/push).
Entrada: `00-briefing.md`, `02-po.md`, `03-design.md`, `04-tech-lead.md` (ADR-003), código atual (`src/**`, `tests/**`, `scripts/**`, `package.json`, `astro.config.mjs`, `eslint.config.js`, `playwright.config.ts`, `.github/workflows/ci.yml`).

**Como avaliei (evidência, não opinião):**
1. `npm view` dos pacotes do plano (versões, peers, datas) em 03/10/2026.
2. Leitura do pacote publicado `@astrojs/cloudflare@14.3.3` e `15.0.0-beta.1` (tarball) para conferir provedor de cache, serviço de imagem e bindings automáticos.
3. **Mini-spike real no Windows** (fora do repositório, no scratchpad, em pasta **com espaços** no caminho): Astro 7.3.5 + `@astrojs/cloudflare` 14.3.3 + wrangler 4.147.0 + D1/KV locais. Resultado na seção 1.3.
4. Documentação oficial da Cloudflare (limites de Workers, D1, KV, Workers Cache, Images, Access) consultada hoje (fontes na seção 7).

> Compliance: mantenho integralmente o aviso do PO, o ADR-002 e a seção 5 do ADR-003. Nada aqui contorna compliance.

---

## 0. Posição geral

**CONCORDO COM RESSALVAS** com o ADR-003 (B na Cloudflare). A arquitetura é viável no plano gratuito e o núcleo mais arriscado de estoque (batch atômica, `CHECK` que desfaz tudo, asserção com `changes()`, auditoria append-only por trigger) **já funcionou no D1 local** no meu spike. As ressalvas são de detalhe de plataforma e, principalmente, de **prazo**: o R1a do TL (27 d) está subestimado; minha estimativa é **~46 d úteis (faixa 40-48, ~9 semanas)**, ou ~37 d com cortes de escopo que listo na seção 3.

As 3 maiores ressalvas:
1. **Prazo do R1a subestimado** (~27 d -> ~46 d): o admin desenhado pelo designer é maior que os 5 d do T6, e a loja precisa de uma refatoração (catálogo hoje é importado direto em 22 arquivos, inclusive 5 módulos de `src/lib` e 5 scripts do cliente) que não cabe em 3 d.
2. **KV como fonte primária da loja + "em falta" imediato tem uma condição de corrida** (KV é eventualmente consistente, até ~60 s; purga do cache + leitura de KV ainda velho na mesma PoP = HTML velho recacheado). Proponho D1 como fonte do render em cache frio e KV como cópia de contingência (seção 1.2, item 5).
3. **Ferramentas e cobranças que o ADR assume e não batem**: `@cloudflare/vitest-pool-workers` (0.22.0) exige **vitest ^4.1** e o projeto está no **vitest 5.0.3**; o adaptador liga por padrão o **binding Images** (transformações via binding são métrica cobrável do plano pago, segundo a doc de preços) e uma sessão em KV. Há substitutos sem dependência nova (seção 1.2).

---

## 1. Posição sobre o ADR-003, item a item

### 1.1 Tabela de posições

| # | Item do ADR-003 | Posição | Justificativa técnica (resumo; detalhes em 1.2) |
|---|---|---|---|
| 1 | B direto, na Cloudflare (sem "começar em A") | **CONCORDO** | Custo US$ 0 igual ao de A; R2 só existe em B; a refatoração da loja (injetar catálogo) é necessária em A **e** em B, então "A primeiro" não economiza esse trabalho. |
| 2 | Astro 7 `output: 'server'` + `@astrojs/cloudflare` | **CONCORDO COM RESSALVAS** | Fixar **14.3.3** (estável, peer `astro ^7.2.0`, `wrangler ^4.125.0`). A 15.0.0-beta.1 exige `astro ^7.4.0-beta.0` (Astro beta): descartada. Ressalva: o adaptador liga por padrão os bindings `IMAGES` e `SESSION` (KV) - configurar explicitamente. |
| 3 | Cache de rota + `cacheCloudflare()` + purga por tag | **CONCORDO COM RESSALVAS** | O provedor existe na 14.3.3 (`@astrojs/cloudflare/cache`), envia `Cloudflare-CDN-Cache-Control` + `Cache-Tag` (conferido no spike) e purga com `cache.purge({ tags })` do **Workers Cache** (GA, doc de 20/08/2026). Ressalvas: (a) **acerto de cache conta como requisição de Worker** (limite de 100 mil/dia); (b) a purga usa sempre os limites do plano Free; (c) purga não é emulada no dev local, só dá para testar em preview. |
| 4 | D1 (SQLite) | **CONCORDO COM RESSALVAS** | Comportamento validado localmente. Ressalvas de limite: **50 consultas por invocação** no Free (cada instrução de uma `batch` conta), **100 parâmetros por consulta**, **10 bancos por conta**, 500 MB por banco, teto diário rígido (5 mi linhas lidas / 100 mil escritas; passou, erro até 00:00 UTC). |
| 5 | KV como fonte de leitura da loja (`catalog:current`, `availability:current`) | **CONCORDO COM RESSALVAS** (contra-proposta) | KV é eventualmente consistente (até ~60 s fora da PoP que gravou; `cacheTtl` mínimo 30 s). Combinado com "em falta imediato" e purga de cache, gera condição de corrida. Contra-proposta na seção 1.2. Free: 100 mil leituras/dia, 1.000 gravações/dia (suficiente). |
| 6 | Drizzle ORM + drizzle-kit | **CONCORDO COM RESSALVAS** | Usar `drizzle-orm` **0.45.3** e `drizzle-kit` **0.31.11** (estáveis); **não** usar a linha 1.0.0-beta.22. Drizzle para esquema/tipos e CRUD simples; estoque, pedidos e publicação em SQL preparado explícito dentro de `db.batch()` (como o TL já propõe). Down-migrations escritas à mão (o drizzle-kit não gera). |
| 7 | R2 para fotos | **CONCORDO** | 10 GB grátis, sem egress. |
| 8 | Binding Images (`imageService: 'cloudflare-binding'`) | **DISCORDO como padrão** | A doc de preços diz que otimizar imagem pelo binding conta em "Images Transformed", métrica do plano pago; o texto não é claro para o Free. Proposta: `imageService: 'compile'` (assets do repositório otimizados no build, como hoje com sharp) e, para as fotos do R2, transformação por URL `/cdn-cgi/image/` na própria zona (5 mil transformações únicas/mês grátis; acima disso, erro 9422 sem cobrança) **ou** variantes geradas no upload. O S1 decide. |
| 9 | Cloudflare Access (PIN por e-mail, lista de e-mails) + TOTP no app | **CONCORDO COM RESSALVAS** | Free até 50 usuários; PIN de uso único expira em 10 min e a tela sempre diz "código enviado" (não revela e-mail, como o PO pede). Ressalvas: (a) a **tela de login é hospedada pela Cloudflare** (personalização limitada): o wireframe de login do designer (e-mail + **senha** + "Esqueci minha senha") **não se aplica** e precisa ser refeito; (b) filtros de e-mail que "clicam" links podem consumir o PIN (a doc avisa); (c) confirmar se o cadastro do Zero Trust Free exige meio de pagamento. |
| 10 | `jose`, `@oslojs/otp`, `@oslojs/encoding`, `uqr` | **CONCORDO** | `jose` 6.2.12, `@oslojs/otp` 1.1.0, `uqr` 0.1.3; tudo WebCrypto/JS puro, CPU desprezível. Guardar o JWKS do Access em memória do isolate (não buscar a cada requisição). |
| 11 | `@cloudflare/vitest-pool-workers` | **DISCORDO** | 0.22.0 (última, 18/08/2026) tem peer `vitest ^4.1.0`; o projeto usa vitest 5.0.3. Rebaixar o vitest quebra o resto. Substituto **validado no spike**: `getPlatformProxy()` do próprio wrangler dentro do vitest 5 (D1/KV reais do Miniflare, ~0,5 s para subir). Rotas completas ficam no E2E contra `wrangler dev`. |
| 12 | Hash de senha fora; sem senha no app | **CONCORDO** | Correto para o limite de 10 ms de CPU. |
| 13 | Limite de 10 ms de CPU por requisição | **CONCORDO COM RESSALVAS** | Render da home com cache frio é o ponto de atenção (não medível localmente). Novo risco que o ADR não cita: **upload multipart** (`request.formData()` de vários MB) pode estourar 10 ms. Proposta: upload com corpo bruto (`PUT` com `Content-Type`) transmitido direto ao R2, dimensões lidas só do cabeçalho do arquivo. |
| 14 | Cron Trigger de expiração (de hora em hora) | **CONCORDO** | Free: 5 cron por conta, 10 ms de CPU por execução; expirar pedidos é um único `UPDATE ... WHERE status='enviado' AND expires_at < ?`. |
| 15 | Migrações up/down testadas, Time Travel, export diário | **CONCORDO** | Time Travel de 7 dias no Free confirmado na doc. Teste up/down/up roda com `getPlatformProxy` + `wrangler d1 migrations apply --local`. |
| 16 | CSRF por `security.checkOrigin` | **CONCORDO** | Confirmado no spike: `POST`/`PUT` sem `Origin` igual recebem 403 "Cross-site ... forbidden". |
| 17 | Aposentar `dist-static`/Vercel após 30 dias do R1 | **CONCORDO** | Ver P8. |

### 1.2 Detalhes das ressalvas

**(2) Adaptador.** No spike, o build da 14.3.3 imprimiu "Enabling image processing with Cloudflare Images ... 'IMAGES' binding" e "Enabling sessions with Cloudflare KV ... 'SESSION' binding", e o `wrangler.json` gerado ganhou `images` e um KV `SESSION` sem id. Em produção isso exige provisionar recursos que não usamos. Config proposta:
```js
adapter: cloudflare({ imageService: 'compile' }),   // assets do repo otimizados no build (como hoje)
cache: { provider: cacheCloudflare() },
// sessões do Astro: não usar (sessão do admin é nossa, em D1); desligar/neutralizar o binding SESSION no S1
```
Versões exatas no `package.json` (sem `^`) para adaptador, wrangler e Astro durante o R1.

**(3) Cache de rota e cota de requisições.** Com Workers Cache, **cada visualização** da home custa 1 requisição de Worker (HTML) + `/api/disponibilidade`; `/_astro/*` e fontes são static assets e não contam. As fotos **contariam** se servidas por rota do Worker (`/media/...`). Para não gastar cota: fotos via domínio próprio do R2 (`media.nomadpuffs.com.br`, mesma zona) ou `/cdn-cgi/image/` -> `img-src 'self' https://media.nomadpuffs.com.br` na CSP. Ordem de grandeza: ~3 requisições de Worker por visita -> ~30 mil visitas/dia antes do teto. Folgado, mas o alerta a 70% do TL é necessário.

**(4) D1: limites que mudam o desenho.**
- Confirmar pedido = `5 + 2N` instruções na batch (N = linhas). Com o teto de **50 consultas por invocação**, N <= 22. O Zod do PO permite 30 linhas -> **reduzir para 20 linhas por pedido** (realista para a loja) ou dividir; o primeiro é o certo.
- Inserção de `order_item` em multi-linha: 6 colunas x 100 parâmetros -> no máximo 16 linhas por `INSERT`; usar um `INSERT` por linha dentro da batch (conta nas 50) ou `json_each` com um parâmetro JSON (1 parâmetro só). Prefiro `json_each`.
- Publicar: ler todas as tabelas do catálogo + gravar snapshot + auditoria cabe folgado (< 15 consultas).
- 10 bancos por conta: prod + preview + até ~6 bancos efêmeros de PR com limpeza automática (P9).

**(5) KV x "em falta imediato" (contra-proposta).** Fluxo do ADR: sócio marca em falta -> grava `availability:current` no KV -> purga a tag. Problema: a próxima requisição numa PoP distante pode ler o KV **ainda antigo** (até ~60 s) e **recachear** o HTML velho por mais `maxAge` (60 s) + `swr` (600 s). M2 (B: <= 1 min) deixa de ser garantido.
Proposta:
- Render da loja em **cache frio lê do D1** (2 leituras por chave primária: última `publication` e `availability`; ~2 linhas lidas, nada perto do teto diário) e grava o HTML no cache com a tag. Como o cache absorve quase tudo, a latência extra do D1 (primário fora do Brasil, ~150-250 ms) só aparece no cache frio.
- **KV continua** como cópia de contingência: se o D1 falhar, render a partir do KV; se o KV também falhar, `stale-if-error`/página "peça pelo WhatsApp" (degradação do TL mantida).
- `/api/disponibilidade` lê do D1 com `max-age=15` na borda.
- Alternativa se o TL preferir manter KV primário: aceitar M2 de "até ~2 min" e fazer o cliente sempre reconciliar com `/api/disponibilidade` (que leria D1). Decidir no S1 com medição.

**(8) Imagens.** O pipeline proposto pelo designer (PNG com alfa, AVIF/WebP em 360/540/720/1080) fica assim:
- Navegador: redimensiona (<= 2000 px) e **reencoda em PNG** quando há alfa (JPEG perde transparência; o encode WebP no canvas não é confiável no Safari), o que remove EXIF/GPS.
- Servidor: valida assinatura de bytes, tamanho, dimensões pelo cabeçalho; grava em R2 com chave `sha256`.
- Entrega: `/cdn-cgi/image/width=540,format=auto/...` (AVIF/WebP automático). Plano B se o S1 reprovar: gerar 4 larguras em WebP/PNG no upload (sem AVIF).

**(9) Access.** Política com lista de e-mails, sessão de 12 h; o Worker valida `Cf-Access-Jwt-Assertion` (assinatura, `aud`, `iss`, `exp`) sempre. **Preview URLs** do Worker (`*.workers.dev`) precisam da opção de proteger previews com Access ou ficam desligadas; produção com `workers_dev: false`.

**(11) Testes de integração sem o pool.** `tests/integration/*.test.ts` com `vitest.integration.config.ts` (ambiente node): `beforeAll` sobe `getPlatformProxy({ persist: false })`, aplica as migrações SQL, roda os serviços (`src/server/services/*`) recebendo `env` injetado. Os serviços devem receber `env`/`db` por parâmetro (não `import { env } from 'cloudflare:workers'` dentro do serviço) - isso também melhora a testabilidade e a portabilidade (4.9 do TL). O `import 'cloudflare:workers'` fica só em `src/server/platform/env.ts`.

### 1.3 Resultado do mini-spike (Windows 11, Node 24.15.0 portátil, caminho com espaços)

| Verificação | Resultado |
|---|---|
| `npm install` astro 7.3.5 + @astrojs/cloudflare 14.3.3 + drizzle-orm 0.45.3 + wrangler 4.147.0 | ok, 228 pacotes, ~60 s |
| `astro build` com `output: 'server'` e `cacheCloudflare()` | ok, ~76 s no primeiro build (25 s de geração de tipos); gera `dist/server/wrangler.json` e injeta `Cache-Control` imutável de `/_astro/*` em `_headers` |
| `wrangler d1 migrations apply --local` | ok |
| `wrangler dev` sobre o build | ok; `GET /` em ~8 ms local, cabeçalhos `cache-tag: catalog,astro-path:/` e `cloudflare-cdn-cache-control: public, max-age=60, stale-while-revalidate=600` |
| `astro dev` (workerd via plugin Vite) | ok, pronto em ~9 s, bindings D1/KV funcionando |
| `db.batch()` com `CHECK (qty >= 0)` violado na 2ª instrução | **batch inteira desfeita** (a 1ª instrução também voltou) |
| Asserção `INSERT INTO _assert VALUES (CASE WHEN changes()=1 THEN 1 END)` | aborta a batch quando o `UPDATE` anterior não alterou linha (`NOT NULL constraint failed`); nada gravado |
| Trigger append-only (`BEFORE UPDATE ... RAISE(ABORT)`) | bloqueia (`SQLITE_CONSTRAINT_TRIGGER`) |
| `security.checkOrigin` | `POST`/`PUT` sem `Origin` válido = 403 |
| `getPlatformProxy()` em script Node | D1 local acessível em ~0,5 s (base para testes de integração no vitest 5) |

O que **não** dá para validar localmente (fica no S1, exige a zona na Cloudflare - R0.1): CPU real por render, purga de cache por tag, Access/JWT, `/cdn-cgi/image`, D1 remoto (latência do Brasil), Time Travel.

---

## 2. Pontos de consenso

### 2.1 P1-P10 (seção 8.1 do TL)

| # | Ponto | Minha posição |
|---|---|---|
| P1 | "Em falta" imediato ou via "Publicar" | **Imediato**, de acordo com o TL e o designer (5.3 e pendência TL-5): é ação operacional, separada do rascunho. Toast com "Desfazer" de 8-10 s + auditoria. Implementação: grava `flavor.manual_out_of_stock` + recalcula disponibilidade no D1 numa batch, depois espelha no KV e purga as tags `catalog`/`availability`. Com a contra-proposta 1.2-(5), M2 <= 1 min fica garantido. O PO precisa aceitar que "em falta" não aparece na tela "O que vai mudar" (vai para o Histórico). |
| P2 | Dois passos (PIN do Access + TOTP) no celular | **Aceitável**, com ajuste: o TOTP é pedido **uma vez por sessão do Access (12 h)**; depois de 30 min de inatividade, pede só o TOTP de novo (o Access continua válido). Assim o sócio digita o PIN do e-mail no máximo 1 vez por dia. O designer precisa trocar o wireframe de login (sem senha nem "Esqueci minha senha"; "Perdi o acesso ao app" = código de recuperação ou outro sócio redefine). |
| P3 | Código de 4 ou 5 caracteres | **5** (`NMD-7K3FQ`). Custo zero de implementação a mais. |
| P4 | Limites de texto e paleta | De acordo. Fonte única `src/schemas/limits.ts` com os números do 03-design (3.7, 6.1, 6.2), usada pelo Zod do admin, pelo esquema do snapshot e pelos contadores "42/80" no formulário. Paleta: `FLAVOR_TOKENS` + nomes em PT num só módulo; teste unitário que lê `tokens.css` e trava a igualdade com `--flavor-*` (mesmo estilo do teste que já trava as datas da promo). |
| P5 | Conflito "Recarregar / Sobrescrever" | De acordo. `version` em toda entidade editável; "Sobrescrever" reenvia com a versão atual lida no conflito e grava auditoria `overwrite`. Rascunho local (sessionStorage) preserva o que foi digitado. |
| P6 | Quem adiciona e-mail no Access | **Manual pelo TL no R1** (de acordo). Rejeito a alternativa "Access para todos + lista só no D1": qualquer e-mail passaria pelo Access e **consumiria assento** (teto de 50 no Free), e o filtro de borda deixaria de existir. Automatizar via API com token de escopo mínimo só no R2 se houver rotatividade. Consequência: a tela "Pessoas" do R1 cadastra no D1 e mostra "Peça à equipe técnica para liberar o e-mail" até a automação. |
| P7 | Operação lança entrada de mercadoria | De acordo: não no R2. Trivial de liberar depois (é uma linha na matriz de papéis + teste). |
| P8 | Contingência estática permanente | De acordo em aposentar após 30 dias. Se o dono pedir, `export:contingencia` a partir do último snapshot custa ~1,5 d (reaproveita os componentes). |
| P9 | Preview compartilhado para QA | Suficiente no R1. Bancos efêmeros por PR são possíveis (10 bancos/conta) com limpeza no fechamento da PR; só vale a pena quando a PR tiver migração (R2). |
| P10 | Adaptador 14 estável x 15 beta | **Decido agora: 14.3.3**, fixado. A 15 beta exige Astro 7.4 beta e um `@cloudflare/vite-plugin` com hash de commit; nada do que precisamos (cache provider, compile de imagens, bindings) é exclusivo da 15. Reavaliar quando a 15 sair estável. |

### 2.2 Perguntas do designer ao Tech Lead (03-design, seção 9)

| # | Pergunta | Posição do dev |
|---|---|---|
| TL-1 | O que muda com A x B | Com B: login = PIN do Access + TOTP (tela do Access é da Cloudflare; as nossas são TOTP, recuperação e "sem acesso"); "Publicado às HH:MM. Pode levar até **1 minuto**" (N=1, com a contra-proposta 1.2-5); Estoque com saldo e Pedidos existem no R2; recheque do carrinho (RE8) via `/api/disponibilidade` ao abrir o carrinho e no clique "Enviar". |
| TL-2 | Guia visual + regressão por screenshot | **Viável.** `/admin/estilo` no host do painel (atrás do Access), renderizando os componentes reais com fixtures. Regressão visual com `toHaveScreenshot` do Playwright (já instalado; sem dependência nova) na loja e no Guia. Atenção: baselines só no Linux do CI (fonte renderiza diferente no Windows); local roda em modo "somente atualizar no CI". |
| TL-3 | Lint de cor literal, `style` inline, sync de tokens, `--z-*` | Sem dependência nova: teste unitário que varre `src/**/*.{css,astro}` e falha com hex/rgb fora de `tokens.css`, `style=` e `outline: none` sem substituto (stylelint seria dependência nova - só se o TL aprovar). Sync `FLAVOR_TOKENS` x `--flavor-*` por teste (P4). Renomear `--z-*` sem mudar valor: trivial, coberto pela regressão visual. |
| TL-4 | Prévia pode pular o gate 18+ | **Sim, se a prévia for servida no host do painel** (`painel.nomadpuffs.com.br/previa`, atrás do Access + sessão TOTP). Recomendo isso em vez do `/previa?token=` no host da loja: some o token, a prévia nunca é compartilhável nem indexável, e o gate pode ser pulado com segurança. A loja pública continua sem nenhum caminho que pule o gate (teste E2E). |
| TL-5 | Estoque na hora x barra de publicação | Na hora (P1). |
| TL-6 | Pipeline de imagem | Ver 1.2-(8): PNG com alfa aceito, EXIF removido no reencode do navegador e rejeitado no servidor se presente; AVIF/WebP por `/cdn-cgi/image` com `format=auto` nas larguras 360/540/720/1080. Peso alvo (<= 60 KB em 540 px) verificado no S1 com as artes reais. |
| TL-7 | Limites no esquema | Sim (P4); validados no admin, na publicação e no render (texto acima do limite nunca chega ao layout). |
| TL-8 | CSP própria do admin, fontes self-host | Sim: `CSP_STORE` e `CSP_ADMIN` em `src/data/csp.ts`, aplicadas pelo middleware por hostname; mesmas fontes de `@fontsource`. A CSP da loja não muda (ganha só o host de mídia, se usarmos o domínio do R2). |

### 2.3 Perguntas do designer ao PO (opinião do dev, para o PO decidir)

| # | Pergunta | Opinião do dev |
|---|---|---|
| PO-1 | H10 x transição de fotos (D9): palco tipográfico temporário? | **Permitir** por configuração (`ALLOW_MODEL_WITHOUT_PHOTO=on` até as artes chegarem). Sem isso, D9 bloqueia o go-live inteiro do R1 e o "em falta" (maior valor) atrasa. Custo: ~0,5 d (palco tipográfico em CSS). |
| PO-2 | Guardas de termos sensíveis: aviso ou bloqueio | Aviso (bloqueio gera falso positivo e o sócio fica preso). Custo igual para os dois. |
| PO-3 | Banner com 2 campanhas: mais recente | Sem objeção técnica. |
| PO-4 | CartFab contando só linhas disponíveis | Sem objeção; trivial (`resolveCart` já separa linhas). |

### 2.4 Pontos novos que levanto para consenso

| # | Ponto | Proposta |
|---|---|---|
| N1 | Teto de linhas por pedido | 20 linhas (limite de 50 consultas por invocação no D1 Free). PO confirma. |
| N2 | Fonte do render da loja | D1 em cache frio + KV de contingência (1.2-5). TL decide no S1. |
| N3 | Upload sem multipart | `PUT` com corpo bruto (CPU). Não muda a tela. |
| N4 | Repositório dentro do OneDrive | Mover para fora do OneDrive ou persistir o estado local do wrangler fora dele (seção 5). Decisão do dono/coordenador. |
| N5 | Pedido no servidor x relógio | No R2, o servidor passa a ser autoridade da data da campanha (o cliente mostra, o servidor recalcula). `computeTotals(…, nowMs)` já aceita o "agora" injetado; no servidor ele vem do relógio do Worker. |

---

## 3. Estimativas revisadas (1 dev, dias úteis, sem esperas do dono)

Legenda de confiança: **A** alta (±15%), **M** média (±30%), **B** baixa (±50%).

### 3.1 R1-zero (ponte: "Em falta" na loja estática dirigido por `catalog.ts`)
| Tarefa | Est. |
|---|---|
| Campo `outOfStock` em sabor + `src/lib/availability.ts` puro + testes (RE1, RE2, RE3) | 0,5 |
| Estados C31 StockTag, C7/C8 sabor em falta (radio `disabled`, texto dentro do label, ordem), C10 modelo em falta (botão desabilitado com motivo), C11 chip, C26 price list - CSS só com tokens | 1,0 |
| Carrinho: C15 linha em falta "Fora do total", C33 alerta, envio bloqueado, "Remover itens em falta" (RE8), `loadCart` preserva a linha marcada | 0,75 |
| E2E + axe (sabor, modelo, carrinho salvo, teclado/leitor de tela) nos dois alvos atuais | 0,5 |
| **Total** | **2,75 d (TL: 1,5 d)** - confiança **A** |

### 3.2 R1a - fundação + admin de catálogo + "Em falta"
| # | Tarefa | TL | Dev | Conf. | Por quê |
|---|---|---|---|---|---|
| S1 | Spike real na Cloudflare (CPU, purga, Access, imagens, latência D1 do Brasil, `workers_dev` off) | 2 | 2,5 | M | depende da zona já na Cloudflare (R0.1) |
| S2 | Spike D1 | 1 | **0,5** | A | batch/`CHECK`/`changes()`/trigger já validados localmente; falta só repetir no remoto |
| V0 | **Novo:** baseline de regressão visual da v0.2.0 (home, outubro, carrinho, gate; mobile e desktop) antes de mexer | - | 1 | A | exigência do dono (estética) |
| T1 | `wrangler.jsonc` 3 ambientes, CI (preview/deploy), Access preview/prod, `wrangler types` no typecheck | 2 | 2,5 | M | |
| T2 | Esquema Drizzle + 0001 + down + seed a partir de `src/data` + teste up/down/up | 2 | 2,5 | A | |
| T3 | Auth: JWT do Access, papel, TOTP (cadastro QR, recuperação), sessão 30 min/12 h, bloqueio, auditoria, identidade de dev travada no build | 3 | **4,5** | M | muitos estados e todos com teste |
| T4 | Snapshot Zod + publicar/prévia/desfazer + espelho KV + purga + **diff "O que vai mudar" em linguagem humana** | 3 | **4,5** | M | o diff legível (5.3 do design) não estava no T4 |
| T5 | Loja lendo snapshot + **refatoração de injeção de catálogo** + disponibilidade + RE8 + degradação | 3 | **5** | M | ver seção 4.1: 22 arquivos importam `src/data/*`, inclusive `src/lib` e o cliente |
| T6 | Admin UI mobile-first: Início, Estoque (interruptor + desfazer), Catálogo, Modelo, Sabor (paleta, subir/descer), barra de não publicadas, revisão, conflito, toasts, sem-conexão, aviso de sessão 2 min antes, rascunho local, telas TOTP/recuperação | 5 | **9** | B | o 03-design especifica ~15 telas e ~10 padrões transversais |
| T6b | **Novo:** Histórico (auditoria + voltar versão) e Pessoas (contas, papel, redefinir TOTP) | - | 2 | M | estavam nas telas do R1 do designer, fora do plano |
| T6c | **Novo:** Guia visual `/admin/estilo` | - | 1 | A | |
| T7 | Upload (`PUT` bruto -> R2), checklist, alt obrigatório, palco C35 + palco tipográfico de transição | 2 | 3 | M | inclui o palco novo do card |
| T8 | CSP/headers por host, Trusted Types, teste de bypass, OWASP | 1 | 1,5 | A | |
| T9 | Integração (getPlatformProxy) + E2E admin/permissões + a11y admin + Lighthouse + regressão visual | 3 | **4,5** | M | |
| - | Correções pós-QA (reserva) | - | 2 | - | o TL não reservou |
| | **Total de dev** | **27** | **46 (faixa 40-48)** | **M-B** | ~9 semanas |

**Cortes possíveis para ~37 d (se o dono quiser o R1a antes):** Pessoas manual via comando (o TL cadastra; -1,5 d), diff "O que vai mudar" como lista simples de campos alterados (-1,5 d), Guia visual só para dev, fora do admin (-0,5 d), aviso de sessão 2 min antes e banner sem-conexão para o R1b (-1,5 d), palco tipográfico em vez de upload se as artes D9 não chegarem (adia T7, -2 d), sem reserva separada (-2 d, risco). Gate, auditoria, TOTP, testes de permissão e a11y **não** entram em corte.

### 3.3 R1b (Should H12-H15)
Regiões/taxas com "a combinar", desativar com aviso no carrinho salvo 2,5 d; modelo novo completo 1 d; textos curtos + Markdown restrito + WhatsApp com confirmação dupla 2 d; testes 1,5 d. **Total 7 d (TL: 5,5)** - confiança **M-A**.

### 3.4 R2 (estoque + pedidos)
| # | Tarefa | TL | Dev |
|---|---|---|---|
| T10 | Migração 0002 + triggers + tabela de transições + down | 1,5 | 1,5 |
| T11 | Estoque: carga inicial, entrada/ajuste com motivo, histórico, estoque baixo, disponibilidade automática | 3 | 3,5 |
| T12 | `POST /api/pedidos` (totais recalculados com o mesmo `src/lib`, idempotência, código, rate limit, `json_each`, 409 `catalog_changed`/`unavailable`) + integração no `checkout.ts` atual + fallback sem código | 3 | **4** |
| T13 | Painel de pedidos, transições com baixa/devolução atômica, pagamento recebido, perfil `operacao` | 4 | **5** |
| T14 | Cron de expiração, resumo H24, CSV | 1,5 | 2 |
| T15 | Integração (tabela de efeitos, disputa da última unidade), E2E, k6, ensaio de backup/restauração | 3 | 3,5 |
| | **Total** | **16** | **19,5 (~4 semanas) + piloto** - confiança **M** |

### 3.5 R3 (campanhas)
Migração 1 d; generalizar `promo.ts` para `Campaign` + `/outubro` como campanha seed 2,5 d; admin de campanhas (períodos em Palmas, regiões obrigatórias, sobreposição, slug reservado) 4 d; `[campanha].astro` com blocos + banner + `age-init.js` lendo `data-promo-*` 3 d; textos institucionais 1,5 d; agendamento H33 2 d; guardas de termos 0,5 d; testes 2,5 d. **Total 17 d (TL: 15,5)** - confiança **M**.

### 3.6 Resumo: onde o TL errou a mão
- **Subestimou:** R1-zero (+1,25 d), T3 auth (+1,5), T4 publicação (+1,5: o diff legível), **T5 loja (+2: a refatoração de injeção)**, **T6 admin (+4 e mais 3 d de telas não listadas)**, T9 testes (+1,5), e não reservou correções pós-QA nem baseline visual.
- **Superestimou:** S2 (o essencial já está validado: 1 -> 0,5 d).
- **Calibrado:** T1, T2, T8, R1b, R3 (pequenas diferenças).
- Total até o fim do R1 (R1-zero + R1a + R1b): **TL ~34 d (~7 semanas) -> dev ~56 d (~11 semanas)**, ou ~47 d com os cortes da 3.2.

---

## 4. Plano de migração do código atual

### 4.1 Diagnóstico
- `src/data/catalog.ts` e `src/data/promos.ts` são importados por **22 arquivos** (4 só por tipo): 12 componentes/páginas/layout (build, fácil), **5 módulos de `src/lib`** (`cart`, `order`, `storage`, `whatsapp`, `promo`) e **5 scripts de cliente** (`product-card`, `cart-dialog`, `checkout`, `promo-state`, `promo-countdown`). Ou seja, o catálogo está **embutido no bundle JS do cliente** e a lógica pura busca dados por import, não por parâmetro. Essa é a principal refatoração do R1 e a razão do T5 maior.
- `src/data/product-images.ts` importa PNGs com preço queimado (sai em produção pelo D9).
- `BaseLayout.astro` calcula a fase da promo com `Date.now()` no build; em SSR passa a ser por requisição (melhor), cacheado por 60 s; `age-init.js` continua corrigindo no cliente.

### 4.2 O que se reaproveita e como

| Parte | Destino | Mudança |
|---|---|---|
| `src/lib/money.ts`, `age-gate.ts` | reaproveitado sem mudança | - |
| `src/lib/cart.ts`, `order.ts`, `storage.ts`, `whatsapp.ts` | reaproveitados | **injeção de dados**: recebem um `CatalogView` (`findModel`, `findFlavor`, `findRegion`, `findArrangeArea`, `findPayment`, `store`, `promos`) em vez de importar `src/data`. Parâmetro **obrigatório** (padrão importando a fixture levaria o catálogo de volta ao bundle). Os mesmos módulos rodam no servidor (R2: recalcular totais em `POST /api/pedidos`) - a paridade cliente/servidor sai de graça. |
| `src/lib/promo.ts` | reaproveitado; no R3 `DeliveryPromo` -> `Campaign` (estrutural) | testes atuais viram fixtures |
| `src/lib/availability.ts` | **novo** no R1-zero, o mesmo no R1 | lê `outOfStock` da fixture no R1-zero e do snapshot no R1 |
| `src/data/catalog.ts`, `promos.ts` | viram **fixture de testes + origem do seed** | cabeçalho atualizado; lint impede import em `src/scripts/**` e `src/server/**` de produção |
| `src/data/csp.ts` | `CSP_STORE`, `CSP_ADMIN` | `deploy-config.test.ts` adaptado |
| `src/scripts/**` (cliente) | reaproveitado | `main.ts` lê o catálogo de `<script type="application/json" id="nomad-catalog">` (não executável; compatível com `script-src 'self'` e Trusted Types), constrói o `CatalogView` e injeta; `product-card`, `cart-dialog`, `checkout` trocam o import por esse objeto. `store.ts`, `dom.ts`, `live-region.ts`, `age-gate.ts`, `model-nav.ts`, `clock.ts` sem mudança. |
| Componentes `.astro` | todos reaproveitados | recebem dados por props do snapshot; ganham estados `data-stock="out"` (designer 7.5). `ProductCard` troca `<Picture>` de PNG local por `<img srcset>` da mídia + palco C35. `AgeGate`, `LegalStrip`, `NoScriptNotice`, `Header`, `Footer`, `Logo`, `Watermark`, `CartFab`, `PriceTag`, `QuantityStepper`, `LiveRegion` praticamente intactos. |
| `src/styles/*` | intactos | `stock.css` e `admin.css` novos, só com tokens; tokens novos do 2.9 em `tokens.css` |
| `src/pages/index.astro`, `outubro.astro`, `404.astro` | SSR com cache | `outubro.astro` fica como está até o R3 (lendo do snapshot) |
| `tests/unit/*` (10) | reaproveitados | passam a fixture como `CatalogView`; ajuste mecânico |
| `tests/e2e/*` (13) | reaproveitados | `webServer` do Playwright passa a ser `wrangler dev` sobre o build com D1 local semeado; projetos `static-*` saem após a aposentadoria; `deploy.spec`/`qa-build.spec` passam a validar headers vindos do middleware |
| `scripts/build.mjs` | R0: ganha `--target=pages`; R1: build do Worker | `package-static.mjs`, `serve-static.mjs`, `deploy/static` aposentados 30 dias após o R1 |
| `eslint.config.js` | estendido | `no-restricted-imports` para `src/server/**`, `cloudflare:workers` só em `src/server/platform/`, `src/data/catalog` proibido fora de testes/seed/R1-zero |

Sequência para não quebrar a loja em produção: (1) R1-zero no estático; (2) refatoração de injeção **ainda no build estático** (a fixture alimenta o JSON embutido; E2E e regressão visual têm de passar sem diferença); (3) só então troca para `output: 'server'` com o snapshot. Cada passo é uma PR pequena e reversível.

### 4.3 Riscos de regressão visual (estética exigida pelo dono)

| # | Risco | Prob. | Mitigação |
|---|---|---|---|
| RV1 | **Troca da imagem do card** (PNG 9:16 com preço -> palco 1:1/4:5 com foto sem texto). É mudança **intencional**, a maior visível. | certa | Aprovação do dono com screenshots antes/depois (Guia visual); palco tipográfico na transição |
| RV2 | Serviço de imagem do adaptador (binding Images por padrão) muda URLs/qualidade dos assets do repo | média | `imageService: 'compile'` (sharp no build, como hoje); comparação de screenshots |
| RV3 | CSS: ordem/empacotamento muda com SSR (`inlineStylesheets: 'never'` e `compressHTML` mantidos) | baixa | baseline V0 + `toHaveScreenshot` por PR |
| RV4 | Scripts injetados pela zona (Rocket Loader, Email Obfuscation, Web Analytics, desafio de bots) quebram CSP/visual | média | desligar na zona; E2E falha em `securitypolicyviolation` (já existe) |
| RV5 | Fontes: `preload` via `?url` e `font-display` em SSR | baixa | screenshot + checagem de requisições de fonte no E2E |
| RV6 | Estados novos (em falta, alertas) com contraste/tamanho fora do design | média | só tokens; axe; Guia visual com todos os estados |
| RV7 | Texto editável maior que o desenhado quebra o layout em 360 px | média | limites do 03-design no Zod (P4) + E2E com textos no limite máximo |
| RV8 | Baseline gerada no Windows diverge do Linux do CI | alta | baselines só no CI (Linux); localmente só comparação informativa |

---

## 5. Ambiente de desenvolvimento local (Windows + Node portátil)

**Validado hoje** (seção 1.3): Node 24.15.0 / npm 11.12.1 portátil, wrangler 4.147.0 (exige Node >= 22), workerd roda no Windows x64, caminho com espaços funciona em `astro build`, `astro dev`, `wrangler dev` e `wrangler d1 ... --local`.

Fluxo proposto:
```
export PATH="$HOME/.local/node:$PATH"
npm ci
npm run db:migrate:local     # wrangler d1 migrations apply nomad --local
npm run db:seed:local        # tsx/node scripts/seed -> wrangler d1 execute --local --file seeds/0001...
npm run dev                  # astro dev (workerd + D1/KV/R2 locais via plugin Vite); DEV_AUTH_EMAIL no .dev.vars
npm run preview:worker       # astro build && wrangler dev (o que o E2E usa)
npm run cf:types             # wrangler types -> worker-configuration.d.ts (entra antes do astro check)
```
`.dev.vars` (no `.gitignore`, junto com `.wrangler/`) com `ENVIRONMENT=development`, `DEV_AUTH_EMAIL`, `TOTP_ENC_KEY` de teste. Nenhuma conta Cloudflare é necessária para desenvolver localmente; `wrangler login` só para quem faz deploy manual (o CI usa token).

**Bloqueios e riscos:**

| # | Item | Gravidade | Ação |
|---|---|---|---|
| E1 | **Repositório dentro do OneDrive.** O estado local do wrangler (`.wrangler/state`) são arquivos SQLite gravados o tempo todo; o OneDrive pode travar arquivos, gerar cópias de conflito e corromper o banco local; também sincroniza `node_modules` e `dist-*`. | **alta** (não bloqueia, mas vai causar falhas intermitentes) | Preferido: mover o repo para fora do OneDrive (ex.: `C:\dev\nomad`). Mínimo: `--persist-to` apontando para `%LOCALAPPDATA%\nomad-wrangler` nos scripts `dev`/`preview:worker`/migrações locais. Decisão do dono/coordenador. |
| E2 | `@cloudflare/vitest-pool-workers` incompatível com vitest 5 | média | `getPlatformProxy()` (validado); config `vitest.integration.config.ts` separada; `npm run test:integration` |
| E3 | Playwright precisa subir `wrangler dev` (~5-10 s) em vez do servidor estático | baixa | `webServer` com `reuseExistingServer` fora do CI |
| E4 | Primeiro build mais lento (~76 s no spike, metade é geração de tipos) | baixa | cache do CI; aceitável |
| E5 | `astro check` precisa dos tipos dos bindings | baixa | `wrangler types` versionado ou gerado antes do `typecheck` |
| E6 | Purga de cache, Access, `/cdn-cgi/image` e CPU real não existem localmente | média | testados só no ambiente de preview (S1 e smoke); identidade de dev só com `ENVIRONMENT=development|test` e build de produção falhando se `DEV_AUTH_EMAIL` existir |
| E7 | Portas: `astro dev` 4321 x `wrangler dev` 8787 x E2E 4321/4322 atuais | baixa | padronizar nos scripts |

**Pré-requisito externo para começar o R1a de verdade:** R0.1 (zona do domínio na Cloudflare) e a conta da empresa com 2FA (D-CF). Sem isso, S1 não roda e as estimativas do R1a continuam com confiança baixa. O R1-zero, a baseline visual (V0) e a refatoração de injeção (4.2, passo 2) **podem começar já**, sem nenhuma dependência.

---

## 6. Resumo para o coordenador

- Posição: **CONCORDO COM RESSALVAS** com o ADR-003. Viável no plano gratuito; o núcleo de estoque já foi validado no D1 local.
- Versões a fixar: Astro 7.3.5, `@astrojs/cloudflare` **14.3.3** (P10 decidido), wrangler 4.147.x, drizzle-orm 0.45.3 / drizzle-kit 0.31.11, jose 6.2.12, @oslojs/otp 1.1.0, uqr 0.1.3. **Fora:** `@cloudflare/vitest-pool-workers` (incompatível com vitest 5) e o binding Images como padrão.
- Ressalvas de desenho: D1 como fonte do render em cache frio (KV só de contingência), no máximo 20 linhas por pedido, upload sem multipart, prévia no host do painel, tela de login do designer refeita para Access + TOTP.
- Prazos (1 dev): R1-zero 2,75 d; R1a ~46 d, faixa 40-48 (~37 d com cortes); R1b 7 d; R2 19,5 d + piloto; R3 17 d.
- Pode começar já: R1-zero, baseline visual, refatoração de injeção do catálogo. Bloqueia o R1a: zona na Cloudflare (R0.1/D-CF), D1 (e-mails), D14.

## 7. Fontes (consultadas em 03/10/2026)
- npm: `@astrojs/cloudflare` (14.3.3 e 15.0.0-beta.1, peers e tarball), `astro` 7.3.5 (7.4.0-beta.1), `wrangler` 4.147.0, `@cloudflare/vitest-pool-workers` 0.22.0 (peer vitest ^4.1.0), `drizzle-orm` 0.45.3 (beta 1.0.0-beta.22), `drizzle-kit` 0.31.11, `jose` 6.2.12, `@oslojs/otp` 1.1.0, `uqr` 0.1.3.
- Workers - limites: https://developers.cloudflare.com/workers/platform/limits/
- Workers Cache (cobrança de acertos, `cache.purge`): https://developers.cloudflare.com/workers/cache/ ; https://developers.cloudflare.com/workers/cache/purge/ ; https://blog.cloudflare.com/workers-cache/
- D1 - limites e preços: https://developers.cloudflare.com/d1/platform/limits/ ; https://developers.cloudflare.com/d1/platform/pricing/
- KV - limites: https://developers.cloudflare.com/kv/platform/limits/
- Images - preços: https://developers.cloudflare.com/images/pricing/
- Access - PIN de uso único: https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/ ; Zero Trust Free (50 usuários): https://zerometric.net/research/cloudflare-zero-trust-free-plan-limits-2026/
