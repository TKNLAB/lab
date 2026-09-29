/* figs-home.js — Home hero: single-channel bursts sum to a synaptic current (ensemble averaging).
   Adult muscle AChR after a brief ACh pulse at t = 0, −100 mV. Scheme: P (pre-opening latency) → A2O ⇌ A2C → AC (agonist leaves).
   b2 = 2000 s⁻¹, f2 = 50 000 s⁻¹, 2k− = 50 000 s⁻¹ → ~2 openings per burst, mean burst ≈ 1 ms. 30% failures.
   The decay τ of the average equals the mean burst duration (Anderson & Stevens, 1973). Needs trace-engine.js. */
(function () {
  var TE = window.TE; if (!TE || TE.__home) return; TE.__home = true;
  var I = -6.5, DT = 0.005, TW = 5, NS = Math.round(TW / DT), NMAX = 1000, FAIL = 0.3, LOOP = 12, ROWS = 8;
  var model = { rates: { P: { O: 1 / 0.15 }, O: { C: 2 }, C: { O: 50, X: 50 } }, level: { O: 1 } };

  TE.define('home', function (canvas) {
    var bankR = TE.rng(9001), bankN = 24000, nb1 = TE.noise(bankN, 0.4, 10, DT, bankR), nb2 = TE.noise(bankN, 1, 10, DT, bankR);
    var r = TE.rng(4242), cache = [], sum = new Float64Array(NS), count = 0, lastU = -1, fit = null;
    function sweep(k) {
      if (cache[k]) return cache[k];
      var y = new Float32Array(NS), ideal = new Float64Array(NS), fail = r() < FAIL, o1 = Math.floor(r() * bankN), o2 = Math.floor(r() * bankN), f = null;
      if (!fail) { TE.rasterize(TE.gillespie(model, 'P', TW, r), model.level, DT, ideal, NS, I); f = TE.filter(ideal, 10, DT, false); }
      for (var i = 0; i < NS; i++) {
        var v = f ? f[i] : 0, frac = f ? Math.min(1.5, Math.abs(v / I)) : 0;
        y[i] = v + nb1[(o1 + i) % bankN] + 0.25 * frac * nb2[(o2 + i) % bankN];
      }
      return (cache[k] = y);
    }
    function nAt(u) {
      if (u < 3.5) return 1 + Math.floor(u / 0.39);
      return Math.min(NMAX, Math.floor(10 * Math.pow(100, Math.min(1, (u - 3.5) / 6))));
    }
    function fitAvg() { // weighted log-linear fit of the simulated average after the peak
      var avg = new Float64Array(NS), pk = 0, ip = 0, i;
      for (i = 0; i < NS; i++) { avg[i] = sum[i] / count; if (avg[i] < pk) { pk = avg[i]; ip = i; } }
      var i0 = ip + Math.round(0.4 / DT), sw = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
      for (i = i0; i < NS; i++) {
        if (avg[i] > -0.12) continue;
        var x = i * DT, yv = Math.log(-avg[i]), w = avg[i] * avg[i];
        sw += w; sx += w * x; sy += w * yv; sxx += w * x * x; sxy += w * x * yv;
      }
      var sl = (sw * sxy - sx * sy) / (sw * sxx - sx * sx), ic = (sy - sl * sx) / sw;
      return { tau: -1 / sl, A: -Math.exp(ic), t0: i0 * DT };
    }
    function anchorTop() {
      var sec = canvas.closest('section'), h = sec && sec.querySelector('h1');
      var a = h && h.parentNode && h.parentNode.firstElementChild;
      return a ? a.getBoundingClientRect().top - canvas.getBoundingClientRect().top : null;
    }
    function panelX(P) { var x0 = P.x + 30, w = P.w - 30 - 38; return function (tm) { return x0 + tm / TW * w; }; }

    function drawSweeps(ctx, P, u, target, alpha) {
      var X = panelX(P), top = 46, rowH = (P.h - top) / ROWS, pxPA = rowH * 0.95 / 6.5, w1 = X(1) - X(0);
      ctx.fillStyle = TE.C.gold; ctx.fillRect(X(0) - 1, P.y - 12, 3, 6);
      TE.text(ctx, 'ACh', X(0) + 7, P.y - 6, { size: 10, color: TE.C.lab });
      TE.line(ctx, X(0) + 0.5, P.y - 3, X(0) + 0.5, P.y + P.h, 'rgba(241,212,154,0.2)', 1, [2, 4]);
      TE.text(ctx, 'single sweeps', P.x, P.y + 10, { size: 10 });
      TE.text(ctx, '−100 mV', P.x + P.w, P.y - 6, { size: 10, align: 'right' });
      if (5 * pxPA > 20) { pxPA = 20 / 5; }
      var shift = target < 10 ? Math.max(0, 1 - ((u % 0.39) / 0.22)) * rowH : 0;
      ctx.save(); ctx.beginPath(); ctx.rect(P.x, P.y + top, P.w, P.h - top); ctx.clip();
      for (var k = 0; k < Math.min(ROWS, count); k++) {
        var sw = cache[count - 1 - k], base = P.y + P.h - (k + 1) * rowH + shift + rowH * 0.02;
        ctx.globalAlpha = alpha * (k === 0 ? 1 : 0.35 + 0.5 * (1 - k / ROWS));
        ctx.beginPath();
        for (var i = 0; i < NS; i++) { var xx = X(i * DT), yy = base - sw[i] * pxPA; if (i) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); }
        ctx.strokeStyle = k === 0 ? '#ffffff' : TE.C.gold; ctx.lineWidth = 1; ctx.lineJoin = 'round'; ctx.stroke();
      }
      ctx.restore(); ctx.globalAlpha = alpha;
      TE.scaleBar(ctx, X(TW) + 4, P.y + 28, w1, 5 * pxPA, '5 pA', '1 ms', { right: true });
    }
    function drawAvg(ctx, P, u, alpha) {
      var X = panelX(P), w1 = X(1) - X(0), pxPA = (P.h - 24) / 7.2, y0 = P.y + 20;
      TE.text(ctx, 'ensemble average', P.x, P.y + 10, { size: 10 });
      TE.text(ctx, 'n = ' + count.toLocaleString('en-US'), P.x + P.w, P.y + 10, { size: 14, color: TE.C.gold, align: 'right', weight: 600 });
      TE.line(ctx, X(0), y0 + 0.5, X(TW), y0 + 0.5, 'rgba(241,212,154,0.18)', 1, [3, 4]);
      ctx.save(); ctx.beginPath(); ctx.rect(P.x, P.y + 15, P.w, P.h - 15); ctx.clip();
      ctx.beginPath();
      for (var i = 0; i < NS; i++) { var ya = y0 - (sum[i] / count) * pxPA; if (i) ctx.lineTo(X(i * DT), ya); else ctx.moveTo(X(i * DT), ya); }
      ctx.strokeStyle = TE.C.gold; ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore();
      if (fit) {
        var fu = TE.clamp((u - 8.6) / 0.8, 0, 1), tEnd = fit.t0 + (TW - fit.t0) * fu;
        ctx.beginPath();
        for (var tm = fit.t0; tm <= tEnd + 1e-9; tm += 0.02) { var yf = y0 - fit.A * Math.exp(-tm / fit.tau) * pxPA; if (tm === fit.t0) ctx.moveTo(X(tm), yf); else ctx.lineTo(X(tm), yf); }
        ctx.setLineDash([5, 4]); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.3; ctx.stroke(); ctx.setLineDash([]);
        if (fu > 0.3) {
          ctx.globalAlpha = alpha * TE.clamp((fu - 0.3) / 0.4, 0, 1);
          TE.text(ctx, 'τ_decay ≈ ' + fit.tau.toFixed(1) + ' ms', X(1.6), y0 + 3.2 * pxPA, { size: 12, color: TE.C.ink });
          TE.text(ctx, '= mean burst duration', X(1.6), y0 + 3.2 * pxPA + 16, { size: 11, color: TE.C.mute });
          ctx.globalAlpha = alpha;
        }
      }
      TE.scaleBar(ctx, X(TW) + 4, P.y + P.h - 14, w1, 2 * pxPA, '2 pA', '1 ms', { right: true });
    }
    function draw(ctx, W, H, t) {
      var u = t % LOOP;
      if (u < lastU) { r = TE.rng(4242); sum.fill(0); count = 0; fit = null; }
      lastU = u;
      var target = nAt(u);
      while (count < target) { var s = sweep(count); for (var i = 0; i < NS; i++) sum[i] += s[i]; count++; }
      if (count >= 500 && !fit) fit = fitAvg();
      var pad = Math.max(20, Math.min(40, W * 0.05)), left = Math.max(pad, (W - 1360) / 2 + pad), right = Math.min(W - pad, (W + 1360) / 2 - pad);
      var cap = canvas.closest('section'), capEl = cap && cap.querySelector('[data-fig-cap]'), cb = 44;
      var sec = canvas.closest('section'), h1 = sec && sec.querySelector('h1'), wrap = h1 && h1.parentNode;
      if (sec && wrap) { // make room above the headline so the figure never sits behind text (phones, short laptop windows)
        if (sec.__mh0 == null) sec.__mh0 = sec.style.minHeight;
        var need = Math.round(Math.max(78, cb + 34) + (right - left < 760 ? 344 : 304) + wrap.offsetHeight);
        var mh = sec.__mh0 ? 'max(' + need + 'px, ' + sec.__mh0 + ')' : need + 'px';
        if (sec.__mhs !== mh || sec.style.minHeight !== sec.__mhn) { sec.__mhs = mh; sec.style.minHeight = mh; sec.__mhn = sec.style.minHeight; }
      }
      var at = anchorTop(), y0 = Math.max(78, cb + 34), lim = at != null ? at - 60 : H * 0.5, y1 = Math.max(y0 + 170, lim), side = right - left >= 760;
      if (capEl && capEl.parentNode) { var cs = capEl.parentNode.style, cl = side ? right - 2 * Math.min(560, (right - left) * 0.44) - 56 : left, st = { top: Math.round(y1 + 14) + 'px', left: Math.round(cl) + 'px', right: Math.round(W - right) + 'px' }; for (var p in st) if (cs[p] !== st[p]) cs[p] = st[p]; }
      var alpha = (y1 > lim + 8 ? 0.4 : 1) * Math.max(0, Math.min(1, u / 0.4, (LOOP - u) / 0.5));
      ctx.save(); ctx.globalAlpha = alpha;
      if (side) {
        var pw = Math.min(560, (right - left) * 0.44), gx = right - 2 * pw - 56;
        drawSweeps(ctx, { x: gx, y: y0, w: pw, h: y1 - y0 }, u, target, alpha);
        drawAvg(ctx, { x: right - pw, y: y0, w: pw, h: y1 - y0 }, u, alpha);
      } else {
        var mid = y0 + (y1 - y0) * 0.56;
        drawSweeps(ctx, { x: left, y: y0, w: right - left, h: mid - y0 }, u, target, alpha);
        drawAvg(ctx, { x: left, y: mid + 16, w: right - left, h: y1 - mid - 16 }, u, alpha);
      }
      ctx.restore();
    }
    return { still: 11, draw: draw };
  });
})();

