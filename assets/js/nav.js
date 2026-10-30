/* v3 nav: bar -> pill on scroll, sliding hover highlight, Services dropdown, phone sheet. */
(function () {
  var wn = document.getElementById('wn'); if (!wn) return;
  var bar = wn.querySelector('.wn-bar'), links = wn.querySelector('.wn-links'), hl = wn.querySelector('.wn-hl');
  var drop = wn.querySelector('.wn-drop'), mega = document.getElementById('wn-mega');
  var menuBtn = wn.querySelector('.wn-menu'), sheet = document.getElementById('wn-sheet');

  /* Widths are numbers (not auto) so the bar can animate between them. */
  function measure() {
    /* (v46) the full bar is exactly as wide as the page's content (+ its own 1px borders), so the logo and the audit button sit on the
       same left and right edges as every section */
    var pg = document.querySelector('.page'), full;
    if (pg) { var ps = getComputedStyle(pg); full = pg.clientWidth - parseFloat(ps.paddingLeft) - parseFloat(ps.paddingRight) + 2; }
    else full = Math.min(1240, innerWidth - 2 * Math.max(16, Math.min(56, innerWidth * .04)));
    wn.style.setProperty('--wn-w', full + 'px');
    var was = wn.classList.contains('is-pill');
    /* (20 Oct) the links used to be nudged onto the page's centre; that left uneven gaps (201px by the logo, 123px by the
       audit side, at 1440). They now sit in the bar's flow, with equal space either side. */
    // natural pill width: logo mark + links + cta, with the word collapsed
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
  /* (v66) bar <-> pill: the links' place is worked out by the layout, which jumped ~30px in one frame when the class flipped
     (before the bar had even started to shrink). Here they start from where they were and glide on the bar's own curve */
  function setPill(on) {
    if (wn.classList.contains('is-pill') === on) return;
    if (!links || !links.animate || !wn.classList.contains('wn-ready') || matchMedia('(prefers-reduced-motion: reduce)').matches || innerWidth <= 900) { wn.classList.toggle('is-pill', on); return; }
    var x0 = links.getBoundingClientRect().left;
    wn.classList.toggle('is-pill', on);
    var dx = x0 - links.getBoundingClientRect().left;
    if (Math.abs(dx) > .5) links.animate([{ transform: 'translateX(' + dx + 'px)' }, { transform: 'none' }], { duration: 600, easing: 'cubic-bezier(.22,1,.36,1)' });
  }
  function onScroll() { setPill(scrollY > 24); if (mega.classList.contains('open') && Math.abs(scrollY - openY) > 60) closeMega(); }
  remeasure();
  addEventListener('scroll', onScroll, { passive: true });
  var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(remeasure, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
  addEventListener('load', remeasure);   /* (v46) the wordmark image has no set width, so measure again once it's in */

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
    /* 20 Oct (Zaid), option A: the sheet and the bar's white fade in and out together (opacity only, so iPhones run it on the
       graphics chip at full speed). The rows still drop in one after another and the two lines meet before they cross (v2.css). */
    var still = matchMedia('(prefers-reduced-motion: reduce)'), shutT = 0;
    function openSheet() {
      clearTimeout(shutT); sheet.hidden = false; menuBtn.setAttribute('aria-expanded', 'true'); wn.classList.add('menu-open');
      if (still.matches) { sheet.classList.add('is-open'); return; }
      void sheet.offsetHeight; requestAnimationFrame(function () { sheet.classList.add('is-open'); });
    }
    function closeSheet() {
      menuBtn.setAttribute('aria-expanded', 'false'); sheet.classList.remove('is-open');
      wn.classList.remove('menu-open');                                             // the bar fades back in the same moment the sheet fades out
      document.documentElement.classList.remove('menu-lock');                    // the page can scroll (and follow a link) while it fades
      clearTimeout(shutT);
      if (still.matches) { sheet.hidden = true; return; }
      shutT = setTimeout(function () { sheet.hidden = true; }, 240);
    }
    menuBtn.addEventListener('click', function () { if (sheet.hidden || !sheet.classList.contains('is-open')) openSheet(); else closeSheet(); });
    [].forEach.call(sheet.querySelectorAll('a'), function (a) { a.addEventListener('click', closeSheet); });
  }
})();
