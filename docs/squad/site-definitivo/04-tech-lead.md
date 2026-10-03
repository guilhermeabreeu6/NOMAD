# 04 - Tech Lead - site-definitivo (NOMAD puffs) - PLANO (ADR-003)

Data: 03/10/2026. Branch: `docs/escopo-site-definitivo` (somente documentação; nenhum código de produção alterado).
Entrada: `00-briefing.md`, `02-po.md` (escopo e releases R0-R4: **fonte**), `CLAUDE.md`, `README.md`, ADR-001 (`docs/squad/site-mvp/04-tech-lead.md`), plano da promo (`docs/squad/promo-frete-outubro/04-tech-lead.md`), ADR-002 (`docs/squad/pagamento-cartao/04-tech-lead.md`), `package.json`, `astro.config.mjs`, `vercel.json`, `scripts/*`, `src/**`, `tests/**`, `.github/workflows/ci.yml`. Pesquisa pública de preços/limites em 03/10/2026 (fontes na seção 11).
**Restrição nova do dono (via coordenador, 03/10):** não quer pagar Vercel Pro; o plano Hobby da Vercel proíbe uso comercial. A Fase 0 (R0) deve sair no **Cloudflare Pages** com o build estático (`dist-static` + arquivo `_headers`). Esta restrição muda a conclusão de custo do briefing e está incorporada em todo o documento.

> **Compliance (registro obrigatório).** Mantidos integralmente o aviso do PO e o ADR-002: RDC Anvisa 855/2024 proíbe comercializar e anunciar DEFs; pagamento online só liga com parecer jurídico escrito + aceite formal de gateway com o produto declarado. Nada neste plano contorna compliance (MCC/CNAE/descrição falsa, conta de terceiros). **Observação honesta adicional:** os termos de **qualquer** provedor de hospedagem (Cloudflare, Vercel, Netlify, Supabase) também vedam uso para atividade ilícita; o risco de encerramento de conta existe em todos e não é resolvido por escolha técnica. A mitigação técnica é **portabilidade** (backups exportáveis, infraestrutura descrita em código, adaptador trocável) - seção 4.9. O tema vai para o parecer jurídico (D16).

---

## 0. Decisão em uma frase

**Arquitetura B, direto, na Cloudflare (plano gratuito): Astro 7 com adaptador Cloudflare (Workers + static assets) + D1 (SQLite) com Drizzle + KV para o catálogo publicado + R2/Images para fotos + Cloudflare Access (lista de e-mails, código por e-mail) com TOTP obrigatório no app.** Custo mensal mínimo viável **US$ 0** (com gatilhos objetivos para o Workers Paid de **US$ 5/mês**), entrega R1 a R3 do PO e é a base do R4 (condicionado). A opção A deixa de ter vantagem de custo (B também custa zero) e não evolui para R2/R4 sem jogar trabalho fora; por isso não recomendo "começar em A e migrar". Caminho incremental dentro de B: **R1a** (admin de catálogo + "em falta" + publicar/desfazer) em ~5-6 semanas, **R1b** (regiões/textos/modelo novo) +1 semana, **R2** (estoque + pedidos) ~3-4 semanas, **R3** (campanhas) ~2-3 semanas.

---

## 1. Stack detectada e ADR principal

### 1.1 Stack atual (reconhecimento)

| Item | Hoje (v0.2.0) |
|---|---|
| Linguagem / framework | TypeScript (`astro/tsconfigs/strictest`) + Astro `^7.3.5`, `output: 'static'`, sem adapter |
| UI | componentes `.astro` + TS vanilla no cliente (`src/scripts/**`), CSS com tokens (`src/styles/tokens.css`); sem framework de UI |
| Dados | `src/data/catalog.ts` (modelos, sabores, regiões, áreas a combinar, pagamentos), `src/data/promos.ts` (promo de outubro), imagens com preço queimado em `assets/produtos/*.png` |
| Lógica pura | `src/lib/{money,cart,order,promo,whatsapp,storage,age-gate}.ts` (sem DOM, relógio injetado; `Date.now()` só em `src/scripts/clock.ts`, travado por lint) |
| Testes | Vitest 5 (10 arquivos em `tests/unit`), Playwright 1.63 + axe (13 specs em `tests/e2e`, projetos vercel + estático em `/loja/`) |
| Build | `scripts/build.mjs --target=vercel|static` -> `dist-vercel/` e `dist-static/` (+ `.htaccess`), `package-static.mjs` gera zip |
| Deploy | Vercel `nomad-v1` (Hobby, `vercel.json` com CSP estrita e `X-Robots-Tag: noindex`) + pacote estático genérico |
| CI | GitHub Actions: lint, typecheck (`astro check`), unit, build, E2E, empacotamento |
| Node | v24 portátil (`export PATH="$HOME/.local/node:$PATH"`), npm 11, `engines >=22.12 <25` |

Comandos oficiais (inalterados até o R1 começar): `npm ci`, `npm run dev`, `npm run build`, `npm test`, `npm run test:e2e`, `npm run lint`, `npm run typecheck`, `npm run check`.

### 1.2 Contexto do ADR-003

O dono quer admin com "total liberdade", "em falta no estoque", e pagamento com cartão (bloqueado por ADR-002). O PO fatiou em R0 (estático no domínio), R1 (admin de catálogo + em falta), R2 (estoque com contagem + pedidos, **só B**), R3 (campanhas/textos), R4 (pagamento, condicionado, só B). A restrição nova elimina a Vercel como destino comercial gratuito.

### 1.3 Opções avaliadas

| Id | Descrição | Hospedagem |
|---|---|---|
| **A1** | Estático + CMS Git (Keystatic / Sveltia-Decap) | Cloudflare Pages (grátis, uso comercial permitido) |
| **A2** | Estático + CMS Git | Netlify Free (300 créditos/mês, deploy = 15 créditos) |
| **B-CF** | Astro server (adaptador Cloudflare) + D1 + KV + R2 + Access | Cloudflare Workers Free (upgrade Paid US$ 5) |
| **B-CF+PG** | Igual a B-CF, mas banco Postgres externo (Neon free ou Supabase) | Cloudflare Workers + Neon/Supabase |
| **B-V** | Astro server (adaptador Vercel) + Supabase (Postgres/Auth/Storage) - opção do briefing | Vercel Pro (US$ 20) + Supabase Pro (US$ 25) |
| B-N | Astro server (adaptador Netlify) + Supabase/Neon | Netlify Free/Pro |

### 1.4 Comparação por critérios explícitos

Notas 1 (ruim) a 5 (ótimo). Custos em US$ por mês; conversão aproximada US$ 1 = R$ 5,50 (confirmar no dia).

| Critério (peso) | A1 CF Pages + CMS Git | A2 Netlify + CMS Git | **B-CF (recomendado)** | B-CF+PG (Neon) | B-V Vercel Pro + Supabase Pro |
|---|---|---|---|---|---|
| **Releases do PO atendidas** (x3) | R1 (em falta manual) + R3; **R2 e R4 impossíveis** sem migrar -> 2 | idem -> 2 | **R1, R2, R3 e base do R4** -> 5 | R1-R4 -> 5 | R1-R4 -> 5 |
| **Custo mensal mínimo viável** (x3) | US$ 0 -> 5 | US$ 0, mas 300 créditos e **deploy = 15 créditos**: ~20 publicações/mês antes de o site **pausar** -> 2 | **US$ 0** (Workers 100 mil req/dia, D1 5 GB, KV, R2 10 GB, Access até 50 usuários); gatilho p/ US$ 5 -> 5 | US$ 0 (Neon free, sem SLA, escala a zero = latência fria) -> 4 | **US$ 45** (~R$ 250); Supabase Free pausa após 7 dias sem uso e não tem backup -> 1 |
| **Prazo até R1** (x2) | ~1,5-2 semanas -> 5 | ~2 semanas -> 4 | ~6-7 semanas (R1a 5-6 + R1b 1) -> 3 | ~7 semanas -> 3 | ~6-7 semanas -> 3 |
| **Prazo até R2** (x2) | inexistente (migração para B = refazer admin) -> 1 | -> 1 | +3 semanas -> 4 | +3 semanas -> 4 | +3 semanas -> 4 |
| **Risco técnico** (x2) | baixo -> 5 | médio (pausa por créditos) -> 3 | médio: limite de 10 ms de CPU por requisição no Free (hash de senha estoura - por isso **não** usamos senha, ver 2.6), adaptador Astro 7 em evolução, D1 sem transação interativa -> 3 | médio-alto (2 fornecedores, Hyperdrive, latência entre regiões) -> 2 | baixo (stack mais conhecida) -> 4 |
| **Segurança** (x3) | depende de conta GitHub dos sócios (OAuth do CMS); auditoria = histórico Git; sem perfil "operação" -> 3 | idem -> 3 | Access (borda, lista fechada, bloqueio por tentativas no provedor) + TOTP no app + perfis + auditoria imutável por trigger + WAF/DDoS da Cloudflare -> 5 | igual + RLS Postgres -> 5 | Supabase Auth MFA + RLS -> 4 |
| **Lock-in** (x1) | baixo -> 5 | baixo -> 5 | médio: D1/KV/Access são Cloudflare; mitigado (SQLite padrão, Drizzle, adaptador trocável, export diário) -> 3 | médio-baixo (Postgres portátil) -> 4 | médio (Supabase Auth/Storage) -> 3 |
| **Operação por sócio pouco técnico** (x3) | ruim: login GitHub, conceitos de "publicar" que disparam build de 1-3 min, sem estoque -> 2 | idem -> 2 | telas próprias em pt-BR, mobile-first, código por e-mail + app autenticador, "Publicado às HH:MM" em < 1 min -> 5 | -> 5 | -> 5 |
| **Base para pagamento futuro** (x1) | nenhuma -> 1 | nenhuma -> 1 | servidor + banco + webhooks + cron prontos -> 5 | -> 5 | -> 5 |
| **Fase 0 já no mesmo provedor** (x1) | sim -> 5 | não -> 2 | **sim** (Pages/Workers, mesma zona DNS) -> 5 | sim -> 5 | não (Vercel comercial exige Pro) -> 1 |
| **Total ponderado** (máx. 105) | 64 | 50 | **92** | 86 | 75 |

### 1.5 Decisão e caminho incremental

**Decisão: B-CF direto.**

Por que não "começar em A e migrar":
1. O argumento que favorecia A era custo zero. Com Cloudflare, B também custa zero; sobra para A só o prazo menor do R1.
2. O que A produziria (schema do CMS, conteúdo em arquivos Git, contas GitHub dos sócios, fluxo de build por publicação) é quase todo descartado na migração para B. O que se reaproveitaria (componentes da loja, `src/lib`) é reaproveitado igualmente em B.
3. R2 (estoque e pedidos) é exatamente o que o dono pediu ("estoque", "em falta" quando acabar). A só entrega "em falta" manual.
4. Em A, o login do sócio passa por conta GitHub (ou serviço do CMS), atrito alto para a persona P2 e sem perfil "operação".

