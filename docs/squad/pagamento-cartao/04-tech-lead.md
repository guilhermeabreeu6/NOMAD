# 04 - Tech Lead - pagamento-cartao (NOMAD puffs) - ADR-002: pagamento online com cartão

Status: **Proposto -> RECOMENDAÇÃO: NÃO IMPLEMENTAR** (bloqueado por risco regulatório e contratual; ver seção 1).
Data: 03/10/2026. Entrada: briefing do coordenador, `CLAUDE.md`, `docs/squad/site-mvp/04-tech-lead.md` (ADR-001), `vercel.json`, `src/data/csp.ts`, `src/lib/*`, pesquisa pública (fontes na seção 6).
Escopo pedido: aceitar cartão de débito/crédito **online** no site, hoje 100% estático, com pedido fechado no WhatsApp e pagamento PIX/débito/crédito **na entrega** (maquininha).

> Este documento não é parecer jurídico. As conclusões da seção 1 são de risco técnico-contratual, com base em textos públicos; a decisão final exige advogado(a).

---

## 0. Decisão em uma frase

**Não integrar gateway de cartão online.** O produto vendido (pods descartáveis = dispositivo eletrônico para fumar) tem comercialização e propaganda proibidas no Brasil pela RDC Anvisa nº 855/2024, e os contratos dos credenciadores/gateways brasileiros proíbem transacionar produtos proibidos por lei (alguns citam tabaco expressamente). O credenciamento honesto tende a ser recusado; um credenciamento que esconda o produto seria fraude. O investimento técnico (4-6 semanas) não tem como se pagar com risco tão alto de bloqueio e retenção de saldo. Próximo passo recomendado: **consulta jurídica sobre a operação como um todo**, não só sobre o pagamento.

---

## 1. Risco regulatório e contratual (ponto crítico)

### 1.1 Regulação sanitária e fiscal (verificado em fontes públicas, out/2026)

| Norma / fato | O que diz | Impacto aqui |
|---|---|---|
| **RDC Anvisa nº 855, de 23/04/2024** (em vigor desde 02/05/2024; revogou a RDC 46/2009) | proíbe **fabricação, importação, comercialização, distribuição, armazenamento, transporte e propaganda** de dispositivos eletrônicos para fumar, incluindo descartáveis, "pods" e "vapes", e seus acessórios/refis | a atividade-fim da loja está no núcleo da proibição. Site, landing e banner de promoção são "propaganda" |
| **IN RFB nº 2.229/2024** (vigência 26/10/2024) | estabelecimento encontrado "vendendo, exibindo, guardando ou transportando" produtos proibidos (cita vapes) tem o CNPJ "imediatamente declarado suspenso" | CNPJ suspenso derruba qualquer conta de pagamento PJ |
| **Acordo Anvisa + MPF (fev/2026)**, 5 anos | fiscalização conjunta em ambientes **físicos e virtuais**, troca de dados, remoção de propaganda online | o canal digital (site, Instagram, WhatsApp) é alvo explícito |
| Lei 9.294/1996 | restringe propaganda de fumígenos; para DEF não há forma permitida | reforça o item de propaganda |

Conclusão 1.1: diferentemente de tabacaria (atividade legal e regulada), **não existe "segmento regulado" a declarar** para pods no Brasil hoje: a venda em si é proibida. Isso define a resposta de todos os gateways.

### 1.2 O que os gateways/credenciadores dizem

Legenda: **V** = texto lido nesta pesquisa; **I** = indicado por busca/fonte secundária, confirmar com o comercial do gateway por escrito; **G** = só cláusula genérica de ilegalidade localizada.

