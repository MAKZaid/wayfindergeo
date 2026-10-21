/* Footer sky (20 Oct 2026): hand-placed galaxies and bright stars, the same look as the hero's, placed by Zaid with the
   v59 editor. Positions are fractions of the footer box (0,0 top-left, 1,1 bottom-right). script.js keeps its faint stars
   off the galaxies and leaves out the ones in 'hide'. Desktop and phones each have their own layout (phones added 21 Oct). */
(function () {
  var foot = document.querySelector('.footer'); if (!foot) return;
  var PHONE = innerWidth <= 900;
  var FDESK = {galaxies: [[.046, .287], [.091, .62], [.933, .597], [.017, .833]],
    add: [[.8, .619], [.044, .516], [.079, .717], [.166, .659], [.92, .707], [.702, .589], [.023, .217], [.768, .545], [.786, .298],
      [.306, .714], [.714, .749], [.392, .58], [.908, .2], [.941, .048], [.026, .114], [.093, .053], [.353, .521]],
    hide: [[.924, .531], [.501, .439], [.352, .469], [.441, .516], [.578, .495], [.592, .499], [.682, .44], [.246, .414], [.407, .415],
      [.387, .397], [.56, .402], [.693, .386], [.898, .323]]};
  var FC = PHONE ? {galaxies: [], add: [[.097, .06], [.905, .102], [.362, .094], [.136, .809], [.864, .817]], hide: []} : FDESK;   // phone: Zaid, 21 Oct
  window.WF_footCfg = FC;
  function rnd(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
  var cv = document.createElement('canvas'); cv.className = 'foot-sky'; cv.setAttribute('aria-hidden', 'true');
  function galaxy(x, gx, gy, i) {                      // the hero's galaxy drawing (space.js), same sizes and tilts
    var p = [[8, -.5, 1], [6, .7, 0], [9, -.9, 1]][i % 3], rad = p[0], R = rnd(8 + i);
    x.save(); x.translate(gx, gy); x.rotate(p[1]); x.scale(1, p[2] ? .42 : .6);
    var g = x.createRadialGradient(0, 0, 0, 0, 0, rad * 1.6); g.addColorStop(0, 'rgba(255,236,214,.34)'); g.addColorStop(.2, 'rgba(255,214,170,.12)'); g.addColorStop(1, 'rgba(242,154,85,0)');
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, rad * 1.6, 0, 6.2832); x.fill();
    if (p[2]) for (var arm = 0; arm < 2; arm++) for (var t = 0; t < 1; t += .014) {
      var an = arm * Math.PI + t * 7.2, rr = rad * (.18 + t * 1.25);
      x.fillStyle = 'rgba(255,226,196,' + (.18 * (1 - t)).toFixed(3) + ')'; x.fillRect(Math.cos(an) * rr + (R() - .5), Math.sin(an) * rr + (R() - .5), 1, 1);
    }
    x.fillStyle = 'rgba(255,248,236,.6)'; x.beginPath(); x.arc(0, 0, .8, 0, 6.2832); x.fill();
    x.restore();
  }
  function small(x, sx, sy) {                           // phone, top half of the footer: a small faint star, not a bright one
    x.fillStyle = 'rgba(255,250,242,.55)'; x.beginPath(); x.arc(sx, sy, 1, 0, 6.2832); x.fill();
  }
  function star(x, sx, sy) {                            // a bright star like the hero's brightest: soft point + hair-thin spikes (21 Oct: smaller)
    var g = x.createRadialGradient(sx, sy, 0, sx, sy, 4); g.addColorStop(0, 'rgba(255,250,242,.9)'); g.addColorStop(.3, 'rgba(255,236,214,.35)'); g.addColorStop(1, 'rgba(255,226,196,0)');
    x.fillStyle = g; x.beginPath(); x.arc(sx, sy, 4, 0, 6.2832); x.fill();
    x.strokeStyle = 'rgba(255,250,242,.16)'; x.lineWidth = .5; x.beginPath();
    x.moveTo(sx - 3, sy); x.lineTo(sx + 3, sy); x.moveTo(sx, sy - 2.5); x.lineTo(sx, sy + 2.5); x.stroke();
  }
  /* (21 Oct) a few small, faint stars in the open sky around the big star above the Earth, kept clear of the big star and
     above the horizon (which curves from ~87% of the footer's height in the middle to ~97% at the sides) */
  function smallStars(x, W, H) {
    var R = rnd(31), made = 0, cx = .5 * W, cy = .643 * H;
    for (var tries = 0; made < 16 && tries < 400; tries++) {
      var fx = .02 + R() * .96, fy = .56 + R() * .32, b = R(), cl = R();
      var horizon = .87 + .1 * Math.pow(2 * fx - 1, 2) - .04;
      if (fy > horizon || Math.hypot(fx * W - cx, fy * H - cy) < 120) continue;
      x.fillStyle = 'rgba(' + (cl < .75 ? '255,250,242' : '244,201,158') + ',' + (.22 + b * .3).toFixed(2) + ')';
      x.beginPath(); x.arc(fx * W, fy * H, .5 + b * .6, 0, 6.2832); x.fill(); made++;
    }
  }
  function draw() {
    if (!cv.parentNode) { var fs = foot.querySelector('.footer-stars'); foot.insertBefore(cv, fs ? fs.nextSibling : foot.firstChild); }
    var r = foot.getBoundingClientRect(), W = r.width, H = r.height, d = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(W * d); cv.height = Math.round(H * d); cv.style.width = W + 'px'; cv.style.height = H + 'px';
    var x = cv.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0); x.clearRect(0, 0, W, H);
    FC.galaxies.forEach(function (g, i) { galaxy(x, g[0] * W, g[1] * H, i); });
    FC.add.forEach(function (a) { if (PHONE && a[1] < .5) small(x, a[0] * W, a[1] * H); else star(x, a[0] * W, a[1] * H); });
    smallStars(x, W, H);
  }
  var go = function () { draw(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(go);
  var t; addEventListener('resize', function () { clearTimeout(t); t = setTimeout(go, 200); });
})();