**Ponte barata enquanto o R1 não sai (recomendada, ~1-2 dias, 100% reaproveitada):** **R1-zero** = a loja estática ganha o estado visual "Em falta no estoque" (sabor e modelo), regras RE1-RE3 e RE8 (linha em falta no carrinho, envio bloqueado) dirigidas por um campo `outOfStock` em `src/data/catalog.ts`. Um dev muda o campo e publica em minutos no Pages. Quando o R1 entrar, o mesmo componente e a mesma lógica (`src/lib/availability.ts`) passam a ler do snapshot publicado. Isso antecipa H5/H6 e permite ao designer/QA validar o estado visual cedo.

**Plano B do plano (se o spike S1 reprovar a Cloudflare):** B-V com **Vercel Pro + Neon Free** (US$ 20/mês) e Auth.js/Better Auth, mantendo o mesmo modelo de dados (Drizzle troca o dialeto para Postgres). Supabase só com plano Pro (o Free pausa e não tem backup, inaceitável para pedidos e estoque).

### 1.6 Consequências

- O site ganha o primeiro servidor: superfície de ataque, operação (migrações, backups) e testes de integração passam a existir.
- A loja continua rápida: HTML servido do cache da borda; o Worker só renderiza em cache frio ou após publicação.
- O alvo `dist-static` deixa de ser o produto principal (seção 7.6).
- O projeto Vercel `nomad-v1` deve ser aposentado como produção (Hobby não permite uso comercial); pode ficar só como preview interno até a migração dos previews para a Cloudflare (seção 6.5).

---

## 2. Linguagens e técnicas definidas

### 2.1 Linguagens e versões

| Camada | Escolha | Observação |
|---|---|---|
| Linguagem | **TypeScript estrito** (`astro/tsconfigs/strictest`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) em loja, servidor, scripts e testes | `typescript ~6.0.3` (limite do `typescript-eslint`/`@astrojs/check`, igual ao ADR-001) |
| SQL | SQLite (dialeto D1) em migrações `.sql` versionadas | escrito à mão/gerado pelo drizzle-kit e revisado |
| Framework | **Astro 7.x** (hoje `^7.3.5`; fixar a última 7.x estável no início do R1) com `output: 'server'` e `prerender` por rota | Astro 7: route caching estável (`Astro.cache.set()`, `cache.invalidate()`, `routeRules`), provedores de CDN experimentais (`cacheCloudflare()`), live content collections |
| Adaptador | **`@astrojs/cloudflare`** na major compatível com Astro 7 (npm `latest` = 14.3.x; a doc indica a 15 beta para recursos novos) - **o spike S1 decide e fixa a versão exata** | deploy como Worker com static assets; bindings via `import { env } from 'cloudflare:workers'` |
| Runtime | Cloudflare Workers (workerd), `compatibility_date` fixada, `nodejs_compat` só se necessário | |
| CSS / UI | igual ao atual (tokens, componentes `.astro`, TS vanilla); admin com os mesmos tokens e componentes de formulário novos do designer | sem framework de UI (mantém ADR-001); formulários do admin funcionam com HTML + Astro Actions e melhoram com JS |

### 2.2 Modo de renderização por rota

| Rota | Modo | Cache / invalidação |
|---|---|---|
| `/` (loja), `/[campanha]` (landings), `/404` | **SSR sob demanda + cache de rota na borda** (`Astro.cache.set({ maxAge: 60, swr: 600, tags: ['catalog'] })` com provedor `cacheCloudflare()`) | **Ao publicar** no admin: `cache.invalidate({ tags: ['catalog'] })`. Se a purga por tag não se comportar como documentado no spike S1, fallback: `max-age=60` + `stale-while-revalidate` (atende M2 de B: <= 1 min) |
| Assets `/_astro/*`, fontes, ícones | estáticos (static assets do Worker; não contam requisição de Worker) | `immutable`, 1 ano |
| `GET /api/catalogo` | SSR, lê snapshot do KV | `Cache-Control: public, max-age=30, stale-while-revalidate=300`, `ETag = versão da publicação` |
| `GET /api/disponibilidade` | SSR, lê KV `availability:current` | `max-age=15` (RE8/RE9 "tempo real" com teto de 15 s) |
| `POST /api/pedidos` (R2) | SSR, D1 | `no-store` |
| `painel.nomadpuffs.com.br/**` (admin) | SSR, nunca cacheado | `Cache-Control: no-store`, `X-Robots-Tag: noindex, nofollow` |
| Prévia (`/previa?token=`) | SSR a partir do rascunho | `no-store`, `noindex`, faixa "PRÉVIA - não publicada" |

**Fonte de leitura da loja:** a loja **nunca consulta o D1** no caminho de renderização. Ao publicar, o servidor monta um **snapshot imutável** (catálogo, regiões, campanhas, textos) validado por Zod, grava em D1 (`publication`, fonte da verdade) e em KV (`catalog:current`), e invalida o cache. A disponibilidade (em falta/teto de quantidade) é um segundo documento KV (`availability:current`) atualizado por qualquer mudança de estoque, sem exigir "Publicar". Vantagens: 1 leitura de KV por render frio, CPU mínima, loja imune a limite diário do D1.

**Degradação segura (RNF do PO):** D1 fora -> loja segue (lê KV); admin mostra "sistema indisponível". KV indisponível -> `stale-if-error` serve o último HTML; sem HTML em cache -> página "Catálogo temporariamente indisponível - peça pelo WhatsApp" com o link (nunca preço antigo embutido no bundle). `POST /api/pedidos` falhou -> o cliente envia o pedido pelo WhatsApp **sem código** (linha "Pedido sem código - confirmar no atendimento"); o pedido nunca depende do servidor.

### 2.3 Validação de esquema: Zod (via `astro/zod`)

Decisão: **Zod 4 reexportado pelo Astro (`import { z } from 'astro/zod'`)** - **nenhuma dependência nova**. Justificativa: o Astro já o embarca (content collections e Actions usam Zod); um único esquema valida (1) entrada das Actions do admin, (2) corpo das APIs públicas, (3) snapshot publicado antes de ir ao KV, (4) seeds a partir de `src/data`. Os tipos TS saem do esquema (`z.infer`), eliminando divergência entre tipo e validação. Esquemas em `src/schemas/*.ts`, sem dependência de runtime de servidor (rodam também no navegador para validar formulários).

### 2.4 Acesso a dados, banco e ORM

| Opção | Custo | Prós | Contras | Veredito |
|---|---|---|---|---|
| **Cloudflare D1** (SQLite) + **Drizzle ORM** | US$ 0 (5 GB, 5 mi linhas lidas/dia, 100 mil escritas/dia; desde 01/09/2026 o teto diário é **rígido**: passou, as consultas falham até 00:00 UTC) | mesmo provedor, latência zero de rede extra, escritas serializadas por banco (sem corrida entre escritores), `batch()` atômico, Time Travel (restauração por ponto no tempo), `CHECK`/triggers SQLite | sem transação interativa (só `batch`), sem RLS, sem região na América do Sul (dados só de sócios e pedidos sem PII) | **Escolhido** |
| Neon Postgres (free) via Hyperdrive + Drizzle | US$ 0 | Postgres completo, RLS, transações | segundo fornecedor, escala a zero (latência fria), limites de compute do free | alternativa se D1 reprovar |
| Supabase (Postgres/Auth/Storage) | Free pausa em 7 dias sem uso e sem backup; Pro US$ 25 | pacote completo, RLS, MFA | custo para produção séria; Auth acopla | rejeitado pela restrição de custo |

Uso de volume esperado (ordem de grandeza): < 100 pedidos/dia, < 50 sabores, < 2 mil linhas escritas/dia -> 1-2% da cota gratuita. O teto rígido é um risco só em caso de consulta sem índice (conta linhas **varridas**): todo acesso por chave/índice, revisado no code review, e teste de integração que roda `EXPLAIN QUERY PLAN` nas consultas do painel.

**Drizzle (`drizzle-orm`, Apache-2.0; `drizzle-kit` em dev):** esquema tipado, suporte nativo a D1 e a `db.batch()`, gera SQL de migração revisável. Operações críticas de estoque/pedido usam SQL explícito via `sql\`\`` dentro de `batch` (seção 2.9). Alternativa sem ORM (SQL cru + Zod) foi considerada; Drizzle vence por tipagem do esquema e menor erro em joins.

### 2.5 Camadas de acesso (regras)

- `src/server/db/*`: único lugar que importa `env.DB`; repositórios por agregado (`catalog`, `stock`, `orders`, `users`, `audit`, `publication`).
- `src/server/services/*`: casos de uso (publicar, desfazer, ajustar estoque, transicionar pedido), sempre `(ator, entrada validada) -> resultado`, e **sempre** gravam auditoria na mesma `batch`.
- Lint `no-restricted-imports`: `src/scripts/**` e componentes da loja não podem importar `src/server/**`; `src/lib/**` continua puro (sem DOM, sem `env`, sem `Date.now()`).

### 2.6 Autenticação do admin com 2FA: **Cloudflare Access + TOTP no app**

| Opção | 2FA | Custo | Problema |
|---|---|---|---|
| **Cloudflare Access** (Zero Trust Free, até 50 usuários) com **código de uso único por e-mail** e política de **lista de e-mails** + **TOTP próprio no app** | sim (posse do e-mail + app autenticador) | US$ 0 | lock-in Cloudflare (mitigado: troca para Better Auth) |
| Better Auth (e-mail+senha + plugin `twoFactor`) | sim | US$ 0 | hash de senha (scrypt) leva 73-170 ms de CPU e **estoura o limite de 10 ms do Workers Free** (issue pública); exige plano Paid ou hash fora do Worker; exige provedor de e-mail para recuperação |
| Clerk / Auth0 | sim | free com limites; terceiro na CSP (scripts/iframes) | afrouxa a CSP do admin, dado de sócios em mais um operador |
| Supabase Auth | TOTP MFA | exige Supabase (custo/pausa) | rejeitado junto com o Supabase |