| Gateway / credenciador | O que os termos dizem | Nível | Leitura para este caso |
|---|---|---|---|
| **Stripe** (Brasil incluso) | Lista de negócios restritos: "Produtos de tabaco, incluindo cigarros eletrônicos, charutos e líquidos eletrônicos **vendidos de acordo com a legislação aplicável**" (setor regulado com diligência extra; nos EUA só produtos autorizados pela FDA) | V | como a venda não é legal no Brasil, a condição "de acordo com a legislação aplicável" não é atendida -> **inelegível** |
| **Stone / Pagar.me / Ton** (Termos Gerais de Contratação, fev/2025) | cl. 13.2 (iv): rescisão imediata por "exercício de atividades consideradas ilegais ou ilícitas"; cl. 13.3 e 13.3.2: suspensão de serviços e da liquidação, **retenção de repasses** durante auditoria e retenção "de todo e qualquer valor" para cobrir perdas; cl. 3.4: credenciamento sujeito a análise, pode ser recusado. Busca indica lista do Pagar.me que proíbe transações com "derivados de tabaco e similares" | V (cláusulas) / I (lista tabaco) | **inelegível**; risco de retenção de saldo documentado em contrato |
| **Cielo** (Contrato de Credenciamento, versão 30/09/2025) | cl. 24: proibido "efetuar TRANSAÇÕES em segmentos ou ramos de atividade **diferentes daquele(s) constante(s) no seu pedido de cadastro**" e "realizar atividades que representem infração a leis ou regulamentos vigentes no país ou que sejam vedados pelos INSTITUIDORES DE ARRANJO" (bandeiras) | V | **inelegível**; e a cláusula mostra que declarar outro segmento é violação contratual direta |
| **InfinitePay** (Contrato de Afiliação) | proíbe "comercialização de produtos proibidos por lei" e "produtos ou prestação de serviços proibidos pela legislação vigente"; pode "bloquear a TRANSAÇÃO ou o repasse", "cancelar e estornar" e "rescindir de imediato o CONTRATO, independentemente da apuração dos fatos"; termos de uso vedam conteúdo que faça apologia ao consumo de fumígenos | V | **inelegível** |
| **Mercado Pago** | Termos e Condições vedam operações ilegais/proibidas e atividades diferentes das informadas no cadastro; o Mercado Livre (mesmo grupo) proíbe anúncio de cigarros eletrônicos, vapes e componentes. Página de termos retornou 403 nesta pesquisa | G / I | **inelegível** (confirmar texto literal) |
| **PagBank (PagSeguro)** | suspensão temporária por suspeita de atividade ilícita e bloqueio definitivo em caso de ilicitude recorrente (blog oficial); lista específica de produtos não localizada | G | **inelegível** pelo critério de ilegalidade |
| **Asaas, Rede (Itaú), iugu, outros** | listas de "produtos ilegais" genéricas (iugu cita "produtos ou serviços ilegais"); texto específico sobre tabaco/DEF não localizado | G | **inelegível** pelo critério de ilegalidade |
| Bandeiras (Visa/Mastercard) | regras de integridade (Visa Integrity Risk Program, Mastercard BRAM) proíbem transações ilegais na jurisdição do comprador ou do vendedor; credenciador que tolera é multado e repassa a multa | I | é por isso que todos os credenciadores acima têm a cláusula |
| Processadores "high-risk" internacionais que aceitam vape | aceitam vape **onde é legal** e exigem licenças locais; liquidar venda doméstica brasileira por adquirente estrangeiro agrava o problema (câmbio, tributação, PLD) | I | **não recomendado** |

**Gateway que aceite formalmente o segmento no Brasil: nenhum encontrado** - e, enquanto a venda for proibida, não é de esperar que exista um legítimo.

### 1.3 O que NÃO será feito (limite explícito)

O time **não vai** projetar, implementar nem sugerir nenhuma forma de contornar o compliance, entre elas:
- declarar outra categoria de produto ou outro **MCC/CNAE** (ex.: "eletrônicos", "acessórios", "presentes", "conveniência");
- usar **descrição genérica** de produto no checkout, na fatura (soft descriptor) ou no webhook para esconder o que é vendido;
- usar **CNPJ, CPF ou conta de terceiros** ("laranja"), subcredenciamento informal ou split para conta de outra pessoa;
- fracionar transações, criar "loja de fachada", usar link de pagamento de outro negócio, ou processar por adquirente estrangeiro omitindo a natureza da venda;
- usar cripto/intermediários para ocultar a origem dos recebimentos.

Isso caracteriza fraude contratual e pode configurar ilícitos penais (ex.: falsidade ideológica, estelionato contra o credenciador, lavagem de dinheiro), além de violar diretamente cláusulas citadas acima (Cielo cl. 24; Stone cl. 13). Também expõe o comprador (fatura com descrição falsa) e qualquer pessoa que empreste conta/CNPJ.

### 1.4 Observação honesta sobre a maquininha atual

