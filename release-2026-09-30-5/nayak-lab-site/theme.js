/* theme.js — light/dark switch. The site is authored in dark colours; in light mode every inline
   style, <style> block and canvas colour is remapped through the palette below. */
(function () {
  if (window.TKNTheme) return;
  var KEY = 'tkn-theme';
  var P = [
    ['7,12,22', '247,244,238'], ['13,20,34', '255,253,249'], ['11,18,32', '240,236,227'], ['16,26,44', '235,230,220'],
    ['20,30,48', '229,223,211'], ['10,16,28', '243,239,232'], ['15,23,38', '238,233,224'], ['11,17,32', '241,237,229'],
    ['42,53,72', '212,205,192'], ['5,9,17', '246,243,237'],
    ['232,236,243', '20,26,38'], ['255,255,255', '12,17,28'], ['170,179,195', '72,81,100'], ['195,202,214', '54,62,79'],
    ['135,146,166', '88,97,116'], ['125,136,156', '94,103,122'], ['152,162,180', '82,91,108'],
    ['241,212,154', '150,98,18'], ['230,182,103', '146,94,16'], ['224,165,58', '156,100,18'], ['201,142,60', '176,116,40'],
    ['251,231,191', '122,78,12'], ['196,127,51', '138,85,22'], ['143,180,232', '46,98,176']
  ];
  var FWD = {}, REV = {};
  P.forEach(function (p) { FWD[p[0]] = p[1]; REV[p[1]] = p[0]; });
  var hex2 = function (n) { n = (+n).toString(16); return n.length < 2 ? '0' + n : n; };
  function mapWith(M, s) {
    if (!s || typeof s !== 'string') return s;
    // Solid white panels (figure/image frames) stay white in both themes.
    if (M === FWD) s = s.replace(/(background(?:-color)?\s*:\s*)(#fff\b|#ffffff\b|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\))/gi, '$1#fffffe');
    return s.replace(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi, function (m, h) {
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      var k = parseInt(h.slice(0, 2), 16) + ',' + parseInt(h.slice(2, 4), 16) + ',' + parseInt(h.slice(4, 6), 16), v = M[k];
      if (!v) return m; v = v.split(','); return '#' + hex2(v[0]) + hex2(v[1]) + hex2(v[2]);
    }).replace(/(rgba?\(\s*)(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/gi, function (m, pre, r, g, b) {
      var v = M[r + ',' + g + ',' + b]; return v ? pre + v : m;
    });
  }
  var read = function () { try { return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark'; } catch (e) { return 'dark'; } };
  var mode = read(), root = document.documentElement;
  root.setAttribute('data-theme', mode);

  var css = document.createElement('style');
  css.setAttribute('data-theme-css', '');
  css.textContent = 'html[data-theme=light],html[data-theme=light] body{background:#f7f4ee !important;color-scheme:light;}' +
    'html[data-theme=light] img[src*="assets/logos/"],html[data-theme=light] img[src$="rb.png"]{filter:invert(1) hue-rotate(180deg);}' +
    'html{transition:background-color .3s;}';
  (document.head || root).appendChild(css);

  function fixEl(el, M) {
    var s = el.getAttribute && el.getAttribute('style');
    if (s) { var n = mapWith(M, s); if (n !== s) el.setAttribute('style', n); }
    if (el.tagName === 'STYLE' && !el.hasAttribute('data-theme-css')) { var t = el.textContent, u = mapWith(M, t); if (u !== t) el.textContent = u; }
  }
  // Pseudo-state rules (style-hover etc.) are inserted via CSSOM, so map them there too.
  var SS = window.CSSStyleSheet && CSSStyleSheet.prototype, ir = SS && SS.insertRule;
  if (ir) SS.insertRule = function (r, i) { return ir.call(this, mode === 'light' && typeof r === 'string' ? mapWith(FWD, r) : r, i); };
  function fixSheets(M) {
    var st = document.querySelectorAll('style');
    for (var i = 0; i < st.length; i++) {
      var el = st[i], sh = el.sheet;
      if (!sh || el.hasAttribute('data-theme-css') || el.textContent.trim()) continue;
      try {
        for (var j = 0; j < sh.cssRules.length; j++) {
          var t = sh.cssRules[j].cssText, u = mapWith(M, t);
          if (u !== t) { sh.deleteRule(j); ir.call(sh, u, j); }
        }
      } catch (e) {}
    }
  }
  function sweep(M) {
    fixEl(root, M);
    var all = document.querySelectorAll('[style],style');
    for (var i = 0; i < all.length; i++) fixEl(all[i], M);
    if (ir) fixSheets(M);
  }
  var mo = new MutationObserver(function (list) {
    if (mode !== 'light') return;
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      if (r.type === 'attributes') fixEl(r.target, FWD);
      else if (r.type === 'characterData') { var p = r.target.parentNode; if (p && p.tagName === 'STYLE') fixEl(p, FWD); }
      else for (var j = 0; j < r.addedNodes.length; j++) {
        var n = r.addedNodes[j]; if (n.nodeType !== 1) { if (n.parentNode && n.parentNode.tagName === 'STYLE') fixEl(n.parentNode, FWD); continue; }
        fixEl(n, FWD); var d = n.querySelectorAll('[style],style'); for (var k = 0; k < d.length; k++) fixEl(d[k], FWD);
      }
    }
  });
  function observe(on) {
    if (on) mo.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['style'], characterData: true });
    else mo.disconnect();
  }

  // Canvas colours
  var C2 = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
  if (C2) ['fillStyle', 'strokeStyle', 'shadowColor'].forEach(function (p) {
    var d = Object.getOwnPropertyDescriptor(C2, p); if (!d || !d.set) return;
    Object.defineProperty(C2, p, { configurable: true, enumerable: d.enumerable, get: d.get, set: function (v) { d.set.call(this, mode === 'light' && typeof v === 'string' ? mapWith(FWD, v) : v); } });
  });
  var G = window.CanvasGradient && CanvasGradient.prototype;
  if (G && G.addColorStop) { var acs = G.addColorStop; G.addColorStop = function (o, c) { return acs.call(this, o, mode === 'light' ? mapWith(FWD, c) : c); }; }
  function repaintCanvases() {
    document.querySelectorAll('canvas[data-fig]').forEach(function (c) { c.width = 1; });
    if (window.TE && TE.reduce && TE.seek) TE.seek(0);
    window.dispatchEvent(new Event('resize'));
  }

  var subs = [];
  function set(m) {
    m = m === 'light' ? 'light' : 'dark'; if (m === mode) return;
    var prev = mode; mode = m;
    try { localStorage.setItem(KEY, m); } catch (e) {}
    root.setAttribute('data-theme', m);
    observe(false);
    sweep(m === 'light' ? FWD : REV);
    if (m === 'light') observe(true);
    repaintCanvases();
    subs.forEach(function (f) { try { f(m, prev); } catch (e) {} });
  }
  window.TKNTheme = {
    get: function () { return mode; }, set: set, toggle: function () { set(mode === 'light' ? 'dark' : 'light'); },
    on: function (f) { subs.push(f); return function () { subs = subs.filter(function (g) { return g !== f; }); }; },
    map: function (s) { return mode === 'light' ? mapWith(FWD, s) : s; }
  };
  window.addEventListener('storage', function (e) { if (e.key === KEY) set(read()); });
  if (mode === 'light') { observe(true); if (document.readyState !== 'loading') sweep(FWD); else document.addEventListener('DOMContentLoaded', function () { sweep(FWD); }); }
})();
