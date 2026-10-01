# 03 - Design - site-mvp (NOMAD puffs)

Entrada: `02-po.md`, `CLAUDE.md`, `01-pm.md` e as imagens de `assets/brand/` e `assets/produtos/` (vistas uma a uma).
Nao existia design system, tokens nem UI kit no projeto (so assets). Este documento e a **convencao inicial**: tudo abaixo vira a fonte unica de tokens (`tokens.css` / tema), a ser criado pelo Dev no T6. Mesmo design para os dois builds (Vercel e estatico): nada aqui depende de recurso da Vercel.

> Nota de honestidade sobre cores: `#131416`, `#E8DCC4` e `#E38A4E` vem do CLAUDE.md e conferem com as imagens. As cores das bolinhas de sabor e o cinza secundario foram **estimados a olho** nas imagens (nao tenho ferramenta de amostragem de pixel). O Dev deve conferir com conta-gotas nos PNGs no T6 e ajustar o hex; a estrutura dos tokens nao muda. Contrastes abaixo foram calculados por formula WCAG com os hex propostos.

## 1. Decisoes de design (resumo)
- Visual: dark, editorial, tipografia gigante (como os cards). Fundo quase preto, texto creme, laranja so para preco, CTA e "puffs".
- **Imagens de produto usadas como estao** (card 1080x1920, 9:16, sem recorte, sem filtro). Elas carregam nome, preco e sabores "queimados" na imagem; por isso **a UI real (texto selecionavel) e a fonte de verdade** e o `alt` da imagem **nao repete preco** (evita divergencia quando o preco mudar no arquivo de dados). Risco para PO/TL: se preco mudar, o PNG fica desatualizado ate ser refeito.
- Pagina unica (single page) com ancoras; carrinho e checkout em drawer/bottom sheet. Sem rotas, entao funciona em hospedagem sem rewrite e com URL base configuravel.
- Sem fontes externas: **self-host** (fontsource / arquivos locais, `font-display: swap`), por LGPD e performance.

## 2. Design tokens

### 2.1 Cores
| Token | Hex | Uso |
|---|---|---|
| `--color-bg` | `#131416` | fundo geral (das imagens) |
| `--color-surface` | `#1A1B1E` | cards, drawer |
| `--color-surface-2` | `#222326` | campos, chips, hover |
| `--color-line` | `#2C2D31` | divisores (hairlines dos cards) |
| `--color-line-strong` | `#4A4B50` | borda de campo/controle (>=3:1 contra bg) |
| `--color-watermark` | `#1F2120` | marca d'agua "N" em circulo (decorativa, aria-hidden) |
| `--color-text` | `#E8DCC4` | texto principal, titulos (creme) |
| `--color-text-muted` | `#A39B8B` | rotulos, texto secundario (estimado das imagens) |
| `--color-accent` | `#E38A4E` | preco, "puffs", CTA, links |
| `--color-accent-hover` | `#EE9A60` | hover do CTA |
| `--color-accent-press` | `#CC7840` | pressed |
| `--color-on-accent` | `#131416` | texto sobre laranja |
| `--color-error` | `#FF6B5E` | erros (texto e borda) |
| `--color-error-bg` | `#2A1716` | fundo de aviso de erro |
| `--color-success` | `#5ED6AE` | confirmacoes ("Adicionado") |
| `--color-focus` | `#F5E9CF` | anel de foco (alto contraste) |
| `--color-overlay` | `rgba(10,10,12,.72)` | scrim de modal/drawer |

Contraste (WCAG, calculado):
| Par | Razao | Resultado |
|---|---|---|
| text `#E8DCC4` sobre bg `#131416` | ~13,6:1 | AAA |
| text-muted `#A39B8B` sobre bg | ~6,6:1 | AA (texto normal) |
| text-muted sobre surface `#1A1B1E` | ~6,1:1 | AA |
| accent `#E38A4E` sobre bg | ~7,0:1 | AA/AAA |
| accent sobre surface-2 `#222326` | ~6,0:1 | AA |
| on-accent `#131416` sobre accent (botao) | ~7,0:1 | AA/AAA |
| error `#FF6B5E` sobre bg | ~6,6:1 | AA |
| success `#5ED6AE` sobre bg | ~10:1 | AAA |
| focus `#F5E9CF` sobre bg / sobre accent | ~14:1 / ~7:1 | >=3:1 (WCAG 1.4.11) |
| line-strong `#4A4B50` sobre bg | ~2,2:1 | **nao** serve como unico indicador; campos tem tambem rotulo e fundo surface-2. Para borda que precisa de 3:1 usar `--color-field-border: #6E6F74` (~3,6:1) |

Regra: nunca usar `--color-line`/`--color-watermark` para informacao. Texto abaixo de 14px so em `--color-text` ou `--color-text-muted` (nunca laranja pequeno em fundo claro; nao ha fundo claro).

