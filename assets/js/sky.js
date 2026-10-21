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
  var seen = 0, shown = false, io = null, jobs = 0;
  function reveal(cb) {
    if (shown) { cb.classList.add('sp-wipe', 'sp-in'); return; }
    cb.classList.add('sp-wipe');
    if (io) return;
    var on = false, last = performance.now();
    io = new IntersectionObserver(function (es) { on = es[es.length - 1].intersectionRatio > .35; last = performance.now(); }, {threshold: [0, .35, 1]});
    io.observe(sky);
    (function tick() {
      var now = performance.now(); if (on && !document.hidden) seen += (now - last) / 1000; last = now;
      if (seen >= REVEAL) { shown = true; var b = sky.querySelector('.sp-band'); if (b) b.classList.add('sp-in'); return; }
      setTimeout(tick, 500);
    })();
  }
  function build() {
    [].slice.call(sky.querySelectorAll('.sp-layer')).forEach(function (e) { e.remove(); });
    var S = sky.getBoundingClientRect(); W = S.width; H = S.height;
    var cb = layer('sp-band'), step = (PHONE ? milkyWay(ctxFor(cb, W, H), [.98, -.04], [.62, .36], [-.06, .62], .5) : milkyWay(ctxFor(cb, W, H), [.36, -.06], [.176, .459], [-.045, .6], .5)), job = ++jobs;
    (function slice() {                                             // ~8ms at a time, in idle time where the browser offers it
      if (job !== jobs) return;                                     // a newer build (resize) took over
      if (step(performance.now() + 8)) return;
      if (window.requestIdleCallback) requestIdleCallback(slice, {timeout: 400}); else setTimeout(slice, 16);
    })();
    reveal(cb);
    var c = layer('sp-deep'); galaxies(ctxFor(c, W, H));
    sky.insertBefore(cb, sky.firstChild);                           // the Milky Way is the back-most layer
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
    if (Math.abs(r.width - lastW) > 40 || Math.abs(r.height - lastH) > 80) { lastW = r.width; lastH = r.height; build(); } }, 250); });
})();
