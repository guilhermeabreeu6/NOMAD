# 06 - QA - site-definitivo - RODADA DE CONSENSO

Data: 03/10/2026. Papel: QA sênior (`docs/squad-bot/agents/qa.md`). Branch: `docs/escopo-site-definitivo` (somente documentação).
Entrada: `00-briefing.md`, `02-po.md`, `03-design.md`, `04-tech-lead.md` (ADR-003), suíte atual (`tests/**`, `playwright.config.ts`,
`vitest.config.ts`, `.github/workflows/ci.yml`) e `docs/squad/site-mvp/06-qa.md`.

**Posição geral: CONCORDO com a arquitetura B-CF e com a estratégia de testes da seção 6.3 do TL, com RESSALVAS** em 6 pontos:
autenticação do admin em teste (o caminho de verificação do JWT precisa ser exercitado de verdade, não contornado), isolamento do
banco nos E2E (sem preview compartilhado no CI), regressão visual (baseline formal da v0.2.0 antes de qualquer mudança), cache de
borda (risco de servir prévia/rascunho ou campanha vencida), o critério de a11y (hoje só bloqueia serious/critical) e a carga contra
o preview (consome a cota diária da mesma conta da produção). **DISCORDO** de um item do design: pular o gate 18+ na prévia.

### Linha de base real da suíte atual (executada hoje)
| Comando | Resultado |
|---|---|
| `npx vitest run` | **247 passed (247)**, 10 arquivos, 2,6 s |
| `npm run test:e2e` | **não executado até o fim**: a porta 4322 estava ocupada por outro processo local (PID 26588, `EADDRINUSE`). Não encerrei processo alheio. Fica pendente rodar a suíte E2E antes de gerar a baseline visual (seção 2.5). |

Fatos da suíte que pesam na estratégia:
- 13 specs E2E, projetos `vercel-mobile`, `static-mobile` (base `/loja/`) e `vercel-desktop`; **só Chromium**.
- `a11y.spec.ts` filtra apenas `serious`/`critical` (o TL escreve "0 violações": hoje não é isso que o CI garante).
- Fixtures falham em erro de console e em `securitypolicyviolation` (ótimo; precisa continuar valendo na loja SSR e no admin).
- `vitest.config.ts` coleta cobertura de `src/lib/**`, mas **sem limite mínimo** (o ">= 95%" do TL ainda não trava nada).
- Nenhum teste de screenshot existe. **Não existe tag `v0.2.0` no git**: a v0.2.0 corresponde ao commit `b2adaa5`
  (`package.json` 0.2.0). Pedido ao coordenador: criar a tag antes de qualquer commit do R1-zero.
- O relógio é injetável no cliente (`page.clock`) e em `src/lib` (instantes em `tests/instants.ts`); **no servidor ainda não existe**
  relógio injetável: sem isso, campanhas, expiração de pedidos e sessão não são testáveis de forma determinística.

---

## 1. Testabilidade dos critérios Gherkin do PO (`02-po.md`, seção 6)

Leitura geral: os critérios são bons, concretos e quase todos automatizáveis. Abaixo, só o que está **ambíguo, conflitante com
TL/design ou não testável como escrito**, com redação proposta. Itens marcados **[conflito]** precisam de decisão na rodada.

### 1.1 Acesso ao admin (6.1)
| # | Cenário | Problema | Redação proposta |
|---|---|---|---|
| T1 | Login de sócio autorizado | **[conflito]** "senha (ou link mágico)" não existe no plano do TL (PIN de uso único por e-mail do Access + TOTP do app). | "Quando informo meu e-mail, o código recebido por e-mail e o código do app autenticador / Então entro no painel / E vejo meu nome e o botão 'Sair'". |
| T2 | Primeiro acesso (falta) | Cadastro do TOTP com QR e 10 códigos de recuperação não tem cenário. | Adicionar: "Dado primeiro acesso / Então sou obrigado a cadastrar o autenticador antes de ver qualquer tela / E recebo 10 códigos de recuperação exibidos uma única vez"; e "Quando uso um código de recuperação / Então entro e o código não funciona de novo". |
| T3 | E-mail não autorizado | Testável só em parte: o passo do PIN é do Access (fora do nosso código). | Separar em dois: (a) **provedor** (verificação manual no preview, checklist por release): e-mail fora da lista recebe a mesma tela do Access, sem revelar existência; (b) **app** (automatizado): "Dado JWT válido de e-mail sem conta ativa / Então 403 com 'Não foi possível entrar', nenhuma tela do admin, evento `auth.denied` na auditoria". |
| T4 | Muitas tentativas | "mesmo e-mail **ou origem**" e "temporariamente" são vagos; o TL não guarda IP (LGPD) e bloqueia só o TOTP por usuário. | "Dado 5 códigos do autenticador errados em 15 min para o mesmo usuário / Quando tento o 6º (mesmo correto) / Então vejo 'Muitas tentativas. Tente de novo às HH:MM' / E o bloqueio dura 15 min / E o evento `auth.totp_fail`/bloqueio é registrado". Bloqueio do PIN = regra do Access, verificado manualmente. Bordas: 4 erros + 1 acerto entra; erro nº 5 aos 14:59 conta; aos 15:01 não conta. |
| T5 | Sessão expirada | Existem **duas** sessões (Access 12 h e app 30 min/12 h). O cenário não diz qual. "Sem perder o que digitei" precisa de alvo. | "Dado 31 min sem atividade no app / Quando ativo 'Salvar' / Então vejo o modal de sessão expirada / E após entrar de novo o formulário volta com os valores digitados / E nada foi salvo nem publicado antes da nova autenticação". Mais: "aviso 2 min antes com 'Continuar conectado'" (design 5.7, WCAG 2.2.1) e "12 h absolutas encerram mesmo com atividade". |
| T6 | Endereço não público | Testável. Precisa de alvo verificável. | "Nenhuma página da loja contém link ou referência a `painel.`; `painel.*` responde `X-Robots-Tag: noindex, nofollow` em **todas** as rotas, inclusive 403/404; a loja responde 404 em `/admin/**`." |
| T7 | Não existe cadastro aberto | "Quando procuro qualquer forma" não é verificável. | "A única operação que cria conta é `users.create`, permitida só a `socio_admin`; teste que enumera rotas/Actions comprova que nenhuma outra cria `admin_user`; `operacao` e anônimo recebem 403." |
| T8 | Perfil operação (R2) | Testável; "inclusive pelo endereço direto" ótimo. | Acrescentar "e por chamada direta da Action (POST)", não só navegação. |
| T9 | Auditoria | Testável. | Acrescentar: "inclusive tentativas negadas (`access.forbidden`) e login". |
| T10 | (TL 4.2) "operacao: auditoria só dos próprios pedidos" | Pedido não tem "dono": **ambíguo**. | PO/TL definir: "operação vê o histórico de eventos dos pedidos (todos), nunca a auditoria de catálogo/usuários". |