**Fluxo decidido:**
1. `painel.nomadpuffs.com.br` inteiro atrás de uma aplicação Access. Política: `emails in {lista D1}`; método: one-time PIN por e-mail (PIN de uso único, expira em 10 min; o Access **não revela** se o e-mail está na lista - atende o cenário "E-mail não autorizado"). Sessão do Access: 12 h (máximo do PO).
2. O Worker valida o cabeçalho `Cf-Access-Jwt-Assertion` em **toda** requisição do admin (assinatura via JWKS da equipe, `aud` da aplicação, `exp`, `iss`) com `jose` - nunca confiar só no "estar atrás do Access" (defesa contra bypass de rota/hostname).
3. O e-mail do JWT é mapeado para `admin_user` ativo (papel `socio_admin` ou `operacao`). E-mail sem cadastro ativo = 403 e auditoria.
4. **Segundo fator no app: TOTP (RFC 6238)** obrigatório no primeiro acesso (cadastro com QR + 10 códigos de recuperação de uso único, guardados com hash) e a cada nova sessão do app. Biblioteca `@oslojs/otp` (MIT, sem dependências, roda em Workers) + `uqr` (MIT, gera QR em SVG). Segredo TOTP cifrado em repouso (AES-GCM, chave em secret `TOTP_ENC_KEY`).
5. Sessão do app: cookie `__Host-nomad_sess` (`Secure; HttpOnly; SameSite=Strict; Path=/`), id aleatório de 256 bits, guardado com hash SHA-256 em `admin_session`; expira com **30 min de inatividade** e **12 h absolutas**; rotação após TOTP.
6. Bloqueio por tentativas: 5 TOTP errados em 15 min por usuário -> bloqueio de 15 min + auditoria (`login_attempt`); o PIN por e-mail tem limitação própria do Access.
7. "Sessão expirada sem perder o que digitei": formulários do admin salvam rascunho local (sessionStorage, sem dado sensível) e restauram após reautenticação.
8. Sem cadastro público: contas só criadas por `socio_admin` (inclui adicionar o e-mail à política do Access via API com token restrito, ou manualmente pelo TL no início - ponto aberto P6).

Desenvolvimento/E2E: provedor de identidade de desenvolvimento (`DEV_AUTH_EMAIL`) habilitado **só** quando `ENVIRONMENT=development|test`; o build de produção falha se a variável existir (teste trava).

### 2.7 Imagens: armazenamento e otimização

- **R2** (bucket privado `nomad-media`, 10 GB e egress grátis) guarda o original **já higienizado**.
- No admin, o navegador redimensiona (lado maior <= 2000 px) e **reencoda em JPEG/WebP via canvas**, o que remove EXIF/GPS antes do envio (cenário do PO). O servidor **não confia** nisso: valida tipo real por assinatura de bytes (JPEG/PNG/WebP), tamanho <= 10 MB, dimensões >= 600 px no menor lado (lidas do cabeçalho), recusa SVG/HEIC não convertido.
- Entrega via **binding Images do adaptador** (`imageService: 'cloudflare-binding'`) / transformações (`format=auto`, larguras 360/720/1080, `metadata=none`): 5 mil transformações únicas/mês grátis; com ~50 fotos x 3 larguras x 2 formatos estamos em ~300. Cache imutável por `chave = sha256 do arquivo`.
- `width`/`height` gravados no banco -> `<img>` com dimensões (CLS 0) e `srcset`; texto alternativo obrigatório (coluna `NOT NULL`, `CHECK length >= 3`).
- Preço **sempre texto** (D9 do PO): arte nova sem preço é bloqueante do go-live do R1.

### 2.8 Auditoria e desfazer

- `audit_log` **append-only**: triggers `BEFORE UPDATE` e `BEFORE DELETE` com `RAISE(ABORT)`. Grava quem, quando, ação, entidade, `before`/`after` (JSON), `request_id`. O admin só lê.
- **Desfazer publicação (H9):** cada publicação é um snapshot imutável numerado; "Voltar para a versão anterior" cria **nova** publicação com o conteúdo da versão N-1 (`restored_from`) e restaura o rascunho editável a partir dela. Nunca apaga histórico.
- Concorrência entre sócios (cenário "Dois sócios editando"): coluna `version` em todas as entidades editáveis; `UPDATE ... WHERE id=? AND version=?`; zero linhas = conflito -> tela "Este item foi alterado por X às HH:MM" com "Recarregar" ou "Sobrescrever" (sobrescrever envia a versão atual explicitamente e fica na auditoria).

### 2.9 Concorrência no estoque (nunca negativo)

- `stock.qty INTEGER NOT NULL CHECK (qty >= 0)` é a trava final.
- Confirmar pedido = **uma** `db.batch()` (atômica: qualquer erro desfaz tudo):
  1. `UPDATE orders SET status='confirmado', version=version+1, confirmed_at=? WHERE id=? AND version=? AND status='enviado'`
  2. asserção `INSERT INTO _assert(ok) VALUES (CASE WHEN changes()=1 THEN 1 END)` (`_assert.ok NOT NULL`) -> se o pedido mudou em paralelo, aborta a batch
  3. para cada item: `UPDATE stock SET qty = qty - ?n WHERE flavor_id=?` (se o saldo ficar negativo, o `CHECK` aborta a batch inteira)
  4. `INSERT INTO stock_movement ...` (um por item, `qty_after` calculado por subconsulta) e `INSERT INTO order_event ...` e `INSERT INTO audit_log ...`
  5. `DELETE FROM _assert`
  Em erro de `CHECK`, o serviço lê os saldos e devolve a mensagem do PO: "Sem saldo para V155 Menthol (precisa 1, tem 0)".
- D1 serializa escritas por banco, então duas confirmações simultâneas executam uma após a outra; a segunda falha pelo `CHECK` (cenário "Disputa pela última unidade"). **Spike S2** valida `changes()` dentro de `batch` e o rollback por `CHECK` no D1 real (teste de integração permanente).
- Transições válidas também impostas no banco por trigger `BEFORE UPDATE OF status ON orders` (tabela de transições permitidas), além do código.
- Após qualquer mudança de saldo/marcação manual: recalcula `availability:current` e grava no KV (operação idempotente; falha -> nova tentativa via `ctx.waitUntil` e alerta).

### 2.10 Códigos de pedido

`NMD-` + **5** caracteres Crockford base32 (sem I, L, O, U; ex.: `NMD-7K3FQ`), gerados no **servidor** com `crypto.getRandomValues` (32^5 = 33,5 mi combinações); `UNIQUE` no banco + até 3 novas tentativas em colisão. O código não é segredo nem autenticação (o cliente não consulta pedido por ele). Pedido idempotente por `idempotency_key` (UUID gerado no clique, `UNIQUE`): clique duplo devolve o mesmo código. PO citou 4 caracteres como exemplo; 5 reduz colisão e adivinhação (ponto P3).

### 2.11 Migrações reversíveis

- `migrations/NNNN_nome.sql` (aplicadas por `wrangler d1 migrations apply`) + `migrations/down/NNNN_nome.down.sql` escritas à mão e **testadas** no CI (aplica up -> down -> up num D1 local e compara esquema).
- Regra expand/contract: nunca remover/renomear coluna na mesma release que muda o código; primeiro adiciona, depois migra dados, depois remove.
- Antes de migrar produção: bookmark do **Time Travel** do D1 registrado no log do deploy (restauração por ponto no tempo; 7 dias no Free, 30 no Paid - confirmar) + export SQL para o R2 de backup.

### 2.12 Seeds a partir de `src/data`

`scripts/seed.ts` lê `MODELS`, `REGIONS`, `ARRANGE_AREAS`, `PAYMENT_METHODS`, `STORE` e `DELIVERY_PROMOS` atuais, valida com os mesmos esquemas Zod e gera `seeds/0001_catalogo_inicial.sql` idempotente (`INSERT ... ON CONFLICT DO NOTHING`), preservando os **ids/slugs atuais** (os carrinhos salvos no `localStorage` dos clientes, `nomad:cart:v1`, continuam válidos). Imagens atuais (com preço queimado) só entram no seed de dev/preview; produção recebe as artes novas (D9). Depois do go-live do R1, `src/data/catalog.ts` deixa de ser fonte de verdade: fica como **fixture de testes** e origem do seed (comentário de cabeçalho atualizado).

### 2.13 Dependências novas (todas justificadas)

| Pacote | Tipo | Licença | Por quê |
|---|---|---|---|
| `@astrojs/cloudflare` | dep | MIT | adaptador (2.1) |
| `drizzle-orm` | dep | Apache-2.0 | ORM tipado com D1 (2.4) |
| `jose` | dep | MIT | verificar JWT do Access via WebCrypto, sem deps (2.6) |
| `@oslojs/otp`, `@oslojs/encoding` | dep | MIT | TOTP RFC 6238 e base32 (2.6) |
| `uqr` | dep | MIT | QR em SVG para cadastrar o TOTP (2.6) |
| `wrangler` | dev | MIT/Apache | dev local, D1/KV/R2 locais, migrações, deploy |
| `drizzle-kit` | dev | MIT | gerar SQL de migração |
| `@cloudflare/vitest-pool-workers` | dev | MIT | testes de integração dentro do workerd com D1/KV reais locais |
| `@cloudflare/workers-types` (se o adaptador não trouxer) | dev | MIT | tipos dos bindings |

Não adicionar: framework de UI, biblioteca de formulários, Zod separado (vem do Astro), Sentry/analytics de terceiros, SDK de gateway (só no R4).

---

## 3. Modelo de dados (D1 / SQLite)

Convenções: dinheiro em **centavos inteiros**; instantes em **epoch ms (INTEGER, UTC)** - o fuso de Palmas é aplicado só na apresentação (`America/Araguaina`, UTC-3 fixo); ids de catálogo = slugs atuais; ids técnicos = `crypto.randomUUID()`; booleanos `INTEGER CHECK (x IN (0,1))`; JSON em `TEXT CHECK (json_valid(x))`; toda entidade editável tem `version`, `created_at`, `updated_at`, `updated_by`. `PRAGMA foreign_keys` é ativo no D1.

### 3.1 Usuários, sessões, segurança (R1)

```sql
CREATE TABLE admin_user (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE CHECK (email = lower(trim(email))),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 60),
  role TEXT NOT NULL CHECK (role IN ('socio_admin','operacao')),
  totp_secret_enc TEXT,                      -- AES-GCM; NULL até cadastrar
  totp_confirmed_at INTEGER,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at INTEGER NOT NULL, created_by TEXT REFERENCES admin_user(id),
  version INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE admin_recovery_code (user_id TEXT NOT NULL REFERENCES admin_user(id), code_hash TEXT NOT NULL,
  used_at INTEGER, PRIMARY KEY (user_id, code_hash));
CREATE TABLE admin_session (
  id_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES admin_user(id),
  created_at INTEGER NOT NULL, last_seen_at INTEGER NOT NULL, expires_at INTEGER NOT NULL,
  totp_verified_at INTEGER, revoked_at INTEGER
);
CREATE INDEX admin_session_user ON admin_session(user_id);
CREATE TABLE login_attempt (user_id TEXT NOT NULL, at INTEGER NOT NULL, ok INTEGER NOT NULL);
CREATE INDEX login_attempt_user_at ON login_attempt(user_id, at);
```
Regra no serviço: sempre existe >= 1 `socio_admin` ativo (não é possível desativar o último).

