// utils/extinction.js

// 追加20260123：有意差の閾値
const DELTA_MIN  = 0.15;
const RATIO_WEAK = 0.90;

// 偶奇判定
function isEven(n) { return (n & 1) === 0; }
function isOdd(n)  { return (n & 1) !== 0; }

// --- robust median（winsorize + median + eps） ---
function robustMedian(arr, eps = 1e-6, frac = 0.05) {
  if (!arr.length) return 0 + eps;
  const sorted = [...arr].sort((a,b)=>a-b);
  const n = sorted.length;
  const lo = sorted[Math.max(0, Math.floor(n*frac))];
  const hi = sorted[Math.min(n-1, Math.floor(n*(1-frac)))];

  const clipped = arr
    .map(x => Math.min(Math.max(x, lo), hi))
    .sort((x,y)=>x-y);

  const m   = Math.floor(clipped.length/2);
  const med = (clipped.length % 2)
    ? clipped[m]
    : (clipped[m-1] + clipped[m]) / 2;

  return med + eps;
}

// F-centering: 全偶数 or 全奇数のみ許可
function allowedF(h,k,l){
  const eH = isEven(h), eK = isEven(k), eL = isEven(l);
  return ( eH &&  eK &&  eL) || (!eH && !eK && !eL);
}

// R(hexagonal axes): −h + k + l ≡ 3n
function allowedRhex(h,k,l){
  let v = (-h + k + l) % 3;
  if (v < 0) v += 3;
  return v === 0;
}

// 六方晶軸かどうかの簡易判定（セルがあれば）
function isHexagonalAxes(cell) {
  if (!cell) return false;
  const { a, b, alpha, beta, gamma } = cell;
  if (![a,b,alpha,beta,gamma].every(Number.isFinite)) return false;

  return (
    Math.abs(a - b) < 1e-3 &&
    Math.abs(gamma - 120) < 2 &&
    Math.abs(alpha - 90) < 2 &&
    Math.abs(beta  - 90) < 2
  );
}

// 追加202601231832：比率差の z 近似（pooled）
function zTestProportions(kf, nf, ka, na) {
  if (nf<=0 || na<=0) return { z:0, p:1 };
  const pf = kf / nf, pa = ka / na;
  const p  = (kf + ka) / (nf + na);
  const se = Math.sqrt(p*(1-p)*(1/nf + 1/na));
  if (se === 0) return { z:0, p:1 };
  const z = (pf - pa) / se;
  const pval = 2 * (1 - cdfStdNormal(Math.abs(z)));
  return { z, p: Math.max(Math.min(pval,1), 0) };
}

// 標準正規の累積（近似）
function cdfStdNormal(x) {
  const t = 1 / (1 + 0.2316419 * x);
  const b1=0.319381530, b2=-0.356563782, b3=1.781477937, b4=-1.821255978, b5=1.330274429;
  const poly = ((((b5*t + b4)*t + b3)*t + b2)*t + b1)*t;
  const pdf  = Math.exp(-0.5*x*x) / Math.sqrt(2*Math.PI);
  const c    = 1 - pdf * poly;
  return x >= 0 ? c : 1 - c;
}

// p 値から☆を決める
function starsFromP(p) {
  if (p < 1e-3) return "★★★★★";
  if (p < 1e-2) return "★★★★☆";
  if (p < 5e-2) return "★★★☆☆";
  if (p < 1e-1) return "★★☆☆☆";
  return "★☆☆☆☆";
}

/**
 * Extinction / Lattice-centering 解析
 */
