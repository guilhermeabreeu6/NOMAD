# 07 - DevOps (site-mvp)

## 1. O que foi entregue
- `.github/workflows/ci.yml`: push/PR -> npm ci, lint, typecheck, test, build (vercel+static), Chromium do Playwright com cache, `npm run test:e2e`, `package:static`, upload do zip (artefato `nomad-site-static`) e de `test-results/`+`playwright-report/` em falha. `permissions: contents: read`, `concurrency` cancela runs antigos, Node 24, cache npm.
  - Actions fixadas por tag maior (`@v4`). Recomendado depois: fixar por SHA (Dependabot atualiza). Nao foi possivel validar o workflow no GitHub (sem push); so valida ao primeiro push.
- `scripts/package-static.mjs` + `npm run package:static`: faz `build:static` e gera `release/nomad-site-static-<versao>.zip` (zip proprio em Node, sem dependencia; `.htaccess` incluido na raiz do zip). `release/` esta no `.gitignore`.
- `CHANGELOG.md`, versao `0.1.0` (ja estava no package.json).
- `deploy/static/nginx.conf.example` (ja existia, equivalente ao .htaccess; adicionado bloco HSTS comentado). Nao foi criado `deploy/nginx.conf` para nao duplicar.
- `vercel.json` conferido: `framework: null`, `installCommand: npm ci`, `buildCommand: npm run build:vercel`, `outputDirectory: dist-vercel`, `cleanUrls`, CSP/seguranca e `X-Robots-Tag: noindex, nofollow`. Correto, sem alteracoes.

## 2. Vercel: importar o repositorio privado (passo a passo para o dono)
1. Entre em vercel.com com "Continue with GitHub" (plano Hobby serve para preview; uso comercial pede Pro, segundo os termos da Vercel).
2. Add New > Project > "Adjust GitHub App Permissions" (ou Install). No GitHub, escolha a conta `guilhermeabreeu6` e marque **Only select repositories > NOMAD** (repo privado precisa dessa autorizacao explicita).
3. Volte a Vercel, clique **Import** em `NOMAD`.
4. Configuracao: Framework Preset **Other**; Build/Output/Install command ja vem do `vercel.json` (`npm run build:vercel`, `dist-vercel`, `npm ci`) - nao altere. Root Directory: `./`. Node.js Version: 24.x (Settings > General) ou 22.x.
5. Variaveis de ambiente: **nenhuma necessaria**. Opcional: `SITE_URL` (https://<projeto>.vercel.app) para canonical/og absolutos; sem ela o build usa `VERCEL_PROJECT_PRODUCTION_URL`.
6. Deploy. Production Branch = `main`; todo push em outra branch/PR gera um **Preview** com URL propria (Settings > Git). Em projetos novos a "Deployment Protection" pode exigir login da Vercel para abrir previews; para preview publico, desative em Settings > Deployment Protection (o site ja e noindex).
7. Confira: `curl -I <url>` deve trazer `x-robots-tag: noindex, nofollow` e `/robots.txt` com `Disallow: /`.

## 3. Dominio proprio (build estatico)
- Gerar: `BASE_PATH=/ SITE_URL=https://www.exemplo.com.br npm run package:static` (ou baixar o zip do artefato do CI, que usa os padroes `BASE_PATH=/`, sem SITE_URL). Variaveis: `BASE_PATH` (`/` ou `/loja/`), `SITE_URL` (canonical/og), `NOINDEX` (`true` enquanto for homologacao). O pacote e funcional sem SITE_URL, so sem canonical absoluto.
- Upload cPanel: Gerenciador de Arquivos > `public_html` > Upload do zip > Extract (o `.htaccess` e oculto: ative "Mostrar arquivos ocultos"). FTP: extraia localmente e envie TODO o conteudo, inclusive `.htaccess`. Subpasta: `BASE_PATH=/loja/` e envie para `public_html/loja/`.
- Nginx: `deploy/static/nginx.conf.example` (substituir `{{BASE}}`, `server_name`, `root`; habilitar HSTS apos HTTPS), depois `nginx -t && systemctl reload nginx`.
- Checklist pos-dominio:
  1. Apontar DNS (A/CNAME) e emitir HTTPS (AutoSSL do cPanel ou Let's Encrypt/certbot).
  2. Forcar redirecionamento HTTP->HTTPS; ativar HSTS (o `.htaccess` ja envia sob HTTPS; no Nginx descomentar). So com HTTPS estavel.
  3. Rebuild com `SITE_URL` real e `NOINDEX=false` (remove meta robots, X-Robots-Tag e Disallow) para liberar indexacao.
  4. `robots.txt` na raiz do dominio; sitemap: **nao existe** no MVP (pendencia opcional: integracao `@astrojs/sitemap`, exige SITE_URL).
  5. Testar: `curl -I https://dominio/` (CSP, nosniff, HSTS), pagina 404, link do WhatsApp, gate 18+.
  6. Cadastrar no Google Search Console quando liberar indexacao.

## 4. Versionamento e processo
- SemVer; `npm version` nao e usado automaticamente: editar `package.json` + `CHANGELOG.md` e criar tag `vX.Y.Z` (so com aprovacao do dono).
- Commits: Conventional Commits em PT-BR sem acento obrigatorio (`feat(site):`, `fix(site):`, `docs:`, `test:`, `ci:`, `chore:`), no padrao ja usado no historico.
- Protecao sugerida da `main` (Settings > Branches; repo privado em plano gratuito pode nao suportar regras - alternativa: Rulesets/Pro): exigir PR, status check `ci` verde, branch atualizada, bloquear force-push e delecao, sem bypass.
- Recomendado: Dependabot (npm + github-actions) semanal.

## 5. Comandos executados e resultados
Ver secao 6.

## 6. Resultados reais (maquina local, Node portatil)
| Comando | Resultado |
|---|---|
| `npm audit --omit=dev` | 0 vulnerabilidades |
| `npm run check` (lint, typecheck, test, build) | exit 0; astro check 0 erros/0 avisos; Vitest 9 arquivos / 178 testes passaram; builds vercel e static ok |
| `npm run package:static` | gerou `release/nomad-site-static-0.1.0.zip` (1,3 MB, 67 arquivos, `.htaccess` na raiz); leitura com System.IO.Compression OK |
| E2E (Playwright) | nao reexecutado por mim; QA (06-qa) reportou passando. Sera exercitado no 1o run do CI |

## 7. Pendencias
- Workflow CI nao testado no GitHub ate o primeiro push; ajustar se o job `playwright install --with-deps` falhar.
- `test:e2e` roda `webServer` com `CI=true` (sem reuse); ok em runner limpo.
- Sem sitemap; sem Dependabot; actions por tag, nao SHA.
- Deploy na Vercel, tag v0.1.0, protecao da `main`: acoes do dono, nao executadas.