### 3.2 Catálogo (R1)

```sql
CREATE TABLE media (
  id TEXT PRIMARY KEY, r2_key TEXT NOT NULL UNIQUE, sha256 TEXT NOT NULL UNIQUE,
  mime TEXT NOT NULL CHECK (mime IN ('image/jpeg','image/png','image/webp')),
  bytes INTEGER NOT NULL CHECK (bytes BETWEEN 1 AND 10485760),
  width INTEGER NOT NULL CHECK (width >= 600), height INTEGER NOT NULL CHECK (height >= 600),
  alt TEXT NOT NULL CHECK (length(trim(alt)) >= 3),
  created_at INTEGER NOT NULL, created_by TEXT NOT NULL REFERENCES admin_user(id)
);
CREATE TABLE model (
  id TEXT PRIMARY KEY CHECK (id GLOB '[a-z0-9]*' AND id NOT GLOB '*[^a-z0-9-]*'),   -- slug estável
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 40),
  title TEXT NOT NULL, subtitle TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents > 0 AND price_cents <= 10000000),
  description TEXT CHECK (description IS NULL OR length(description) <= 160),
  image_id TEXT REFERENCES media(id),
  sort INTEGER NOT NULL DEFAULT 0, visible INTEGER NOT NULL DEFAULT 1 CHECK (visible IN (0,1)),
  deleted_at INTEGER,                                  -- remoção lógica (pedidos antigos referenciam)
  version INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, updated_by TEXT
);
CREATE TABLE flavor (
  id TEXT PRIMARY KEY,                                 -- `${model_id}::${slug}` (= lineKey atual do carrinho)
  model_id TEXT NOT NULL REFERENCES model(id),
  slug TEXT NOT NULL, name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
  name_norm TEXT NOT NULL,                             -- lower + trim + espaços colapsados + sem acento
  dots TEXT NOT NULL CHECK (json_valid(dots) AND json_array_length(dots) BETWEEN 1 AND 3),  -- FlavorToken[]
  sort INTEGER NOT NULL DEFAULT 0,
  visible INTEGER NOT NULL DEFAULT 1 CHECK (visible IN (0,1)),
  manual_out_of_stock INTEGER NOT NULL DEFAULT 0 CHECK (manual_out_of_stock IN (0,1)),   -- RE3 (prevalece)
  low_stock_threshold INTEGER NOT NULL DEFAULT 3 CHECK (low_stock_threshold >= 0),     -- RE4 / D6
  deleted_at INTEGER, version INTEGER NOT NULL DEFAULT 1, updated_at INTEGER NOT NULL, updated_by TEXT,
  UNIQUE (model_id, slug)
);
CREATE UNIQUE INDEX flavor_name_unique ON flavor(model_id, name_norm) WHERE deleted_at IS NULL;  -- "icy mint" duplicado
CREATE INDEX flavor_model ON flavor(model_id, sort);
```
Tokens de cor (`dots`) validados pelo Zod contra `FLAVOR_TOKENS` (paleta do designer; nada de cor livre).

### 3.3 Estoque (R2)

```sql
CREATE TABLE stock (
  flavor_id TEXT PRIMARY KEY REFERENCES flavor(id),
  qty INTEGER NOT NULL CHECK (qty >= 0),               -- RE6: nunca negativo
  initialized_at INTEGER NOT NULL,                     -- carga inicial (D13); sem linha = "não contado"
  updated_at INTEGER NOT NULL
);
CREATE TABLE stock_movement (
  id TEXT PRIMARY KEY, flavor_id TEXT NOT NULL REFERENCES flavor(id),
  delta INTEGER NOT NULL CHECK (delta <> 0), qty_after INTEGER NOT NULL CHECK (qty_after >= 0),
  reason TEXT NOT NULL CHECK (reason IN ('carga_inicial','entrada','contagem','perda','outro',
                                         'pedido_confirmado','pedido_devolvido')),
  note TEXT CHECK (note IS NULL OR length(note) <= 200),
  order_id TEXT REFERENCES orders(id),
  CHECK ((reason IN ('pedido_confirmado','pedido_devolvido')) = (order_id IS NOT NULL)),
  actor_id TEXT NOT NULL REFERENCES admin_user(id), created_at INTEGER NOT NULL
);
CREATE INDEX stock_movement_flavor_at ON stock_movement(flavor_id, created_at DESC);
-- append-only: triggers BEFORE UPDATE/DELETE -> RAISE(ABORT)
```
Disponibilidade derivada (função pura `src/lib/availability.ts`, testada):
`em_falta = !visible || manual_out_of_stock || (R2 && (sem linha em stock || qty = 0))`; `cap = min(10, qty)`; modelo em falta quando todos os sabores visíveis estão em falta (RE1).

### 3.4 Regiões e áreas a combinar (R1, Should)

```sql
CREATE TABLE region (
  id TEXT PRIMARY KEY,                                  -- slugs atuais (q700s-200, ..., araras, caribe, polinesia)
  label TEXT NOT NULL CHECK (length(label) BETWEEN 2 AND 60),
  kind TEXT NOT NULL CHECK (kind IN ('fixa','a_combinar')),
  fee_cents INTEGER,
  CHECK ((kind = 'fixa' AND fee_cents IS NOT NULL AND fee_cents >= 0 AND fee_cents <= 100000)
      OR (kind = 'a_combinar' AND fee_cents IS NULL)),
  neighborhoods TEXT CHECK (neighborhoods IS NULL OR json_valid(neighborhoods)),   -- REGION_NEIGHBORHOODS
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)), sort INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1, updated_at INTEGER NOT NULL, updated_by TEXT
);
```
Unifica `REGIONS` e `ARRANGE_AREAS` (o tipo TS continua discriminado: `kind`). **"Outra região" fica no código** (`OTHER_REGION_ID`), não na tabela: o admin não consegue removê-la (cenário do PO). Id `outra` é reservado (`CHECK (id <> 'outra')`).

### 3.5 Campanhas (generaliza `src/data/promos.ts`) - R3

```sql
CREATE TABLE campaign (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE CHECK (slug GLOB '[a-z0-9]*' AND slug NOT GLOB '*[^a-z0-9-]*' AND length(slug) BETWEEN 3 AND 30),
  type TEXT NOT NULL CHECK (type IN ('frete_gratis')),           -- 'desconto_modelo','leve_x_pague_y' = H34 (Could)
  name TEXT NOT NULL, label TEXT NOT NULL, option_label TEXT NOT NULL,
  starts_at INTEGER NOT NULL, ends_at INTEGER NOT NULL, CHECK (ends_at > starts_at),   -- [início, fim)
  landing TEXT NOT NULL CHECK (json_valid(landing)),             -- blocos do modelo aprovado, validados por Zod
  status TEXT NOT NULL CHECK (status IN ('rascunho','publicada','arquivada')),
  version INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, updated_by TEXT
);
CREATE INDEX campaign_window ON campaign(type, starts_at, ends_at);
CREATE TABLE campaign_region (
  campaign_id TEXT NOT NULL REFERENCES campaign(id), region_id TEXT NOT NULL REFERENCES region(id),
  participates INTEGER NOT NULL CHECK (participates IN (0,1)),
  PRIMARY KEY (campaign_id, region_id)
);
```
Regras (serviço + teste): sem sobreposição de campanhas do mesmo tipo publicadas (inserção condicional `WHERE NOT EXISTS (... starts_at < :fim AND ends_at > :inicio)` dentro da batch); no publicar, **toda região ativa `fixa` precisa ter linha em `campaign_region`** (equivale ao teste TD3 "elegíveis ∪ excluídas = todas", agora como validação do admin; cenário "Região nova durante campanha ativa"); slug não pode colidir com rotas reservadas (`admin`, `api`, `previa`, `_astro`, `404`, ...). Lógica de fase (`breve/ativa/encerrada`), `activePromoFor`, `daysLeft`, `countdownText` de `src/lib/promo.ts` são **reaproveitadas** trocando o tipo `DeliveryPromo` por `Campaign` (estrutural, mudança pequena; testes atuais viram fixtures). `public/age-init.js` deixa de ter instantes duplicados: o HTML renderizado leva `data-promo-start`/`data-promo-end` no `<html>` e o script lê de lá (elimina o risco R2 do plano da promo).

### 3.6 Conteúdos e configurações (R1 Should / R3)

```sql
CREATE TABLE content_block (
  key TEXT PRIMARY KEY,                 -- allowlist no código: 'hero.tagline','loja.aviso_disponibilidade','loja.horario', 'inst.sobre', ...
  value TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, updated_at INTEGER NOT NULL, updated_by TEXT
);
CREATE TABLE store_setting (
  key TEXT PRIMARY KEY CHECK (key IN ('whatsapp_e164','whatsapp_display')),
  value TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, updated_at INTEGER NOT NULL, updated_by TEXT
);
```
Limites de tamanho e formato por chave ficam no esquema Zod (definidos pelo designer); formatação limitada (negrito, itálico, link `https:`/`wa.me`) armazenada como Markdown restrito e renderizada por um conversor próprio mínimo que gera só `<strong>/<em>/<a rel="noopener">` com escape de todo o resto (cenário "Conteúdo perigoso"). **Textos legais (gate 18+, "Proibida a venda para menores de 18 anos", LegalStrip) não existem nestas tabelas** (D18): ficam no código.

### 3.7 Publicação (R1)

```sql
CREATE TABLE publication (
  version INTEGER PRIMARY KEY,                 -- 1, 2, 3...
  snapshot TEXT NOT NULL CHECK (json_valid(snapshot)), sha256 TEXT NOT NULL,
  note TEXT, restored_from INTEGER REFERENCES publication(version),
  created_by TEXT NOT NULL REFERENCES admin_user(id), created_at INTEGER NOT NULL
);
-- append-only (triggers)
```
O snapshot é o contrato público (`PublicCatalogV1`, seção 6.2). Retenção: todas as versões (são pequenas, ~20-50 KB).

### 3.8 Pedidos (R2) - sem dado pessoal

