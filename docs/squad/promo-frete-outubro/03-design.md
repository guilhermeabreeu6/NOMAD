# 03 - Design - promo-frete-outubro (NOMAD puffs)

Entrada: briefing do coordenador (decisões do cliente: página própria `/outubro` + banner na home; gate 18+ e LegalStrip obrigatórios; pedido segue pelo WhatsApp), `CLAUDE.md`, `docs/squad/site-mvp/03-design.md` (sistema visual vigente), `src/styles/tokens.css`, `src/styles/app.css`, `src/pages/index.astro`, `src/components/*`, `src/data/catalog.ts` e as imagens de `aparencia/` (Capa, logo principal, cards de produto).
Não existem `01-pm.md`/`02-po.md` para este slug: as regras abaixo vêm do briefing; onde precisei decidir, marquei **[default de design]** e listei na seção 10 para PO/TL confirmarem.

> Data de referência: hoje é 03/10/2026, ou seja, a promoção **já está valendo**. A entrega desta demanda precisa priorizar o estado "ativa"; os estados "em breve" e "encerrada" são exigidos, mas o "em breve" só aparece em ambientes com relógio anterior a 01/10.

---

## 1. Objetivos

1. **Comunicar em 3 segundos**: "frete grátis em outubro em Palmas", com período e a ressalva das regiões, sem parecer letra miúda escondida.
2. **Clareza sobre onde vale**: o cliente precisa descobrir, antes de montar o carrinho, se o bairro dele entra ou não. Zero surpresa no checkout/WhatsApp.
3. **Levar ao pedido**: CTA principal "Montar meu pedido" -> catálogo da home; pedido continua pelo WhatsApp.
4. **Coerência total com a marca**: mesmo dark editorial dos cards (Syne gigante creme + Lora itálica laranja + eyebrows com tracking + marca d'água "N"). A landing deve parecer mais um card do catálogo, não um anúncio genérico de e-commerce.
5. **Conformidade**: gate 18+ antes de qualquer conteúdo, LegalStrip fixa, nada de apelo jovem, nada de alegação de saúde, CSP estrita respeitada.
6. **Fim elegante**: depois de 31/10 a página não quebra nem mente; vira "promoção encerrada" e o banner da home some sozinho.

Métrica sugerida (para PM): cliques no banner -> `/outubro` -> "Montar meu pedido" -> pedidos enviados (contagem manual no WhatsApp; o site não coleta dados).

---

## 2. Regras de exibição (fonte única para landing, banner e checkout)

### 2.1 Período e estados
Fuso de Palmas: `America/Araguaina` (UTC-3, sem horário de verão). Instantes fixos em UTC, para não depender do fuso do aparelho:

| Estado | Condição (agora, em UTC) | O que muda |
|---|---|---|
| `breve` | antes de `2026-10-01T03:00:00Z` | landing mostra "Começa em 01/10"; banner da home oculto; checkout com taxas normais |
| `ativa` | de `2026-10-01T03:00:00Z` até antes de `2026-11-01T03:00:00Z` | tudo desta spec |
| `encerrada` | a partir de `2026-11-01T03:00:00Z` | landing em estado "encerrada" (seção 4.9); banner oculto; checkout com taxas normais |

Implementação sugerida ao TL (só como restrição de design, não é código):
- O estado vai num atributo do `<html>`: `data-promo="breve|ativa|encerrada"`. **Tudo** o que é condicional é controlado por CSS em arquivo (`html[data-promo='encerrada'] .x {display:none}`), nunca por `style=""` inline (a CSP `style-src 'self'` bloqueia atributo `style`).
- O atributo deve ser gravado **antes da primeira pintura**, no mesmo script de `<head>` que já existe (`public/age-init.js`, que é `'self'`), para não haver "flash" de estado errado. O HTML estático sai com o estado calculado no build como valor inicial; o JS só corrige.
- O relógio do aparelho pode estar errado: aceito. A copy deixa claro que a confirmação final é do atendimento (seção 4.7).

### 2.2 Mapa de regiões durante a promoção
Baseado em `REGIONS` de `src/data/catalog.ts` (labels idênticos, para o cliente reconhecer no checkout):

| Grupo | Região (label do checkout) | Taxa normal | Em outubro |
|---|---|---|---|
| **Frete grátis** | Quadras 700 Sul a 200 Norte/Sul | R$ 8,00 | Grátis |
| **Frete grátis** | Quadras 300 Norte a 600 Norte | R$ 10,00 | Grátis |
| **Frete grátis** | Quadras 800 a 1200 | R$ 10,00 | Grátis |
| **Frete grátis** | Quadras 1300 a 1500 Sul | R$ 15,00 | Grátis |
| **Frete grátis** | Santo Amaro | R$ 15,00 | Grátis |
| Fora da promoção | Lago Norte | R$ 20,00 | R$ 20,00 |
| Fora da promoção | Bertaville e Aurenys | R$ 30,00 | R$ 30,00 |
| Fora da promoção | Taquaralto e Lago Sul | R$ 35,00 | R$ 35,00 |
| Fora da promoção | Taquari | R$ 35,00 | R$ 35,00 |
| Fora da promoção, a combinar | Araras, Caribe, Polinésia | a combinar | a combinar no WhatsApp |
| Não listado | "Outra região, combinar no WhatsApp" | a combinar | a combinar **[default de design, ver D1]** |

Observação: os nove bairros excluídos do briefing (Taquaralto, Bertaville, Taquari, Aurenys, Lago Sul, Lago Norte, Araras, Caribe, Polinésia) estão todos cobertos acima. Na UI os excluídos aparecem **por bairro, um por linha** (não agrupados como no checkout), porque o cliente procura o nome do próprio bairro.

---

## 3. Arquitetura da página `/outubro`

Rota: `/outubro/` (Astro gera `outubro/index.html`; funciona em hospedagem estática sem rewrite). Todos os links internos com `withBase()` (URL base configurável).

Ordem vertical (mobile e desktop):

```
[NoScriptNotice]                         (igual home)
[AgeGate]                                (mesmo componente, mesmo storage: quem já confirmou na home não vê de novo)
#app (inert até confirmar)
  skip-link "Pular para as regiões"
  Header (variante promo)                S1
  main
    Hero da promoção                     S2   h1
    Onde vale (quadro de regiões)        S3   h2
    Como funciona                        S4   h2
    Escolha seu pod (vitrine rápida)     S5   h2
    Regras da promoção                   S6   h2
    CTA final                            S7   h2
  Footer (existente)
LegalStrip (existente, fixa)
```

Sem `ModelNav`, sem `CartFab`, sem `CartDialog` nesta página **[default de design]**: a página é de anúncio; montar o pedido acontece no catálogo da home. Isso mantém a página leve e evita duplicar o drawer. (Se o TL preferir reaproveitar o carrinho aqui, o design do drawer não muda.)

Metadados (BaseLayout `title`/`description`):
- `title`: "Frete grátis em outubro - NOMAD puffs"
- `description`: "Em outubro de 2026 o frete é grátis na maior parte de Palmas - TO. Veja as regiões participantes, escolha seu pod e finalize o pedido pelo WhatsApp. Venda proibida para menores de 18 anos."
- Depois de encerrada a descrição pode continuar a mesma (página estática); o estado visual resolve.

---

## 4. Landing seção a seção

Convenções: `eyebrow` = classe existente (Lexend 500, 12px, CAIXA ALTA, tracking .22em, muted). "Display" = Syne 800. "Serif" = Lora itálico 500 laranja (classe `.serif`). Gutter, container (`.wrap`, 1200px) e escala de espaço são os existentes.

### 4.0 Gate 18+ (obrigatório)
- Mesmo componente `AgeGate`, mesma chave de storage. Quem já confirmou na home entra direto; quem chegou por link (Instagram/WhatsApp) vê o gate primeiro.
- Após "Tenho 18 anos ou mais", o foco vai para o `h1` da promo. O script atual foca `[data-hero-title]`: o `h1` da landing **deve ter `data-hero-title` e `tabindex="-1"`** (requisito para o TL não quebrar o script).
- Recusa: estado "Acesso restrito" idêntico ao da home (nenhum link de pedido, nenhuma menção à promoção).
- Nenhum texto da promoção fica visível atrás do gate (`#app` com `visibility:hidden` como hoje).

### 4.1 S1 - Header (variante promo)
- Esquerda: `Logo` horizontal, link para a home (`aria-label="NOMAD puffs, voltar para a loja"`).
- Direita: no lugar do botão de carrinho, link-botão texto **"Ver catálogo"** (classe `btn btn--text`, alvo 44px) -> `/#catalogo`.
- Sticky como hoje (64px). Sem ModelNav, então `scroll-padding-top` desta página = `--header-h + --space-3`.

### 4.2 S2 - Hero da promoção (estado `ativa`)
Composição inspirada no lockup "NOMAD / puffs" da Capa: palavra gigante creme + palavra itálica laranja embaixo, com fio horizontal fino à esquerda (como no logo principal).

Fundo `--color-bg` + `Watermark` no canto inferior direito (igual hero da home). Opcional: selo circular (seção 6.3).

Conteúdo, de cima para baixo:
1. Eyebrow: **"PROMOÇÃO DE OUTUBRO · PALMAS - TO"**
2. `h1` (Syne 800, `--fs-display`, creme, line-height .95):
   **"FRETE"** + quebra + `span.serif` **"grátis"** (Lora itálico, laranja, 40px mobile / 64px desktop).
   Nome acessível do h1: "Frete grátis" (o texto já é real; nada de imagem).
3. Selo de período (`period-badge`, pílula com borda `--color-field-border`, Lexend 600 14px, ícone de calendário 16px decorativo):
   **"01/10 a 31/10"** + `visually-hidden` " de 2026".
4. Texto (16px, muted, `max-width: 38ch`):
   **"Em outubro a entrega é por nossa conta na maior parte de Palmas. Escolha seu pod, monte o pedido e finalize pelo WhatsApp."**
5. Contador discreto (`promo-countdown`, 14px, creme, ícone relógio decorativo). Só dias, sem segundos (nada piscando, nada de `aria-live`):
   - mais de 1 dia: **"Termina em 28 dias"**
   - último dia: **"Último dia: termina hoje às 23h59"**
   - sem JS/antes do cálculo: não renderiza (o selo de período já informa).
6. Ações (`hero__actions`, mesmo componente):
   - Primário (`btn btn--lg`, laranja): **"Montar meu pedido"** -> `/#catalogo`.
   - Secundário (`btn btn--secondary`): **"Ver onde vale"** -> `#regioes` (âncora na mesma página).
7. Linha de nota logo abaixo dos botões (14px, muted, ícone de alfinete decorativo):
   **"Fora da promoção: Taquaralto, Bertaville, Taquari, Aurenys, Lago Sul, Lago Norte, Araras, Caribe e Polinésia."**
   (A exceção aparece já na dobra: transparência é o objetivo 2. O detalhe fica em S3.)

Layout:
- Mobile (base): uma coluna, alinhado à esquerda, `min-height: 72dvh`, padding vertical `--space-8`, botões em largura total empilhados (primário primeiro). O h1 "FRETE" em 360px fica ~45px: cabe em uma linha.
- `md` (>=900px): grid 1.2fr / 1fr. Coluna esquerda = itens 1-7. Coluna direita = "cartão-resumo" (surface, `--radius-lg`, `--shadow-card`, padding `--space-6`) repetindo o essencial em formato de card do catálogo:
  - eyebrow "ENTREGA EM PALMAS"
  - preço riscado em display: "R$ 8" (muted, riscado) -> **"R$ 0"** (PriceTag laranja, `--fs-price`), legenda "nas quadras centrais e Santo Amaro".
  - mini-lista com 3 linhas (hairlines como a Capa): "Quadras 700 Sul a 200 Norte/Sul · Grátis", "Quadras 300 a 1200 · Grátis", "Quadras 1300 a 1500 Sul e Santo Amaro · Grátis" + link texto "Ver lista completa" -> `#regioes`.
  - No mobile esse cartão **não aparece** (S3 vem logo em seguida e cumpre o papel).
- `lg` (>=1024px): tipografia desktop dos tokens (`--fs-display` 84px).

### 4.3 S3 - "Onde vale" (quadro de regiões) `id="regioes"`
Objetivo: o cliente acha o próprio bairro em segundos e entende o que paga. Nunca depender só de cor.

Cabeçalho da seção:
- Eyebrow: **"REGIÕES DE ENTREGA"**
- `h2` (Syne 800, `--fs-h2`): **"Onde o frete é grátis"**
- Texto (muted): **"Confira seu bairro. Ao finalizar o pedido, escolha a mesma região no carrinho."**

Três blocos (`region-board`), cada um um `<section>` com `h3` + `<ul>`:

**Bloco A - Frete grátis** (destaque)
- Cartão surface com **borda 2px `--color-accent`** e etiqueta no topo (`tag--accent`: fundo `--color-accent-soft`, texto laranja, 12px CAIXA ALTA): **"GRÁTIS EM OUTUBRO"**.
- `h3`: **"Frete grátis"**
- Cada linha (min 48px, hairline `--color-line`, como a lista de sabores dos cards):
  - ícone check laranja 20px (decorativo) + nome da região (16px creme) à esquerda;
  - à direita: taxa antiga riscada (`fee-old`: muted, `text-decoration: line-through`, 14px) + **"Grátis"** (`fee-new`: Lexend 600, laranja).
  - Texto acessível da direita: `<s>` não é anunciado por leitores de tela, então a célula usa texto oculto: "<span class=visually-hidden>Taxa normal </span><s>R$ 8,00</s><span class=visually-hidden>, em outubro </span>Grátis".
- Linhas:
  - "Quadras 700 Sul a 200 Norte/Sul" — ~~R$ 8,00~~ Grátis
  - "Quadras 300 Norte a 600 Norte" — ~~R$ 10,00~~ Grátis
  - "Quadras 800 a 1200" — ~~R$ 10,00~~ Grátis
  - "Quadras 1300 a 1500 Sul" — ~~R$ 15,00~~ Grátis
  - "Santo Amaro" — ~~R$ 15,00~~ Grátis

**Bloco B - Taxa normal**
- Cartão surface sem destaque (borda 1px `--color-line`), etiqueta neutra (`tag`: fundo surface-2, texto muted): **"FORA DA PROMOÇÃO"**.
- `h3`: **"Taxa normal de entrega"**
- Linhas com ícone "traço" neutro (decorativo) + bairro + taxa em creme 600:
  - "Lago Norte" — R$ 20,00
  - "Bertaville" — R$ 30,00
  - "Aurenys" — R$ 30,00
  - "Taquaralto" — R$ 35,00
  - "Lago Sul" — R$ 35,00
  - "Taquari" — R$ 35,00
- Nota abaixo (14px muted): **"No carrinho, Bertaville e Aurenys aparecem juntos, assim como Taquaralto e Lago Sul."** (ponte entre a lista por bairro e o select do checkout).

**Bloco C - A combinar**
- Mesmo estilo do bloco B, etiqueta **"FORA DA PROMOÇÃO"**.
- `h3`: **"Taxa a combinar"**
- Linhas: "Araras", "Caribe", "Polinésia" — "a combinar" (muted).
- Texto + link: **"Para esses bairros, a taxa é combinada no WhatsApp. No carrinho, escolha 'Outra região'."**

Rodapé da seção (fora dos cartões), linha com ícone de interrogação:
**"Não achou seu bairro? Fale com a gente no WhatsApp (63) 98123-9498 antes de pedir."** (número = link `wa.me`, laranja, alvo >=44px de altura na linha).

Layout:
- Mobile: os três blocos empilhados, bloco A primeiro e com mais peso visual (é a notícia boa); B e C abaixo. Nada de abas nem acordeão: a lista é curta (14 linhas) e precisa ser escaneável com a busca do navegador (Ctrl+F / "Localizar na página" no celular). Gap `--space-5`.
- `sm` (>=640px): A ocupa a largura toda; B e C lado a lado (2 colunas).
- `md` (>=900px): grid 3 colunas `1.3fr 1fr 1fr`, alinhadas ao topo.
- Os nomes dos bairros nunca quebram no meio da palavra (`overflow-wrap: normal`); quebram em linha se preciso.

### 4.4 S4 - Como funciona
Reaproveita `.steps` (lista ordenada com números em círculo), em versão maior (`steps--lg`: 16px creme, círculo 32px, gap `--space-4`).
- Eyebrow: **"COMO FUNCIONA"**
- `h2`: **"Do catálogo ao WhatsApp"**
- Passos:
  1. **"Escolha o pod e o sabor no catálogo."**
  2. **"No carrinho, selecione sua região. Se ela participa, a entrega aparece como grátis."**
  3. **"Envie o pedido pelo WhatsApp e pague na entrega: PIX, débito ou crédito."**
- Mobile: 1 coluna. `md`: 3 colunas, número em cima do texto, fio horizontal ligando os círculos (pseudo-elemento, decorativo).

### 4.5 S5 - Escolha seu pod (vitrine rápida)
Não duplica o catálogo; é uma ponte com a mesma linguagem da Capa.
- Eyebrow: **"CATÁLOGO DE PODS"**
- `h2`: **"Escolha seu pod"**
- Reaproveita `price-list` (mesmos dados de `MODELS`), na versão "Capa" (ver upgrade U2): nome do modelo em Syne 800 20px creme, preço em Syne 800 laranja, hairlines. Cada linha é link para `/#<id do modelo>` (ex.: `/#v155`), alvo >=56px. Ícone seta "->" à direita (decorativo).
  - "V55 — R$ 85" / "V155 — R$ 110" / "V400 Mix Slim — R$ 140" / "Elfbar Pro 40K — R$ 140" (dados de `catalog.ts`, nunca fixos no HTML).
- Desktop opcional: miniaturas das 4 imagens de produto (as mesmas otimizadas da home, `loading="lazy"`, `alt=""` porque o nome já está no link) em faixa horizontal acima da lista, altura 240px, `object-fit: contain`. Se pesar no LCP, cortar (é bônus).

### 4.6 S6 - Regras da promoção
Texto curto, legível, sem jargão. Fundo surface, `--radius-md`, padding `--space-5`, 14px, creme (não muted: é informação contratual, precisa de contraste alto).
- Eyebrow: **"REGRAS"**
- `h2` (visualmente 20px Syne, semanticamente h2): **"Regras da promoção"**
- Lista (`<ul>` com marcadores "·" laranja):
  - **"Válida para pedidos enviados pelo WhatsApp de 01/10/2026 a 31/10/2026, até 23h59 (horário de Palmas)."**
  - **"Frete grátis só para entregas em Palmas - TO, nas regiões listadas em 'Frete grátis'."**
  - **"Não participam: Taquaralto, Bertaville, Taquari, Aurenys, Lago Sul e Lago Norte (taxa normal) e Araras, Caribe e Polinésia (taxa a combinar no WhatsApp)."**
  - **"Sem valor mínimo de pedido."** **[default de design, ver D3; remover se houver mínimo]**
  - **"Pedido sujeito a confirmação de disponibilidade pelo atendimento."**
  - **"Proibida a venda para menores de 18 anos. A idade pode ser conferida no ato da entrega."**

Sem `<details>`/acordeão: as regras são poucas e precisam estar visíveis (transparência).

### 4.7 S7 - CTA final
Faixa de fechamento, centralizada, com `Watermark` grande à direita (como Capa).
- Eyebrow: **"VAPOR SEM FRONTEIRAS"**
- `h2` (Syne 800, `--fs-h2`): **"Aproveite enquanto é outubro"** (estado `ativa`)
- Texto (muted): **"Monte seu pedido no catálogo e finalize pelo WhatsApp. A confirmação do frete é feita pelo atendimento."**
- Botão primário lg: **"Montar meu pedido"** -> `/#catalogo`.
- Linha abaixo: **"Prefere conversar? Chame no WhatsApp (63) 98123-9498"** (link `wa.me`, abre em nova aba, `rel="noopener noreferrer"`).
- Mobile: botão largura total. Desktop: botão `width:auto`, mínimo 280px.
- `padding-bottom` considera a LegalStrip (como `.hero` hoje).

### 4.8 Footer e LegalStrip
- `Footer` existente, sem mudança de conteúdo.
- `LegalStrip` existente, fixa, "Proibida a venda para menores de 18 anos", visível em todos os estados pós-gate.

### 4.9 Estados da landing

| Estado | Hero (S2) | S3 regiões | S4/S5 | S6 regras | S7 CTA |
|---|---|---|---|---|---|
| `ativa` | como 4.2 | como 4.3 | iguais | iguais | como 4.7 |
| `breve` | eyebrow "EM BREVE · PALMAS - TO"; h1 igual; selo "Começa em 01/10"; texto "De 01 a 31 de outubro a entrega será por nossa conta na maior parte de Palmas."; primário "Ver catálogo"; sem contador | igual, etiqueta do bloco A vira "A PARTIR DE 01/10" | iguais | iguais | h2 "Já pode escolher seu pod" |
| `encerrada` | ver abaixo | substituído pela tabela normal de taxas | S4 oculto, S5 visível | oculto | ver abaixo |
| Gate não confirmado | nada visível (`#app` oculto) | - | - | - | - |
| Gate recusado | "Acesso restrito" | - | - | - | - |
| Sem JS | `NoScriptNotice` (como home) | - | - | - | - |

**Estado `encerrada` (elegante, sem "erro")**
Hero, mesma composição tipográfica, tom de agradecimento e sem laranja de urgência:
1. Eyebrow: **"PROMOÇÃO ENCERRADA"**
2. `h1` (mesmo lockup do estado ativo): **"VALEU,"** + `span.serif` **"outubro"** — fecha com a voz da marca, sem tom de erro. Mantém `data-hero-title` + `tabindex="-1"`.
3. Selo de período em estado inativo (borda `--color-line-strong`, texto muted, sem ícone): **"Encerrada em 31/10/2026"**.
4. Texto: **"O frete grátis de outubro terminou. Obrigado por pedir com a gente! A partir de agora valem as taxas normais de entrega em Palmas - TO."**
5. Primário: **"Ver catálogo"** -> `/#catalogo`. Secundário: **"Ver taxas de entrega"** -> `#regioes`.
6. Contador e nota de exclusões: ocultos.

S3 em `encerrada`:
- Eyebrow "REGIÕES DE ENTREGA", h2 **"Taxas de entrega em Palmas"**, texto **"Valores atuais por região. Para outros bairros, combine no WhatsApp."**
- Um único cartão (sem destaque laranja, sem riscado) com a tabela de `REGIONS` exatamente como no checkout + "Outra região: a combinar". Assim a página continua útil depois da promoção (e o link compartilhado no Instagram não morre).

S7 em `encerrada`: h2 **"Seu próximo pod está no catálogo"**, texto **"Fique de olho no nosso Instagram e WhatsApp para as próximas promoções."**, botão "Ver catálogo".

Transição entre estados: nenhuma animação; o estado é resolvido antes da pintura (2.1).

---

## 5. Banner na home

### 5.1 Posição e decisão
- **Em fluxo, não fixo**, logo abaixo do `ModelNav` e antes do hero (primeiro elemento dentro de `<main>`). Motivo: o mobile já tem 3 faixas fixas (header 64px + nav 52px + LegalStrip 36px = ~152px de 640px úteis); uma quarta faixa fixa roubaria espaço do catálogo.
- **Não dispensável** **[default de design]**: como não é fixo nem cobre conteúdo, sai da tela ao rolar; um "X" exigiria estado salvo e mais um alvo de toque perto do header. Ele some sozinho fora do estado `ativa`.
- Oculto nos estados `breve` e `encerrada` (via `html[data-promo]`). Oculto também enquanto o gate não foi confirmado (já é o comportamento do `#app`).
- Também aparece **uma** chamada no checkout (seção 5.4); não repetir banner em outros pontos (evita poluição).

### 5.2 Conteúdo (texto final)
O banner inteiro é **um único link** para `/outubro/` (evita dois alvos competindo):
- Eyebrow interno (12px, CAIXA ALTA, tracking, laranja): **"OUTUBRO · PALMAS - TO"**
- Título (Syne 800, 20px mobile / 24px desktop, creme): **"Frete grátis"** + `span.serif` laranja **"o mês todo"**
- Linha de apoio (14px, muted): **"Na maior parte da cidade, até 31/10. Confira as regiões."**
- Indicador à direita: texto **"Ver regiões"** (14px, Lexend 600, laranja, sublinhado) + seta "->" (decorativa).
- Nome acessível do link (conteúdo textual já forma a frase): "Outubro, Palmas - TO. Frete grátis o mês todo. Na maior parte da cidade, até 31/10. Confira as regiões. Ver regiões". Não usar `aria-label` (manter o texto visível = nome acessível, WCAG 2.5.3).

### 5.3 Visual e comportamento
- Container: `.wrap`; o banner é um cartão com `background: var(--color-accent-soft)`, borda 1px `--color-accent-line`, `--radius-md`, padding `--space-4` (mobile) / `--space-4 --space-5` (desktop), margem superior `--space-4`.
- Ícone à esquerda (desktop e mobile >=360px): o "N" do logo em versão linha ou um ícone de caminhão/rota em traço creme 28px, `aria-hidden`. Preferência: **ícone de rota** (linha tracejada terminando num pino), conversa com "Vapor sem fronteiras".
- Mobile: duas linhas de texto + "Ver regiões" alinhado embaixo à esquerda; altura total ~104px.
- `sm`+: uma linha horizontal (ícone | textos | "Ver regiões ->"), altura ~72px.
- Hover (desktop): borda vai para `--color-accent`, seta desloca 4px à direita (transform, desligado em reduced-motion). Pressed: `scale(.99)`. Foco: anel padrão `--color-focus` 3px no cartão inteiro.
- O hero da home não muda; o `h1` continua sendo "NOMAD puffs" (o banner não é heading: o título do banner é `<span>`/`<strong>`, não `h2`, para não poluir a hierarquia).

### 5.4 Coerência no checkout (necessário, para não contradizer a landing)
Durante `ativa`, o drawer de checkout precisa refletir a promoção; caso contrário o cliente vê "Grátis" na landing e "R$ 8,00" no total e na mensagem do WhatsApp. **Recomendo fortemente incluir no escopo** (decisão de PO/TL, ver D2):
- Opções do select de região (participantes): **"Quadras 700 Sul a 200 Norte/Sul - Grátis em outubro"**; demais mantêm "- R$ 30,00" etc.
- `fee-chip` ao escolher participante: **"Taxa de entrega: grátis (promoção de outubro)"** com o valor normal riscado ao lado em muted: "~~R$ 8,00~~".
- `fee-chip` ao escolher excluída: **"Taxa de entrega: R$ 30,00 (região fora da promoção)"**.
- `OrderSummary`: linha "Entrega" = **"Grátis"** (laranja, Lexend 600).
- Acima do select, um `alert--info` compacto: **"Outubro: frete grátis na maior parte de Palmas. Veja as regiões"** (link para `/outubro/#regioes`, abre na mesma aba só depois de confirmar que o carrinho persiste; ele persiste no storage).
- Mensagem do WhatsApp (texto simples, sem emoji, mesma estrutura RN12): linha de entrega **"Entrega: Grátis (promoção de outubro)"** em vez de "R$ 0,00", para o atendente reconhecer de imediato.

---

## 6. Tokens e estilos novos

Princípio: reaproveitar o máximo. Tudo em `tokens.css`/`app.css` (arquivos `'self'`), **sem CDN, sem `<style>` inline, sem atributo `style=""`, sem script inline, sem fonte externa, sem imagem externa**. Ícones como SVG inline no markup (permitido; não é `img-src`) ou arquivos em `/public`.

### 6.1 Tokens novos (mínimos)
| Token | Valor | Uso | Contraste (calculado) |
|---|---|---|---|
| `--color-accent-soft` | `rgba(227, 138, 78, 0.12)` | fundo do banner, etiqueta "GRÁTIS EM OUTUBRO" | composto sobre bg ~ `#2C221D`; creme sobre ele ~11,5:1; laranja sobre ele ~5,9:1 (AA) |
| `--color-accent-line` | `rgba(227, 138, 78, 0.45)` | borda do banner (decorativa; o banner tem texto e fundo próprios, não depende da borda) | n/a (decorativa) |
| `--fs-promo-serif` | `40px` base / `64px` >=1024px | "grátis"/"outubro" no h1 da landing | - |

Nada mais: cores de estado (grátis = laranja `--color-accent`; neutro = `--color-text-muted`; check = `--color-accent`). **Não usar `--color-success` (verde) para "grátis"**: verde é o código de "confirmado/adicionado" no sistema; misturar confundiria e fugiria da paleta da marca.

### 6.2 Classes novas (BEM, mesmo padrão de `app.css`)
| Classe | Descrição |
|---|---|
| `.promo-banner`, `__icon`, `__eyebrow`, `__title`, `__text`, `__cta` | banner da home (5.3) |
| `.promo-hero` (extende `.hero`), `.promo-hero__rule` | hero da landing; fio horizontal 64px `--color-line-strong` antes do serif, como no logo |
| `.period-badge`, `.period-badge--off` | pílula de período (ativa / encerrada) |
| `.promo-countdown` | linha de contador |
| `.promo-summary` | cartão-resumo da coluna direita (md+) |
| `.region-board`, `.region-card`, `.region-card--free`, `.region-list`, `.region-row`, `.fee-old`, `.fee-new` | quadro de regiões |
| `.tag`, `.tag--accent` | etiquetas CAIXA ALTA 12px (reutilizáveis no site todo) |
| `.steps--lg` | variante maior dos passos |
| `.price-list--capa` | lista de preços no estilo Capa (também usada na home, ver U2) |
| `.fine-print` | bloco de regras |
| `.cta-band` | faixa de CTA final |
| `html[data-promo='…'] [data-promo-only='ativa'|'breve'|'encerrada']` | visibilidade por estado (CSS puro) |

### 6.3 Selo circular (opcional, esforço M)
Selo decorativo no hero (md+: canto superior direito da coluna de texto; mobile: oculto), feito em SVG inline: círculo 120px, texto em `textPath` "FRETE GRÁTIS · OUTUBRO · PALMAS ·" em Lexend 600 11px tracking .2em creme, com o "N" do logo ao centro em laranja. Rotação lenta de 40s **apenas** sem `prefers-reduced-motion` (e pausável: animação de mais de 5s precisa poder parar, WCAG 2.2.2 -> recomendação: girar só uma volta ao carregar e parar). `aria-hidden="true"`.

### 6.4 Movimento
- Entrada do hero: nenhuma animação obrigatória. Opcional: fade + translateY(12px) 360ms nos itens do hero em cascata de 60ms, só sem reduced-motion.
- Nenhum elemento piscante; contador não anima.

---

## 7. Acessibilidade (checklist Dev/QA)
- [ ] `lang="pt-BR"`; um único `h1` por página; h2 por seção; h3 nos blocos de região.
- [ ] Landmarks: `header`, `main`, `footer`; seções com `aria-labelledby` apontando para o h2.
- [ ] Gate: igual home; `h1` da landing com `data-hero-title` + `tabindex="-1"` para receber foco pós-confirmação.
- [ ] Skip link "Pular para as regiões" -> `#regioes`.
- [ ] Estado de região nunca só por cor: grátis = palavra "Grátis" + ícone check + etiqueta; excluída = valor em R$ ou "a combinar" + etiqueta "FORA DA PROMOÇÃO".
- [ ] Valores riscados com texto oculto ("Taxa normal R$ 8,00, em outubro Grátis"), porque `<s>`/`line-through` não é anunciado.
- [ ] Datas legíveis: "01/10 a 31/10" acompanhado de texto oculto com o ano; nas regras, data completa por extenso no formato dd/mm/aaaa + "horário de Palmas".
- [ ] Contrastes: tudo usa pares já validados no 03-design do MVP; novos pares (creme e laranja sobre `--color-accent-soft`) calculados em 6.1 (>=5,9:1).
- [ ] Texto de regras em `--color-text` (não muted), 14px mínimo.
- [ ] Alvos >=44px (links de linha da vitrine 56px; banner inteiro ~72-104px; links WhatsApp em linha com padding vertical para 44px).
- [ ] Banner: um único link, nome acessível = texto visível; sem `aria-label` divergente; nenhum `h2` dentro.
- [ ] Contador sem `aria-live` e sem atualização em tempo real (no máximo recalcula ao carregar).
- [ ] Animações: `prefers-reduced-motion` desliga transform; selo gira no máximo uma volta.
- [ ] Reflow 320px sem rolagem horizontal; zoom 200%: blocos de região empilham; nomes de bairro não truncam com reticências.
- [ ] Links que abrem nova aba (WhatsApp) com texto ou ícone indicando ("abre o WhatsApp").
- [ ] axe nos três estados (`ativa`, `breve`, `encerrada`) forçando `data-promo` no teste E2E.

---

## 8. Resumo de comportamento mobile x desktop

| Elemento | Mobile (base, 360px) | Desktop (>=900px) |
|---|---|---|
| Header | logo + "Ver catálogo" | igual |
| Hero | 1 coluna, botões empilhados largura total, nota de exclusões abaixo | 2 colunas: texto + cartão-resumo "R$ 8 -> R$ 0" |
| Regiões | 3 cartões empilhados (Grátis primeiro) | 3 colunas 1.3/1/1 |
| Como funciona | lista vertical | 3 colunas com fio ligando os números |
| Vitrine | price-list largura total | price-list + miniaturas (opcional) |
| Regras | bloco largura total | bloco max 720px |
| CTA final | botão largura total | botão auto (min 280px) + watermark grande |
| Banner home | cartão 2-3 linhas, ~104px, em fluxo | faixa de 1 linha, ~72px, em fluxo |

---

## 9. Upgrades de aparência do site (priorizados)

Esforço: **P** = até meio dia, só CSS/markup; **M** = 1-2 dias, toca componentes/JS leve; **G** = depende de novos assets ou refatoração ampla. Todos respeitam a CSP (`'self'`) e os tokens atuais.

| # | Prioridade | Upgrade | Esforço | Por quê / como |
|---|---|---|---|---|
| U1 | Alta | **Imagem de compartilhamento (`og:image`) com a Capa** e `twitter:card` | P | a maioria chega por link no WhatsApp/Instagram; hoje o link aparece sem imagem. Exportar Capa 1200x630 (versão horizontal do logo principal) + uma específica "Frete grátis em outubro" para `/outubro`. Só ativa quando houver `siteUrl` (URL absoluta) |
| U2 | Alta | **Lista de preços estilo Capa** (`price-list--capa`) no hero da home | P | hoje modelo e preço estão em Lexend pequenos; na Capa são Syne 800 grandes (creme / laranja) com hairlines. Mesma marcação, só CSS: modelo 20-24px Syne, preço laranja Syne, eyebrow "CATÁLOGO DE PODS" sobre a 1a hairline |
| U3 | Alta | **Lockup do hero igual ao logo principal**: "NOMAD" + fio horizontal + "puffs" itálico + "VAPOR SEM FRONTEIRAS" em eyebrow logo abaixo | P | reforça a marca exatamente como nos PNGs; hoje "puffs" fica solto. Pseudo-elemento para o fio (64px, `--color-line-strong`) |
| U4 | Alta | **Refino tipográfico global**: `text-wrap: balance` em h1/h2, `font-variant-numeric: tabular-nums` em preços/totais, `letter-spacing: -0.01em` no Syne display, `::selection` laranja com texto escuro | P | acabamento editorial; números do carrinho deixam de "dançar" ao mudar |
| U5 | Alta | **Lista de sabores com a escala dos cards**: nome 18px, bolinha 14px com 24px de recuo, hairlines mais espaçadas (56px) | P | aproxima a UI real do card PNG ao lado; melhora toque |
| U6 | Média | **Sistema de cabeçalho de seção** (eyebrow + h2 Syne + fio fino de 1px abaixo) aplicado a Catálogo, Como funciona e Regiões | P | consistência entre home e landing; hoje o h2 "Catálogo" está sem eyebrow |
| U7 | Média | **Card de produto no mobile mais compacto**: imagem 9:16 menor (280px de altura) ao lado esquerdo do painel até 480px, ou botão "Ver card do modelo" que abre a imagem; o painel de compra sobe na dobra | M | hoje a imagem de 420px empurra a compra para baixo em cada modelo; a imagem repete texto que o painel já mostra |
| U8 | Média | **Microinterações já especificadas e ainda não feitas**: bolinha cresce 1.0->1.15 ao selecionar, check do sabor com transição 120ms, "tick" no número do stepper, crossfade do total | M | a spec do MVP previa (seção 6), o CSS atual só tem pulse/shake |
| U9 | Média | **Quadro de taxas de entrega reutilizável** (o `region-board` da promo) numa seção "Entrega em Palmas" na home, após o catálogo | M | responde a dúvida nº 1 antes do checkout; depois de outubro vira a seção permanente de taxas |
| U10 | Média | **Revelação suave ao rolar** (fade 12px) nos cards e seções, via `IntersectionObserver` em arquivo `'self'`, desligada em reduced-motion e sem esconder conteúdo sem JS | M | dá ritmo "editorial" sem custo de performance |
| U11 | Baixa | **Textura de granulação sutil** no fundo (SVG de ruído em `data:` dentro do CSS, opacidade 3-4%) | P | aproxima do acabamento impresso dos cards; `img-src data:` já é permitido. Validar que não reduz contraste nem pesa em celulares fracos |
| U12 | Baixa | **Selo circular reutilizável** (6.3) para lançamentos/promoções futuras | M | peça de marca reaproveitável |
| U13 | Baixa | **Fotos/renders dos pods sem texto queimado** (fundo transparente), para cards com produto em destaque e miniaturas | G | resolve de vez a duplicidade imagem x texto e o risco de preço desatualizado no PNG (pendência D11 do MVP); depende de produção de imagem |
| U14 | Baixa | **Logo e watermark vetorizados a partir do arquivo oficial** (o SVG atual é aproximado: confirmar curvas do "N" e da fumaça contra `Logo principal (fundo escuro)`) | M | fidelidade de marca no header e no gate; precisa do arquivo vetorial do cliente ou retraço cuidadoso |

Ordem de execução sugerida: U1, U2, U3, U4, U5 (um único lote P, junto com a promo) -> U6, U9 (combinam com a landing) -> U7, U8, U10 -> resto.

---

## 10. Dúvidas e defaults (para PO/TL)

- **D1 (importante)** "Outra região" / bairros de Palmas não listados (fora os 9 excluídos): o briefing diz "Palmas exceto ..." — ao pé da letra, um bairro não listado seria grátis. Como o site não sabe a taxa normal desses bairros, o default de design é **"a combinar no WhatsApp"** e a copy diz "nas regiões listadas". Se o cliente quiser grátis para qualquer outro bairro de Palmas, mudar o texto do bloco C, do rodapé de S3 e da regra 2.
- **D2 (importante)** Checkout e mensagem do WhatsApp zerando a taxa em outubro (5.4). Sem isso a landing contradiz o total. Default: incluir no escopo.
- **D3** Valor mínimo de pedido para o frete grátis? Default: sem mínimo (regra "Sem valor mínimo de pedido." pode ser removida se houver).
- **D4** Vale pela data do pedido ou da entrega? Default: pedido **enviado** pelo WhatsApp até 31/10 23h59 (horário de Palmas); pedido enviado 31/10 e entregue 01/11 mantém o frete grátis (o atendente decide; a copy diz "confirmação feita pelo atendimento").
- **D5** Araras, Caribe e Polinésia: criar opções próprias no select do checkout ("Araras, Caribe e Polinésia - a combinar") ou manter "Outra região"? Default: manter "Outra região" e explicar na landing (bloco C).
- **D6** Depois de encerrada, por quanto tempo manter `/outubro` publicada? Default: manter (estado "encerrada" é útil e evita link quebrado); remover junto da próxima campanha.

Nenhuma é bloqueante para começar: todas têm default seguro descrito acima.