/* Bind, then gate (Home) — equilibrium two-site cyclic scheme for the adult muscle AChR.
   E0 = 7e-7, Kd = 100 µM (closed), Jd = 17 nM (open); detailed balance: E1 = E0·Kd/Jd, E2 = E0·(Kd/Jd)². No desensitisation.
   Canvases: <canvas data-fig="bindgate" data-part="cube|plot|strip" data-ach="log10 µM" data-e0f="E0 factor">. */
(function () {
  var TE = window.TE; if (!TE || TE.__bindgate) return; TE.__bindgate = true;
  var BG = TE.bindgate = { E0: 7e-7, Kd: 100, Jd: 0.017 };
  BG.weights = function (A, E0) {
    var a = A / BG.Kd, j = A / BG.Jd;
    return { C: 1, AC: a, CA: a, ACA: a * a, O: E0, AO: E0 * j, OA: E0 * j, AOA: E0 * j * j };
  };
  BG.po = function (A, E0) { var o = E0 * Math.pow(1 + A / BG.Jd, 2); return o / (Math.pow(1 + A / BG.Kd, 2) + o); };
  BG.E = function (n, E0) { return E0 * Math.pow(BG.Kd / BG.Jd, n); };
  BG.ec50 = function (E0) {
    var E2 = BG.E(2, E0), half = (BG.po(0, E0) + E2 / (1 + E2)) / 2, a = -4, b = 6;
    for (var k = 0; k < 60; k++) { var m = (a + b) / 2; if (BG.po(Math.pow(10, m), E0) < half) a = m; else b = m; }
    return Math.pow(10, (a + b) / 2);
  };
  var SUP = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  BG.sci = function (v) {
    if (v >= 0.01 && v < 1000) return v >= 10 ? String(Math.round(v)) : v.toPrecision(2);
    var e = Math.floor(Math.log10(v)), m = v / Math.pow(10, e);
    m = +m.toPrecision(2); if (m >= 10) { m /= 10; e++; } return (m === 1 ? '' : m + '×') + '10' + String(e).split('').map(function (ch) { return SUP[ch]; }).join('');
  };
  function params(c) {
    var l = parseFloat(c.getAttribute('data-ach')), f = parseFloat(c.getAttribute('data-e0f'));
    if (!(l === l)) l = Math.log10(30); if (!(f > 0)) f = 1;
    return { l: l, A: Math.pow(10, l), f: f, E0: BG.E0 * f };
  }
  function pct(p) { var v = p * 100; return (v >= 10 ? v.toFixed(0) : v >= 1 ? v.toFixed(1) : v >= 0.01 ? v.toFixed(2) : '<0.01') + '%'; }

  // [name, open (0/1), site 2 bound (depth), site 1 bound (right)]
  var NODES = [['C', 0, 0, 0], ['AC', 0, 0, 1], ['CA', 0, 1, 0], ['ACA', 0, 1, 1], ['O', 1, 0, 0], ['AO', 1, 0, 1], ['OA', 1, 1, 0], ['AOA', 1, 1, 1]];
  function drawCube(ctx, W, H, P) {
    var w8 = BG.weights(P.A, P.E0), S = 0, k; for (k in w8) S += w8[k];
    var fs = W < 420 ? 10.5 : 11.5, sm = W < 420, padL = fs * (sm ? 5.5 : 8), padR = fs * (sm ? 5.5 : 7.5), avail = Math.max(60, W - padL - padR), w = Math.min(avail * 0.64, W * 0.4), dx = Math.min(avail * 0.36, W * 0.2), x0 = padL + (avail - w - dx) / 2, y0 = H * (sm ? 0.3 : 0.36), dy = -H * (sm ? 0.13 : 0.15), h = H * (sm ? 0.42 : 0.46);
    var pos = {}; NODES.forEach(function (n) { pos[n[0]] = { x: x0 + n[3] * w + n[2] * dx, y: y0 + n[1] * h + n[2] * dy, n: n }; });
    TE.text(ctx, sm ? 'top: closed · bottom: open' : 'top face: closed · bottom face: open', 0, 12, { size: fs });
    for (var i = 0; i < 8; i++) for (var j = i + 1; j < 8; j++) {
      var A = NODES[i], B = NODES[j], diff = (A[1] !== B[1]) + (A[2] !== B[2]) + (A[3] !== B[3]);
      if (diff !== 1) continue;
      var gate = A[1] !== B[1], hidden = A[0] === 'OA' || B[0] === 'OA', pa = pos[A[0]], pb = pos[B[0]];
      TE.line(ctx, pa.x, pa.y, pb.x, pb.y, gate ? 'rgba(241,212,154,0.45)' : 'rgba(232,236,243,0.3)', 1.2, hidden ? [3, 4] : null);
    }
    var mid = x0 + w / 2, e0 = BG.sci(P.E0), e1 = BG.sci(BG.E(1, P.E0)), e2 = BG.sci(BG.E(2, P.E0));
    if (sm) {
      TE.text(ctx, 'Kd', mid, y0 - 8, { size: fs, color: TE.C.ink, align: 'center' });
      TE.text(ctx, 'Jd', mid, y0 + h + 18, { size: fs, color: TE.C.ink, align: 'center' });
      TE.text(ctx, 'E₀', x0 - 8, y0 + h / 2, { size: fs, color: TE.C.lab, align: 'right', base: 'middle' });
      TE.text(ctx, 'E₁', x0 + w + 7, y0 + h / 2, { size: fs, color: TE.C.lab, base: 'middle' });
      TE.text(ctx, 'E₂', x0 + w + dx + 7, y0 + dy + h / 2, { size: fs, color: TE.C.lab, base: 'middle' });
      TE.text(ctx, 'Kd = 100 µM (closed) · Jd = 17 nM (open)', 0, H - 24, { size: fs });
      TE.text(ctx, 'E₀ = ' + e0 + ' · E₁ = ' + e1 + ' · E₂ = ' + e2, 0, H - 7, { size: fs });
    } else {
      TE.text(ctx, 'bind · Kd = 100 µM', mid, y0 - 8, { size: fs, color: TE.C.ink, align: 'center' });
      TE.text(ctx, 'bind · Jd = 17 nM', mid, y0 + h + 20, { size: fs, color: TE.C.ink, align: 'center' });
      TE.text(ctx, 'gate', x0 - 10, y0 + h / 2 - 8, { size: fs, align: 'right', base: 'middle' });
      TE.text(ctx, 'E₀ ' + e0, x0 - 10, y0 + h / 2 + 8, { size: fs, color: TE.C.lab, align: 'right', base: 'middle' });
      TE.text(ctx, 'E₁ ' + e1, x0 + w + 8, y0 + h / 2 + 8, { size: fs, color: TE.C.lab, base: 'middle' });
      TE.text(ctx, 'E₁', x0 + dx + 6, y0 + dy + h / 2, { size: fs, color: 'rgba(241,212,154,0.6)', base: 'middle' });
      TE.text(ctx, 'E₂ ' + e2, x0 + w + dx + 8, y0 + dy + h / 2, { size: fs, color: TE.C.lab, base: 'middle' });
    }
    NODES.forEach(function (n) {
      var q = pos[n[0]], p = w8[n[0]] / S, sp = Math.sqrt(p), r = 3.5 + 15 * sp, open = n[1] === 1;
      var rgb = open ? '241,212,154' : '232,236,243';
      ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, 6.2832);
      ctx.fillStyle = 'rgba(' + rgb + ',' + (0.12 + 0.88 * sp).toFixed(3) + ')'; ctx.fill();
      ctx.strokeStyle = 'rgba(' + rgb + ',0.7)'; ctx.lineWidth = 1; ctx.stroke();
      var right = n[3] === 1, lx = right ? q.x + r + 7 : q.x - r - 7, ly = q.y + (n[2] && !right ? -7 : 0), al = right ? 'left' : 'right';
      TE.text(ctx, n[0], lx, ly - 6, { size: fs, color: TE.C.ink, align: al, base: 'middle' });
      TE.text(ctx, pct(p), lx, ly + 7, { size: fs, color: open ? TE.C.gold : TE.C.mute, align: al, base: 'middle', weight: 600 });
    });
  }

  function drawPlot(ctx, W, H, P) {
    var fs = W < 420 ? 10.5 : 11.5, L = 40, R = 24, T = 26, Bm = 44, pw = W - L - R, ph = H - T - Bm;
    var X = function (l) { return L + (l + 2) / 6 * pw; }, Y = function (p) { return T + (1 - p) * ph; };
    [0, 0.5, 1].forEach(function (v) {
      TE.line(ctx, L, Math.round(Y(v)) + 0.5, L + pw, Math.round(Y(v)) + 0.5, v ? TE.C.grid : TE.C.axis, 1);
      TE.text(ctx, v === 0.5 ? '0.5' : String(v), L - 8, Y(v), { size: fs, align: 'right', base: 'middle' });
    });
    TE.line(ctx, L + 0.5, T, L + 0.5, T + ph, TE.C.axis, 1);
    ['0.01', '0.1', '1', '10', '100', '1000', '10000'].forEach(function (s, k) {
      var x = Math.round(X(k - 2)) + 0.5;
      if (k) TE.line(ctx, x, T, x, T + ph, TE.C.grid, 1);
      TE.line(ctx, x, T + ph, x, T + ph + 4, TE.C.axis, 1);
      if (pw > 360 || k % 2 === 0) TE.text(ctx, pw > 360 ? s : ['10⁻²', '', '1', '', '10²', '', '10⁴'][k], x, T + ph + 16, { size: fs, align: 'center' });
    });
    TE.text(ctx, '[ACh] (µM)', L + pw / 2, T + ph + 36, { size: fs, align: 'center' });
    TE.text(ctx, 'Po', L, T - 10, { size: fs, color: TE.C.ink, align: 'left', base: 'bottom' });
    function curve(E0, col, lw, dash) {
      ctx.beginPath();
      for (var i = 0; i <= 300; i++) { var l = -2 + i / 50, xx = X(l), yy = Y(BG.po(Math.pow(10, l), E0)); if (i) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); }
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.setLineDash(dash || []); ctx.lineJoin = 'round'; ctx.stroke(); ctx.setLineDash([]);
    }
    if (P.f !== 1) curve(BG.E0, 'rgba(232,236,243,0.4)', 1.2, [4, 4]);
    curve(P.E0, TE.C.gold, 2);
    if (P.f !== 1) TE.text(ctx, 'wild type', X(3.95), Y(BG.po(1e4, BG.E0)) + (P.f > 1 ? 14 : -8), { size: fs, color: 'rgba(232,236,243,0.6)', align: 'right' });
    var cx = X(P.l), cy = Y(BG.po(P.A, P.E0));
    TE.line(ctx, cx + 0.5, cy, cx + 0.5, T + ph, 'rgba(255,255,255,0.25)', 1, [2, 3]);
    TE.line(ctx, L, cy + 0.5, cx, cy + 0.5, 'rgba(255,255,255,0.25)', 1, [2, 3]);
    ctx.beginPath(); ctx.arc(cx, cy, 5, 0, 6.2832); ctx.fillStyle = '#fff'; ctx.fill();
  }

  // Live C⇌O record at the current Po: mean open time 1 ms, opening rate Po/(1−Po) per ms, −6.5 pA at −100 mV, 10 kHz, 0.4 pA RMS.
  function strip(c) {
    var key = null, sc = null, last = 0, o = { windowMs: 40, rate: 9, range: [2.6, -8.4], levels: [{ v: 0, label: 'c' }, { v: -6.5, label: 'o' }], scale: { pA: 5, ms: 5 }, labelSize: 9 };
    function build(po) {
      var beta = Math.min(500, po / Math.max(1e-9, 1 - po)), open = TE.rng(817)() < po;
      sc = TE.scroller(TE.channelTrace({ seed: 818, dt: 0.01, fc: 10, i: -6.5, rms: 0.4, openRms: 0.25, segs: [
        { dur: 240, tail: 0, start: open ? 'O' : 'C', model: { rates: { C: { O: beta }, O: { C: 1 } }, level: { O: 1 } } }
      ] }), o);
    }
    return { still: 1.5, draw: function (ctx, W, H, t) {
      var P = params(c), po = BG.po(P.A, P.E0), k = po.toPrecision(3), now = performance.now();
      if (k !== key && (!sc || TE.reduce || now - last > 120)) { key = k; last = now; build(po); }
      TE.text(ctx, 'single channel at this [ACh]', 0, 10, { size: 10, color: TE.C.lab });
      TE.text(ctx, '−100 mV', W - 2, 10, { size: 10, align: 'right' });
      sc.draw(ctx, { x: 0, y: 24, w: W, h: H - 40 }, t);
    } };
  }

  TE.define('bindgate', function (c) {
    var part = c.getAttribute('data-part') || 'plot';
    if (part === 'strip') return strip(c);
    return { still: 0, key: function () { return c.getAttribute('data-ach') + '|' + c.getAttribute('data-e0f'); }, draw: function (ctx, W, H) { (part === 'cube' ? drawCube : drawPlot)(ctx, W, H, params(c)); } };
  });
})();