### 1.2 Catálogo (6.2)
| # | Cenário | Problema | Redação proposta |
|---|---|---|---|
| T11 | Alterar preço | "passa a usar R$ 115,00" sem prazo e sem o caso do pedido em voo. | "...em até 1 min após 'Publicado' (M2-B), ao recarregar". Novo cenário R2: "Dado carrinho com preço antigo / Quando envio e o servidor responde `catalog_changed` / Então vejo os novos valores **antes** de abrir o WhatsApp e confirmo de novo". |
| T12 | Preço inválido | Faltam bordas e formatos aceitos (design aceita "110", "110,00", "110.00"). Máximo do banco (R$ 100.000,00) não tem mensagem. | Acrescentar exemplos: `1.100,00` (aceito = 1100,00), `110.5` (aceito = 110,50), ` 110 ` (aceito), `0,00` (erro), `0,01` (aceito), `100000,01` (erro "Preço acima do permitido"), `1e3` e `R$ 110` (definir: aceito ou erro). |
| T13 | Preço fora do comum | "acima de 50%" deixa a borda aberta. | Tabela: de 110,00 para 165,00 (= +50%) **não** pede; 165,01 pede; 55,00 (= -50%) não pede; 54,99 pede. |
| T14 | Nome de sabor duplicado | O TL normaliza também **acentos** e espaços internos; o PO só cita maiúsculas/espaços. | Exemplos: "icy mint", "  Icy  Mint ", "ÍCY MINT" = duplicado; "Icy Mint 2" = válido. Sabor removido (lógico) **libera** o nome. |
| T15 | Remover sabor em carrinhos | Testável. | Ok; incluir modelo inteiro removido/oculto. |
| T16 | Trocar foto | "otimizada" e "sem salto de layout" vagos; "pelo celular" não automatizável. | "...a loja serve WebP/AVIF nas larguras 360/720/1080 com `width`/`height` declarados, peso <= limite da seção 4.2 do design, CLS do card = 0 / E o arquivo publicado não contém EXIF/XMP/GPS (verificado lendo os bytes)". Celular real = checklist manual. |
| T17 | Foto inválida | Falta lista objetiva. Borda dos 10 MB. Bomba de descompressão. | Exemplos: `.exe` renomeado `.jpg`, SVG, GIF, HEIC, PDF, PNG 10.485.761 bytes (erro), 10.485.760 (aceito), 599 px (erro), 600 px (aceito), PNG 20000x20000 com poucos KB (erro: "dimensão máxima" a definir, sugiro 8000 px). Validação **também no servidor** (POST direto, sem o canvas do navegador). |
| T18 | Prévia | Testável. Faltam: prévia não acessível sem sessão; prévia nunca cacheada. | "Dado o link da prévia aberto sem sessão / Então 401/redireciona ao login"; "a resposta da prévia tem `Cache-Control: no-store`". |
| T19 | Publicar | "N minutos" precisa de número. | B: "Pode levar até 1 minuto". Medição de M2: script no **preview** (cache de borda real) mede publicar -> HTML novo; meta p95 <= 60 s em 10 repetições. |
| T20 | Desfazer | "versão anterior" ambígua após vários desfazer. | "Voltar para a versão anterior cria a publicação N+1 com o conteúdo de N-1; desfazer de novo volta ao conteúdo de N; nenhuma versão é apagada". |
| T21 | Dois sócios | Testável (2 contextos). | Acrescentar "'Salvar por cima' registra na auditoria o antes (versão de A) e o depois (de B)". |

### 1.3 "Em falta no estoque" (6.3)
| # | Cenário | Problema | Redação proposta |
|---|---|---|---|
| T22 | Marcar sabor em falta (R1) | **[conflito]** PO: "marca **e publica**"; TL P1: **imediato** sem publicar; design 5.3: fluxo único Salvar -> Publicar no R1 (e "na hora" só no B). | Ver posição em 4 (P1). Se imediato: "Quando o sócio ativa 'Em falta no estoque' / Então em até 1 min a loja mostra o estado, sem 'Publicar' / E aparece 'Desfazer' por **N s** (alinhar: design diz 8 s, TL diz 10 s)". |
| T23 | "anunciado por leitor de tela" | Automatizável só por proxy. | Automático: radio `disabled` e nome acessível contém "Em falta no estoque". Manual por release: TalkBack (Android) e VoiceOver (iOS). |
| T24 | Sabor entrou em falta entre abrir e enviar | Há janela de cache (`/api/disponibilidade` `max-age=15` + borda). Sem tolerância o teste fica intermitente e o PO pode reprovar um sistema correto. | "Dado um sabor marcado em falta **há mais de 60 s** / Quando ativo 'Enviar' / Então o WhatsApp não abre". Abaixo de 60 s, o atendimento resolve (aviso de "sujeito à confirmação"). |
| T25 | Falha ao consultar disponibilidade | Testável (abortar rota). | Ok. Adicionar o par do R2: "Dado `POST /api/pedidos` falhou / Então o WhatsApp abre com a linha 'Pedido sem código - confirmar no atendimento'" (está no TL 2.2, falta no PO). |
| T26 | Ordem dos sabores | Design: em falta vão para o **fim** da lista; card de modelo inteiro em falta mantém a ordem. Não está no PO. | Incorporar ao PO como critério (afeta testes de ordem que hoje travam a ordem do `CLAUDE.md`). |
| T27 | Quantidade acima do saldo | Testável. | Acrescentar: "saldo caiu abaixo do que está no carrinho -> linha reduzida ao saldo com aviso, nunca a 0 em silêncio; saldo 0 -> regra RE8". |

### 1.4 Estoque com contagem (6.4)
| # | Problema | Redação proposta |
|---|---|---|
| T28 | A tabela de efeitos só tem transições **válidas**. | Acrescentar exemplos negativos (efeito: bloqueado, saldo inalterado): Enviado->Entregue, Enviado->Pago, Expirado->Confirmado, Cancelado->Confirmado, Pago->Cancelado, Entregue->Cancelado, Confirmado->Confirmado (clique duplo). PO decide: Confirmado->Não entregue sem "Saiu" é permitido? (TL: não). |
| T29 | Expiração (H25/D7) sem Gherkin. | "Dado pedido Enviado há 24 h / Então vira Expirado pelo sistema (ator 'sistema') / E pedido Confirmado nunca expira". Borda: 23:59:59 não expira. |
| T30 | Carga inicial | "Dado o go-live do R2 com sabor sem saldo informado / Então ele aparece 'Em falta no estoque' na loja" - é **testável e perigoso**: se a carga não for feita, a loja inteira aparece em falta. Acrescentar critério de go-live: "o deploy do R2 só é promovido com 100% dos sabores visíveis com carga inicial" (checagem automática no `deploy.yml`). |
| T31 | Ajuste para menos | Falta: "ajuste que deixaria saldo negativo é bloqueado com a mensagem do saldo atual". |

