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
    chips.forEach(function (b, i) {
      var p = P[i]; if (!p) { b.hidden = true; return; } b.hidden = false;
      var x = W * p[0] / 100, y = H * p[1] / 100; b.style.left = x + 'px'; b.style.top = y + 'px';
      var bend = phone ? 18 : 40, mx = (x + sx) / 2 + (x < sx ? -bend : bend), my = Math.min(y, sy) - (phone ? 16 : 36);
      out += '<path class="ln" data-k="' + E[i].k + '" data-i="' + i + '" d="M' + x.toFixed(1) + ',' + y.toFixed(1) + ' Q' + mx.toFixed(1) + ',' + my.toFixed(1) + ' ' + sx.toFixed(1) + ',' + sy.toFixed(1) + '"/>';
    });
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.innerHTML = out;
    if (active >= 0) mark(active);
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
    ans.innerHTML = '<span class="thinking"><i></i><i></i><i></i></span>';
    var t = 500; typing.push(setTimeout(function () { ans.innerHTML = ''; }, t));
    e.a.split(' ').forEach(function (w) {
      typing.push(setTimeout(function () {
        var s = document.createElement('span');
        if (w.indexOf('@') === 0) { s.innerHTML = you() + w.slice(1); } else { s.className = 'w'; s.textContent = w; }
        ans.appendChild(s); ans.appendChild(document.createTextNode(' '));
      }, t += 60));
    });
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

  /* Starlight: track the cursor inside hero buttons */
  [].forEach.call(document.querySelectorAll('.hx .btn'), function (b) {
    b.insertAdjacentHTML('afterbegin', '<i class="sp"></i><i class="sp"></i><i class="sp"></i>');
    b.addEventListener('pointermove', function (ev) {
      var r = b.getBoundingClientRect(); b.style.setProperty('--mx', (ev.clientX - r.left) + 'px'); b.style.setProperty('--my', (ev.clientY - r.top) + 'px');
    });
  });
})();
