/* v3 nav: bar -> pill on scroll, sliding hover highlight, Services dropdown, phone sheet. */
(function () {
  var wn = document.getElementById('wn'); if (!wn) return;
  var bar = wn.querySelector('.wn-bar'), links = wn.querySelector('.wn-links'), hl = wn.querySelector('.wn-hl');
  var drop = wn.querySelector('.wn-drop'), mega = document.getElementById('wn-mega');
  var menuBtn = wn.querySelector('.wn-menu'), sheet = document.getElementById('wn-sheet');

  /* Widths are numbers (not auto) so the bar can animate between them. */
  function measure() {
    var pad = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pad')) || 24;
    var full = Math.min(1240, innerWidth - 2 * Math.max(16, Math.min(56, innerWidth * .04)));
    wn.style.setProperty('--wn-w', full + 'px');
    // natural pill width: logo mark + links + cta, with the word collapsed
    var was = wn.classList.contains('is-pill');
    wn.classList.add('is-pill', 'wn-measure');
    bar.style.transition = 'none'; bar.style.width = 'max-content';
    var w = Math.ceil(bar.getBoundingClientRect().width);
    bar.style.width = ''; void bar.offsetWidth; bar.style.transition = '';
    wn.classList.remove('wn-measure'); if (!was) wn.classList.remove('is-pill');
    wn.style.setProperty('--wn-pill', Math.min(w, full) + 'px');
  }
  /* Measuring flips classes for a moment; hold transitions off until it's done so nothing flashes. */
  function remeasure() {
    wn.classList.remove('wn-ready'); measure(); onScrollQuiet(); void bar.offsetWidth;
    requestAnimationFrame(function () { requestAnimationFrame(function () { wn.classList.add('wn-ready'); }); });
  }
  function onScrollQuiet() { wn.classList.toggle('is-pill', scrollY > 24); }
  var openY = 0;
  function onScroll() { wn.classList.toggle('is-pill', scrollY > 24); if (mega.classList.contains('open') && Math.abs(scrollY - openY) > 60) closeMega(); }
  remeasure();
  addEventListener('scroll', onScroll, { passive: true });
  var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(remeasure, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);

  /* one highlight that slides between items */
  [].forEach.call(links.querySelectorAll('a,button'), function (el) {
    el.addEventListener('mouseenter', function () {
      hl.style.left = el.offsetLeft + 'px'; hl.style.width = el.offsetWidth + 'px'; hl.style.opacity = 1;
    });
  });
  links.addEventListener('mouseleave', function () { hl.style.opacity = 0; });

  /* Services dropdown: hover intent + click + keyboard */
  var openT, closeT;
  function openMega() { clearTimeout(closeT); openY = scrollY; mega.classList.add('open'); drop.setAttribute('aria-expanded', 'true'); }
  function closeMega() { mega.classList.remove('open'); drop.setAttribute('aria-expanded', 'false'); }
  function later() { clearTimeout(openT); closeT = setTimeout(closeMega, 180); }
  drop.addEventListener('mouseenter', function () { clearTimeout(closeT); openT = setTimeout(openMega, 70); });
  drop.addEventListener('mouseleave', later);
  mega.addEventListener('mouseenter', function () { clearTimeout(closeT); });
  mega.addEventListener('mouseleave', later);
  drop.addEventListener('click', function () { mega.classList.contains('open') ? closeMega() : openMega(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeMega(); if (sheet) { sheet.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); } } });
  document.addEventListener('click', function (e) { if (!wn.contains(e.target)) closeMega(); });
  [].forEach.call(mega.querySelectorAll('a'), function (a) { a.addEventListener('click', closeMega); });

  /* phones */
  if (menuBtn && sheet) {
    menuBtn.addEventListener('click', function () {
      var open = sheet.hidden; sheet.hidden = !open; menuBtn.setAttribute('aria-expanded', String(open));
    });
    [].forEach.call(sheet.querySelectorAll('a'), function (a) { a.addEventListener('click', function () { sheet.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); }); });
  }
})();