### 1.5 Pagamento (6.5 e 6.6)
| # | Problema | Redação proposta |
|---|---|---|
| T32 | "Nenhum dado de cartão" não é verificável como frase. | Critérios verificáveis: nenhum `input` com `autocomplete="cc-*"` ou nome/rótulo de cartão/CVV na loja e no admin (varredura E2E); nenhuma coluna `pan/cvv/card_number/validade` no esquema (teste de esquema); `Permissions-Policy: payment=()` presente. |
| T33 | "Contorno de compliance é recusado" (6.6) é processo, não teste. | Mover para o DoD/checklist de revisão de PR. O testável: "build falha com `PAYMENTS_ONLINE=on` sem `docs/compliance/pagamento-liberado.md`" e "o admin não tem nenhum controle de pagamento online". |
| T34 | Demais cenários do R4 | Fora de calendário; não entram na matriz agora. |

### 1.6 Regiões (6.7)
| # | Problema | Redação proposta |
|---|---|---|
| T35 | "Desativar região escolhida por um cliente": hoje a região **não é persistida** (só `nomad:cart:v1`). "Salva no checkout" é ambíguo. | Definir: "Dado o checkout aberto com 'Taquari' selecionada / Quando o catálogo recarregado não tem mais 'Taquari' / Então a seleção é limpa com aviso 'A região Taquari não está mais disponível. Escolha de novo.'" (sem nova persistência). |
| T36 | Taxa inválida | Acrescentar máximo (TL: R$ 1.000,00) e "0,00" (permitido? = entrega grátis fixa). PO decide. |

### 1.7 Campanhas (6.8)
| # | Problema | Redação proposta |
|---|---|---|
| T37 | "01/11 00:00 a 30/11 23:59" x regra `[início, fim)`: 30/11 23:59:30 está dentro ou fora? | Interface pede "último dia (inclusive)" e grava fim = 01/12 00:00 Palmas. Bordas automatizadas no padrão de `tests/instants.ts` (B1-B4) para cada campanha. |
| T38 | "o banner some, sem nova publicação" + cache de rota (`maxAge 60`, `swr 600`): HTML de borda pode mostrar campanha **vencida** por até ~11 min. | Critério: "a fase da campanha (banner, landing, taxa no checkout e na mensagem) é resolvida pelo relógio do navegador no carregamento e no envio (padrão de outubro); o total enviado nunca usa campanha encerrada". Em R2, o servidor recalcula e é a autoridade. |
| T39 | Sobreposição: bordas encostadas. | "Campanha A termina 01/12 00:00 e B começa 01/12 00:00: permitido." |
| T40 | Slug | Exemplos negativos: `admin`, `api`, `previa`, `_astro`, `404`, `outubro` já usado, `Novembro`, `nov embro`, `a`, 31 caracteres. |
| T41 | Travas na landing | Testável: E2E em **cada** landing nos 3 estados (breve/ativa/encerrada). |

### 1.8 Travas (6.9) e textos (6.10)
| # | Problema | Redação proposta |
|---|---|---|
| T42 | "O admin não oferece opção" é negativa aberta. | Verificável em 3 camadas: (1) esquema do snapshot é estrito e **não tem** chaves `indexing`, `gate`, `legal`, `scripts`, `payments` (unit); (2) nenhuma Action aceita esses campos (teste de enumeração); (3) E2E: tela "Travas" só mostra cadeados, sem controle interativo. |
| T43 | Limite de tamanho "definido pelo design" | Já definido (design 3.7, 6.1, 6.2). Citar a tabela e testar paridade design = esquema Zod. |
| T44 | Links em texto | **[conflito]** TL: links `https:` e `wa.me`; design: "link interno" nas landings. Link externo arbitrário = phishing/propaganda fora de controle. | Proposta: só links internos e `wa.me` do número da loja. |
| T45 | Conteúdo perigoso | "HTML ou script" é pouco. | Corpus mínimo obrigatório (seção 2.9). Saída: texto literal na loja, landing, prévia, mensagem do WhatsApp **e nas telas do admin** (auditoria antes/depois, "O que vai mudar"). |

### 1.9 Requisitos não funcionais
| # | Problema | Proposta |
|---|---|---|
| T46 | Compatibilidade "últimas 2 versões de Chrome/Safari/Firefox/Edge, Android, iOS": o CI só roda Chromium. | Bloqueante: Chromium (mobile + desktop) + **WebKit mobile** (iPhone, suíte crítica da loja). Firefox: semanal, não bloqueante. Dispositivos reais: checklist manual por release (1 Android, 1 iPhone). |
| T47 | "Marcar em falta em até 4 toques a partir do login" | Definir ponto de partida = tela inicial do painel após TOTP; E2E conta interações. |
| T48 | M2 "<= 2 min no celular" | Aceite manual cronometrado com o sócio (já previsto); não é gate de CI. |
| T49 | M6 Lighthouse >= 90 | Lighthouse CI no preview, mediana de 3 execuções, perfil mobile; LCP/CLS como asserção, não só score. |

---

## 2. Posição sobre a estratégia de testes do TL (seção 6.3)

| Item | Posição | Resumo |
|---|---|---|
| Unit | **CONCORDO** | com limite de cobertura travado no config |
| Integração D1 local (Miniflare) | **RESSALVAS** | Miniflare não é o D1 real; precisa de contrato contra D1 real |
| E2E loja | **CONCORDO** | a suíte v0.2.0 inteira é o gate de regressão da migração |
| E2E admin + auth | **RESSALVAS** | testar o verificador de JWT real com chaves de teste; identidade de dev fora do bundle de produção |
| A11y (axe) | **RESSALVAS** | 0 violações de qualquer impacto nas telas novas; leitor de tela manual |
| Regressão visual | **CONCORDO com condições** | baseline da v0.2.0 congelada, em contêiner Linux, relógio fixo |
| Concorrência de estoque | **CONCORDO** | e ampliar com invariantes e corridas com o cron |
| Migrações ida/volta | **RESSALVAS** | comparar também triggers/índices e preservar dados |
| Contrato do snapshot KV | **CONCORDO** | e acrescentar compatibilidade N-1 e escape no HTML |
| Segurança | **RESSALVAS** | faltam: escape do JSON embutido, cache de prévia, XSS no admin, bomba de imagem |
| Carga leve | **RESSALVAS** | cota da conta é compartilhada com produção; medir CPU p99 |

