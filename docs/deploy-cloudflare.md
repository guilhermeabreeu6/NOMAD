# Deploy na Cloudflare Pages (produção em nomadpuffs.com.br)

Plano gratuito da Cloudflare (uso comercial permitido). Cada merge na `main` publica o site sozinho;
cada PR ganha um preview em `*.pages.dev` (sempre `noindex`).

## 1. Criar o projeto (uma vez)
1. Crie a conta em https://dash.cloudflare.com (plano **Free**).
2. **Workers & Pages → Create → Pages → Import an existing Git repository** (Connect to Git).
3. Autorize o GitHub **somente** no repositório `guilhermeabreeu6/NOMAD` e selecione-o.
4. Configuração do build:

| Campo | Valor |
|---|---|
| Production branch | `main` |
| Framework preset | `None` |
| Build command | `npm run build:cloudflare` |
| Build output directory | `dist-cloudflare` |
| Root directory | (vazio) |

5. **Environment variables** (Production e Preview):

| Variável | Valor | Observação |
|---|---|---|
| `NODE_VERSION` | `24` | o projeto exige Node >= 22.12 |
| `SITE_URL` | `https://nomadpuffs.com.br` | só em **Production**: canonical e Open Graph |
| `NOINDEX` | `true` | fora do Google até decisão do dono (só `false` libera) |

Nenhuma variável é segredo.

6. **Save and Deploy**. Confira o endereço `https://<projeto>.pages.dev`.

## 2. Domínio próprio
O domínio raiz (`nomadpuffs.com.br`) só funciona no Pages se o DNS do domínio estiver na Cloudflare.

1. No painel: **Add a domain** → `nomadpuffs.com.br` → plano **Free**. A Cloudflare mostra **2 servidores DNS**
   (algo como `xxx.ns.cloudflare.com`).
2. No https://registro.br: **nomadpuffs.com.br → DNS → Alterar servidores DNS**, troque pelos 2 da Cloudflare e salve.
   A troca pode levar de minutos a algumas horas; a Cloudflare avisa por e-mail quando o domínio ficar ativo.
3. No projeto Pages: **Custom domains → Set up a custom domain** → `nomadpuffs.com.br`, e depois `www.nomadpuffs.com.br`.
   A Cloudflare cria os registros DNS e o certificado HTTPS sozinha.
4. Redirecionar `www` → raiz: **Rules → Redirect Rules → Create rule → modelo "Redirect from WWW to root"** (301).
5. **SSL/TLS → Edge Certificates**: ligue **Always Use HTTPS**.

## 3. Verificação (o coordenador/DevOps faz)
- `https://nomadpuffs.com.br/`, `/outubro/` → 200; `/qualquer-coisa` → 404 personalizada.
- Cabeçalhos: CSP, `X-Frame-Options: DENY`, `Strict-Transport-Security`, `X-Robots-Tag: noindex, nofollow`
  (enquanto `NOINDEX=true`); `/_astro/*` com `Cache-Control: ... immutable`.
- `http://` e `www.` redirecionam para `https://nomadpuffs.com.br/`.
- Gate 18+, carrinho, mensagem do WhatsApp e `robots.txt`.

## 4. Liberar o Google (quando o dono decidir)
Troque `NOINDEX` para `false` em Production e faça um novo deploy (**Deployments → Retry deployment**).

## Observações
- Os cabeçalhos vêm de `_headers`, gerado de `deploy/cloudflare/headers.template` (teste unitário garante a mesma
  CSP e os mesmos cabeçalhos de `src/data/csp.ts`, `vercel.json` e do `.htaccess`).
- A Vercel (`nomad-v1-nine.vercel.app`) continua recebendo os deploys, só para visualização; o plano Hobby não
  permite uso comercial.