"Manter o cartão na entrega via maquininha" **não é uma opção em conformidade**; é o **status quo**. Os contratos de credenciamento da maquininha (InfinitePay, Cielo, Stone/Ton, PagBank, Mercado Pago Point) têm as mesmas cláusulas de produto proibido por lei e de segmento cadastrado. A diferença é de **grau de exposição**: venda online com cartão não presente (CNP) adiciona monitoramento automático de e-commerce, descrição de itens enviada ao gateway, URL do site analisada no credenciamento, maior taxa de chargeback e prova documental permanente. Ou seja: ir para o online **aumenta** o risco que já existe; não migra para uma situação regular. Esse ponto deve ir para a consulta jurídica (inclusive como a conta da maquininha está cadastrada hoje).

### 1.5 Opções honestas

| Opção | Custo técnico | Risco | Comentário |
|---|---|---|---|
| **A. Manter o fluxo atual** (pedido no WhatsApp, PIX/cartão na entrega) e **não** integrar gateway | zero | o risco de fundo da operação permanece (1.4) | sem investimento perdido |
| **B. Consulta jurídica antes de qualquer investimento** (sanitário, penal, tributário, contratos de pagamento, LGPD, propaganda) | zero técnico | - | **pré-requisito** para qualquer opção que aumente exposição |
| C. Implementar gateway "assim mesmo", declarando o produto verdadeiro | 4-6 semanas | recusa no credenciamento (provável) ou bloqueio/retenção posterior | dinheiro e tempo jogados fora com alta probabilidade |
| D. Contornos da seção 1.3 | - | fraude | **vetado** |
| E. Deixar este ADR como **blueprint condicionado** a mudança legal (ex.: aprovação de regulamentação de DEF em tramitação no Congresso) **e** credenciamento formal com o segmento verdadeiro aceito por escrito | zero agora | - | a arquitetura da seção 3 fica pronta para quando (e se) houver base legal |

### 1.6 Recomendação

**A + B + E.** Não integrar pagamento online agora; levar o tema (e a operação como um todo, inclusive a promoção/landing) a um(a) advogado(a); manter este ADR como plano técnico pronto, com gatilho de reavaliação objetivo: **(1)** base legal para a venda e **(2)** aceite por escrito de um credenciador/gateway com o produto e MCC verdadeiros. Enquanto isso, os investimentos técnicos com retorno são os do `docs/squad/promo-frete-outubro/04-tech-lead.md` seção 7 (ex.: U1 código do pedido, que melhora a conciliação com a maquininha sem nenhum risco novo).

---

## 2. Comparação técnica dos gateways (referência para o cenário E)

Taxas **aproximadas** de tabela pública para pequeno negócio em 2026, crédito à vista online; variam por prazo de recebimento, volume e negociação. **Confirmar na tabela vigente** antes de qualquer decisão.

| Gateway | Crédito online (aprox.) | Débito online | 3DS 2 | Checkout | Idempotência | Webhook assinado | Elegível p/ este produto |
|---|---|---|---|---|---|---|---|
| Mercado Pago | ~3,98% (30 d) a ~4,98% (na hora) | sim (via Bricks, com 3DS) | sim | Checkout Pro (redirect), Bricks (campos em iframe), API | `X-Idempotency-Key` | `x-signature` HMAC-SHA256 (ts + id) | não |
| PagBank | ~3,99% + R$ 0,40 (30 d) a ~4,99% + R$ 0,40 (14 d) | sim (3DS obrigatório) | sim | redirect, checkout transparente (criptografia de cartão no navegador), link | header de idempotência | sim | não |
| Pagar.me (Stone) | ~3,19% a ~5,59% (negociável) | sim (3DS) | sim | Checkout (redirect/link), tokenização JS, API v5 | `Idempotency-Key` | sim (assinatura no header) | não |
| Stripe (BR) | ~3,99% + R$ 0,39 (tabela padrão, confirmar) | débito via 3DS conforme bandeira | sim (automático) | Checkout (redirect), Payment Element (iframes) | `Idempotency-Key` | `Stripe-Signature` | não |
| Asaas | ~2,99% + tarifa fixa (confirmar) | limitado | sim | link/fatura, API com tokenização | sim | token de autenticação no webhook | não |
| Cielo (API e-commerce 3.0) / Rede (e.Rede) | negociado (adquirente direto) + custo de gateway/antifraude | sim (3DS obrigatório) | sim | API (precisa de tokenização/PCI maior) | `RequestId` | notificação + consulta | não |
| InfinitePay | link de pagamento/checkout com taxas próximas às da maquininha | sim | sim | link/redirect | - | limitado | não |

