/// <reference types="astro/client" />

interface DeployInfo {
  readonly target: 'vercel' | 'static' | 'dev';
  readonly noindex: boolean;
  readonly siteUrl: string;
}

declare const __DEPLOY__: DeployInfo;
