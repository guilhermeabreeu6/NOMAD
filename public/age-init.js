/* Roda antes do body (sem flash).
   1) Gate 18+: chave deve ser igual a AGE_KEY em src/lib/storage.ts.
   2) Fase da promoção de frete em html[data-promo]: instantes em epoch ms iguais a FRETE_OUTUBRO
      em src/data/promos.ts (teste trava a igualdade). Intervalo [início, fim). */
(function () {
  var d = document.documentElement;
  d.classList.remove('no-js');
  d.classList.add('js');
  try {
    if (window.localStorage.getItem('nomad:age-ok:v1') === '1') d.setAttribute('data-age', 'ok');
  } catch (e) {
    /* storage indisponivel: gate aparece */
  }
  try {
    var PROMO_START_MS = 1790823600000; /* 2026-10-01T00:00:00-03:00 */
    var PROMO_END_MS = 1793502000000; /* 2026-11-01T00:00:00-03:00 (exclusivo) */
    var now = Date.now();
    if (isFinite(now)) {
      d.setAttribute('data-promo', now < PROMO_START_MS ? 'breve' : now < PROMO_END_MS ? 'ativa' : 'encerrada');
    } else {
      d.setAttribute('data-promo', 'encerrada');
    }
  } catch (e) {
    /* mantem o palpite do build */
  }
})();