```sql
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE CHECK (code GLOB 'NMD-[0-9A-HJKMNP-TV-Z][0-9A-HJKMNP-TV-Z][0-9A-HJKMNP-TV-Z][0-9A-HJKMNP-TV-Z][0-9A-HJKMNP-TV-Z]'),
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('enviado','confirmado','saiu','entregue','pago',
                                         'nao_entregue','cancelado','expirado')),
  region_id TEXT, region_label TEXT NOT NULL,           -- snapshot do rótulo ('Outra região' incluso)
  fee_cents INTEGER CHECK (fee_cents IS NULL OR fee_cents >= 0),   -- NULL = a combinar
  campaign_id TEXT REFERENCES campaign(id),
  payment_chosen TEXT NOT NULL CHECK (payment_chosen IN ('pix','debito','credito')),
  payment_received TEXT CHECK (payment_received IS NULL OR payment_received IN ('pix','debito','credito')),
  CHECK ((status = 'pago') = (payment_received IS NOT NULL)),
  subtotal_cents INTEGER NOT NULL CHECK (subtotal_cents > 0),
  total_cents INTEGER NOT NULL CHECK (total_cents >= subtotal_cents),
  publication_version INTEGER NOT NULL REFERENCES publication(version),
  created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL,          -- D7: +24 h
  confirmed_at INTEGER, closed_at INTEGER, cancel_reason TEXT,
  version INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX orders_status_created ON orders(status, created_at DESC);
CREATE INDEX orders_created ON orders(created_at DESC);
CREATE TABLE order_item (
  order_id TEXT NOT NULL REFERENCES orders(id), flavor_id TEXT NOT NULL REFERENCES flavor(id),
  model_name TEXT NOT NULL, flavor_name TEXT NOT NULL,             -- snapshot
  unit_cents INTEGER NOT NULL CHECK (unit_cents > 0),
  qty INTEGER NOT NULL CHECK (qty BETWEEN 1 AND 10),
  line_cents INTEGER NOT NULL CHECK (line_cents = unit_cents * qty),
  PRIMARY KEY (order_id, flavor_id)
);
CREATE TABLE order_event (
  id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id),
  from_status TEXT, to_status TEXT NOT NULL, reason TEXT,
  actor_id TEXT REFERENCES admin_user(id),   -- NULL = sistema (criação/expiração)
  created_at INTEGER NOT NULL
);
CREATE INDEX order_event_order ON order_event(order_id, created_at);
CREATE TABLE allowed_transition (from_status TEXT NOT NULL, to_status TEXT NOT NULL, stock_effect INTEGER NOT NULL
  CHECK (stock_effect IN (-1,0,1)), PRIMARY KEY (from_status, to_status));
-- seed: enviado->confirmado(-1), enviado->cancelado(0), enviado->expirado(0), confirmado->saiu(0),
--       confirmado->cancelado(+1), saiu->entregue(0), saiu->nao_entregue(+1), entregue->pago(0)
-- trigger BEFORE UPDATE OF status ON orders: RAISE(ABORT) se (OLD.status, NEW.status) não está em allowed_transition
```
**LGPD:** nenhuma coluna de nome, telefone, endereço, CPF, IP ou user-agent. Rate limit dos pedidos usa a camada da Cloudflare (contadores efêmeros), não o banco. Expiração (H25) por **Cron Trigger** do Worker a cada hora.

### 3.9 Auditoria (R1)

```sql
CREATE TABLE audit_log (
  id TEXT PRIMARY KEY, at INTEGER NOT NULL,
  actor_id TEXT REFERENCES admin_user(id), actor_email TEXT,           -- e-mail congelado (conta pode ser desativada)
  action TEXT NOT NULL,      -- 'model.update','flavor.out_of_stock','publish','rollback','stock.adjust','order.transition',
                             -- 'auth.login','auth.denied','auth.totp_fail','user.create','access.forbidden', ...
  entity TEXT, entity_id TEXT,
  before TEXT CHECK (before IS NULL OR json_valid(before)), after TEXT CHECK (after IS NULL OR json_valid(after)),
  request_id TEXT NOT NULL
);
CREATE INDEX audit_at ON audit_log(at DESC);
CREATE INDEX audit_entity ON audit_log(entity, entity_id, at DESC);
CREATE TRIGGER audit_no_update BEFORE UPDATE ON audit_log BEGIN SELECT RAISE(ABORT, 'audit_log é somente inserção'); END;
CREATE TRIGGER audit_no_delete BEFORE DELETE ON audit_log BEGIN SELECT RAISE(ABORT, 'audit_log é somente inserção'); END;
```
Retenção de eventos `auth.*`: 6 meses (default do PO), por migração de expurgo **controlada** (o trigger é recriado após o expurgo dentro da mesma migração, registrada). Demais eventos: indefinido.

### 3.10 Pagamento (R4 - desenhado, **não criado**)

`payment` (order_id, gateway, gateway_payment_id UNIQUE, status, amount_cents, installments, brand, last4 - nunca PAN/CVV), `webhook_event` (event_id UNIQUE, payload, received_at, processed_at), `stock_reservation` (order_id, flavor_id, qty, expires_at - D15/RE11). Só entram por migração do R4, após os 6 itens "Pronto para ligar".

---

## 4. Segurança

### 4.1 OWASP Top 10 (2021/2025) aplicado

| Risco | Controle |
|---|---|
| A01 Controle de acesso quebrado | Access na borda + verificação do JWT no Worker + sessão TOTP + **autorização por papel no servidor em toda Action/rota** (`requireRole('socio_admin')`); `operacao` só `orders.*` (cenário "Perfil operação", inclusive por URL direta -> 403 + auditoria); testes E2E de permissão negada para cada rota |
| A02 Falhas criptográficas | TLS só (HSTS com preload no domínio), segredo TOTP cifrado AES-GCM, sessões guardadas por hash, códigos de recuperação com hash, nenhum dado de cartão |
| A03 Injeção | Drizzle/consultas parametrizadas (proibido concatenar SQL - lint), saída escapada pelo Astro, conversor de Markdown restrito, `textContent` no cliente (já proíbe `innerHTML`), mensagem do WhatsApp com `sanitizeText` |
| A04 Design inseguro | preço/total **sempre recalculados no servidor** a partir do snapshot (pedido) - carrinho do navegador é só intenção; travas de compliance fora do alcance do admin; regras de estoque no banco |
| A05 Configuração | CSP estrita por hostname, headers de segurança, `noindex`, sem página de debug, `wrangler.jsonc` versionado e revisado, bindings mínimos por ambiente |
| A06 Componentes vulneráveis | `npm audit --omit=dev` no CI, Dependabot semanal agrupado, actions fixadas por SHA, versões exatas do adaptador |
| A07 Autenticação | Access (PIN de uso único) + TOTP, bloqueio por tentativas, sessão 30 min/12 h, sem cadastro público, sem enumeração de e-mail |
| A08 Integridade | deploy só pelo CI a partir de `main` com aprovação de ambiente; webhooks (R4) com assinatura; snapshots com sha256 |
| A09 Logs e monitoramento | auditoria imutável + Workers Logs + alertas (seção 6.6) |
| A10 SSRF | o Worker não busca URLs fornecidas pelo usuário; uploads vão direto do corpo da requisição ao R2 |
| CSRF | Astro `security.checkOrigin` (padrão em rotas sob demanda) + cookie `SameSite=Strict` + Actions só `POST` |

### 4.2 Autorização (substituto de RLS)

D1 não tem RLS; a regra fica num único ponto: middleware `src/middleware.ts` (identidade + sessão) e `requireRole` em cada Action/endpoint, com teste que **enumera todas as Actions/rotas do admin** e falha se alguma não declarar papel (lista gerada a partir do registro de Actions). Matriz:

| Recurso | socio_admin | operacao | público |
|---|---|---|---|
| catálogo, regiões, textos, campanhas, fotos, publicar/desfazer | sim | não | não |
| estoque (ajuste/entrada) | sim | não (ponto P7) | não |
| pedidos: listar/transicionar/registrar pagamento | sim | sim | não |
| usuários | sim | não | não |
| auditoria (leitura) | sim | só dos próprios pedidos | não |
| `GET /api/catalogo`, `/api/disponibilidade`, `POST /api/pedidos` | - | - | sim (rate limit) |

### 4.3 CSP e headers

Loja (`nomadpuffs.com.br`), igual à atual com ajustes mínimos:
```
default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self';
connect-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none';
object-src 'none'; upgrade-insecure-requests
```
- Imagens servidas no **mesmo domínio** (rota de transformação da Cloudflare `/cdn-cgi/image/...` ou rota própria `/media/...`): `img-src 'self'` continua suficiente. Se o spike mostrar host diferente, adicionar só esse host.
- `connect-src 'self'` cobre `/api/*`. Nada de terceiros. Mantém `Permissions-Policy: payment=()` até o R4.
- Hardening do U5 junto com o R1: `require-trusted-types-for 'script'; trusted-types 'none'` e `Cross-Origin-Resource-Policy: same-origin`.
- Atenção (verificar no S1): Cloudflare injeta scripts em alguns recursos de zona (Email Obfuscation, Rocket Loader, Web Analytics automático, "Bot Fight" JS challenge). **Desligar** na zona; o E2E já falha em `securitypolicyviolation`.

Admin (`painel.nomadpuffs.com.br`):
```
default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self';
connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'; object-src 'none';
upgrade-insecure-requests; require-trusted-types-for 'script'; trusted-types 'none'
```
`blob:` só para pré-visualizar a foto antes do upload. O login do Access acontece em `<equipe>.cloudflareaccess.com` por navegação de topo (não precisa de `frame-src`). `Cache-Control: no-store`, `X-Robots-Tag: noindex, nofollow`, `Referrer-Policy: no-referrer`.

Fonte única: `src/data/csp.ts` passa a exportar `CSP_STORE` e `CSP_ADMIN`; o middleware aplica o header por hostname; o `<meta>` atual continua na loja; `tests/unit/deploy-config.test.ts` trava as duas.

### 4.4 Rate limit e abuso

- `POST /api/pedidos`: binding de Rate Limiting do Workers (chave = IP, ex.: 10/min) + regra de WAF de rate limiting da zona (o plano Free tem 1 regra - confirmar) + tamanho máximo do corpo 8 KB + Zod (máx. 30 linhas, qty 1-10). Spam de pedidos não afeta estoque (só "Confirmado" baixa) e expira em 24 h.
- `/api/catalogo` e `/api/disponibilidade`: cache de borda absorve.
- Admin: Access filtra antes do Worker; TOTP com bloqueio próprio.
- DDoS: proteção automática da Cloudflare em todos os planos.

### 4.5 Segredos e variáveis de ambiente

| Nome | Tipo | Onde |
|---|---|---|
| `TOTP_ENC_KEY` | secret (32 bytes base64) | `wrangler secret put`, por ambiente |
| `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD` | var | `wrangler.jsonc` por ambiente |
| `ENVIRONMENT` (`development`/`preview`/`production`) | var | idem |
| `INDEXING` (`off` padrão) | var | idem; **não existe no banco** |
| `PAYMENTS_ONLINE` (`off` padrão) | var | idem; ver seção 5 |
| `CLOUDFLARE_API_TOKEN` (CI) | GitHub secret de ambiente, escopo mínimo (Workers deploy + D1 do ambiente) | GitHub Environments com aprovação em `production` |
| Bindings `DB`, `CATALOG_KV`, `MEDIA`, `IMAGES`, `RATE_LIMITER`, `SESSION` | bindings | `wrangler.jsonc` (ids diferentes por ambiente) |