### 2.1 Unit - CONCORDO
- Manter Vitest; travar `coverage.thresholds` (linhas >= 95%, ramos >= 90%) para `src/lib/**` e `src/schemas/**` no `vitest.config.ts`, rodando com cobertura no CI.
- Obrigatórios: `availability.ts` (tabela verdade completa de `visible × manual_out_of_stock × R2 × saldo`, modelo em falta só com todos os **visíveis**), `totals.ts` (o mesmo código no cliente e no servidor: teste de paridade com 200 carrinhos gerados por semente fixa, sem dependência nova), `order-code.ts` (formato, alfabeto sem I/L/O/U, colisão com RNG injetado -> 3 tentativas -> erro), conversor de Markdown restrito (corpus da 2.9), esquemas Zod (cada limite do design: 0, limite, limite+1, unicode/emoji contando como o design conta), CSP (`CSP_STORE`/`CSP_ADMIN`), travas de compliance, paridade `FLAVOR_TOKENS` x `--flavor-*`, **contraste dos tokens calculado a partir de `tokens.css`** (trava a tabela 2.10 do design sem ferramenta nova).
- Lint de "sem `Date.now()`" estendido a `src/server/**` (exceto um `clock.ts` de plataforma): serviços recebem o instante. Sem isso não há teste determinístico de sessão, campanha e expiração.

### 2.2 Integração com D1 local (Miniflare / `@cloudflare/vitest-pool-workers`) - RESSALVAS
Concordo com o escopo listado pelo TL (migrações, seeds, publicar/desfazer, auditoria imutável, tabela de efeitos, nunca negativo,
transições inválidas, `EXPLAIN QUERY PLAN`, enumeração de papéis). Ressalvas:
1. **Miniflare não prova o D1 real.** `changes()` dentro de `batch`, rollback por `CHECK` e o `_assert` são exatamente o que pode divergir.
   Exigir: o spike S2 vira um **teste de contrato** que roda contra um D1 real de teste (`nomad-ci`) em job **noturno** e antes de cada
   deploy de produção (não em todo PR, para não depender de segredo em PR de fork). Falha = deploy bloqueado.
2. **Concorrência no Miniflare é sequencial.** O teste "2 confirmações concorrentes" prova a lógica de `CHECK`, não a serialização real.
   A prova real fica na carga (2.11) contra o preview.
3. **Compatibilidade de versões:** `@cloudflare/vitest-pool-workers` precisa suportar o Vitest 5 do projeto. Verificar no S1; se não
   suportar, usar um `vitest.integration.config.ts` separado (projeto Vitest próprio), nunca rebaixar o Vitest da suíte unit.
4. Cada teste de integração começa com banco limpo (migrações + seed) e não depende de ordem.
5. Cron (`scheduled`) testado chamando o handler com instante fixo (expiração, reconciliação de `availability:current`).

### 2.3 E2E da loja - CONCORDO
- **Gate principal da migração:** as 13 specs atuais (gate, catálogo, carrinho, checkout, WhatsApp, promo, a11y, qa-edge) rodam **sem
  alteração de asserção** contra a loja SSR (`wrangler dev` com D1/KV locais semeados a partir de `src/data`). Qualquer ajuste de spec na
  migração precisa de justificativa no PR. Isso é o que garante "a loja não muda de comportamento".
- Rodar contra **workerd** (`wrangler dev`/preview do adaptador), não `astro dev`.
- Fixtures continuam falhando em erro de console e violação de CSP (e passam a detectar scripts injetados pela zona: Rocket Loader, Email Obfuscation, Web Analytics).
- Novos: `out-of-stock.spec.ts` (sabor/modelo/teclado/nomes acessíveis/ordem no fim/legend "4 DE 5"/chip "em falta"), carrinho com
  linha em falta e "Indisponível", recheque no envio com rota atrasada e com rota abortada, quantidade limitada ao saldo, pedido com
  código (R2), `409 catalog_changed`, `429`, `POST /api/pedidos` fora (envio sem código), degradação "Catálogo temporariamente indisponível".
- Projetos `static-*`: mantidos enquanto o alvo estático existir (R0 + 30 dias); removidos junto com o alvo (P8).

### 2.4 E2E do admin e autenticação (Access + TOTP) - RESSALVAS
O TL propõe identidade de dev (`DEV_AUTH_EMAIL`) habilitada só em `development|test`. Aceito como **conveniência para `npm run dev`**,
mas **não** como caminho dos E2E de segurança, porque pularia justamente o código mais crítico (verificação do JWT). Proposta:

1. **E2E exercita o verificador real.** No ambiente de teste, `ACCESS_TEAM_DOMAIN` aponta para um JWKS **de teste** servido localmente
   (par de chaves gerado no setup do teste, nunca versionado). O Playwright envia `Cf-Access-Jwt-Assertion` assinado com `aud`/`iss`
   corretos via `extraHTTPHeaders`. O código de produção é o mesmo; muda só a configuração.
2. **Negativos obrigatórios do JWT:** sem cabeçalho, expirado, `aud` errado, `iss` errado, `alg: none`, assinado por outra chave,
   e-mail sem conta, conta inativa, conta ativa com cabeçalho válido mas sem TOTP verificado -> sempre 403/redireciona, sem conteúdo do admin.
3. **TOTP em teste:** usuário de teste semeado com segredo conhecido; o teste calcula o código com a mesma biblioteca (`@oslojs/otp`)
   no instante real. Expiração de sessão (30 min/12 h) e bloqueio (15 min) testados **na integração** manipulando `last_seen_at`/
   `login_attempt` no D1 local, e no E2E com um único caso via script de seed (nunca por endpoint de teste exposto pelo Worker).
4. **Identidade de dev não pode chegar à produção** (3 travas, todas testadas): (a) o módulo de identidade de dev só é importado
   quando `import.meta.env.MODE` é `development|test` (removido do bundle de produção); teste que varre o bundle de produção e falha se
   encontrar `DEV_AUTH`; (b) o Worker em `ENVIRONMENT=production` responde 500 em todo o admin se `DEV_AUTH_EMAIL` existir; (c) o build de
   produção falha se a variável existir (já proposto pelo TL).
5. **O que não dá para automatizar no CI** (o próprio Access: PIN por e-mail, política de lista, bloqueio do PIN, sessão de 12 h):
   checklist manual no **preview** com aplicação Access real e uma conta de teste da squad, por release; mais um smoke automatizado
   diário: `painel.*` sem cookie do Access -> redireciona para `*.cloudflareaccess.com`; `*.workers.dev` e URLs de versão de preview -> sem admin.