export function analyzeExtinction(reflections, withE=false, presentMask=null, options={}) {
  const { crystalSystem=null, cell=null } = options;

  // 自動判定
  let enableRhex = false;
  if (crystalSystem === "trigonal") enableRhex = true;
  if (isHexagonalAxes(cell))        enableRhex = true;

  // 手動 override（必要なら）
  if (options.enableRhex === true)  enableRhex = true;
  if (options.enableRhex === false) enableRhex = false;

  if (!reflections || reflections.length === 0) return null;

  const getVal = (r)=> {
    if (withE && Number.isFinite(r.E)) return Math.abs(r.E);
    return Math.abs(r.I);
  };

  let pm = presentMask;
  if (!pm || pm.length !== reflections.length) {
    if (withE) {
      pm = reflections.map(r => Number.isFinite(r.E) && (r.E > 0.6));
    } else {
      const Ii   = reflections.map(r => r.I).filter(Number.isFinite);
      const medI = robustMedian(Ii);
      const thr  = medI * 0.05;
      pm = reflections.map(r => Number.isFinite(r.I) && (r.I > thr));
    }
  }

  const P_all  = reflections.map(getVal);
  const P_mean = robustMedian(P_all);

  // I
  const If = [], Ia = [];
  let nfI=0, naI=0, kfI=0, kaI=0;
  for (let i=0; i<reflections.length; i++){
    const r = reflections[i];
    const s = r.h + r.k + r.l;
    if (isOdd(s)) { If.push(getVal(r)); nfI++; if (pm[i]) kfI++; }
    else          { Ia.push(getVal(r)); naI++; if (pm[i]) kaI++; }
  }
  const I_forbid = robustMedian(If);
  const I_allow  = robustMedian(Ia);

  // C
  const Cf = [], Ca = [];
  let nfC=0, naC=0, kfC=0, kaC=0;
  for (let i=0; i<reflections.length; i++){
    const r = reflections[i];
    const s = r.h + r.k;
    if (isOdd(s)) { Cf.push(getVal(r)); nfC++; if (pm[i]) kfC++; }
    else          { Ca.push(getVal(r)); naC++; if (pm[i]) kaC++; }
  }
  const C_forbid = robustMedian(Cf);
  const C_allow  = robustMedian(Ca);

  // F
  const Ff = [], Fa = [];
  let nfF=0, naF=0, kfF=0, kaF=0;
  for (let i=0; i<reflections.length; i++){
    const r = reflections[i];
    if (allowedF(r.h, r.k, r.l)) { Fa.push(getVal(r)); naF++; if (pm[i]) kaF++; }
    else                         { Ff.push(getVal(r)); nfF++; if (pm[i]) kfF++; }
  }
  const F_forbid = robustMedian(Ff);
  const F_allow  = robustMedian(Fa);

  const scores = [
    withPvals("I", I_forbid, I_allow, nfI, kfI, naI, kaI),
    withPvals("C", C_forbid, C_allow, nfC, kfC, naC, kaC),
    withPvals("F", F_forbid, F_allow, nfF, kfF, naF, kaF),
    {
      type: "P",
      ratio: 1.0,
      forbid: 0,
      allow: P_mean,
      counts: {
        total: pm.length,
        present: pm.filter(Boolean).length
      },
      pValue: null,
      confidenceStars: "★☆☆☆☆"
    }
  ];

  if (enableRhex) {
    const Rf = [], Ra = [];
    let nfR=0, naR=0, kfR=0, kaR=0;
    for (let i=0; i<reflections.length; i++){
      const r = reflections[i];
      if (allowedRhex(r.h, r.k, r.l)) { Ra.push(getVal(r)); naR++; if (pm[i]) kaR++; }
      else                            { Rf.push(getVal(r)); nfR++; if (pm[i]) kfR++; }
    }
    const R_forbid = robustMedian(Rf);
    const R_allow  = robustMedian(Ra);
    scores.push(withPvals("R(hex)", R_forbid, R_allow, nfR, kfR, naR, kaR));
  }

  scores = scores.filter(s => Number.isFinite(s.ratio));
  scores.sort((a,b)=> a.ratio - b.ratio);
  const best   = scores[0];
  const second = scores[1] ?? { ratio: 1.0 };

  const delta     = Math.abs(second.ratio - best.ratio);
  const confident = (delta >= DELTA_MIN) && (best.ratio < RATIO_WEAK);

  const bestLabeled = { ...best };
  if (!confident) {
    bestLabeled.type = "P(?)";
  }

  return {
    scores,
    best: bestLabeled,
    center_confidence: confident ? "high" : "low",
    center_delta: delta,
    params: {
      withE,
      presentMaskProvided: !!presentMask,
      presentThresholdE: 0.6,
      presentThresholdIRatio: 0.05,
      winsorFrac: 0.05,
      ratioWeak: RATIO_WEAK,
      deltaMin: DELTA_MIN,
      enableRhex
    }
  };
}

function withPvals(type, forb, allow, nf, kf, na, ka) {
  const safeForb  = Number.isFinite(forb)  ? forb  : 0;
  const safeAllow = Number.isFinite(allow) ? allow : 1e-6;
  const ratio = safeForb / safeAllow;
  const { p } = zTestProportions(kf, nf, ka, na);
  return {
    type,
    ratio,
    forbid,
    allow,
    counts: {
      presentForbidden: kf,
      totalForbidden:   nf,
      presentAllowed:   ka,
      totalAllowed:     na
    },
    pValue: p,
    confidenceStars: starsFromP(p)
  };
}
