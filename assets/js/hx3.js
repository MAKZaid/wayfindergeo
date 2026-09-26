/* v6 hero: five AI engines around the north star, dotted lines to it, and an answer card that
   types each engine's answer naming "your brand". Cycles on its own; hover or tap an engine to jump
   to it. Each engine shows its own brand colours when hovered or selected (CSS, keyed on data-k).
   The card reserves room for its longest question and answer, so switching engines never changes the page's
   height (that height change is what made the orbits jump).
   Config: window.HX = { icons, brandIcons, desk: [[x%,y%]...], phone: [[x%,y%]...] } */
(function () {
  var C = window.HX, ICON = C.icons;
  var stage = document.getElementById('stage'), svg = document.getElementById('lines'), focus = document.getElementById('focus');
  var card = document.getElementById('card'), ans = card.querySelector('.c-a');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var E = [
    { k: 'openai', n: 'ChatGPT', q: 'What is the best project tool for a growing agency?',
      a: 'For agencies scaling past ten people, @ comes up most often. Reviewers point to its client portals and simple pricing.' },
    { k: 'perplexity', n: 'Perplexity', q: 'Which dentist in Toronto is best for anxious patients?',
      a: '@ is the most recommended for nervous patients, with sedation options and reviews that mention a calm, unhurried team.' },
    { k: 'claude', n: 'Claude', q: 'Who should we hire to rebuild our B2B website?',
      a: 'Teams in your position often shortlist @ for its B2B focus and case studies with measurable results.' },
    { k: 'google', n: 'AI Overviews', q: 'Best running shoes for flat feet under $150?',
      a: 'Most expert roundups put @ first for flat feet under $150, citing a stable midsole and a wide toe box.' },
    { k: 'gemini', n: 'Gemini', q: 'Which accounting firm is best for a small e-commerce brand?',
      a: '@ stands out for e-commerce: fixed monthly fees, Shopify expertise and fast month-end closes.' }
  ];
  var chips = [], active = -1, timer = null, typing = [], paused = false;

  /* one-colour icon by default; a brand-coloured version (Google's four-colour G, Gemini's gradient)
     swaps in when the engine is hovered or selected */
  function ic(k) { return '<i class="ic"><b class="mono">' + ICON[k] + '</b>' + (C.brandIcons[k] ? '<b class="col">' + C.brandIcons[k] + '</b>' : '') + '</i>'; }
  function you() { return '<span class="you"><img src="assets/img/star.svg" alt="">your brand</span>'; }
  function full(e) { return e.a.split(' ').map(function (w) { return w.indexOf('@') === 0 ? you() + w.slice(1) : w; }).join(' '); }

  E.forEach(function (e, i) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'eng'; b.dataset.k = e.k;
    b.innerHTML = ic(e.k) + '<span>' + e.n + '</span>';
    b.setAttribute('aria-label', 'Show an example ' + e.n + ' answer');
    b.addEventListener('mouseenter', function () { paused = true; show(i); });
    b.addEventListener('mouseleave', function () { paused = false; schedule(); });
    b.addEventListener('click', function () { show(i); });
    stage.appendChild(b); chips.push(b);
  });

  /* Reserve the tallest question + answer (at the current width) so the card never grows or shrinks. */
  function reserve() {
    var qEl = card.querySelector('.c-q'), keepQ = qEl.textContent, keepA = ans.innerHTML, max = 0;
    card.style.minHeight = '0px';
    E.forEach(function (e) { qEl.textContent = e.q; ans.innerHTML = full(e); max = Math.max(max, card.offsetHeight); });
    qEl.textContent = keepQ; ans.innerHTML = keepA; card.style.minHeight = max + 'px';
  }

  function layout() {
    var W = stage.clientWidth, H = stage.clientHeight, phone = W < 640, P = phone ? C.phone : C.desk;
    var fr = focus.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    var sx = fr.left - sr.left + fr.width / 2, sy = fr.top - sr.top + fr.height / 2, out = '';
    orbitStop();
    if (phone && window.WF_orbit) { orbitStart(); return; }
    chips.forEach(function (b, i) {
      b.style.transform = b.style.opacity = b.style.zIndex = '';
      var p = P[i]; if (!p) { b.hidden = true; return; } b.hidden = false;
      var x = W * p[0] / 100, y = H * p[1] / 100; b.style.left = x + 'px'; b.style.top = y + 'px';
      var bend = phone ? 18 : 40, mx = (x + sx) / 2 + (x < sx ? -bend : bend), my = Math.min(y, sy) - (phone ? 16 : 36);
      out += '<path class="ln" data-k="' + E[i].k + '" data-i="' + i + '" d="M' + x.toFixed(1) + ',' + y.toFixed(1) + ' Q' + mx.toFixed(1) + ',' + my.toFixed(1) + ' ' + sx.toFixed(1) + ',' + sy.toFixed(1) + '"/>';
    });
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.innerHTML = out;
    if (active >= 0) mark(active);
  }
  /* Phones: the engines travel along one of the drawn rings, evenly spaced, one lap about every 70s. On the far side
     of the star they shrink, dim and pass behind it; on the near side they come in front. The dotted line follows. */
  var RING = 7, LAP = 70000, orbitRaf = 0, orbitOn = false, paths = [], visible = true;
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible && orbitOn && !orbitRaf) orbitRaf = requestAnimationFrame(orbitFrame); }).observe(stage);
  function orbitStart() {
    var out = '';
    chips.forEach(function (b, i) { b.hidden = false; out += '<path class="ln" data-k="' + E[i].k + '" data-i="' + i + '"/>'; });
    svg.setAttribute('viewBox', '0 0 ' + stage.clientWidth + ' ' + stage.clientHeight); svg.innerHTML = out;
    paths = [].slice.call(svg.querySelectorAll('.ln'));
    if (active >= 0) mark(active);
    orbitOn = true; orbitFrame(performance.now());
  }
  function orbitStop() { orbitOn = false; cancelAnimationFrame(orbitRaf); orbitRaf = 0; }
  function orbitFrame(now) {
    orbitRaf = 0; if (!orbitOn) return;
    var sr = stage.getBoundingClientRect(), fr = focus.getBoundingClientRect();
    var sx = fr.left - sr.left + fr.width / 2, sy = fr.top - sr.top + fr.height / 2, spin = reduce ? 0 : (now / LAP) * Math.PI * 2;
    chips.forEach(function (b, i) {
      var a = spin + i * Math.PI * 2 / chips.length + .35, q = window.WF_orbit(RING, a);
      var x = q.x - sr.left, y = q.y - sr.top, near = (Math.sin(a) + 1) / 2;          /* 0 far side, 1 near side */
      /* moved with a transform, not left/top, so the motion never counts as layout shift */
      b.style.left = '0px'; b.style.top = '0px';
      b.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) translate(-50%,-50%) scale(' + (.8 + .2 * near).toFixed(3) + ')';
      b.style.opacity = (.55 + .45 * near).toFixed(2);
      b.style.zIndex = Math.sin(a) < 0 ? 0 : 3;
      var mx = (x + sx) / 2 + (x < sx ? -18 : 18), my = Math.min(y, sy) - 16;
      if (paths[i]) paths[i].setAttribute('d', 'M' + x.toFixed(1) + ',' + y.toFixed(1) + ' Q' + mx.toFixed(1) + ',' + my.toFixed(1) + ' ' + sx.toFixed(1) + ',' + sy.toFixed(1));
    });
    if (!reduce && visible) orbitRaf = requestAnimationFrame(orbitFrame);
  }
  function mark(i) {
    chips.forEach(function (b, j) { b.classList.toggle('on', j === i); });
    [].forEach.call(svg.querySelectorAll('.ln'), function (l) { l.classList.toggle('on', +l.getAttribute('data-i') === i); });
  }
  function show(i) {
    if (i === active && card.dataset.ready) return;
    active = i; mark(i); typing.forEach(clearTimeout); typing = [];
    var e = E[i]; card.dataset.ready = 1;
    var ce = card.querySelector('.c-eng'); ce.dataset.k = e.k; ce.innerHTML = ic(e.k) + e.n;
    card.querySelector('.c-q').textContent = e.q;
    if (reduce) { ans.innerHTML = full(e); return; }
    /* The whole answer is laid out first, hidden, then revealed word by word, so the card's text never reflows while it
       "types" (reflowing counted as layout shift). The thinking dots sit on top until the first word shows. */
    ans.innerHTML = '<span class="thinking"><i></i><i></i><i></i></span>' + e.a.split(' ').map(function (w) {
      return w.indexOf('@') === 0 ? '<span class="pend y">' + you() + w.slice(1) + '</span>' : '<span class="w pend">' + w + '</span>';
    }).join(' ');
    var pend = [].slice.call(ans.querySelectorAll('.pend')), t = 500;
    typing.push(setTimeout(function () { var d = ans.querySelector('.thinking'); if (d) d.remove(); }, t));
    pend.forEach(function (el) { typing.push(setTimeout(function () { el.classList.remove('pend'); }, t += 60)); });
  }
  function schedule() {
    clearTimeout(timer); if (reduce || paused) return;
    timer = setTimeout(function () {
      if (paused) return; var n = active, k = 0;
      do { n = (n + 1) % E.length; k++; } while (chips[n].hidden && k < 10);
      show(n); schedule();
    }, 6200);
  }
  function relayout() { reserve(); layout(); }
  relayout(); show(0); schedule();
  var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(relayout, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
  window.HX_relayout = relayout;
  addEventListener('load', relayout);                                     /* the rings (orbits5.js) load after this file */

  /* Starlight: track the cursor inside hero buttons */
  [].forEach.call(document.querySelectorAll('.hx .btn'), function (b) {
    b.insertAdjacentHTML('afterbegin', '<i class="sp"></i><i class="sp"></i><i class="sp"></i>');
    b.addEventListener('pointermove', function (ev) {
      var r = b.getBoundingClientRect(); b.style.setProperty('--mx', (ev.clientX - r.left) + 'px'); b.style.setProperty('--my', (ev.clientY - r.top) + 'px');
    });
  });
})();