6. Fluxos E2E do admin R1: entrar + cadastrar TOTP + códigos de recuperação; marcar em falta em <= 4 toques; editar preço com
   prévia/publicar/desfazer; validações H10; conflito em 2 contextos; upload válido/inválido; sessão expirada mantendo rascunho;
   permissões negadas (matriz 2.9). Viewport 390 px (prioridade, D10) e desktop.

### 2.5 Regressão visual por screenshot - CONCORDO com condições (exigência do dono)
1. **Baseline = v0.2.0 congelada.** Coordenador cria a tag `v0.2.0` em `b2adaa5`. A baseline é gerada desse commit, **antes** do R1-zero,
   com `toHaveScreenshot` do Playwright, e versionada em `tests/visual/__screenshots__/`. Gerar e comparar sempre no **mesmo contêiner
   Linux** (`mcr.microsoft.com/playwright:v<versão fixada>`), nunca no Windows local (fontes e antialiasing diferem).
2. **Determinismo:** relógio fixo (`SEM_PROMO`, `EM_OUTUBRO`, `B4` de `tests/instants.ts`), `reducedMotion: 'reduce'`, animações
   desligadas, fontes self-hosted carregadas (`document.fonts.ready`), carrinho/idade semeados via `localStorage`.
3. **Telas da baseline** (Pixel 7 = 412 px, 360 px e Desktop 1280 px): gate, gate recusado, home topo (hero + banner), cada um dos 4
   cards, ModelNav, carrinho com itens, checkout, checkout com erros, mensagem pós-envio, `/outubro` em breve/ativa/encerrada, 404,
   LegalStrip/rodapé. Tolerância: `maxDiffPixelRatio` <= 0,002 por tela.
4. **Regra da migração:** a loja SSR (R1) com o seed de `src/data` deve passar **na mesma baseline da v0.2.0**. Isso prova "não mudou a cara" através da troca de arquitetura.
5. **Mudanças legítimas** (estados novos de "em falta", fotos sem preço D9, banner editável) geram baselines **novas e separadas**,
   aprovadas pelo designer (e pelo dono quando muda algo visível do estado normal). Atualizar baseline existente exige rótulo no PR
   "visual-aprovado" + imagens antes/depois no PR. Nenhum `--update-snapshots` automático no CI.
6. O **Guia visual** do design (estados de componentes) também entra na regressão, mas **não substitui** as páginas reais.
7. Admin: baseline a partir da primeira versão aprovada pelo designer (não existe v0.2.0 do admin).

### 2.6 A11y (axe) na loja e no admin - RESSALVAS
- Hoje o CI só reprova `serious`/`critical`. Proposta: telas novas (admin, estados de estoque, prévia, landings de campanha) com
  **0 violações de qualquer impacto** nas tags `wcag2a/aa`, `wcag21a/aa` (e `wcag22aa` para alvos e foco); telas antigas mantêm o
  filtro atual até zerar os `moderate/minor` existentes (inventário no primeiro PR do R1). Exceção só por lista versionada com justificativa.
- Varredura em **todos os estados**, não só na carga da página: dialogs abertos, toasts, erros de formulário, em falta, prévia, sessão expirando.
- Testes funcionais de a11y que o axe não cobre (já é padrão da suíte): foco preso e devolvido, ordem de foco, `aria-describedby` do motivo,
  alvos >= 44 px, reflow 320 px, zoom 200%, `prefers-reduced-motion`, nada que dependa de arrastar.
- Manual por release: TalkBack e VoiceOver nos fluxos "comprar com sabor em falta no carrinho" e "marcar em falta no admin".

### 2.7 Concorrência de estoque - CONCORDO
Além do proposto (tabela de efeitos, disputa da última unidade, trigger de transições):
1. **Invariantes** checados após cada operação em teste de sequência aleatória com semente fixa (200 sequências de entrada/ajuste/
   transições): `qty >= 0`; `qty = soma(delta)` dos movimentos do sabor; `qty_after` do último movimento = `qty`; um pedido Confirmado
   tem exatamente um movimento `pedido_confirmado` por item; devolução no máximo uma vez.
2. **Corridas específicas:** confirmar 2x o mesmo pedido (clique duplo, mesma `version`) -> 1 sucesso, 1 `CONFLICT`, 1 baixa; confirmar x
   cron de expiração no mesmo pedido; cancelar 2x (sem devolução dupla); confirmar x ajuste negativo do sócio; confirmar pedido cujo sabor
   foi removido logicamente.
3. **Atomicidade:** falha forçada no meio da `batch` (ex.: `INSERT` de auditoria inválido) -> nada mudou (pedido, saldo, movimento, evento).
4. **Disponibilidade derivada:** após cada operação, `availability:current` no KV = recomputado do D1; falha de escrita no KV ->
   reconciliação pelo cron e indicador no painel "Saúde".
5. Prova com D1 real: k6 com 20 confirmações concorrentes do último item -> exatamente 1 sucesso, saldo 0 (2.11).

### 2.8 Migrações ida e volta - RESSALVAS
- up -> down -> up comparando `sqlite_master` **normalizado incluindo triggers e índices** (o trigger de auditoria é parte do contrato).
- **Preservação de dados:** aplicar a migração nova sobre um banco com seed + dados de fixture da release anterior (pedidos em todos os
  status, movimentos, publicações) e verificar contagens e invariantes depois.
- `down` só garante esquema em dev/preview; em produção o retorno é **Time Travel** (o TL já diz isso). Registrar no PR de migração.
- Compatibilidade de rollback de código: como o deploy de produção pode voltar o código mantendo a migração (expand-only), o job de
  integração roda o pacote de testes de repositório da release anterior contra o esquema novo nas releases com migração (R2, R3).
- Antes do deploy: aplicar a migração num D1 restaurado do último export de produção (dados sem PII de cliente) no `deploy.yml`.

### 2.9 Segurança - RESSALVAS (lista completa de casos obrigatórios)
**Autorização (A01).** Teste de enumeração: lista gerada do registro de Actions/rotas x {anônimo, JWT sem conta, conta inativa, sem
TOTP, `operacao`, `socio_admin`} -> resultado esperado da matriz 4.2 do TL. Rota/Action nova sem papel declarado = teste falha.
Host: a loja responde 404 em rotas do admin e o `painel.*` não serve a loja; `*.workers.dev` desligado (smoke).

**IDOR.** Pedido por `id`/`code` só com sessão; `orders.transition` com `id` de outro pedido e `version` antiga -> `CONFLICT`; mídia:
`/media/<sha>` serve só mídia **referenciada por publicação** (rascunho não vaza por adivinhação); `publish.rollback({ toVersion })`
com versão inexistente/negativa; `users.resetTotp` de outro sócio só por `socio_admin` e auditado; desativar o último `socio_admin` bloqueado.