Para o cenário E, o critério de escolha seria: (1) aceite formal do segmento, (2) checkout **redirect** ou campos em iframe (SAQ A), (3) débito online com 3DS, (4) webhook assinado + API de consulta, (5) relatório de liquidação para conciliação. Pela documentação e ecossistema, Mercado Pago (Checkout Pro/Bricks) e Pagar.me seriam os candidatos naturais; Stripe tem a melhor DX, mas a cláusula de tabaco é explícita.

---

## 3. Arquitetura (blueprint condicionado - cenário E)

### 3.1 Princípio

O site continua estático. Pagamento exige **servidor confiável** para: recalcular preço (nunca confiar no carrinho do navegador), guardar a credencial secreta do gateway, criar a cobrança com idempotência, receber webhooks e persistir pedidos. Hoje não há nenhum desses itens.

```
Navegador (site estático)                 Backend (serverless)                          Gateway
  carrinho (ids + qty) ---POST /api/orders---> valida, recalcula com src/data + src/lib
                                               cria pedido (status=pending) no banco
                                               cria cobrança (Idempotency-Key=order.id) ----->
  <------------ { checkoutUrl | clientToken } --
  redirect / campos em iframe do gateway -------------------------------------------------> 3DS, antifraude
                                               <---- webhook (assinado) ------------------
                                               verifica assinatura, dedup por event.id,
                                               CONSULTA o pagamento na API (não confia no payload),
                                               máquina de estados do pedido
  página /pedido/{token} <---GET /api/orders/{token}--  status (pago/recusado/pendente)
                                               notifica atendimento (WhatsApp link / e-mail)
```

### 3.2 Onde roda o backend

| Opção | Prós | Contras |
|---|---|---|
| **Vercel Functions** (`api/*.ts`, runtime Node, no mesmo projeto) | mesma origem do site (CSP `connect-src 'self'` continua valendo), secrets em env da Vercel, Cron Jobs para conciliação, logs | amarra o alvo Vercel; o alvo estático (hospedagem própria) não tem funções |
| **Backend separado num subdomínio** (`api.dominio`), ex.: Vercel Functions em projeto próprio, Cloudflare Workers, Render/Fly | **atende os dois alvos** (Vercel e estático) com o mesmo código; site segue 100% estático | CORS + `connect-src https://api.dominio`; cookie/token entre origens |
| PHP no cPanel da hospedagem própria | já está lá | outra linguagem, sem reaproveitar `src/lib` (TS), segurança/atualização frágeis |

Recomendação técnica (se E se materializar): **backend único em subdomínio** (Vercel Functions num projeto separado ou Workers), importando `src/data/catalog.ts`, `src/data/promos.ts` e `src/lib/*` (já puros e testados) para recalcular totais **com o relógio do servidor** - o que, de quebra, torna a regra de data da promoção autoritativa.

### 3.3 Persistência (hoje não há banco)

Postgres gerenciado (ex.: Neon via Vercel Marketplace, ou Supabase), com:
- `orders` (id ULID, public_token aleatório para a página de status, itens snapshot com preço do momento, região, taxa, total, status, created_at, promo_slug);
- `payments` (order_id, gateway, gateway_payment_id único, status, valor, parcelas, bandeira, últimos 4 dígitos - **nunca** PAN/CVV);
- `webhook_events` (event_id **único** para deduplicação, payload, recebido_em, processado_em);
- `audit_log` (mudanças de status).
Máquina de estados: `pending -> authorized -> paid -> (refunded | chargeback)`; `pending -> rejected | expired`. Transições só pelo webhook+consulta ou por ação administrativa registrada.

### 3.4 PCI-DSS

- Nunca deixar dado de cartão tocar o nosso domínio/servidor.
- **Redirect (Checkout Pro / Stripe Checkout / Pagar.me Checkout)** ou **campos 100% em iframe do gateway** (Bricks/Payment Element): elegível a **SAQ A** (o mais simples). Pelo PCI DSS 4.0.1, o comerciante SAQ A ainda precisa garantir que a página que hospeda o iframe/redirect não é suscetível a injeção de script - aqui a CSP estrita sem inline e sem terceiros já ajuda.
- **Tokenização por JS no nosso DOM** (formulário próprio + criptografia/tokenização do gateway, ex.: PagBank/Pagar.me "transparente" sem iframe): **SAQ A-EP**, bem mais controles (inventário e integridade de scripts da página de pagamento - req. 6.4.3 e 11.6.1, varreduras ASV, etc.). Evitar.

