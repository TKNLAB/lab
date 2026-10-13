/* opto-engine.js — ChR2 photocycle model, RK4 solver, live fitting and a small canvas plotter
   for the Explore pages. Deterministic for a given seed.
   Model: four-state scheme C1 ⇌ O1 ⇌ O2 ⇌ C2 → C1 with light-driven C1→O1, C2→O2 and a
   light-activation variable p (Williams et al. 2013, PLoS Comput Biol 9:e1003220, ChR2(H134R)).
   Units: time ms, rates per ms, voltage mV, irradiance mW/mm², current nA (inward negative). */
(function () {
  if (window.OPTO) return;
  var O = window.OPTO = {};
  O.reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------- parameters ---------- */
  // Williams et al. 2013 H134R set. Rectification uses their exponential constant (42.77 mV)
  // with the reversal placed at E = 0 mV.
  var P = { sigma: 12e-20, wloss: 1.3, eps1: 0.8535, eps2: 0.14, tauP: 1.3, gamma: 0.1, V0: 42.7671, E: 0 };
  // Q10 per transition (approximate), referenced to 22 °C.
  var Q10 = { k: 1.46, Gd1: 1.97, Gd2: 1.77, e12: 1.46, e21: 2.77, Gr: 2.56 };
  // Wild type and ChETA: H134R rates scaled here to published off-kinetics and desensitisation
  // (Lin et al. 2009; Gunaydin et al. 2010). Illustrative, not a published parameter set.
  O.VARIANTS = {
    h134r: { name: 'ChR2(H134R)', short: 'H134R', src: 'Williams et al. 2013 parameter set', published: true, amp: 1, m: {} },
    wt: { name: 'ChR2 wild type', short: 'Wild type', src: 'H134R set rescaled here to wild-type kinetics (Lin et al. 2009)', published: false, amp: 0.55, m: { Gd1: 1.7, Gd2: 1.3, e12: 1.6, Gr: 1.3 } },
    cheta: { name: 'ChETA (E123T)', short: 'ChETA', src: 'H134R set rescaled here to ChETA kinetics (Gunaydin et al. 2010)', published: false, amp: 0.5, m: { Gd1: 3.4, Gd2: 2.0, e12: 1.2, Gr: 1.5 } }
  };
  O.P = P; O.Q10 = Q10;

  // Relative spectral sensitivity, peak 470 nm (asymmetric Gaussian; approximate shape).
  O.spectrum = function (wl) { var d = wl - 470, w = d < 0 ? 52 : 36; return Math.exp(-Math.LN2 * d * d / (w * w)); };
  O.rect = function (V) { return P.V0 * (1 - Math.exp(-(V - P.E) / P.V0)); };

  // Constant rates for one segment (fixed light, voltage, temperature).
  O.rates = function (c) {
    var v = O.VARIANTS[c.variant] || O.VARIANTS.h134r, m = v.m, f = function (k) { return Math.pow(Q10[k], ((c.T == null ? 22 : c.T) - 22) / 10) * (m[k] || 1); };
    var irr = c.irr || 0, wl = c.wl || 470, V = c.V == null ? -60 : c.V;
    // photon flux (photons m⁻² s⁻¹) at irr mW/mm² = irr·1e3 W/m²
    var phi = irr * 1e3 * wl * 1e-9 / (6.62607e-34 * 2.99792e8);
    var F = P.sigma * O.spectrum(wl) * phi / P.wloss / 1000; // per ms
    var lg = Math.log(1 + irr / 0.024);
    return {
      on: irr > 0 ? 1 : 0,
      k1: P.eps1 * F * f('k'), k2: P.eps2 * F * f('k'),
      Gd1: (0.075 + 0.043 * Math.tanh(-(V + 20) / 20)) * f('Gd1'),
      Gd2: 0.05 * f('Gd2'),
      e12: (0.011 + 0.005 * lg) * f('e12'),
      e21: (0.008 + 0.004 * lg) * f('e21'),
      Gr: 4.34587e-5 * Math.exp(-0.0211539274 * V) * f('Gr'),
      drive: v.amp * O.rect(V)
    };
  };

  /* ---------- solver ---------- */
  function deriv(y, r, out) {
    var O1 = y[0], O2 = y[1], C2 = y[2], p = y[3], C1 = 1 - O1 - O2 - C2;
    out[0] = r.k1 * p * C1 - (r.Gd1 + r.e12) * O1 + r.e21 * O2;
    out[1] = r.k2 * p * C2 - (r.Gd2 + r.e21) * O2 + r.e12 * O1;
    out[2] = r.Gd2 * O2 - (r.k2 * p + r.Gr) * C2;
    out[3] = (r.on - p) / P.tauP;
  }
  var k1 = new Float64Array(4), k2 = new Float64Array(4), k3 = new Float64Array(4), k4 = new Float64Array(4), tmp = new Float64Array(4);
  function rk4(y, r, h) {
    deriv(y, r, k1);
    for (var i = 0; i < 4; i++) tmp[i] = y[i] + 0.5 * h * k1[i]; deriv(tmp, r, k2);
    for (i = 0; i < 4; i++) tmp[i] = y[i] + 0.5 * h * k2[i]; deriv(tmp, r, k3);
    for (i = 0; i < 4; i++) tmp[i] = y[i] + h * k3[i]; deriv(tmp, r, k4);
    for (i = 0; i < 4; i++) y[i] += h * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) / 6;
  }
  O.H_FINE = 0.025; O.H_COARSE = 0.5;
  O.dark = function () { return [0, 0, 0, 0]; };
  // Integrate one segment of duration d. If dtOut is given, record current every dtOut ms.
  // 'settle' = ms since light went off at segment start (fine steps until channels have closed).
  O.run = function (y, d, c, dtOut, settle) {
    var r = O.rates(c), out = dtOut ? new Float64Array(Math.round(d / dtOut)) : null, t = 0, n = 0, since = settle == null ? 1e9 : settle;
    var hOut = dtOut || 1, steps = Math.round(d / hOut);
    for (var s = 0; s < steps; s++) {
      var fine = r.on || since + t < 400, h = fine ? (c.h || O.H_FINE) : Math.min(O.H_COARSE, hOut), m = Math.max(1, Math.round(hOut / h)); h = hOut / m;
      for (var j = 0; j < m; j++) rk4(y, r, h);
      t += hOut;
      if (out) out[n++] = O.scale * r.drive * (y[0] + P.gamma * y[1]);
    }
    return out;
  };
  // Protocol: list of segments {d, irr} sharing c (variant, V, T, wl). Returns concatenated trace.
  O.protocol = function (c, segs, dtOut, y) {
    y = y || O.dark();
    var parts = [], N = 0, since = 1e9;
    segs.forEach(function (s) {
      var cc = Object.assign({}, c, { irr: s.irr || 0 });
      var tr = O.run(y, s.d, cc, s.record === false ? null : dtOut, since);
      since = s.irr ? 0 : since + s.d;
      if (tr) { parts.push(tr); N += tr.length; }
    });
    var all = new Float64Array(N), k = 0;
    parts.forEach(function (p) { all.set(p, k); k += p.length; });
    return { i: all, dt: dtOut, y: y };
  };
  // Normalise so H134R, 22 °C, −60 mV, 470 nm, 5.5 mW/mm² peaks at −1 nA.
  O.scale = 1;
  (function () {
    var y = O.dark(), tr = O.run(y, 100, { variant: 'h134r', V: -60, T: 22, wl: 470, irr: 5.5 }, 0.05), mn = 0;
    for (var i = 0; i < tr.length; i++) if (tr[i] < mn) mn = tr[i];
    O.scale = -1 / mn;
  })();

  /* ---------- noise (seeded, Gaussian-filtered) ---------- */
  O.rng = function (seed) {
    var a = (seed >>> 0) || 1;
    return function () { a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  };
  O.gfilter = function (x, fc, dt) {
    var sg = 0.1325 / fc / dt, m = Math.max(1, Math.ceil(4 * sg)), k = [], s = 0, i, j, n = x.length, y = new Float64Array(n);
    for (i = -m; i <= m; i++) { var w = Math.exp(-i * i / (2 * sg * sg)); k.push(w); s += w; }
    for (i = 0; i < k.length; i++) k[i] /= s;
    for (i = 0; i < n; i++) { var a = 0; for (j = 0; j < k.length; j++) { var q = i + j - m; q = q < 0 ? 0 : q >= n ? n - 1 : q; a += k[j] * x[q]; } y[i] = a; }
    return y;
  };
  // Adds band-limited noise (rms nA, corner fc kHz) to a copy of x.
  O.noisy = function (x, dt, rms, fc, seed) {
    var r = O.rng(seed), n = x.length, w = new Float64Array(n);
    for (var i = 0; i < n; i++) w[i] = Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(6.283185307 * r());
    var f = O.gfilter(w, fc, dt), s = 0;
    for (i = 0; i < n; i++) s += f[i] * f[i];
    var g = rms / Math.sqrt(s / n || 1), y = new Float64Array(n);
    for (i = 0; i < n; i++) y[i] = x[i] + g * f[i];
    return y;
  };

  /* ---------- fitting ---------- */
  // y = C + A·exp(−(t − t0)/τ) by least squares: linear in A, C; golden-section in log τ.
  O.fitExp = function (y, dt, i0, i1, tauMin, tauMax) {
    i0 = Math.max(0, Math.round(i0)); i1 = Math.min(y.length, Math.round(i1));
    var n = i1 - i0; if (n < 6) return null;
    function sse(tau, keep) {
      var sx = 0, sy = 0, sxx = 0, sxy = 0, i, x;
      for (i = 0; i < n; i++) { x = Math.exp(-i * dt / tau); sx += x; sy += y[i0 + i]; sxx += x * x; sxy += x * y[i0 + i]; }
      var den = n * sxx - sx * sx; if (Math.abs(den) < 1e-14) return { e: Infinity };
      var A = (n * sxy - sx * sy) / den, C = (sy - A * sx) / n, e = 0;
      for (i = 0; i < n; i++) { var d = y[i0 + i] - C - A * Math.exp(-i * dt / tau); e += d * d; }
      return { e: e, A: A, C: C, tau: tau };
    }
    var lo = Math.log(tauMin || dt * 0.5), hi = Math.log(tauMax || n * dt * 4), best = null, bi = 0, G = 48, k;
    var grid = [];
    for (k = 0; k <= G; k++) { var s = sse(Math.exp(lo + (hi - lo) * k / G)); grid.push(s); if (!best || s.e < best.e) { best = s; bi = k; } }
    var a = lo + (hi - lo) * Math.max(0, bi - 1) / G, b = lo + (hi - lo) * Math.min(G, bi + 1) / G, gr = 0.618034;
    for (k = 0; k < 40; k++) {
      var c1 = b - gr * (b - a), c2 = a + gr * (b - a);
      if (sse(Math.exp(c1)).e < sse(Math.exp(c2)).e) b = c2; else a = c1;
    }
    var f = sse(Math.exp((a + b) / 2));
    f.t0 = i0 * dt; f.t1 = i1 * dt;
    if (Math.abs(f.tau - Math.exp(hi)) / f.tau < 0.02) f.edge = true;
    return f;
  };
  O.boxcar = function (y, w) {
    var n = y.length, out = new Float64Array(n), s = 0, h = Math.max(1, w | 0);
    for (var i = 0; i < n; i++) { s += y[i]; if (i >= h) s -= y[i - h]; out[i] = s / Math.min(i + 1, h); }
    return out;
  };
  // Standard photocurrent measures from a trace with one light pulse [tOn, tOff).
  O.measure = function (y, dt, tOn, tOff) {
    var iOn = Math.round(tOn / dt), iOff = Math.round(tOff / dt), sm = O.boxcar(y, Math.round(0.5 / dt));
    var base = 0, nb = 0;
    for (var i = Math.max(0, iOn - Math.round(20 / dt)); i < iOn; i++) { base += y[i]; nb++; } base = nb ? base / nb : 0;
    var sgn = 0; for (i = iOn; i < iOff; i++) sgn += sm[i] - base; sgn = sgn < 0 ? -1 : 1;
    var ip = 0, ipk = iOn;
    for (i = iOn; i < Math.min(y.length, iOff + Math.round(2 / dt)); i++) { var v = (sm[i] - base) * sgn; if (v > ip) { ip = v; ipk = i; } }
    // boxcar lags by half its width
    ipk = Math.max(iOn, ipk - Math.round(0.25 / dt));
    var D = tOff - tOn, m = { Ip: sgn * ip, tPeak: ipk * dt, base: base };
    m.on = ipk - iOn >= 8 ? O.fitExp(y, dt, iOn, ipk + 1, 0.05, 50) : null;
    m.inact = D >= 20 && iOff - ipk > 20 ? O.fitExp(y, dt, ipk, iOff, 1, 2000) : null;
    if (D >= 100) {
      var w = Math.round(Math.min(20, D / 5) / dt), s = 0;
      for (i = iOff - w; i < iOff; i++) s += y[i];
      m.Iss = s / w - base;
      m.ratio = m.Iss / m.Ip;
    }
    m.off = O.fitExp(y, dt, iOff + Math.round(0.3 / dt), y.length, 0.3, 300);
    return m;
  };

  /* ---------- helpers ---------- */
  O.fmtI = function (x) {
    if (x == null || !isFinite(x)) return { v: '—', u: '' };
    var a = Math.abs(x);
    if (a < 0.1) return { v: (x * 1000).toFixed(a < 0.01 ? 1 : 0).replace('-', '−'), u: 'pA' };
    return { v: x.toFixed(a < 1 ? 3 : 2).replace('-', '−'), u: 'nA' };
  };
  O.fmtT = function (t) {
    if (t == null || !isFinite(t)) return { v: '—', u: '' };
    if (t >= 1000) return { v: (t / 1000).toPrecision(3), u: 's' };
    return { v: t < 1 ? t.toFixed(2) : t < 10 ? t.toFixed(2) : t < 100 ? t.toFixed(1) : t.toFixed(0), u: 'ms' };
  };
  O.wlColor = function (wl) {
    var r = 0, g = 0, b = 0;
    if (wl < 440) { r = (440 - wl) / 60; b = 1; } else if (wl < 490) { g = (wl - 440) / 50; b = 1; }
    else if (wl < 510) { g = 1; b = (510 - wl) / 20; } else if (wl < 580) { r = (wl - 510) / 70; g = 1; }
    else if (wl < 645) { r = 1; g = (645 - wl) / 65; } else r = 1;
    var f = function (x) { return Math.round(255 * Math.pow(Math.max(0, Math.min(1, x)) * 0.85 + 0.12, 0.8)); };
    return 'rgb(' + f(r) + ',' + f(g) + ',' + f(b) + ')';
  };

  /* ---------- plotting ---------- */
  O.C = { gold: '#f1d49a', gold2: '#e6b667', gold3: '#c98e3c', ink: '#e8ecf3', mute: '#7d889c', soft: '#aab3c3', axis: 'rgba(255,255,255,0.28)', grid: 'rgba(255,255,255,0.07)', blue: '#8fb4e8' };
  O.MONO = '"Geist Mono", ui-monospace, monospace';
  O.ticks = function (a, b, n) {
    var span = b - a; if (!(span > 0)) return [a];
    var step = Math.pow(10, Math.floor(Math.log10(span / (n || 5)))), e = span / (n || 5) / step;
    step *= e >= 5 ? 5 : e >= 2 ? 2 : 1;
    var out = [], t = Math.ceil(a / step - 1e-9) * step;
    for (; t <= b + step * 1e-6; t += step) out.push(Math.abs(t) < step * 1e-6 ? 0 : t);
    return out;
  };
  function fmtTick(v) { var s = Math.abs(v) >= 1000 ? (v / 1000) + 'k' : +v.toPrecision(4) + ''; return s.replace('-', '−'); }
  // spec: { x:[a,b], y:[a,b], xlog, xlabel, ylabel, xticks, yticks, zeroX, zeroY, top (px reserved),
  //   bars:[{a,b,color}], series:[{y, x0, dx, xs, color, width, dash, upto}], points:[{xs, ys, color, r, hollow}],
  //   labels:[{x, y, text, color, align, dy}] }
  O.plot = function (cv, spec) {
    if (!cv) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight;
    if (!W || !H) return;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    var g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    var L = spec.left || 56, R = spec.right || 12, T = (spec.top || 10), B = spec.bottom || 38;
    var pw = W - L - R, ph = H - T - B;
    var xl = spec.xlog, xa = xl ? Math.log10(spec.x[0]) : spec.x[0], xb = xl ? Math.log10(spec.x[1]) : spec.x[1];
    var X = function (v) { return L + ((xl ? Math.log10(v) : v) - xa) / (xb - xa) * pw; };
    var yl = spec.ylog, ya = yl ? Math.log10(spec.y[0]) : spec.y[0], yb = yl ? Math.log10(spec.y[1]) : spec.y[1];
    var Y = function (v) { return T + (yb - (yl ? Math.log10(v) : v)) / (yb - ya) * ph; };
    g.font = '10.5px ' + O.MONO; g.lineWidth = 1;
    // grid + ticks
    var logT = function (a, b) { var o = []; for (var e = Math.floor(Math.log10(a)); e <= Math.ceil(Math.log10(b)); e++) [1, 2, 5].forEach(function (m) { var v = m * Math.pow(10, e); if (v >= a * 0.999 && v <= b * 1.001) o.push(v); }); return o; };
    var yt = spec.yticks || (yl ? logT(spec.y[0], spec.y[1]) : O.ticks(spec.y[0], spec.y[1], 5));
    var xt = spec.xticks || (xl ? (function () { var o = []; for (var e = Math.floor(xa); e <= Math.ceil(xb); e++) [1, 2, 5].forEach(function (m) { var v = m * Math.pow(10, e); if (v >= spec.x[0] * 0.999 && v <= spec.x[1] * 1.001) o.push(v); }); return o; })() : O.ticks(spec.x[0], spec.x[1], spec.nx || 6));
    g.strokeStyle = O.C.grid;
    yt.forEach(function (v) { var y = Math.round(Y(v)) + 0.5; g.beginPath(); g.moveTo(L, y); g.lineTo(L + pw, y); g.stroke(); });
    if (spec.xgrid) xt.forEach(function (v) { var x = Math.round(X(v)) + 0.5; g.beginPath(); g.moveTo(x, T); g.lineTo(x, T + ph); g.stroke(); });
    g.strokeStyle = O.C.axis;
    g.beginPath(); g.moveTo(L + 0.5, T); g.lineTo(L + 0.5, T + ph); g.lineTo(L + pw, T + ph + 0.5); g.stroke();
    if (spec.zeroY && spec.y[0] < 0 && spec.y[1] > 0) { g.setLineDash([2, 3]); g.beginPath(); g.moveTo(L, Math.round(Y(0)) + 0.5); g.lineTo(L + pw, Math.round(Y(0)) + 0.5); g.stroke(); g.setLineDash([]); }
    if (spec.zeroX && spec.x[0] < 0 && spec.x[1] > 0) { g.setLineDash([2, 3]); g.beginPath(); g.moveTo(Math.round(X(0)) + 0.5, T); g.lineTo(Math.round(X(0)) + 0.5, T + ph); g.stroke(); g.setLineDash([]); }
    g.fillStyle = O.C.mute; g.textAlign = 'right'; g.textBaseline = 'middle';
    yt.forEach(function (v) { g.fillText(fmtTick(v), L - 7, Y(v)); });
    g.textAlign = 'center'; g.textBaseline = 'top';
    var lastX = -1e9;
    xt.forEach(function (v) { var x = X(v); if (x - lastX < 34) return; lastX = x; g.fillText(fmtTick(v), x, T + ph + 7); });
    if (spec.xlabel) { g.fillText(spec.xlabel, L + pw / 2, T + ph + 22); }
    if (spec.ylabel) { g.save(); g.translate(13, T + ph / 2); g.rotate(-Math.PI / 2); g.textBaseline = 'middle'; g.fillText(spec.ylabel, 0, 0); g.restore(); }
    // light bars (drawn above the plot area)
    (spec.bars || []).forEach(function (b) {
      var x0 = Math.max(L, X(b.a)), x1 = Math.min(L + pw, X(b.b)), y0 = b.y == null ? T - 8 : b.y;
      g.fillStyle = b.color; g.globalAlpha = b.alpha == null ? 1 : b.alpha; g.fillRect(x0, y0, Math.max(1.5, x1 - x0), b.h || 5); g.globalAlpha = 1;
    });
    g.save(); g.beginPath(); g.rect(L + 1, T - 1, pw, ph + 2); g.clip();
    (spec.bands || []).forEach(function (b) { var ya = Y(Math.min(b.y1, spec.y[1])), yb = Y(Math.max(b.y0, spec.y[0])); g.fillStyle = b.color; g.fillRect(L + 1, ya, pw, yb - ya); });
    (spec.series || []).forEach(function (s) {
      var n = s.y.length, upto = s.upto == null ? n : Math.floor(n * s.upto); if (upto < 2) return;
      g.strokeStyle = s.color; g.lineWidth = s.width || 1.4; g.setLineDash(s.dash || []); g.lineJoin = 'round';
      g.beginPath();
      if (s.xs) { for (var i = 0; i < upto; i++) { var px = X(s.xs[i]), py = Y(s.y[i]); i ? g.lineTo(px, py) : g.moveTo(px, py); } }
      else {
        // min–max decimation per pixel column
        var x0 = s.x0 || 0, dx = s.dx, col = -1, mn = 0, mx = 0, first = true;
        for (i = 0; i < upto; i++) {
          var c = Math.round(X(x0 + i * dx)), v = s.y[i];
          if (c !== col) {
            if (col >= 0) { if (first) { g.moveTo(col, Y(mn)); first = false; } else g.lineTo(col, Y(mn)); if (mx !== mn) g.lineTo(col, Y(mx)); }
            col = c; mn = mx = v;
          } else { if (v < mn) mn = v; if (v > mx) mx = v; }
        }
        if (col >= 0 && !first) { g.lineTo(col, Y(mn)); g.lineTo(col, Y(mx)); }
      }
      g.stroke(); g.setLineDash([]);
    });
    (spec.points || []).forEach(function (p) {
      for (var i = 0; i < p.xs.length; i++) {
        if (p.ys[i] == null || !isFinite(p.ys[i])) continue;
        g.beginPath(); g.arc(X(p.xs[i]), Y(p.ys[i]), p.r || 3.2, 0, 6.2832);
        if (p.hollow) { g.fillStyle = spec.bg || '#0d1422'; g.fill(); g.strokeStyle = p.color; g.lineWidth = 1.4; g.stroke(); }
        else { g.fillStyle = p.color; g.fill(); }
      }
    });
    g.restore();
    (spec.labels || []).forEach(function (l) {
      g.fillStyle = l.color || O.C.soft; g.textAlign = l.align || 'left'; g.textBaseline = 'middle';
      g.font = (l.size || 10.5) + 'px ' + O.MONO;
      g.fillText(l.text, l.px != null ? l.px : X(l.x) + (l.dx || 0), l.py != null ? l.py : Y(l.y) + (l.dy || 0));
    });
    return { X: X, Y: Y, L: L, T: T, pw: pw, ph: ph };
  };
  O.expCurve = function (f, dt) {
    if (!f) return null;
    var n = Math.round((f.t1 - f.t0) / dt), y = new Float64Array(n);
    for (var i = 0; i < n; i++) y[i] = f.C + f.A * Math.exp(-i * dt / f.tau);
    return { y: y, x0: f.t0, dx: dt };
  };
})();
