# 03 - Design - site-definitivo (NOMAD puffs)

Data: 03/10/2026. Papel: Designer (UI/UX, design system, mobile-first, WCAG AA).
Entrada: `00-briefing.md`, `02-po.md` (fonte das histórias H1-H35, regras RE1-RE11, dúvidas D1-D20), `CLAUDE.md`,
`docs/squad/site-mvp/03-design.md` (sistema visual original), `docs/squad/promo-frete-outubro/03-design.md` (promo/landing),
`src/styles/{tokens,global,app,promo,fonts}.css`, `src/components/*.astro`, `src/pages/*.astro`, `src/data/catalog.ts`,
e as imagens de `assets/brand`, `assets/produtos` e `../aparencia` (abertas uma a uma; as de `aparencia/` são idênticas às de `assets/`).

> **Regra-mãe deste documento: a loja não muda de cara.** O dono exige manter a aparência. Tudo o que já existe (tokens, tipografia,
> cards, gate, LegalStrip, banner, landing de outubro) é **documentado como está** e vira o design system definitivo. O que é novo
> (estados de estoque, foto sem preço, banner/landing editáveis, admin) é construído **com os mesmos tokens**; tokens novos só
> entram com justificativa e contraste calculado (seção 2.9).
>
> Este documento define **como fica e como se comporta**, não tecnologia. Onde a decisão A (estático + CMS Git) x B (servidor + banco)
> do Tech Lead muda a tela, está marcado **[A]**/**[B]**. Decisões minhas sem origem no PO/dono estão marcadas **[default de design]**
> e listadas na seção 9.

Sumário: 1. Princípios e voz · 2. Tokens · 3. Componentes da loja · 4. Foto de produto sem preço · 5. Admin · 6. Templates de landing/campanha ·
7. Manutenção do design system no código · 8. Checklist de acessibilidade · 9. Pendências para Tech Lead, PO e dono.

---

## 1. Princípios e voz/tom

### 1.1 Princípios de design
1. **Editorial escuro, tipografia como imagem.** A marca é o lockup "NOMAD" (Syne 800, creme) + "puffs" (Lora itálico, laranja) sobre quase preto,
   com eyebrows em caixa alta e tracking largo, hairlines finas e a marca d'água "N" cortada no canto. Nada de gradiente, foto de pessoas,
   ícones coloridos ou "cara de e-commerce genérico".
2. **Laranja é raro e significa algo.** `--color-accent` só para: preço, "puffs"/serifados, CTA primário, link, item selecionado, "Grátis".
   Nunca para decoração de fundo grande (exceto `--color-accent-soft` no banner/etiqueta).
3. **Texto real é a fonte da verdade.** Nome, preço, sabor e disponibilidade são sempre texto renderizado (selecionável, traduzível, lido por
   leitor de tela). Imagem é ilustração. Isso passa a valer também para o preço (seção 4).
4. **Estado nunca só por cor.** "Em falta no estoque", erro, selecionado, grátis, status de pedido: sempre palavra + forma/ícone + cor.
5. **Mobile primeiro, polegar primeiro.** Cliente vem do Instagram/WhatsApp; sócio usa o admin no celular. Alvos >= 44 px, ação principal
   no rodapé da tela, uma coluna até 640 px.
6. **Conformidade é parte do layout, não opcional.** Gate 18+, LegalStrip, aviso "Proibida a venda para menores de 18 anos" e
   "Pedido sujeito à confirmação de disponibilidade" são peças fixas de todo template; o admin não as edita nem remove (PO 6.9, D18).
7. **Honestidade sobre disponibilidade.** A vitrine não mente nem pressiona: sem contador de estoque, sem "corra, últimas unidades"
   (estoque baixo não aparece ao cliente, RE4/D6), sem esconder o que acabou (o dono pediu "Em falta no estoque" visível).
8. **Admin calmo e à prova de erro.** Mesmo DNA visual, mais denso e neutro; toda ação diz o que vai acontecer antes e o que aconteceu depois;
   tudo é reversível ou pede confirmação.

### 1.2 Voz e tom
| Situação | Tom | Faça | Evite |
|---|---|---|---|
| Loja (geral) | direto, curto, "você", confiante | "Escolha seu pod, monte o pedido e finalize pelo WhatsApp." | gírias jovens, "imperdível", "corre!", emojis |
| Disponibilidade | factual, sem drama | "Em falta no estoque" (texto exato do dono) | "Esgotado!!", "Acabou :(", vermelho alarmante |
| Erro do cliente | diz o que fazer | "Escolha um sabor" / "Um item do seu carrinho acabou. Remova para continuar." | culpar ("Você esqueceu..."), códigos |
| Campanha | celebra o benefício, deixa a regra clara | "Frete grátis o mês todo. Na maior parte da cidade, até 31/10." | letra miúda escondida, contagem regressiva piscando |
| Encerramento | agradece | "Valeu, outubro" | "Expirado", "Erro" |
| Admin | instrução simples, verbo no início, zero jargão | "Publicar", "Voltar para a versão anterior", "Salvo, ainda não publicado" | commit, deploy, branch, build, cache, slug, toggle |
| Confirmação destrutiva | diz a consequência | "Remover o sabor Menthol do V155? Ele some da loja. Você pode desfazer pelo Histórico." | "Tem certeza?" sozinho |

Proibido em qualquer texto (loja, banner, landing, admin) — guarda para o PO e para a validação do admin (seção 6.4):
alegação de saúde ("faz menos mal", "ajuda a parar de fumar"), apelo a menores (personagens, linguagem infantil, "teen"),
menção a preço "de fábrica"/contrabando, emojis em mensagem de pedido (RN12 vigente).

Glossário de interface (admin): **Salvar** (guarda como rascunho) · **Prévia** (ver como fica, só você vê) · **Publicar** (cliente passa a ver) ·
**Histórico** (quem mudou o quê) · **Voltar para a versão anterior** (desfazer publicação) · **Ocultar** (some da loja) · **Em falta no estoque**
(aparece, mas não dá para pedir).

---

## 2. Tokens

Fonte única: `src/styles/tokens.css` (valores abaixo conferidos no arquivo em 03/10/2026; o código é a referência quando divergir dos docs antigos).
Cores da marca **reconferidas por amostragem de pixel** nos PNGs (`v155.png`, `v400-mix-slim.png`): fundo `#121416`, creme `#EADCC2`,
laranja `#E58A4E`, cinza `#A39A8A`, hairline `#2C2D2B`, marca d'água `#1F2020`. Diferenças <= 2 por canal em relação aos tokens: **os tokens
ficam como estão** (mudança imperceptível não justifica churn). Bolinhas de sabor também conferem (diferença <= 6 por canal).

### 2.1 Cor — vigentes (não mudar)
| Token | Valor | Uso |
|---|---|---|
| `--color-bg` | `#131416` | fundo geral |
| `--color-surface` | `#1A1B1E` | painel do card, sheet, LegalStrip, cartões |
| `--color-surface-2` | `#222326` | campos, chips, linha selecionada, resumo |
| `--color-line` | `#2C2D31` | hairlines (decorativo, nunca informação) |
| `--color-line-strong` | `#4A4B50` | fio do lockup, divisor do total (decorativo) |
| `--color-field-border` | `#6E6F74` | borda de controle (>= 3:1) |
| `--color-watermark` | `#1F2120` | "N" decorativo |
| `--color-text` | `#E8DCC4` | texto principal (creme) |
| `--color-text-muted` | `#A39B8B` | eyebrow, secundário, **estado indisponível** |
| `--color-accent` / `-hover` / `-press` | `#E38A4E` / `#EE9A60` / `#CC7840` | preço, CTA, link, seleção |
| `--color-on-accent` | `#131416` | texto sobre laranja |
| `--color-accent-soft` | `rgba(227,138,78,.12)` (~`#2C221D` sobre bg) | fundo do banner/etiqueta de campanha |
| `--color-accent-line` | `rgba(227,138,78,.45)` | borda decorativa do banner |
| `--color-error` / `--color-error-bg` | `#FF6B5E` / `#2A1716` | erro |
| `--color-success` | `#5ED6AE` | "Adicionado", "Publicado", "Entregue" |
| `--color-focus` | `#F5E9CF` | anel de foco |
| `--color-overlay` | `rgba(10,10,12,.72)` | scrim de modal/sheet |
| `--flavor-*` (15) | ver 2.2 | bolinhas de sabor |

### 2.2 Cor — paleta de sabores (é a paleta do admin)
Os 15 tokens `--flavor-*` existentes (= `FLAVOR_TOKENS` em `catalog.ts`) passam a ser **a paleta fechada que o sócio escolhe** ao criar sabor (H3).
O admin mostra a bolinha + um nome em português, para o sócio não lidar com hex:

| Token | Hex | Nome no admin | | Token | Hex | Nome no admin |
|---|---|---|---|---|---|---|
| pineapple | `#F2CA50` | Amarelo (abacaxi) | | passion | `#E0507A` | Rosa-escuro (maracujá) |
| grape | `#8E5BD9` | Roxo (uva) | | strawberry | `#E8434E` | Vermelho (morango) |
| mint | `#5ED6AE` | Verde-água (menta) | | kiwi | `#7DC23F` | Verde (kiwi) |
| menthol | `#8DD3F5` | Azul-claro (mentol) | | cherry | `#C4243F` | Vermelho-escuro (cereja) |
| watermelon | `#EE5F7D` | Rosa (melancia) | | apple | `#A0DB48` | Verde-limão (maçã verde) |
| peach | `#F4A07A` | Pêssego | | lemonade | `#F4A0C8` | Rosa-claro (limonada rosa) |
| melon | `#A5DB5F` | Verde-claro (melão) | | tropical | `#3CC9B8` | Turquesa (tropical) |
| mango | `#F5A623` | Laranja (manga) | | | | |

Propostas novas (seção 2.9): 4 cores para cobrir sabores comuns que hoje não têm cor própria (mirtilo, cola/café, coco, "original/neutro").
Bolinhas são decorativas (`aria-hidden`), então não precisam de 3:1; mesmo assim todas as atuais têm >= 3,0:1 sobre `--color-bg` (cereja é a mais
baixa, 3,22:1). Um sabor tem 1 a 3 bolinhas (combos "+").

### 2.3 Tipografia (self-hosted, `fonts.css`; nada de Google Fonts por LGPD)
| Papel | Família | Pesos carregados |
|---|---|---|
| Display (NOMAD, modelo, preço, títulos) | **Syne** 800 | 800 |
| Serifada itálica ("puffs", "Mix Slim", "grátis") | **Lora** itálico 500, sempre laranja | 500 italic |
| UI / corpo / sabores / admin | **Lexend** | 400, 500, 600 |

| Token | Base (mobile) | >= 1024 px | Uso |
|---|---|---|---|
| `--fs-display` | `clamp(36px, (100vw - 48px)/7.6, 56px)` | 84px | h1 hero / landing |
| `--fs-model` | `clamp(30px, 9vw, 40px)` | 40px | nome do modelo no card |
| `--fs-price` | 40px | 48px | número do preço; "R$" = 40% |
| `--fs-h2` | 28px | 36px | títulos de seção / sheet |
| `--fs-promo-serif` | 40px | 64px | serifado do h1 da landing |
| `--fs-body` | 16px | 16px | texto, campos (>= 16 px evita zoom no iOS) |
| `--fs-small` | 14px | 14px | notas, erros, aviso legal |
| `--fs-label` | 12px | 12px | eyebrow (500, CAIXA ALTA, tracking .22em) |

Regras: display com `line-height` .95-1.1; preços e totais com `font-variant-numeric: tabular-nums` (U4); texto nunca abaixo de 12 px,
e 12 px só em CAIXA ALTA com peso >= 500 ou na LegalStrip. Divergência registrada: o 03-design do MVP citava 56/96 px para display; **vale o tokens.css**.

### 2.4 Espaço, layout e alvos
- Escala 4 px: `--space-1` 4 · `-2` 8 · `-3` 12 · `-4` 16 · `-5` 24 · `-6` 32 · `-7` 48 · `-8` 64 · `-9` 96.
- `--gutter` 24 px (base) / 32 px (>= 640). Container `.wrap` máx. 1200 px.
- Alturas fixas: `--header-h` 64 · `--nav-h` 52 · `--legal-h` 36. `--hit-min` 44 px; distância mínima entre alvos 8 px.
- Breakpoints (mobile-first): base 0 (referência 360, funciona em 320) · `sm` 640 · `md` 900 · `lg` 1024 (tipografia) · `xl` 1200 (grade 2 col).

### 2.5 Raio
`--radius-sm` 8 (campo, chip de região, alerta) · `--radius-md` 14 (card, botão, stepper) · `--radius-lg` 24 (sheet, gate, cartão de destaque) · `--radius-full` (bolinha, FAB, pílula, etiqueta).

### 2.6 Sombra (dark: pouca sombra, hierarquia por superfície e borda)
`--shadow-card` `0 1px 0 rgba(255,255,255,.04) inset, 0 8px 24px rgba(0,0,0,.35)` · `--shadow-sheet` `0 -12px 40px rgba(0,0,0,.55)` · `--shadow-fab` `0 6px 20px rgba(0,0,0,.5)`.

### 2.7 Movimento
`--ease` `cubic-bezier(.2,.7,.2,1)` · `--dur-fast` 120ms · `--dur` 220ms · `--dur-slow` 360ms. `prefers-reduced-motion: reduce` zera
transições/animações (já em `global.css`). Nada pisca; contador não anima; mudança de estoque não anima chamando atenção.

### 2.8 Camadas (z-index) — hoje são números soltos no CSS; proposta: nomear
| Token proposto | Valor (= atual) | Onde |
|---|---|---|
| `--z-base` | 0 | marca d'água |
| `--z-raised` | 1 | conteúdo sobre a marca d'água |
| `--z-nav` | 19 | ModelNav sticky |
| `--z-header` | 20 | header sticky |
| `--z-legal` | 25 | LegalStrip |
| `--z-fab` | 30 | CartFab |
| `--z-publish-bar` | 40 | **novo**: barra "alterações não publicadas" do admin / faixa "PRÉVIA" |
| `--z-toast` | 60 | toast |
| `--z-gate` | 100 | gate 18+, skip-link |
Modais usam `<dialog>` nativo (top layer), sem z-index. Justificativa: só renomeia; nenhum valor muda; evita colisão quando o admin e a faixa de prévia entrarem.

### 2.9 Tokens novos propostos (mínimos, com justificativa)
| Token | Valor | Por quê | Contraste calculado (WCAG 2.x) |
|---|---|---|---|
| `--color-warning` | `#F2C94C` (= amarelo da marca/pineapple) | admin precisa de um 3º estado além de erro/sucesso: "Estoque baixo", "Alterações não publicadas", "Não entregue", faixa "PRÉVIA". Não aparece na loja. | sobre bg 11,62:1 · surface 10,85:1 · surface-2 9,90:1 · bg sobre warning (faixa de prévia) 11,62:1 |
| `--color-warning-bg` | `rgba(242,201,76,.12)` (~`#2E2A1C`) | fundo de aviso de atenção no admin | warning sobre ele 9,04:1 · creme 10,56:1 · muted 5,20:1 |
| `--color-success-bg` | `rgba(94,214,174,.12)` (~`#1C2B28`) | fundo do aviso "Publicado" | success sobre ele 8,21:1 · creme 10,85:1 |
| `--color-unavailable` | `var(--color-text-muted)` (alias) | nome semântico para "Em falta no estoque": permite ajuste futuro sem caçar usos | muted sobre surface 6,25:1 · sobre surface-2 5,70:1 |
| `--dot-unavailable-opacity` | `.35` | bolinha esmaecida no sabor em falta (decorativa; o estado é dito em texto) | n/a (decorativo) |
| `--flavor-blueberry` | `#5B7CF0` | sabores "Blueberry/Mirtilo" (comuns em pods) hoje cairiam em roxo-uva | bg 4,90:1 |
| `--flavor-cola` | `#A0704C` | "Cola", "Café", "Tabaco"/"Classic" | bg 4,32:1 |
| `--flavor-coconut` | `#EFE6D6` | "Coco", "Baunilha", "Creme" | bg 14,89:1 (separado do creme do texto pela borda branca 12% da bolinha) |
| `--flavor-neutral` | `#8A8F98` | "Original", sabor sem cor óbvia | bg 5,67:1 |
| `--z-*` | ver 2.8 | nomeação | - |
| `--admin-row-h` | 56px | altura de linha das listas do admin (alvo confortável no celular com densidade) | - |

**Não** propor: verde para "grátis" (verde = confirmado/adicionado; decisão da promo 6.1), vermelho para "Em falta no estoque"
(não é erro do cliente; vermelho reservado a erro/bloqueio), tema claro para o admin (manter um tema só = um conjunto de tokens).

### 2.10 Contraste AA — tabela consolidada (calculada pela fórmula WCAG com os hex dos tokens)
| Par | Razão | Resultado |
|---|---|---|
| creme `#E8DCC4` / bg · surface · surface-2 | 13,57 · 12,68 · 11,57 | AAA |
| muted `#A39B8B` / bg · surface · surface-2 | 6,69 · 6,25 · 5,70 | AA |
| laranja `#E38A4E` / bg · surface · surface-2 | 7,03 · 6,57 · 5,99 | AA (AAA em bg) |
| on-accent / accent · hover · press | 7,03 · 8,27 · 5,55 | AA |
| creme · laranja · muted / accent-soft (`#2C221D`) | 11,43 · 5,92 · 5,63 | AA |
| error `#FF6B5E` / bg · surface · surface-2 · error-bg | 6,60 · 6,16 · 5,62 · 6,10 | AA |
| creme · muted / error-bg | 12,55 · 6,18 | AA |
| success `#5ED6AE` / bg · surface · surface-2 | 10,27 · 9,60 · 8,76 | AAA |
| warning `#F2C94C` (novo) / bg · surface · surface-2 | 11,62 · 10,85 · 9,90 | AAA |
| field-border `#6E6F74` / bg · surface · surface-2 | 3,68 · 3,44 · 3,13 | >= 3:1 (1.4.11) |
| focus `#F5E9CF` / bg · surface | 15,31 · 14,30 | >= 3:1 |
| line-strong `#4A4B50` / bg | 2,12 | **decorativo apenas** |

**Correção ao 03-design do MVP:** lá constava "focus sobre accent ~7:1"; o valor real é **2,18:1**. Não há falha hoje porque o anel tem
`outline-offset: 2px` e é medido contra o fundo adjacente (bg/surface, >= 14:1). Regra: **nunca usar `outline-offset: 0` ou anel interno em
botão laranja**. O botão desabilitado atual (opacidade .55) tem texto 3,09:1 — permitido para controle inativo (1.4.3 exceção), mas por isso o
**motivo** do bloqueio sempre aparece em texto separado com contraste AA (seção 3).

---

## 3. Inventário de componentes da loja

Legenda de status: **E** = existe e não muda · **E+** = existe, ganha estado/variante · **N** = novo.
Classes/arquivos citados são os atuais (`app.css`, `promo.css`); nomes novos seguem o mesmo BEM.

| # | Componente | Arquivo/classe | Status | O que muda |
|---|---|---|---|---|
| C1 | Logo (horizontal / stack) | `Logo.astro` `.logo` | E | - |
| C2 | Watermark "N" | `Watermark.astro` `.watermark` | E | também usada no palco da foto (4.3) |
| C3 | Button (primário, `--secondary`, `--text`, `--danger`, `--lg`, `is-loading`, `is-done`) | `.btn` | E+ | variante `--unavailable` (3.4) |
| C4 | Eyebrow | `.eyebrow` | E | - |
| C5 | PriceTag (grande / compacto) | `PriceTag.astro` `.price` | E+ | dado vem do admin; variante "riscado" para campanha de desconto (Could H34) |
| C6 | FlavorDots | `FlavorDots.astro` `.dots .dot` | E+ | estado esmaecido; cor vem do token escolhido no admin |
| C7 | FlavorOption | `FlavorGroup.astro` `.flavor` | E+ | **estado "Em falta no estoque"** (3.2) |
| C8 | FlavorGroup | `.flavors` | E+ | legenda com contagem de disponíveis; ordem (3.2) |
| C9 | QuantityStepper | `.stepper` | E+ | teto = `min(10, saldo)` **[B]** (3.5) |
| C10 | ProductCard | `ProductCard.astro` `.product` | E+ | foto sem preço (seção 4), **modelo em falta** (3.3), selo de campanha |
| C11 | ModelNav | `.model-nav .chip` | E+ | chip de modelo em falta |
| C12 | Header (store / promo) | `Header.astro` | E | - |
| C13 | CartFab | `.cart-fab` | E | contagem exclui linhas em falta |
| C14 | Sheet (carrinho/checkout) | `CartDialog.astro` `.sheet` | E+ | alerta de itens em falta |
| C15 | CartLine | `.cart-line` | E+ | **linha "Em falta no estoque"/"Indisponível"** (3.4) |
| C16 | SelectField (região) | `.select` | E | opções vêm do admin |
| C17 | RadioCardGroup (pagamento) | `.radio-cards` | E | R4 só se "Pronto para ligar" (fora deste design) |
| C18 | OrderSummary | `.summary` | E | - |
| C19 | InlineAlert (`--error`, `--info`) | `.alert` | E | - |
| C20 | LiveRegion / Toast | `LiveRegion.astro` `.live` `.toast` | E | novos anúncios (3.2-3.4) |
| C21 | AgeGate / AgeDenied | `AgeGate.astro` | E (**travado**) | - |
| C22 | EmptyState | `.empty` | E | - |
| C23 | Footer | `Footer.astro` | E+ | textos editáveis em blocos com limite (6.3) |
| C24 | LegalStrip | `LegalStrip.astro` | E (**travado**) | - |
| C25 | NoScriptNotice | `NoScriptNotice.astro` | E | - |
| C26 | Price list (hero / `--capa`) | `.price-list` | E+ | linha de modelo em falta |
| C27 | Tag (`.tag`, `.tag--accent`) | `promo.css` | E+ | variante `.tag--stock` (3.1) |
| C28 | PromoBanner → **CampaignBanner** | `PromoBanner.astro` | E+ | conteúdo editável por campanha (3.7) |
| C29 | RegionBoard | `RegionBoard.astro` | E | dados do admin |
| C30 | PeriodBadge / Countdown | `.period-badge` `.promo-countdown` | E | datas do admin |
| C31 | **StockTag** "Em falta no estoque" | `.tag--stock` | **N** | 3.1 |
| C32 | **CampaignBadge** (selo de campanha) | `.tag--accent` + `.seal` | **N** (formaliza) | 3.6 |
| C33 | **CartStockAlert** | `.alert--stock` | **N** | 3.4 |
| C34 | **PreviewRibbon** "PRÉVIA - não publicada" | `.preview-ribbon` | **N** | 5.12 |
| C35 | **ProductStage** (palco da foto) | `.product__media` | **N** (substitui a moldura 9:16) | 4.3 |

### 3.1 C31 StockTag — "Em falta no estoque"
- Anatomia: pílula `--radius-full`, fundo `--color-surface-2`, borda 1px `--color-field-border`, texto `--color-text` Lexend 600 12px,
  CAIXA ALTA, tracking .08em (menor que o eyebrow para caber em 360 px), ícone opcional de "círculo cortado" 12px `aria-hidden`.
- Texto fixo: **"Em falta no estoque"** (exibido em caixa alta via CSS; o texto no DOM fica em caixa normal para o leitor de tela não soletrar).
  Variante **"Indisponível"** (sabor removido/oculto que estava no carrinho, PO 6.2).
- Contraste: creme sobre surface-2 11,57:1; borda 3,13:1.
- Não é interativo, não é `role="status"` (o anúncio dinâmico acontece no LiveRegion, só quando muda com a página aberta).
- Proibido: vermelho, riscado no nome, só opacidade.

### 3.2 C7/C8 FlavorOption e FlavorGroup com disponibilidade (H4, H5, RE2, RE3)
```
 SABORES · 4 DE 5                                   <- legend (eyebrow)
 ─────────────────────────────────────────────
 ●  Pineapple Ice                              ✓    <- disponível (selecionável)
 ─────────────────────────────────────────────
 ●  Grape Ice
 ─────────────────────────────────────────────
 ●  Watermelon Ice
 ─────────────────────────────────────────────
 ●  Icy Mint
 ─────────────────────────────────────────────
 ◌  Menthol                                         <- em falta: nome muted, bolinha 35%
    [ EM FALTA NO ESTOQUE ]                         <- StockTag na 2a linha
 ─────────────────────────────────────────────
```
- **Estados do FlavorOption**: padrão · hover (fundo surface-2) · foco (anel `--color-focus` 3px, offset 2px) · selecionado (fundo surface-2 +
  anel interno 2px laranja + check) · erro do grupo ("Escolha um sabor") · **em falta** · (oculto = não renderiza).
- **Em falta**: `<input type="radio" disabled>` (sai da navegação por setas/Tab do grupo, como pede o PO "nem por teclado"); o texto
  "Em falta no estoque" fica **dentro do `<label>`**, então o nome acessível vira "Menthol, Em falta no estoque" e o leitor de tela ainda anuncia
  "indisponível/esmaecido" no modo de leitura. Nome em `--color-unavailable`; bolinhas com `--dot-unavailable-opacity`; cursor `not-allowed`;
  sem hover. Altura mínima 48px (pode crescer para 2 linhas).
- **Ordem** **[default de design]**: sabores em falta vão para o **fim** da lista, mantendo a ordem relativa definida no admin, com um
  divisor simples. Motivo: o cliente encontra o que pode pedir sem passar por itens bloqueados. O admin continua mostrando a ordem real.
- **Legend**: todos disponíveis = "SABORES · 5" (como hoje e como nos cards). Com falta = "SABORES · 4 DE 5"; nome acessível
  "Sabor de V155. 4 de 5 disponíveis."
- **Sabor que estava selecionado e entrou em falta** (página aberta, recheque **[B]** ou ao voltar à aba): desmarca, mostra o `field-error`
  do grupo com "Menthol entrou em falta. Escolha outro sabor." e anuncia via LiveRegion. Nunca troca de sabor sozinho.
- **Loading da disponibilidade**: a disponibilidade vem no HTML/catálogo publicado (sem skeleton, sem CLS). Recheque em segundo plano **[B]**
  só altera estados; se falhar, nada muda visualmente (PO 6.3 "Falha ao consultar").

### 3.3 C10 ProductCard — modelo inteiro em falta (RE1, RE2, PO 6.3)
Quando **todos** os sabores visíveis estão em falta:
```
 ┌───────────────────────────────┐
 │ [EM FALTA NO ESTOQUE]          │ <- StockTag no canto sup. esq. do palco
 │        (foto do pod,           │    foto com filter: grayscale(.7) opacity(.6)
 │         esmaecida)             │    (decorativo; reduced-motion irrelevante)
 └───────────────────────────────┘
 POD DESCARTÁVEL
 V55                                 <- nome creme (não esmaecer o título)
 R$ 85                               <- preço continua visível, em muted (não laranja)
 SABORES · 0 DE 3
 ◌ Pineapple Ice   [EM FALTA NO ESTOQUE]  (todos desabilitados, ordem original)
 ...
 ┌───────────────────────────────┐
 │  Em falta no estoque           │ <- .btn--lg.btn--unavailable, disabled
 └───────────────────────────────┘
 Todos os sabores do V55 acabaram. Quer saber quando volta?
 Fale com a gente no WhatsApp (63) 98123-9498          <- motivo visível, AA, link wa.me
```
- Stepper de quantidade **oculto** (não há o que quantificar).
- `.btn--unavailable`: fundo `--color-surface-2`, borda 2px tracejada `--color-field-border`, texto `--color-text-muted` (5,70:1 — legível
  mesmo desabilitado; não usar a opacidade .55 aqui). `disabled` + `aria-describedby` apontando para o motivo.
- O modelo **continua no lugar** definido no admin **[default de design]** (o cliente o procura pelo chip/Instagram); só some se o sócio ocultar.
- ModelNav: chip ganha sufixo visual "· em falta" (muted) e nome acessível "V55, em falta no estoque". Price list do hero: o valor dá lugar a
  StockTag (o preço segue no card).
- Modelo com **alguns** sabores em falta: card normal; só os sabores mudam (3.2). Nenhum selo no card.

### 3.4 C14/C15/C33 Carrinho com item em falta (H6, RE8, RE9)
```
 Seu carrinho (3 itens)                                 [Fechar]
 ┌─────────────────────────────────────────────────────┐
 │ ! Um item do seu carrinho acabou. Remova para        │ <- CartStockAlert (role="alert" ao surgir)
 │   continuar.                                         │    fundo error-bg, borda error, texto creme
 │   [ Remover itens em falta ]                         │    botão secundário, alvo 48px
 └─────────────────────────────────────────────────────┘
 V155                                    Fora do total   <- muted, sem laranja
 ◌ Menthol   [EM FALTA NO ESTOQUE]
 R$ 110,00 cada · 2 unidades
                                              [Remover]
 ─────────────────────────────────────────────────────
 V400 Mix Slim                              R$ 140,00
 ●● Cherry + Grape
 R$ 140,00 cada      [ - 1 + ]                [Remover]
 ─────────────────────────────────────────────────────
 Subtotal                                   R$ 140,00   <- exclui a linha em falta
 [            Continuar             ]
```
- Linha `cart-line--out`: nome e sabor em muted, bolinhas esmaecidas, StockTag, valor da linha substituído por **"Fora do total"**,
  stepper oculto (mostra "2 unidades" em texto), "Remover" mantido (`aria-label="Remover V155 Menthol, em falta no estoque"`).
- Sabor removido/oculto pelo sócio: mesma linha com StockTag **"Indisponível"** e texto do alerta "Um item do seu carrinho não está mais
  disponível. Remova para continuar."
- **Bloqueio do envio**: "Continuar" e "Enviar pedido pelo WhatsApp" seguem **habilitados** (padrão do MVP: botão habilitado para anunciar o
  erro); ao ativar com linha em falta: não avança/não abre o WhatsApp, rola até o CartStockAlert, move o foco para ele e o reanuncia.
- **Recheque no "Enviar"** (PO 6.3, mesmo padrão da promo): botão entra em `is-loading` ("Conferindo disponibilidade...", `aria-busy`) por no
  máximo ~1,5 s; se algo entrou em falta, volta ao passo do carrinho com o alerta; se a consulta falhar, segue o envio e mantém visível
  "Pedido sujeito à confirmação de disponibilidade pelo atendimento."
- "Remover itens em falta": remove só as linhas em falta, anuncia "2 itens em falta removidos. Subtotal R$ 140,00" e devolve o foco ao título
  do carrinho. Nunca remove sozinho.
- CartFab e badge contam só as linhas disponíveis **[default de design]**; se todas estiverem em falta, o FAB continua visível (há algo a resolver).

### 3.5 C9 Quantidade limitada ao saldo **[B]** (RE9)
- Teto = `min(10, saldo)`; o número do saldo **não** aparece até o cliente bater no teto.
- Ao tentar passar: `alert--info` abaixo do stepper "Só temos 3 unidades deste sabor no momento." (texto do PO) + shake do stepper
  (sem reduced-motion). Se o saldo cair abaixo do que está no carrinho: linha reduzida com o mesmo aviso dentro da linha.
- **Estoque baixo não aparece ao cliente** (RE4/D6): nenhum componente na loja. "Últimas unidades" (H26, Could) fica **especificado e desligado**:
  seria uma StockTag em `--color-accent-soft`/laranja ("Últimas unidades") — só liga com decisão do dono (D6).

### 3.6 C32 CampaignBadge (selo de campanha)
Uma só peça de marca para campanhas, com 2 formatos:
1. **Pílula** `.tag--accent` (existente): fundo `--color-accent-soft`, texto laranja 12px CAIXA ALTA, ex.: "GRÁTIS EM OUTUBRO", "A PARTIR DE 01/11".
   Usos: etiqueta do bloco de regiões, chip no checkout, e **no card de produto somente** quando a campanha for sobre o modelo (desconto, H34 Could);
   **frete grátis não ganha selo no card** (frete não é atributo do produto; evita poluir os 4 cards).
2. **Selo circular** `.seal` (opcional, spec da promo 6.3): SVG 120px, texto em círculo + "N" laranja; só md+ no hero da landing; gira no máx. 1 volta.
- Texto do selo vem do campo "Etiqueta curta" da campanha (máx. 24 caracteres, CAIXA ALTA automática). Estados: só exibido em `ativa`
  (ou `breve` com texto "A PARTIR DE dd/mm"). Não interativo, `aria-hidden` no circular (o texto equivalente está no hero).

### 3.7 C28 CampaignBanner (banner editável da home)
É o `PromoBanner` atual, sem mudar layout, com conteúdo vindo da campanha:
| Peça | Editável? | Limite | Exemplo atual |
|---|---|---|---|
| Ícone | escolhe de lista fixa (rota, calendário, estrela "novidade", "N") | - | rota |
| Eyebrow | sim | 32 caract. | "OUTUBRO · PALMAS - TO" |
| Título (Syne) | sim | 22 caract. | "Frete grátis" |
| Complemento serifado (laranja) | sim, opcional | 18 caract. | "o mês todo" |
| Linha de apoio | sim | 80 caract. | "Na maior parte da cidade, até 31/10. Confira as regiões." |
| Chamada à direita | sim | 16 caract. | "Ver regiões" |
| Destino | escolhe: landing da campanha / catálogo / modelo X (só links internos) | - | `/outubro/` |
| Cores, tamanho, posição | **não** | - | - |
- Comportamento (não muda): em fluxo abaixo do ModelNav, um único link, não dispensável, só em `ativa`, um banner por vez
  (se 2 campanhas ativas, vale a de início mais recente **[default de design]**; o admin já impede sobreposição de frete, PO 6.8).
- Estados: padrão · hover (borda laranja + seta 4px) · pressed (scale .99) · foco (anel no cartão) · oculto (breve/encerrada/sem campanha).
- A11y: nome acessível = texto visível; sem `h2` dentro; os limites de caracteres garantem até 3 linhas em 360 px sem quebrar o layout.

### 3.8 Resumo de estados por componente (para Dev/QA)
| Componente | hover | focus | disabled | em falta | loading | erro |
|---|---|---|---|---|---|---|
| Button | clareia/surface-2 | anel focus 3px off 2 | `disabled`/`aria-disabled` + motivo em texto | `--unavailable` | `is-loading` + `aria-busy` + texto ("Abrindo WhatsApp...", "Conferindo disponibilidade...") | - |
| FlavorOption | surface-2 | anel no label | (= em falta) | StockTag + muted + radio disabled | - | grupo com outline error + "Escolha um sabor" |
| ProductCard | - | (filhos) | botão unavailable | StockTag no palco + motivo | palco surface-2 + watermark | palco "Imagem indisponível" |
| CartLine | - | (filhos) | - | `--out` + "Fora do total" | - | (via CartStockAlert) |
| Stepper | botão surface | anel | -/+ nos limites | oculto | - | shake + alerta info |
| CampaignBanner | borda/seta | anel | - | - | - | oculto se dado inválido (nunca banner quebrado) |
| Select região | - | anel | - | região desativada some; cliente avisado (PO 6.7) | - | borda error + mensagem |

---

## 4. Novo modelo de foto de produto (sem preço queimado)

### 4.1 Diagnóstico
As imagens atuais (`assets/produtos/*.png`, 1080x1920) **não são fotos**: são os cards tipográficos do catálogo com logo, "POD DESCARTÁVEL",
nome, **preço**, lista de sabores e aviso 18+ desenhados no PNG. O painel de compra do site já reproduz tudo isso em texto real. Com preço e
sabores editáveis no admin, essas artes passam a **contradizer** a loja (PO D9). Além disso, `capa-catalogo.png` (provável `og:image`/divulgação)
também traz os 4 preços.

Decisão: a imagem do produto passa a ser **só o produto** (foto ou render do pod), sem nenhum texto. O "card tipográfico" continua existindo,
mas **renderizado pelo site** (é exatamente o painel atual). Visual da loja preservado: mesmo fundo, mesma tipografia, mesma hierarquia.

### 4.2 Especificação para quem produz a arte (dono/fornecedor, D9)
| Item | Especificação |
|---|---|
| Conteúdo | o dispositivo inteiro, de frente ou 3/4, **sem** texto, preço, logo NOMAD, sabores, selo, marca d'água ou aviso (tudo isso o site desenha). Embalagem só se fizer parte da identificação do modelo. Sem pessoas, mãos, fumaça exagerada, cenário ou props "jovens". |
| Proporção do arquivo | **4:5 retrato**, master **1600 x 2000 px** (mínimo aceito 1200 x 1500; o admin recusa < 600 px no menor lado, PO 6.2). |
| Fundo | **transparente (PNG com alfa)** — preferido, porque o site põe o produto sobre o "palco" da marca. Se não der: cor sólida **exatamente `#131416`**, sem gradiente, sem vinheta, sem textura. |
| Margem de segurança | 10% em cada lado (160 px lateral, 200 px topo/base). O produto ocupa **~70-75% da altura** e fica **centralizado**, com o eixo do pod na vertical. Todos os modelos na **mesma escala visual** (alturas próximas entre si) e mesma luz/ângulo, para a grade ficar uniforme. |
| Sombra | opcional, suave, só na base (contato), dentro da área de segurança; nada de sombra projetada cortada pela borda. |
| Cor | sRGB; cores reais do dispositivo; sem filtro. |
| Formato de entrega | PNG-24 com alfa (preferido) ou WebP sem perdas; JPG só com fundo `#131416`. Até **10 MB** (limite do upload, PO 6.2). Sem EXIF/GPS (o sistema remove de qualquer forma). |
| Nome do arquivo | `<modelo>-produto.png` (ex.: `v155-produto.png`). |
| Variações por sabor | **não** no R1 (o sabor é indicado pela bolinha/texto). Se um dia houver foto por sabor, mesma spec. |
| Texto alternativo | obrigatório no upload (PO 6.2). Modelo: "Pod descartável V155, cor preta, vista frontal" — descreve o objeto, **sem preço** e sem sabores. |
| Peso publicado (gerado pelo site, não pelo sócio) | AVIF/WebP em larguras 360/540/720/1080; alvo **<= 60 KB** na variante de 540 px e **<= 120 KB** na de 1080 px. |

Também pedir ao designer da marca (D9): **Capa sem preços** (versão da `capa-catalogo.png` sem a lista R$) e `og:image` 1200x630 sem preço
(U1 da promo). Os cards tipográficos antigos podem continuar como **post de Instagram** (fora do site), sob responsabilidade do dono.

### 4.3 Como o card compõe (C10 + C35 ProductStage)
O painel de compra **não muda** (eyebrow, nome Syne, serifado, PriceTag, SABORES · N, lista com bolinhas, quantidade, botão). Muda só a mídia:
o **palco** substitui a moldura 9:16.

Palco (`.product__media`):
- Fundo `--color-surface`, `--radius-md`, `--shadow-card`; arco da marca d'água "N" (`--color-watermark`) cortado no canto inferior direito
  (mesmo recurso dos cards PNG, agora em CSS/SVG, `aria-hidden`); foto por cima com `object-fit: contain`.
- `aspect-ratio` reservado (zero CLS): **1:1 no mobile** (largura total do card, máx. 320 px de altura, para o painel de compra subir na dobra —
  resolve o U7 da promo) · **4:5 em >= 640 px** (coluna lateral de 236 px, como hoje).
- Primeiro card `loading="eager"` + `fetchpriority="high"` (candidato a LCP); demais `lazy`.
- Estados: carregando (palco + watermark, sem spinner) · erro ("N" + "Imagem indisponível", como hoje) · **modelo em falta** (foto esmaecida + StockTag) ·
  **campanha do modelo** (CampaignBadge no canto superior esquerdo; se em falta, a StockTag tem prioridade e o selo some).

Composição mobile (360 px):
```
 ┌──────────────────────────────┐
 │ [selo/estado]                 │
 │            ▐█▌                │  palco 1:1, foto contida,
 │            ▐█▌          ╭──   │  arco "N" no canto
 │            ▐█▌        ╭─╯     │
 └──────────────────────────────┘
 POD DESCARTÁVEL
 V400                       <- Syne 800 --fs-model, creme
 Mix Slim                   <- Lora itálico laranja
 R$140                      <- PriceTag: "R$" 40% no topo + número Syne laranja (texto renderizado,
                               aria "R$ 140,00"; tabular-nums)
 SABORES · 5
 ── ●● Icy Mint + Peach Grape ─────────
 ── ●● Menthol + Mighty Melon ─────────
 Quantidade               [ - 1 + ]
 [ Adicionar ao carrinho - R$ 140,00 ]
```
>= 640 px: palco 4:5 à esquerda (236 px) e painel à direita (layout atual). Desktop >= 1200: 2 colunas de cards (atual).

Regras de dados: preço **sempre** do catálogo publicado (`PriceTag` com `formatBRLShort`, centavos só se houver: "R$ 112,50" vira "R$112" + ",50" em
40% como o "R$" **[default de design]**). Nenhuma imagem pode conter preço; o checklist de upload do admin pergunta "A foto tem preço ou texto escrito?"
(seção 5.6) e, se sim, pede outra.

Transição até as fotos chegarem (D9 bloqueante do R1): a loja **não** volta a mostrar os PNGs com preço depois que o preço for editável.
Fallback temporário **[default de design]**: palco tipográfico — o mesmo palco com a marca d'água "N" grande e o nome do modelo em Syne 800
creme a 20% de opacidade como textura (`aria-hidden`). Mantém a estética e não mente sobre preço. O admin mostra o modelo como "Sem foto"
e o PO decide se isso bloqueia publicar (H10 diz que bloqueia; durante a transição o TL pode liberar por configuração).

---

## 5. Admin

### 5.1 Princípios do admin
- **Mesmos tokens, outro ritmo.** Fundo `--color-bg`, superfícies `--color-surface`/`-2`, creme, laranja só para ação primária e item selecionado.
  Lexend em tudo; Syne 800 só no título da tela (24 px) e em números grandes do painel. Sem marca d'água (exceto login). Sem serifado, exceto no logo.
- **Celular primeiro, uma mão.** Navegação inferior fixa, ação principal no rodapé, listas com linhas de 56 px (`--admin-row-h`), formulários em uma coluna.
  No desktop (>= 900 px): navegação vira coluna lateral de 240 px e listas podem virar tabela.
- **4 toques para "Em falta"** (PO RNF): login → Estoque → interruptor do sabor → Publicar → confirmar.
- **Nunca "quebra o site".** Tudo é rascunho até Publicar; validação bloqueia dado inválido; Prévia mostra exatamente o que o cliente verá;
  Histórico desfaz.
- **Sem jargão** (glossário 1.2). Datas "03/10 às 14:32"; dinheiro "R$ 110,00"; horário de Palmas sempre.
- `noindex`, sem link a partir da loja, título da aba "Admin - NOMAD puffs".

### 5.2 Arquitetura de informação
```
Login ── 2FA ──┐
               ▼
  ┌──────────── Início (painel) ─────────────────────────────────┐
  │ Estoque*          sabores por modelo: Disponível / Em falta  │ R1 (R2: saldo, entrada, estoque baixo)
  │ Catálogo          modelos > (preço, foto, textos, sabores)   │ R1
  │ Pedidos           lista do dia / por status / busca código   │ R2 (perfil Operação vê SÓ isto)
  │ Mais ▸ Entrega    regiões e taxas                            │ R1 (Should H12)
  │      ▸ Campanhas  campanhas, banner e landing                │ R3
  │      ▸ Textos     frases da loja, horário, WhatsApp, FAQ     │ R1 (H14) / R3 (H32)
  │      ▸ Histórico  quem mudou o quê; voltar versão            │ R1
  │      ▸ Pessoas    contas e perfis (só sócio-administrador)   │ R1 (contas) / R2 (perfil Operação)
  │      ▸ Guia visual  catálogo de componentes (leitura)        │ R1 (seção 7)
  │      ▸ Sair                                                  │
  └──────────────────────────────────────────────────────────────┘
  Sempre visível quando houver rascunho: barra "N alterações não publicadas [Prévia] [Publicar]"
```
*Estoque fica separado de Catálogo de propósito: é a tarefa mais frequente (diária), Catálogo é eventual.

Navegação inferior (mobile, 64 px + safe-area, ícone 24 px + rótulo 12px sempre visível):
`Início · Estoque · Catálogo · Pedidos (R2) · Mais`. Perfil **Operação** (R2): navegação reduzida a `Pedidos · Sair` (as outras rotas
respondem "Você não tem acesso a esta área." — PO 6.1).

### 5.3 Padrões transversais
**Formulários**
- Rótulo visível acima do campo (nunca só placeholder); ajuda curta abaixo em muted; erro abaixo em `--color-error` com "!" + texto, `aria-invalid`,
  `aria-describedby`; resumo de erros no topo quando >= 2 (padrão do checkout).
- Campos 52 px de altura, 16 px de fonte, borda `--color-field-border` 2 px, fundo `--color-surface-2`, raio `--radius-sm`.
- Dinheiro: campo com prefixo fixo "R$", `inputmode="decimal"`, aceita "110", "110,00", "110.00"; mostra "R$ 110,00" ao sair do campo. Mensagens de erro = tabela do PO 6.2.
- Variação de preço > 50%: confirmação "Confirma a mudança de R$ 110,00 para R$ 1.100,00?" (PO 6.2).
- Texto com limite: contador "42/80" à direita sob o campo; em 90% fica warning; acima do limite fica erro e bloqueia publicar (PO 6.10).
- Interruptor (switch) só para estado binário imediato com rótulo dos dois lados escrito ("Disponível" / "Em falta no estoque");
  implementado como `<button role="switch" aria-checked>` ou checkbox nativo; alvo 44 px; estado em texto, não só posição/cor.
- Ordenar: botões "Subir"/"Descer" (acessíveis, 44 px) — arrastar é extra, nunca o único jeito.
- Upload de foto: botão "Escolher foto" (abre câmera/galeria no celular), prévia imediata **no palco real do card**, campo de texto alternativo
  obrigatório, checklist (4.2).
- Sessão expirada: modal "Sua sessão expirou. Entre de novo para salvar — o que você digitou está guardado." (PO 6.1).

**Salvar, prévia, publicar (o coração do admin)**
| Ação | Onde | Feedback |
|---|---|---|
| Salvar | rodapé do formulário, primário | toast "Salvo. Ainda não publicado." + barra de não publicadas aparece/atualiza |
| Prévia | barra de não publicadas | abre a loja com a faixa "PRÉVIA - não publicada" (5.12) |
| Publicar | barra de não publicadas → tela de revisão "O que vai mudar" → "Publicar agora" | aviso persistente `--color-success-bg`: "Publicado às 14:32. Pode levar até N minutos para aparecer para todos." **[A]** N=10 / **[B]** N=1 |
| Erro ao publicar | mesmo lugar | `alert--error`: "Não foi possível publicar. Nada mudou na loja. [Tentar de novo]" |
| Conflito (2 sócios) | ao salvar | modal "Este item foi alterado por Ana às 14:20." [Recarregar e ver as mudanças] (primário) [Salvar por cima mesmo assim] (secundário danger) |
- A tela "O que vai mudar" lista em linguagem humana: "V155: preço R$ 110,00 → R$ 115,00", "V155 - Menthol: Disponível → Em falta no estoque".
- **[B]** opção futura: o interruptor de estoque publica na hora (com toast "Menthol agora aparece como Em falta no estoque. [Desfazer]").
  Recomendo manter o fluxo único Salvar → Publicar no R1 em A e B (um modelo mental só); decisão do TL/PO.

**Ações destrutivas**
| Nível | Exemplos | Padrão |
|---|---|---|
| Reversível leve | marcar em falta, ocultar sabor/modelo, desativar região | sem modal; toast com **Desfazer** (8 s) |
| Destrutiva | remover sabor, remover modelo, remover região, cancelar pedido, voltar versão | `<dialog>` com título-pergunta + consequência + botão com o verbo ("Remover sabor") em estilo danger; **foco inicial em "Cancelar"**; ESC cancela |
| Crítica | trocar número do WhatsApp, remover conta de sócio, ajustar estoque para menos com motivo "perda" **[B]** | dialog + redigitar (WhatsApp duas vezes, PO 6.10) ou digitar o nome do item; mostra o link de teste do WhatsApp |
| Proibida no admin | desligar gate, aviso legal, indexação, scripts, pagamento online | **não existe controle**; a tela "Travas" (dentro de Textos) mostra esses itens como cadeado com "Só a equipe técnica altera" |

**Estados vazios** (watermark pequena + título + 1 frase + 1 ação)
- Catálogo sem modelos: "Nenhum modelo ainda" · "Crie o primeiro para ele aparecer na loja." · [Novo modelo]
- Modelo sem sabores: "Sem sabores" · "Adicione ao menos um sabor ou oculte o modelo." · [Adicionar sabor]
- Estoque baixo vazio **[B]**: "Nada acabando" · "Nenhum sabor está com 3 unidades ou menos."
- Pedidos do dia vazio **[B]**: "Nenhum pedido hoje" · "Pedidos enviados pelo site aparecem aqui."
- Campanhas vazio: "Nenhuma campanha" · "Crie uma campanha de frete grátis com começo e fim." · [Nova campanha]
- Histórico vazio: "Nada alterado ainda."
- Busca sem resultado: "Nenhum pedido com NMD-7K3F" · [Limpar busca]

**Feedback de sistema**
- Carregando lista: 3 linhas-esqueleto `--color-surface-2` (sem shimmer em reduced-motion). Botão em `is-loading` com texto ("Publicando...").
- Sem internet: faixa `--color-warning-bg` "Sem conexão. Suas alterações ficam guardadas aqui até voltar." (não perder digitação).
- Toasts: `role="status"`, acima da navegação inferior, 5 s (8 s com Desfazer), não cobrem a ação primária.

**Status (chips de pedido e de item)** — sempre texto + ícone + cor:
| Status | Cor do texto/borda | Ícone |
|---|---|---|
| Enviado | creme / field-border | envelope |
| Confirmado | laranja / accent | check |
| Saiu p/ entrega | creme / field-border | moto/rota |
| Entregue | success | check duplo |
| Pago - PIX/débito/crédito (na entrega) | success, fundo success-bg | moeda |
| Não entregue | warning | alerta |
| Cancelado / Expirado | muted | x / relógio |
| Estoque baixo **[B]** | warning, fundo warning-bg | seta para baixo |
| Em falta no estoque | creme, StockTag | círculo cortado |
| Oculto | muted | olho cortado |
| Rascunho / não publicado | warning | lápis |

### 5.4 Telas por release
| Release | Telas |
|---|---|
| R1 | Login, 2FA, Recuperar acesso, Início, Estoque (interruptor), Catálogo (lista), Modelo (editar/criar), Sabor (editar/criar), Foto (upload), Entrega (regiões/taxas) *Should*, Textos curtos *Should*, Revisão "O que vai mudar", Prévia, Histórico + Voltar versão, Pessoas (contas), Guia visual |
| R2 **[B]** | Estoque com saldo (entrada/ajuste com motivo, histórico do sabor, estoque baixo), Pedidos (lista/filtros/busca), Pedido (detalhe/status/pagamento recebido), Resumo (H24), Pessoas com perfil Operação, Exportar CSV (Could) |
| R3 | Campanhas (lista), Campanha (editor em passos), Landing (blocos editáveis + prévia por estado breve/ativa/encerrada), Banner, Textos institucionais, Agendamento (H33) |
| R4 | fora deste design (condicionado, PO 6.6) |

### 5.5 Wireframes (mobile 360 px)

**Login + 2FA (H1)**
```
┌────────────────────────────────┐   ┌────────────────────────────────┐
│          (N) NOMAD puffs        │   │ ← Voltar                        │
│              ADMIN              │   │ VERIFICAÇÃO EM 2 ETAPAS         │
│                                 │   │ Digite o código                 │
│ E-mail                          │   │ Abra o app autenticador e       │
│ [_____________________________] │   │ digite o código de 6 números.   │
│ Senha                    [ver]  │   │ [ _ ][ _ ][ _ ][ _ ][ _ ][ _ ]  │
│ [_____________________________] │   │  (um campo, inputmode=numeric,  │
│                                 │   │   autocomplete=one-time-code)   │
│ [           Entrar           ]  │   │ [          Confirmar         ]  │
│ Esqueci minha senha             │   │ Perdi acesso ao app             │
│                                 │   │                                 │
│ Área restrita aos sócios.       │   │                                 │
└────────────────────────────────┘   └────────────────────────────────┘
 Erro genérico: "Não foi possível entrar. Confira os dados."   (nunca revela se o e-mail existe)
 Bloqueio: "Muitas tentativas. Tente de novo em 15 minutos."   (alert, foco nele)
 [A]: se o CMS exigir conta externa (GitHub etc.), esta tela vira "Entrar com <provedor>" e o
      design depende do provedor - risco de atrito para o sócio (PO seção 9).
```

**Início (painel)**
```
┌────────────────────────────────┐
│ (N) Admin              Ana  ☰  │  header 56px
│ Olá, Ana                        │  Syne 24
│ ┌────────────────────────────┐ │
│ │ ✎ 2 alterações não         │ │  warning-bg (só se houver)
│ │   publicadas  [Ver] [Publicar]│
│ └────────────────────────────┘ │
│ ┌──────────────┐┌─────────────┐│  atalhos 2x2, 96px altura
│ │ Marcar sabor ││ Pedidos de  ││
│ │ em falta     ││ hoje: 7 [B] ││
│ └──────────────┘└─────────────┘│
│ ┌──────────────┐┌─────────────┐│
│ │ Estoque      ││ Campanha    ││
│ │ baixo: 3 [B] ││ ativa: Out. ││
│ └──────────────┘└─────────────┘│
│ LOJA AGORA                      │
│ 4 modelos · 18 sabores          │
│ 2 em falta no estoque           │
│ Última publicação: 03/10 14:32  │
│ por Bruno  [Ver histórico]      │
├────────────────────────────────┤
│ Início Estoque Catálogo Pedid. Mais │ nav inferior
└────────────────────────────────┘
```

**Estoque R1 (H4, H16)** — a tela mais usada
```
┌────────────────────────────────┐
│ Estoque                         │
│ [Buscar sabor____________] (🔍) │
│ [Todos] [Em falta (2)] [Ocultos]│ chips filtro
│ V155 · R$ 110,00                │ cabeçalho de grupo (sticky)
│ ┌────────────────────────────┐ │
│ │ ● Pineapple Ice             │ │ 56px
│ │   Disponível        [■■□ ]  │ │ switch + texto do estado
│ ├────────────────────────────┤ │
│ │ ◌ Menthol                   │ │
│ │   Em falta no estoque [□■■] │ │
│ └────────────────────────────┘ │
│ V400 Mix Slim · R$ 140,00       │
│ ...                             │
│ [Selecionar vários]             │ H16 (Could): checkboxes + ação em lote
├────────────────────────────────┤
│ 1 alteração  [Prévia] [Publicar]│ barra de não publicadas (z-publish-bar)
├────────────────────────────────┤
│ Início Estoque Catálogo ... Mais│
└────────────────────────────────┘
```
**Estoque R2 [B]** — a linha do sabor ganha o saldo e as ações:
```
│ ◌ Menthol                     0 un.│  0 = "Em falta no estoque" automático
│   Em falta no estoque              │
│   [+ Entrada] [Ajustar] [Histórico]│
│ ● Icy Mint            ▼ 2 un.      │  chip "Estoque baixo" (warning)
│   Disponível · Marcar em falta     │  marcação manual prevalece (RE3)
```
Entrada/Ajuste = bottom sheet: Quantidade (stepper grande), Motivo (radio: Entrada de mercadoria · Contagem · Perda/avaria · Outro + texto),
"Saldo atual 2 → novo saldo 22", [Lançar]. Motivo obrigatório (RE7). Lançamento de estoque **publica na hora** em B (é operação, não conteúdo) —
**[default de design, confirmar TL/PO]**.

**Catálogo → Modelo (H2, H7, H10, H13)**
```
┌────────────────────────────────┐
│ ← Catálogo         [Prévia]     │
│ V155                  Visível ● │ status
│ ┌──────────┐                    │
│ │ (palco   │ [Trocar foto]      │ prévia no palco real 4:5
│ │  4:5)    │ Texto alternativo ✓│
│ └──────────┘                    │
│ Nome na loja                    │
│ [V155___________________] 4/24  │
│ Destaque em itálico (opcional)  │
│ [________________] 0/14         │ ex.: "Mix Slim" (vira o serifado laranja)
│ Preço                           │
│ [R$ 110,00_______]              │
│ Descrição curta (opcional)      │
│ [___________________] 0/90      │
│ Ordem na loja   [Subir][Descer] │
│ Mostrar na loja  [■■□] Visível  │
│ SABORES · 5          [+ Sabor]  │
│  ● Pineapple Ice  Disponível  › │
│  ◌ Menthol  Em falta no estoque›│
│  ...                            │
│ [Remover modelo]  (danger text) │
├────────────────────────────────┤
│ [            Salvar           ] │ rodapé fixo
└────────────────────────────────┘
```
Nome dividido em "Nome na loja" + "Destaque em itálico" preserva o lockup atual ("V400" + *Mix Slim*, "Elfbar" + *Pro 40K*): o site monta
`title` + `subtitle` como hoje; o nome completo (acessível e na mensagem do WhatsApp) é a junção dos dois.

**Sabor (H3)** — bottom sheet:
```
│ Nome do sabor                   │
│ [Strawberry Ice_________] 14/40 │  erro: "Esse sabor já existe neste modelo"
│ Cor da bolinha (até 3)          │
│ ◉ ○ ○ ○ ○                       │  grade de 19 bolinhas 44px, rótulo PT
│ Amarelo (abacaxi) ✓             │  nome da cor escolhida em texto
│ Prévia:  ●  Strawberry Ice      │  linha real do FlavorOption
│ Disponibilidade [■■□] Disponível│
│ Mostrar na loja [■■□] Visível   │
│ [Salvar sabor]   [Remover]      │
```

**Entrega — regiões e taxas (H12)**
```
│ Entrega                [+ Região]│
│ Quadras 700 Sul a 200 N/S  R$ 8 ›│
│ Lago Norte                R$ 20 ›│
│ Araras            a combinar    ›│
│ Taquari (desativada)  R$ 35     ›│ muted + chip "Desativada"
│ Outra região (fixa) a combinar 🔒│ não removível (PO 6.7)
 Editar região: Nome [ ] · Taxa ( ) Valor fixo [R$__] ( ) A combinar ·
 Ativa [switch] · Ordem · [R3] "Participa da campanha ativa?" (obrigatório quando houver campanha)
```

**Pedidos [B] (H20, H21, H-PAG1b)** — também a tela inteira do perfil Operação
```
┌────────────────────────────────┐
│ Pedidos            [Buscar NMD] │
│ Hoje ▾  [Enviado 3][Confirm. 2] │ chips com contagem (rolagem horizontal)
│ [Saiu 1][Entregue 4][Pago 4]... │
│ ┌────────────────────────────┐ │
│ │ NMD-7K3F       14:05       │ │ 72px, código em Syne 16
│ │ 2 itens · Lago Norte       │ │
│ │ R$ 248,00 · Crédito (entr.)│ │
│ │ [Enviado]                ›  │ │ chip status
│ └────────────────────────────┘ │
└────────────────────────────────┘
 Detalhe do pedido:
│ NMD-7K3F · Enviado 14:05        │
│ 2x V155 Menthol  R$ 220,00      │
│ Entrega Lago Norte  R$ 20,00    │  (Grátis (campanha) quando for o caso)
│ Total  R$ 240,00                │
│ Pagamento escolhido: Crédito    │
│ ┌ PRÓXIMO PASSO ─────────────┐  │
│ │ [   Confirmar pedido     ]  │  │ primário; baixa o estoque (texto diz isso)
│ │ "Confirmar tira 2 unidades  │  │
│ │  do estoque de V155 Menthol"│  │
│ └────────────────────────────┘  │
│ Outras ações: Cancelar pedido   │ danger, pede motivo
│ LINHA DO TEMPO                  │ quem/quando por status
```
O botão primário sempre mostra **o próximo status natural** (Enviado→Confirmar · Confirmado→Saiu para entrega · Saiu→Entregue/Não entregue ·
Entregue→Registrar pagamento). "Registrar pagamento": radio PIX/Débito/Crédito (pré-marcado com a forma escolhida, editável) + [Marcar como pago]
→ "Pago - PIX (na entrega)". Bloqueio sem saldo: `alert--error` "Sem saldo para V155 Menthol (precisa 1, tem 0)" + [Ajustar estoque] (PO 6.3).
Nenhum campo de cartão em lugar nenhum (PO 6.5).

**Campanhas (H28-H31) — editor em passos**
```
 1 Período ─ 2 Regiões ─ 3 Página e banner ─ 4 Revisar
 1: Nome interno [Frete grátis de novembro] · Endereço da página /[novembro] (só a-z, 0-9, hífen; único)
    Começa [01/11/2026] [00:00] · Termina [30/11/2026] [23:59]  "Horário de Palmas"
    erro: "O fim precisa ser depois do início" / "Já existe campanha de frete no período"
 2: lista de regiões com switch "Grátis nesta campanha" (padrão: as que eram grátis na última campanha)
 3: blocos da landing (seção 6) + banner (3.7), cada um com prévia
 4: prévia nos 3 estados [Antes] [Durante] [Depois] + [Publicar campanha]
```

**Textos (H14, H32)**: lista de blocos com rótulo humano ("Frase de abertura da loja", "Horário de atendimento", "Aviso de disponibilidade",
"Número do WhatsApp", "Perguntas frequentes"); cada bloco mostra onde aparece (miniatura) e o limite. Seção final **"Travas (não editáveis)"**
com cadeado: Gate 18+, Aviso "Proibida a venda para menores de 18 anos", Indexação no Google (desligada), Pagamento online (desligado).

**Histórico (H9, H11)**
```
│ Histórico           [Filtrar ▾] │
│ HOJE                             │
│ 14:32 Bruno publicou             │
│   V155: preço R$110,00→R$115,00  │
│   [Ver detalhes] [Voltar para    │
│    a versão anterior]            │ dialog destrutivo
│ 14:10 Ana marcou Menthol (V155)  │
│   como Em falta no estoque       │
│ 13:02 Login de Ana (2FA)         │ eventos de acesso em muted
```
Registro não editável (sem ícone de editar/apagar). "Voltar para a versão anterior" mostra o que vai mudar antes, como a revisão de publicação.

### 5.6 Checklist de foto no upload (H7)
Antes de salvar, 3 perguntas com check (não bloqueiam, orientam): "A foto mostra só o produto, sem preço ou texto escrito?" ·
"O fundo é transparente ou preto liso?" · "O produto está inteiro e centralizado?" + link "Ver exemplo" (imagem de referência no Guia visual).
Bloqueios técnicos (PO): tipo, 10 MB, 600 px; texto alternativo obrigatório ("Descreva a imagem para quem usa leitor de tela").

### 5.7 Acessibilidade do admin (mesma barra da loja, PO RNF)
WCAG 2.1 AA; foco visível; alvos 44 px; switches com estado em texto; erros ligados ao campo; ordem de foco = ordem visual; navegação inferior
como `<nav aria-label="Admin">` com `aria-current="page"`; toasts `role="status"`; dialogs nativos com foco preso e retorno; tabelas (desktop) com
`<th scope>`; nada que dependa de arrastar, de hover ou de cor; zoom 200% sem perda; sessão expirando avisa 2 min antes com opção "Continuar
conectado" (WCAG 2.2.1).

### 5.8 Prévia (H8) — C34 PreviewRibbon
A prévia é a **loja real** com o rascunho, mais uma faixa fixa no topo, acima do header: fundo `--color-warning`, texto `--color-bg` Lexend 600 14px
(11,62:1): **"PRÉVIA - não publicada. Só você vê."** + [Voltar ao admin] + [Publicar]. A LegalStrip continua embaixo. Gate 18+ pode ser pulado na
prévia (o sócio já é maior; evita atrito) **[default de design, TL confirma se é seguro]**. Prévia nunca é indexável nem compartilhável sem login.

---

## 6. Templates de landing/campanha editáveis

Base: a landing `/outubro` (promo 03-design seção 3-4) vira **o modelo de página de campanha**. O sócio edita **conteúdo dentro de blocos**,
nunca a estrutura (PO 8: sem editor visual livre). Texto simples com **negrito**, *itálico* e link interno; HTML colado vira texto (PO 6.10).

### 6.1 Blocos da landing
| # | Bloco | Fixo / editável | Campos editáveis e limites | Pode ocultar? |
|---|---|---|---|---|
| 0 | Gate 18+ / AgeDenied | **TRAVADO** | - | não |
| 1 | Header promo (logo + "Ver catálogo") | fixo | - | não |
| 2 | Hero | editável | Eyebrow (32) · Palavra grande Syne (10, ex. "FRETE") · Complemento serifado laranja (14, ex. "grátis") · Texto (160) · Rótulo do botão primário (lista: "Montar meu pedido", "Ver catálogo", "Ver modelos") · Nota de exceções (160, opcional) | não |
| 2a | Selo de período / contador | automático (datas da campanha) | - | contador sim |
| 2b | Cartão-resumo (md+) | automático (taxas) | legenda (60) | sim |
| 3 | Onde vale (quadro de regiões) | automático (regiões + campanha) | Título (40) · Intro (140) · Etiqueta do bloco grátis (24) | não em frete grátis |
| 4 | Como funciona | editável | Título (40) · 3 passos (90 cada) | sim |
| 5 | Escolha seu pod (price-list Capa) | automático (catálogo; modelos em falta com StockTag) | Título (40) | sim |
| 6 | Regras da promoção | parcialmente editável | até 6 regras (140 cada) + **2 regras travadas sempre ao final**: "Pedido sujeito à confirmação de disponibilidade pelo atendimento." e "Proibida a venda para menores de 18 anos. A idade pode ser conferida no ato da entrega." A regra de período é gerada das datas. | não |
| 7 | CTA final | editável | Título (40) · Texto (140) | não |
| 8 | Footer | fixo (textos vêm de Textos) | - | não |
| 9 | LegalStrip | **TRAVADO** | - | não |
| - | Estados `breve` / `encerrada` | editável com padrão pronto | por estado: eyebrow, h1 (palavra + serifado), texto, título do CTA final (mesmos limites); padrão = textos de outubro adaptados ("VALEU, novembro") | - |
| - | Metadados | parcialmente | título da página (60) e descrição (155) com sufixo fixo " - NOMAD puffs" e frase 18+ obrigatória anexada à descrição | não |
| - | Visual (cores, fontes, ordem dos blocos, imagens, scripts, pixels, `noindex`) | **TRAVADO** | - | - |

Limites calculados para caber em 360 px sem quebrar a hierarquia: palavra grande de 10 caracteres em `--fs-display` mínimo (36 px Syne 800)
ocupa ~312 px; o serifado de 14 caracteres a 40 px cabe em 1 linha; textos de 160 ocupam <= 5 linhas em 38ch.

### 6.2 Blocos da home
| Bloco | Fixo/editável | Limites |
|---|---|---|
| Gate, LegalStrip, aviso legal do rodapé, NoScript | **TRAVADO** | - |
| CampaignBanner | por campanha (3.7) | 3.7 |
| Hero: eyebrow, "NOMAD *puffs*", slogan "VAPOR SEM FRONTEIRAS" | fixo (é a marca) | - |
| Hero: frase de abertura | editável | 120 |
| Hero: 3 passos "Como funciona" | editável | 40 cada |
| Price list / Catálogo / cards | automático (catálogo) | - |
| Aviso de disponibilidade (rodapé) | editável | 140 |
| Horário de atendimento (novo, rodapé e hero) | editável | 80 |
| WhatsApp | editável com confirmação dupla | formato (63) 9XXXX-XXXX |
| FAQ / Sobre (R3, H32) | editável, lista de perguntas | pergunta 90 / resposta 400, até 8 itens, `<details>` |

### 6.3 Guardas de conteúdo **[sugestão para PO/TL]**
Antes de publicar texto de campanha/landing, o admin mostra **aviso** (não bloqueio) se encontrar termos sensíveis (saúde, "parar de fumar",
"sem risco", "menor", "criança", "teen"): "Este texto pode ferir as regras de propaganda. Revise antes de publicar." A lista é mantida pela squad.

---

## 7. Como o design system é mantido no código (preferências para o Tech Lead, sem impor tecnologia)

1. **Fonte única = `src/styles/tokens.css`** (CSS custom properties). Admin, loja, landing e prévia importam o mesmo arquivo. Nenhum hex fora dele
   (inclusive no admin). Se o admin usar outra stack/biblioteca, ela **consome** essas variáveis (não redefine paleta). Tokens novos da seção 2.9
   entram aqui.
2. **Paleta de sabores com uma lista só**: `FLAVOR_TOKENS` (TS) e `--flavor-*` (CSS) precisam ficar sincronizados — preferência: gerar um do outro
   ou ter teste que trave a igualdade (como já se faz com as datas da promo). Os nomes em PT para o admin (2.2) moram junto da lista.
3. **Lint de estilo**: proibir cor literal fora de `tokens.css` (ex.: regra de stylelint), proibir `style=""` e `<style>` inline (CSP), e
   `outline: none` sem substituto.
4. **Catálogo de componentes vivo — `/admin/estilo` ("Guia visual")**: página atrás do login (ou rota só de dev excluída do build público,
   à escolha do TL) que renderiza os **componentes reais** em todos os estados: botões, FlavorOption (normal/selecionado/erro/**em falta**),
   card (normal/**modelo em falta**/com selo/sem foto), CartLine (**em falta/indisponível**), banner (3 estados), landing por estado, tokens com
   amostras e contrastes. Usos: QA roda axe nessa página; Playwright tira screenshots para **regressão visual** (garante "não mudar a cara");
   sócio vê exemplos de foto e limites de texto. Não preciso de Storybook se a página resolver isso.
