/* Orbits v64 (25 Oct 2026, from orbits6.js): the whole orbit at one scale, smoother trails, steadier stars.
   - Desktop: the orbit is drawn for a 1720px-wide design and scaled as one piece by S (fit.js): rings, star, the engines'
     rings and every trail. It keeps its exact shape at every window size, and the engines' rings no longer depend on the
     window's width, so nothing jumps while the window is dragged. Phones are unchanged.
   - Desktop stars sit in one fixed field centred on the page, so a resize shows more or less of the same sky instead of
     re-scattering every star.
   - Trails (html data-trail): 0 as before (rows of dots), 1 comet tail (one continuous line that thins and fades),
     2 soft glow tail (the same with a wide soft glow, like a long exposure), 3 fine dust (many tiny specks).
   Orbits v36 (orbits6.js): the sky, the rings and the star at the centre, drawn in one canvas.
   What changed from orbits5.js:
   - The logo image is gone from the centre. The star is drawn as a real one: a white-hot core, a warm bloom,
     a long soft horizontal streak and short vertical spikes, with a faint diagonal glint that only hints at
     the logo's shape. Its light is constant: no flicker, no flare, no rotation.
   - The rings have depth. Their far half is drawn first and dimmer, then the star, then the near half, so the
     rings pass behind the star and come round in front of it.
   - Background stars (v32) are soft points of light with a real sky's spread of brightness, the brightest few with
     hair-thin spikes, twinkling irregularly. They sit in three depth layers that drift a few pixels with the pointer.
   - Depth (v32): rings, signals and trails dim gradually towards the back of their orbit, on the same curve as the engines. The rings stay put
     (v29: the rings no longer tip with the pointer).
   - WF_bodies (set by hx4.js in versions B and C) lets the engines riding a ring leave a faint trail on it.
   Version comes from <html data-hv="a|b|c">. Colours only from the site tokens and the logo:
   ember #D0631C, flame #C2521A, star glow #F29A55, halo #FFE2C4, paper #FFFDF8, sand #F4E8D3. */
