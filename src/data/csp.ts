// Política de segurança de conteúdo: fonte única para o <meta> do BaseLayout.
// Deve ser idêntica à de vercel.json e deploy/static/htaccess.template (tests/unit/deploy-config.test.ts).
export const CSP =
  "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests";

/** Versão para <meta>: frame-ancestors é ignorado em meta. */
export const CSP_META = CSP.replace(' frame-ancestors \'none\';', '');
