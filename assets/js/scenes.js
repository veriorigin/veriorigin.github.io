/* ==========================================================================
   scenes.js — full-bleed panels, three states each
   locate (scan reveals a segmentation mask, then prompt + arrow together)
   record (scan, then the record appears) · restore (wipe the mask away)
   ========================================================================== */
(function () {
  'use strict';

  var S = document.body.dataset;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var panels = Array.prototype.slice.call(document.querySelectorAll('[data-panel]'));
  if (!panels.length) return;

  var DURATION = 11;
  var items = [];
  var last = 0;

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function clampInt(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  var ANCHORS = {
    medical: { x: 0.5094, y: 0.6479 },
    natural: { x: 0.4999, y: 0.5087 },
    satellite: { x: 0.5650, y: 0.4741 },
    legal: { x: 0.4727, y: 0.3333 }
  };

  /* ---------------------------------------------------------------- callout */
  function drawCallout(it, slide, alpha) {
    var head = slide.querySelector('[data-headline]');
    if (!head || alpha <= 0) return;
    var sr = slide.getBoundingClientRect();
    var hr = head.getBoundingClientRect();
    var textLeft = hr.left - sr.left;
    var textBottom = hr.bottom - sr.top;

    var a = ANCHORS[it.type] || ANCHORS.medical;
    var p0 = [a.x * it.W, a.y * it.H];
    var textTop = hr.top - sr.top;
    var above = p0[1] < (textTop + hr.height / 2);
    var tx = textLeft + 24;
    var ty, elbow;
    if (above) {
      ty = textTop - 14;
      elbow = ty - 46;
      if (elbow < p0[1]) elbow = (p0[1] + ty) / 2;
    } else {
      ty = textBottom + 14;
      elbow = ty + 46;
      if (elbow > p0[1]) elbow = (p0[1] + ty) / 2;
    }

    var dark = it.type === 'legal' || it.type === 'natural';
    var line = dark ? 'rgba(18,18,18,0.92)' : 'rgba(255,255,255,0.9)';
    var dotFill = dark ? 'rgba(18,18,18,0.95)' : 'rgba(255,255,255,0.95)';
    var ring = dark ? 'rgba(18,18,18,0.3)' : 'rgba(255,255,255,0.3)';
    var ctx = it.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = line;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 6;

    ctx.beginPath();
    ctx.moveTo(p0[0], p0[1]);
    ctx.lineTo(p0[0], elbow);
    ctx.lineTo(tx, elbow);
    ctx.lineTo(tx, ty);
    ctx.stroke();

    ctx.fillStyle = dotFill;
    ctx.beginPath();
    ctx.arc(p0[0], p0[1], 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = ring;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(p0[0], p0[1], 9, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = line;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    if (above) {
      ctx.moveTo(tx, ty); ctx.lineTo(tx - 6.4, ty - 11);
      ctx.moveTo(tx, ty); ctx.lineTo(tx + 6.4, ty - 11);
    } else {
      ctx.moveTo(tx, ty); ctx.lineTo(tx - 6.4, ty + 11);
      ctx.moveTo(tx, ty); ctx.lineTo(tx + 6.4, ty + 11);
    }
    ctx.stroke();
    ctx.restore();
  }

  /* ----------------------------------------------------------------- locate */
  function drawLocate(it, slide) {
    var ctx = it.ctx, W = it.W, H = it.H, t = it.t;
    ctx.clearRect(0, 0, W, H);

    var scanT = clamp01(t / 4.2);
    var scanY = ease(scanT) * H;
    var revealing = scanT < 1;

    var mask = slide.querySelector('[data-mask]');
    if (mask) mask.style.clipPath = 'inset(0 0 ' + (100 - scanT * 100) + '% 0)';

    if (revealing) {
      var band = Math.min(W, H) * 0.26;
      var g = ctx.createLinearGradient(0, scanY - band, 0, scanY);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(1, 'rgba(255,255,255,0.09)');
      ctx.fillStyle = g;
      ctx.fillRect(0, scanY - band, W, band);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(0, scanY, W, 1);
    }

    var reveal = clamp01((t - 4.2) / 0.35);
    slide.classList.toggle('is-revealed', t >= 4.2);
    if (reveal > 0) drawCallout(it, slide, reveal);
  }

  /* ------------------------------------------------- locate: four panes */
  function drawLocatePanes(it, slide) {
    var p = clamp01(it.t / 2.4);
    var line = slide.querySelector('.locate-scanline');
    if (line) line.style.left = (p * 100) + '%';
    var pred = slide.querySelector('.locate-pane--pred img');
    if (pred) pred.style.clipPath = 'inset(0 ' + ((1 - p) * 100) + '% 0 0)';
  }

  /* ---------------------------------------------------------------- restore */
  function drawRestore(it, slide) {
    var ctx = it.ctx, W = it.W, H = it.H, t = it.t;
    ctx.clearRect(0, 0, W, H);

    var wipe = ease(clamp01((t - 1.1) / 5.2));
    var bx = wipe * W;
    var fadeOut = 1 - clamp01((t - 9.8) / 1.2);
    var fadeIn = clamp01(t / 0.5);
    var alpha = fadeOut * fadeIn;

    var clean = slide.querySelector('[data-restore]');
    if (clean) clean.style.clipPath = 'inset(0 ' + (100 - wipe * 100) + '% 0 0)';

    if (wipe > 0 && wipe < 1) {
      var band = Math.min(W, H) * 0.09;
      var g = ctx.createLinearGradient(bx - band, 0, bx + 2, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(1, 'rgba(255,255,255,0.28)');
      ctx.fillStyle = g;
      ctx.fillRect(bx - band, 0, band + 2, H);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(bx, 0, 1, H);
    }
  }

  /* ------------------------------------------------- restore: two panes */
  function drawRestorePanes(it, slide) {
    var p = ease(clamp01((it.t - 1.1) / 5.2));
    var line = slide.querySelector('.restore-scanline');
    if (line) line.style.left = (p * 100) + '%';
    var cover = slide.querySelector('.restore-pane--cover img');
    if (cover) cover.style.clipPath = 'inset(0 ' + ((1 - p) * 100) + '% 0 0)';
  }

  /* -------------------------------------------------------------------- ui */
  function setState(it, text, mode) {
    if (!it.state) return;
    var key = text + '|' + (mode || '');
    if (key === it.stateKey) return;
    it.stateKey = key;
    if (it.stateText) it.stateText.textContent = text;
    it.state.classList.toggle('is-done', mode === 'done');
    it.state.classList.toggle('is-alert', mode === 'alert');
  }

  function updateUI(it) {
    var type = it.slides[it.index].getAttribute('data-slide');
    if (type === 'record') {
      if (it.revealed) setState(it, S.extracted || 'EXTRACTED', 'done');
      else setState(it, S.scanning, '');
      return;
    }
    if (type === 'locate') {
      if (it.t < 2.4) setState(it, S.scanning, '');
      else setState(it, S.regions, 'alert');
      return;
    }
    var wipe = clamp01((it.t - 1.1) / 5.2);
    var left = Math.max(0, Math.round(12480 * (1 - wipe)));
    var count = it.slides[2].querySelector('[data-count]');
    if (count) {
      var label = '<b>' + left.toLocaleString('en-US') + '</b> ' + S.px;
      if (count.innerHTML !== label) count.innerHTML = label;
    }
    if (it.t > 6.5) setState(it, S.exact, 'done');
    else setState(it, S.restoring, '');
  }

  /* ----------------------------------------------------------------- slides */
  function slideType(it) { return it.slides[it.index].getAttribute('data-slide'); }

  function sizeSlides(it) {
    var w = it.el.clientWidth;
    var h = it.el.clientHeight;
    if (!w || !h) return;
    it.W = w;
    it.H = h;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    it.slides.forEach(function (s) {
      if (!s._canvas) return;
      s._canvas.width = Math.round(w * dpr);
      s._canvas.height = Math.round(h * dpr);
      s._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
  }

  function drawActive(it) {
    var s = it.slides[it.index];
    var type = s.getAttribute('data-slide');
    if (type === 'locate') {
      drawLocatePanes(it, s);
    } else if (type === 'restore') {
      drawRestorePanes(it, s);
    }
  }


  function startRecordScan(it) {
    var slide = it.slides[it.index];
    if (it.recordTimer) { clearTimeout(it.recordTimer); it.recordTimer = null; }
    slide.classList.remove('is-revealed');
    slide.classList.add('is-scanning');
    it.revealed = false;
    updateUI(it);
    it.recordTimer = setTimeout(function () {
      slide.classList.remove('is-scanning');
      slide.classList.add('is-revealed');
      it.revealed = true;
      updateUI(it);
      it.recordTimer = null;
    }, 1150);
  }

  function activateSlide(it, index) {
    index = clampInt(index, 0, 2);
    if (it.recordTimer) { clearTimeout(it.recordTimer); it.recordTimer = null; }
    it.index = index;
    it.t = reduce ? 7.8 : 0;
    it.revealed = false;
    it.track.style.transform = 'translateX(' + (-index * 100 / 3) + '%)';
    it.slides.forEach(function (s, i) {
      s.classList.toggle('is-active', i === index);
      s.classList.remove('is-revealed', 'is-scanning');
    });
    it.prev.disabled = index === 0;
    it.next.disabled = index === 2;
    Array.prototype.forEach.call(it.dots.children, function (d, i) {
      d.classList.toggle('is-active', i === index);
    });
    it.stateKey = '';
    sizeSlides(it);

    var type = slideType(it);
    if (type === 'record') {
      if (reduce) {
        it.revealed = true;
        it.slides[it.index].classList.add('is-revealed');
        updateUI(it);
      } else {
        startRecordScan(it);
      }
    } else {
      drawActive(it);
      updateUI(it);
    }
  }

  function setupPanel(el) {
    var it = {
      el: el,
      type: el.getAttribute('data-panel'),
      track: el.querySelector('[data-track]'),
      slides: Array.prototype.slice.call(el.querySelectorAll('[data-slide]')),
      state: el.querySelector('[data-state]'),
      stateText: el.querySelector('[data-state-text]'),
      prev: el.querySelector('[data-prev]'),
      next: el.querySelector('[data-next]'),
      dots: el.querySelector('[data-dots]'),
      index: 1,
      t: 0,
      W: 1,
      H: 1,
      active: false,
      wasActive: false,
      revealed: false,
      stateKey: '',
      recordTimer: null
    };
    it.slides.forEach(function (s) {
      s._canvas = s.querySelector('[data-fx]');
      if (s._canvas) s._ctx = s._canvas.getContext('2d');
    });

    it.prev.addEventListener('click', function () { activateSlide(it, it.index - 1); });
    it.next.addEventListener('click', function () { activateSlide(it, it.index + 1); });
    Array.prototype.forEach.call(it.dots.children, function (d, i) {
      d.addEventListener('click', function () { activateSlide(it, i); });
    });

    var sx = 0, sy = 0, tracking = false;
    el.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button')) return;
      tracking = true;
      sx = e.clientX;
      sy = e.clientY;
    });
    el.addEventListener('pointerup', function (e) {
      if (!tracking) return;
      tracking = false;
      var dx = e.clientX - sx;
      var dy = e.clientY - sy;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.15) {
        activateSlide(it, it.index + (dx < 0 ? 1 : -1));
      }
    });
    el.addEventListener('pointercancel', function () { tracking = false; });

    activateSlide(it, 1);
    return it;
  }

  /* ------------------------------------------------------------------ loop */
  function tick(now) {
    if (!last) last = now;
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it.active) continue;
      var type = slideType(it);
      if (type === 'record') {
        updateUI(it);
        continue;
      }
      it.t += dt;
      if (type === 'restore' && it.t >= DURATION) it.t = 0;
      drawActive(it);
      updateUI(it);
    }
    requestAnimationFrame(tick);
  }

  /* ------------------------------------------------------------------ wire */
  items = panels.map(setupPanel);

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var it = null;
        for (var i = 0; i < items.length; i++) {
          if (items[i].el === entry.target) { it = items[i]; break; }
        }
        if (!it) return;
        var active = entry.isIntersecting && entry.intersectionRatio > 0.4;
        if (active && !it.wasActive) {
          it.t = reduce ? 7.8 : 0;
          if (slideType(it) === 'record') {
            if (reduce) {
              it.revealed = true;
              it.slides[it.index].classList.add('is-revealed');
              updateUI(it);
            } else if (!it.recordTimer) {
              startRecordScan(it);
            }
          } else {
            drawActive(it);
          }
          sizeSlides(it);
        }
        it.active = active;
        it.wasActive = active;
      });
    }, { threshold: [0, 0.4, 0.75] });
    items.forEach(function (it) { io.observe(it.el); });
  } else {
    items.forEach(function (it) { it.active = true; });
  }

  items.forEach(function (it) {
    sizeSlides(it);
    if (slideType(it) !== 'record') drawActive(it);
    updateUI(it);
  });

  if (!reduce) requestAnimationFrame(tick);

  /* keyboard */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    var it = items.filter(function (x) { return x.active; })[0];
    if (!it) return;
    activateSlide(it, it.index + (e.key === 'ArrowRight' ? 1 : -1));
  });

  /* resize */
  var rt = null;
  window.addEventListener('resize', function () {
    if (rt) clearTimeout(rt);
    rt = setTimeout(function () {
      items.forEach(function (it) {
        sizeSlides(it);
        if (slideType(it) !== 'record') drawActive(it);
      });
    }, 160);
  });

  document.addEventListener('visibilitychange', function () { last = 0; });


  /* wheel paging: one page at a time, eased over ~1s */
  var pageTargets = Array.prototype.slice.call(document.querySelectorAll('[data-panel]'));
  var outro = document.querySelector('.outro');
  if (outro) pageTargets.push(outro);
  var pageAnimating = false;
  var pageCooldown = 0;
  var wheelAcc = 0;
  var wheelTimer = null;

  function pageTop(el) {
    return el.getBoundingClientRect().top + (window.scrollY || 0);
  }

  function nearestPage() {
    var y = window.scrollY || 0;
    var best = 0;
    var bestD = Infinity;
    for (var i = 0; i < pageTargets.length; i++) {
      var d = Math.abs(pageTop(pageTargets[i]) - y);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  function goPage(index) {
    if (index < 0 || index >= pageTargets.length) return;
    var start = window.scrollY || 0;
    var end = pageTop(pageTargets[index]);
    if (Math.abs(end - start) < 2) return;
    var t0 = performance.now();
    var dur = 1000;
    pageAnimating = true;
    function step(now) {
      var p = Math.min(1, (now - t0) / dur);
      var e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      window.scrollTo(0, start + (end - start) * e);
      if (p < 1) {
        requestAnimationFrame(step);
      } else {
        pageAnimating = false;
        wheelAcc = 0;
        pageCooldown = performance.now() + 240;
      }
    }
    requestAnimationFrame(step);
  }

  if (pageTargets.length > 1) {
    window.addEventListener('wheel', function (e) {
      if (pageAnimating || performance.now() < pageCooldown) { e.preventDefault(); return; }
      e.preventDefault();
      wheelAcc += e.deltaY;
      if (wheelTimer) clearTimeout(wheelTimer);
      wheelTimer = setTimeout(function () { wheelAcc = 0; }, 280);
      if (Math.abs(wheelAcc) < 45) return;
      var dir = wheelAcc > 0 ? 1 : -1;
      wheelAcc = 0;
      goPage(nearestPage() + dir);
    }, { passive: false });
  }

  var header = document.querySelector('[data-header]');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-scrolled', (window.scrollY || 0) > 12); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
})();
