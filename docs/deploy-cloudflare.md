# Deploy na Cloudflare (produção em nomadpuffs.com.br)

Worker **`nomad`** (Cloudflare Workers, plano gratuito, uso comercial permitido) servindo só arquivos estáticos.
Configuração versionada em [`wrangler.jsonc`](../wrangler.jsonc): serve `dist-cloudflare/`, com a 404 do site.
Cada merge na `main` publica sozinho (Workers Builds).

> Sem o `wrangler.jsonc`, a Cloudflare autoconfigura um `astro build` genérico: o site abre, mas **sem** os
> cabeçalhos de segurança (`_headers`) e sem o nosso `robots.txt`. Não apague esse arquivo.

## 1. Configuração do build (uma vez)
No painel: **Workers e Pages → nomad → Configurações → Build** (Settings → Build):

| Campo | Valor |
|---|---|
| Repositório / branch de produção | `guilhermeabreeu6/NOMAD` / `main` |
| Comando de build | `npm run build:cloudflare` |
| Comando de implantação | `npx wrangler deploy` |
| Diretório raiz | `/` (vazio) |

**Variáveis de build** (na mesma tela, *Build variables*; texto simples, nenhuma é segredo):

| Variável | Valor | Observação |
|---|---|---|
| `NODE_VERSION` | `24` | o projeto exige Node >= 22.12 |
| `SITE_URL` | `https://nomadpuffs.com.br` | canonical e Open Graph |
| `NOINDEX` | `true` | fora do Google até decisão do dono (só `false` libera) |

Depois de salvar: **Implantações → Nova implantação / Retry** (ou faça qualquer merge na `main`).

## 2. Domínio próprio
1. **Domínios → Adicionar** `nomadpuffs.com.br` (plano Free). A Cloudflare mostra **2 servidores DNS**
   (`xxx.ns.cloudflare.com`) na **Visão geral** do domínio.
2. No https://registro.br: **nomadpuffs.com.br → DNS → Alterar servidores DNS** → cole os 2 e salve.
   Propagação: de minutos a algumas horas (a Cloudflare avisa por e-mail).
3. No Worker **nomad → Domínios → Adicionar domínio personalizado**: `nomadpuffs.com.br` e `www.nomadpuffs.com.br`.
   A Cloudflare cria o DNS e o HTTPS sozinha (não crie registros A/CNAME à mão).
4. Redirecionar `www` → raiz: **Regras → Regras de redirecionamento → modelo "Redirect from WWW to root"** (301).
5. **SSL/TLS → Certificados de borda**: ligue **Sempre usar HTTPS**.
6. Os registros MX/SPF/DMARC que já existem no DNS bloqueiam e-mail falso em nome do domínio: manter.

## 3. Verificação (coordenador/DevOps)
- `/`, `/outubro/` → 200; `/outubro` → redireciona para `/outubro/`; `/qualquer-coisa` → 404 personalizada.
- Cabeçalhos: CSP, `X-Frame-Options: DENY`, `Strict-Transport-Security`, `X-Robots-Tag: noindex, nofollow`
  (enquanto `NOINDEX=true`); `/_astro/*` com `Cache-Control: ... immutable`; `/_headers` → 404 (não é publicado).
- `robots.txt` com `Disallow: /` enquanto `NOINDEX=true`.
- `*.workers.dev` sempre `noindex`.

## 4. Liberar o Google (quando o dono decidir)
Troque `NOINDEX` para `false` nas variáveis de build e reimplante.

## Teste local
`npm run build:cloudflare && npx wrangler dev` → http://localhost:8787 (aplica `_headers` como em produção).