`.dev.vars.example` sem valores; `.dev.vars` no `.gitignore` (já coberto por `.env*`? **não** - adicionar). Nenhum segredo em `src/`.

### 4.6 Backups e restauração

- **D1 Time Travel**: restauração para qualquer minuto dos últimos 7 dias (Free) / 30 dias (Paid) - confirmar no S1.
- **Export diário**: GitHub Action agendada `wrangler d1 export nomad-prod` -> R2 `nomad-backups` (privado), retenção 30 dias; contém só dados sem PII de clientes (e-mails de sócios sim). Fotos: R2 já é durável; cópia semanal para o bucket de backup.
- **Teste de restauração mensal** (checklist do DevOps): restaurar o último export num D1 de staging e rodar o smoke de integração. Critério de pronto do R1 exige um teste de restauração documentado.

### 4.7 LGPD

- Loja continua sem coletar dado pessoal; pedido registrado sem PII (3.8).
- Dados pessoais: e-mail e nome dos sócios/operação, logs de acesso (Access guarda 24 h de log no Free; nossa auditoria guarda e-mail + ação, sem IP).
- Operadores: Cloudflare (DPA incorporado aos termos self-serve; confirmar no painel) e GitHub. D1 não tem região na América do Sul: transferência internacional apenas de dados de sócios; registrar na política de privacidade (atualizada antes do R1, revisada antes do R2).
- Sem analytics/pixels/cookies de terceiros. O cookie de sessão do admin é estritamente necessário.

### 4.8 Travas de conformidade do PO (não ligáveis pelo admin)

| Trava | Implementação | Teste |
|---|---|---|
| Gate 18+ | componente e `age-init.js` no código; snapshot **não tem** campo para desligar | E2E: gate presente em `/` e em toda landing de campanha |
| Aviso legal "Proibida a venda para menores de 18 anos" | `LegalStrip` no layout, texto constante no código | unit + E2E |
| `noindex` | header `X-Robots-Tag` + `<meta robots>` + `robots.txt` derivados de `env.INDEXING` (padrão `off`); nenhuma tabela/Action mexe nisso | E2E em todas as rotas; unit no esquema do snapshot (sem chave `indexing`) |
| Scripts/pixels de terceiros | CSP sem hosts externos; conteúdo editável só aceita Markdown restrito | teste do conversor + E2E de CSP |
| Pagamento online | seção 5; sem UI no admin | teste de build (flag + evidência) |

Mudar qualquer trava = PR revisado pelo TL + registro de decisão do dono (D12/D16).

### 4.9 Portabilidade (risco de conta do provedor)

Infra 100% em `wrangler.jsonc` + migrações SQL + seeds; export diário fora do Worker; dependências específicas isoladas em `src/server/platform/` (KV, R2, Access, Images). Plano de saída documentado: adaptador `@astrojs/node` ou Vercel/Netlify, D1 -> libSQL/Turso (mesmo SQLite) ou Postgres (Drizzle), Access -> Better Auth com TOTP, R2 -> qualquer S3. Estimativa de saída: 1-2 semanas.

---

## 5. Pagamento: plugável e desligado

- Arquitetura de referência: ADR-002 seção 3 (backend recalcula preço, cobrança com `Idempotency-Key = order.id`, webhook assinado + consulta na API, máquina de estados, SAQ A por redirect/iframe). Com B-CF ela cabe **no mesmo Worker** (mesma origem, `connect-src 'self'` preservado).
- **Porta, não implementação:** `src/server/payments/port.ts` define `PaymentProvider { createCheckout(order): Promise<{redirectUrl}>; verifyWebhook(req): Promise<Event>; fetchPayment(id) }`. Nenhum SDK de gateway instalado até o R4.
- **Feature flag de servidor** `PAYMENTS_ONLINE` (var de ambiente, padrão `off`). O código de pagamento só é registrado no roteamento se `PAYMENTS_ONLINE === 'on'` **e** existir no repositório `docs/compliance/pagamento-liberado.md` com os 6 itens "Pronto para ligar" do PO (parecer, aceite do gateway com produto/MCC verdadeiros, políticas, PCI, testes QA, aprovação do dono). `scripts/build.mjs` falha o build se a flag estiver `on` sem o arquivo; teste unitário trava. **O admin não tem botão, campo nem configuração para isso** (cenário "Desligado por padrão").
- Nada de contorno: o esquema de configuração do gateway (R4) terá campos `product_description`, `mcc` e `cnpj` **validados contra valores declarados no arquivo de evidência**; revisão de PR pelo TL.
- Pagamento na entrega (PIX/débito/crédito com maquininha) segue como hoje e ganha registro no pedido no R2 (H-PAG1b).

---

## 6. Estrutura, contratos, testes, CI/CD, observabilidade e custos

### 6.1 Estrutura de pastas e rotas proposta

```
astro.config.mjs            # output 'server', adapter cloudflare({ imageService: 'cloudflare-binding' }), cache provider
wrangler.jsonc              # envs dev/preview/production; bindings DB, CATALOG_KV, MEDIA (R2), IMAGES, RATE_LIMITER; crons
drizzle.config.ts
migrations/                 # 0001_init.sql ... + down/*.down.sql
seeds/                      # gerados por scripts/seed.ts a partir de src/data
src/
  data/                     # catalog.ts, promos.ts -> fixtures/seed (deixam de ser fonte em produção); csp.ts (CSP_STORE/ADMIN)
  schemas/                  # Zod: catalog.ts, region.ts, campaign.ts, content.ts, order.ts, snapshot.ts (PublicCatalogV1)
  lib/                      # PURO e reaproveitado: money, cart, order, promo (Campaign), whatsapp, storage, age-gate,
                            #   availability.ts (novo), order-code.ts (novo), totals.ts (recalcular no servidor e no cliente)
  server/
    platform/               # env, kv, r2, images, access-jwt, rate-limit (isolam Cloudflare)
    db/                     # schema.ts (Drizzle), client.ts, repos/*
    auth/                   # session.ts, totp.ts, roles.ts
    services/               # publish.ts, rollback.ts, catalog.ts, stock.ts, orders.ts, users.ts, media.ts, audit.ts
    payments/port.ts        # R4 (somente interface)
  actions/                  # Astro Actions do admin (Zod na entrada, requireRole, auditoria)
  middleware.ts             # host -> loja|admin, CSP por host, identidade/sessão, request_id, noindex
  components/               # atuais + estados "Em falta" (designer); components/admin/*
  layouts/                  # BaseLayout (loja), AdminLayout
  pages/
    index.astro             # loja (SSR + cache)
    [campanha].astro        # landings (substitui outubro.astro; /outubro vira campanha seed)
    404.astro
    previa.astro            # prévia (token assinado, noindex)
    api/catalogo.ts  api/disponibilidade.ts  api/pedidos.ts
    admin/                  # servido só no host painel.*: index (resumo), entrar/totp, modelos/[id], sabores, estoque,
                            #   pedidos/[codigo], regioes, textos, campanhas/[id], publicacoes, usuarios, auditoria
  scripts/                  # cliente da loja (atual) + admin/*.ts (melhorias progressivas)
  styles/
tests/
  unit/                     # atuais + availability, order-code, totals, schemas, csp, compliance-locks
  integration/              # vitest-pool-workers: D1 real local (estoque, transições, auditoria, migrações up/down)
  e2e/                      # atuais + admin-*.spec.ts, permissions.spec.ts, out-of-stock.spec.ts
  load/                     # k6: loja e disputa da última unidade
```

### 6.2 Contratos de API

**Público**

`GET /api/catalogo` -> `200 PublicCatalogV1`
```ts
interface PublicCatalogV1 {
  v: 1; version: number; publishedAt: number;
  store: { whatsappE164: string; whatsappDisplay: string };
  models: { id: string; name: string; title: string; subtitle?: string; priceCents: number; description?: string;
            image?: { src: string; width: number; height: number; alt: string };
            flavors: { id: string; slug: string; name: string; dots: FlavorToken[] }[] }[];
  regions: ({ id: string; label: string; kind: 'fixa'; feeCents: number } | { id: string; label: string; kind: 'a_combinar' })[];
  campaigns: { slug: string; type: 'frete_gratis'; label: string; optionLabel: string; startsAt: number; endsAt: number;
               regionIds: string[] }[];
  texts: Record<string, string>;
}
```
`GET /api/disponibilidade` -> `200 { version: number; at: number; out: string[]; cap: Record<string, number> }` (`out` = ids `modelo::sabor` em falta; `cap` só para itens com saldo < 10; sem número exibido salvo pela mensagem de RE9).

`POST /api/pedidos` (R2) - corpo:
```ts
{ idempotencyKey: string /* uuid */; items: { m: string; f: string; q: number }[]; regionId: string;
  paymentId: 'pix' | 'debito' | 'credito'; clientCatalogVersion: number }
```
Respostas: `201 { code, totals: { subtotalCents, feeCents: number | null, totalCents, campaign: string | null }, catalogVersion }` (o cliente monta a mensagem com **os valores do servidor**); `409 { error: 'unavailable', out: string[], cap: Record<string, number> }` (RE8/RE9); `409 { error: 'catalog_changed', catalogVersion }` (preço mudou: cliente recarrega e mostra novos valores antes de enviar); `422` validação; `429` rate limit. Idempotente pelo `idempotencyKey`.

**Admin (Astro Actions; todas `POST`, `requireRole`, Zod, auditoria, `version` para concorrência)**
`catalog.saveModel`, `catalog.createModel`, `catalog.saveFlavor`, `catalog.reorderFlavors`, `catalog.setOutOfStock` (lote permitido - H16), `media.upload` (multipart), `regions.save`, `content.save`, `settings.saveWhatsapp` (exige confirmação dupla), `publish.preview`, `publish.publish`, `publish.rollback({ toVersion })`, `stock.adjust({ flavorId, delta, reason, note })`, `stock.initialLoad` (R2, D13), `orders.list({ status?, day? })`, `orders.transition({ id, version, to, reason?, paymentReceived? })`, `orders.exportCsv` (Could), `users.create/deactivate/resetTotp`, `campaigns.save/publish/archive/duplicate`. Erros padronizados: `{ code: 'CONFLICT' | 'FORBIDDEN' | 'VALIDATION' | 'NO_STOCK' | 'OVERLAP', message: string (pt-BR para o sócio), fields? }`.

**Cron:** `0 * * * *` expira pedidos `enviado` com `expires_at < agora` (sistema como ator) e reconcilia `availability:current`.

### 6.3 Estratégia de testes

