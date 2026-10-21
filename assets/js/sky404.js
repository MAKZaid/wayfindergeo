/* 404 page Milky Way (21 Oct 2026). After 90 seconds on the page a bold Milky Way rises from the bottom of the screen,
   modelled on a long-exposure photo Zaid shared: a bright golden core, heavy dark dust lanes, pinkish-red nebula patches
   and a dense field of stars, fading out to a faint haze. Drawn behind the page's own stars and text, in small slices in
   idle time (it isn't shown for 90 seconds anyway). The scattered bright stars are drawn first, on their own layer, so
   they're there from the start. Reduced motion: appears without the sweep. */
(function () {
  var host = document.querySelector('.sky'); if (!host) return;
  var WAIT = 90;
  var cv = document.createElement('canvas'); cv.className = 'mw'; cv.setAttribute('aria-hidden', 'true');
  host.insertBefore(cv, host.firstChild);
  function rnd(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
  function gauss(R) { var u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * v); }
  function noise(seed) {
    function h(i, j) { var n = Math.sin(i * 127.1 + j * 311.7 + seed * 74.7) * 43758.5453; return n - Math.floor(n); }
    function sm(t) { return t * t * (3 - 2 * t); }
    function v(x, y) { var i = Math.floor(x), j = Math.floor(y), fx = sm(x - i), fy = sm(y - j);
      return h(i, j) * (1 - fx) * (1 - fy) + h(i + 1, j) * fx * (1 - fy) + h(i, j + 1) * (1 - fx) * fy + h(i + 1, j + 1) * fx * fy; }
    return function (x, y) { return (v(x, y) * .55 + v(x * 2.1, y * 2.1) * .3 + v(x * 4.3, y * 4.3) * .15); };
  }

  function build() {
    var hb = host.getBoundingClientRect(), W = Math.max(hb.width, innerWidth), H = Math.max(hb.height, innerHeight, screen.height || 0), dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    var x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0);
    /* the path: on the right of the page, rising from just below the bottom and leaning up and to the left, bent */
    var ph = W < 700 ? .17 : 0, A = [.92 + ph, 1.08], C = [.8 + ph, .55], B = [.69 + ph, -.1], mid = .34, segs = 72, pts = [], len = [0];
    for (var i = 0; i <= segs; i++) { var t = i / segs, a = (1 - t) * (1 - t), b = 2 * t * (1 - t), c = t * t;
      pts.push([(a * A[0] + b * C[0] + c * B[0]) * W, (a * A[1] + b * C[1] + c * B[1]) * H]);
      if (i) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); }
    var L = len[segs], s0 = (W < 700 ? Math.max(40, W * .13) : Math.max(70, Math.min(W, H) * .11)) * .68, clump = noise(3), dust = noise(11), wob = noise(29), edge = noise(41), neb = noise(53), R = rnd(23);
    function sigma(u, side) { var f = u / L, bulge = .55 + 1.05 * Math.exp(-Math.pow((f - mid) / .22, 2));
      return s0 * bulge * (.8 + .4 * wob(f * 4, side > 0 ? 1.7 : 4.2)) * (side > 0 ? 1.15 : .88); }
    function proj(px, py) { var best = 1e18, bu = 0, bv = 0;
      for (var i = 0; i < segs; i++) { var p = pts[i], q = pts[i + 1], sx = q[0] - p[0], sy = q[1] - p[1], l2 = sx * sx + sy * sy,
          t = Math.max(0, Math.min(1, ((px - p[0]) * sx + (py - p[1]) * sy) / l2)), cx = p[0] + sx * t, cy = p[1] + sy * t, d2 = (px - cx) * (px - cx) + (py - cy) * (py - cy);
        if (d2 < best) { best = d2; bu = len[i] + Math.sqrt(l2) * t; bv = ((px - p[0]) * sy - (py - p[1]) * sx) / Math.sqrt(l2); } }
      return [bu, bv]; }
    /* light (before dust) and dust (0 clear .. 1 black) at a point, plus how "core" it is and how much nebula */
    function at(px, py) {
      var uv = proj(px, py), u = uv[0], v = uv[1], sg = sigma(u, v), r = Math.abs(v) / sg;
      if (r > 3.4) return null;
      var f = u / L, ends = Math.min(1, u / (L * .06), (L - u) / (L * .14)); if (ends <= 0) return null;
      var coreness = Math.exp(-Math.pow((f - mid) / .085, 2)) * Math.exp(-r * r * 2.2);
      var rag = Math.max(0, Math.min(1, 1.7 - r + 1 * (edge(u / 45, v / 32) - .5)));
      /* star clouds: broad, soft and stretched along the band (not blobs) */
      var light = Math.exp(-r * r * .85) * (.5 + 1.1 * Math.pow(clump(u / 140, v / 60), 1.2)) * rag * ends + coreness * 1.35;
      /* dust: a winding main rift plus branching lanes, ragged, strongest through the middle */
      var rc = sg * (.15 * Math.sin(u / 120) + .1 * Math.sin(u / 47)), rw = sg * (.22 + .1 * dust(u / 200, 2.2));
      var d1 = Math.exp(-Math.pow((v - rc) / rw, 2)) * (.55 + .45 * dust(u / 170, v / 60 + 1.3));
      var l1 = rc + sg * (.55 + .3 * Math.sin(u / 160)), l2 = rc - sg * (.6 + .25 * Math.cos(u / 130));
      var d2 = Math.exp(-Math.pow((v - l1) / (sg * .12), 2)) * dust(u / 150, v / 50 + 4.1), d3 = Math.exp(-Math.pow((v - l2) / (sg * .1), 2)) * dust(u / 160, v / 50 + 7.3);
      /* fine dust filaments: thin dark streaks running along the band (ridged noise, stretched along it), as in photos */
      var fil = 1 - Math.abs(2 * dust(u / 300, v / 55 + 5) - 1), patch = Math.max(0, clump(u / 300, v / 120 + 7) - .45) * 2.2;
      var streaks = Math.pow(fil, 5) * .38 * Math.min(1, patch) * Math.exp(-Math.pow((v - rc) / (sg * .9), 2));
      var d = Math.min(.9, d1 * .85 + d2 * .55 + d3 * .45 + streaks);
      var nb = Math.max(0, neb(u / 150, v / 100 + 3) - .42) * 2.2 * Math.exp(-Math.pow((r - 1.2) / 1.3, 2)) * (f < .65 ? 1 : .45);
      return {light: Math.max(0, light), dust: d, core: coreness, neb: nb, r: r};
    }
    window.WF_404dens = function (px, py) { var a = at(px, py); return a ? a.light * (1 - a.dust) : 0; };
    /* colours: haze from a cool grey-violet at the edges, through the site's orange, to a pale gold core; nebula in rose */
    var EDGE = [120, 78, 74], MIDC = [226, 128, 62], CORE = [255, 200, 140], NEB = [196, 78, 88];
    var k = 2, gw = Math.ceil(W / k), gh = Math.ceil(H / k), g = document.createElement('canvas'); g.width = gw; g.height = gh;
    var gx = g.getContext('2d'), img = gx.createImageData(gw, gh), D = img.data, yy = 0, glowDone = false, n = 0, tries = 0, bright = false;
    function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
    return function step(deadline) {
      if (!bright) { bright = true;
        var sc = document.querySelector('.sky .stars-bright'); if (!sc) { sc = document.createElement('canvas'); sc.className = 'stars-bright'; sc.setAttribute('aria-hidden', 'true'); host.appendChild(sc); }
        sc.width = cv.width; sc.height = cv.height; var x2 = sc.getContext('2d'); x2.setTransform(dpr, 0, 0, dpr, 0, 0);
        (function (x) {
        for (var bi = 0; bi < Math.round(W * H / 70000); bi++) {
          var bx = R() * W, by = R() * H, br = 1.2 + R() * 1.6, warmS = R() < .5;
          var gg = x.createRadialGradient(bx, by, 0, bx, by, br * 2.6);
          gg.addColorStop(0, warmS ? 'rgba(255,236,214,.9)' : 'rgba(236,240,255,.9)'); gg.addColorStop(.35, warmS ? 'rgba(255,214,170,.22)' : 'rgba(200,210,255,.2)'); gg.addColorStop(1, 'rgba(0,0,0,0)');
          x.fillStyle = gg; x.beginPath(); x.arc(bx, by, br * 2.6, 0, 6.2832); x.fill();
        }
        })(x2);
      }
      for (; yy < gh && !glowDone; yy++) {
        if (performance.now() > deadline) return false;
        for (var xx = 0; xx < gw; xx++) {
          var p = at(xx * k, yy * k); if (!p) continue;
          var lit = p.light * (1 - p.dust); if (lit <= .003 && p.neb <= .01) continue;
          var warm = Math.min(1, lit * 2.6), c = warm < .4 ? mix(EDGE, MIDC, warm / .4) : mix(MIDC, CORE, (warm - .4) / .6);
          c = mix(c, [255, 222, 170], Math.min(.6, p.core * .8));   // the very centre burns pale gold
          var nbA = p.neb * (1 - p.dust * .5) * .9, o = (yy * gw + xx) * 4;
          var col = nbA > 0 ? mix(c, NEB, Math.min(.85, nbA / (lit + nbA + .001))) : c;
          D[o] = col[0]; D[o + 1] = col[1]; D[o + 2] = col[2]; D[o + 3] = Math.min(255, lit * 82 + p.core * 150 + nbA * 70);
        }
      }
      if (!glowDone) { glowDone = true; gx.putImageData(img, 0, 0); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(g, 0, 0, gw * k, gh * k); }
      /* stars: a dense field that thickens in the band, brightest and whitest at the core */
      var area = W * H, want = Math.round(area / 6);
      for (; n < want && tries < want * 6; tries++) {
        if ((tries & 63) === 0 && performance.now() > deadline) return false;
        var su = R() * L, i2 = 0; while (i2 < segs - 1 && len[i2 + 1] < su) i2++;
        var p0 = pts[i2], p1 = pts[i2 + 1], sl = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), tt = (su - len[i2]) / sl,
            nx = -(p1[1] - p0[1]) / sl, ny = (p1[0] - p0[0]) / sl, sv = gauss(R) * sigma(su, R() - .5) * 1.6;
        var px = p0[0] + (p1[0] - p0[0]) * tt + nx * sv, py = p0[1] + (p1[1] - p0[1]) * tt + ny * sv;
        if (px < -2 || py < -2 || px > W + 2 || py > H + 2) continue;
        var q = at(px, py); if (!q) continue;
        var dens = q.light * (1 - q.dust * .95); if (R() > Math.min(1, dens * .9 + .015)) continue;
        var bb = Math.pow(R(), 4.5), a = (.12 + bb * .75) * Math.min(1, .3 + dens * .9) * (1 - q.dust * .9);
        var white = q.core > .3 || bb > .7;
        x.fillStyle = 'rgba(' + (white ? '255,248,236' : R() < .5 ? '255,226,196' : '236,232,246') + ',' + a.toFixed(3) + ')';
        var sz = .35 + bb * 1.1; x.fillRect(px, py, sz, sz); n++;
      }
      return true;
    };
  }

  var job = 0, shown = false;
  function render() {
    var step = build(), me = ++job;
    (function slice() {
      if (me !== job) return;
      if (step(performance.now() + 8)) return;
      if (window.requestIdleCallback) requestIdleCallback(slice, {timeout: 500}); else setTimeout(slice, 16);
    })();
  }
  render();
  var seen = 0, last = performance.now();
  (function tick() {                                   // only counts while the tab is visible
    var now = performance.now(); if (!document.hidden) seen += (now - last) / 1000; last = now;
    if (seen >= WAIT) { shown = true; cv.classList.add('in'); return; }
    setTimeout(tick, 500);
  })();
  var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(render, 250); });
})();