5. **Componentes da loja continuam `.astro` + BEM** (`app.css`, `promo.css`); componentes novos em arquivo próprio (`stock.css`, `admin.css`)
   só com tokens. Estados por atributo (`data-stock="out"`, `data-promo`), não por classe aleatória, para CSS e testes acharem o mesmo seletor.
6. **Conteúdo editável tipado com limites**: os limites de caracteres das seções 3.7 e 6 viram parte do esquema de dados (o mesmo número
   valida no admin e no build), para o layout nunca receber texto maior que o desenhado.
7. **Mudança de token** = PR com antes/depois no Guia visual + tabela de contraste atualizada neste documento.

---

## 8. Checklist de acessibilidade (Dev/QA) — novidades deste escopo
- [ ] "Em falta no estoque" sempre em texto, dentro do `<label>` do sabor; radio `disabled`; anunciado por leitor de tela; nunca só cor/opacidade.
- [ ] Modelo em falta: botão desabilitado com motivo visível (AA) ligado por `aria-describedby`; chip do ModelNav com nome acessível incluindo o estado.
- [ ] Carrinho: CartStockAlert `role="alert"` ao surgir; "Fora do total" em texto; foco gerenciado ao bloquear envio e ao "Remover itens em falta".
- [ ] Mudança de disponibilidade com a página aberta anunciada uma vez via LiveRegion (sem repetir a cada recheque).
- [ ] Quantidade limitada ao saldo **[B]** com mensagem textual.
- [ ] Estoque baixo nunca exposto na loja.
- [ ] Foto de produto: `alt` descritivo sem preço; `aspect-ratio` reservado (CLS 0); primeiro card com prioridade de carregamento.
- [ ] Banner/landing editáveis: limites de texto respeitados; nenhum HTML executável; travas presentes nos 3 estados.
- [ ] Admin: navegação, switches, dialogs, toasts e formulários conforme 5.3/5.7; axe sem violações em todas as telas; teste com leitor de tela (TalkBack/VoiceOver) no fluxo "marcar em falta".
- [ ] Contrastes novos (2.9/2.10) verificados no Guia visual.