### 2.2 Cores dos sabores (bolinhas, como nas imagens)
Bolinha: circulo 12px (mobile) / 14px, `border: 1px solid rgba(255,255,255,.12)`. Combos "+" mostram duas bolinhas lado a lado (gap 4px), como nos cards; Watermelon + Cherry + Grape do CLAUDE.md aparece na imagem V400 como "Cherry + Grape" (duas bolinhas) -> **divergencia a conferir com o dono (D11): imagem diz "Cherry + Grape"; CLAUDE.md/PO dizem "Watermelon + Cherry + Grape"** e a imagem tambem quebra "Strawberry Grape Ice + Kiwi Watermelon" numa linha so por ser longo (provavel "Kiwi" / "Watermelon" juntos). Usar o texto do arquivo de dados; as cores abaixo seguem a imagem, com 3a bolinha `--flavor-watermelon` se o dado confirmar 3 sabores.

| Token | Hex (estimado) | Onde |
|---|---|---|
| `--flavor-pineapple` | `#F2CA50` | Pineapple Ice (V55, V155) |
| `--flavor-grape` | `#8E5BD9` | Uva Ice, Grape Ice, parte de Cherry + Grape |
| `--flavor-mint` | `#5ED6AE` | Icy Mint (V55, V155, V400) |
| `--flavor-menthol` | `#8DD3F5` | Menthol (V155, V400) |
| `--flavor-watermelon` | `#EE5F7D` | Watermelon Ice, Watermelon + Peach Frost (1a) |
| `--flavor-peach` | `#F4A07A` | Peach Grape (2a), Peach Frost (2a) |
| `--flavor-melon` | `#A5DB5F` | Mighty Melon |
| `--flavor-mango` | `#F5A623` | Mango |
| `--flavor-passion` | `#E0507A` | Passion Fruit Guava |
| `--flavor-strawberry` | `#E8434E` | Strawberry Grape Ice (1a), Strawberry Blend |
| `--flavor-kiwi` | `#7DC23F` | Kiwi |
| `--flavor-cherry` | `#C4243F` | Cherry |
| `--flavor-apple` | `#A0DB48` | Sour Apple Ice |
| `--flavor-lemonade` | `#F4A0C8` | Pink Lemonade |
| `--flavor-tropical` | `#3CC9B8` | Tropical Baja |

Mapa por modelo (ordem do arquivo de dados; campo sugerido `dots: [token,...]`):
- V55: Pineapple Ice [pineapple]; Uva Ice [grape]; Icy Mint [mint]
- V155: Pineapple Ice [pineapple]; Menthol [menthol]; Grape Ice [grape]; Watermelon Ice [watermelon]; Icy Mint [mint]
- V400 Mix Slim: Icy Mint + Peach Grape [mint, peach]; Menthol + Mighty Melon [menthol, melon]; Mango + Passion Fruit Guava [mango, passion]; Strawberry Grape Ice + Kiwi [strawberry, kiwi]; Watermelon + Cherry + Grape [cherry, grape] (+ watermelon se confirmado)
- Elfbar Pro 40K: Sour Apple Ice [apple]; Strawberry Blend [strawberry]; Pink Lemonade [lemonade]; Watermelon + Peach Frost [watermelon, peach]; Tropical Baja [tropical]

Bolinha e sempre decorativa (`aria-hidden`); o nome do sabor esta sempre em texto (requisito do PO).

### 2.3 Tipografia (Google Fonts equivalentes, self-hosted)
| Papel | Familia sugerida | Alternativas | Observacao |
|---|---|---|---|
| Titulos extra-largos e pesados ("NOMAD", "V155", precos grandes) | **Syne** 800 | Unbounded 800; Lexend Giga 800 | Syne ExtraBold e a mais proxima da sans extendida pesada; testar lado a lado com o logo no T6 |
| Serifada italica ("puffs", "Mix Slim", "Pro 40K") | **Lora Italic** 500 | Fraunces Italic; Newsreader Italic | cor sempre `--color-accent` |
| UI / corpo / nomes de sabor | **Lexend** 400/500/600 | Outfit; Manrope | leitura boa em tela pequena, largura levemente aberta como nos cards |
| Rotulos (eyebrow) | Lexend 500, CAIXA ALTA, `letter-spacing: .22em` | - | ex.: "POD DESCARTAVEL", "SABORES · 3", "CATALOGO" |

