/* (20 Oct) the blur strip under the floating nav was always cream, which showed as pale fog over the dark hero, the
   dark "why it matters" section and the footer. While a dark section sits under the top of the screen, it turns dark. */
(function () {
  var wn = document.getElementById('wn'); if (!wn) return;
  var dark = function () { return document.querySelectorAll('.hx, .night, .night-end'); };
  var q = false;
  function check() {
    q = false; var on = false;
    dark().forEach(function (el) { var r = el.getBoundingClientRect(); if (r.top < 46 && r.bottom > 46) on = true; });
    wn.classList.toggle('over-dark', on);
  }
  addEventListener('scroll', function () { if (!q) { q = true; requestAnimationFrame(check); } }, {passive: true});
  addEventListener('resize', check); check();
})();
