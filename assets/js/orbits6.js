/* Orbits v33: the sky, the rings and the star at the centre, drawn in one canvas.
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
  function size() {
    var r = box.getBoundingClientRect(); W = r.width; H = r.height; phone = W < 700;
    dpr = Math.min(phone ? 1.5 : 2, devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var f = focus.getBoundingClientRect(); cx = f.left - r.left + f.width / 2; cy = f.top - r.top + f.height / 2;
    N = phone ? 20 : 30;
    var R = seedRand(9); sig = [];
    for (var i = 0; i < (phone ? 4 : 6); i++) sig.push({ k: 3 + Math.floor(R() * (N - 4)), p: R(), v: .03 + R() * .035 });
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
    var n = Math.round(W * H / (phone ? 6000 : 7600));
    for (var j = 0; j < n; j++) {
      var sx = R() * W, sy = R() * H, m = R(), b = Math.pow(R(), 2.6), cc = R(), tw = R(), ph = R() * 6.28, f1 = R(), f2 = R();
      if (!clear(sx, sy)) continue;
      stars.push({ x: sx, y: sy, l: m < .62 ? 0 : m < .9 ? 1 : 2, b: b,
        o: Math.min(.58, .1 + b * .52), s: .5 + b * 1.05,               // peak opacity; size of the point (CSS px)
        c: cc < .7 ? 0 : cc < .9 ? 1 : 2,                               // warm white, halo, cool white
        tw: tw < .55, ph: ph, f1: .5 + f1 * 1.3, f2: 1.9 + f2 * 2.3, amp: .18 + b * .3,
        spike: b > .88 && !phone });
    }
    sprites = STAR_RGB.map(sprite);
  }
  /* ring i at time t. Version A keeps the live geometry; B and C lay the rings a little flatter and more level, so
     engines riding the outer rings clear the buttons above and the card below. */
  function ell(i, t) {
    var k = i / (N - 1), reach = Math.min(W * (phone ? .62 : .5), 760);
    var rx = (phone ? 70 : 100) + k * reach;
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
  function signals(t, half) {
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
  function star(t) {
    var s = phone ? .72 : Math.min(1, W / 1300) * .95 + .1;
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
  function frame(now) {
    if (!run) return;
    var t = (now - t0) / 1000; ctx.clearRect(0, 0, W, H);
    px += (tx - px) * .04; py += (ty - py) * .04;
    sky(t); drawMeteor(t);
    ringGrads(t);
    rings(t, 0); trails(t, 0); signals(t, 0);
    star(t);
    rings(t, 1); trails(t, 1); signals(t, 1);
    sig.forEach(function (g) { g.p = (g.p + g.v / 60) % 1; });
    if (!reduce) requestAnimationFrame(frame);
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
  function later() { if (pending) return; pending = true; requestAnimationFrame(function () { pending = false; size(); if (reduce) frame(performance.now()); }); }
  if ('ResizeObserver' in window) { var ro = new ResizeObserver(later); ro.observe(box); ro.observe(focus.parentElement); }
  addEventListener('resize', later);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(later);
  new IntersectionObserver(function (es) { if (es[0].isIntersecting) start(); else run = false; }).observe(box);
  document.addEventListener('visibilitychange', function () { if (document.hidden) run = false; else start(); });
})();
