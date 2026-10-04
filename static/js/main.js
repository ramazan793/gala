/* GALA project page: nav state, clips that play while visible, the speed counters, the method stages,
   the result tabs, the blendshape slider, the Pareto build and the BibTeX copy button. No dependencies. */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  function isShown(el) { return el.offsetParent !== null; }
  function play(video) {
    if (!isShown(video)) { return; }
    var p = video.play();
    if (p && p.catch) { p.catch(function () { /* autoplay refused: the poster stays */ }); }
  }

  /* ---------------------------------------------------------- nav */
  var nav = $('#nav');
  function onScroll() { nav.classList.toggle('is-scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var navLinks = $$('.nav__links a');
  if (hasIO) {
    var sectionSpy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) { return; }
        navLinks.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach(function (a) {
      var target = $(a.getAttribute('href'));
      if (target) { sectionSpy.observe(target); }
    });
    // the sections without a nav entry clear or keep the nearest one
    ['#top', '#speed'].forEach(function (id) { var t = $(id); if (t) { sectionSpy.observe(t); } });
  }

  /* ---------------------------------------------------------- hero clip: a still for visitors who ask for less motion */
  var heroVideo = $('.hero__video');
  if (heroVideo && reducedMotion) {
    heroVideo.removeAttribute('autoplay');
    heroVideo.pause();
  }

  /* ---------------------------------------------------------- reveal on scroll */
  var reveals = $$('.reveal');
  if (hasIO && !reducedMotion) {
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); revealIO.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { revealIO.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------------------------------------------------------- clips play only while on screen */
  var visible = new WeakMap();
  if (hasIO) {
    var clipIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        visible.set(e.target, e.isIntersecting);
        if (e.isIntersecting) { play(e.target); } else { e.target.pause(); }
      });
    }, { threshold: 0.2 });
    $$('video[data-autoplay]').forEach(function (v) { clipIO.observe(v); });
  } else {
    $$('video[data-autoplay]').forEach(function (v) { visible.set(v, true); play(v); });
  }

  /* ---------------------------------------------------------- speed counters */
  (function () {
    var race = $('#race');
    if (!race) { return; }
    var fmt = new Intl.NumberFormat('en-US');
    var rows = $$('.race__row', race).map(function (row) {
      return {
        hostMs: parseFloat(row.dataset.hostMs),
        galaMs: parseFloat(row.dataset.galaMs),
        host: $('[data-count="host"]', row),
        gala: $('[data-count="gala"]', row),
        bar: $('[data-bar]', row)
      };
    });
    var t0 = null;
    var onScreen = false;
    var raf = 0;

    function draw(now) {
      var elapsed = now - t0;
      rows.forEach(function (r) {
        r.host.textContent = fmt.format(Math.floor(elapsed / r.hostMs));
        r.gala.textContent = fmt.format(Math.floor(elapsed / r.galaMs));
        if (r.bar) { r.bar.style.width = (100 * ((elapsed % r.hostMs) / r.hostMs)).toFixed(2) + '%'; }
      });
    }
    function tick(now) {
      draw(now);
      raf = onScreen ? requestAnimationFrame(tick) : 0;
    }
    function start() {
      if (t0 === null) { t0 = performance.now(); }
      if (!raf) { raf = requestAnimationFrame(tick); }
    }
    if (hasIO) {
      new IntersectionObserver(function (entries) {
        onScreen = entries[0].isIntersecting;
        if (onScreen) { start(); }
      }, { threshold: 0.25 }).observe(race);
    } else {
      onScreen = true;
      start();
    }
    var restart = $('#raceRestart');
    if (restart) {
      restart.addEventListener('click', function () { t0 = performance.now(); draw(t0); if (onScreen) { start(); } });
    }
  })();

  /* ---------------------------------------------------------- method stages */
  (function () {
    var root = $('#stages');
    if (!root) { return; }
    var tabs = $$('.tab', root);
    var texts = $$('.stage', root);
    var scroller = $('.stages__scroll', root);
    var fig = $('.stages__fig', root);
    // left edge and width of each stage in the figure, as fractions of its width
    var where = { all: [0, 1], host: [0, 0.255], basis: [0, 0.6], distill: [0.6, 0.4], inference: [0.6, 0.4] };

    function show(stage) {
      root.dataset.stage = stage;
      tabs.forEach(function (t) {
        var on = t.dataset.stage === stage;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      texts.forEach(function (t) { t.classList.toggle('is-active', t.dataset.stage === stage); });
      // on narrow screens the figure scrolls sideways: bring the lit panels into view
      var w = fig.scrollWidth;
      if (w > scroller.clientWidth + 2) {
        var x = where[stage][0] * w;
        var centre = x + where[stage][1] * w / 2 - scroller.clientWidth / 2;
        scroller.scrollTo({ left: Math.max(0, Math.min(centre, w - scroller.clientWidth)), behavior: reducedMotion ? 'auto' : 'smooth' });
      }
    }
    tabs.forEach(function (t) { t.addEventListener('click', function () { show(t.dataset.stage); }); });
  })();

  /* ---------------------------------------------------------- result tabs */
  (function () {
    var root = $('#results-tabs');
    if (!root) { return; }
    var tabs = $$('.tab', root);
    var panes = $$('.result', root);
    tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        tabs.forEach(function (o) {
          var on = o === t;
          o.classList.toggle('is-active', on);
          o.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        panes.forEach(function (p) {
          var on = p.dataset.host === t.dataset.host;
          p.classList.toggle('is-active', on);
          var v = $('video', p);
          if (on) { v.currentTime = 0; play(v); } else { v.pause(); }
        });
      });
    });
  })();

  /* ---------------------------------------------------------- blendshape slider
     The clip is one ping-pong cycle of 90 frames at 30 fps: the activation t follows
     t(f) = (1 - cos(2 pi f / 90)) / 2, so frame 0 is the first state and frame 45 the second. */
  (function () {
    var video = $('#blendVideo');
    var slider = $('#blendSlider');
    if (!video || !slider) { return; }
    var FPS = 30, CYCLE = 90;
    var dragging = false;
    var onScreen = false;
    var resumeTimer = 0;
    var raf = 0;

    function follow() {
      if (!dragging && !video.paused) {
        var f = (video.currentTime * FPS) % CYCLE;
        slider.value = Math.round(1000 * (1 - Math.cos(2 * Math.PI * f / CYCLE)) / 2);
      }
      raf = onScreen ? requestAnimationFrame(follow) : 0;
    }
    function seek() {
      var t = slider.value / 1000;
      var f = Math.round((CYCLE / (2 * Math.PI)) * Math.acos(1 - 2 * t)); // 0..45, the rising half
      video.currentTime = (Math.min(f, CYCLE / 2) + 0.5) / FPS;
    }
    function grab() {
      dragging = true;
      clearTimeout(resumeTimer);
      video.pause();
    }
    function release() {
      if (!dragging) { return; }
      dragging = false;
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(function () { if (onScreen && !reducedMotion) { play(video); } }, 1600);
    }
    slider.addEventListener('pointerdown', grab);
    slider.addEventListener('keydown', grab);
    slider.addEventListener('input', function () { if (!dragging) { grab(); } seek(); });
    slider.addEventListener('change', release);
    slider.addEventListener('pointerup', release);
    slider.addEventListener('keyup', release);

    if (hasIO) {
      new IntersectionObserver(function (entries) {
        onScreen = entries[0].isIntersecting;
        if (onScreen) {
          if (!dragging && !reducedMotion) { play(video); }
          if (!raf) { raf = requestAnimationFrame(follow); }
        } else {
          video.pause();
        }
      }, { threshold: 0.3 }).observe(video);
    } else {
      onScreen = true;
      play(video);
      raf = requestAnimationFrame(follow);
    }
  })();

  /* ---------------------------------------------------------- Pareto build: plays once when it comes into view */
  (function () {
    var video = $('#paretoVideo');
    if (!video) { return; }
    var played = false;
    if (reducedMotion) {
      video.controls = true; // the poster is the finished plot
    } else if (hasIO) {
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting && !played) { played = true; play(video); }
      }, { threshold: 0.55 }).observe(video);
    }
    var replay = $('#paretoReplay');
    if (replay) {
      replay.addEventListener('click', function () { video.currentTime = 0; play(video); });
    }
  })();

  /* ---------------------------------------------------------- BibTeX copy */
  (function () {
    var btn = $('#bibCopy');
    var text = $('#bibText');
    if (!btn || !text) { return; }
    btn.addEventListener('click', function () {
      var done = function () {
        btn.textContent = 'Copied';
        setTimeout(function () { btn.textContent = 'Copy'; }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text.textContent).then(done, function () {});
      } else {
        var range = document.createRange();
        range.selectNodeContents(text);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        try { document.execCommand('copy'); done(); } catch (e) { /* the text stays selected */ }
      }
    });
  })();
})();
