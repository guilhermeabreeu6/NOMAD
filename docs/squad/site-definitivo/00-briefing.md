# 00 - Briefing do coordenador (site-definitivo)

Data: 2026-10-03. Fonte: conversa com o dono (Guilherme).

## Situação atual
- Site v0.2.0: Astro estático + TypeScript, catálogo em `src/data/catalog.ts`, carrinho, pedido via WhatsApp,
  gate 18+, promoção de frete grátis de outubro (`/outubro` + banner). Testes Vitest + Playwright/axe. CI no GitHub.
- Deploy: projeto Vercel `nomad-v1` ligado ao repo; domínio comprado: **nomadpuffs.com.br** (Registro.br).
  Fase 0 (em andamento, ação do dono): subir o estático atual no domínio, como está.
- Pagamento hoje: PIX, débito e crédito **na entrega** (maquininha).

## O que o dono quer no site definitivo
1. Manter a estética e a forma da versão atual (design system existente: docs/squad/site-mvp/03-design.md,
   docs/squad/promo-frete-outubro/03-design.md, src/styles/tokens.css).
2. Página de **admin** para o sócio, com "total liberdade": estoque, produtos novos, sabores, preços,
   landing/campanhas, textos, regiões e taxas de entrega.
3. Quando uma mercadoria acabar, o site mostra **"Em falta no estoque"**.
4. **Método de pagamento funcional** com cartão de débito/crédito.
5. Escopo, linguagens, técnicas e design system definidos **por consenso de toda a squad**.

## Restrições e fatos já levantados
- ADR de pagamento: docs/squad/pagamento-cartao/04-tech-lead.md. RDC Anvisa 855/2024 proíbe comercializar e
  anunciar DEFs; contratos de gateways lidos proíbem produto ilegal (bloqueio/retenção). A squad **não** propõe
  contornar compliance (outra categoria/MCC, descrição genérica, conta de terceiros). Pagamento online só com
  parecer jurídico + aprovação formal de gateway com o produto declarado. Pagamento na entrega segue valendo.
- Imagens de produto hoje têm o preço "queimado" no PNG; com admin, preço precisa virar texto.
- Opções de arquitetura já apresentadas ao dono (sem decisão ainda):
  - A) Estático + CMS Git (Keystatic/Decap): admin leve, "em falta" manual, sem banco, ~1-2 semanas.
  - B) Astro com servidor (Vercel) + banco (ex.: Supabase Postgres/Auth/Storage): estoque com contagem,
    pedidos registrados, base para pagamento online, ~5-7 semanas.
- Perguntas ainda sem resposta do dono: e-mails com acesso ao admin; estoque por sabor (assumido);
  usar Supabase; indexação no Google (hoje noindex, recomendação: manter até parecer jurídico).
- Convenções: pt-BR, mobile-first, WCAG AA, CSP estrita, nenhum segredo no código, sem git push pelos agentes.
