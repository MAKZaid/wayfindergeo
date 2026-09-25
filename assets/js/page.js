/* v19 page behaviour below the hero. Everything degrades to a readable, static page without script,
   and respects "reduce motion". */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var io = function (cb, opts) { return 'IntersectionObserver' in window ? new IntersectionObserver(cb, opts) : null; };

  /* ------------------------------------------------------------ gentle reveal */
  var rv = document.querySelectorAll('.sec-head, .point, .stat, .disc, .process-grid, .plan2, .tabs, .night-copy, .night-timeline li');
  var rvo = !reduce && io(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); rvo.unobserve(e.target); } }); }, { rootMargin: '0px 0px -10% 0px' });
  if (rvo) rv.forEach(function (el, i) {
    el.classList.add('rv');
    var sib = [].filter.call(el.parentNode.children, function (n) { return n.classList.contains('rv'); });
    el.style.transitionDelay = Math.min(sib.indexOf(el), 5) * 70 + 'ms';
    rvo.observe(el);
  });

  /* ------------------------------------------------------------ market: numbers count up */
  var stats = document.querySelector('.stats');
  if (stats) {
    var figs = [].slice.call(stats.querySelectorAll('.stat-fig b'));
    var go = function () {
      stats.classList.add('go');
      if (reduce) return;
      figs.forEach(function (b) {
        var to = +b.dataset.to, dec = +(b.dataset.dec || 0), t0 = performance.now(), dur = 1400;
        (function tick(now) { var k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
          b.textContent = (to * e).toFixed(dec); if (k < 1) requestAnimationFrame(tick); })(t0);
      });
    };
    var so = io(function (es) { if (es[0].isIntersecting) { go(); so.disconnect(); } }, { threshold: .35 });
    if (so && !reduce) { figs.forEach(function (b) { b.textContent = '0'; }); so.observe(stats); } else go();
  }

  /* ------------------------------------------------------------ services: each card opens on its own; a click anywhere outside
     the cards closes them (a click on another card only toggles that card). Open cards share one height. */
  var discs = [].slice.call(document.querySelectorAll('.disc')), wrap = document.querySelector('.discs');
  function setDisc(d, open) {
    var btn = d.querySelector('.disc-head'), body = d.querySelector('.disc-body');
    btn.setAttribute('aria-expanded', String(open)); d.classList.toggle('open', open);
    if (open) body.removeAttribute('inert'); else body.setAttribute('inert', '');
  }
  discs.forEach(function (d) {
    d.querySelector('.disc-head').addEventListener('click', function () { setDisc(d, !d.classList.contains('open')); });
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('.disc')) discs.forEach(function (d) { if (d.classList.contains('open')) setDisc(d, false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') discs.forEach(function (d) { if (d.classList.contains('open')) { setDisc(d, false); } }); });
  function evenDiscs() {                                                     // the tallest card's content sets the open height
    if (!wrap) return;
    wrap.style.removeProperty('--disc-h');
    if (!matchMedia('(min-width:861px)').matches) return;
    var h = Math.max.apply(null, discs.map(function (d) { return d.querySelector('.disc-inner').offsetHeight; }));
    wrap.style.setProperty('--disc-h', h + 'px');
  }
  evenDiscs(); addEventListener('resize', evenDiscs); addEventListener('load', evenDiscs);

  /* ------------------------------------------------------------ process: every constellation lights up when it is seen.
     The route runs left to right, so it is revealed with a horizontal clip up to each star's x
     (worked out from the star positions, not getBBox, because hidden layouts have no box). */
  var cons = [].slice.call(document.querySelectorAll('.constellation')).map(function (con) {
    var path = con.querySelector('.c-path'), nodes = [].slice.call(con.querySelectorAll('.c-node'));
    var xs = nodes.map(function (g) { return +g.getAttribute('transform').match(/translate\(([\d.]+)/)[1]; });
    var stopAt = xs.map(function (x) { return (x - xs[0]) / (xs[xs.length - 1] - xs[0]); });
    path.style.opacity = 0; path.style.clipPath = 'inset(-2% 100% -2% -2%)';
    var inst = { el: con, nodes: nodes, lit: -1, draw: function (i) {
      path.style.opacity = .9;
      path.style.transition = reduce ? 'none' : 'clip-path .9s cubic-bezier(.22,1,.36,1)';
      path.style.clipPath = 'inset(-2% ' + ((1 - stopAt[i]) * 100).toFixed(1) + '% -2% -2%)';
      nodes.forEach(function (g, j) { g.classList.toggle('lit', j <= i); });
      inst.lit = i;
    } };
    var played = false, co = io(function (es) {
      if (!es[0].isIntersecting || played) return; played = true;
      if (con.closest('.pr-step')) return;                                   // the stepper drives its own
      if (reduce) { inst.draw(3); return; }
      [0, 1, 2, 3].forEach(function (i) { setTimeout(function () { inst.draw(i); }, 300 + i * 650); });
    }, { threshold: .25 });
    if (co) co.observe(con); else inst.draw(3);
    var list = con.closest('.iter-v') && con.closest('.iter-v').querySelectorAll('.moves-hook li');
    [].forEach.call(list || [], function (li) {
      var i = +li.dataset.i;
      li.addEventListener('mouseenter', function () { nodes[i].classList.add('hot'); });
      li.addEventListener('mouseleave', function () { nodes[i].classList.remove('hot'); });
    });
    return inst;
  });

  /* ------------------------------------------------------------ process B: one move at a time; steps on its own until someone picks */
  var step = document.querySelector('.pr-step');
  if (step) {
    var sInst = cons.filter(function (c) { return step.contains(c.el); })[0];
    var pills = [].slice.call(step.querySelectorAll('.ps-pills [role="tab"]')), cur = 0, auto = !reduce, sTimer = null;
    function pick(i, focus) {
      cur = i;
      pills.forEach(function (p, j) { var on = j === i; p.setAttribute('aria-selected', String(on)); p.tabIndex = on ? 0 : -1;
        document.getElementById(p.getAttribute('aria-controls')).hidden = !on; });
      if (sInst) { sInst.draw(i); sInst.nodes.forEach(function (g, j) { g.classList.toggle('hot', j === i); }); }
      if (focus) pills[i].focus();
      if (auto) { step.classList.remove('auto'); void step.offsetWidth; step.classList.add('auto'); }
    }
    function stopAuto() { auto = false; clearInterval(sTimer); step.classList.remove('auto'); }
    pills.forEach(function (p, i) {
      p.addEventListener('click', function () { stopAuto(); pick(i); });
      p.addEventListener('keydown', function (e) {
        var k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!k) return;
        stopAuto(); pick((i + k + pills.length) % pills.length, true); e.preventDefault();
      });
    });
    if (sInst) sInst.nodes.forEach(function (g, i) { g.style.cursor = 'pointer'; g.addEventListener('click', function () { stopAuto(); pick(i); }); });
    var so3 = io(function (es) {
      if (!es[0].isIntersecting || sTimer || !auto) { if (!auto && es[0].isIntersecting && sInst && sInst.lit < 0) pick(cur); return; }
      pick(0); sTimer = setInterval(function () { if (auto) pick((cur + 1) % pills.length); }, 4200);
    }, { threshold: .4 });
    if (so3) so3.observe(step); else pick(0);
  }

  /* ------------------------------------------------------------ FAQ topics (tabs, arrow keys) */
  var tabs = [].slice.call(document.querySelectorAll('.tabs [role="tab"]'));
  function select(t) {
    tabs.forEach(function (x) { var on = x === t; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1;
      document.getElementById(x.getAttribute('aria-controls')).hidden = !on; });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { select(t); });
    t.addEventListener('keydown', function (e) {
      var k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!k) return;
      var n = tabs[(i + k + tabs.length) % tabs.length]; select(n); n.focus(); e.preventDefault();
    });
  });

  /* ------------------------------------------------------------ "Be the answer." typed as the footer comes in */
  var closer = document.querySelector('.closer');
  if (closer) {
    var out = closer.querySelector('.closer-text'), caret = closer.querySelector('.closer-caret'), text = 'Be the answer.';
    var type = function () {
      if (reduce) { out.textContent = text; caret.classList.add('gone'); return; }
      var i = 0; setTimeout(function step() { out.textContent = text.slice(0, ++i); if (i < text.length) setTimeout(step, 85); else setTimeout(function () { caret.classList.add('gone'); }, 2200); }, 500);
    };
    var cl = io(function (es) { if (es[0].isIntersecting) { type(); cl.disconnect(); } }, { threshold: .6 });
    if (cl) cl.observe(closer); else type();
  }

  /* ------------------------------------------------------------ Starlight on the tabs (v24): testimonials, who it's for, FAQ topics and questions */
  if (matchMedia('(hover:hover) and (pointer:fine)').matches) {
    document.querySelectorAll('.sp-tab, .who-tabs [role="tab"], .faq2 .tabs [role="tab"], .faq2 .qa > summary').forEach(function (b) {
      if (b.querySelector('.sl')) return;
      b.insertAdjacentHTML('afterbegin', '<span class="sl soft" aria-hidden="true"><i class="sp"></i><i class="sp"></i><i class="sp"></i></span>');
      b.addEventListener('pointermove', function (ev) { var r = b.getBoundingClientRect();
        b.style.setProperty('--mx', (ev.clientX - r.left) + 'px'); b.style.setProperty('--my', (ev.clientY - r.top) + 'px'); });
    });
  }

  /* ------------------------------------------------------------ Starlight on every button (hero buttons already carry it from hx.js) */
  document.querySelectorAll('.btn, .wn-ghost, .wn-solid').forEach(function (b) {
    if (b.closest('.hx') || b.querySelector('.sl')) return;
    b.insertAdjacentHTML('afterbegin', '<span class="sl" aria-hidden="true"><i class="sp"></i><i class="sp"></i><i class="sp"></i></span>');
    b.addEventListener('pointermove', function (ev) { var r = b.getBoundingClientRect();
      b.style.setProperty('--mx', (ev.clientX - r.left) + 'px'); b.style.setProperty('--my', (ev.clientY - r.top) + 'px'); });
  });
  /* ------------------------------------------------------------ review-only layout switchers (?shift=b&words=c&contact=a&why=nile&foot=earth) */
  var q = new URLSearchParams(location.search), onSwitch = {};
  function pick(box, v) {
    box.querySelectorAll('.iter-bar button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.v === v)); });
    [].forEach.call(box.children, function (c) { if (c.classList.contains('iter-v')) c.hidden = c.dataset.v !== v; });
    if (onSwitch[box.dataset.iter]) onSwitch[box.dataset.iter](v, box);
  }

  /* contact: the one real form (and its script.js handlers) moves into the chosen layout */
  var form = document.getElementById('audit-form');
  onSwitch.contact = function (v, box) {
    var slot = box.querySelector('.iter-v[data-v="' + v + '"] .form-slot');
    if (form && slot && form.parentNode !== slot) slot.appendChild(form);
  };
  var dbar = document.querySelector('.domain-bar');
  if (dbar) dbar.addEventListener('submit', function (e) {
    e.preventDefault();
    var val = dbar.querySelector('input').value.trim(), rest = document.querySelector('.cc-rest');
    if (!val) { dbar.querySelector('input').focus(); return; }
    document.getElementById('f-site').value = val;
    rest.hidden = false;
    document.getElementById('f-name').focus({ preventScroll: true });
    rest.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  });

  onSwitch.foot = function (v) { document.documentElement.dataset.foot = v; if (window.WF_footPar) window.WF_footPar(); };

  /* why-now and footer photos */
  var PH = {
    socal: ['img/why-socal', 'Southern California at night from the International Space Station · NASA'],
    nile: ['img/why-nile', 'The Nile and the Mediterranean coast at night from the International Space Station · NASA'],
    iberia: ['img/foot-iberia', 'Spain and Portugal at night from the International Space Station · NASA'],
    earth: ['img/foot-earth', 'The Earth at night from the International Space Station · NASA']
  };
  onSwitch.why = function (v) {
    var n = document.querySelector('.night'); n.dataset.photo = v;
    n.querySelector('source').srcset = PH[v][0] + '.webp'; n.querySelector('img').src = PH[v][0] + '.jpg';
    n.querySelector('.night-credit').textContent = PH[v][1];
  };

  document.querySelectorAll('.iter').forEach(function (box) {
    box.querySelectorAll('.iter-bar button').forEach(function (b) { b.addEventListener('click', function () { pick(box, b.dataset.v); }); });
    var want = q.get(box.dataset.iter);
    if (want && box.querySelector('.iter-bar button[data-v="' + want + '"]')) pick(box, want);
  });

  /* ------------------------------------------------------------ testimonials A: logo tabs, slow rotation until someone interacts */
  var spot = document.querySelector('.spot');
  if (spot) {
    var sTabs = [].slice.call(spot.querySelectorAll('.sp-tab')), cur = 0, DUR = 8000, timer = null, stopped = reduce;
    function show(i, focus) {
      cur = (i + sTabs.length) % sTabs.length;
      sTabs.forEach(function (t, j) {
        var on = j === cur; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
      spot.dataset.cur = cur;
      spot.querySelectorAll('.sp-win .scn').forEach(function (w) { w.classList.toggle('on', w.dataset.i === String(cur)); });
      spot.dispatchEvent(new CustomEvent('sp-show'));
      if (focus) sTabs[cur].focus();
      if (!stopped) { spot.classList.remove('auto'); void spot.offsetWidth; spot.classList.add('auto'); }
    }
    function stop() { stopped = true; spot.classList.remove('auto'); }
    sTabs.forEach(function (t, i) {
      t.addEventListener('click', function () { stop(); show(i); });
      t.addEventListener('keydown', function (e) {
        var k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!k) return;
        stop(); show(cur + k, true); e.preventDefault();
      });
    });
    if (!stopped) {
      spot.style.setProperty('--sp-dur', DUR + 'ms');
      /* the progress bar is the clock: when it fills, move on (pausing it on hover pauses the rotation too) */
      spot.addEventListener('animationend', function (e) { if (e.animationName === 'sp-fill' && !stopped) show(cur + 1); });
      var so2 = io(function (es) { if (es[0].isIntersecting && !timer && !stopped) { timer = true; show(cur); } }, { threshold: .4 });
      if (so2) so2.observe(spot);
      spot.addEventListener('mouseenter', function () { spot.classList.add('paused'); });
      spot.addEventListener('mouseleave', function () { spot.classList.remove('paused'); });
      spot.addEventListener('focusin', function () { spot.classList.add('paused'); });
      spot.addEventListener('focusout', function () { spot.classList.remove('paused'); });
    }
  }

  /* ------------------------------------------------------------ v20: each client's world behind their words (desktop only)
     Review switch: now / A line drawings / B dot pictures / C window (?look=b). */
  if (spot && spot.classList.contains('spot3')) {
    var stage = spot.querySelector('.sp-stage'), onScreen = false;
    var vis = io(function (es) { onScreen = es[0].isIntersecting; loops(); }, { threshold: 0 });
    if (vis) vis.observe(spot); else onScreen = true;

    /* Cleanmeter's overlay: the frame rate wobbles like the real readout */
    var ticks = spot.querySelectorAll('.tick');
    if (ticks.length && !reduce) setInterval(function () {
      if (!onScreen || innerWidth < 901) return;
      ticks.forEach(function (t) {
        var lo = +t.dataset.lo, hi = +t.dataset.hi, v = lo + Math.floor(Math.random() * (hi - lo + 1)), ms = t.dataset.ms && t.parentNode.querySelector('.cmo-ms');
        t.textContent = v;
        if (ms) ms.textContent = (1000 / v).toFixed(1) + ' ms';          /* frame time follows the frame rate, as in Cleanmeter */
      });
    }, 700);

    /* Crispy Studio's site shows the local time in its top bar; the window does too */
    var clock = spot.querySelector('[data-clock]');
    if (clock) { var tick2 = function () { clock.textContent = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); }; tick2(); setInterval(tick2, 30000); }

    /* B: dot pictures in the globe's style. Each client is two small drawings in opposite corners, sampled onto a dot grid;
       switching clients sends the same dots to the new drawing. */
    var DOTS = (function () {
      var cv = spot.querySelector('.sp-dots');
      if (!cv || !cv.getContext) return null;
      var ctx = cv.getContext('2d'), W = 0, H = 0, dpr = 1, SP = 7, P = [], sets = [], raf = 0, shown = -1;
      var EMB = '#f00', SND = '#00f', COL = ['rgba(75,60,41,.5)', '#d0631c'];   /* drawn in code colours, painted in ink and ember */
      var INV = ['..X.....X..', '...X...X...', '..XXXXXXX..', '.XX.XXX.XX.', 'XXXXXXXXXXX', 'X.XXXXXXX.X', 'X.X.....X.X', '...XX.XX...'];
      var CUR = ['X.......', 'XX......', 'XXX.....', 'XXXX....', 'XXXXX...', 'XXXXXX..', 'XXXXXXX.', 'XXXXXXXX', 'XXXXX...', 'XX.XXX..', 'X..XXX..', '....XXX.', '....XXX.'];
      var PAD = ['..XXXX....XXXX..', '.XXXXXXXXXXXXXX.', 'XXXOXXXXXXXXOXXX', 'XXOOOX.XX.XOXOXX', 'XXXOXXXXXXXXOXXX', 'XXXXXXXXXXXXXXXX', 'XXXXX......XXXXX', '.XXX........XXX.'];
      function box(g, x, y, w, h, t) { g.fillRect(x, y, w, t); g.fillRect(x, y + h - t, w, t); g.fillRect(x, y, t, h); g.fillRect(x + w - t, y, t, h); }
      function draw(k, g) {
        var L = 44, T = 42, R = W - 44, B = H - 42;
        if (k === 0) {                                                   /* Cleanmeter: a pixel invader and a gamepad */
          g.fillStyle = EMB;
          INV.forEach(function (row, j) { for (var i = 0; i < row.length; i++) if (row[i] === 'X') g.fillRect(L + i * 14, T + j * 14, 14, 14); });
          /* and a gamepad, same scale: body in ink, d-pad and buttons in ember */
          PAD.forEach(function (row, j) { for (var i = 0; i < row.length; i++) if (row[i] !== '.') { g.fillStyle = row[i] === 'O' ? EMB : SND; g.fillRect(R - 224 + i * 14, B - 112 + j * 14, 14, 14); } });
        } else if (k === 1) {                                            /* IBFNet: bars that climb, and a run of candles */
          [35, 56, 49, 77, 70, 105].forEach(function (h, i) { g.fillStyle = i === 5 ? EMB : SND; g.fillRect(L + i * 35, T + 112 - h, 21, h); });
          g.fillStyle = SND; g.fillRect(L - 7, T + 119, 217, 7);
          var x1 = R - 238, v = 96;
          [[0, 18], [1, -12], [0, 24], [1, -10], [0, 20], [0, 16], [1, -8], [0, 26]].forEach(function (c, i) {
            var up = !c[0], o = v, n = v - c[1], top = Math.min(o, n), hgt = Math.max(14, Math.abs(n - o));
            g.fillStyle = up ? EMB : SND;
            g.fillRect(x1 + i * 30 + 7, B - 130 + top - 14, 7, hgt + 28);
            g.fillRect(x1 + i * 30, B - 130 + top, 21, hgt);
            v = n;
          });
        } else {                                                         /* Crispy Studio: a page being laid out, and a cursor */
          var bx = L, by = T, bw = 203, bh = 133;
          g.fillStyle = SND; box(g, bx, by, bw, bh, 7); g.fillRect(bx, by + 21, bw, 7);
          g.fillStyle = EMB; [14, 28, 42].forEach(function (d) { g.fillRect(bx + d, by + 7, 7, 7); });
          g.fillStyle = SND; g.fillRect(bx + 21, by + 42, 91, 14); g.fillRect(bx + 21, by + 63, 63, 7); g.fillRect(bx + 126, by + 42, 56, 63);
          g.fillStyle = EMB; g.fillRect(bx + 21, by + 84, 42, 14);
          g.fillStyle = SND; box(g, R - 91, B - 105, 91, 91, 7);
          g.fillStyle = EMB; [[R - 98, B - 112], [R - 14, B - 112], [R - 98, B - 28], [R - 14, B - 28]].forEach(function (c) { g.fillRect(c[0], c[1], 14, 14); });
          CUR.forEach(function (row, j) { for (var i = 0; i < row.length; i++) if (row[i] === 'X') g.fillRect(R - 158 + i * SP, B - 126 + j * SP, SP, SP); });
        }
      }
      function sample(k) {
        var o = document.createElement('canvas'); o.width = W; o.height = H;
        var g = o.getContext('2d', { willReadFrequently: true }); draw(k, g);
        var d = g.getImageData(0, 0, W, H).data, out = [];
        for (var y = SP / 2; y < H; y += SP) for (var x = SP / 2; x < W; x += SP) {
          var i = ((y | 0) * W + (x | 0)) * 4;
          if (d[i + 3] > 128) out.push({ x: x, y: y, e: d[i] > d[i + 2] ? 1 : 0 });
        }
        return out.sort(function (a, b) { return a.x - b.x || a.y - b.y; });
      }
      function build() {
        var r = stage.getBoundingClientRect();
        if (Math.round(r.width) === W && Math.round(r.height) === H && P.length) return false;
        W = Math.round(r.width); H = Math.round(r.height); dpr = Math.min(2, devicePixelRatio || 1);
        cv.width = W * dpr; cv.height = H * dpr;
        sets = [0, 1, 2].map(sample);
        var n = Math.max.apply(null, sets.map(function (s) { return s.length; }));
        P = [];
        for (var i = 0; i < n; i++) P.push({ x: Math.random() * W, y: Math.random() * H, a: 0, e: 0, ph: Math.random() * 6.3, fx: 0, fy: 0, fa: 0, fe: 0, tx: 0, ty: 0, ta: 0, te: 0, t0: 0, d: 1 });
        P.forEach(function (p) { p.tx = p.x; p.ty = p.y; });
        shown = -1; return true;
      }
      function go(k, instant) {
        if (!active()) return;
        build(); shown = k;
        var s = sets[k], now = performance.now();
        P.forEach(function (p, i) {
          var t = s[i] || s[(i * 7919) % s.length];                     /* spare dots join the drawing and fade out */
          p.fx = p.x; p.fy = p.y; p.fa = p.a; p.fe = p.e;
          p.tx = t.x; p.ty = t.y; p.ta = s[i] ? 1 : 0; p.te = t.e;
          p.t0 = now + (instant ? 0 : (t.x / W) * 280 + Math.random() * 180); p.d = instant ? 0 : 1100;
        });
        kick();
      }
      function active() { return spot.dataset.look === 'b' && innerWidth >= 901; }
      function kick() { if (!raf && onScreen && active()) raf = requestAnimationFrame(frame); }
      function frame(now) {
        raf = 0; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
        var moving = false;
        for (var i = 0; i < P.length; i++) {
          var p = P[i], q = p.d ? Math.min(1, Math.max(0, (now - p.t0) / p.d)) : 1;
          if (q < 1) moving = true;
          var e = q < .5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2;
          p.x = p.fx + (p.tx - p.fx) * e; p.y = p.fy + (p.ty - p.fy) * e; p.a = p.fa + (p.ta - p.fa) * e; p.e = p.fe + (p.te - p.fe) * e;
          if (p.a < .02) continue;
          ctx.globalAlpha = p.a * (reduce ? 1 : .8 + .2 * Math.sin(now / 900 + p.ph));
          ctx.fillStyle = COL[p.e > .5 ? 1 : 0];
          ctx.beginPath(); ctx.arc(p.x, p.y, 1.75, 0, 6.2832); ctx.fill();
        }
        if (!reduce || moving) kick();                                   /* the dots breathe gently while on screen */
      }
      spot.addEventListener('sp-show', function () { go(cur); });
      addEventListener('resize', function () { if (active() && build()) go(cur, true); });
      return { wake: function () { if (!active()) return; if (shown < 0) go(cur, reduce); else kick(); } };
    })();

    /* C: the game window's ground rolls towards you */
    var gh = spot.querySelector('.gnd-h'), gd = spot.querySelector('.gnd-d'), HL = [], DL = [], graf = 0, NS = 'http://www.w3.org/2000/svg';
    var gameIdx = gh ? gh.closest('.scn').dataset.i : null;
    if (gh) for (var hi = 0; hi < 9; hi++) { var hl = document.createElementNS(NS, 'path'); gh.appendChild(hl); HL.push(hl); }
    if (gd) for (var di = 0; di < 7; di++) { var dl = document.createElementNS(NS, 'path'); gd.appendChild(dl); DL.push(dl); }
    function ground(now) {
      graf = 0;
      var t = reduce ? 0 : now;
      HL.forEach(function (l, i) {
        var p = ((i / HL.length) + t / 9000) % 1, y = 292 + 150 * Math.pow(p, 2.3);
        l.setAttribute('d', 'M0 ' + y.toFixed(1) + 'H480'); l.setAttribute('opacity', Math.min(1, p * 1.2).toFixed(2));
      });
      DL.forEach(function (l, i) {                                     /* centre dashes: grow and widen as they come closer */
        var p = ((i / DL.length) + t / 2600) % 1, y1 = 292 + 150 * Math.pow(p, 2.3), y2 = 292 + 150 * Math.pow(Math.min(1, p + .05), 2.3), w = .4 + p * 3.2;
        l.setAttribute('d', 'M' + (240 - w).toFixed(2) + ' ' + y1.toFixed(1) + 'H' + (240 + w).toFixed(2) + 'L' + (240 + w * 1.15).toFixed(2) + ' ' + y2.toFixed(1) + 'H' + (240 - w * 1.15).toFixed(2) + 'Z');
        l.setAttribute('opacity', Math.min(1, p * 1.6).toFixed(2));
      });
      if (!reduce && onScreen && spot.dataset.look === 'c' && spot.dataset.cur === gameIdx && innerWidth >= 901) graf = requestAnimationFrame(ground);
    }
    function loops() { if (DOTS) DOTS.wake(); if ((HL.length || DL.length) && !graf) ground(performance.now()); }
    spot.addEventListener('sp-show', loops);

    /* review switches (v21): the frame (?frame=round|edge) and what sits inside it (?look=now|a|c|cp|cf) */
    var qs = new URLSearchParams(location.search);
    function bar(name, def, apply) {
      var b = document.querySelector('.iter-bar[data-iter="' + name + '"]');
      if (!b) return;
      function set(v) { apply(v); b.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x.dataset.v === v)); }); }
      b.querySelectorAll('button').forEach(function (x) { x.addEventListener('click', function () { set(x.dataset.v); }); });
      var want = qs.get(name); set(want && b.querySelector('button[data-v="' + want + '"]') ? want : def);
    }
    bar('frame', 'round', function (v) { spot.dataset.frame = v; });
    bar('look', 'c', function (v) { spot.dataset.look = v; loops(); });
  }

  /* ------------------------------------------------------------ v21 footer curve (review switch, ?curve=dome|bowl|old) */
  (function () {
    var b = document.querySelector('.iter-bar[data-iter="curve"]');
    if (!b) return;
    function set(v) {
      if (v === 'old') delete document.documentElement.dataset.curve; else document.documentElement.dataset.curve = v;
      b.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x.dataset.v === v)); });
    }
    b.querySelectorAll('button').forEach(function (x) { x.addEventListener('click', function () { set(x.dataset.v); }); });
    var want = new URLSearchParams(location.search).get('curve');
    set(want && b.querySelector('button[data-v="' + want + '"]') ? want : 'dome');
  })();

  /* ------------------------------------------------------------ who it is for: the tabs and the sideways cards stay in step */
  var track = document.querySelector('.who-track');
  if (track) {
    var wTabs = [].slice.call(document.querySelectorAll('.who-tabs [role="tab"]')), cards = [].slice.call(track.querySelectorAll('.who-card')), on = 0;
    function mark(i) {
      on = i;
      wTabs.forEach(function (t, j) { t.setAttribute('aria-selected', String(j === i)); t.tabIndex = j === i ? 0 : -1; });
      cards.forEach(function (c, j) { c.classList.toggle('is-on', j === i); c.querySelector('.who-link').tabIndex = j === i ? 0 : -1; });
      var row = wTabs[i].parentNode, t = wTabs[i];                               // keep the selected tab in view when the row scrolls
      if (row.scrollWidth > row.clientWidth) row.scrollTo({ left: t.offsetLeft - (row.clientWidth - t.offsetWidth) / 2, behavior: reduce ? 'auto' : 'smooth' });
    }
    function go(i, smooth) {
      var c = cards[i], left = c.offsetLeft - (track.clientWidth - c.offsetWidth) / 2;
      track.scrollTo({ left: left, behavior: smooth && !reduce ? 'smooth' : 'auto' }); mark(i);
    }
    wTabs.forEach(function (t, i) {
      t.addEventListener('click', function () { go(i, true); });
      t.addEventListener('keydown', function (e) {
        var k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!k) return;
        var n = (i + k + wTabs.length) % wTabs.length; go(n, true); wTabs[n].focus(); e.preventDefault();
      });
    });
    var st;
    track.addEventListener('scroll', function () {                           // a swipe changes the tab too
      clearTimeout(st); st = setTimeout(function () {
        var mid = track.scrollLeft + track.clientWidth / 2, best = 0, bd = 1e9;
        cards.forEach(function (c, j) { var d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = j; } });
        if (best !== on) mark(best);
      }, 90);
    }, { passive: true });
    cards.forEach(function (c, i) { c.addEventListener('click', function () { if (i !== on) go(i, true); }); });
    /* start on cafés and restaurants, so the clinic card peeks in from the left */
    var start = Math.min(1, cards.length - 1), lastW = innerWidth;
    requestAnimationFrame(function () { go(start, false); });
    addEventListener('load', function () { go(on, false); });
    addEventListener('resize', function () { if (innerWidth !== lastW) { lastW = innerWidth; go(on, false); } });  // phones fire resize when the address bar moves
  }

  /* ------------------------------------------------------------ shift C: the city strip can be dragged with a mouse */
  document.querySelectorAll('.sx-strip').forEach(function (el) {
    var down = false, x0 = 0, s0 = 0;
    el.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') return; down = true; x0 = e.clientX; s0 = el.scrollLeft; el.classList.add('dragging'); el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', function (e) { if (down) el.scrollLeft = s0 - (e.clientX - x0); });
    ['pointerup', 'pointercancel'].forEach(function (t) { el.addEventListener(t, function () { down = false; el.classList.remove('dragging'); }); });
  });

  /* ------------------------------------------------------------ the way into the footer (A by default); B's footer eases up from behind the page */
  if (!document.documentElement.dataset.foot) document.documentElement.dataset.foot = 'a';
  (function () {
    var f = document.querySelector('.footer'); if (!f) return;
    function par() {
      if (document.documentElement.dataset.foot !== 'b' || reduce) { f.style.removeProperty('--fy'); return; }
      var t = f.getBoundingClientRect().top, p = Math.max(0, Math.min(1, (innerHeight - t) / (innerHeight * .85)));
      f.style.setProperty('--fy', (-(1 - p) * Math.min(260, innerHeight * .3)).toFixed(1) + 'px');
    }
    window.WF_footPar = par; addEventListener('scroll', par, { passive: true }); addEventListener('resize', par); par();
  })();

  /* ------------------------------------------------------------ live local times on every city (updated each half minute) */
  var fmt = {};
  function tick() {
    document.querySelectorAll('[data-tz]').forEach(function (el) {
      var tz = el.dataset.tz;
      try { fmt[tz] = fmt[tz] || new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false });
        var t = fmt[tz].format(new Date()); if (el.textContent !== t) { if (el.classList.contains('bd-time') && window.WF_flap) window.WF_flap(el, t); else el.textContent = t; } } catch (e) {}
    });
  }
  tick(); setInterval(tick, 30000);

  /* ------------------------------------------------------------ Services menu items open their card */
  document.querySelectorAll('[data-open]').forEach(function (a) {
    a.addEventListener('click', function () {
      var d = document.getElementById('disc-' + a.dataset.open); if (!d) return;
      var card = d.closest('.disc');
      setTimeout(function () { if (!card.classList.contains('open')) card.querySelector('.disc-head').click(); }, 450);
    });
  });

  var CITIES = []; try { CITIES = JSON.parse(document.getElementById('wf-cities').textContent); } catch (e) {}

  /* ------------------------------------------------------------ shift B: split-flap board */
  var board = document.querySelector('.board-rows');
  if (board && CITIES.length) {
    var GLY = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789?:-.,’', rowsB = [].slice.call(board.querySelectorAll('.board-row'));
    function cells(el, text) {                                                 // one flap per character
      el.textContent = ''; el.setAttribute('aria-label', text);
      for (var i = 0; i < text.length; i++) { var c = document.createElement('i'); c.className = 'fl'; c.setAttribute('aria-hidden', 'true'); c.textContent = text[i] === ' ' ? ' ' : text[i]; el.appendChild(c); }
    }
    function flap(el, text) {
      var old = el.getAttribute('aria-label') || el.textContent, n = Math.max(old.length, text.length);
      text = text + ' '.repeat(n - text.length);
      if (el.children.length !== n) cells(el, old + ' '.repeat(Math.max(0, n - old.length)));
      el.setAttribute('aria-label', text.trim());
      [].forEach.call(el.children, function (c, i) {
        var want = text[i] === ' ' ? ' ' : text[i]; if (c.textContent === want) return;
        if (reduce) { c.textContent = want; return; }
        var spins = 3 + (i % 4), k = 0;
        (function spin() {
          c.classList.remove('go'); void c.offsetWidth; c.classList.add('go');
          c.textContent = k < spins ? GLY[Math.floor(Math.random() * GLY.length)] : want;
          if (k++ < spins) setTimeout(spin, 70 + i * 4);
        })();
      });
    }
    window.WF_flap = flap;
    rowsB.forEach(function (r) { ['.bd-time', '.bd-city', '.bd-q'].forEach(function (q) { var el = r.querySelector(q); cells(el, el.textContent); }); });
    tick();
    var qi = {}, rb = 0, bTimer = null;
    var bo = io(function (es) {
      if (es[0].isIntersecting && !bTimer && !reduce) bTimer = setInterval(function () {
        var r = rowsB[rb % rowsB.length], c = CITIES.filter(function (x) { return x.k === r.dataset.city; })[0];
        qi[c.k] = ((qi[c.k] || 0) + 1) % c.q.length; flap(r.querySelector('.bd-q'), c.q[qi[c.k]]); rb += 3;   // hop rows so the flips spread out
      }, 2600);
      if (!es[0].isIntersecting && bTimer) { clearInterval(bTimer); bTimer = null; }
    }, { threshold: .2 });
    if (bo) bo.observe(board);
  }

  /* ------------------------------------------------------------ the shift: a light globe of city lights (canvas, dots from NASA maps), in step with the city reel */
  var gcan = document.querySelector('.gl-canvas');
  if (gcan && window.WF_GLOBE && CITIES.length) {
    var raw = atob(window.WF_GLOBE), N = raw.length / 5, P = new Float32Array(N * 3), Lt = new Uint8Array(N);
    for (var i = 0; i < N; i++) {
      var o = i * 5, la = (raw.charCodeAt(o) | raw.charCodeAt(o + 1) << 8), lo = (raw.charCodeAt(o + 2) | raw.charCodeAt(o + 3) << 8);
      if (la > 32767) la -= 65536; if (lo > 32767) lo -= 65536;
      var phi = la / 10 * Math.PI / 180, lam = lo / 10 * Math.PI / 180;
      P[i * 3] = Math.cos(phi) * Math.sin(lam); P[i * 3 + 1] = Math.sin(phi); P[i * 3 + 2] = Math.cos(phi) * Math.cos(lam); Lt[i] = raw.charCodeAt(o + 4);
    }
    var ctx = gcan.getContext('2d'), gw = 0, dpr = 1, lon0 = -80, lat0 = 22, tLon = lon0, tLat = lat0, spin = 0, active = 0, drag = null, gRun = false, idleAt = 0;
    var reelCards = [].slice.call(document.querySelectorAll('.reel-card[data-city]'));
    /* desktop: the globe is as tall as the text beside it. Its canvas is wider than the globe (room for the halo), so the canvas
       may spill past its column; the text sits above it. Phones keep the CSS size. */
    var gwrap = gcan.parentNode, gcopy = document.querySelector('.sx-orbit .sx-copy'), gart = gwrap.parentNode;
    function fit() {
      if (!gcopy || innerWidth < 901) { gwrap.style.width = gwrap.style.marginLeft = gwrap.style.marginTop = gwrap.style.marginBottom = ''; var re = document.querySelector('.sx-orbit + .reel'); if (re) re.style.marginTop = ''; return; }
      var aw = gart.clientWidth, ar = gart.getBoundingClientRect(), cxs = ar.left + aw / 2;
      var room = 2 * Math.min(cxs, document.documentElement.clientWidth - cxs);   // never past the screen edge (it was at 1024px)
      var w = Math.min(gcopy.offsetHeight / .78, aw * 1.45, innerWidth * .56, room);
      gwrap.style.width = w.toFixed(0) + 'px'; gwrap.style.marginLeft = ((aw - w) / 2).toFixed(0) + 'px';
      /* the canvas is taller than the text (room for the halo); negative margins stop it adding height to the row,
         which was opening an extra gap above the section (v18) */
      var over = Math.max(0, (w - gcopy.offsetHeight) / 2).toFixed(0) + 'px';
      gwrap.style.marginTop = gwrap.style.marginBottom = '-' + over;
      var reelEl = document.querySelector('.sx-orbit + .reel');                 // the reel keeps the distance it had before (v19)
      if (reelEl) reelEl.style.marginTop = 'calc(clamp(1.5rem, 3vw, 2.25rem) + ' + over + ')';
    }
    function size() { fit(); var r = gcan.getBoundingClientRect(); dpr = Math.min(2, devicePixelRatio || 1); gw = r.width; gcan.width = Math.round(r.width * dpr); gcan.height = Math.round(r.width * dpr); }
    function proj(x, y, z, sl0, cl0, sp0, cp0) {                                 // rotate by longitude then tilt by latitude
      var x1 = x * cl0 - z * sl0, z1 = x * sl0 + z * cl0;
      var y2 = y * cp0 - z1 * sp0, z2 = y * sp0 + z1 * cp0;
      return [x1, y2, z2];
    }
    function vec(la, lo) { var p = la * Math.PI / 180, l = lo * Math.PI / 180; return [Math.cos(p) * Math.sin(l), Math.sin(p), Math.cos(p) * Math.cos(l)]; }
    var CV = CITIES.map(function (c) { return vec(c.lat, c.lon); });
    function frame(t) {
      if (!gRun) return;
      if (!drag) {
        if (t - idleAt > 5200 && !reduce) { idleAt = t; go(active + 1); }
        lon0 += (tLon - lon0) * .045; lat0 += (tLat - lat0) * .045;
      }
      var W = gcan.width, R = W * .39, cx = W / 2, cy = W * .5;       // the halo reaches 1.22R, so R leaves it room inside the canvas (it was being cut flat at the top)
      ctx.clearRect(0, 0, W, W);
      var g = ctx.createRadialGradient(cx, cy, R * .92, cx, cy, R * 1.22);          // a warm halo on the cream page
      g.addColorStop(0, 'rgba(242,154,85,.28)'); g.addColorStop(.4, 'rgba(242,154,85,.08)'); g.addColorStop(1, 'rgba(242,154,85,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.22, 0, 6.2832); ctx.fill();
      var d = ctx.createRadialGradient(cx - R * .38, cy - R * .42, R * .08, cx, cy, R);  // a paper sphere, lit from the upper left
      d.addColorStop(0, '#fffdf8'); d.addColorStop(.7, '#fbf3e6'); d.addColorStop(1, '#f1e3cd');
      ctx.fillStyle = d; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.fill();
      ctx.strokeStyle = 'rgba(208,99,28,.3)'; ctx.lineWidth = 1 * dpr; ctx.stroke();
      var l0 = lon0 * Math.PI / 180, p0 = lat0 * Math.PI / 180, sl0 = Math.sin(l0), cl0 = Math.cos(l0), sp0 = Math.sin(p0), cp0 = Math.cos(p0);
      var s1 = 1.35 * dpr;
      for (var i = 0; i < N; i++) {
        var q = proj(P[i * 3], P[i * 3 + 1], P[i * 3 + 2], sl0, cl0, sp0, cp0); if (q[2] <= 0.02) continue;
        var x = cx + q[0] * R, y = cy - q[1] * R, L = Lt[i], e = .35 + .65 * q[2];
        if (L) { var a = (.45 + L / 15 * .55) * e, sz = s1 * (1.05 + L / 15 * 1.2); ctx.fillStyle = 'rgba(' + (208 - L * 2) + ',' + (104 - L * 2) + ',' + (40 - L) + ',' + a.toFixed(3) + ')'; ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz); }
        else { ctx.fillStyle = 'rgba(106,88,68,' + (.34 * e).toFixed(3) + ')'; ctx.fillRect(x - s1 / 2, y - s1 / 2, s1, s1); }
      }
      ctx.font = '600 ' + (11 * dpr) + 'px Inter, system-ui, sans-serif'; ctx.textBaseline = 'middle';
      CITIES.forEach(function (c, j) {                                           // pins; the three key cities always carry a label
        var q = proj(CV[j][0], CV[j][1], CV[j][2], sl0, cl0, sp0, cp0); if (q[2] <= 0.05) return;
        var x = cx + q[0] * R, y = cy - q[1] * R, on = j === active, r = (c.key ? 3.6 : 2.6) * dpr;
        if (on) { var ph = (t / 1400) % 1; ctx.strokeStyle = 'rgba(194,82,26,' + (1 - ph).toFixed(2) + ')'; ctx.lineWidth = 1.5 * dpr; ctx.beginPath(); ctx.arc(x, y, r + ph * 16 * dpr, 0, 6.2832); ctx.stroke(); }
        ctx.fillStyle = on ? '#c2521a' : (c.key ? '#d0631c' : 'rgba(208,99,28,.7)'); ctx.beginPath(); ctx.arc(x, y, on ? r * 1.3 : r, 0, 6.2832); ctx.fill();
        if (on) {                                                                  // the city and its local time, in an ink pill
          var tm = ''; try { tm = new Intl.DateTimeFormat('en-GB', { timeZone: c.tz, hour: '2-digit', minute: '2-digit' }).format(new Date()); } catch (e) {}
          var tx = c.n + '  ' + tm, tw = ctx.measureText(tx).width, px = x + 16 * dpr, py = y - 1 * dpr;
          ctx.fillStyle = '#1c1408'; roundRect(px - 7 * dpr, py - 10 * dpr, tw + 14 * dpr, 20 * dpr, 10 * dpr); ctx.fill();
          ctx.fillStyle = '#fffdf8'; ctx.fillText(c.n, px, py + .5 * dpr);
          ctx.fillStyle = '#c9b492'; ctx.fillText(tm, px + ctx.measureText(c.n + '  ').width, py + .5 * dpr);
        }
      });
      requestAnimationFrame(frame);
    }
    function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
    function go(j, now) {
      active = (j + CITIES.length) % CITIES.length; var c = CITIES[active];
      tLon = lon0 + ((((c.lon - lon0) % 360) + 540) % 360 - 180);                // the short way round
      tLat = Math.max(-10, Math.min(40, c.lat * .8));
      if (now || reduce) { lon0 = tLon; lat0 = tLat; }
      reelCards.forEach(function (rc) { rc.classList.toggle('on', rc.dataset.city === c.k); });
    }
    reelCards.forEach(function (rc) {                                            // tap a city in the reel and the globe turns to it
      var j = CITIES.map(function (x) { return x.k; }).indexOf(rc.dataset.city);
      function pickCity() { idleAt = performance.now() + 7000; go(j); }
      rc.addEventListener('click', pickCity);
      rc.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickCity(); } });
    });
    gcan.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY, lon: lon0, lat: lat0 }; gcan.classList.add('dragging'); gcan.setPointerCapture(e.pointerId); });
    gcan.addEventListener('pointermove', function (e) { if (!drag) return; lon0 = drag.lon - (e.clientX - drag.x) * .35; lat0 = Math.max(-60, Math.min(70, drag.lat + (e.clientY - drag.y) * .35)); tLon = lon0; tLat = lat0; });
    ['pointerup', 'pointercancel'].forEach(function (ev) { gcan.addEventListener(ev, function () { drag = null; gcan.classList.remove('dragging'); idleAt = performance.now() + 4000; }); });
    size(); addEventListener('resize', size); if (document.fonts) document.fonts.ready.then(size); addEventListener('load', size); go(0, true);
    var gio = io(function (es) { var vis = es[0].isIntersecting; if (vis && !gRun) { gRun = true; size(); idleAt = performance.now(); requestAnimationFrame(frame); } else if (!vis) gRun = false; }, { threshold: .05 });
    if (gio) gio.observe(gcan); else { gRun = true; requestAnimationFrame(frame); }
    document.addEventListener('visibilitychange', function () { if (document.hidden) gRun = false; else if (gcan.getBoundingClientRect().bottom > 0) { gRun = true; requestAnimationFrame(frame); } });
  }

  /* ------------------------------------------------------------ phone menu (v24): full screen, the page underneath holds still,
     Services opens in place, Tab stays inside, focus comes back to the menu button when it closes. nav.js still toggles it;
     this follows the sheet's hidden attribute, so every way of closing it (the button, Escape, a link) tidies up the same. */
  (function () {
    var wn = document.getElementById('wn'), sheet = document.getElementById('wn-sheet'), btn = wn && wn.querySelector('.wn-menu');
    if (!sheet || !btn) return;
    var acc = sheet.querySelector('.ms-acc > button'), sub = acc && document.getElementById(acc.getAttribute('aria-controls'));
    if (acc) acc.addEventListener('click', function () { var open = acc.getAttribute('aria-expanded') !== 'true'; acc.setAttribute('aria-expanded', String(open)); sub.hidden = !open; });
    function sync() {
      var open = !sheet.hidden;
      wn.classList.toggle('menu-open', open);
      document.documentElement.classList.toggle('menu-lock', open);
      if (!open) {
        if (acc) { acc.setAttribute('aria-expanded', 'false'); sub.hidden = true; }
        if (sheet.contains(document.activeElement)) btn.focus({ preventScroll: true });
      }
    }
    new MutationObserver(sync).observe(sheet, { attributes: true, attributeFilter: ['hidden'] });
    addEventListener('resize', function () { if (innerWidth > 900 && !sheet.hidden) { sheet.hidden = true; btn.setAttribute('aria-expanded', 'false'); } });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab' || sheet.hidden) return;
      var f = [btn].concat([].slice.call(sheet.querySelectorAll('a, button'))).filter(function (el) { return el.offsetParent !== null; });
      if (e.shiftKey && document.activeElement === f[0]) { f[f.length - 1].focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { f[0].focus(); e.preventDefault(); }
    });
  })();

  /* ------------------------------------------------------------ phone menu: links close the menu and then scroll
     (the menu hides itself in the same click, and some browsers then skip the jump to the section) */
  document.querySelectorAll('.wn-sheet a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var t = document.getElementById(a.getAttribute('href').slice(1)); if (!t) return;
      e.preventDefault();
      var sheet = document.querySelector('.wn-sheet'), btn = document.querySelector('.wn-menu');
      if (sheet) sheet.hidden = true; if (btn) btn.setAttribute('aria-expanded', 'false');
      requestAnimationFrame(function () {
        t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        if (history.pushState) history.pushState(null, '', '#' + t.id);
      });
    }, true);
  });
})();
