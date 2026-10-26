/* Hero deep sky (20 Oct 2026, built with Zaid over v59 rounds 1-10). Desktop and phones each have their own layout (phones added 21 Oct).
   - The Milky Way: a bent band of glow and ~9,000 specks in the site's orange fading to warm white, with knotty star clouds,
     a dark rift and thin dust lanes. It's the back-most layer, and only appears once the hero has been on screen for
     2 minutes in total (paused while scrolled away or on another tab), filling in from the top down along its path.
   - Three far-off galaxies and hand-placed bright stars, with some of the random stars taken out (CFG: fractions of the
     sky, 0,0 top-left, 1,1 bottom-right, so they sit in the same place on every screen size). Placed with the v59 editor.
   - About a third more stars, spread evenly (orbits6.js), none on a galaxy and no bright one on the Milky Way.
   Everything is drawn once, after fonts load and the hero is at its final size, so nothing hops. */
(function () {
  var sky = document.querySelector('.hx .sky'); if (!sky) return;
  var DESK = {galaxies: [[.201, .181], [.792, .199], [.946, .725]],
    add: [[.109, .256], [.211, .113], [.069, .144], [.033, .303], [.162, .514], [.866, .348]],
    hide: [[.107, .152], [.072, .321], [.109, .477], [.392, .366], [.454, .424], [.548, .389], [.517, .369], [.614, .383],
      [.283, .286], [.75, .126], [.889, .168], [.784, .394], [.64, .761], [.344, .771], [.822, .76]]};
  /* phones (21 Oct): their own layout, placed by Zaid with the v63 editor */
  var PHONE = innerWidth <= 900;
  var MOB = {galaxies: [[.92, .143], [.059, .379]],                // Zaid, 21 Oct
    add: [[.2, .15], [.056, .196], [.938, .344], [.315, .094], [.695, .099], [.938, .703], [.967, .772], [.018, .727]],
    hide: [[.503, .146], [.423, .23], [.619, .32]]};
  var CFG = PHONE ? MOB : DESK;
  window.WF_skyCfg = CFG;
  var REVEAL = 120;                                               // seconds of the hero on screen before the Milky Way appears
  window.WF_starDiv = 5600;                                       // orbits6.js: one star per 5600px² (was 7600)
  function rnd(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
  function gauss(R) { var u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * v); }
  function layer(cls) { var e = document.createElement('canvas'); e.className = 'sp-layer ' + cls; e.setAttribute('aria-hidden', 'true'); sky.insertBefore(e, sky.firstChild); return e; }
  function ctxFor(c, w, h) { var d = Math.min(2, devicePixelRatio || 1); c.width = Math.round(w * d); c.height = Math.round(h * d); var x = c.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0); return x; }
  function noise(seed) {
    function h(i, j) { var n = Math.sin(i * 127.1 + j * 311.7 + seed * 74.7) * 43758.5453; return n - Math.floor(n); }
    function sm(t) { return t * t * (3 - 2 * t); }
    function v(x, y) { var i = Math.floor(x), j = Math.floor(y), fx = sm(x - i), fy = sm(y - j);
      return h(i, j) * (1 - fx) * (1 - fy) + h(i + 1, j) * fx * (1 - fy) + h(i, j + 1) * (1 - fx) * fy + h(i + 1, j + 1) * fx * fy; }
    return function (x, y) { return (v(x, y) * .55 + v(x * 2.1, y * 2.1) * .3 + v(x * 4.3, y * 4.3) * .15); };
  }
  var W, H;
  var MW = document.documentElement.dataset.mw || 'b', HB = document.documentElement.dataset.gx || 'arm', NOW = document.documentElement.dataset.now === '1';

  /* (v64) Milky Way, closer to a photograph. Same path as before (Zaid's curve), but:
     - made of grain, not glow: ~42,000 faint specks (stars too far to see one by one) carry most of the light, and the
       smooth glow under them is less than half as strong
     - near-neutral colour: grey-white with a slightly warmer core, as in real photos, instead of the site's orange
     - patchy at every size (five layers of noise), with thin dark dust threads and dark clouds cutting through it
     - edges that thin out into scattered stars rather than fading as a glow
     MW a = that alone; b = plus a few small pink-red glowing hydrogen clouds along the brightest parts (what photos show);
     c = b plus two faint teal-green wisps. */
  /* integer hash: ~25x faster than the sin() hash above, which matters at ~500,000 samples */
  function noise5(seed, oct) {
    function h(i, j) { var n = Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(seed, 1442695041) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }
    function sm(t) { return t * t * (3 - 2 * t); }
    function v(x, y) { var i = Math.floor(x), j = Math.floor(y), fx = sm(x - i), fy = sm(y - j);
      return h(i, j) * (1 - fx) * (1 - fy) + h(i + 1, j) * fx * (1 - fy) + h(i, j + 1) * (1 - fx) * fy + h(i + 1, j + 1) * fx * fy; }
    if (oct === 3) return function (x, y) { return v(x, y) * .55 + v(x * 2.1, y * 2.1) * .3 + v(x * 4.3, y * 4.3) * .15; };
    return function (x, y) { return v(x, y) * .42 + v(x * 2.03 + 5.1, y * 2.03) * .26 + v(x * 4.1, y * 4.1 + 2.7) * .16 + v(x * 8.3 + 1.3, y * 8.3) * .1 + v(x * 16.7, y * 16.7 + 8.1) * .06; };
  }
  function ss(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  /* path: one or more bent pieces [A, C, B] joined end to end. o (v64 round 3, all optional): amp = brightness,
     wid = width, fade(x, y) = how much shows at a point (dims it behind the headline) */
  function milkyWay2(x, path, mid, mode, o) {
    o = o || {}; var amp = o.amp || 1, F = o.fade || function () { return 1; }, BO = o.boost;   // boost: [where 0..1, spread, extra light, extra width]
    var pts = [], len = [0];
    path.forEach(function (pc, k) { var A = pc[0], C = pc[1], B = pc[2];
      for (var i = k ? 1 : 0; i <= 72; i++) { var t = i / 72, a = (1 - t) * (1 - t), b = 2 * t * (1 - t), c = t * t;
        pts.push([(a * A[0] + b * C[0] + c * B[0]) * W, (a * A[1] + b * C[1] + c * B[1]) * H]);
        var m = pts.length - 1; if (m) len.push(len[m - 1] + Math.hypot(pts[m][0] - pts[m - 1][0], pts[m][1] - pts[m - 1][1])); } });
    var segs = pts.length - 1, L = len[segs], s0 = Math.max(44, W * .03) * 1.3 * (o.wid || 1), cloud = noise5(3), mott = noise5(17), rifty = noise5(11, 3), wob = noise5(29, 3), edge = noise5(41),
        fil = noise5(53), dark = noise5(67), R = rnd(23);
    function sigma(u, side) {
      var f = u / L, bulge = .62 + .95 * Math.exp(-Math.pow((f - mid) / .2, 2)) + (BO ? BO[3] * Math.exp(-Math.pow((f - BO[0]) / BO[1], 2)) : 0);
      return s0 * bulge * (.8 + .4 * wob(f * 5, side > 0 ? 1.7 : 4.2)) * (side > 0 ? 1.12 : .9);
    }
    function proj(px, py) {
      var best = 1e18, bu = 0, bv = 0;
      for (var i = 0; i < segs; i++) {
        var p = pts[i], q = pts[i + 1], sx = q[0] - p[0], sy = q[1] - p[1], l2 = sx * sx + sy * sy,
            t = Math.max(0, Math.min(1, ((px - p[0]) * sx + (py - p[1]) * sy) / l2)), cx = p[0] + sx * t, cy = p[1] + sy * t,
            d2 = (px - cx) * (px - cx) + (py - cy) * (py - cy);
        if (d2 < best) { best = d2; bu = len[i] + Math.sqrt(l2) * t; bv = ((px - p[0]) * sy - (py - p[1]) * sx) / Math.sqrt(l2); }
      }
      return [bu, bv];
    }
    function densUV(u, v) {
      var sg = sigma(u, v), r = Math.abs(v) / sg;
      if (r > 3.4) return 0;
      var ends = Math.min(1, u / (L * .1), (L - u) / (L * .1)); if (ends <= 0) return 0;
      var core = Math.exp(-r * r * .9) * (.7 + .55 * Math.exp(-Math.pow((u / L - mid) / .16, 2)));
      var rag = Math.max(0, Math.min(1, 1.7 - r + 1.1 * (edge(u / 45, v / 35) - .5)));
      var cl = .1 + 1.8 * Math.pow(cloud(u / 120, v / 75), 1.9) * 1.5;                                 // clouds at every size
      var rc = sg * .18 * Math.sin(u / 130), rw = sg * .17;
      var rift = 1 - .6 * Math.exp(-Math.pow((v - rc) / rw, 2)) * (.5 + .5 * rifty(u / 60, 1.3));     // the dark rift
      var l1 = rc + sg * (.42 + .25 * Math.sin(u / 210)), l2 = rc - sg * (.5 + .2 * Math.cos(u / 170));
      rift *= 1 - .38 * Math.exp(-Math.pow((v - l1) / (sg * .09), 2)) * rifty(u / 45, 4.1);
      rift *= 1 - .3 * Math.exp(-Math.pow((v - l2) / (sg * .08), 2)) * rifty(u / 52, 7.3);
      var rd = 1 - Math.abs(2 * fil(u / 70 + 3, v / 42) - 1);                                           // thin dust threads
      rift *= 1 - .6 * ss(.8, .97, rd) * Math.exp(-r * r * .35);
      rift *= 1 - .5 * ss(.5, .68, dark(u / 170 + 9, v / 95));                                           // dark clouds
      return Math.max(0, core * cl * rift * ends * rag) * amp * (BO ? 1 + BO[2] * Math.exp(-Math.pow((u / L - BO[0]) / BO[1], 2)) : 1);
    }
    function dens(px, py) { var uv = proj(px, py); return densUV(uv[0], uv[1]) * F(px, py); }
    var prevD = window.WF_bandDens;                                 // two bands: bright stars keep off both
    window.WF_bandDens = prevD ? function (px, py) { return Math.max(prevD(px, py), dens(px, py)); } : dens;
    function at(su, sv) {                                           // path coordinates -> canvas
      var i2 = 0; while (i2 < segs - 1 && len[i2 + 1] < su) i2++;
      var p0 = pts[i2], p1 = pts[i2 + 1], sl = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), tt = (su - len[i2]) / sl,
          nx = -(p1[1] - p0[1]) / sl, ny = (p1[0] - p0[0]) / sl;
      return [p0[0] + (p1[0] - p0[0]) * tt + nx * sv, p0[1] + (p1[1] - p0[1]) * tt + ny * sv, nx, ny];
    }
    var k = 3, gw = Math.ceil(W / k), gh = Math.ceil(H / k), g = document.createElement('canvas'); g.width = gw; g.height = gh;
    var gx = g.getContext('2d'), img = gx.createImageData(gw, gh), d = img.data, c0 = [178, 168, 160], c1 = [236, 226, 210];
    var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9, pad = s0 * 3.8;
    pts.forEach(function (p) { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); });
    var y0 = Math.max(0, Math.floor((minY - pad) / k)), y1 = Math.min(gh, Math.ceil((maxY + pad) / k)),
        x0 = Math.max(0, Math.floor((minX - pad) / k)), x1 = Math.min(gw, Math.ceil((maxX + pad) / k)), yy = y0, glowDone = false;
    var GRAIN = ['236,231,222', '224,229,240', '246,236,222'], STARC = ['255,246,232', '228,236,255', '255,220,182'];
    var phase = 0, n = 0, tries = 0, neb = 0;
    function sp(rgb) { var c = document.createElement('canvas'), z = 24; c.width = c.height = z; var q = c.getContext('2d'), gr = q.createRadialGradient(z / 2, z / 2, 0, z / 2, z / 2, z / 2);
      [[0, 1], [.12, .7], [.3, .18], [.6, .03], [1, 0]].forEach(function (st) { gr.addColorStop(st[0], 'rgba(' + rgb + ',' + st[1] + ')'); }); q.fillStyle = gr; q.fillRect(0, 0, z, z); return c; }
    var glowSp = sp('255,246,232');
    function blob(cx, cy, rad, rgb, al, sx, ang) {
      x.save(); x.translate(cx, cy); x.rotate(ang || 0); x.scale(sx || 1, 1);
      var gr = x.createRadialGradient(0, 0, 0, 0, 0, rad); gr.addColorStop(0, 'rgba(' + rgb + ',' + al + ')'); gr.addColorStop(.45, 'rgba(' + rgb + ',' + (al * .45).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
      x.fillStyle = gr; x.beginPath(); x.arc(0, 0, rad, 0, 6.2832); x.fill(); x.restore();
    }
    return function step(deadline) {
      /* 1. the faint glow under the grain, at a third of the size and scaled up */
      for (; yy < y1 && !glowDone; yy++) {
        if (performance.now() > deadline) return false;
        for (var xx = x0; xx < x1; xx++) {
          var D = dens(xx * k, yy * k); if (D <= .002) continue;
          var t = Math.min(1, D), pi = (yy * gw + xx) * 4;
          d[pi] = c0[0] + (c1[0] - c0[0]) * t; d[pi + 1] = c0[1] + (c1[1] - c0[1]) * t; d[pi + 2] = c0[2] + (c1[2] - c0[2]) * t;
          d[pi + 3] = Math.min(255, D * 44);
        }
      }
      if (!glowDone) {
        glowDone = true; gx.putImageData(img, 0, 0);
        x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(g, 0, 0, gw * k, gh * k);
      }
      /* 2. grain: tens of thousands of faint specks, mottled at a small scale; 3. resolved stars, a few with a soft glow */
      var target = phase === 0 ? 90000 : 1500;
      while (phase < 2) {
        for (; n < target && tries < target * 9; tries++) {
          if ((tries & 127) === 0 && performance.now() > deadline) return false;
          var su = R() * L, sv = gauss(R) * sigma(su, R() - .5) * (phase ? 1.35 : 1.15), q = at(su, sv), Dn = densUV(su, sv) * F(q[0], q[1]);
          var acc = Math.min(1, Dn * (phase ? 1.1 : 3.5)); if (R() > acc) continue;                     // kept where the band is dense
          var wgt = phase ? 1 : Math.min(1, Dn * 1.5) / Math.max(.001, acc);                              // grain: fewer wasted samples, same light
          if (q[0] < -2 || q[1] < -2 || q[0] > W + 2 || q[1] > H + 2) continue;
          if (phase === 0) {
            var a = (.035 + .07 * R()) * wgt * Math.min(1, .3 + Dn) * (.45 + 1.1 * mott(su / 24, sv / 20)), sz = .5 + R() * .35;
            x.fillStyle = 'rgba(' + GRAIN[Math.floor(R() * 3)] + ',' + Math.min(.4, a).toFixed(3) + ')'; x.fillRect(q[0], q[1], sz, sz);
          } else {
            var b = Math.pow(R(), 4), ci = R() < .55 ? 0 : R() < .6 ? 1 : 2, a2 = (.06 + b * .42) * Math.min(1, .4 + Dn);
            if (b > .8) { var Dg = 3 + b * 6; x.globalAlpha = a2 * .7; x.drawImage(glowSp, q[0] - Dg / 2, q[1] - Dg / 2, Dg, Dg); x.globalAlpha = 1; }
            x.fillStyle = 'rgba(' + STARC[ci] + ',' + a2.toFixed(3) + ')'; var sz2 = .55 + b * .9; x.fillRect(q[0] - sz2 / 2, q[1] - sz2 / 2, sz2, sz2);
          }
          n++;
        }
        phase++; n = 0; tries = 0; target = 1500;
      }
      /* 4. (b, c) small pink-red hydrogen clouds along the brightest parts; (c) two faint teal-green wisps near the edge */
      if (mode !== 'a' && !neb) {
        neb = 1; x.globalCompositeOperation = 'lighter';
        var NR = rnd(71), placed = 0;
        for (var tr = 0; tr < 400 && placed < 8; tr++) {
          var nu = L * (.1 + .8 * NR()), nv = gauss(NR) * .4 * sigma(nu, 1), nd = densUV(nu, nv);
          if (nd < .35) continue;
          var c = at(nu, nv); if (c[0] < 8 || c[1] < 8 || c[0] > W - 8 || c[1] > H - 8) continue;
          var size = (.7 + NR() * .9) * Math.max(.8, W / 1600);
          for (var bl = 0; bl < 5; bl++) blob(c[0] + (NR() - .5) * 22 * size, c[1] + (NR() - .5) * 14 * size, (4 + NR() * 9) * size, '226,90,110', (.036 + NR() * .04).toFixed(3), 1 + NR() * 1.2, NR() * 3.14);
          blob(c[0], c[1], 2.6 * size, '255,150,160', .08);
          placed++;
        }
        if (mode === 'c') for (var gi2 = 0; gi2 < 2; gi2++) {
          var gu = L * (gi2 ? .62 : .3), gv = (gi2 ? -1 : 1) * 1.05 * sigma(gu, gi2 ? -1 : 1), gc = at(gu, gv), ang = Math.atan2(gc[3], gc[2]) + Math.PI / 2;
          blob(gc[0], gc[1], 34 * Math.max(.8, W / 1600), '96,196,164', .045, 2.4, ang);
          blob(gc[0] + gc[2] * 8, gc[1] + gc[3] * 8, 18 * Math.max(.8, W / 1600), '110,210,180', .03, 1.8, ang);
        }
        x.globalCompositeOperation = 'source-over';
      }
      return true;
    };
  }

  /* the Milky Way along a bent path (quadratic curve A -> B, pulled toward C), bulging at 'mid' */
  function milkyWay(x, A, C, B, mid) {
    var segs = 72, pts = [], len = [0];
    for (var i = 0; i <= segs; i++) { var t = i / segs, a = (1 - t) * (1 - t), b = 2 * t * (1 - t), c = t * t;
      pts.push([(a * A[0] + b * C[0] + c * B[0]) * W, (a * A[1] + b * C[1] + c * B[1]) * H]);
      if (i) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); }
    var L = len[segs], s0 = Math.max(44, W * .03) * 1.1, clump = noise(3), rifty = noise(11), wob = noise(29), edge = noise(41), R = rnd(23);
    function sigma(u, side) {
      var f = u / L, bulge = .62 + .95 * Math.exp(-Math.pow((f - mid) / .2, 2));
      return s0 * bulge * (.8 + .4 * wob(f * 5, side > 0 ? 1.7 : 4.2)) * (side > 0 ? 1.12 : .9);
    }
    function proj(px, py) {                                         // nearest point on the path: [u, signed v]
      var best = 1e18, bu = 0, bv = 0;
      for (var i = 0; i < segs; i++) {
        var p = pts[i], q = pts[i + 1], sx = q[0] - p[0], sy = q[1] - p[1], l2 = sx * sx + sy * sy,
            t = Math.max(0, Math.min(1, ((px - p[0]) * sx + (py - p[1]) * sy) / l2)), cx = p[0] + sx * t, cy = p[1] + sy * t,
            d2 = (px - cx) * (px - cx) + (py - cy) * (py - cy);
        if (d2 < best) { best = d2; bu = len[i] + Math.sqrt(l2) * t; bv = ((px - p[0]) * sy - (py - p[1]) * sx) / Math.sqrt(l2); }
      }
      return [bu, bv];
    }
    function dens(px, py) {
      var uv = proj(px, py), u = uv[0], v = uv[1], sg = sigma(u, v), r = Math.abs(v) / sg;
      if (r > 3.2) return 0;
      var ends = Math.min(1, u / (L * .1), (L - u) / (L * .1)); if (ends <= 0) return 0;
      var core = Math.exp(-r * r) * (.75 + .5 * Math.exp(-Math.pow((u / L - mid) / .16, 2)));
      var rag = Math.max(0, Math.min(1, 1.6 - r + .9 * (edge(u / 40, v / 30) - .5)));                // ragged edges
      var cl = .18 + 1.5 * Math.pow(clump(u / 85, v / 50), 1.6) * 1.35;                               // knotty star clouds
      var rc = sg * .18 * Math.sin(u / 130), rw = sg * .17;
      var rift = 1 - .62 * Math.exp(-Math.pow((v - rc) / rw, 2)) * (.5 + .5 * rifty(u / 60, 1.3));  // the dark rift
      var l1 = rc + sg * (.42 + .25 * Math.sin(u / 210)), l2 = rc - sg * (.5 + .2 * Math.cos(u / 170));  // dust lanes off it
      rift *= 1 - .38 * Math.exp(-Math.pow((v - l1) / (sg * .09), 2)) * rifty(u / 45, 4.1);
      rift *= 1 - .3 * Math.exp(-Math.pow((v - l2) / (sg * .08), 2)) * rifty(u / 52, 7.3);
      return Math.max(0, core * cl * rift * ends * rag);
    }
    window.WF_bandDens = dens;                                      // orbits6.js keeps bright stars off it
    /* Drawing it takes a few hundred ms (up to ~0.7s on a slow laptop), so it's done in small slices in the browser's idle
       time rather than in one go; it isn't shown for 2 minutes anyway. Returns step(deadline): true when finished. */
    /* the glow, at a third of the size and scaled up, so it's perfectly smooth */
    var k = 3, gw = Math.ceil(W / k), gh = Math.ceil(H / k), g = document.createElement('canvas'); g.width = gw; g.height = gh;
    var gx = g.getContext('2d'), img = gx.createImageData(gw, gh), d = img.data, c0 = [242, 154, 85], c1 = [255, 226, 196];
    var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9, pad = s0 * 3.6;
    pts.forEach(function (p) { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); });
    var y0 = Math.max(0, Math.floor((minY - pad) / k)), y1 = Math.min(gh, Math.ceil((maxY + pad) / k)),
        x0 = Math.max(0, Math.floor((minX - pad) / k)), x1 = Math.min(gw, Math.ceil((maxX + pad) / k)), yy = y0, glowDone = false;
    var cols = ['255,226,196', '255,236,214', '255,250,242'], n = 0, tries = 0;
    return function step(deadline) {
    for (; yy < y1 && !glowDone; yy++) {
      if (performance.now() > deadline) return false;
      for (var xx = x0; xx < x1; xx++) {
        var D = dens(xx * k, yy * k); if (D <= .002) continue;
        var t = Math.min(1, D), pi = (yy * gw + xx) * 4;
        d[pi] = c0[0] + (c1[0] - c0[0]) * t; d[pi + 1] = c0[1] + (c1[1] - c0[1]) * t; d[pi + 2] = c0[2] + (c1[2] - c0[2]) * t;
        d[pi + 3] = Math.min(255, D * 70);
      }
    }
    if (!glowDone) {
      glowDone = true; gx.putImageData(img, 0, 0);
      x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(g, 0, 0, gw * k, gh * k);
    }
    /* the specks: more, and a little brighter, where the band is dense */
    for (; n < 9000 && tries < 70000; tries++) {
      if ((tries & 63) === 0 && performance.now() > deadline) return false;
      var su = R() * L, i2 = 0; while (i2 < segs - 1 && len[i2 + 1] < su) i2++;
      var p0 = pts[i2], p1 = pts[i2 + 1], sl = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), tt = (su - len[i2]) / sl,
          nx = -(p1[1] - p0[1]) / sl, ny = (p1[0] - p0[0]) / sl, sv = gauss(R) * sigma(su, R() - .5) * 1.25;
      var px = p0[0] + (p1[0] - p0[0]) * tt + nx * sv, py = p0[1] + (p1[1] - p0[1]) * tt + ny * sv;
      if (px < -2 || py < -2 || px > W + 2 || py > H + 2) continue;
      var Dn = dens(px, py); if (R() > Math.min(1, Dn * 1.1)) continue;
      var b = Math.pow(R(), 3.4), a = (.035 + b * .26) * Math.min(1, .35 + Dn);
      x.fillStyle = 'rgba(' + cols[Math.floor(R() * 3)] + ',' + a.toFixed(3) + ')';
      var sz = .45 + b * .7; x.fillRect(px, py, sz, sz); n++;
    }
    return true;
    };
  }

  /* far-off galaxies: a soft glow, two faint spiral arms on the spirals, a pin-point core */
  function galaxies(x) {
    var shape = [[8, -.5, 1], [6, .7, 0], [9, -.9, 1]], placed = [];
    CFG.galaxies.forEach(function (gp, gi) {
      var sp = shape[gi % 3], gx = gp[0] * W, gy = gp[1] * H, R = rnd(8 + gi), rad = sp[0];
      placed.push([Math.round(gx), Math.round(gy)]);
      x.save(); x.translate(gx, gy); x.rotate(sp[1]); x.scale(1, sp[2] ? .42 : .6);
      var g = x.createRadialGradient(0, 0, 0, 0, 0, rad * 1.6); g.addColorStop(0, 'rgba(255,236,214,.34)'); g.addColorStop(.2, 'rgba(255,214,170,.12)'); g.addColorStop(1, 'rgba(242,154,85,0)');
      x.fillStyle = g; x.beginPath(); x.arc(0, 0, rad * 1.6, 0, 6.2832); x.fill();
      if (sp[2]) for (var arm = 0; arm < 2; arm++) for (var t = 0; t < 1; t += .014) {
        var an = arm * Math.PI + t * 7.2, rr = rad * (.18 + t * 1.25);
        x.fillStyle = 'rgba(255,226,196,' + (.18 * (1 - t)).toFixed(3) + ')'; x.fillRect(Math.cos(an) * rr + (R() - .5), Math.sin(an) * rr + (R() - .5), 1, 1);
      }
      x.fillStyle = 'rgba(255,248,236,.6)'; x.beginPath(); x.arc(0, 0, .8, 0, 6.2832); x.fill();
      x.restore();
    });
    window.WF_galaxies = placed;                                    // orbits6.js keeps its stars off these
    window.WF_starAdd = CFG.add; window.WF_starHide = CFG.hide;     // bright stars placed by hand / stars taken out by hand
  }

  /* the Milky Way waits until the hero has been on screen for REVEAL seconds, then fills in from the top down, once */
  var seen = 0, shown = false, io = null, jobs = 0, liveBand = null;
  function reveal(cb) {
    if (NOW) { cb.classList.add('sp-wipe', 'sp-in'); return; }    // (v64 preview) show it straight away for review
    if (shown) { cb.classList.add('sp-wipe', 'sp-in'); return; }
    cb.classList.add('sp-wipe');
    if (io) return;
    var on = false, last = performance.now();
    io = new IntersectionObserver(function (es) { on = es[es.length - 1].intersectionRatio > .35; last = performance.now(); }, {threshold: [0, .35, 1]});
    io.observe(sky);
    (function tick() {
      var now = performance.now(); if (on && !document.hidden) seen += (now - last) / 1000; last = now;
      if (seen >= REVEAL) { shown = true; [].forEach.call(sky.querySelectorAll('.sp-band'), function (b) { b.classList.add('sp-in'); }); return; }
      setTimeout(tick, 500);
    })();
  }
  function build() {
    /* (v64 round 6) the old Milky Way stays up until the new one is finished, so it never vanishes while you resize:
       drawing a new one takes a few seconds of idle time. The other layers draw at once, so they are swapped straight away. */
    /* a first Milky Way still drawing (on screen, half done) also stays until the new one is finished */
    if (!liveBand) liveBand = [].filter.call(sky.querySelectorAll('.sp-band'), function (e) { return e.style.visibility !== 'hidden'; })[0] || null;
    [].slice.call(sky.querySelectorAll('.sp-layer')).forEach(function (e) { if (e !== liveBand) e.remove(); });   // unfinished hidden ones go
    var S = sky.getBoundingClientRect(); W = S.width; H = S.height;
    window.WF_bandDens = null;
    var cb = layer('sp-band'), job = ++jobs, bx = ctxFor(cb, W, H), step;
    if (MW === '0') step = PHONE ? milkyWay(bx, [.98, -.04], [.62, .36], [-.06, .62], .5) : milkyWay(bx, [.36, -.06], [.176, .459], [-.045, .6], .5);
    else if (PHONE || HB === '0') step = PHONE ? milkyWay2(bx, [[[.98, -.04], [.62, .36], [-.06, .62]]], .5, MW) : milkyWay2(bx, [[[.36, -.06], [.176, .459], [-.045, .6]]], .5, MW);
    else {
      /* (v64 round 3) the band passes faintly behind the headline (html data-gx):
         arm  = Zaid's curve as it is, plus a fainter, thinner stretch that leaves its top and runs right behind the headline
         arch = the band itself bends round and carries on behind the headline to the top right, dimmed there */
      var hl = document.querySelector('.hx .hx-copy') || document.querySelector('.hx h1'),   // round 5: the whole copy block, not just the headline
          hr = hl ? hl.getBoundingClientRect() : null, sr = sky.getBoundingClientRect(),
          hx = hr ? (hr.left + hr.right) / 2 - sr.left : W * .5, hy = hr ? (hr.top + hr.bottom) / 2 - sr.top : H * .25,
          hw = hr ? hr.width * .46 : W * .2, hh = hr ? hr.height * .62 : H * .2;   // round 9: narrower, so the stretch left of the text keeps its light
      /* (v64 round 4) and dimmed to 30% behind the orbit, so the rings and planets read in front of it */
      var od = window.WF_orbitDisc && window.WF_orbitDisc(), oc = od ? Math.cos(od.tilt) : 1, os = od ? Math.sin(od.tilt) : 0;
      var disc = function (px, py) { if (!od) return 1; var dx = px - od.x, dy = py - od.y, u = (dx * oc + dy * os) / (od.rx * 1.06), v = (-dx * os + dy * oc) / (od.ry * 1.25);
        return 1 - .7 * (1 - ss(.75, 1.2, u * u + v * v)); };
      var behind = function (k) { return function (px, py) { var dx = (px - hx) / hw, dy = (py - hy) / hh; return (1 - k * Math.exp(-(dx * dx + dy * dy))) * disc(px, py); }; };
      if (HB === 'arch') step = milkyWay2(bx, [[[-.045, .6], [.11, .33], [.42, .2]], [[.42, .2], [.73, .07], [1.06, .03]]], .5, MW, {fade: behind(.75), wid: .74, boost: [.24, .09, .7, .35]});   // round 9: fills the thin, empty stretch on the left   // round 4: narrower on the left (bulge moved to the middle)
      else {
        var s1 = milkyWay2(bx, [[[.36, -.06], [.176, .459], [-.045, .6]]], .5, MW),
            s2 = milkyWay2(bx, [[[.27, .17], [.5, .34], [1.06, .13]]], .45, 'a', {amp: .85, wid: .72, fade: behind(.3)}), one = false;
        step = function (dl) { if (!one) { if (!s1(dl)) return false; one = true; } return s2(dl); };
      }
    }
    if (liveBand) cb.style.visibility = 'hidden';
    (function slice() {                                             // ~8ms at a time, in idle time where the browser offers it
      if (job !== jobs) return;                                     // a newer build (resize) took over (and removed this one)
      if (step(performance.now() + 8)) {
        if (liveBand && liveBand !== cb) liveBand.remove(); liveBand = cb; cb.style.visibility = ''; return;
      }
      if (window.requestIdleCallback) requestIdleCallback(slice, {timeout: 60}); else setTimeout(slice, 16);
    })();
    reveal(cb);
    var c = layer('sp-deep'); galaxies(ctxFor(c, W, H));
    sky.insertBefore(cb, sky.firstChild);                           // the Milky Way is the back-most layer
    if (liveBand) sky.insertBefore(liveBand, sky.firstChild);       // the finished one behind it until the new one is done
    if (window.WF_restars && !window.WF_skyWait) window.WF_restars();
  }
  /* draw once the page has settled (fonts in, hero at its final size); orbits6.js holds its stars back until then */
  window.WF_skyWait = true;
  var lastW = 0, lastH = 0, tm, started = false;
  function start() {
    if (started) return; started = true;
    requestAnimationFrame(function () { build(); lastW = W; lastH = H; window.WF_skyWait = false; if (window.WF_restars) window.WF_restars(); });
  }
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(start);
  setTimeout(start, 2500);                                          // never wait longer than this
  addEventListener('resize', function () { clearTimeout(tm); tm = setTimeout(function () {
    if (!started) return; var r = sky.getBoundingClientRect();
    if (Math.abs(r.width - lastW) > 6 || Math.abs(r.height - lastH) > 6) { lastW = r.width; lastH = r.height; build(); } }, 250); });
})();