| Nível | Ferramenta | Escopo | Gate no CI |
|---|---|---|---|
| Unit | Vitest (atual) | `src/lib/**` (cobertura >= 95% em linhas - U11), esquemas Zod, conversor de Markdown, CSP, travas de compliance, código do pedido | sim |
| Integração com banco | Vitest + `@cloudflare/vitest-pool-workers` (workerd + D1/KV/R2 locais via Miniflare) | migrações up/down/up; seeds; publicar/desfazer; auditoria imutável (UPDATE/DELETE falham); estoque: tabela de efeitos do PO (cenário "Efeito de cada status"), nunca negativo, disputa pela última unidade (2 confirmações concorrentes), transições inválidas barradas pelo trigger; `EXPLAIN QUERY PLAN` sem `SCAN` em tabelas grandes; autorização: toda Action declara papel | sim |
| E2E loja | Playwright + axe (atual), contra `astro preview`/`wrangler dev` com D1 local semeado | regressão completa v0.2.0 + "Em falta" (sabor/modelo/teclado/leitor de tela), carrinho com item em falta, pedido com código, degradação (API fora -> envio sem código) | sim |
| E2E admin | Playwright, identidade de dev | H1-H16 do R1 (login/TOTP com relógio injetado, bloqueio, sessão expirada mantendo rascunho, publicar/prévia/desfazer, conflito entre 2 sócios em 2 contextos, upload válido/inválido, permissões negadas para `operacao`), R2/R3 conforme o PO | sim |
| A11y | axe em loja **e** admin, mobile 390 px + desktop; foco/teclado manual no QA | sim (0 violações) |
| Desempenho | Lighthouse CI (U3) na preview: mobile >= 90, LCP <= 2,5 s, CLS <= 0,1 | sim no R1 |
| Carga leve | k6 contra preview: 20 req/s na loja por 2 min (cache) + 10 pedidos/s por 1 min + 20 confirmações concorrentes do último item (saldo final = 0, exatamente 1 sucesso) | manual por release |
| Segurança | `npm audit`, teste de headers, revisão TL pré go-live, checklist OWASP; teste de bypass (acessar `*.workers.dev` e host do admin sem JWT -> 403) | sim/manual |
| Smoke produção | Action agendada diária (U3): home 200, gate, CSP, `noindex`, `/api/disponibilidade` 200, painel exige Access | alerta |

### 6.4 Ambientes

| Ambiente | Worker | D1 | KV/R2 | Access | Dados |
|---|---|---|---|---|---|
| dev (local) | `wrangler dev` / `astro dev` | local (Miniflare) | local | identidade de dev | seed |
| preview (por PR) | versão de preview do Worker (`wrangler versions upload` -> URL de preview) | `nomad-preview` (compartilhado, recriado + seed a cada merge em `main`) | `nomad-preview-*` | aplicação Access de preview (só squad) | seed + dados fictícios |
| produção | `nomad` em `nomadpuffs.com.br` e `painel.nomadpuffs.com.br` | `nomad-prod` | `nomad-prod-*` | aplicação Access de produção (sócios) | reais |

**Desativar `*.workers.dev`** em produção (ou bloquear no middleware) para que o admin só exista atrás do Access.

### 6.5 CI/CD

- `ci.yml` (existente) ganha: `test:integration`, build do Worker, Lighthouse CI, `npm audit`, verificação de migrações up/down.
- `preview.yml` (PR): build + `wrangler versions upload --env preview` + comentário com URL; migrações aplicadas no `nomad-preview` (se a PR tiver migração nova, job dedicado com banco efêmero `nomad-pr-<n>` - D1 grátis tem limite de bancos por conta: confirmar; senão só o compartilhado).
- `deploy.yml` (push em `main`): environment `production` com **aprovação manual**; passos: export de backup + bookmark Time Travel -> `wrangler d1 migrations apply nomad-prod` -> `wrangler deploy --env production` -> smoke -> em falha, `wrangler rollback` do código (migração é expand-only, então rollback de código é seguro).
- `backup.yml` (cron diário) e `smoke.yml` (cron diário).
- Fase 0 (R0): Cloudflare Pages com `dist-static` (DevOps). Itens técnicos: gerar `_headers` a partir de `src/data/csp.ts`/`vercel.json` (mesmos headers + `X-Robots-Tag`), **não publicar o `.htaccess`** no Pages (seria servido como arquivo; excluir no alvo `pages`), `404.html` na raiz, HSTS só após validar HTTPS. Sugestão: novo alvo `--target=pages` no `scripts/build.mjs` (base `/`, noindex `true`, gera `_headers`, sem `.htaccess`).
- Fluxo de branches inalterado (agentes não fazem push; o coordenador faz).

### 6.6 Observabilidade

- **Workers Logs** (logs estruturados JSON com `request_id`, rota, status, duração, papel; nunca PII nem corpo) e Workers Analytics (erros, CPU, requisições). Retenção do Free é curta (dias) - suficiente para incidentes; auditoria cobre o histórico de negócio.
- **Alertas** (notificações da Cloudflare por e-mail): taxa de erro do Worker, uso diário de D1 > 50% da cota, uso de requisições > 70% de 100 mil/dia, falha do cron, falha do backup (GitHub Actions envia e-mail).
- **Erros do cliente** (U8): `POST /api/erros` com amostragem, sem PII, `sendBeacon` (mesma origem).
- Painel do admin: "Saúde" simples (última publicação, versão no KV = versão no D1, último backup, pedidos `enviado` > 2 h).

### 6.7 Custos mensais estimados por fornecedor (US$ ~ R$ 5,50)

| Caminho | Itens | Mínimo viável | Quando sobe |
|---|---|---|---|
| **B-CF (recomendado)** | Workers Free (100 mil req/dia, 10 ms CPU), D1 Free (5 GB; 5 mi leituras/100 mil escritas por dia), KV Free, R2 Free (10 GB, egress grátis), Images (5 mil transformações únicas/mês), Access Free (50 usuários), DNS/CDN/WAF Free, GitHub Actions (repo privado: 2.000 min/mês grátis - confirmar uso) | **US$ 0** | **Workers Paid US$ 5 (~R$ 28)** se: CPU de render > 10 ms recorrente (medido no S1), > 70 mil req/dia, necessidade de Time Travel 30 dias, ou D1 > 50% da cota. Inclui 10 mi req/mês, 30 mi ms CPU, D1 25 bi leituras/50 mi escritas |
| A1 (CF Pages + CMS Git) | Pages Free (500 builds/mês), GitHub | US$ 0 | - (mas sem R2/R4) |
| A2 (Netlify Free + CMS Git) | 300 créditos/mês; deploy de produção = 15 créditos | US$ 0 | Pro US$ 19-20; ao estourar, o site **pausa** |
| B-CF+PG | Workers Free + Neon Free (0,5 GB) + Hyperdrive | US$ 0 | Neon Launch (~US$ 19+, confirmar) |
| B-V (briefing) | Vercel Pro US$ 20/membro + Supabase Pro US$ 25 | **US$ 45 (~R$ 250)** | uso excedente |
| B-V mínimo | Vercel Pro US$ 20 + Neon Free | US$ 20 (~R$ 110) | - |
| Fixos em todos | domínio `.com.br` (Registro.br, ~R$ 40/ano, já pago) | ~R$ 3,50/mês | - |

Nenhum caminho gratuito tem SLA; o risco é aceito para o volume atual e reavaliado no R2.

---

## 7. Plano por release

Estimativas para **1 dev full stack** (dias úteis), excluindo esperas do dono. QA em paralelo a partir da metade de cada release.

### 7.0 R0 - Fase 0 (DevOps + dono)
| # | Tarefa | Est. | Depende |
|---|---|---|---|
| R0.1 | Zona `nomadpuffs.com.br` na Cloudflare (nameservers no Registro.br) | dono | - |
| R0.2 | Alvo `--target=pages` (gera `_headers`, sem `.htaccess`, noindex) + teste de headers | 0,5 d | - |
| R0.3 | Projeto Pages ligado ao repo, domínio + `www`, HTTPS, desligar Rocket Loader/Email Obfuscation/analytics automático | 0,5 d | R0.1 |
| R0.4 | Smoke E2E contra o domínio | 0,5 d | R0.3 |
| R0.5 | (paralelo) **R1-zero**: estado "Em falta no estoque" na loja dirigido por `catalog.ts` | 1,5 d | design do estado |

### 7.1 R1a - Fundação + admin de catálogo + "Em falta" (Must H1-H11) - ~5-6 semanas
| # | Tarefa | Est. | Depende |
|---|---|---|---|
| S1 | **Spike Cloudflare**: Astro 7 + adaptador (14 x 15 beta), static assets, `Astro.cache` + purga por tag, CPU por render (meta < 5 ms), Images binding, Access JWT, desligar `workers.dev` | 2 d | R0.1 |
| S2 | **Spike D1**: `batch` atômico, `changes()` + `_assert`, rollback por `CHECK`, triggers append-only, Time Travel | 1 d | - |
| T1 | `wrangler.jsonc` 3 ambientes, bindings, `preview.yml`/`deploy.yml`, Access (preview e prod) | 2 d | S1 |
| T2 | Esquema Drizzle + migrações 0001 (usuários, catálogo, regiões, conteúdo, publicação, auditoria) + down + seed de `src/data` | 2 d | S2 |
| T3 | Auth: JWT do Access, mapeamento de usuário/papel, TOTP (cadastro, QR, recuperação), sessão 30 min/12 h, bloqueio, auditoria de login | 3 d | T1, T2 |
| T4 | Snapshot `PublicCatalogV1` (Zod) + publicar/prévia/desfazer + KV + invalidação de cache + availability KV | 3 d | T2 |
| T5 | Loja lendo snapshot (substitui imports de `catalog.ts`/`promos.ts` no render; cliente recebe dados via `<script type="application/json">` + `/api/disponibilidade`), RE8 com recheque no envio, degradação | 3 d | T4, R0.5 |
| T6 | Admin UI (mobile-first): modelos, sabores (paleta), em falta (4 toques, lote), validações H10, conflito de versão, confirmação de preço > 50% | 5 d | T3, T4, design |
| T7 | Upload de fotos (canvas -> R2 -> Images), alt obrigatório, preço como texto no card | 2 d | T1, artes D9 |
| T8 | CSP/headers por host, Trusted Types, revisão OWASP, teste de bypass | 1 d | T6 |
| T9 | Testes de integração + E2E admin/permissões + a11y admin + Lighthouse | 3 d | T3-T7 |
| QA | Plano do QA + aceite cronometrado com o sócio (M2) | 3 d | T9 |
| | **Total R1a** | **~27 d úteis de dev (+3 d de QA em paralelo) ~ 5-6 semanas** | D1, D9, D14 |