**CSRF.** POST de origem cruzada para cada Action -> 403 (`checkOrigin`); cookie `__Host-` com `SameSite=Strict; Secure; HttpOnly`
(asserção de cabeçalho); nenhuma Action aceita GET.

**Cache (risco que não está na lista do TL).** Prévia, admin e qualquer resposta com sessão: `Cache-Control: no-store` **e** teste que
a loja pública, depois de abrir a prévia, nunca serve o rascunho (2 contextos + cache de rota ligado no preview). Resposta da loja não
varia por cookie do admin. Este é o pior cenário de qualidade: rascunho com preço errado servido a todos.

**Upload de imagem.** Tipo por assinatura de bytes (não por extensão nem `Content-Type`); poliglota (JPEG com HTML/JS anexado) é
reencodado ou recusado; SVG/HEIC/GIF recusados; 10 MB + 1 byte recusado **antes** de ler o corpo inteiro; bomba de descompressão
(dimensão máxima); EXIF/GPS ausente no arquivo **publicado** (teste lê os bytes); nome de arquivo ignorado (chave = sha256); `alt` < 3 recusado.

**XSS em textos editáveis.** Corpus aplicado a **todos** os campos (nome de modelo/sabor, descrições, textos, blocos da landing, rótulos
de região, nota de publicação, motivo de ajuste/cancelamento) e verificado em **todas** as saídas (loja, landing, prévia, mensagem do
WhatsApp, admin, auditoria antes/depois, tela "O que vai mudar", CSV): `<script>alert(1)</script>`, `"><img src=x onerror=alert(1)>`,
`</script><script>alert(1)</script>` (**crítico**: o TL embute dados em `<script type="application/json">`; exige escape de `<` como
`<`), `[x](javascript:alert(1))`, `[x](data:text/html,...)`, `[x](//evil.tld)`, `**<b>`, entidades `&lt;`, RLO/ZWSP/NUL/CRLF,
`{{7*7}}`, 10.000 caracteres. Esperado: texto literal, nenhum `securitypolicyviolation`, nenhum handler executado; Trusted Types ativo.

**Travas de conformidade não alteráveis.** Gate presente em `/`, em toda landing (3 estados) e na **prévia**; LegalStrip e texto legal
iguais ao código (unit); `noindex` em todas as rotas dos 2 hosts (header + meta + `robots.txt`); esquema do snapshot estrito sem chaves
de trava; CSP sem host externo; build falha com `PAYMENTS_ONLINE=on` sem evidência; `INDEXING` só por variável de ambiente.

**Outros.** `POST /api/pedidos`: corpo > 8 KB -> 413; campos desconhecidos recusados (Zod estrito: impede cliente gravar nome/telefone =
LGPD); preço/total enviados pelo navegador ignorados; 11ª requisição/min -> 429. `npm audit --omit=dev` (high/critical bloqueia);
varredura de segredos (push protection do GitHub + teste que `.dev.vars` está no `.gitignore`); cabeçalhos de segurança por host
travados em teste; aviso de termos sensíveis (design 6.3) com casos.

### 2.10 Contrato do snapshot KV - CONCORDO
- `PublicCatalogV1` estrito (`.strict()`), versão `v: 1`; todo snapshot publicado valida antes de ir ao KV (unit + integração).
- Fixtures de contrato com bordas: modelo sem foto (palco tipográfico), todos os sabores em falta, 0 campanhas, 1 região, textos no
  limite, unicode/emoji, 50 sabores (tamanho < 100 KB).
- **Compatibilidade N-1:** o código novo renderiza o snapshot da versão anterior (deploy de código antes da próxima publicação) e o
  código antigo ignora campos novos opcionais. Mudança incompatível = `v: 2` + migração de snapshot.
- `sha256` gravado = hash do conteúdo; `ETag` de `/api/catalogo` = `version`; `availability:current.version` coerente com a publicação.
- O renderizador da loja trata snapshot ausente/inválido com a página de degradação (nunca preço embutido no bundle).

### 2.11 Carga leve dentro dos limites free - RESSALVAS
- Cenários do TL ok (20 req/s 2 min na loja; 10 pedidos/s 1 min; 20 confirmações concorrentes do último item).
- **Cota é por conta:** 100 mil req/dia do Workers Free e as escritas diárias do D1 (teto rígido) são compartilhadas entre preview e
  produção. A carga roda **fora do horário de pico**, nunca contra produção, com orçamento declarado (~5 mil requisições por execução)
  e cancelamento automático se o uso diário da conta passar de 50%.
- **Medir o risco K1:** a saída obrigatória do teste de carga é a CPU p50/p99 por rota (Workers Analytics). Meta: p99 < 8 ms no render
  frio da loja e nas Actions do admin; upload medido à parte. Acima disso, acionar o gatilho de US$ 5 antes do go-live.
- k6 é binário externo (não entra no `package.json`); execução manual por release, relatório anexado ao QA da release.

---

## 3. Matriz de riscos de qualidade e quality gates

