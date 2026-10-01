/* Gate 18+ sem flash: roda antes do body. Chave deve ser igual a AGE_KEY em src/lib/storage.ts. */
(function () {
  var d = document.documentElement;
  d.classList.remove('no-js');
  d.classList.add('js');
  try {
    if (window.localStorage.getItem('nomad:age-ok:v1') === '1') d.setAttribute('data-age', 'ok');
  } catch (e) {
    /* storage indisponivel: gate aparece */
  }
})();
