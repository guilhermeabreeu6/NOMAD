// @ts-check
import { defineConfig } from 'astro/config';

// Valores de deploy são definidos por scripts/build.mjs via process.env.
// Em `astro dev` valem os defaults (base "/", sem noindex).
const base = process.env['BASE_PATH'] || '/';
const site = process.env['SITE_URL'] || undefined;
const deploy = {
  target: process.env['DEPLOY_TARGET'] || 'dev',
  noindex: process.env['NOINDEX'] === 'true',
  siteUrl: site ?? '',
};

export default defineConfig({
  output: 'static',
  base,
  ...(site ? { site } : {}),
  trailingSlash: 'ignore',
  compressHTML: true,
  devToolbar: { enabled: false },
  build: {
    format: 'directory',
    inlineStylesheets: 'never',
    assets: '_astro',
  },
  vite: {
    define: { __DEPLOY__: JSON.stringify(deploy) },
    build: { assetsInlineLimit: 0 },
  },
});