### 3.1 Riscos por release (P = probabilidade, I = impacto; A/M/B)
| Release | Risco de qualidade | P | I | Mitigação / teste |
|---|---|---|---|---|
| **R0** (Pages) | `.htaccess` publicado como arquivo; `_headers` sem CSP/`noindex` | M | A | teste do alvo `pages` (cabeçalhos gerados = `src/data/csp.ts`), smoke no domínio |
| R0 | Zona injeta scripts (Rocket Loader, e-mail, analytics) e quebra a CSP | M | M | smoke E2E no domínio com fixture de CSP; checklist da zona |
| R0 | Domínio indexado por engano | B | A | smoke diário: header + meta + `robots.txt` |
| **R1-zero** | Estado "em falta" altera visual/ordem e quebra testes que travam a ordem do `CLAUDE.md` | A | M | baseline visual v0.2.0 tirada **antes**; testes de ordem adaptados à regra "em falta no fim" com aprovação do PO |
| R1-zero | Carrinho salvo com sabor em falta: remoção silenciosa | M | A | E2E com `localStorage` semeado |
| **R1a** | Bypass do admin (rota/host/workers.dev, identidade de dev em produção) | M | **Crítico** | 2.4 e 2.9; smoke diário |
| R1a | Rascunho/prévia servido no cache público | M | **Crítico** | teste de cache em 2 contextos no preview |
| R1a | XSS armazenado via nome de sabor (incl. quebra do JSON embutido) | M | A | corpus 2.9 em todas as saídas |
| R1a | Regressão visual/comportamental na troca estático -> SSR | A | A | suíte E2E v0.2.0 inalterada + baseline visual v0.2.0 |
| R1a | Purga por tag não funciona: M2 (<= 1 min) violado | M | M | medição no preview (T19); fallback TTL 60 s |
| R1a | CPU > 10 ms no Free (render frio, upload) | M | A | medição no S1 e na carga (2.11) |
| R1a | Adaptador 14/15 instável; upgrade quebra | M | M | versão exata; Dependabot passa por toda a suíte (inclui visual) |
| R1a | Fotos D9 atrasadas: card com preço queimado contradiz texto | A | A | critério de go-live; palco tipográfico testado |
| R1a | Sócio trancado (perdeu celular, PIN não chega) | M | M | códigos de recuperação testados; reset por outro sócio auditado; checklist manual |
| **R1b** | Região desativada deixa checkout inconsistente | M | M | T35 |
| R1b | Troca do número do WhatsApp errada = pedidos perdidos | B | **Crítico** | confirmação dupla + link de teste; E2E; smoke diário compara número da mensagem com o configurado |
| **R2** | Estoque negativo / baixa dupla / devolução dupla | M | A | 2.7 + contrato D1 real |
| R2 | Go-live sem carga inicial = loja inteira "em falta" | M | **Crítico** | checagem automática no `deploy.yml` (T30) |
| R2 | Divergência KV x D1 (vitrine mente) | B | A | reconciliação, painel "Saúde", teste de falha de escrita |
| R2 | Total do pedido no servidor != total na tela | M | A | paridade `totals.ts`, `409 catalog_changed` |
| R2 | Teto diário do D1 (consulta sem índice) | B | A | `EXPLAIN QUERY PLAN` no CI, alerta 50% |
| R2 | Expiração pelo cron erra o fuso/borda | M | M | relógio injetado, bordas 24 h |
| R2 | PII gravada por cliente via campos extras | B | A | Zod estrito + teste de esquema sem colunas de PII |
| **R3** | Campanha vencida em cache mostra/cobra frete grátis | M | A | T38: fase resolvida no cliente e no servidor; bordas B1-B4 por campanha |
| R3 | Sobreposição/região sem decisão publicada | M | M | testes de serviço e Gherkin T39 |
| R3 | Landing sem gate/aviso legal; texto de propaganda proibido | B | **Crítico** | E2E das travas em toda landing; aviso de termos sensíveis |
| R3 | Slug de campanha sequestra rota reservada | B | A | T40 |
| R3 | Agendamento (H33) aplica no horário errado | M | M | relógio injetado no cron |

### 3.2 Quality gates obrigatórios no CI (bloqueiam merge em `main`)
Branch protection em `main`: todos os checks abaixo + revisão do coordenador. Jobs em paralelo para caber em ~15 min.

| # | Gate | Desde | Bloqueia? |
|---|---|---|---|
| G1 | `npm run lint` (inclui `no-restricted-imports`, sem `Date.now()` fora do relógio, sem SQL concatenado; stylelint de cor literal) | já / R1 | sim |
| G2 | `npm run typecheck` | já | sim |
| G3 | Unit com cobertura mínima (`src/lib` linhas >= 95%, ramos >= 90%; `src/schemas` >= 95%) | R1-zero | sim |
| G4 | Integração (workerd + D1/KV/R2 locais): estoque, transições, auditoria, publicar/desfazer, enumeração de papéis, `EXPLAIN` | R1a | sim |
| G5 | Migrações up/down/up + preservação de dados + triggers | R1a | sim (se o PR toca `migrations/`, obrigatório) |
| G6 | Contrato do snapshot (fixtures, estrito, N-1) | R1a | sim |
| G7 | Build de produção do Worker + verificação do bundle (sem `DEV_AUTH`, sem segredo, flag de pagamento) | R1a | sim |
| G8 | E2E loja: suíte v0.2.0 inalterada + estados novos; Chromium mobile/desktop + **WebKit mobile** (caminho crítico) | já / R1 | sim |
| G9 | E2E admin: fluxos R1 + permissões negadas + JWT negativo | R1a | sim |
| G10 | A11y: axe conforme 2.6 (0 violações nas telas novas) | já / R1 | sim |
| G11 | Regressão visual contra baseline aprovada | R1-zero | sim (atualização só com rótulo "visual-aprovado") |
| G12 | Segurança automatizada: cabeçalhos por host, CSRF, corpus XSS, upload, travas de compliance | R1a | sim |
| G13 | `npm audit --omit=dev` sem high/critical | R1-zero | sim |
| G14 | Sem `test.only`, sem novo `test.skip`/`test.fail` sem bug registrado | já | sim |
| G15 | Lighthouse CI no preview (mobile >= 90, LCP <= 2,5 s, CLS <= 0,1) | R1a | sim para PR que toca a loja; informativo nos demais |

Fora do merge (bloqueiam **deploy de produção** em `deploy.yml`): contrato contra D1 real (2.2), migração sobre cópia do export de
produção (2.8), carga inicial completa no R2 (T30), smoke pós-deploy com rollback automático.
Não bloqueantes (alerta): Firefox semanal, smoke diário em produção, k6 por release (relatório obrigatório no QA da release).

---

## 4. Posição sobre P1-P10 (TL 8.1) e perguntas do designer

| # | Ponto | Posição QA | Motivo / condição |
|---|---|---|---|
| P1 | "Em falta" imediato x publicar | **CONCORDO com imediato** | Reduz janela de pedido impossível (M2, M3). Condições: só a disponibilidade é imediata (preço/foto/texto seguem rascunho -> prévia -> publicar); auditoria por ação; Desfazer com **um** prazo único (design 8 s x TL 10 s: escolher; sugiro 10 s com o mesmo item também revertível no histórico, por WCAG 2.2.1); a tela "O que vai mudar" não lista estoque. PO reescreve o Gherkin T22; design atualiza 5.3. |
| P2 | Login em 2 passos no celular | **CONCORDO** | Testar recuperação e reset no E2E; PIN do Access em checklist manual (entrega do e-mail, caixa de spam). |
| P3 | Código com 5 caracteres | **CONCORDO** | PO atualiza exemplos `NMD-7K3F` -> `NMD-7K3FQ` (hoje os Gherkin quebrariam a regex do banco). |
| P4 | Limites de texto e paleta como esquema | **CONCORDO** | Teste de paridade tabela do design = Zod; contraste da paleta calculado em unit. |
| P5 | Conflito Recarregar/Sobrescrever | **CONCORDO** | E2E em 2 contextos; auditoria do "por cima". |
| P6 | E-mail novo no Access manual no R1 | **CONCORDO** | Risco: lista do Access e `admin_user` divergirem. Mitigação testada: conta desativada no app = 403 mesmo com JWT válido, e sessões revogadas na hora. Checklist de conferência mensal das duas listas. |
| P7 | Operação sem entrada de mercadoria no R2 | **CONCORDO** | Menor privilégio; entra na matriz de autorização. |
| P8 | Contingência estática | **CONCORDO com aposentar**, com ressalva | Durante os 30 dias, a contingência precisa de smoke (contingência não testada = inexistente). Depois, remover alvo, projetos `static-*` e zip juntos. Se o dono quiser contingência permanente, ela entra na suíte. |
| P9 | Preview compartilhado para QA | **RESSALVAS** | No CI, E2E e integração **nunca** usam o preview compartilhado (corridas entre PRs = testes intermitentes); cada job sobe D1/KV locais isolados. O preview compartilhado serve a exploração manual, Lighthouse, medição de M2 e carga. Banco efêmero por PR só para PRs com migração. |
| P10 | Adaptador 14 estável x 15 beta | **CONCORDO com estável** | Versão exata; upgrade só com a suíte inteira verde, incluindo visual e contrato D1 real. |