### 3.5 3DS 2 e antifraude

- Débito online no Brasil exige autenticação (3DS 2); para crédito, 3DS reduz chargeback por fraude (liability shift para o emissor).
- Usar o 3DS e o antifraude **nativos do gateway** (ou ClearSale/Konduto integrados ao gateway). Sinais úteis do nosso lado: valor, quantidade, região, horário, reincidência de telefone.
- Produto 18+: verificação de idade é obrigação do vendedor; checar documento na entrega e registrar (evidência em disputa).

### 3.6 Idempotência, webhooks, conciliação, estorno/chargeback

- **Idempotência**: `Idempotency-Key = order.id` na criação da cobrança; o endpoint `POST /api/orders` aceita `Idempotency-Key` do cliente (UUID gerado no clique) para não duplicar pedido em duplo clique/rede instável.
- **Webhooks**: validar assinatura (HMAC com segredo do gateway, comparação em tempo constante), janela de timestamp (anti-replay, ex.: 5 min), deduplicar por `event_id`, responder 2xx rápido e processar de forma idempotente, **sempre consultar o pagamento na API** antes de mudar estado, retry com backoff do lado do gateway (handler precisa suportar repetição).
- **Conciliação**: Cron diário compara `payments` x relatório de liquidação/recebíveis do gateway (valor bruto, taxa, líquido, data); divergências geram alerta. Reconciliar também com a planilha operacional (código do pedido - U1 do plano da promo).
- **Estorno**: endpoint administrativo autenticado (estorno total/parcial via API) com motivo e trilha de auditoria; política de cancelamento publicada.
- **Chargeback**: receber eventos de disputa via webhook; dossiê com comprovante de entrega, conversa, registro de verificação de idade; monitorar taxa (programas das bandeiras penalizam acima de ~0,9%).

### 3.7 LGPD

Coletar o mínimo (nome, telefone, endereço de entrega, e-mail opcional); base legal: execução de contrato; política de privacidade e aviso no checkout; retenção definida (ex.: 5 anos para dados fiscais, menos para o resto); contrato de operador (DPA) com gateway e banco; nada de dado de cartão; logs sem PII; atendimento a direitos do titular. Hoje o site não coleta dado pessoal - esta mudança seria a primeira e exige revisão do texto legal.

### 3.8 Mudanças na CSP (exemplos, dependem do gateway)

CSP atual: `default-src 'none'; script-src 'self'; connect-src 'self'; form-action 'none'; frame-ancestors 'none'; ...` e `Permissions-Policy: payment=()`.
- **Redirect puro**: só `connect-src` para a API própria (se em subdomínio). A navegação para o checkout do gateway via `location.assign()` não é bloqueada por CSP. Se usar `<form>` POST para o gateway, abrir `form-action https://<checkout-do-gateway>`.
- **Campos em iframe (ex.: Bricks/Payment Element)**: `script-src` + SDK do gateway (ex.: `https://sdk.mercadopago.com` / `https://js.stripe.com`), `frame-src` para os domínios do gateway e do 3DS, `connect-src` para as APIs do gateway, `img-src` para logos de bandeira. Aplicar **só na rota de pagamento** (header por `source` no `vercel.json` / bloco no `.htaccess`), mantendo o resto do site com a CSP atual. Atualizar `src/data/csp.ts` + `tests/unit/deploy-config.test.ts`.
- `Permissions-Policy: payment=(self "https://<gateway>")` apenas se usar Payment Request API/Google Pay.

### 3.9 Segurança e operação

Secrets só em env do provedor (nunca no repo; `.env.example` sem valores); chaves de sandbox x produção separadas; rate limit e WAF no endpoint de criação; validação estrita de entrada (mesma de `loadCart`); observabilidade (logs estruturados, alerta de webhook falhando, painel de pedidos pendentes > 30 min); testes de contrato contra o sandbox do gateway; E2E com cartões de teste e webhooks simulados.

---

## 4. Fases e esforço (somente se o gatilho da seção 1.6 for atendido)

