/* v64 hero remake (25 Oct 2026): one size for the whole orbit.
   The orbit is drawn for a 1720px-wide design and scaled as one piece. Its scale is
     S = min(1, width / 1720) x r
   where r (0..1) shrinks it further on short windows so the answer card fits in the first view. Rings, star, engines,
   trails and lines all take the same S, so the orbit keeps its exact shape at every size. r is worked out on every
   resize event, straight away (no waiting), so dragging the window resizes it smoothly.
   Size options (html data-size, preview switch):
     today  r = 1, nothing changes
     even   r shrinks as far as it needs to (down to 30%)
     floor  r shrinks, but never below 65%; below that the card's bottom goes under the fold
     ab     the card rises over the front of the rings by 22% of the orbit's height, then r shrinks as needed
   Desktop windows wider than 900px only. */
(function () {
  var root = document.documentElement, MODE = root.dataset.size || 'floor';
  var hero = document.querySelector('.hx.o5'), stage = document.getElementById('stage'), card = document.getElementById('card');
  window.WF_fit = { r: 1, S: 1, mode: MODE };
  if (!hero || !stage || !card || MODE === 'today') return;
  var OV = MODE === 'ab' ? .22 : 0, FLOOR = MODE === 'floor' ? .65 : .3, ROOM = 24;   // ROOM: space kept under the card
  function fit() {
    var W = innerWidth, f = window.WF_fit;
    if (W <= 900) { hero.style.removeProperty('--r'); hero.style.removeProperty('--ov'); f.r = 1; f.S = 1; return; }
    var h = hero.getBoundingClientRect(), s = stage.getBoundingClientRect();
    var top = s.top - h.top;                                           // the copy above the orbit: doesn't change with r
    var H0 = Math.min(262, Math.max(200, W * .18));                     // the stage's full height (same clamp as v2.css)
    var gap = Math.min(26, Math.max(12, W * .02));
    var r = (innerHeight - ROOM - top - gap - card.offsetHeight) / (H0 * (1 - OV));
    r = Math.max(FLOOR, Math.min(1, r));
    f.r = r; f.S = Math.min(1, W / 1720) * r;
    hero.style.setProperty('--r', r.toFixed(4)); hero.style.setProperty('--ov', OV);
  }
  window.WF_refit = fit;
  fit();
  /* (26 Oct) the stage and card stay hidden until the first frame after sizing (hx4.js refits in the same task), so they
     don't visibly jump into place on load: that jump was the page's main layout shift. hero-remake.css shows them anyway after 2s */
  requestAnimationFrame(function () { hero.classList.add('fit-ready'); });
  addEventListener('resize', fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
})();
