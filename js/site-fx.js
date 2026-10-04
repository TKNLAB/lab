/* Nayak Lab site effects: animated TKN logo, scroll reveals, image swap. All traces come from trace-engine.js. */
(function () {
  if (window.__labFx) return; window.__labFx = true;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- animated TKN logo: ions flowing through the T pore ----------
     Geometry measured from tkn-logo-reversed.png (pore centre x=16.14%, dot r=4.0% of height, pitch=18.14%). */
  function mountLogo(c) {
    if (c.__logo) return; c.__logo = true;
    var ctx = c.getContext('2d', { alpha: true }), W = 0, H = 0, dpr = 1, phase = 0, last = 0, speed = 0.38, target = 0.38, born = performance.now();
    var host = c.closest('a') || c.parentNode;
    var logoImg = c.parentNode.querySelector('img');
    if (logoImg && !(logoImg.complete && logoImg.naturalWidth)) { born = Infinity; var go = function () { born = performance.now(); }; logoImg.addEventListener('load', go, { once: true }); logoImg.addEventListener('error', go, { once: true }); }
    host.addEventListener('mouseenter', function () { target = 1.3; });
    host.addEventListener('mouseleave', function () { target = 0.38; });
    host.addEventListener('focus', function () { target = 1.3; }, true);
    host.addEventListener('blur', function () { target = 0.38; }, true);
    function size() { var b = c.getBoundingClientRect(); dpr = Math.min(window.devicePixelRatio || 1, 3); W = b.width; H = b.height; c.width = Math.max(1, W * dpr); c.height = Math.max(1, H * dpr); }
    function draw(now) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      var cx = W * 0.1614, rad = H * 0.040, pitch = H * 0.1814, y0 = H * 0.0517;
      var intro = reduce ? 1 : Math.min(1, (now - born) / 900);
      for (var k = -1; k < 7; k++) {
        var y = y0 + (k + phase) * pitch;
        if (y < -rad || y > H + rad) continue;
        var edge = Math.min(1, Math.min(y + rad, H + rad - y) / (rad * 2.2));
        var appear = Math.max(0, Math.min(1, intro * 7 - k));
        ctx.globalAlpha = Math.max(0, edge) * appear;
        ctx.fillStyle = '#e0a53a';
        ctx.beginPath(); ctx.arc(cx, y, rad * (0.6 + 0.4 * appear), 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    function tick(t) {
      if (!last) last = t;
      var dt = Math.min(0.034, (t - last) / 1000); last = t;
      speed += (target - speed) * Math.min(1, dt * 4);
      if (!reduce) phase = (phase + speed * dt) % 1;
      draw(t);
      if (c.isConnected) requestAnimationFrame(tick);
    }
    if (window.ResizeObserver) new ResizeObserver(size).observe(c);
    size(); requestAnimationFrame(tick);
  }
  window.mountLogos = function () { document.querySelectorAll('canvas[data-tkn-ions]').forEach(mountLogo); };

  /* ---------- scroll reveals (only hides items below the fold; content stays visible without JS) ---------- */
  var io = window.IntersectionObserver ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target, d = +(el.getAttribute('data-reveal-delay') || 0);
      el.style.transition = 'opacity .9s cubic-bezier(.2,.7,0,1) ' + d + 'ms, transform .9s cubic-bezier(.2,.7,0,1) ' + d + 'ms';
      el.style.opacity = '1'; el.style.transform = 'none';
      io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -6% 0px' }) : null;
  window.mountReveals = function () {
    if (!io || reduce) return;
    document.querySelectorAll('[data-reveal]').forEach(function (el) {
      if (el.__rv) return; el.__rv = true;
      if (el.getBoundingClientRect().top < window.innerHeight * 0.94) return;
      el.style.opacity = '0'; el.style.transform = 'translateY(' + (el.getAttribute('data-reveal') || '22') + 'px)';
      io.observe(el);
    });
  };

  /* ---------- image swap: templates use a blank src + data-src so unresolved holes never hit the network ---------- */
  function swapImgs() {
    document.querySelectorAll('img[data-src]').forEach(function (img) {
      var s = img.getAttribute('data-src');
      if (s && s.indexOf('{{') < 0 && img.getAttribute('src') !== s) img.setAttribute('src', s);
    });
  }
  window.swapImgs = swapImgs;

  function sweep() { try { swapImgs(); window.mountLogos(); window.mountReveals(); } catch (e) { } }
  var pending = false;
  function schedule() { if (pending) return; pending = true; requestAnimationFrame(function () { pending = false; sweep(); }); }
  if (window.MutationObserver) new MutationObserver(schedule).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-src'] });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sweep); else sweep();
})();
