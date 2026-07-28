/* WayfinderGEO — nav, accordion, reveal, form */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------- mobile nav */
  var toggle = document.querySelector('.nav-toggle');
  var menu = document.getElementById('mobile-menu');

  function closeMenu() {
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-expanded', 'false');
    menu.hidden = true;
  }

  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      menu.hidden = open;
    });

    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeMenu();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        closeMenu();
        toggle.focus();
      }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 1080) closeMenu();
    });
  }

  /* ------------------------------------------------------ steps accordion */
  var steps = Array.prototype.slice.call(document.querySelectorAll('.step'));

  steps.forEach(function (step) {
    var head = step.querySelector('.step-head');
    var body = step.querySelector('.step-body');
    if (!head || !body) return;

    head.addEventListener('click', function () {
      var isOpen = step.classList.contains('is-open');

      steps.forEach(function (other) {
        other.classList.remove('is-open');
        other.querySelector('.step-head').setAttribute('aria-expanded', 'false');
        other.querySelector('.step-body').hidden = true;
      });

      if (!isOpen) {
        step.classList.add('is-open');
        head.setAttribute('aria-expanded', 'true');
        body.hidden = false;
      }
    });
  });

  /* ------------------------------------------------------------- reveal */
  if (!reduce && 'IntersectionObserver' in window) {
    /* Below-the-fold only. The hero is the LCP element — fading it in would
       delay first meaningful paint by up to a second for no design gain. */
    var targets = document.querySelectorAll(
      '.split-copy > .eyebrow, .split-copy > .h2, .split-copy > .lead, ' +
      '.market-head, .services-head, .voices-head, .pricing-head, .faq-head, .contact-copy > *'
    );

    /* Stagger by position within the parent, not by IntersectionObserver batch
       order — batches are arbitrary and produced inconsistent delays. */
    targets.forEach(function (el) {
      el.classList.add('reveal');
      var siblings = Array.prototype.filter.call(
        el.parentNode.children,
        function (n) { return n.classList.contains('reveal'); }
      );
      el.style.transitionDelay = Math.min(siblings.indexOf(el), 4) * 70 + 'ms';
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });

    targets.forEach(function (el) { io.observe(el); });
  }

  /* -------------------------------------------------- testimonial photos */
  /* Monogram is the default. Drop a file at the data-photo path and it swaps
     itself in; if the file isn't there, nothing changes and nothing errors. */
  document.querySelectorAll('.avatar[data-photo]').forEach(function (slot) {
    var src = slot.getAttribute('data-photo');
    var probe = new Image();
    probe.onload = function () {
      var img = document.createElement('img');
      img.src = src;
      img.alt = '';
      slot.appendChild(img);
    };
    probe.src = src;
  });

  /* ---------------------------------------------------- testimonial slider */
  /* Slides are real HTML, so with JS off the track is still a plain scroller
     and every quote stays in the document for crawlers. */
  var vTrack = document.getElementById('v-track');

  if (vTrack) {
    var vSlides = Array.prototype.slice.call(vTrack.querySelectorAll('.v-slide'));
    var vDots   = Array.prototype.slice.call(document.querySelectorAll('.v-dot'));
    var vPrev   = document.getElementById('v-prev');
    var vNext   = document.getElementById('v-next');
    var vIndex  = 0;
    var vLock   = false;
    var vLockT;

    var paint = function () {
      vDots.forEach(function (d, n) { d.setAttribute('aria-current', String(n === vIndex)); });
      vPrev.disabled = vIndex === 0;
      vNext.disabled = vIndex === vSlides.length - 1;
    };

    var go = function (i) {
      vIndex = Math.max(0, Math.min(vSlides.length - 1, i));
      vLock = true;
      clearTimeout(vLockT);
      vTrack.scrollTo({
        left: vIndex * vTrack.clientWidth,
        behavior: reduce ? 'auto' : 'smooth'
      });
      paint();
      vLockT = setTimeout(function () { vLock = false; }, reduce ? 60 : 700);
    };

    /* Observe slides instead of reading scrollLeft: snap re-settles on any
       reflow, which makes a debounced scroll handler report the wrong slide. */
    if ('IntersectionObserver' in window) {
      var vIO = new IntersectionObserver(function (entries) {
        if (vLock) return;
        entries.forEach(function (e) {
          if (e.isIntersecting && e.intersectionRatio > 0.6) {
            vIndex = Number(e.target.dataset.i);
            paint();
          }
        });
      }, { root: vTrack, threshold: 0.61 });
      vSlides.forEach(function (s) { vIO.observe(s); });
    }

    vDots.forEach(function (d) {
      d.addEventListener('click', function () { go(Number(d.dataset.i)); });
    });
    vPrev.addEventListener('click', function () { go(vIndex - 1); });
    vNext.addEventListener('click', function () { go(vIndex + 1); });
    vTrack.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(vIndex + 1); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); go(vIndex - 1); }
    });
    window.addEventListener('resize', function () {
      vTrack.scrollLeft = vIndex * vTrack.clientWidth;
    });

    paint();
  }

  /* ---------------------------------------------------------- scroll spy */
  /* Long single-page site: mark which section the reader is actually in. */
  var navLinks = Array.prototype.slice.call(
    document.querySelectorAll('.nav-links a[href^="#"]')
  );
  var sections = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  if (sections.length && 'IntersectionObserver' in window) {
    var visible = new Set();

    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      });

      var current = sections.filter(function (s) { return visible.has(s); })[0];

      navLinks.forEach(function (a) {
        var match = current && a.getAttribute('href') === '#' + current.id;
        a.classList.toggle('is-current', !!match);
        if (match) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    }, { rootMargin: '-45% 0px -45% 0px' });

    sections.forEach(function (s) { spy.observe(s); });
  }

  /* --------------------------------------------------------------- form */
  /* No backend on a static host. This composes a pre-filled email so the
     form works out of the box. Swap for a real endpoint (Formspree, Basin,
     Netlify Forms) by giving the <form> an action + method and deleting this. */
  var form = document.getElementById('audit-form');

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      if (!form.reportValidity()) return;

      var data = new FormData(form);
      var get = function (k) { return (data.get(k) || '').toString().trim(); };

      var body = [
        'Name: ' + get('name'),
        'Work email: ' + get('email'),
        'Website: ' + get('website'),
        'Interested in: ' + get('plan'),
        '',
        'What they want to fix:',
        get('message') || '(not specified)'
      ].join('\n');

      var href =
        'mailto:hello@wayfindergeo.com' +
        '?subject=' + encodeURIComponent('Free AI visibility audit — ' + (get('website') || get('name'))) +
        '&body=' + encodeURIComponent(body);

      window.location.href = href;

      var note = form.querySelector('.form-sent');
      if (!note) {
        note = document.createElement('p');
        note.className = 'form-sent';
        note.setAttribute('role', 'status');
        form.appendChild(note);
      }
      note.textContent =
        'Opening your email client with the details filled in. If nothing happens, ' +
        'write to hello@wayfindergeo.com directly.';
    });
  }
})();