---

## 9. Pendências e decisões para Tech Lead, PO e dono

**Para o dono (bloqueiam ou mudam visual)**
1. **D9 — Fotos dos produtos sem preço** (bloqueante do R1): produzir conforme 4.2 (4:5, 1600x2000, fundo transparente ou `#131416`, sem texto).
   Também **Capa e imagem de compartilhamento sem preços**. Quem produz? Até chegar, a loja usa o palco tipográfico (4.3).
2. Aprovar a **ordem** "sabores em falta vão para o fim da lista" e "modelo em falta fica no lugar" (3.2/3.3).
3. Aprovar as **4 cores novas de sabor** (2.9) ou dizer quais sabores vêm por aí.
4. Confirmar que o preço continua aparecendo (em cinza) quando o modelo inteiro está em falta (3.3).

**Para o Tech Lead**
1. A x B muda: tela de login (A pode exigir conta de terceiro, 5.5), tempo do "Publicado... até N minutos", existência de Estoque com saldo e Pedidos (R2),
   recheque de disponibilidade no carrinho (RE8).
2. Viabilidade do **Guia visual** (`/admin/estilo` atrás de login ou rota só de dev) + regressão visual por screenshot (seção 7).
3. Lint de cor literal / `style` inline; sincronização `FLAVOR_TOKENS` x `--flavor-*`; tokens `--z-*` (renomeação sem mudar valores).
4. Prévia: pode pular o gate 18+ para sócio autenticado? Prévia nunca indexável/compartilhável (5.8).
5. **[B]** Lançamento de estoque publica na hora vs. passa pela barra de publicação (5.5) — recomendo "na hora" para estoque, "publicar" para conteúdo.
6. Pipeline de imagem: aceitar PNG com alfa, remover EXIF, gerar AVIF/WebP nas larguras e pesos de 4.2.
7. Limites de caracteres (3.7, 6.1, 6.2) no esquema de dados, validados no admin e no build.
8. Admin com política CSP própria sem afrouxar a da loja; fontes self-host também no admin.

**Para o PO**
1. H10 ("modelo sem foto bloqueia publicar") x transição de fotos (D9): permitir palco tipográfico temporário?
2. Guardas de termos sensíveis na publicação de textos (6.3): aviso ou bloqueio?
3. Banner: com 2 campanhas ativas não-frete (R3 Could), vale a mais recente (3.7)?
4. CartFab contando só linhas disponíveis (3.4).

Nada aqui altera o gate, a LegalStrip, os textos legais, a CSP da loja nem a promoção de outubro em vigor.