| Fase | Entrega | Esforço (1 dev full stack) |
|---|---|---|
| 0 | Parecer jurídico + aceite formal do gateway com produto/MCC verdadeiros | fora do time técnico (bloqueante) |
| 1 - MVP | backend (subdomínio), banco, `POST /api/orders` com recálculo, checkout **redirect**, webhook assinado + consulta, página de status, notificação ao atendimento, política de privacidade | 8-12 dias |
| 2 | campos em iframe (SAQ A), débito online com 3DS, antifraude do gateway, parcelamento, e-mails transacionais | 8-10 dias |
| 3 | conciliação diária (cron), painel admin (estorno, disputas), métricas/alertas, testes de carga e de contrato | 6-8 dias |
| QA + segurança | E2E sandbox, revisão PCI SAQ A, pentest leve | 3-5 dias |
| **Total** | | **~5-7 semanas** + custo mensal (banco, monitoramento) + taxas por transação |

---

## 5. Consequências

- Mantendo a recomendação: nenhuma mudança de código, CSP ou infraestrutura; zero custo; risco de fundo da operação segue existindo e precisa do jurídico.
- Se um dia o cenário E se concretizar, o site ganha o primeiro backend; o mesmo backend habilita U6 (estoque sem deploy) e U8 (erros do cliente) do plano de upgrades, e torna a regra de data da promoção autoritativa no servidor.

---

## 6. Fontes (consultadas em 03/10/2026)

- Anvisa - Cigarro eletrônico: https://www.gov.br/anvisa/pt-br/assuntos/tabaco/cigarro-eletronico
- RDC 855/2024 (Anvisalegis): https://anvisalegis.datalegis.net/action/ActionDatalegis.php?acao=abrirTextoAto&link=S&tipo=RDC&numeroAto=00000855&seqAto=000&valorAno=2024&orgao=RDC%2FDC%2FANVISA%2FMS&cod_modulo=310&cod_menu=9431
- Agência Brasil - Anvisa publica resolução (abr/2024): https://agenciabrasil.ebc.com.br/saude/noticia/2024-04/anvisa-publica-resolucao-que-proibe-cigarro-eletronico-no-brasil
- Agência Brasil - Acordo Anvisa e MPF (fev/2026): https://agenciabrasil.ebc.com.br/saude/noticia/2026-02/anvisa-e-mpf-assinam-acordo-para-combater-cigarros-eletronicos
- CNN Brasil - IN RFB 2.229/2024, suspensão de CNPJ: https://www.cnnbrasil.com.br/economia/macroeconomia/receita-vai-suspender-cnpj-de-lojas-que-venderem-cigarros-e-vapes-ilegais/
- Stripe - Atividades proibidas e restritas: https://stripe.com/legal/restricted-businesses
- Stone/Pagar.me/Ton - Termos Gerais de Contratação (fev/2025): https://docs.stone.com.br/wp-content/uploads/2025/02/Stone-Termos-Gerais-de-Contratacao.pdf
- Cielo - Contrato de Credenciamento (30/09/2025): https://www.cielo.com.br/docs/contrato-de-credenciamento/contrato-de-credenciamento-30.09.2025.pdf
- InfinitePay - Contrato de Afiliação: https://www.infinitepay.io/legal/contrato-de-afiliacao ; Termos de Uso: https://www.infinitepay.io/legal/termos-de-uso
- Mercado Pago - Termos e Condições (403 na coleta automática; confirmar manualmente): https://www.mercadopago.com.br/ajuda/termos-e-condicoes_300
- Mercado Livre - normas Anvisa para vendedores: https://vendedores.mercadolivre.com.br/nota/como-cumprir-as-normas-da-anvisa-e-evitar-o-cancelamento-do-seu-anuncio
- PagBank - quando a conta pode ser bloqueada: https://blog.pagbank.com.br/conta-bloqueada-pagbank
- iugu - Produtos e serviços proibidos: https://www.iugu.com/juridico/produtos-e-servicos-proibidos/
- Taxas (fontes secundárias, aproximadas): https://sellsync.ai/pt/blog/taxa-mercado-pago-2026-guia-completo/ ; https://mindconsulting.com.br/2026/07/gateways-pagamento-online-brasil-comparativo-2026/ ; https://www.kataly.com.br/blog/ranking-taxas-gateways-pagamento-2026-benchmark
