/* opto-fear.js — Module 3 engine: optical protocols at the auditory → lateral amygdala synapse.
   Plasticity: calcium-based bistable synapse of Graupner & Brunel (2012), PNAS 109:3991, with their
   published DP parameters (θd, θp, γd, γp, τ, σ, ρ*, w1/w0). Calcium per light pulse: presynaptic release
   with short-term depression (Tsodyks & Markram 1997) and an NMDA term that grows with postsynaptic
   depolarisation; the shock adds strong depolarisation and back-propagating spikes. Those calcium
   amplitudes are ours, chosen so the three published optical protocols and the paired-conditioning
   AMPA/NMDA change come out as published (Nabavi et al. 2014).
   Between events calcium decays exponentially, so time above each threshold is exact, and the synaptic
   variable is an Ornstein–Uhlenbeck process with piecewise-constant coefficients (Graupner & Brunel's
   own analytical treatment). Transition probabilities follow without sampling. Units: ms. */
(function () {
  if (window.FEAR) return;
  var F = window.FEAR = {};
  F.GB = { thD: 1, thP: 1.3, gD: 200, gP: 321.808, tau: 150000, sigma: 2.8284, rhoStar: 0.5, b: 5, tauCa: 20 };
  F.P = { Cpre: 3.74, U: 0.706, tauRec: 2690, kappa: 3.23, aU: 3.75, tauU: 17.35, uShock: 4.06, fShock: 40, Cpost: 0.506, mk: 0.1, beta0: 0.1324 };
  F.N2A = 2.4; // naive AMPA/NMDA ratio (Nabavi et al. 2014)

  function erf(x) { var t = 1 / (1 + 0.3275911 * Math.abs(x)), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; }
  function Phi(z) { return 0.5 * (1 + erf(z / Math.SQRT2)); }

  // Protocol definitions. A protocol is a list of blocks; each block is {pre:[ms], shock:[a,b]|null, rep:n}.
  F.PROTOCOLS = {
    cs: { label: 'Optical CS', note: '10 Hz, 2 ms pulses, 2 min', blocks: [{ pre: train(10, 1200), rep: 1 }] },
    ltd: { label: 'Optical LTD', note: '900 pulses at 1 Hz', blocks: [{ pre: train(1, 900), rep: 1 }] },
    ltp: { label: 'Optical LTP', note: '5 × 100 pulses at 100 Hz, 3 min apart', blocks: [{ pre: train(100, 100), rep: 5 }] },
    paired: { label: 'Paired conditioning', note: '10 × (1 s of 10 Hz light co-terminating with a 0.5 s shock)', blocks: [{ pre: train(10, 10), shock: [500, 1000], rep: 10 }] },
    unpaired: { label: 'Unpaired', note: 'Same light and shocks, ≥ 1 min apart', blocks: [{ pre: train(10, 10), rep: 10 }, { pre: [], shock: [0, 500], rep: 10 }] }
  };
  function train(f, n) { var a = []; for (var k = 0; k < n; k++) a.push(k * 1000 / f); return a; }
  F.train = train;

  // Events of one block, in time order.
  function events(bl, P) {
    var ev = bl.pre.map(function (t) { return { t: t, k: 0 }; });
    if (bl.shock) for (var t = bl.shock[0]; t < bl.shock[1]; t += 1000 / P.fShock) ev.push({ t: t + 0.5, k: 1 });
    ev.sort(function (a, b) { return a.t - b.t; });
    return ev;
  }
  // Affine map of one block on the synaptic variable: mean ← A·mean + B, var ← A²·var + Vq.
  // Also returns time above θp and above θd only. opt.mk: NMDA block.
  F.block = function (bl, opt) {
    var G = F.GB, P = Object.assign({}, F.P, opt && opt.P), mk = opt && opt.mk;
    var lp = (G.gP + G.gD) / G.tau, tp = G.gP / (G.gP + G.gD), Dp = 2 * G.sigma * G.sigma / G.tau, ld = G.gD / G.tau, Dd = G.sigma * G.sigma / G.tau;
    var A = 1, B = 0, Vq = 0, Tp = 0, Td = 0, c = 0, u = 0, x = 1, last = 0, ev = events(bl, P);
    function seg(l, tg, D, d) { if (d <= 0) return; var e = Math.exp(-l * d); A *= e; B = B * e + tg * (1 - e); Vq = Vq * e * e + D * (1 - e * e) / (2 * l); }
    function decay(d) {
      if (d <= 0) return;
      if (c > G.thD) {
        var dP = c > G.thP ? Math.min(d, G.tauCa * Math.log(c / G.thP)) : 0, dD = Math.min(d, G.tauCa * Math.log(c / G.thD)) - dP;
        seg(lp, tp, Dp, dP); seg(ld, 0, Dd, dD); Tp += dP; Td += dD;
      }
      c *= Math.exp(-d / G.tauCa); u *= Math.exp(-d / P.tauU); x = 1 - (1 - x) * Math.exp(-d / P.tauRec);
    }
    for (var i = 0; i < ev.length; i++) {
      var e = ev[i]; decay(e.t - last); last = e.t;
      var shock = bl.shock && e.t >= bl.shock[0] && e.t < bl.shock[1];
      if (e.k === 0) {
        var rel = P.U * x; x -= rel;
        var dep = u + (shock ? P.uShock : 0);
        c += P.Cpre * rel * (mk ? P.mk : 1) * (1 + P.kappa * dep);
        u += P.aU * rel;
      } else c += P.Cpost;
    }
    decay(400);
    return { A: A, B: B, V: Vq, Tp: Tp, Td: Td };
  };
  // Whole protocol → probabilities of DOWN→UP (U) and UP→DOWN (D) transitions.
  F.transitions = function (name, opt) {
    var pr = typeof name === 'string' ? F.PROTOCOLS[name] : name, A = 1, B = 0, V = 0, Tp = 0, Td = 0;
    pr.blocks.forEach(function (bl) {
      var m = F.block(bl, opt);
      for (var r = 0; r < (bl.rep || 1); r++) { A = m.A * A; B = m.A * B + m.B; V = m.A * m.A * V + m.V; Tp += m.Tp; Td += m.Td; }
    });
    var sd = Math.sqrt(Math.max(V, 1e-12)), rs = F.GB.rhoStar;
    return { U: 1 - Phi((rs - B) / sd), D: Phi((rs - (A + B)) / sd), Tp: Tp, Td: Td, A: A, B: B, sd: sd };
  };
  // Expected fraction of synapses in the UP state after a protocol, and the strength change.
  F.weight = function (beta) { return 1 + (F.GB.b - 1) * beta; };
  F.rel = function (beta) { return F.weight(beta) / F.weight(F.P.beta0); }; // strength relative to naive
  F.apply = function (beta, name, opt) { var t = F.transitions(name, opt); return { beta: beta * (1 - t.D) + (1 - beta) * t.U, t: t }; };

  // Calcium trace of the first block of a protocol, for plotting (dt in ms).
  F.trace = function (name, tEnd, dt, opt) {
    var bl = F.PROTOCOLS[name].blocks[(opt && opt.block) || 0], P = Object.assign({}, F.P, opt && opt.P), mk = opt && opt.mk, G = F.GB, ev = events(bl, P);
    var n = Math.round(tEnd / dt), y = new Float64Array(n), c = 0, u = 0, x = 1, j = 0;
    for (var i = 0; i < n; i++) {
      var t = i * dt;
      while (j < ev.length && ev[j].t <= t) {
        var e = ev[j], shock = bl.shock && e.t >= bl.shock[0] && e.t < bl.shock[1];
        if (e.k === 0) { var rel = P.U * x; x -= rel; c += P.Cpre * rel * (mk ? P.mk : 1) * (1 + P.kappa * (u + (shock ? P.uShock : 0))); u += P.aU * rel; } else c += P.Cpost;
        j++;
      }
      y[i] = c;
      c *= Math.exp(-dt / G.tauCa); u *= Math.exp(-dt / P.tauU); x = 1 - (1 - x) * Math.exp(-dt / P.tauRec);
    }
    return y;
  };

  /* ---------- circuit and behaviour ---------- */
  // LA drive to the optical CS ∝ synaptic strength; extinction adds inhibition onto the CeA output
  // (after Pape & Paré 2010). CR = sigmoid of drive minus inhibition. Values below are ours.
  F.B = { th: 1.30, s: 0.03, supMax: 0.62, frzMax: 0.18, frzBase: 0.03, extRate: 0.4 };
  // w: strength relative to naive; inh: extinction inhibition in the same units
  F.cr = function (w, inh) { var B = F.B; return 1 / (1 + Math.exp(-((w - (inh || 0)) - B.th) / B.s)); };
  // Lever-press record for one 2-min test: presses before, during and after the light (seeded).
  F.lever = function (supp, seed) {
    var r = window.OPTO.rng(seed || 9), rate = 14 / 60000, t = 0, out = [], tEnd = 360000;
    for (;;) {
      t += -Math.log(1 - r()) / rate; if (t >= tEnd) break;
      var keep = r(), inL = t >= 120000 && t < 240000;
      if (!inL || keep >= supp) out.push(t);
    }
    return out;
  };
})();