### 7.2 R1b - Should do R1 (H12-H15) - ~1 semana
Regiões e taxas (incl. "a combinar", desativar com aviso ao cliente) 2 d; modelo novo completo 1 d; textos curtos + WhatsApp com confirmação dupla 1,5 d; testes 1 d. Pode ser liberado junto com R1a se o prazo permitir.

### 7.3 R2 - Estoque com contagem + pedidos (H17-H25, H-PAG1b) - ~3-4 semanas (16 d de dev + piloto)
| # | Tarefa | Est. | Depende |
|---|---|---|---|
| T10 | Migração 0002 (stock, stock_movement, orders, order_item, order_event, allowed_transition + triggers) | 1,5 d | R1 |
| T11 | Estoque: carga inicial (D13), entrada/ajuste com motivo, histórico, estoque baixo, availability automática | 3 d | T10 |
| T12 | `POST /api/pedidos` (recalcular totais no servidor com `src/lib`, idempotência, código, rate limit) + código na mensagem do WhatsApp + fallback sem código | 3 d | T10 |
| T13 | Painel de pedidos (dia/status/busca por código), transições com baixa/devolução atômica, pagamento recebido, perfil `operacao` | 4 d | T11, T12 |
| T14 | Cron de expiração (D7), resumo (H24), CSV (Could) | 1,5 d | T13 |
| T15 | Integração (concorrência, tabela de efeitos), E2E, carga leve, backup/restauração ensaiados | 3 d | T11-T14 |
| QA + piloto | 1 semana de piloto com contagem física (M4) | 3 d + piloto | D5, D13 |

### 7.4 R3 - Campanhas, textos e regiões avançadas (H28-H35) - ~2-3 semanas
Migração 0003 (campaign, campaign_region) 1 d; generalizar `promo.ts` para `Campaign` e migrar `/outubro` para campanha seed (testes atuais viram fixtures) 2 d; admin de campanhas (período Palmas, regiões participantes obrigatórias, sobreposição, slug reservado) 3 d; landing `[campanha].astro` com blocos do modelo aprovado + banner automático + `age-init` lendo `data-promo-*` 2,5 d; textos institucionais 1,5 d; agendamento de alteração (H33, cron) 1,5 d; testes 2 d. Recomendação de parecer jurídico (propaganda) registrada como ciente antes do go-live.

### 7.5 R4 - Pagamento online (condicionado, fora de calendário)
Somente com os 6 itens "Pronto para ligar". Plano do ADR-002 seção 4 (5-7 semanas), agora sobre a base B-CF: migração de `payment`/`webhook_event`/`stock_reservation`, implementação de `PaymentProvider`, rota de checkout com CSP específica, webhooks, conciliação por cron, estorno no admin. Muda CSP/Permissions-Policy só na rota de pagamento.

### 7.6 O que acontece com o build estático (`dist-static`)

- **R0:** é o produto em produção (Cloudflare Pages).
- **R1:** o Worker passa a servir `nomadpuffs.com.br`. O Pages com o último `dist-static` fica **como contingência** (projeto mantido, domínio desligado; religar = trocar a rota DNS em minutos) por 30 dias.
- **Após 30 dias estáveis do R1:** **aposentar** `--target=static`, `deploy/static/*`, `package-static.mjs`, o zip no CI e os projetos E2E `static-*`. Motivo: um estático genérico não consegue refletir estoque/preço editados no admin nem registrar pedidos; manter dois produtos dobra o custo de teste. O alvo `vercel` também é aposentado (Hobby não permite uso comercial). Se o dono quiser contingência permanente, alternativa barata: comando `npm run export:contingencia` que gera um estático **a partir do último snapshot publicado** (sem estoque em tempo real, com aviso "sujeito à confirmação") - ponto P8.

---

## 8. Pontos abertos

### 8.1 Para consenso com Designer / Dev / QA

| # | Ponto | Proposta do TL |
|---|---|---|
| P1 | "Marcar em falta" exige "Publicar" ou é imediato? (PO: "marca e publica"; meta de 4 toques) | **Imediato** (ação operacional, com "Desfazer" por 10 s e auditoria); preço/sabor/foto/texto passam por rascunho -> prévia -> publicar |
| P2 | Login com dois passos (PIN por e-mail do Access + TOTP) é aceitável no celular? | sim; sessão Access 12 h reduz repetição; designer desenha as telas do TOTP e da recuperação |
| P3 | Código do pedido com 4 ou 5 caracteres | 5 (`NMD-7K3FQ`) |
| P4 | Limites de texto por bloco e paleta de cores de sabor no admin | designer define; viram esquema Zod |
| P5 | Fluxo de conflito "Recarregar / Sobrescrever" | designer desenha; dev implementa com `version` |
| P6 | Quem adiciona e-mail novo no Access: o próprio admin (token de API com escopo mínimo guardado como secret) ou o TL manualmente | manual no R1 (menos superfície); automatizar no R2 se houver rotatividade |
| P7 | Perfil `operacao` pode lançar entrada de mercadoria? | não no R2 (só sócio); revisar após piloto |
| P8 | Contingência estática permanente | aposentar; export de contingência só se o dono pedir |
| P9 | QA: ambiente de preview compartilhado (dados resetados a cada merge) é suficiente? | sim no R1; bancos efêmeros por PR se o limite da conta permitir |
| P10 | Dev: adaptador 14 estável x 15 beta | decidido no S1; preferir estável |

### 8.2 Decisões que dependem do dono

| # | Decisão | Impacto |
|---|---|---|
| D14 | **Aprovar B-CF** (este ADR) e aceitar ~6-7 semanas até o R1 completo (R1-zero em ~2 dias como ponte) | bloqueia início do R1 |
| D-CF | Mover o DNS do domínio para a Cloudflare (necessário para Workers, Access e Pages com domínio próprio) e criar a conta da empresa (não pessoal de dev) com 2FA | bloqueia R0/R1 |
| D-$ | Aceitar o gatilho de upgrade para Workers Paid **US$ 5/mês** se as métricas da seção 6.7 forem atingidas | evita pausa/erro por limite |
| D1 | E-mails com acesso ao admin e quem é `socio_admin` | bloqueia R1 |
| D9 | Artes de produto sem preço queimado | bloqueia go-live do R1 |
| D5, D13 | Momento da baixa (proposto: Confirmado) e contagem física inicial | bloqueiam R2 |
| D12, D16 | Manter `noindex`; parecer jurídico (inclui o risco de termos de uso do provedor de hospedagem) | recomendado antes do R3; bloqueante do R4 |
| D17 | Aceite formal de gateway com produto declarado | bloqueante do R4 |

---

## 9. Riscos

| # | Risco | Prob. | Mitigação |
|---|---|---|---|
| K1 | CPU > 10 ms no Workers Free (render frio, upload) | média | cache de rota, snapshot pronto no KV, sem hash de senha; medir no S1; gatilho US$ 5 |
| K2 | Teto rígido diário do D1 | baixa | loja lê KV, índices, `EXPLAIN` no CI, alerta a 50% |
| K3 | Adaptador Astro 7 + Cloudflare em mudança (14 x 15 beta, cache provider experimental) | média | versão exata fixada, spike, fallback TTL 60 s |
| K4 | Encerramento de conta por termos do provedor (produto) | **desconhecida** | jurídico (D16), portabilidade (4.9), backups fora do Worker |
| K5 | Sócio perde o celular com o autenticador | média | códigos de recuperação + outro sócio redefine TOTP (auditado) |
| K6 | Divergência KV x D1 após falha parcial | baixa | versão no KV comparada no painel "Saúde"; botão "Republicar versão atual"; cron reconcilia |
| K7 | Prazo do R1 maior que o de A | certa | R1-zero como ponte; R1a/R1b fatiados |

---

## 10. Resumo para o coordenador

- **Recomendação: B, direto, na Cloudflare** (Workers + D1 + KV + R2/Images + Access), custo mínimo **US$ 0/mês**, upgrade objetivo para **US$ 5/mês**. Vercel Pro + Supabase Pro (US$ 45/mês) e Netlify Free (pausa por créditos) descartados pela restrição de custo.
- Stack: TypeScript estrito, Astro 7 (`output: 'server'`, cache de rota invalidado ao publicar), Zod via `astro/zod`, Drizzle + D1 (SQLite), Access (PIN por e-mail, lista fechada) + TOTP próprio, auditoria append-only por trigger, estoque com `CHECK (qty >= 0)` em `batch` atômica, código `NMD-XXXXX`, migrações up/down, seed de `src/data`.
- Reaproveitado: todo `src/lib`, componentes, estilos e testes atuais; `catalog.ts`/`promos.ts` viram seed/fixture; `promo.ts` vira motor de campanhas.
- Prazos: R0 (Pages) dias; R1-zero 1,5 d; R1a ~5-6 semanas; R1b ~1 semana; R2 ~3-4 semanas; R3 ~2-3 semanas; R4 condicionado.
- `dist-static`: produção no R0, contingência por 30 dias após o R1, depois aposentado.

---

## 11. Fontes (consultadas em 03/10/2026)

- Cloudflare Workers - preços e limites: https://developers.cloudflare.com/workers/platform/pricing/ ; https://developers.cloudflare.com/workers/platform/limits
- D1 - teto rígido do Free desde 01/09/2026 e bundle 64 MiB: https://shattered.io/cloudflare-d1-free-tier-caps-workers-64mib-2026/ ; https://freetier.co/articles/cloudflare-d1-free-tier-limits-pricing-and-alternatives
- Cloudflare Images (5 mil transformações/mês grátis): https://developers.cloudflare.com/images/pricing ; R2 Free 10 GB: https://nubbo.app/blog/cloudflare-r2-free-tier/
- Cloudflare Access - PIN de uso único e Zero Trust Free (50 usuários): https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/ ; https://zerometric.net/research/cloudflare-zero-trust-free-plan-limits-2026/
- Astro 7 (route caching estável, CDN providers): https://astro.build/blog/astro-7/ ; adaptador Cloudflare: https://docs.astro.build/en/guides/integrations-guide/cloudflare/ ; https://www.npmjs.com/package/@astrojs/cloudflare
- Better Auth x limite de CPU do Workers Free (scrypt 73-170 ms): https://github.com/better-auth/better-auth/issues/8860
- Supabase 2026 (Free pausa em 1 semana; Pro US$ 25): https://uibakery.io/blog/supabase-pricing ; https://designrevision.com/blog/supabase-pricing
- Netlify Free (300 créditos, deploy 15 créditos, uso comercial permitido): https://toolchase.com/blog/netlify-pricing-guide/ ; https://temps.sh/compare/vs-netlify
- Vercel Hobby (uso não comercial) e Pro US$ 20/membro: informação do coordenador; confirmar em https://vercel.com/pricing
- Valores marcados "confirmar" devem ser checados no painel do fornecedor no dia da contratação.
