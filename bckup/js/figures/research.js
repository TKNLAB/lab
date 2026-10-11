/* figs-research.js — Research hero: FLIPR Penta Ca²⁺ assay, TRPML3 + SN2 (concentration–response).
   Experiment it depicts: Adusumilli, Mathe, Shandilya & Nayak, bioRxiv 2025 (10.1101/2025.06.28.662125) —
   serum-starved HEK293T cells overexpressing TRPML3 respond to the TRPML3-specific agonist SN2 from 0.4 µM;
   vector-control cells barely respond below 50 µM.
   Left: ΔF/F0 = (F − F0)/F0 over 120 s at 1 Hz, SN2 added at 10 s. [SN2] 0.4, 1.2, 3.7, 11, 33 µM (3-fold) + vector at 33 µM.
   Right: peak ΔF/F0 (5-s running mean, so noise does not bias the peak) vs log [SN2], fitted by least squares with a Hill
   equation; EC50, nH and top are all free (top solved linearly for each EC50/nH), so the printed values are the figure's own fit.
   ILLUSTRATIVE (replace with plate data): generated with EC50 = 5 µM, nH = 1.2, Emax 1.0, τ_rise 5 s, τ_decay 170 s.
   Needs trace-engine.js (with rich text). */
(function () {
  var TE = window.TE; if (!TE || TE.__research) return; TE.__research = true;
  var CONC = [0.4, 1.2, 3.7, 11, 33], NT = 121, LOOP = 13, EC = 5, NH = 1.2, TOP = 1.0;
  var COL = ['#d9b46a', '#d09c43', '#c0842a', '#a86d1c', '#8f5a12'], VEC = '#8a8f99'; // mid-lightness golds: readable on dark and light themes
  function hill(c, ec, nh, top) { return top * Math.pow(c, nh) / (Math.pow(c, nh) + Math.pow(ec, nh)); }
  TE.define('research', function () {
    var r = TE.rng(2025), tr = [];
    function trace(amp) {
      var y = new Float32Array(NT), rise = 5, dec = 170, norm = 0, dip = 0.015 + r() * 0.01;
      for (var s = 0; s < 1100; s++) { var q = s / 10; norm = Math.max(norm, (1 - Math.exp(-q / rise)) * Math.exp(-q / dec)); }
      for (var k = 0; k < NT; k++) {
        var d = k - 10, v = 0;
        if (d >= 0) v = amp * (1 - Math.exp(-d / rise)) * Math.exp(-d / dec) / norm - dip * Math.exp(-d / 1.2);
        y[k] = v + TE.gauss(r) * 0.014;
      }
      var pk = -Infinity; for (k = 12; k < NT - 2; k++) { var m = (y[k - 2] + y[k - 1] + y[k] + y[k + 1] + y[k + 2]) / 5; if (m > pk) pk = m; }
      return { y: y, pk: pk };
    }
    CONC.forEach(function (c) { tr.push(trace(hill(c, EC, NH, TOP) * (1 + TE.gauss(r) * 0.04))); });
    var vec = trace(0.02);
    var best = { ec: 1, nh: 1, top: 1, sse: Infinity };
    for (var le = -1; le <= 2; le += 0.005) for (var nh = 0.5; nh <= 2.5; nh += 0.01) {
      var ec = Math.pow(10, le), sph = 0, shh = 0, sse = 0, i;
      for (i = 0; i < CONC.length; i++) { var h = hill(CONC[i], ec, nh, 1); sph += tr[i].pk * h; shh += h * h; }
      var tp = sph / shh;
      for (i = 0; i < CONC.length; i++) { var dd = tr[i].pk - tp * hill(CONC[i], ec, nh, 1); sse += dd * dd; }
      if (sse < best.sse) best = { ec: ec, nh: nh, top: tp, sse: sse };
    }
    function fmt(v) { return v >= 10 ? v.toFixed(0) : v.toFixed(1); }
    function draw(ctx, W, H, t) {
      var u = t % LOOP, fade = Math.max(0, Math.min(1, u / 0.4, (LOOP - u) / 0.5)), B = TE.heroBox(W, H, { y0: 0.14, y1: 0.84, maxW: 720 });
      ctx.save(); ctx.globalAlpha = B.a * fade;
      var side = B.w >= 480, fs = B.w < 420 ? 9.5 : 10;
      var P1, P2;
      if (side) { var lw = B.w * 0.56; P1 = { x: B.x + 40, y: B.y + 24, w: lw - 52, h: B.h - 64 }; P2 = { x: B.x + lw + 34, y: B.y + 24, w: B.w - lw - 42, h: B.h - 64 }; }
      else { var hh = (B.h - 96) / 2; P1 = { x: B.x + 40, y: B.y + 20, w: B.w - 48, h: hh }; P2 = { x: B.x + 40, y: B.y + hh + 84, w: B.w - 48, h: hh - 4 }; }
      // left: ΔF/F0 time courses
      var X = function (s) { return P1.x + s / 120 * P1.w; }, Y = function (v) { return P1.y + P1.h - (v + 0.1) / 1.3 * P1.h; };
      TE.line(ctx, P1.x, P1.y + P1.h + 0.5, P1.x + P1.w, P1.y + P1.h + 0.5, TE.C.axis, 1); TE.line(ctx, P1.x - 0.5, P1.y, P1.x - 0.5, P1.y + P1.h, TE.C.axis, 1);
      [0, 30, 60, 90, 120].forEach(function (s) { TE.line(ctx, X(s), P1.y + P1.h, X(s), P1.y + P1.h + 4, TE.C.axis, 1); TE.text(ctx, String(s), X(s), P1.y + P1.h + 16, { size: fs, align: 'center' }); });
      [0, 0.5, 1].forEach(function (v) { TE.line(ctx, P1.x - 4, Y(v), P1.x, Y(v), TE.C.axis, 1); TE.text(ctx, v.toFixed(1), P1.x - 7, Y(v), { size: fs, align: 'right', base: 'middle' }); });
      TE.text(ctx, 'time (s)', P1.x + P1.w / 2, P1.y + P1.h + 31, { size: fs, align: 'center' });
      ctx.save(); ctx.translate(P1.x - 32, P1.y + P1.h / 2); ctx.rotate(-Math.PI / 2); TE.text(ctx, 'Δ*{F} / *{F}_{0}', 0, 0, { size: fs, align: 'center', base: 'middle' }); ctx.restore();
      TE.line(ctx, P1.x, Y(0) + 0.5, P1.x + P1.w, Y(0) + 0.5, 'rgba(232,236,243,0.18)', 1, [3, 4]);
      TE.line(ctx, X(10) + 0.5, P1.y, X(10) + 0.5, P1.y + P1.h, 'rgba(241,212,154,0.7)', 1, [2, 3]);
      TE.text(ctx, 'SN2', X(10) + 5, P1.y + 10, { size: fs, color: TE.C.gold });
      TE.text(ctx, 'lighter → darker: 0.4 → 33 µM', P1.x + P1.w, P1.y - 8, { size: fs, align: 'right' });
      var shown = TE.clamp((u - 0.5) / 6, 0, 1) * (NT - 1);
      function path(y, col, lw) { ctx.beginPath(); for (var k = 0; k <= shown; k++) { if (k) ctx.lineTo(X(k), Y(y[k])); else ctx.moveTo(X(k), Y(y[k])); } ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.stroke(); }
      path(vec.y, VEC, 1.1);
      tr.forEach(function (w, i) { path(w.y, COL[i], 1.4); });
      if (shown >= NT - 1) TE.text(ctx, 'vector, 33 µM', P1.x + P1.w, Y(0.02) - 8, { size: fs, align: 'right', color: TE.C.ink });
      // right: concentration–response
      var LC0 = Math.log10(0.25), LC1 = Math.log10(50);
      var CX = function (lc) { return P2.x + (lc - LC0) / (LC1 - LC0) * P2.w; }, CY = function (v) { return P2.y + P2.h - v / 1.1 * P2.h; };
      TE.line(ctx, P2.x, P2.y + P2.h + 0.5, P2.x + P2.w, P2.y + P2.h + 0.5, TE.C.axis, 1); TE.line(ctx, P2.x - 0.5, P2.y, P2.x - 0.5, P2.y + P2.h, TE.C.axis, 1);
      [0, 0.5, 1].forEach(function (v) { TE.line(ctx, P2.x - 4, CY(v), P2.x, CY(v), TE.C.axis, 1); TE.text(ctx, v.toFixed(1), P2.x - 7, CY(v), { size: fs, align: 'right', base: 'middle' }); });
      [[0.4, '0.4'], [1, '1'], [10, '10'], [33, '33']].forEach(function (q) { var x = CX(Math.log10(q[0])); TE.line(ctx, x, P2.y + P2.h, x, P2.y + P2.h + 4, TE.C.axis, 1); TE.text(ctx, q[1], x, P2.y + P2.h + 16, { size: fs, align: 'center' }); });
      TE.text(ctx, '[SN2] (µM, log scale)', P2.x + P2.w / 2, P2.y + P2.h + 31, { size: fs, align: 'center' });
      TE.text(ctx, 'peak Δ*{F} / *{F}_{0}', P2.x - 20, P2.y - 8, { size: fs });
      var fc = TE.clamp((u - 8.0) / 1.0, 0, 1);
      if (fc > 0) {
        ctx.beginPath(); var l1 = LC0 + (LC1 - LC0) * TE.ease(fc);
        for (var lc = LC0; lc <= l1 + 1e-9; lc += 0.02) { var yy = CY(hill(Math.pow(10, lc), best.ec, best.nh, best.top)); if (lc === LC0) ctx.moveTo(CX(lc), yy); else ctx.lineTo(CX(lc), yy); }
        ctx.strokeStyle = TE.C.ink; ctx.lineWidth = 1.6; ctx.stroke();
      }
      tr.forEach(function (w, i) {
        var tp = u - (6.7 + i * 0.22); if (tp < 0) return;
        var a = Math.min(1, tp / 0.3), pulse = tp < 0.5 ? 1 + 0.8 * (1 - tp / 0.5) : 1;
        ctx.globalAlpha = B.a * fade * a; ctx.beginPath(); ctx.arc(CX(Math.log10(CONC[i])), CY(w.pk), 4.5 * pulse, 0, 6.2832);
        ctx.fillStyle = COL[i]; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1; ctx.stroke();
      });
      ctx.globalAlpha = B.a * fade;
      if (u > 9.2) {
        ctx.globalAlpha = B.a * fade * TE.clamp((u - 9.2) / 0.5, 0, 1);
        TE.text(ctx, 'EC_{50} = ' + fmt(best.ec) + ' µM', P2.x + P2.w, CY(0.24), { size: 11, color: TE.C.ink, align: 'right' });
        TE.text(ctx, '*{n}_{H} = ' + best.nh.toFixed(1), P2.x + P2.w, CY(0.24) + 16, { size: 11, color: TE.C.ink, align: 'right' });
      }
      ctx.restore();
    }
    return { still: 11, draw: draw };
  });
})();