Escala (mobile / >=1024px), `line-height` entre parenteses:
| Token | Mobile | Desktop | Uso |
|---|---|---|---|
| `--fs-display` | 56px (.95) | 96px | hero "NOMAD" |
| `--fs-model` | 44px (1.0) | 56px | nome do modelo no card (Syne 800, creme) |
| `--fs-price` | 40px (1.0) | 48px | numero do preco (Syne 800, laranja); "R$" a 40% do tamanho, alinhado ao topo |
| `--fs-h2` | 28px (1.1) | 36px | titulos de secao / drawer |
| `--fs-body` | 16px (1.5) | 16px | texto, sabores (nunca menor que 16px em campos: evita zoom no iOS) |
| `--fs-small` | 14px (1.45) | 14px | notas, erros, aviso legal |
| `--fs-label` | 12px (1.3) | 12px | eyebrow em caixa alta com tracking |

### 2.4 Espacamento, raios, sombras, movimento
- Escala base 4px: `--space-1:4  -2:8  -3:12  -4:16  -5:24  -6:32  -7:48  -8:64  -9:96`.
- Margem lateral da pagina: 24px mobile (como nos cards: ~96/1080), 32px >=640, container max 1200px.
- Raios: `--radius-sm:8px` (campos, chips), `--radius-md:14px` (cards, botoes), `--radius-lg:24px` (bottom sheet, gate), `--radius-full:999px` (bolinhas, FAB, pilulas).
- Sombras (dark: pouca sombra, usar borda): `--shadow-card: 0 1px 0 rgba(255,255,255,.04) inset, 0 8px 24px rgba(0,0,0,.35)`; `--shadow-sheet: 0 -12px 40px rgba(0,0,0,.55)`; `--shadow-fab: 0 6px 20px rgba(0,0,0,.5)`.
- Movimento: `--ease: cubic-bezier(.2,.7,.2,1)`; `--dur-fast:120ms`, `--dur:220ms`, `--dur-slow:360ms`. Tudo desligado/reduzido com `prefers-reduced-motion: reduce` (so troca de opacidade instantanea, sem transform).
- Alvos: `--hit-min: 44px` (botao, radio, stepper, checkbox, link isolado). Distancia minima entre alvos: 8px.
- Marca d'agua: icone "N" em circulo (SVG do logo, traco ~38px a 1080), cor `--color-watermark`, ~70% da largura da viewport, ancorado no canto inferior direito, cortado pela borda, `pointer-events:none; aria-hidden`. Aparece no hero, no gate e no rodape (nao sobre campos de formulario).