**Perguntas do designer (seção 9), pela ótica de qualidade:**
| Pergunta | Posição |
|---|---|
| TL 2 - Guia visual + regressão por screenshot | **CONCORDO**. Preferência: rota só em build de dev/test (fora do bundle de produção = menos superfície); se ficar no admin, atrás de login e `noindex`. Complementa, não substitui, as páginas reais (2.5). |
| TL 3 - Lint de cor literal; sincronizar `FLAVOR_TOKENS` x `--flavor-*`; tokens `--z-*` | **CONCORDO**. Paridade por teste unit; renomeação de `--z-*` coberta pela baseline visual (diferença zero esperada). |
| TL 4 - Prévia pula o gate 18+ | **DISCORDO**. Um caminho de código que desliga o gate é exatamente uma trava de compliance; se existir, pode vazar. A prévia é servida no host da loja: o sócio confirma a idade uma vez e o `localStorage` lembra. Gate presente na prévia vira teste. |
| TL 5 - Estoque publica na hora | = P1 (concordo). |
| TL 6 - Pipeline de imagem (PNG com alfa, EXIF, AVIF/WebP) | **CONCORDO**; testes de 2.9 (upload) e T16. |
| TL 7 - Limites no esquema | = P4. |
| TL 8 - CSP própria do admin | **CONCORDO**; testes de cabeçalho por host e fixture de CSP também no admin. |
| PO 1 - H10 x palco tipográfico na transição de fotos | Prefiro **permitir o palco tipográfico** como estado explícito e testado (com baseline visual própria) a bloquear a publicação; decisão do PO. |
| PO 2 - Termos sensíveis: aviso ou bloqueio | Qualquer das duas é testável; se for aviso, a auditoria registra "publicado apesar do aviso". Decisão do PO/jurídico. |
| PO 3 - Duas campanhas ativas: vale a mais recente | Ok, testável; mas frete grátis já impede sobreposição. Precisa de critério Gherkin se H34 entrar. |
| PO 4 - CartFab conta só linhas disponíveis | Ok, testável; incluir no Gherkin de 6.3. |
| Dono 2 - Sabores em falta no fim da lista | Testável; impacto nos testes atuais de ordem (T26). |

**Divergências encontradas entre documentos (precisam ser fechadas nesta rodada):** login com senha (PO) x PIN+TOTP (TL); bloqueio
por "origem" (PO) x por usuário (TL); "marca e publica" (PO) x imediato (TL) x Salvar->Publicar no R1 (design); Desfazer 8 s (design)
x 10 s (TL); código de 4 (PO) x 5 caracteres (TL); links `https:` (TL) x só internos (design); "0 violações" (TL) x filtro
serious/critical (suíte); "auditoria só dos próprios pedidos" (TL) sem definição de dono do pedido; região "salva" (PO) x não
persistida (código atual).

---

## 5. Definition of Done de qualidade - site definitivo

Uma história/PR só está **pronta** quando:
1. Todo critério Gherkin da história tem teste automatizado ligado na matriz `critério -> teste -> status` do `docs/squad/site-definitivo/07-qa-<release>.md` (ou justificativa de teste manual com evidência).
2. Gates G1-G15 aplicáveis verdes no CI; nenhum `skip`/`only` novo; `test.fail` só com bug registrado.
3. Casos de borda do checklist sênior cobertos: vazio, mínimo, máximo, máximo+1, unicode/emoji, entrada hostil, concorrência (quando grava dado), permissão negada.
4. Regressão: suíte E2E v0.2.0 verde **sem alterar asserções** (ou alteração aprovada por PO/designer no PR); diferença visual zero contra a baseline aprovada, ou nova baseline com rótulo "visual-aprovado".
5. A11y: axe conforme 2.6 em todos os estados novos; teclado e foco verificados; nada só por cor.
6. Segurança: rota/Action nova declara papel e entra na matriz; entrada validada por Zod no servidor; saída escapada; sem segredo no código; cabeçalhos por host intactos.
7. Travas de compliance: gate, aviso legal, `noindex`, CSP sem terceiros, pagamento online desligado - todos os testes verdes; nenhuma trava ligável pelo admin.
8. Dados: migração com down testado, preservação de dados e triggers; snapshot válido e compatível N-1; nenhuma coluna de PII de cliente.
9. Desempenho: Lighthouse no preview dentro do M6 para PR que toca a loja.

Uma **release** (R1a, R1b, R2, R3) só vai para produção quando, além do acima:
10. Execução real e completa registrada no QA da release (comandos, contagens, duração), com veredito APROVADO/REPROVADO.
11. Checklist manual executado no preview: Access real (PIN, lista, bloqueio), TalkBack + VoiceOver, 1 Android + 1 iPhone reais (inclusive mensagem do WhatsApp real com `+`, acentos e quebras), Firefox.
12. Carga leve (2.11) com CPU p99 dentro da meta e relatório anexado.
13. Contrato contra D1 real verde; restauração de backup ensaiada (export -> D1 de staging -> smoke).
14. Revisão de segurança do TL aprovada; sem bug aberto de severidade Crítica ou Alta; Médios com plano e data.
15. Aceite com o dono/sócio: M2 cronometrado no celular (R1); piloto de 1 semana com contagem física e carga inicial 100% conferida (R2); parecer jurídico sobre propaganda registrado como ciente (R3).
16. Smoke de produção pós-deploy verde e smoke diário ativo; contingência (enquanto existir) com smoke.

---

## Veredito desta rodada
**CONCORDO COM RESSALVAS** com o plano B-CF e a estratégia de testes. Os 3 maiores riscos de qualidade: (1) **bypass/vazamento do
admin**, incluindo identidade de dev em produção e rascunho/prévia servidos pelo cache público; (2) **regressão visual e
comportamental na troca estático -> SSR**, que só é controlável com baseline v0.2.0 congelada antes do R1-zero e a suíte E2E atual
rodando inalterada; (3) **integridade do estoque no R2** (D1 real x Miniflare, carga inicial incompleta deixando a loja "em falta",
divergência KV x D1).
