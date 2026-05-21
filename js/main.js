/* =========================================================
   SOUTHBURY HOMES — Scroll & Motion System
   Lenis smooth scroll + GSAP ScrollTrigger choreography.
   ========================================================= */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gsap = window.gsap;
  var lenis = null;
  var menuOpen = false;

  /* ---------------- Static utilities ---------------- */

  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  document.querySelectorAll('img').forEach(function (img) {
    img.addEventListener('error', function () { img.classList.add('img-failed'); });
  });

  var nav = document.getElementById('nav');
  function updateNav(y) {
    if (!nav) return;
    nav.classList.toggle('nav--solid', y > window.innerHeight * 0.72);
  }

  /* ---------------- Mobile menu ---------------- */
  var navToggle = document.getElementById('navToggle');
  var overlay = document.getElementById('navOverlay');

  function setMenu(open) {
    menuOpen = open;
    document.body.classList.toggle('menu-open', open);
    if (navToggle) {
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }
    if (overlay) overlay.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (lenis) { open ? lenis.stop() : lenis.start(); }
  }
  if (navToggle) navToggle.addEventListener('click', function () { setMenu(!menuOpen); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menuOpen) setMenu(false);
  });

  /* ---------------- Forms (styled, no backend) ---------------- */
  function wireForm(formId, msgId) {
    var form = document.getElementById(formId);
    var msg = document.getElementById(msgId);
    if (!form || !msg) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      msg.hidden = false;
      form.reset();
      if (gsap && !reduced) {
        gsap.fromTo(msg, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' });
      }
    });
  }
  wireForm('enquiryForm', 'formSuccess');
  wireForm('newsForm', 'newsMsg');

  /* =========================================================
     REDUCED-MOTION / NO-GSAP PATH — everything visible, static
     ========================================================= */
  if (reduced || !gsap || !window.ScrollTrigger || !window.Lenis) {
    var pre = document.getElementById('preloader');
    if (pre) pre.parentNode.removeChild(pre);

    updateNav(window.scrollY);
    window.addEventListener('scroll', function () { updateNav(window.scrollY); }, { passive: true });

    document.querySelectorAll('[data-scroll-link]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var id = link.getAttribute('href');
        if (!id || id.charAt(0) !== '#') return;
        var target = id === '#top' ? document.body : document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        if (menuOpen) setMenu(false);
        var top = id === '#top' ? 0 : target.getBoundingClientRect().top + window.scrollY - 78;
        window.scrollTo({ top: top, behavior: reduced ? 'auto' : 'smooth' });
      });
    });
    return;
  }

  /* =========================================================
     FULL MOTION PATH
     ========================================================= */
  gsap.registerPlugin(window.ScrollTrigger);
  var ScrollTrigger = window.ScrollTrigger;

  /* ---- Lenis smooth scroll ---- */
  lenis = new Lenis({
    duration: 1.2,
    easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
    smoothWheel: true,
    wheelMultiplier: 1
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);

  var progressBar = document.getElementById('scrollProgress');
  lenis.on('scroll', function (e) {
    updateNav(e.scroll);
    if (progressBar) {
      var p = e.limit > 0 ? e.scroll / e.limit : 0;
      progressBar.style.transform = 'scaleX(' + p + ')';
    }
  });

  /* ---- Smooth anchor links ---- */
  document.querySelectorAll('[data-scroll-link]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var id = link.getAttribute('href');
      if (!id || id.charAt(0) !== '#') return;
      var target = id === '#top' ? 0 : document.querySelector(id);
      if (id !== '#top' && !target) return;
      e.preventDefault();
      if (menuOpen) setMenu(false);
      lenis.scrollTo(target, { offset: id === '#top' ? 0 : -78, duration: 1.4 });
    });
  });

  /* ---- Line splitter (handles inline <em>) ---- */
  function splitLines(el) {
    var nodes = Array.prototype.slice.call(el.childNodes);
    var words = [];
    el.textContent = '';

    nodes.forEach(function (node) {
      var tag = node.nodeType === 1 ? node.tagName.toLowerCase() : null;
      var text = node.textContent;
      var parts = text.split(/(\s+)/);
      parts.forEach(function (part) {
        if (part === '') return;
        if (/^\s+$/.test(part)) {
          el.appendChild(document.createTextNode(' '));
        } else {
          var w = document.createElement(tag === 'em' || tag === 'i' ? tag : 'span');
          w.className = 'word';
          w.textContent = part;
          el.appendChild(w);
          words.push(w);
        }
      });
    });

    /* group words into lines by vertical position */
    var lines = [];
    var current = null;
    var lastTop = null;
    words.forEach(function (w) {
      var top = w.offsetTop;
      if (lastTop === null || Math.abs(top - lastTop) > 6) {
        current = [];
        lines.push(current);
        lastTop = top;
      }
      current.push(w);
    });

    /* rebuild with masked line wrappers */
    el.textContent = '';
    var inners = [];
    lines.forEach(function (lineWords) {
      var line = document.createElement('span');
      line.className = 'split-line';
      var inner = document.createElement('span');
      inner.className = 'split-line__in';
      lineWords.forEach(function (w, i) {
        inner.appendChild(w);
        if (i < lineWords.length - 1) inner.appendChild(document.createTextNode(' '));
      });
      line.appendChild(inner);
      el.appendChild(line);
      inners.push(inner);
    });
    return inners;
  }

  /* ---- Hero line wrapping (per-span masks) ---- */
  function wrapHeroLines() {
    document.querySelectorAll('.hero__title .line').forEach(function (line) {
      line.innerHTML = '<span class="line-inner">' + line.innerHTML + '</span>';
    });
  }

  /* ---- Hero intro ---- */
  function heroIntro() {
    var tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
    tl.to('.hero__title .line-inner', { yPercent: 0, duration: 1.2, stagger: 0.13 })
      .to('.hero .eyebrow', { opacity: 1, y: 0, duration: 0.9 }, 0.25)
      .to('.hero__sub', { opacity: 1, y: 0, duration: 0.9 }, 0.45)
      .to('.hero__actions', { opacity: 1, y: 0, duration: 0.9 }, 0.6)
      .to('.hero__scroll', { opacity: 1, duration: 0.8 }, 0.85);
  }

  /* ---- Build all scroll-driven scenes ---- */
  function buildScene() {
    /* hero initial states */
    wrapHeroLines();
    gsap.set('.hero__title .line-inner', { yPercent: 110 });
    gsap.set(['.hero .eyebrow', '.hero__sub', '.hero__actions'], { y: 24 });
    gsap.set('.hero__scroll', { opacity: 0 });

    /* headline line reveals */
    gsap.utils.toArray('[data-lines]').forEach(function (el) {
      var inners = splitLines(el);
      gsap.set(inners, { yPercent: 110 });
      gsap.to(inners, {
        yPercent: 0, duration: 1.0, ease: 'power3.out', stagger: 0.085,
        scrollTrigger: { trigger: el, start: 'top 87%' }
      });
    });

    /* fade-up reveals (excluding hero, handled by intro) */
    gsap.utils.toArray('[data-reveal]').forEach(function (el) {
      if (el.closest('.hero')) return;
      gsap.set(el, { y: 30 });
      gsap.to(el, {
        y: 0, opacity: 1, duration: 1.1, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 89%' }
      });
    });

    /* staggered groups */
    gsap.utils.toArray('[data-stagger]').forEach(function (group) {
      var items = group.querySelectorAll('[data-stagger-item]');
      if (!items.length) return;
      gsap.set(items, { y: 40 });
      gsap.to(items, {
        y: 0, opacity: 1, duration: 1.0, ease: 'power3.out', stagger: 0.1,
        scrollTrigger: { trigger: group, start: 'top 84%' }
      });
    });

    /* image clip reveals (+ scale on feature/leadership media) */
    gsap.utils.toArray('[data-img-reveal]').forEach(function (el) {
      var tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 86%' } });
      tl.to(el, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'power3.out' });
      if (el.matches('.feature__media, .leadership__media')) {
        var img = el.querySelector('img');
        if (img) {
          gsap.set(img, { scale: 1.3 });
          tl.to(img, { scale: 1, duration: 1.6, ease: 'power3.out' }, 0);
        }
      }
    });

    /* parallax on media images (symmetric, gap-free) */
    gsap.utils.toArray('[data-parallax]').forEach(function (img) {
      var speed = parseFloat(img.getAttribute('data-parallax-speed') || '9');
      var trigger = img.closest('.feature__media, .leadership__media, .break, section') || img;
      gsap.fromTo(img,
        { yPercent: -speed / 2 },
        {
          yPercent: speed / 2, ease: 'none',
          scrollTrigger: { trigger: trigger, start: 'top bottom', end: 'bottom top', scrub: 1 }
        });
    });

    /* hero parallax + fade on scroll */
    gsap.to('.hero__video', {
      yPercent: 8, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });
    gsap.to('.hero__content', {
      yPercent: -16, opacity: 0.25, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });
    gsap.to('.hero__scroll', {
      opacity: 0, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: '4% top', end: '16% top', scrub: true }
    });

    /* stat count-ups */
    gsap.utils.toArray('[data-count]').forEach(function (el) {
      var to = parseFloat(el.getAttribute('data-count-to')) || 0;
      var obj = { v: 0 };
      ScrollTrigger.create({
        trigger: el, start: 'top 90%', once: true,
        onEnter: function () {
          gsap.to(obj, {
            v: to, duration: 1.9, ease: 'power2.out',
            onUpdate: function () { el.textContent = Math.round(obj.v); }
          });
        }
      });
    });

    ScrollTrigger.refresh();
  }

  /* ---- Preloader ---- */
  function runPreloader() {
    var pre = document.getElementById('preloader');
    var fill = document.getElementById('preloaderFill');
    var countEl = document.getElementById('preloaderCount');
    var counter = { v: 0 };

    gsap.to(counter, {
      v: 100, duration: 1.5, ease: 'power1.inOut',
      onUpdate: function () {
        var v = Math.round(counter.v);
        if (countEl) countEl.textContent = v;
        if (fill) fill.style.width = v + '%';
      }
    });

    function exit() {
      var tl = gsap.timeline();
      tl.to(pre, { yPercent: -100, duration: 1.0, ease: 'power3.inOut' })
        .set(pre, { display: 'none' })
        .add(function () {
          heroIntro();
          ScrollTrigger.refresh();
        }, '-=0.4');
    }

    var minTime = new Promise(function (r) { setTimeout(r, 1700); });
    var fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();

    /* build the scene as soon as fonts are ready (still behind preloader) */
    fontsReady.then(function () {
      try { buildScene(); }
      catch (err) {
        /* graceful fallback — reveal everything */
        gsap.set('[data-reveal], [data-stagger-item]', { opacity: 1, y: 0, clearProps: 'transform' });
        gsap.set('[data-img-reveal]', { clipPath: 'inset(0% 0% 0% 0%)' });
        console.warn('Scene build fell back:', err);
      }
    });

    Promise.all([minTime, fontsReady]).then(exit);
  }

  runPreloader();

  /* keep ScrollTrigger honest after late layout shifts */
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
