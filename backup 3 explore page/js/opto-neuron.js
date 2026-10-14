/* opto-neuron.js — Module 2 engine for the Explore pages. Requires opto-engine.js (window.OPTO).
   1. Stochastic ChR2 channels: chain-binomial simulation of N copies of the four-state scheme.
   2. A Hodgkin–Huxley membrane driven by the ChR2 photocurrent (RK4, 10 µs).
   3. A conductance-based leaky integrate-and-fire network (80% E, 20% I) with per-cell ChR2.
   Deterministic for a given seed. Units: ms, mV, µA/cm² (HH), pA (channels). */
(function () {
  if (window.NEURO) return;
  var O = window.OPTO, N = window.NEURO = {};

  /* ---------- helpers ---------- */
  function gauss(r) { return Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(6.283185307 * r()); }
  function binom(n, p, r) {
    if (n <= 0 || p <= 0) return 0; if (p >= 1) return n;
    var m = n * p, k, i;
    if (n < 30) { k = 0; for (i = 0; i < n; i++) if (r() < p) k++; return k; }
    if (m < 12) { var L = Math.exp(-m), q = 1, c = 0; do { c++; q *= r(); } while (q > L && c < 200); return Math.min(n, c - 1); }
    k = Math.round(m + Math.sqrt(m * (1 - p)) * gauss(r));
    return k < 0 ? 0 : k > n ? n : k;
  }
  N.binom = binom;
  // Rates at −60 mV for one light level, with the voltage-dependent parts returned as functions.
  function rateSet(c, irr) {
    var r = O.rates(Object.assign({}, c, { irr: irr, V: -60 }));
    var g0 = 0.075 + 0.043 * Math.tanh(-(-60 + 20) / 20), fG = r.Gd1 / g0, gr0 = r.Gr;
    r.Gd1V = function (V) { return fG * (0.075 + 0.043 * Math.tanh(-(V + 20) / 20)); };
    r.GrV = function (V) { return gr0 * Math.exp(-0.0211539274 * (V + 60)); };
    r.amp = (O.VARIANTS[c.variant] || O.VARIANTS.h134r).amp;
    return r;
  }

  /* ---------- 1. stochastic channels ---------- */
  // N channels at fixed V. Light on from pre to pre+dur. Returns open-equivalent count (O1 + γ·O2) per sample.
  N.UNIT_PA = -0.005; // single O1 channel at −60 mV: ~80 fS × 60 mV
  N.channels = function (o) {
    var dt = o.dt || 0.05, n = Math.round((o.pre + o.dur + o.post) / dt), r = O.rng(o.seed || 1), g = O.P.gamma;
    var on = rateSet(o, o.irr), off = rateSet(o, 0), Nc = o.N;
    var c1 = Nc, o1 = 0, o2 = 0, c2 = 0, p = 0, out = new Float64Array(n);
    var iOn = Math.round(o.pre / dt), iOff = Math.round((o.pre + o.dur) / dt);
    for (var i = 0; i < n; i++) {
      var L = i >= iOn && i < iOff, R = L ? on : off;
      p += ((L ? 1 : 0) - p) * (1 - Math.exp(-dt / O.P.tauP));
      var a1 = R.k1 * p, a2 = R.k2 * p;
      var x1 = binom(c1, 1 - Math.exp(-a1 * dt), r);                                    // C1→O1
      var lo1 = binom(o1, 1 - Math.exp(-(R.Gd1 + R.e12) * dt), r), y12 = binom(lo1, R.e12 / (R.Gd1 + R.e12), r); // O1→O2 | O1→C1
      var lo2 = binom(o2, 1 - Math.exp(-(R.e21 + R.Gd2) * dt), r), y21 = binom(lo2, R.e21 / (R.e21 + R.Gd2), r); // O2→O1 | O2→C2
      var tc2 = a2 + R.Gr, lc2 = tc2 > 0 ? binom(c2, 1 - Math.exp(-tc2 * dt), r) : 0, z2 = tc2 > 0 ? binom(lc2, a2 / tc2, r) : 0; // C2→O2 | C2→C1
      c1 += -x1 + (lo1 - y12) + (lc2 - z2);
      o1 += x1 - lo1 + y21;
      o2 += y12 - lo2 + z2;
      c2 += (lo2 - y21) - lc2;
      out[i] = o1 + g * o2;
    }
    return { open: out, dt: dt, N: Nc };
  };
  // Deterministic open-equivalent fraction (O1 + γ·O2) for the same protocol.
  N.openFraction = function (o, dt) {
    var c = Object.assign({}, o, { V: o.V == null ? -60 : o.V });
    var r = O.protocol(c, [{ d: o.pre }, { d: o.dur, irr: o.irr }, { d: o.post }], dt);
    var k = O.scale * O.rates(Object.assign({}, c, { irr: 0 })).drive, f = new Float64Array(r.i.length);
    for (var i = 0; i < f.length; i++) f[i] = r.i[i] / k;
    return f;
  };

  /* ---------- 2. HH membrane + ChR2 ---------- */
  N.HH = { gNa: 120, gK: 36, gL: 0.3, ENa: 50, EK: -77, EL: -54.387, C: 1 };
  function am(V) { var x = V + 40; return Math.abs(x) < 1e-7 ? 1 : 0.1 * x / (1 - Math.exp(-x / 10)); }
  function bm(V) { return 4 * Math.exp(-(V + 65) / 18); }
  function ah(V) { return 0.07 * Math.exp(-(V + 65) / 20); }
  function bh(V) { return 1 / (1 + Math.exp(-(V + 35) / 10)); }
  function an(V) { var x = V + 55; return Math.abs(x) < 1e-7 ? 0.1 : 0.01 * x / (1 - Math.exp(-x / 10)); }
  function bn(V) { return 0.125 * Math.exp(-(V + 65) / 80); }
  var GC = 25; // µA/cm² of ChR2 current at −60 mV for the normalised −1 nA H134R peak (our scaling)
  N.HH_T = 12;  // HH rates scaled from 6.3 °C with Q10 = 3
  N.GC = GC;
  N.cell = function (o) {
    var H = N.HH, phi = Math.pow(3, ((o.hhT == null ? N.HH_T : o.hhT) - 6.3) / 10), c = { variant: o.variant || 'h134r', T: o.T == null ? 22 : o.T, wl: o.wl || 470 };
    var dt = o.dt || 0.01, rec = o.rec || 0.05, tEnd = o.tEnd, ns = Math.round(tEnd / dt), every = Math.round(rec / dt);
    var pulses = o.pulses || [], cache = {}, dark = rateSet(c, 0), gc = (o.gc == null ? GC : o.gc) * O.scale, gam = O.P.gamma;
    var y = o.y0 ? o.y0.slice() : N.rest(o.hhT), t = 0, V = new Float32Array(Math.ceil(ns / every)), I = new Float32Array(V.length), spikes = [], up = false, pi = 0;
    var rng = O.rng(o.seed || 7), ou = 0, tauN = 5, sN = o.noise || 0, Ib = o.bias || 0;
    var dy = new Float64Array(8), k1 = new Float64Array(8), k2 = new Float64Array(8), k3 = new Float64Array(8), k4 = new Float64Array(8), tmp = new Float64Array(8);
    var R = dark, Lon = 0, Iin = 0;
    function f(s, out) {
      var v = s[0], m = s[1], h = s[2], n = s[3], O1 = s[4], O2 = s[5], C2 = s[6], p = s[7], C1 = 1 - O1 - O2 - C2;
      var gd1 = R.Gd1V(v), gr = R.GrV(v);
      var ich = gc * R.amp * O.rect(v) * (O1 + gam * O2);
      var iion = H.gNa * m * m * m * h * (v - H.ENa) + H.gK * n * n * n * n * (v - H.EK) + H.gL * (v - H.EL);
      out[0] = (Iin - iion - ich) / H.C;
      out[1] = phi * (am(v) * (1 - m) - bm(v) * m);
      out[2] = phi * (ah(v) * (1 - h) - bh(v) * h);
      out[3] = phi * (an(v) * (1 - n) - bn(v) * n);
      out[4] = R.k1 * p * C1 - (gd1 + R.e12) * O1 + R.e21 * O2;
      out[5] = R.k2 * p * C2 - (R.Gd2 + R.e21) * O2 + R.e12 * O1;
      out[6] = R.Gd2 * O2 - (R.k2 * p + gr) * C2;
      out[7] = (Lon - p) / O.P.tauP;
      return ich;
    }
    for (var s = 0; s < ns; s++) {
      while (pi < pulses.length && t >= pulses[pi].b) pi++;
      var P = pi < pulses.length && t >= pulses[pi].a ? pulses[pi] : null;
      if (P) { if (!cache[P.irr]) cache[P.irr] = rateSet(c, P.irr); R = cache[P.irr]; Lon = 1; } else { R = dark; Lon = 0; }
      if (sN) { ou += -ou * dt / tauN + sN * Math.sqrt(2 * dt / tauN) * gauss(rng); }
      Iin = Ib + ou;
      var ich = f(y, k1);
      for (var i = 0; i < 8; i++) tmp[i] = y[i] + 0.5 * dt * k1[i]; f(tmp, k2);
      for (i = 0; i < 8; i++) tmp[i] = y[i] + 0.5 * dt * k2[i]; f(tmp, k3);
      for (i = 0; i < 8; i++) tmp[i] = y[i] + dt * k3[i]; f(tmp, k4);
      for (i = 0; i < 8; i++) y[i] += dt * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) / 6;
      t += dt;
      if (!up && y[0] > 0) { up = true; spikes.push(t); } else if (up && y[0] < -20) up = false;
      if (s % every === 0) { V[s / every] = y[0]; I[s / every] = ich; }
    }
    return { V: V, I: I, dt: every * dt, spikes: spikes, y: y };
  };
  var restCache = {};
  N.rest = function (hhT) {
    var k = hhT == null ? N.HH_T : hhT; if (restCache[k]) return restCache[k].slice();
    var y = [-65, 0.053, 0.596, 0.318, 0, 0, 0, 0];
    restCache[k] = y; var r = N.cell({ tEnd: 300, hhT: k, y0: y, rec: 1 });
    restCache[k] = Array.prototype.slice.call(r.y); return restCache[k].slice();
  };
  // Lowest irradiance (mW/mm²) that fires one spike for a pulse of length d (ms). Bisection in log irradiance.
  N.threshold = function (o, d) {
    var lo = Math.log(0.005), hi = Math.log(100);
    var fires = function (li) { return N.cell(Object.assign({}, o, { pulses: [{ a: 5, b: 5 + d, irr: Math.exp(li) }], tEnd: d + 30, rec: 1 })).spikes.length > 0; };
    if (!fires(hi)) return null;
    for (var k = 0; k < 16; k++) { var m = (lo + hi) / 2; if (fires(m)) hi = m; else lo = m; }
    return Math.exp(hi);
  };
  // Pulse train: n pulses of width w at f Hz, starting at t0. Spike fidelity = fraction of pulses followed by ≥1 spike within min(period, 15 ms).
  N.train = function (o, f, n, w, irr) {
    var per = 1000 / f, t0 = 20, pulses = [];
    for (var k = 0; k < n; k++) pulses.push({ a: t0 + k * per, b: t0 + k * per + w, irr: irr });
    var tEnd = t0 + n * per + 60, r = N.cell(Object.assign({}, o, { pulses: pulses, tEnd: tEnd }));
    var win = Math.min(per, 15), hit = 0, extra = 0, used = {};
    pulses.forEach(function (p) { var inw = r.spikes.filter(function (s) { return s >= p.a && s < p.a + win; }); if (inw.length) hit++; extra += Math.max(0, inw.length - 1); inw.forEach(function (s) { used[s] = 1; }); });
    r.spikes.forEach(function (s) { if (!used[s]) extra++; });
    r.pulses = pulses; r.fidelity = hit / n; r.extra = extra; r.tEnd = tEnd; r.per = per;
    return r;
  };

  /* ---------- 3. network ---------- */
  // Conductance-based LIF (after Vogels & Abbott 2005 / Brette et al. 2007 COBA), N cells, 80% E.
  N.network = function (o) {
    var Nn = o.N || 400, NE = Math.round(Nn * 0.8), dt = 0.1, tEnd = o.tEnd || 1500, ns = Math.round(tEnd / dt);
    var r = O.rng(o.seed || 3), KE = Math.round(0.1 * NE), KI = Math.round(0.1 * (Nn - NE));
    var taum = 20, El = -60, Vt = -50, Vr = -60, Ee = 0, Ei = -80, te = 5, ti = 10, we = o.we || 0.1, wi = o.wi || 1, refE = 5, refI = 2;
    var nuX = o.nuX == null ? 6 : o.nuX, wx = o.wx || 0.1, KX = 100;  // external Poisson drive: KX inputs × nuX Hz
    // fixed in-degree: build outgoing lists
    var out = []; for (var i = 0; i < Nn; i++) out.push([]);
    for (i = 0; i < Nn; i++) {
      for (var k = 0; k < KE; k++) { var j = Math.floor(r() * NE); if (j === i) j = (j + 1) % NE; out[j].push(i); }
      for (k = 0; k < KI; k++) { j = NE + Math.floor(r() * (Nn - NE)); if (j === i) j = NE + ((j - NE + 1) % (Nn - NE)); out[j].push(i); }
    }
    // ChR2 expression and depth
    var r2 = O.rng((o.seed || 3) + 101), frac = o.frac == null ? 0.5 : o.frac, target = o.target || 'E', expr = new Uint8Array(Nn), depth = new Float64Array(Nn), bin = new Uint8Array(Nn), NB = 6;
    for (i = 0; i < Nn; i++) {
      var isE = i < NE, u = r2(); depth[i] = r2();
      if ((target === 'E' ? isE : !isE) && u < frac) expr[i] = 1;
      bin[i] = o.gradient ? Math.min(NB - 1, Math.floor(depth[i] * NB)) : 0;
    }
    // light: pulses (width pw) at f Hz between l0 and l1, or continuous if f = 0
    var l0 = o.l0 == null ? 500 : o.l0, l1 = o.l1 == null ? 1000 : o.l1, f = o.f == null ? 10 : o.f, pw = o.pw || 5, irr = o.irr == null ? 2 : o.irr;
    var pre = l0, dur = l1 - l0, post = tEnd - l1, fr = [], c = { variant: o.variant || 'h134r', T: 22, wl: 470 };
    var segs = [{ d: pre }];
    if (f > 0) { var per = 1000 / f; for (var t = 0; t < dur - 1e-9; t += per) { segs.push({ d: Math.min(pw, dur - t), irr: 1 }); if (per - pw > 0 && t + pw < dur) segs.push({ d: Math.min(per - pw, dur - t - pw) }); } }
    else segs.push({ d: dur, irr: 1 });
    segs.push({ d: post });
    var k55 = O.scale * O.rates(Object.assign({ irr: 0, V: -60 }, c)).drive;
    for (var b = 0; b < (o.gradient ? NB : 1); b++) {
      var ib = o.gradient ? irr * Math.exp(-3 * (b + 0.5) / NB) : irr;
      var sg = segs.map(function (s) { return { d: s.d, irr: s.irr ? ib : 0 }; });
      var tr = O.protocol(Object.assign({ V: -60 }, c), sg, dt).i, a = new Float32Array(ns);
      for (i = 0; i < ns; i++) a[i] = (tr[i] || 0) / k55;
      fr.push(a);
    }
    var gcE = o.gc == null ? 3 : o.gc, r60 = O.rect(-60);
    var v = new Float64Array(Nn), ge = new Float64Array(Nn), gi = new Float64Array(Nn), refr = new Float64Array(Nn);
    for (i = 0; i < Nn; i++) { v[i] = Vr + r() * (Vt - Vr); ge[i] = r() * 0.5; gi[i] = r() * 2; }
    var px = nuX * dt / 1000, spikes = [], probe = o.probe == null ? -1 : o.probe;
    if (probe < 0) { for (i = 0; i < NE; i++) if (expr[i]) { probe = i; break; } if (probe < 0) probe = 0; }
    var pv = new Float32Array(ns), ee = Math.exp(-dt / te), ei = Math.exp(-dt / ti), fired = [];
    for (var s = 0; s < ns; s++) {
      fired.length = 0;
      for (i = 0; i < Nn; i++) {
        var nX = binom(KX, px, r); if (nX) ge[i] += wx * nX;
        if (refr[i] > 0) { refr[i] -= dt; v[i] = Vr; }
        else {
          var vi = v[i], drive = expr[i] ? gcE * fr[bin[i]][s] * 60 * O.rect(vi) / r60 : 0;
          v[i] = vi + dt * (El - vi + ge[i] * (Ee - vi) + gi[i] * (Ei - vi) + drive) / taum;
          if (v[i] >= Vt) { v[i] = Vr; refr[i] = i < NE ? refE : refI; fired.push(i); spikes.push([i, s * dt]); }
        }
        ge[i] *= ee; gi[i] *= ei;
      }
      for (k = 0; k < fired.length; k++) { var src = fired[k], tg = out[src], w = src < NE ? we : wi; for (j = 0; j < tg.length; j++) { if (src < NE) ge[tg[j]] += w; else gi[tg[j]] += w; } }
      pv[s] = fired.indexOf(probe) >= 0 ? 0 : v[probe];
    }
    // light pulse onsets
    var onsets = []; if (f > 0) for (t = l0; t < l1 - 1e-9; t += 1000 / f) onsets.push(t);
    return { spikes: spikes, N: Nn, NE: NE, expr: expr, depth: depth, probe: probe, pv: pv, dt: dt, tEnd: tEnd, l0: l0, l1: l1, f: f, pw: pw, onsets: onsets };
  };
  N.netStats = function (R) {
    var a = { E: [0, 0], I: [0, 0] }, pre = R.l0 - 0, dur = R.l1 - R.l0, lock = 0, nl = 0;
    R.spikes.forEach(function (s) {
      var k = s[0] < R.NE ? 'E' : 'I', t = s[1];
      if (t >= 100 && t < R.l0) a[k][0]++; else if (t >= R.l0 && t < R.l1) { a[k][1]++;
        if (k === 'E' && R.f > 0) { nl++; var ph = (t - R.l0) % (1000 / R.f); if (ph < 10) lock++; } }
    });
    var nE = R.NE, nI = R.N - R.NE;
    return { E0: a.E[0] / nE / ((R.l0 - 100) / 1000), E1: a.E[1] / nE / (dur / 1000), I0: a.I[0] / nI / ((R.l0 - 100) / 1000), I1: a.I[1] / nI / (dur / 1000),
      lock: nl ? lock / nl : null, chance: R.f > 0 ? Math.min(1, 10 * R.f / 1000) : null };
  };
})();
