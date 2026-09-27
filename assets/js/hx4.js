/* v34 hero: five AI engines around the star, and the answer card that types each engine's answer.
   Built on hx3.js. What's new:
   - The star at the centre is labelled as the visitor's brand, and "your brand" in the card carries the same small
     glowing dot, so the two read as one thing (the logo image is gone from both).
   - Just before an answer names the brand, a point of light leaves the star, runs down the line to that engine, and
     the engine pings when it arrives. The star's own light stays constant (v29).
   - B (v29): the "Your brand" label only appears now and then, with the light.
   - The engines are lit from the star's side (a soft highlight facing the centre), in every version.
   - Version B and C, desktop: each engine rides its own ring, inner ones faster (roughly Kepler), shrinking and
     dimming on the far side and passing behind the star. Hovering an engine brings the orbits to a gentle stop.
   - Version C: the label under the star is a field. Type a brand and it replaces "your brand" everywhere.
   - Phones keep the approved single-ring orbit from hx3.js.
   Config: window.HX = { icons, brandIcons, desk: [[x%,y%]...], phone: [[x%,y%]...] } */
(function () {
  var C = window.HX, ICON = C.icons, HV = document.documentElement.dataset.hv || 'a';
  /* v34: Gemini in its 2025 colours (Google's four: blue right, red top, yellow left, green bottom), drawn as a CSS
     gradient inside the sparkle shape (hero.css .gem-new). Replaces the old blue-purple-pink gradient. */
  if (C.brandIcons) C.brandIcons.gemini = '<span class="gem-new" aria-hidden="true"></span>';
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
  /* B and C, desktop: the ring each engine rides and where it starts (0 = right, PI/2 = nearest, PI = left) */
  /* sizes are shares of half the sky's width, so the outer one never leaves the screen at any desktop width */
  var FRAC = [.88, .74, .6, .47, .35], RINGS = [], A0 = [Math.PI + .3, -.35, .6, Math.PI - .75, 1.25];
  var chips = [], active = -1, timer = null, typing = [], paused = false, name = '';

  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ic(k) { return '<i class="ic"><b class="mono">' + ICON[k] + '</b>' + (C.brandIcons[k] ? '<b class="col">' + C.brandIcons[k] + '</b>' : '') + '</i>'; }
  /* the name has its own span so the chip lines up on the words' baseline, not the dot's (v31) */
  function you() { return '<span class="you"><i class="wf-dot"></i><span class="you-t">' + (name ? esc(name) : 'your brand') + '</span></span>'; }
  function full(e) { return e.a.split(' ').map(function (w) { return w.indexOf('@') === 0 ? you() + w.slice(1) : w; }).join(' '); }

  E.forEach(function (e, i) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'eng'; b.dataset.k = e.k; b.dataset.n = e.n;
    b.innerHTML = ic(e.k) + '<span>' + e.n + '</span>';
    b.setAttribute('aria-label', 'Show an example ' + e.n + ' answer');
    b.addEventListener('mouseenter', function () { paused = true; hold = true; show(i); });
    b.addEventListener('mouseleave', function () { paused = false; hold = false; schedule(); });
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

  /* ---- geometry shared by every mode: where each engine is, and its line to the star (stage coordinates) ---- */
  var geo = [], sx = 0, sy = 0, mode = 'fixed';
  function starXY() {
    var fr = focus.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    sx = fr.left - sr.left + fr.width / 2; sy = fr.top - sr.top + fr.height / 2; return sr;
  }
  function curve(i, x, y, bend, lift) {
    var mx = (x + sx) / 2 + (x < sx ? -bend : bend), my = Math.min(y, sy) - lift;
    geo[i] = { x: x, y: y, mx: mx, my: my };
    return 'M' + x.toFixed(1) + ',' + y.toFixed(1) + ' Q' + mx.toFixed(1) + ',' + my.toFixed(1) + ' ' + sx.toFixed(1) + ',' + sy.toFixed(1);
  }
  /* the star lights the side of each engine that faces it */
  function light(b, x, y) {
    var dx = sx - x, dy = sy - y, d = Math.hypot(dx, dy) || 1;
    b.style.setProperty('--ux', (dx / d).toFixed(3)); b.style.setProperty('--uy', (dy / d).toFixed(3));
  }
  function lines() {
    var out = '';
    chips.forEach(function (b, i) { out += '<path class="ln" data-k="' + E[i].k + '" data-i="' + i + '"/>'; });
    out += '<g class="wf-pls"></g>';
    svg.setAttribute('viewBox', '0 0 ' + stage.clientWidth + ' ' + stage.clientHeight); svg.innerHTML = out;
    paths = [].slice.call(svg.querySelectorAll('.ln')); plsEl = svg.querySelector('.wf-pls');
  }
  var paths = [], plsEl = null;

  function layout() {
    var W = stage.clientWidth, H = stage.clientHeight, phone = W < 640, P = phone ? C.phone : C.desk;
    starXY();
    mode = phone && window.WF_orbit ? 'ring' : (HV !== 'a' && window.WF_orbit ? 'orbit' : 'fixed');
    document.documentElement.classList.toggle('hv-orbiting', mode !== 'fixed');
    if (mode === 'orbit') RINGS = FRAC.map(function (f) { return window.WF_ringAt(f); });
    window.WF_hi = mode === 'orbit' ? RINGS : null;
    if (mode === 'orbit' && !window.WF_bodies) window.WF_bodies = [];
    if (mode !== 'orbit') window.WF_bodies = null;
    lines();
    if (mode === 'fixed') {
      chips.forEach(function (b, i) {
        b.style.transform = b.style.opacity = b.style.zIndex = b.style.filter = '';
        var p = P[i]; if (!p) { b.hidden = true; return; } b.hidden = false;
        var x = W * p[0] / 100, y = H * p[1] / 100; b.style.left = x + 'px'; b.style.top = y + 'px';
        paths[i].setAttribute('d', curve(i, x, y, phone ? 18 : 40, phone ? 16 : 36)); light(b, x, y);
      });
    } else chips.forEach(function (b) { b.hidden = false; b.style.left = '0px'; b.style.top = '0px'; });
    if (active >= 0) mark(active);
    kick();
  }

  /* ---- motion: one loop runs the orbits (when orbiting) and the guide pulse (always) ---- */
  var raf = 0, visible = true, last = performance.now(), speed = 1, hold = false;
  var ang = A0.slice(), ringSpin = 0, LAP = 70000;
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) kick(); }).observe(stage);
  function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } }
  function lap(i) { return 260 * Math.pow(FRAC[i], 1.5); }                  // seconds (54s inner to 215s outer); roughly Kepler
  function tick(now) {
    raf = 0;
    var dt = Math.min(.05, (now - last) / 1000); last = now;
    speed += ((hold ? 0 : 1) - speed) * Math.min(1, dt * 3);                   // ease to a stop while an engine is hovered
    starXY();
    if (mode === 'ring') ringFrame(dt);
    else if (mode === 'orbit') orbitFrame(dt);
    pulseFrame(now);
    var moving = mode !== 'fixed' && !reduce;
    if (visible && (moving || pulse)) raf = requestAnimationFrame(tick);
  }
  function place(b, i, x, y, a, s0) {
    var near = (Math.sin(a) + 1) / 2, far = Math.sin(a) < 0, on = i === active;
    var sc = (s0 + (1 - s0) * near) * (on ? 1.1 : 1);
    b.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) translate(-50%,-50%) scale(' + sc.toFixed(3) + ')';
    /* behind the star: fade and soften as it passes through the glare */
    var occ = far ? Math.max(0, 1 - Math.hypot(x - sx, y - sy) / 80) : 0;
    /* v33: the active engine (auto or chosen) always sits in front of every other engine, stays clear and near full
       strength wherever it is on its orbit, and is only softened, not hidden, as it passes behind the star */
    if (on) occ *= .4;
    b.style.opacity = ((on ? .9 + .1 * near : .5 + .5 * near) * (1 - .82 * occ)).toFixed(3);
    b.style.filter = occ > .02 && !on ? 'blur(' + (occ * 1.6).toFixed(2) + 'px)' : '';
    b.style.zIndex = on ? 5 : far ? 1 : 4;
    light(b, x, y);
  }
  /* phones: evenly spaced on ring 7, one lap about every 70s (unchanged from hx3.js) */
  function ringFrame(dt) {
    var sr = stage.getBoundingClientRect();
    if (!reduce) ringSpin += dt * speed * Math.PI * 2 / (LAP / 1000);
    chips.forEach(function (b, i) {
      var a = ringSpin + i * Math.PI * 2 / chips.length + .35, q = window.WF_orbit(7, a);
      var x = q.x - sr.left, y = q.y - sr.top;
      place(b, i, x, y, a, .8);
      paths[i].setAttribute('d', curve(i, x, y, 18, 16));
    });
  }
  /* B and C, desktop: each engine on its own ring */
  function orbitFrame(dt) {
    var sr = stage.getBoundingClientRect(), bodies = [];
    chips.forEach(function (b, i) {
      if (!reduce) ang[i] += dt * speed * Math.PI * 2 / lap(i);
      var q = window.WF_orbit(RINGS[i], ang[i]), x = q.x - sr.left, y = q.y - sr.top;
      place(b, i, x, y, ang[i], .74);
      paths[i].setAttribute('d', curve(i, x, y, 30, 28));
      bodies.push({ ring: RINGS[i], a: ang[i], dir: 1 });
    });
    window.WF_bodies = bodies;
  }

  /* ---- the guide pulse: light leaves the star and runs down the line to engine i ---- */
  var pulse = null, DUR = 720;
  /* B: "Your brand" only shows now and then. It fades in with the first light after load, then with every sixth
     (about every 37s), and fades out a few seconds after the light lands. C keeps its field in view (it's typed in). */
  /* v33: and not before the line above the headline has run its course (GEO, AIO, SEO, then the shooting star), so a
     first-time visitor isn't shown everything at once. eyebrow.js fires 'wf:eyebrow-done' at that moment; the label
     then comes with the next light and every sixth after it, as before. */
  var tag = HV === 'b' ? document.querySelector('.wfb') : null, sent = 0, tagT = 0;
  var tagReady = !document.querySelector('.hx .eyebrow');
  document.addEventListener('wf:eyebrow-done', function () { if (!tagReady) { tagReady = true; sent = 0; } });
  function sendPulse(i) {
    if (reduce) return;
    pulse = { i: i, t0: performance.now() };
    if (tag && tagReady && sent++ % 6 === 0) {
      tag.classList.add('wfb-on'); clearTimeout(tagT);
      tagT = setTimeout(function () { tag.classList.remove('wfb-on'); }, DUR + 3200);
    }
    kick();
  }
  function bez(g, s) {            /* s = 0 at the star, 1 at the engine */
    var u = 1 - s;                /* the path is drawn engine -> star */
    return [(1 - u) * (1 - u) * g.x + 2 * (1 - u) * u * g.mx + u * u * sx, (1 - u) * (1 - u) * g.y + 2 * (1 - u) * u * g.my + u * u * sy];
  }
  function pulseFrame(now) {
    if (!plsEl) return;
    if (!pulse) { if (plsEl.firstChild) plsEl.innerHTML = ''; return; }
    var p = (now - pulse.t0) / DUR, g = geo[pulse.i];
    if (p >= 1 || !g) {
      var b = chips[pulse.i]; pulse = null; plsEl.innerHTML = '';
      if (b) { b.classList.remove('wf-ping'); void b.offsetWidth; b.classList.add('wf-ping'); setTimeout(function () { b.classList.remove('wf-ping'); }, 950); }
      return;
    }
    var e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2, out = '';
    for (var j = 5; j >= 0; j--) {
      var q = bez(g, Math.max(0, e - j * .035)), f = 1 - j / 6;
      if (j === 0) out += '<circle class="wf-plg" cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="7"/>';
      out += '<circle class="wf-pl" cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="' + (j === 0 ? 2.6 : 1.8 * f).toFixed(2) + '" opacity="' + (f * .9).toFixed(2) + '"/>';
    }
    plsEl.innerHTML = out;
  }

  function mark(i) {
    chips.forEach(function (b, j) { b.classList.toggle('on', j === i); });
    paths.forEach(function (l) { l.classList.toggle('on', +l.getAttribute('data-i') === i); });
  }
  function show(i, force) {
    if (i === active && card.dataset.ready && !force) return;
    active = i; mark(i); typing.forEach(clearTimeout); typing = []; pulse = null;
    var e = E[i]; card.dataset.ready = 1;
    var ce = card.querySelector('.c-eng'); ce.dataset.k = e.k; ce.innerHTML = ic(e.k) + e.n;
    card.querySelector('.c-q').textContent = e.q;
    if (reduce) { ans.innerHTML = full(e); return; }
    /* The whole answer is laid out first, hidden, then revealed word by word, so the card never reflows while it types. */
    ans.innerHTML = '<span class="thinking"><i></i><i></i><i></i></span>' + e.a.split(' ').map(function (w) {
      return w.indexOf('@') === 0 ? '<span class="pend y">' + you() + w.slice(1) + '</span>' : '<span class="w pend">' + w + '</span>';
    }).join(' ');
    var pend = [].slice.call(ans.querySelectorAll('.pend')), youIdx = pend.findIndex(function (el) { return el.classList.contains('y'); });
    /* keep "thinking" a little longer when the brand comes early, so the light always lands as the brand is named */
    var t = Math.max(500, DUR + 160 - (youIdx + 1) * 60), youAt = t;
    typing.push(setTimeout(function () { var d = ans.querySelector('.thinking'); if (d) d.remove(); }, t));
    pend.forEach(function (el) { t += 60; if (el.classList.contains('y')) youAt = t; typing.push(setTimeout(function () { el.classList.remove('pend'); }, t)); });
    /* the light leaves the star so it lands on the engine as the brand is named */
    typing.push(setTimeout(function () { sendPulse(i); }, Math.max(80, youAt - DUR)));
  }
  function schedule() {
    clearTimeout(timer); if (reduce || paused) return;
    timer = setTimeout(function () {
      if (paused) return; var n = active, k = 0;
      do { n = (n + 1) % E.length; k++; } while (chips[n].hidden && k < 10);
      show(n); schedule();
    }, 6200);
  }

  /* ---- C: the label under the star is a field ---- */
  var input = document.getElementById('wfb-in'), mirror = document.querySelector('.wfb-m');
  if (input) {
    var rt2;
    input.addEventListener('input', function () {
      var v = input.value.replace(/\s+/g, ' ').replace(/^\s/, '');
      name = v.trim(); mirror.textContent = v || input.placeholder;
      document.documentElement.classList.add('wfb-used');
      clearTimeout(rt2); rt2 = setTimeout(function () { reserve(); if (active >= 0) { typing.forEach(clearTimeout); typing = []; ans.innerHTML = full(E[active]); } }, 60);
    });
    input.addEventListener('focus', function () { paused = true; clearTimeout(timer); input.select(); });
    input.addEventListener('blur', function () { paused = false; if (active >= 0) show(active, true); schedule(); });
    input.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === 'Escape') input.blur(); });
  }

  function relayout() { reserve(); layout(); }
  relayout(); show(0); schedule();
  var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(relayout, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
  window.HX_relayout = relayout;
  addEventListener('load', relayout);                                     /* the rings (orbits6.js) load after this file */

  /* Starlight: track the cursor inside hero buttons */
  [].forEach.call(document.querySelectorAll('.hx .btn'), function (b) {
    b.insertAdjacentHTML('afterbegin', '<i class="sp"></i><i class="sp"></i><i class="sp"></i>');
    b.addEventListener('pointermove', function (ev) {
      var r = b.getBoundingClientRect(); b.style.setProperty('--mx', (ev.clientX - r.left) + 'px'); b.style.setProperty('--my', (ev.clientY - r.top) + 'px');
    });
  });
})();