## 3. Breakpoints
Mobile-first; base = 360px (funciona ate 320px, sem scroll horizontal).
| Nome | min-width | Mudancas |
|---|---|---|
| base | 0 (360 referencia) | 1 coluna; carrinho = bottom sheet 92dvh; FAB do carrinho |
| `sm` | 640px | cards de produto em 2 colunas; drawer vira painel lateral 440px a direita |
| `md` | 900px | hero em 2 colunas (texto + logo vertical/marca d'agua); chips de modelos viram abas fixas |
| `lg` | 1200px | cards em 4 colunas (container 1200); tipografia desktop |

## 4. Componentes (lista)
Reaproveitar nenhum (nao existiam). Todos novos, finos, sobre os tokens acima. Decisao: sem biblioteca de UI pesada; componentes proprios para respeitar identidade, peso de JS e a11y.

| # | Componente | Funcao / variantes |
|---|---|---|
| C1 | `Logo` | horizontal (header: icone + "NOMAD" Syne 800 + "puffs" Lora italic laranja) e vertical; usar `assets/brand/logo-horizontal-escuro.png` / SVG se o Dev vetorizar; favicon = `assets/brand/favicon.png` |
| C2 | `Watermark` | "N" em circulo decorativo |
| C3 | `Button` | primario (laranja, texto escuro), secundario (contorno creme), terciario/texto, `danger-text`; tamanhos md 48px / lg 56px de altura; estados default, hover, focus, pressed, disabled (`aria-disabled`, com motivo visivel), loading |
| C4 | `Eyebrow` | rotulo caixa alta com tracking |
| C5 | `PriceTag` | "R$" pequeno + numero grande laranja (Syne). Variante `compact` (linha do carrinho) formata "R$ 85,00" em Lexend 600 |
| C6 | `FlavorDot` / `FlavorDots` | 1 a 3 bolinhas decorativas |
| C7 | `FlavorOption` | linha selecionavel (radio nativo estilizado): bolinhas + nome; altura >=48px; divisor `--color-line`; selecionado = anel laranja + check + fundo surface-2 |
| C8 | `FlavorGroup` | `fieldset`+`legend` "Sabor" (visivel como eyebrow "SABORES · N"), mensagem de erro vinculada (`aria-describedby`), `role=radiogroup` nativo |
| C9 | `QuantityStepper` | [-] numero [+]; botoes 44x44; numero com `inputmode="numeric"`, 1-10; `-` desabilitado em 1; mensagem de maximo em 10 |
| C10 | `ProductCard` | imagem (como esta) + eyebrow + nome + subtitulo serifado + PriceTag + FlavorGroup + QuantityStepper + Button "Adicionar ao carrinho" + feedback |
| C11 | `ModelNav` | chips/abas ancora: V55, V155, V400, Elfbar (sticky no topo abaixo do header) |
| C12 | `Header` | logo + botao carrinho com contador (badge) |
| C13 | `CartFab` | botao flutuante com contagem + subtotal (so aparece com itens, mobile e tablet) |
| C14 | `Drawer` / `BottomSheet` | contem Carrinho e Checkout; modal com foco preso, ESC fecha, scrim |
| C15 | `CartLine` | modelo (Syne 700), sabor com bolinhas, stepper, valor da linha, "Remover" |
| C16 | `SelectField` | `<select>` nativo estilizado (melhor UX/a11y mobile) para regiao; rotulo visivel, ajuda, erro |
| C17 | `RadioCardGroup` | forma de pagamento (3 cards de radio, 56px de altura) |
| C18 | `OrderSummary` | subtotal, entrega, total (total em destaque Syne) |
| C19 | `InlineAlert` | erro / aviso / info; `role="alert"` (erro) ou `role="status"` |
| C20 | `Toast/StatusLive` | confirmacao "Adicionado" via `aria-live="polite"` (visual discreto, 3s) |
| C21 | `AgeGate` | dialogo modal 18+ (tela cheia) |
| C22 | `AgeDenied` | estado de recusa (tela cheia, sem links de pedido) |
| C23 | `EmptyState` | carrinho vazio (ilustracao = watermark + texto + botao) |
| C24 | `Footer` | aviso legal, privacidade, slogan, contato |
| C25 | `LegalStrip` | faixa fixa "Proibida a venda para menores de 18 anos" (ver 5.3) |
| C26 | `NoScriptNotice` | aviso sem JS + link direto ao WhatsApp |

## 5. Telas e estados

Mapa do fluxo: Gate 18+ -> Home (hero + catalogo) -> Adicionar -> Carrinho (sheet) -> Checkout (mesma sheet, passo 2) -> WhatsApp. Rodape e faixa legal sempre presentes apos o gate.

### 5.1 Gate 18+ (H1, H9, RN9)
Componente `AgeGate`, `role="dialog" aria-modal="true" aria-labelledby aria-describedby`, tela cheia sobre o fundo `--color-bg` com `Watermark` grande. Resto da pagina com `inert` + `aria-hidden` (catalogo e carrinho inacessiveis por teclado). Foco inicial no titulo (tabindex=-1) e foco preso no dialogo; sem fechar com ESC nem clicando fora.

Layout (mobile, centralizado verticalmente, margem 24px):
1. Logo vertical (icone + NOMAD + puffs), ~160px.
2. Eyebrow: "VERIFICACAO DE IDADE".
3. Titulo (Syne 800, 32px): "Voce tem 18 anos ou mais?"
4. Texto (16px, muted): "Este site e destinado a maiores de 18 anos. Proibida a venda a menores de 18 anos."
5. Botao primario lg (largura total): "Tenho 18 anos ou mais".
6. Botao secundario lg (largura total): "Sou menor de 18 anos". Os dois com mesmo peso de tamanho, ordem: primario primeiro.
7. Nota (14px, muted): "Ao continuar, voce declara ser maior de idade. A idade tambem e conferida na entrega."

Estados:
- Inicial: acima. Hover/foco/pressed conforme `Button`.
- Carregando: gate e renderizado **antes** de qualquer conteudo (inline no HTML; sem flash do catalogo). Se JS ainda nao rodou, `NoScriptNotice`/gate em HTML puro nao libera o catalogo.
- Sucesso: ao confirmar, fade 220ms, foco vai ao `h1` do hero (ou ao link "Pular para o catalogo"); grava no localStorage. Sem localStorage: segue na sessao, sem erro visivel (RN9).
- Recusa (`AgeDenied`, substitui o conteudo do gate, mesmo layout): titulo "Acesso restrito"; texto "O acesso a este site e permitido apenas para maiores de 18 anos."; sem botao de pedido nem link de WhatsApp; unico botao terciario "Voltar" (reabre a pergunta) — recarregar tambem reabre o gate (D2). Foco no titulo, `role="alert"`.
- Erro: nao ha estado de erro do usuario; falha ao gravar storage e silenciosa.

### 5.2 Home / hero (H2)
Header fixo (altura 64px): Logo horizontal a esquerda; botao carrinho (icone sacola + contador, alvo 48x48, `aria-label="Abrir carrinho, N itens"`) a direita. Abaixo, `ModelNav` sticky (chips 44px de altura, rolagem horizontal sem barra visivel, `aria-label="Modelos"`).

Hero (altura minima ~ 70dvh mobile): fundo bg + `Watermark` no canto inferior direito.
- Eyebrow: "CATALOGO DE PODS"
- H1 (Syne 800, `--fs-display`): "NOMAD" e abaixo "puffs" (Lora italic laranja, 40px).
- Slogan (eyebrow muted): "VAPOR SEM FRONTEIRAS".
- Texto: "Escolha seu pod, monte o pedido e finalize pelo WhatsApp. Entrega em Palmas - TO."
- CTA primario: "Ver catalogo" (ancora ao primeiro card). CTA secundario (texto): "Como funciona" abre 3 passos em linha: "1 Escolha o sabor", "2 Informe regiao e pagamento", "3 Envie pelo WhatsApp" (lista ordenada, sem JS).
- Tabela-resumo opcional (como capa-catalogo.png): lista "V55 R$ 85 / V155 R$ 110 / V400 Mix Slim R$ 140 / Elfbar Pro 40K R$ 140" com hairlines, cada linha e link ancora ao produto (alvo >=48px). Dados vem do arquivo de dados, nao do PNG.
- Contato: "Peca pelo WhatsApp (63) 98123-9498" (laranja no numero; link `tel`/wa.me).

Estados: inicial/sucesso = acima; carregando = conteudo textual imediato (sem skeleton necessario, e estatico); erro = n/a.

### 5.3 Catalogo e ProductCard (H2, H3, RN1-RN4)
Secao `<section aria-labelledby>` H2 "Catalogo". Grid: 1 col (base), 2 col (sm), 4 col (lg), gap 24px. Cada card e `<article id="v55">` com `h3` = nome.

Estrutura do `ProductCard` (de cima para baixo):
1. **Imagem** do card oficial, como esta (9:16, `width:100%`, `height:auto`, `aspect-ratio: 9/16` reservando espaco = sem CLS, `loading="lazy"` exceto o 1o, `decoding="async"`, `srcset` com versoes redimensionadas 540/720/1080 se o TL otimizar; bordas `--radius-md`). `alt`: "Card do catalogo NOMAD puffs: <modelo>" (sem preco). Em base, a imagem ocupa a largura do card (max-width 360px, centralizada) para nao dominar a rolagem; ela e conteudo ilustrativo, a compra acontece no painel abaixo.
2. **Painel de compra** (surface, padding 20px, `--shadow-card`):
   - Eyebrow "POD DESCARTAVEL"
   - Nome (Syne 800, `--fs-model`) e, quando houver, subtitulo serifado laranja ("Mix Slim", "Pro 40K") — Nome do dado: "V400 Mix Slim" / "Elfbar Pro 40K"; a UI separa para o visual dos cards, mas `aria-label` e a mensagem usam o nome completo.
   - `PriceTag`: "R$" + "85" (inteiro como nos cards; o carrinho/mensagem usam "R$ 85,00").
   - `FlavorGroup`: legend "SABORES · 3" (nome do grupo acessivel: "Sabor"); lista de `FlavorOption` com bolinhas + nome, como nos cards (divisores finos). **Nenhum pre-selecionado** (RN3). Radio nativo, setas navegam, Tab entra no grupo.
   - Linha: rotulo "Quantidade" + `QuantityStepper` (1 a 10, inicial 1).
   - Botao primario lg largura total: "Adicionar ao carrinho - R$ 170,00" (o valor atualiza com a quantidade quando ha sabor; sem sabor mostra so "Adicionar ao carrinho").

Estados do card:
- Inicial: nenhum sabor marcado, qtd 1, botao habilitado (aria nao desabilitado, para poder anunciar o erro).
- Erro "sem sabor": ao clicar no botao sem sabor, `InlineAlert` dentro do `FlavorGroup`: "Escolha um sabor". `aria-describedby` no grupo, `role="alert"`, foco move para o 1o radio, legend recebe cor de erro e borda do grupo `--color-error`. Some ao selecionar.
- Sucesso: botao muda por 1,6s para "Adicionado" (check, verde `--color-success` no icone, texto creme), `StatusLive` anuncia "V155 Menthol, 2 unidades, adicionado ao carrinho"; badge do header faz pulse 220ms; sabor e quantidade resetam (sabor desmarcado, qtd 1) para evitar adicionar duplicado sem querer.
- Maximo: ao tentar passar de 10 (no stepper ou na soma com o carrinho): `InlineAlert` info abaixo do stepper: "Maximo de 10 unidades por item. Para mais, fale com a gente no WhatsApp." (texto exato do PO).
- Quantidade invalida digitada: normaliza no `blur` para 1-10 inteiro (vazio/0/texto -> 1; >10 -> 10 + mensagem de maximo).
- Carregando imagem: caixa 9:16 com fundo surface-2 e `Watermark` suave; texto/preco/botoes ja utilizaveis.
- Imagem com erro: caixa mantida com o icone "N" e texto "Imagem indisponivel" (muted); resto do card normal.
- Vazio: n/a (catalogo vem do arquivo; se a lista de sabores estiver vazia em algum modelo, o card mostra "Sabores indisponiveis no momento" e desabilita o botao com motivo visivel).

### 5.4 Carrinho (H4, H11, H15, RN2, RN4, RN5)
Abre ao tocar no botao do header ou no `CartFab` (FAB: canto inferior direito, 56px, laranja, "Carrinho · 3 · R$ 330,00" como pilula larga >=640? em mobile e pilula com icone + contagem; so aparece com itens; nao cobre a `LegalStrip`: fica 16px acima dela). Mobile: bottom sheet 92dvh com alca visual (decorativa), cantos `--radius-lg`; sm+: painel lateral direito 440px. Modal: foco preso, ESC e botao "Fechar" (48px) fecham, scrim clicavel fecha, foco retorna ao botao que abriu, rolagem do fundo travada.

Conteudo (passo "Carrinho"):
- Titulo H2: "Seu carrinho" + contagem "(3 itens)".
- Lista de `CartLine` (`<ul>`): linha 1: nome do modelo (Syne 700, 16px) a esquerda e valor da linha ("R$ 220,00", Lexend 600 laranja) a direita; linha 2: bolinhas + sabor (muted-claro 14px); linha 3: stepper (44px) a esquerda e botao texto "Remover" (alvo 44px, `aria-label="Remover V155 Menthol"`) a direita. Preco unitario em muted: "R$ 110,00 cada".
- Divisor; `OrderSummary` parcial: "Subtotal  R$ 360,00".
- Link terciario "Limpar carrinho" (pede confirmacao inline: "Limpar todos os itens?" [Cancelar] [Limpar]).
- Rodape fixo do sheet: botao primario lg "Continuar" (-> passo Checkout). Link "Continuar comprando" (fecha).

Estados:
- Vazio (`EmptyState`): Watermark pequeno, titulo "Seu carrinho esta vazio", texto "Escolha um modelo e um sabor para comecar.", botao primario "Ver catalogo" (fecha o sheet e rola ate o catalogo). Sem botao de enviar (ou botao `aria-disabled` com motivo "Adicione ao menos 1 item" — preferir ocultar).
- Com itens: acima. Alterar quantidade recalcula na hora e anuncia o novo subtotal em `aria-live="polite"`.
- Remover: linha some (fade/colapso 220ms); toast com "Item removido. Desfazer" por 5s (desfazer e opcional / Could; se nao implementar, so mensagem "Item removido").
- Item invalido restaurado do storage: descartado em silencio (PO); precos sempre do catalogo atual.
- Carregando: carrinho le do storage antes de pintar o badge; ate la badge oculto (evita "0" piscando).
- Erro: nenhum especifico; storage indisponivel = carrinho so em memoria, sem aviso.

### 5.5 Checkout: regiao, pagamento, revisao e envio (H5, H6, H7, H12, RN6-RN13)
Mesmo drawer, passo 2 ("Finalizar pedido"), com botao "Voltar ao carrinho" no topo. Ordem vertical, um formulario `<form novalidate>`:

1. **Resumo de itens** (colapsado por padrao em mobile: "3 itens - Subtotal R$ 360,00 [Ver itens]", `aria-expanded`).
2. **Regiao de entrega** — `SelectField`, rotulo "Regiao de entrega (Palmas - TO)", placeholder "Selecione sua regiao". Opcoes (rotulo + taxa, como no PO), nessa ordem:
   - "Quadras 700 Sul a 200 Norte/Sul - R$ 8,00"
   - "Quadras 300 Norte a 600 Norte - R$ 10,00"
   - "Quadras 800 a 1200 - R$ 10,00"
   - "Quadras 1300 a 1500 Sul - R$ 15,00"
   - "Santo Amaro - R$ 15,00"
   - "Lago Norte - R$ 20,00"
   - "Bertaville e Aurenys - R$ 30,00"
   - "Taquaralto e Lago Sul - R$ 35,00"
   - "Taquari - R$ 35,00"
   - "Outra regiao, combinar no WhatsApp"
   Texto de ajuda: "Nao achou seu bairro? Escolha 'Outra regiao' e combine com a gente." Ao selecionar, mostra chip: "Taxa de entrega: R$ 20,00" (ou "Taxa de entrega: a combinar").
3. **Forma de pagamento** — `RadioCardGroup` (fieldset, legend "Forma de pagamento"): "PIX", "Cartao de debito", "Cartao de credito"; subtexto fixo no grupo: "Pagamento na entrega." Nenhum pre-selecionado. Cards 56px de altura, largura total, icone simples + texto, selecionado = borda laranja + check.
4. **Resumo do pedido** (`OrderSummary`, `<dl>`): Subtotal; Entrega (valor, ou "a combinar"); linha forte **Total** (Syne 800, 28px, creme; com "Outra regiao": "R$ 360,00 + entrega a combinar").
5. Aviso (14px, muted, icone info): "Pedido sujeito a confirmacao de disponibilidade pelo atendimento." (RN13)
6. Botao primario lg, largura total, fixo no rodape do sheet: "Enviar pedido pelo WhatsApp" (icone WhatsApp). Microtexto abaixo: "Voce vai abrir o WhatsApp com a mensagem pronta. Nao coletamos seus dados neste site."

Estados:
- Inicial: regiao e pagamento vazios; total mostra "Subtotal R$ 360,00 / Entrega: escolha a regiao" e total = subtotal ate escolher regiao, marcado "Total parcial". Botao habilitado (para anunciar erros).
- Erro de validacao ao enviar: WhatsApp nao abre; `InlineAlert` abaixo de cada campo pendente — "Escolha sua regiao de entrega" / "Escolha a forma de pagamento"; campos com borda `--color-error`, `aria-invalid="true"`, `aria-describedby`; um resumo `role="alert"` no topo do form quando ha 2+ erros ("Faltam 2 informacoes para enviar o pedido"); foco vai ao 1o campo com erro; erro some ao corrigir.
- Calculando: instantaneo (sem spinner); total atualiza em `aria-live="polite"`.
- Sucesso/envio: botao entra em "loading" 1,2s ("Abrindo WhatsApp...", `aria-busy`), abre `wa.me` (nova aba/janela) e mostra painel de confirmacao no lugar do botao:
  - Titulo "Pedido pronto para enviar" (foco aqui, `role="status"`).
  - Texto: "Se o WhatsApp nao abriu, use uma das opcoes abaixo. Seu pedido so e confirmado depois da resposta do atendimento."
  - Link/botao secundario: "Abrir WhatsApp" (link wa.me visivel, alvo 48px).
  - Botao secundario: "Copiar mensagem do pedido" -> feedback "Mensagem copiada" (`aria-live`); se a copia falhar, mostra a mensagem num `textarea` readonly selecionavel com "Nao foi possivel copiar. Selecione e copie o texto abaixo."
  - Terciarios: "Limpar carrinho" e "Voltar ao catalogo". O carrinho nao e limpo automaticamente (PO).
- Pop-up bloqueado / sem WhatsApp: mesmo painel de fallback exibido (nao depende de detectar falha).
- Mensagem: exatamente a estrutura RN12 (texto simples, sem emoji, `encodeURIComponent`); a tela de revisao exibe os mesmos subtotal/entrega/total.
- Carrinho esvaziado durante o passo: volta ao estado vazio do carrinho.

### 5.6 Rodape e aviso legal (H9, LGPD)
`LegalStrip`: faixa fina fixa no rodape da viewport (altura 36px, bg `--color-surface`, borda superior `--color-line`, texto 12-14px muted-claro): "Proibida a venda para menores de 18 anos". Visivel em todas as telas pos-gate (inclusive com o sheet fechado); com o sheet aberto, o sheet cobre a faixa e repete o aviso na area do rodape do sheet. Mobile: o conteudo ganha `padding-bottom` para nao ficar sob a faixa e o FAB.

`Footer` (fim da pagina, fundo bg + `Watermark`):
- Logo vertical pequeno + slogan "VAPOR SEM FRONTEIRAS".
- Contato: "Pedidos pelo WhatsApp (63) 98123-9498" (link).
- Aviso legal (destaque, 14px creme): "Conteudo para maiores de 18 anos. Proibida a venda a menores de 18 anos. A idade pode ser conferida no ato da entrega."
- Aviso de disponibilidade: "Precos e sabores sujeitos a disponibilidade. Entregas apenas em Palmas - TO."
- Privacidade (D5, default): "Seu carrinho e a confirmacao de idade ficam salvos apenas neste navegador. O pedido segue para o WhatsApp, sujeito a politica do WhatsApp. Nao coletamos nome, endereco nem telefone neste site."
- Sem alegacao de saude, sem apelo jovem (R1): nenhuma foto de pessoas, linguagem neutra.

### 5.7 Estado global sem JavaScript
`NoScriptNotice` (no lugar do gate/catalogo): "Ative o JavaScript para fazer pedidos." + "Ou chame a gente no WhatsApp: (63) 98123-9498" (link) + aviso "Proibida a venda para menores de 18 anos".

## 6. Microinteracoes
- Botoes: hover clareia `--color-accent-hover` (desktop), pressed escurece e `scale(.98)` 120ms.
- Selecao de sabor: anel laranja + check animam em 120ms; bolinha cresce 1.0 -> 1.15.
- Adicionar: botao "Adicionado" + badge do header pulsa 1x (scale 1.15, 220ms) + FAB aparece com slide-up 220ms.
- Stepper: numero faz "tick" vertical de 120ms ao mudar; limite 1 e 10 com vibracao suave de recusa (shake 160ms, so sem reduced-motion).
- Drawer/sheet: sobe 360ms `--ease` com scrim fade; arraste para baixo fecha (opcional; o botao "Fechar" e obrigatorio e suficiente).
- Total: ao mudar, troca com crossfade 120ms.
- Scroll: chips de `ModelNav` marcam o modelo visivel (`aria-current="true"`), rolagem suave; `scroll-margin-top` considera header + nav.
- `prefers-reduced-motion: reduce`: sem transform/shake/slide; apenas mudanca instantanea de opacidade/cor; rolagem suave desligada.

## 7. Acessibilidade (checklist para Dev e QA)
Contraste e cor
- [x] Texto normal >= 4,5:1 (calculado na 2.1: todos >= 6:1). Revalidar apos conta-gotas nas imagens.
- [ ] Revalidar `--flavor-*` contra bg (decorativas, nao precisam de 4,5:1; cumprem 3:1 so como reforco).
- [x] Bolinhas nunca sao unico indicador; sabor sempre em texto. Estado selecionado = anel + check + fundo, nao so cor. Erro = icone + texto + cor.
- [ ] Bordas de campos/controles >= 3:1 (`--color-field-border #6E6F74`).

Foco e teclado
- [ ] Anel de foco visivel em todos os interativos: `outline: 3px solid var(--color-focus); outline-offset: 2px` (nunca `outline:none` sem substituto); `:focus-visible`.
- [ ] Ordem de tab logica; link "Pular para o catalogo" no topo (visivel ao foco).
- [ ] Gate e sheet: `role=dialog`, `aria-modal`, foco preso, foco inicial definido, retorno do foco ao fechar, resto `inert`; ESC fecha sheet (nao o gate).
- [ ] Radios navegaveis por setas; stepper operavel por Tab + Enter/Espaco; select nativo.
- [ ] Sem armadilha de teclado; fechar sheet por teclado.

Alvos e leitura
- [ ] Alvos de toque/clique >= 44x44px (botoes primarios 48-56px; stepper 44px; "Remover" e chips 44px de altura); espaco >= 8px entre alvos.
- [ ] Campos com fonte >= 16px (sem zoom no iOS).
- [ ] Reflow ate 320px sem scroll horizontal; funciona com zoom de 200% e texto aumentado.

Semantica
- [ ] `html lang="pt-BR"`; um unico `h1` (hero); hierarquia h2/h3 (secoes/cards).
- [ ] Landmarks: `header`, `nav aria-label="Modelos"`, `main`, `footer`.
- [ ] Todo campo com `label` visivel; grupos em `fieldset/legend`; erros com `aria-describedby` + `aria-invalid` e `role="alert"`; confirmacoes em `aria-live="polite"`.
- [ ] Imagens de produto com `alt` descritivo sem preco; logo com `alt="NOMAD puffs"`; marca d'agua e bolinhas `aria-hidden`.
- [ ] Botao de carrinho com contagem no `aria-label`; badge nao e lido duas vezes.
- [ ] Valores em R$ lidos corretamente (texto "R$ 110,00", sem separar "R$" em elemento so visual sem equivalente textual; no `PriceTag` grande usar `aria-label="110 reais"`).
- [ ] `prefers-reduced-motion` respeitado; nenhum conteudo piscante.

## 8. Handoff / pendencias para outros papeis
- **Dev (T6)**: criar `tokens.css` a partir da secao 2; amostrar cores com conta-gotas nos PNGs e ajustar hex de `--flavor-*` e `--color-text-muted`; vetorizar logo/watermark se possivel.
- **TL**: otimizar PNGs 1080x1920 (WebP/AVIF + `srcset`) sem alterar o visual; self-host de Syne, Lora Italic e Lexend (subset latin + latin-ext); URL base nas imagens/fontes; `inert` com fallback.
- **PO/dono (D11)**: a imagem `v400-mix-slim.png` mostra "Cherry + Grape" (e quebra "Strawberry Grape Ice + Kiwi Watermelon" em duas linhas), mas CLAUDE.md/PO listam "Watermelon + Cherry + Grape" e "Strawberry Grape Ice + Kiwi"; confirmar a lista oficial. Imagens contem preco: atualizar PNG se o preco mudar.
- **R1**: copy do gate e do rodape sao o default D3; dono pode ajustar no C1.
