<p align="center">
  <img src="assets/brand/logo-horizontal-escuro.png" alt="NOMAD puffs — Vapor sem fronteiras" width="520">
</p>

# NOMAD puffs — site da loja

Site da **NOMAD puffs**, loja de pods descartáveis em **Palmas – TO**. O cliente escolhe modelo, sabor e
quantidade, informa a região de entrega e a forma de pagamento, e o pedido sai pronto no
**WhatsApp (63) 98123-9498** — sem cadastro e sem pagamento online.

<h3 align="center">🛍️ <a href="https://nomadpuffs.com.br">Acessar o site → nomadpuffs.com.br</a></h3>

> ⚠️ **Proibida a venda para menores de 18 anos.** O site tem verificação de idade obrigatória.
> Leia também a seção [Aviso legal](#aviso-legal).

![CI](https://github.com/guilhermeabreeu6/NOMAD/actions/workflows/ci.yml/badge.svg)

## Links rápidos
| | Link |
|---|---|
| 🌐 **Site (produção, Cloudflare Pages, branch `main`)** | **https://nomadpuffs.com.br** |
| 👀 Visualização na Vercel (não comercial, noindex) | https://nomad-v1-nine.vercel.app |
| 💬 Pedidos pelo WhatsApp | https://wa.me/5563981239498 |
| 📊 Planilha de controle | [`planilha/NOMAD-puffs-controle.xlsx`](planilha/NOMAD-puffs-controle.xlsx) |
| 📄 Catálogo oficial (PDF) | [`docs/catalogo.pdf`](docs/catalogo.pdf) |
| ✅ CI (GitHub Actions) | https://github.com/guilhermeabreeu6/NOMAD/actions |
| 🚀 Painel da Vercel | https://vercel.com/guilherme-s-projectssss/nomad-v1 |

---

## Sumário
- [Visão geral do projeto](#visão-geral-do-projeto)
- [Funcionalidades](#funcionalidades)
- [Catálogo e taxas de entrega](#catálogo-e-taxas-de-entrega)
- [Stack](#stack)
- [Como rodar](#como-rodar)
- [Duas versões de deploy](#duas-versões-de-deploy)
- [Testes e qualidade](#testes-e-qualidade)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Planilha de controle](#planilha-de-controle)
- [Squad Bot — como o projeto foi construído](#squad-bot--como-o-projeto-foi-construído)
- [Manutenção do dia a dia](#manutenção-do-dia-a-dia)
- [Aviso legal](#aviso-legal)

## Visão geral do projeto
O projeto NOMAD puffs tem três entregas, todas versionadas neste repositório:

| Entrega | O que é | Onde |
|---|---|---|
| **Site da loja** | Catálogo, carrinho e pedido pelo WhatsApp, em duas versões de deploy (Vercel e domínio próprio) | `src/`, `scripts/`, `deploy/` |
| **Planilha de controle** | Vendas, estoque, valores, entregadores e mapa de taxas, com somas automáticas | `planilha/` |
| **Squad Bot** | Time de agentes de IA que planejou, construiu, testou e publicou o site | `docs/squad/`, `docs/squad-bot/` |

Pasta de trabalho dos sócios (fora do git), de onde vieram os materiais:
```
NOMAD - PUFFS/
├── aparencia/        # identidade visual: logo, favicon, capa e cards dos produtos → copiados para assets/
├── programação/
│   ├── catalogo/     # catálogo em PDF (preços, sabores e taxas) → docs/catalogo.pdf
│   ├── pdf squad/    # documentação do Squad Bot Universal
│   └── squad bot/    # arquivos dos agentes → docs/squad-bot/
└── site NOMAD/       # ESTE repositório
```

Linha do tempo (v0.1.0, 01/10/2026): estrutura e assets → planilha → PM → PO → Designer → Tech Lead (plano)
→ Dev → QA → Tech Lead (revisão) → correções → DevOps (CI e deploy) → importação na Vercel.

## Funcionalidades
- **Verificação 18+** antes de mostrar o catálogo (a confirmação fica lembrada no navegador).
- **Catálogo** dos 4 modelos com sabores, cores de cada sabor e preços.
- **Carrinho** com quantidade de 1 a 10 por item, salvo no navegador (tolerante a dados corrompidos).
- **Checkout** com região de entrega (taxa automática), pagamento (PIX, débito ou crédito) e total.
- **Pedido pelo WhatsApp** com mensagem pré-formatada (itens, sabores, região, taxa, pagamento e total).
- **Mobile-first**, acessível (WCAG AA, teclado, leitor de tela) e leve (~6,5 KB de JS gzip).
- **Privacidade:** o site não coleta nome, endereço nem telefone.

## Catálogo e taxas de entrega
Fonte: [`docs/catalogo.pdf`](docs/catalogo.pdf). No código: [`src/data/catalog.ts`](src/data/catalog.ts).

| Modelo | Preço | Sabores |
|---|---|---|
| V55 | R$ 85 | Pineapple Ice · Uva Ice · Icy Mint |
| V155 | R$ 110 | Pineapple Ice · Menthol · Grape Ice · Watermelon Ice · Icy Mint |
| V400 Mix Slim | R$ 140 | Icy Mint + Peach Grape · Menthol + Mighty Melon · Mango + Passion Fruit Guava · Strawberry Grape Ice + Kiwi Watermelon · Cherry + Grape |
| Elfbar Pro 40K | R$ 140 | Sour Apple Ice · Strawberry Blend · Pink Lemonade · Watermelon + Peach Frost · Tropical Baja |

| Região de entrega (Palmas) | Taxa |
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
| Araras, Caribe, Polinésia | combinar no WhatsApp |
| Outra região | combinar no WhatsApp |

**Promoção de outubro/2026:** frete grátis de 01/10 a 31/10 (até 23h59, horário de Palmas) nas cinco primeiras
regiões da tabela; as demais pagam a taxa normal ou combinam no WhatsApp. Página: `/outubro`. Configuração em
[`src/data/promos.ts`](src/data/promos.ts); detalhes em `docs/squad/promo-frete-outubro/`.

## Stack
| Camada | Escolha | Por quê |
|---|---|---|
| Framework | [Astro](https://astro.build) (saída 100% estática) | HTML pronto, quase nenhum JS, roda em qualquer hospedagem |
| Linguagem | TypeScript | Catálogo e regras de preço tipados |
| Estilo | CSS puro com design tokens | Identidade NOMAD sem framework pesado |
| Imagens | `sharp` (AVIF/WebP + `srcset`) | Carregamento rápido no celular |
| Fontes | Syne · Lora Italic · Lexend (self-hosted via `@fontsource`) | Sem depender do Google Fonts, CSP restrita |
| Testes | Vitest (unidade) · Playwright + axe (E2E e acessibilidade) | |
| CI | GitHub Actions | Lint, tipos, testes, builds e E2E a cada push |

A decisão completa (ADR) está em [`docs/squad/site-mvp/04-tech-lead.md`](docs/squad/site-mvp/04-tech-lead.md).

## Como rodar
Pré-requisito: **Node.js 22.12+ (testado no 24 LTS)**.

```bash
npm ci                      # instala dependências
npm run test:e2e:install    # baixa o Chromium do Playwright (uma vez)
npm run dev                 # http://localhost:4321
```

> Nesta máquina o Node é portátil: rode `export PATH="$HOME/.local/node:$PATH"` (Git Bash) antes do `npm`.

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Gera as duas versões (`dist-vercel/` e `dist-static/`) |
| `npm run build:vercel` / `build:static` | Gera só uma das versões |
| `npm run preview:vercel` / `preview:static` | Serve o build localmente (portas 4321 / 4322) |
| `npm run package:static` | Gera `release/nomad-site-static-<versão>.zip` para upload |
| `npm test` | Testes unitários |
| `npm run test:e2e` | Testes E2E no navegador |
| `npm run check` | Lint + tipos + testes + build (o mesmo que o CI) |

## Duas versões de deploy
O **mesmo código** gera três saídas. A produção em **nomadpuffs.com.br** é a da Cloudflare Pages
(plano gratuito, uso comercial permitido); a Vercel fica só para visualização.

### 0. Cloudflare Pages — produção
- Build: `npm run build:cloudflare` → `dist-cloudflare/` (gera `_headers` com CSP, segurança e cache, a partir de
  [`deploy/cloudflare/headers.template`](deploy/cloudflare/headers.template); não gera `.htaccess`).
- **`noindex` por padrão**; só libera os buscadores com `NOINDEX=false` explícito. Previews `*.pages.dev` são
  sempre `noindex`.
- Guia passo a passo (conectar o repositório, variáveis, domínio e DNS no Registro.br):
  [`docs/deploy-cloudflare.md`](docs/deploy-cloudflare.md).

### 1. Vercel — preview
- Build: `npm run build:vercel` → `dist-vercel/` (configurado em [`vercel.json`](vercel.json)).
- **Sempre `noindex`**: não aparece no Google.
- Projeto na Vercel: **`nomad-v1`**, já conectado a este repositório (configurações vêm do `vercel.json`).
- Push/merge na `main` → atualiza **https://nomad-v1-nine.vercel.app** (o plano Hobby não permite uso comercial:
  não usar como endereço da loja).
- Push em outra branch → gera um preview em `nomad-v1-git-<branch>-guilherme-s-projectssss.vercel.app`.
- Previews exigem login enquanto a **Deployment Protection** estiver ativa
  (Settings → Deployment Protection → Vercel Authentication → Disabled para liberar).

### 2. Domínio próprio — build estático
- Build: `npm run build:static` → `dist-static/` (inclui `.htaccess` com segurança e cache).
- Funciona em Apache, cPanel, Hostinger, Nginx etc. — sem nada específico da Vercel.
- Variáveis (veja [`.env.example`](.env.example)):

| Variável | Padrão | Uso |
|---|---|---|
| `BASE_PATH` | `/` | Subpasta, ex.: `/loja/` |
| `SITE_URL` | vazio | URL pública, ex.: `https://www.nomadpuffs.com.br` (canonical e Open Graph) |
| `NOINDEX` | `false` | `true` esconde o site dos buscadores |

**Publicar via cPanel/FTP:** rode `npm run package:static`, envie o conteúdo do zip para `public_html/`
(inclusive o arquivo oculto `.htaccess`). Nginx: [`deploy/static/nginx.conf.example`](deploy/static/nginx.conf.example).
Guia completo e checklist pós-domínio (HTTPS, HSTS, indexação): [`docs/squad/site-mvp/07-devops.md`](docs/squad/site-mvp/07-devops.md).

## Testes e qualidade
| Verificação | Resultado (v0.1.0) |
|---|---|
| Lint (ESLint) | 0 problemas |
| Tipos (`astro check`) | 0 erros, 0 avisos |
| Testes unitários (Vitest) | 178 passando |
| Testes E2E + acessibilidade (Playwright + axe) | 171 passando |
| `npm audit --omit=dev` | 0 vulnerabilidades |

Os testes cobrem cada critério de aceite do PO: preços e sabores conferidos com este README e o `CLAUDE.md`,
mensagem do WhatsApp com texto malicioso (injeção, emoji, quebras de linha), `localStorage` corrompido ou
indisponível, verificação 18+, navegação por teclado, layout sem corte em 360/390/1366 px e os dois builds.
Matriz completa: [`docs/squad/site-mvp/06-qa.md`](docs/squad/site-mvp/06-qa.md).

**Segurança:** CSP sem `unsafe-inline`, cabeçalhos de segurança idênticos na Vercel e no `.htaccess`,
nenhum `innerHTML`, nenhum segredo no código e dados do navegador tratados como não confiáveis.

## Estrutura do projeto
```
├── src/
│   ├── data/          # catálogo, taxas, CSP e URLs (fonte única de verdade)
│   ├── lib/           # regras puras e testadas: carrinho, pedido, WhatsApp, storage, 18+
│   ├── components/    # componentes Astro (cards, carrinho, gate 18+, header, footer…)
│   ├── scripts/       # interação no navegador (carrinho, checkout, gate)
│   ├── styles/        # tokens de design, fontes e estilos
│   └── pages/         # index e 404
├── tests/unit/        # Vitest
├── tests/e2e/         # Playwright + axe
├── scripts/           # build das duas versões, pacote zip e servidor local
├── deploy/static/     # modelo do .htaccess e exemplo de Nginx
├── assets/            # logo e cards dos produtos (originais)
├── planilha/          # planilha de controle (.xlsx) e o script que a gera
├── docs/squad/        # artefatos do Squad Bot (PM, PO, design, tech lead, dev, QA, devops)
└── .github/workflows/ # CI
```

## Planilha de controle
[`planilha/NOMAD-puffs-controle.xlsx`](planilha/NOMAD-puffs-controle.xlsx), para Excel ou Google Sheets
(Arquivo → Importar). Tudo soma sozinho conforme as vendas são lançadas.

| Aba | Conteúdo |
|---|---|
| **INÍCIO** | Como usar e legenda de cores |
| **RESUMO** | Faturamento, pedidos, ticket médio, PIX × cartão, unidades por modelo (com gráficos) |
| **VENDAS** | Uma linha por item: produto, quantidade, pagamento, região, taxa (cobrada 1× por pedido), total, entregador |
| **MERCADORIA** | Estoque por modelo e sabor: entradas, vendido, saldo e alerta de estoque baixo |
| **VALOR** | Preço de cada modelo, custo e margem |
| **ENTREGADOR** | Motoboys, registro de entregas e modelos entregues por motoboy |
| **MAPA** | Taxas por quadra/bairro e pedidos/faturamento por região (com gráfico) |

Para mudar preços, sabores ou regiões na estrutura da planilha, edite `planilha/gerar_planilha.py` e rode
`python planilha/gerar_planilha.py` (requer `openpyxl`). **Atenção:** isso gera uma planilha nova e vazia —
faça antes de começar a lançar vendas, ou ajuste direto nas abas VALOR e MAPA.

## Squad Bot — como o projeto foi construído
O site foi desenvolvido por um time de agentes de IA (Squad Bot, Claude Code), cada um com um papel e
um artefato versionado em [`docs/squad/site-mvp/`](docs/squad/site-mvp/):

| Etapa | Papel | Artefato |
|---|---|---|
| 1 | PM — escopo, tarefas, riscos | `01-pm.md` |
| 2 | PO — histórias e critérios de aceite (Gherkin) | `02-po.md` |
| 3 | Designer — tokens, componentes, telas | `03-design.md` |
| 4 | Tech Lead — stack, ADR, plano de testes e **revisão** | `04-tech-lead.md` |
| 5 | Dev — implementação | `05-dev.md` |
| 6 | QA — testes por critério de aceite | `06-qa.md` |
| 7 | DevOps — CI, builds e deploy | `07-devops.md` |

Definição do time: [`docs/squad-bot/`](docs/squad-bot/). Instruções para os agentes: [`CLAUDE.md`](CLAUDE.md).

## Manutenção do dia a dia
- **Mudar preço, sabor ou taxa:** edite [`src/data/catalog.ts`](src/data/catalog.ts) e rode `npm run check`.
  Os testes comparam o catálogo com as tabelas do `CLAUDE.md`, então atualize as duas coisas juntas.
  As imagens em `assets/produtos/` têm o preço desenhado: refaça o PNG se o preço mudar.
- **Mudar o WhatsApp:** também em `src/data/catalog.ts`.
- **Fluxo de trabalho:** crie uma branch, abra um PR para `main` e espere o CI passar. Commits no padrão
  [Conventional Commits](https://www.conventionalcommits.org/pt-br/) (`feat:`, `fix:`, `docs:`…).
  Histórico em [`CHANGELOG.md`](CHANGELOG.md).

## Aviso legal
A RDC ANVISA nº 855/2024 proíbe a comercialização, importação e propaganda de dispositivos eletrônicos
para fumar no Brasil. Publicar este site é uma decisão dos sócios. As mitigações adotadas (verificação 18+,
aviso legal, `noindex` no preview) **não eliminam** esse risco regulatório. Detalhes na matriz de riscos de
[`docs/squad/site-mvp/01-pm.md`](docs/squad/site-mvp/01-pm.md).

---
<sub>© NOMAD puffs · Vapor sem fronteiras · Palmas – TO</sub>