(function () {
  var cv = document.getElementById('orbits'); if (!cv) return;
  var HV = document.documentElement.dataset.hv || 'a', FLAT = HV !== 'a';
  var ctx = cv.getContext('2d'), box = cv.parentElement, focus = document.getElementById('focus');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W, H, cx, cy, dpr, N, phone, run = true, t0 = performance.now(), stars = [], sig = [];
  var meteor = null, nextMeteor = 6 + Math.random() * 6;
  var px = 0, py = 0, tx = 0, ty = 0;                       // pointer parallax for the background stars only (eased)
  var LINE = '242,154,85';
  var TM = +(document.documentElement.dataset.trail || 0), S = 1, field = null;
  /* (v64) the orbit's scale on desktop: 1720px-wide design, shrunk further on short windows by fit.js */
  function scale() { return phone ? 1 : Math.min(1, W / 1720) * (window.WF_fit ? window.WF_fit.r : 1); }
  /* One soft point of light per colour, drawn once and reused: a bright core that falls off smoothly (like a real
     star's image on a sensor), so small stars read as points and bright ones get a faint glow with no hard edge. */
  var STAR_RGB = ['255,250,242', '255,226,196', '236,242,255'], sprites = [];
  function sprite(rgb) {
    var c = document.createElement('canvas'), z = 32; c.width = c.height = z;
    var g = c.getContext('2d'), gr = g.createRadialGradient(z / 2, z / 2, 0, z / 2, z / 2, z / 2);
    [[0, 1], [.08, .85], [.2, .32], [.4, .07], [.7, .015], [1, 0]].forEach(function (s) { gr.addColorStop(s[0], 'rgba(' + rgb + ',' + s[1] + ')'); });
    g.fillStyle = gr; g.fillRect(0, 0, z, z); return c;
  }
  function seedRand(s) { return function () { s = s * 16807 % 2147483647; return (s - 1) / 2147483646; }; }
  /* Only rebuild the canvas when the sky's size really changes. Resetting a canvas wipes it, and iPhone Safari sends a
     "resize" every time its address bar slides in or out while you scroll (the sky's size doesn't change then). That
     blanked the animation, over and over, so the orbits seemed to vanish while scrolling. Returns true when it rebuilt,
     so the caller redraws at once. */
  var sizeKey = '';
  function size() {
    var r = box.getBoundingClientRect(), f = focus.getBoundingClientRect();
    cx = f.left - r.left + f.width / 2; cy = f.top - r.top + f.height / 2;
    var nd = Math.min(r.width < 700 ? 1.5 : 2, devicePixelRatio || 1), key = Math.round(r.width) + 'x' + Math.round(r.height) + '@' + nd;
    if (key === sizeKey) return false;
    sizeKey = key; W = r.width; H = r.height; phone = W < 700; dpr = nd;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    N = phone ? 20 : 30;
    S = scale();
    /* (v64 round 6) seeded once, not on every rebuild: re-seeding put the small planets back at their starting places each
       time the sky redrew (resizes, the Milky Way finishing), which looked like them jumping at random */
    var nSig = phone ? 4 : 5, R = seedRand(9), fresh = [];                 // R goes on to place the stars below, so it is always drawn the same
    for (var i = 0; i < nSig; i++) fresh.push({ k: 3 + Math.floor(R() * (N - 4)), p: R(), v: .03 + R() * .035 });   // (v64) desktop 6 -> 5 small planets
    if (sig.length !== nSig || sig.N !== N) { sig = fresh; sig.N = N; }
    window.WF_sig = sig;
    stars = [];
    /* keep the sky clear around the nav's words and buttons (v31: a bright star sat beside "FAQ") */
    var nav = [].map.call(document.querySelectorAll('#wn a, #wn button'), function (el) { return el.getBoundingClientRect(); })
      .filter(function (q) { return q.width > 0 && q.height > 0; })
      .map(function (q) { return [q.left - r.left - 28, q.top - r.top - 22, q.right - r.left + 28, q.bottom - r.top + 22]; });
    /* v33: no background stars anywhere near the nav bar (a band down to 36px below it), and none inside the orbits:
       every star sits outside the outermost ring with at least 14px to spare (they may sit near its outer edge). */
    var bar = document.querySelector('#wn .wn-bar'), navY = bar ? bar.getBoundingClientRect().bottom - r.top + 36 : 110;
    var oe = ell(N - 1, 0), oc = Math.cos(oe.tilt), os = Math.sin(oe.tilt), ORX = oe.rx + 14, ORY = oe.ry * 1.04 + 14;
    function inOrbit(x, y) { var dx = x - cx, dy = y - cy, u = dx * oc + dy * os, v = -dx * os + dy * oc; return (u * u) / (ORX * ORX) + (v * v) / (ORY * ORY) < 1; }
    function clear(x, y) {
      if (y < navY || inOrbit(x, y)) return false;
      for (var k = 0; k < nav.length; k++) if (x > nav[k][0] && x < nav[k][2] && y > nav[k][1] && y < nav[k][3]) return false;
      return true;
    }
    /* v32: stars as a real sky has them. Brightness follows a steep curve (most are faint, a handful bright), each is a
       soft point of light rather than a dot, and they are a touch fewer and dimmer than v28-v31. Every star takes the same
       number of random draws, so the sky is identical on every load. */
    if (!phone) { stars = deskStars(clear); }
    else {
    var n = Math.round(W * H / (phone ? 6000 : (window.WF_starDiv || 7600)));   // (20 Oct) sky.js asks for about a third more stars on desktop
    var even = !phone && window.WF_starDiv, gcols = Math.max(1, Math.round(Math.sqrt(n * W / H))), grows = Math.ceil(n / gcols), cw = W / gcols, ch = H / grows;
    for (var j = 0; j < n; j++) {
      var sx = even ? (j % gcols + R()) * cw : R() * W, sy = even ? (Math.floor(j / gcols) + R()) * ch : R() * H, m = R(), b = Math.pow(R(), 2.6), cc = R(), tw = R(), ph = R() * 6.28, f1 = R(), f2 = R();
      if (!clear(sx, sy)) continue;
      stars.push({ x: sx, y: sy, l: m < .62 ? 0 : m < .9 ? 1 : 2, b: b,
        o: Math.min(.58, .1 + b * .52), s: .5 + b * 1.05,               // peak opacity; size of the point (CSS px)
        c: cc < .7 ? 0 : cc < .9 ? 1 : 2,                               // warm white, halo, cool white
        tw: tw < .55, ph: ph, f1: .5 + f1 * 1.3, f2: 1.9 + f2 * 2.3, amp: .18 + b * .3,
        spike: b > .88 && !phone });
    }
    /* (20 Oct, desktop with sky.js) stars sit one per grid cell (above), and the brightest are handed out along a Halton
       sequence (an evenly spread, non-grid pattern) so the bright ones don't bunch; everything else about each star stays random */
    function halton(i, b) { var f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; }
    if (even) {
    var bs = stars.map(function (st) { return st.b; }).sort(function (p, q) { return q - p; }), pool = stars.slice();
    for (var hk = 0; hk < bs.length && pool.length; hk++) {
      var hx = halton(hk + 1, 2) * W, hy = halton(hk + 1, 3) * H, bi = 0, bd = 1e18;
      for (var pi = 0; pi < pool.length; pi++) { var dd = Math.pow(pool[pi].x - hx, 2) + Math.pow(pool[pi].y - hy, 2); if (dd < bd) { bd = dd; bi = pi; } }
      var sx2 = pool.splice(bi, 1)[0], bb = bs[hk];
      sx2.b = bb; sx2.o = Math.min(.58, .1 + bb * .52); sx2.s = .5 + bb * 1.05; sx2.amp = .18 + bb * .3; sx2.spike = bb > .88 && !phone;
    }
    }
    }
    /* (20 Oct) no star on a galaxy (sky.js), and no bright one on the Milky Way */
    var gal = window.WF_galaxies || [];
    if (gal.length || window.WF_bandDens) stars = stars.filter(function (st) {
      var on = gal.some(function (g) { return Math.hypot(st.x - g[0], st.y - g[1]) < 26; })
        || (st.b > .45 && window.WF_bandDens && window.WF_bandDens(st.x, st.y) > .04);   // no bright star on the Milky Way
      return !on;
    });
    /* (20 Oct) placed by hand (sky.js): stars taken out, and bright stars put in */
    var hide = window.WF_starHide || [], add = window.WF_starAdd || [];
    if (hide.length) stars = stars.filter(function (st) { return !hide.some(function (h) { return Math.hypot(st.x - h[0] * W, st.y - h[1] * H) < 18; }); });
    add.forEach(function (a, ai) {
      var bb = .92, st = {l: 1, c: 0, tw: true, ph: 1.3 + ai, f1: 1 + ai * .13, f2: 2.6, x: a[0] * W, y: a[1] * H, b: bb,
        o: Math.min(.58, .1 + bb * .52), s: .5 + bb * 1.05, amp: .18 + bb * .3, spike: !phone, added: true};
      stars.push(st);
    });
    if (window.WF_skyWait) stars = [];               // wait for sky.js, so the stars are placed once and never hop
    sprites = STAR_RGB.map(sprite);
    return true;
  }
  /* (v64) desktop stars: one field, 2800 x 1700px, centred on the page and made once. Every star keeps its place in it, so
     a resize only shows more or less of the same sky. Spread one per grid cell, the brightest handed out along a Halton
     sequence (as orbits6 did), then cut to the window and kept clear of the nav, the orbit, galaxies and the Milky Way. */
  function deskStars(clear) {
    if (!field) {
      var FW = 2800, FH = 1700, R = seedRand(9), n = Math.round(FW * FH / (window.WF_starDiv || 7600)), gcols = Math.round(Math.sqrt(n * FW / FH)), cw = FW / gcols, ch = FH / Math.ceil(n / gcols);
      field = [];
      for (var j = 0; j < n; j++) {
        var b = Math.pow(R(), 2.6), m = R(), cc = R(), tw = R();
        field.push({ fx: (j % gcols + R()) * cw - FW / 2, y: (Math.floor(j / gcols) + R()) * ch, l: m < .62 ? 0 : m < .9 ? 1 : 2, b: b,
          c: cc < .7 ? 0 : cc < .9 ? 1 : 2, tw: tw < .55, ph: R() * 6.28, f1: .5 + R() * 1.3, f2: 1.9 + R() * 2.3 });
      }
      var bs = field.map(function (st) { return st.b; }).sort(function (p, q) { return q - p; }), pool = field.slice();
      for (var hk = 0; hk < bs.length && pool.length; hk++) {
        var hx = (halton(hk + 1, 2) - .5) * FW, hy = halton(hk + 1, 3) * FH, bi = 0, bd = 1e18;
        for (var pi = 0; pi < pool.length; pi++) { var dd = Math.pow(pool[pi].fx - hx, 2) + Math.pow(pool[pi].y - hy, 2); if (dd < bd) { bd = dd; bi = pi; } }
        pool.splice(bi, 1)[0].b = bs[hk];
      }
      field.forEach(function (st) { st.o = Math.min(.58, .1 + st.b * .52); st.s = .5 + st.b * 1.05; st.amp = .18 + st.b * .3; st.spike = st.b > .88; });
    }
    var out = [];
    field.forEach(function (st) { var x = W / 2 + st.fx; if (x < 0 || x > W || st.y > H || !clear(x, st.y)) return; st.x = x; out.push(st); });
    return out;
  }
  function halton(i, b) { var f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; }
  /* ring i at time t. Version A keeps the live geometry; B and C lay the rings a little flatter and more level, so
     engines riding the outer rings clear the buttons above and the card below. */
  function ell(i, t) {
    var k = i / (N - 1), reach = Math.min(W * (phone ? .62 : .5), 760);
    var rx = phone ? 70 + k * reach : S * (100 + k * 900);           // (v64) desktop: the 1720px design, scaled as one
    var ratio = phone ? .28 : FLAT ? .145 : .19;
    var ry = rx * (ratio + .01 * Math.sin(t * .12 + i * .3));
    var tilt = (FLAT && !phone ? (-.07 + k * .04) : (-.14 + k * .09)) + .01 * Math.sin(t * .1 + i * .21);
    return { rx: rx, ry: ry, tilt: tilt, k: k };
  }
  function pt(e, a) { var x = e.rx * Math.cos(a), y = e.ry * Math.sin(a), c = Math.cos(e.tilt), s = Math.sin(e.tilt); return [cx + x * c - y * s, cy + x * s + y * c]; }
  /* where a point on ring i sits right now, in page coordinates */
  window.WF_orbit = function (i, a) {
    var e = ell(Math.min(i, N - 1), (performance.now() - t0) / 1000), p = pt(e, a), r = box.getBoundingClientRect();
    return { x: p[0] + r.left, y: p[1] + r.top };
  };
  /* (v51) the same point in the sky's own coordinates, with no page measuring: hx4.js measures once per frame and adds the
     offset itself. Measuring here, between its style writes, made the browser redo the page layout up to nine times a frame */
  window.WF_orbitIn = function (i, a) { var p = pt(ell(Math.min(i, N - 1), (performance.now() - t0) / 1000), a); return { x: p[0], y: p[1] }; };
  window.WF_orbitBox = box;
  /* (v64 round 4) the outer ring, live, so sky.js can dim the Milky Way behind the orbit and keep the rings in front */
  window.WF_orbitDisc = function () { if (!N) return null; var e = ell(N - 1, 0); return { x: cx, y: cy, rx: e.rx, ry: e.ry, tilt: e.tilt }; };
  window.WF_bodies = null;           // [{ring, a, dir}] from hx4.js
  window.WF_hi = null;               // rings (fractional indices) to draw a touch brighter: the engines' own orbits

  function ringAlpha(e) { return .34 - e.k * .26; }
  /* v32: depth fades gradually. 1 at the nearest point of a ring, BACK at the farthest, following the same curve as the
     engines (hx4.js). v28-v31 switched between the two at the sides, which read as a flip. */
  var BACK = .42;
  function depth(a) { return BACK + (1 - BACK) * (Math.sin(a) + 1) / 2; }
  /* each ring's stroke: a gradient across the ring from its farthest point to its nearest, which gives every point
     exactly depth(angle). Built once per frame and used by both halves. */
  var ringG = [], hiG = [];
  function grad(e, rgb, a) {
    var f = pt(e, -Math.PI / 2), nr = pt(e, Math.PI / 2), g = ctx.createLinearGradient(f[0], f[1], nr[0], nr[1]);
    g.addColorStop(0, 'rgba(' + rgb + ',' + (a * BACK).toFixed(3) + ')'); g.addColorStop(1, 'rgba(' + rgb + ',' + a.toFixed(3) + ')');
    return g;
  }
  function ringGrads(t) {
    ringG.length = 0; hiG.length = 0;
    for (var i = 0; i < N; i++) { var e = ell(i, t); ringG.push([e, grad(e, LINE, ringAlpha(e))]); }
    (window.WF_hi || []).forEach(function (r) { var e = ell(r, t); hiG.push([e, grad(e, '255,197,143', .2)]); });
  }
  /* the ring (as a fractional index, so any size fits) whose half-width is frac x half the sky */
  window.WF_ringAt = function (frac) {
    if (!phone) return Math.max(0, Math.min(N - 1, (frac * 860 - 100) / 900 * (N - 1)));   // (v64) the same ring at every size
    var reach = Math.min(W * (phone ? .62 : .5), 760);
    return Math.max(0, Math.min(N - 1, (frac * W / 2 - (phone ? 70 : 100)) / reach * (N - 1)));
  };
  /* half: 0 = far half (upper), 1 = near half (lower). In canvas terms the far half is angles PI..2PI. */
  function rings(t, half) {
    ctx.lineWidth = 1;
    /* all rings, then the engines' own orbits a touch brighter (B and C) */
    ringG.concat(hiG).forEach(function (rg) {
      var e = rg[0];
      ctx.beginPath(); ctx.ellipse(cx, cy, e.rx, e.ry, e.tilt, half ? 0 : Math.PI, half ? Math.PI : Math.PI * 2);
      ctx.strokeStyle = rg[1]; ctx.stroke();
    });
  }
  /* (v64) a tail along ring e from angle a0 back over 'span' radians, drawn in 40 short pieces that thin and fade
     towards the end (T1), with a wide soft glow under it (T2), or as a stream of tiny specks (T3). Each piece is drawn in
     the half (behind or in front of the star) it sits in, and dims by depth. */
  var TS = 40, dustR = [];
  (function () { var R = seedRand(5); for (var i = 0; i < 64; i++) dustR.push([R(), R() - .5, R(), R() * 6.28]); })();
  function mix(c0, c1, f) { return Math.round(c0[0] + (c1[0] - c0[0]) * f) + ',' + Math.round(c0[1] + (c1[1] - c0[1]) * f) + ',' + Math.round(c0[2] + (c1[2] - c0[2]) * f); }
  var HALO = [255, 226, 196], EMB = [242, 154, 85];
  function tail(e, a0, span, w0, amul, half, t, seed) {
    var ws = Math.min(1.15, .55 + .45 * S / .84);
    if (TM === 3) {
      for (var j = 0; j < 64; j++) {
        var dr = dustR[(j + seed * 7) % 64], f = (j + dr[0]) / 64, a = a0 - f * span;
        if ((Math.sin(a) >= 0) !== !!half) continue;
        var q = pt(e, a), q2 = pt(e, a + .01), nx = q[1] - q2[1], ny = q2[0] - q[0], nl = Math.hypot(nx, ny) || 1, off = dr[1] * (1 + f * 5) * ws;
        var tw = .65 + .35 * Math.sin(t * 9 + dr[3]), al = Math.min(1, Math.pow(1 - f, 1.2) * amul * 2.2 * depth(a) * tw), sz = (.7 + .9 * dr[2]) * (1 - f * .4) * ws;
        ctx.fillStyle = 'rgba(' + mix(HALO, EMB, f) + ',' + al.toFixed(3) + ')';
        ctx.fillRect(q[0] + nx / nl * off - sz / 2, q[1] + ny / nl * off - sz / 2, sz, sz);
      }
      return;
    }
    ctx.lineCap = 'butt';
    var p0 = pt(e, a0);
    for (var i = 0; i < TS; i++) {
      var fa = i / TS, fb = (i + 1) / TS, aa = a0 - fa * span, ab = a0 - fb * span, am = (aa + ab) / 2;
      var p1 = pt(e, ab); if ((Math.sin(am) >= 0) !== !!half) { p0 = p1; continue; }
      var f = (fa + fb) / 2, dp = depth(am), fade = Math.pow(1 - f, 1.5);
      if (TM === 2) {
        ctx.strokeStyle = 'rgba(' + mix(HALO, EMB, f) + ',' + (fade * amul * .34 * dp).toFixed(3) + ')';
        ctx.lineWidth = (w0 * 7 * (1 - f * .35)) * ws; ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(' + mix(HALO, EMB, f) + ',' + (fade * amul * dp).toFixed(3) + ')';
      ctx.lineWidth = Math.max(.25, w0 * Math.pow(1 - f, .8)) * ws;
      ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
      p0 = p1;
    }
  }
  /* the head of a signal: a soft point of light with a bright core */
  function head(q, a, al) {
    var ws = Math.min(1.15, .55 + .45 * S / .84), D = (TM === 2 ? 16 : 10) * ws;
    ctx.globalAlpha = Math.min(1, al * (TM === 2 ? .85 : .7)); ctx.drawImage(sprites[1] || sprite(STAR_RGB[1]), q[0] - D / 2, q[1] - D / 2, D, D); ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,250,242,' + al.toFixed(3) + ')'; ctx.beginPath(); ctx.arc(q[0], q[1], 1.15 * ws, 0, Math.PI * 2); ctx.fill();
  }
  function signals(t, half) {
    if (TM && !phone) {
      ctx.globalCompositeOperation = 'lighter';
      sig.forEach(function (g, gi) {
        var e = ell(g.k, t), a = g.p * Math.PI * 2;
        tail(e, a, TM === 3 ? .5 : TM === 2 ? .5 : .42, 1.5, TM === 3 ? 1 : .62, half, t, gi);
        if ((Math.sin(a) >= 0) === !!half) head(pt(e, a), a, depth(a));
      });
      ctx.globalCompositeOperation = 'source-over';
      return;
    }
    ctx.globalCompositeOperation = 'lighter';
    sig.forEach(function (g) {
      var e = ell(g.k, t);
      for (var j = 0; j < 14; j++) {
        /* each dot of the signal is placed in front of or behind the star by its own position, and dims by depth() */
        var a = (g.p - j * .006) * Math.PI * 2; if ((Math.sin(a) >= 0) !== !!half) continue;
        var q = pt(e, a), f = 1 - j / 14;
        ctx.beginPath(); ctx.arc(q[0], q[1], j === 0 ? 1.9 : 1.4 * f, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + (j === 0 ? '255,226,196' : '242,154,85') + ',' + (f * depth(a) * (j === 0 ? 1 : .8)).toFixed(3) + ')'; ctx.fill();
      }
    });
    ctx.globalCompositeOperation = 'source-over';
  }
  /* engines riding a ring leave a short fading trail behind them (B and C) */
  function trails(t, half) {
    var B = window.WF_bodies; if (!B) return;
    ctx.globalCompositeOperation = 'lighter';
    if (TM && !phone) {
      B.forEach(function (b, bi) { tail(ell(b.ring, t), b.a, .42, 2.1, .5, half, t, bi + 9); });
      ctx.globalCompositeOperation = 'source-over';
      return;
    }
    B.forEach(function (b) {
      var e = ell(b.ring, t);
      for (var j = 1; j < 26; j++) {
        var a = b.a - j * .012 * (b.dir || 1), near = Math.sin(a) >= 0; if (near !== !!half) continue;
        var q = pt(e, a), f = (1 - j / 26);
        ctx.fillStyle = 'rgba(255,214,170,' + (f * f * .5 * depth(a)).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(q[0], q[1], 1.3 * f + .3, 0, Math.PI * 2); ctx.fill();
      }
    });
    ctx.globalCompositeOperation = 'source-over';
  }
  /* The star. Additive, so the rings behind it stay visible through the glare, as they would in a photograph. */
  function spike(len, w, ang, alpha, warm) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
    var g = ctx.createLinearGradient(0, 0, len, 0);
    g.addColorStop(0, 'rgba(255,253,248,' + alpha + ')');
    g.addColorStop(.18, 'rgba(255,226,196,' + (alpha * .7).toFixed(3) + ')');
    g.addColorStop(.55, 'rgba(' + (warm || '242,154,85') + ',' + (alpha * .25).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(208,99,28,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -w); ctx.quadraticCurveTo(len * .25, -w * .35, len, 0); ctx.quadraticCurveTo(len * .25, w * .35, 0, w); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  /* (v51) the star never changes, so it's drawn once (per size) into its own small canvas and copied in, additively, each
     frame: the same light, without building a dozen gradients 120 times a second */
  var starC = null, starKey = '';
  function star(t) {
    var s = phone ? .72 : Math.min(1, S * 1720 / 1300) * .95 + .1, R1 = Math.ceil(150 * s) + 2, k = s.toFixed(3) + ':' + dpr + ':' + HV;
    if (k !== starKey) {
      starKey = k; starC = document.createElement('canvas'); starC.width = starC.height = Math.ceil(2 * R1 * dpr);
      var main = ctx, mcx = cx, mcy = cy; ctx = starC.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); cx = cy = R1;
      starDraw(s); ctx = main; cx = mcx; cy = mcy;
    }
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(starC, cx - R1, cy - R1, starC.width / dpr, starC.height / dpr);
    ctx.globalCompositeOperation = 'source-over';
  }
  function starDraw(s) {
    var I = 1;                                     /* steady: the star's light never changes (v29) */
    ctx.globalCompositeOperation = 'lighter';
    /* wide warm bloom */
    var R1 = 150 * s, g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R1);
    g.addColorStop(0, 'rgba(255,226,196,' + (.30 * I).toFixed(3) + ')'); g.addColorStop(.22, 'rgba(242,154,85,' + (.13 * I).toFixed(3) + ')');
    g.addColorStop(.6, 'rgba(208,99,28,' + (.04 * I).toFixed(3) + ')'); g.addColorStop(1, 'rgba(208,99,28,0)');
    ctx.fillStyle = g; ctx.fillRect(cx - R1, cy - R1, R1 * 2, R1 * 2);
    /* tight inner glow */
    var R2 = 26 * s, g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, R2);
    g2.addColorStop(0, 'rgba(255,253,248,' + Math.min(1, .95 * I).toFixed(3) + ')'); g2.addColorStop(.3, 'rgba(255,226,196,' + (.55 * I).toFixed(3) + ')');
    g2.addColorStop(1, 'rgba(242,154,85,0)');
    ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(cx, cy, R2, 0, Math.PI * 2); ctx.fill();
    /* horizontal streak (long, soft) and vertical spikes (short), then a faint diagonal glint */
    var L = (HV === 'c' ? 120 : 138) * s, V = 44 * s;
    var a1 = Math.min(1, .8 * I).toFixed(3);
    spike(L, 1.5 * s, 0, a1); spike(L, 1.5 * s, Math.PI, a1);
    spike(V, 1.7 * s, -Math.PI / 2, a1); spike(V, 1.7 * s, Math.PI / 2, a1);
    var a2 = (.22 * I).toFixed(3);
    for (var d = 0; d < 4; d++) spike(15 * s, 1.1 * s, Math.PI / 4 + d * Math.PI / 2, a2, '255,226,196');
    /* white-hot core */
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.beginPath(); ctx.arc(cx, cy, 2.6 * s, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
  function sky(t) {
    for (var s = 0; s < stars.length; s++) {
      var st = stars[s], d = [1.5, 3.5, 6][st.l];
      var x = st.x - px * d, y = st.y - py * d;
      /* twinkle: small and irregular (two unrelated rhythms), brighter stars a little more, as real ones do */
      var o = st.o;
      if (st.tw && !reduce) o *= 1 - st.amp * (.5 + .25 * Math.sin(t * st.f1 + st.ph) + .25 * Math.sin(t * st.f2 + st.ph * 1.7));
      var D = st.s * 7;
      ctx.globalAlpha = o; ctx.drawImage(sprites[st.c], x - D / 2, y - D / 2, D, D);
      if (st.spike) {                                         /* the brightest few: hair-thin spikes, like the big star's */
        var L = 2 + st.b * 3, a = (o * .22).toFixed(3);
        ctx.globalAlpha = 1; ctx.strokeStyle = 'rgba(' + STAR_RGB[st.c] + ',' + a + ')'; ctx.lineWidth = .5;
        ctx.beginPath(); ctx.moveTo(x - L, y); ctx.lineTo(x + L, y); ctx.moveTo(x, y - L * .8); ctx.lineTo(x, y + L * .8); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
  /* (v51) the signals move by elapsed time, not by frame: at 120Hz they were running twice their designed speed */
  var lastF = 0;
  function frame(now) {
    if (!run) return;
    var fdt = lastF ? Math.min(.05, (now - lastF) / 1000) : 1 / 60; lastF = now;
    draw(now, fdt);
    sig.forEach(function (g) { g.p = (g.p + g.v * fdt) % 1; });
    if (!reduce) requestAnimationFrame(frame);
  }
  function draw(now, fdt) {
    var t = (now - t0) / 1000; ctx.clearRect(0, 0, W, H); S = scale();
    var ease = 1 - Math.pow(1 - .04, (fdt || 1 / 60) * 60);   // (v51) the pointer drift eases by time: the same feel at 60 or 120Hz
    px += (tx - px) * ease; py += (ty - py) * ease;
    sky(t); drawMeteor(t);
    ringGrads(t);
    rings(t, 0); trails(t, 0); signals(t, 0);
    star(t);
    rings(t, 1); trails(t, 1); signals(t, 1);
  }
  /* Shooting star: unchanged from orbits5.js (one every 10-25s, five zones, never the same zone twice) */
  var ZONES = [
    { x: [.04, .28], y: [.05, .28], dir: -1, drop: [18, 32] },
    { x: [.72, .96], y: [.05, .28], dir: 1, drop: [18, 32] },
    { x: [.36, .66], y: [.095, .12], dir: -1, drop: [4, 10] },
    { x: [.03, .14], y: [.44, .56], dir: -1, drop: [22, 36] },
    { x: [.86, .97], y: [.44, .56], dir: 1, drop: [22, 36] }
  ], lastZone = -1;
  function rr(a) { return a[0] + Math.random() * (a[1] - a[0]); }
  function spawnMeteor(t) {
    var z; do { z = Math.floor(Math.random() * ZONES.length); } while (z === lastZone); lastZone = z;
    var Z = ZONES[z], drop = rr(Z.drop) * Math.PI / 180, dist = (z >= 3 ? 190 : 260) + Math.random() * 110;
    meteor = { x: W * rr(Z.x), y: H * rr(Z.y), dx: Z.dir * Math.cos(drop) * dist, dy: Math.sin(drop) * dist, t0: t, dur: .9 + Math.random() * .35, tail: 90 + Math.random() * 60 };
  }
  function drawMeteor(t) {
    if (reduce) return;
    if (!meteor) { if (t >= nextMeteor) { spawnMeteor(t); nextMeteor = t + 10 + Math.random() * 15; } return; }
    var p = (t - meteor.t0) / meteor.dur; if (p >= 1) { meteor = null; return; }
    var e = 1 - Math.pow(1 - p, 2), hx = meteor.x + meteor.dx * e, hy = meteor.y + meteor.dy * e;
    var len = Math.hypot(meteor.dx, meteor.dy), ux = meteor.dx / len, uy = meteor.dy / len, tl = meteor.tail * Math.min(1, p * 3);
    var alpha = .55 * Math.sin(Math.PI * p);
    var g = ctx.createLinearGradient(hx, hy, hx - ux * tl, hy - uy * tl);
    g.addColorStop(0, 'rgba(255,236,214,' + alpha.toFixed(3) + ')'); g.addColorStop(1, 'rgba(242,154,85,0)');
    ctx.strokeStyle = g; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx - ux * tl, hy - uy * tl); ctx.stroke();
    ctx.fillStyle = 'rgba(255,253,248,' + (alpha * .9).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(hx, hy, 1.3, 0, Math.PI * 2); ctx.fill();
  }
  function start() { if (!run) { run = true; requestAnimationFrame(frame); } }
  size(); requestAnimationFrame(frame);
  if (window.HX_relayout) window.HX_relayout();            // hx4.js ran first; let it put the engines on the rings now
  /* pointer parallax: -1..1 across the hero, pointer devices only */
  var hero = box.closest('.hx');
  if (!reduce && matchMedia('(pointer: fine)').matches && hero) {
    hero.addEventListener('pointermove', function (ev) { var r = hero.getBoundingClientRect(); tx = (ev.clientX - r.left) / r.width * 2 - 1; ty = (ev.clientY - r.top) / r.height * 2 - 1; });
    hero.addEventListener('pointerleave', function () { tx = ty = 0; });
  }
  var pending = false;
  window.WF_restars = function () { sizeKey = ''; later(); };   // sky.js calls this when it redraws the Milky Way and galaxies
  function later() { if (pending) return; pending = true; requestAnimationFrame(function () { pending = false; if (size() || reduce) draw(performance.now()); }); }
  if ('ResizeObserver' in window) { var ro = new ResizeObserver(later); ro.observe(box); ro.observe(focus.parentElement); }
  addEventListener('resize', later);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(later);
  new IntersectionObserver(function (es) { if (es[es.length - 1].isIntersecting) start(); else run = false; }).observe(box);
  document.addEventListener('visibilitychange', function () { if (document.hidden) run = false; else start(); });
})();
