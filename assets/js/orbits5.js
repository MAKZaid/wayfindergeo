/* Orbits (v8): thin ellipses circling the north star, a few signals travelling along them, a
   field of faint stars, and a rare, faint shooting star (one every 10-25 seconds, in one of five spots). Colours come only from the site tokens and the logo:
   ember #D0631C, flame #C2521A, star glow #F29A55, halo #FFE2C4, paper #FFFDF8, sand #F4E8D3.
   v6 changes: the canvas re-measures whenever its box or the star moves (so it can never be
   stretched), and the rings precess gently instead of visibly bobbing up and down.
   Canvas 2D, paused off screen or in a background tab, lower resolution on small screens. */
(function () {
  var cv = document.getElementById('orbits'); if (!cv) return;
  var ctx = cv.getContext('2d'), box = cv.parentElement, focus = document.getElementById('focus');
  var dark = cv.dataset.theme === 'dark';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W, H, cx, cy, dpr, N, run = true, t0 = performance.now(), stars = [], sig = [];
  var meteor = null, nextMeteor = 6 + Math.random() * 6;       // first one 6-12s after load
  var LINE = dark ? '242,154,85' : '208,99,28';          // star glow on dark, ember on light
  var HEAD = dark ? '255,226,196' : '194,82,26';          // halo on dark, flame on light
  var TAIL = '242,154,85';
  function seedRand(s) { return function () { s = s * 16807 % 2147483647; return (s - 1) / 2147483646; }; }
  function size() {
    var r = box.getBoundingClientRect(); W = r.width; H = r.height;
    dpr = Math.min(W < 700 ? 1.5 : 2, devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var f = focus.getBoundingClientRect(); cx = f.left - r.left + f.width / 2; cy = f.top - r.top + f.height / 2;
    N = W < 700 ? 20 : 30;
    var R = seedRand(9); sig = [];
    for (var i = 0; i < (W < 700 ? 4 : 6); i++) sig.push({ k: 3 + Math.floor(R() * (N - 4)), p: R(), v: .03 + R() * .035 });
    stars = [];
    if (dark) {
      var n = Math.round(W * H / (W < 700 ? 5200 : 7000));
      for (var j = 0; j < n; j++) stars.push({ x: R() * W, y: R() * H, r: [.6, .8, 1, 1.2][Math.floor(R() * 4)], o: .15 + R() * .45, c: R() < .75 ? '255,253,248' : '244,232,211', tw: R() < .3 ? R() * 6.28 : -1 });
    }
  }
  function ell(i, t) {
    var k = i / (N - 1), reach = Math.min(W * (W < 700 ? .62 : .5), 760);
    var rx = (W < 700 ? 70 : 100) + k * reach;
    var ry = rx * (.19 + .012 * Math.sin(t * .12 + i * .3));              // was ±.05: read as bobbing
    var tilt = (-.14 + k * .09) + .012 * Math.sin(t * .1 + i * .21);      // was ±.045
    return { rx: rx, ry: ry, tilt: tilt, k: k };
  }
  function pt(e, a) { var x = e.rx * Math.cos(a), y = e.ry * Math.sin(a), c = Math.cos(e.tilt), s = Math.sin(e.tilt); return [cx + x * c - y * s, cy + x * s + y * c]; }
  function frame(now) {
    if (!run) return;
    var t = (now - t0) / 1000; ctx.clearRect(0, 0, W, H);
    for (var s = 0; s < stars.length; s++) {
      var st = stars[s], o = st.o * (st.tw < 0 ? 1 : .55 + .45 * Math.sin(t * 1.3 + st.tw));
      ctx.fillStyle = 'rgba(' + st.c + ',' + o.toFixed(3) + ')'; ctx.fillRect(st.x, st.y, st.r, st.r);
    }
    if (dark) drawMeteor(t);
    for (var i = 0; i < N; i++) {
      var e = ell(i, t); ctx.beginPath(); ctx.ellipse(cx, cy, e.rx, e.ry, e.tilt, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(' + LINE + ',' + ((dark ? .34 : .26) - e.k * (dark ? .26 : .2)).toFixed(3) + ')';
      ctx.lineWidth = 1; ctx.stroke();
    }
    sig.forEach(function (g) {
      var e = ell(g.k, t); g.p = (g.p + g.v / 60) % 1;
      for (var j = 0; j < 14; j++) {
        var q = pt(e, (g.p - j * .006) * Math.PI * 2);
        ctx.beginPath(); ctx.arc(q[0], q[1], j === 0 ? 2.1 : 1.5 * (1 - j / 14), 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + (j === 0 ? HEAD : TAIL) + ',' + (1 - j / 14).toFixed(2) + ')'; ctx.fill();
      }
    });
    if (!reduce) requestAnimationFrame(frame);
  }
  /* Shooting star: one at a time, every 10-25s (unchanged). Five places it can appear, never the same
     one twice in a row, each heading away from the headline and the card:
       0 upper-left sky, falling down-left     1 upper-right sky, falling down-right
       2 high above the headline, crossing left   3 beside the orbits on the left, falling down-left
       4 beside the orbits on the right, falling down-right
     x/y are shares of the sky; dir is -1 (left) or 1 (right); drop is degrees below horizontal. */
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
    meteor = { x: W * rr(Z.x), y: H * rr(Z.y), dx: Z.dir * Math.cos(drop) * dist, dy: Math.sin(drop) * dist, t0: t, dur: .9 + Math.random() * .35, tail: 90 + Math.random() * 60, zone: z };
  }
  function drawMeteor(t) {
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
  /* Re-measure when the box changes size or the star moves (fonts loading, copy changes, resizes).
     Batched to one measurement per frame. */
  var pending = false;
  function later() { if (pending) return; pending = true; requestAnimationFrame(function () { pending = false; size(); if (reduce) frame(performance.now()); }); }
  if ('ResizeObserver' in window) { var ro = new ResizeObserver(later); ro.observe(box); ro.observe(focus.parentElement); }
  addEventListener('resize', later);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(later);
  new IntersectionObserver(function (es) { if (es[0].isIntersecting) start(); else run = false; }).observe(box);
  document.addEventListener('visibilitychange', function () { if (document.hidden) run = false; else start(); });
})();
