// utils/extinction.js

// 追加20260123：有意差の閾値
const DELTA_MIN = 0.15;
const RATIO_WEAK = 0.90;

// 偶奇判定
function isEven(n) { return (n & 1) === 0; }
function isOdd(n) { return (n & 1) !== 0; }

// --- robust median（winsorize + median + eps） ---
function robustMedian(arr, eps = 1e-6, frac = 0.05) {
  if (!arr.length) return 0 + eps;
  // winsorize 5%
  const sorted = [...arr].sort((a,b)=>a-b);
  const n = sorted.length;
  const lo = sorted[Math.max(0, Math.floor(n*frac))];
  const hi = sorted[Math.min(n-1, Math.floor(n*(1-frac)))];
  
  const clipped = arr.map(x => Math.min(Math.max(x, lo), hi)).sort((x,y)=>x-y);

  // median
  const m = Math.floor(clipped.length/2);
  const med = (clipped.length % 2) ? clipped[m] : (clipped[m-1] + clipped[m]) / 2;
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

// 追加202601231832：比率差の z 近似（pooled）
function zTestProportions(kf, nf, ka, na) {
  if (nf<=0 || na<=0) return { z:0, p:1 };
  const pf = kf / nf, pa = ka / na;
  const p = (kf + ka) / (nf + na);
  const se = Math.sqrt(p*(1-p)*(1/nf + 1/na));
  if (se === 0) return { z:0, p:1 };
  const z = (pf - pa) / se;
  // 片側（禁制の方が小さいか）で十分だが、ここは両側 p にしておく
  const pval = 2 * (1 - cdfStdNormal(Math.abs(z)));
  return { z, p: Math.max(Math.min(pval,1), 0) };
}

// 標準正規の累積（近似）
function cdfStdNormal(x) {
  // Abramowitz–Stegun 近似 or erf ベース（簡易）
  const t = 1 / (1 + 0.2316419 * x);
  const b1=0.319381530, b2=-0.356563782, b3=1.781477937, b4=-1.821255978, b5=1.330274429;
  const poly = ((((b5*t + b4)*t + b3)*t + b2)*t + b1)*t;
  const pdf = Math.exp(-0.5*x*x) / Math.sqrt(2*Math.PI);
  const c = 1 - pdf * poly;
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


export function analyzeExtinction(reflections, withE = false, presentMask = null) {
  if (!reflections || reflections.length === 0) return null;

  // I 値を使う（あるいは |E| を使いたいなら withE を渡せば切り替え可能）
  const getVal = (r)=> {
    if (withE && Number.isFinite(r.E)) return Math.abs(r.E);
    return Math.abs(r.I);
  };
  
  // present/absent を内部で用意（外から渡されない場合）
  let pm = presentMask;
  if (!pm) {
    if (withE) {
      pm = reflections.map(r => Number.isFinite(r.E) && (r.E > 0.6)); // 推奨: E>0.6
    } else {
      const Ii = reflections.map(r => r.I).filter(Number.isFinite);
      const medI = robustMedian(Ii);
      const thr = medI * 0.05; // Iベースの簡易しきい値
      pm = reflections.map(r => Number.isFinite(r.I) && (r.I > thr));
    }
  }

  // Primitive (基準)
  const P_all = reflections.map(getVal);
  const P_mean = robustMedian(P_all);

  // I 格子：h+k+l 偶数のみ
  const If = [], Ia = []; // 強度リスト
  let nfI=0, naI=0, kfI=0, kaI=0; // present/total カウント
  for (let i=0; i<reflections.length; i++){
    const r = reflections[i];
    const s = r.h + r.k + r.l;
    if (isOdd(s)) { If.push(getVal(r)); nfI++; if (pm[i]) kfI++; }
    else          { Ia.push(getVal(r)); naI++; if (pm[i]) kaI++; }
  }
  const I_forbid = robustMedian(If), I_allow = robustMedian(Ia);

  // C 格子：h+k 偶数のみ
  const Cf = [], Ca = []; let nfC=0, naC=0, kfC=0, kaC=0;
  for (let i=0; i<reflections.length; i++){
    const r = reflections[i];
    const s = r.h + r.k;
    if (isOdd(s)) { Cf.push(getVal(r)); nfC++; if (pm[i]) kfC++; }
    else          { Ca.push(getVal(r)); naC++; if (pm[i]) kaC++; }
  }
  const C_forbid = robustMedian(Cf), C_allow = robustMedian(Ca);

  // F 格子：全偶数 or 全奇数のみ
  const Ff = [], Fa = []; let nfF=0, naF=0, kfF=0, kaF=0;
  for (let i=0; i<reflections.length; i++){
    const r = reflections[i];
    if (allowedF(r.h, r.k, r.l)) { Fa.push(getVal(r)); naF++; if (pm[i]) kaF++; }
    else                         { Ff.push(getVal(r)); nfF++; if (pm[i]) kfF++; }
  }
  const F_forbid = robustMedian(Ff), F_allow = robustMedian(Fa);

  // R(hex) 格子
  const Rf = [], Ra = []; let nfR=0, naR=0, kfR=0, kaR=0;
  for (let i=0; i<reflections.length; i++){
    const r = reflections[i];
    if (allowedRhex(r.h, r.k, r.l)) { Ra.push(getVal(r)); naR++; if (pm[i]) kaR++; }
    else                            { Rf.push(getVal(r)); nfR++; if (pm[i]) kfR++; }
  }
  const R_forbid = robustMedian(Rf), R_allow = robustMedian(Ra);

  // forbidden/allow の ratio を小さい順にランキング
  const eps = 1e-12;
  const safeDiv = (a, b) => a / (b + eps);
  
  const scores = [
    withPvals("I", I_forbid, I_allow, nfI, kfI, naI, kaI),
    withPvals("C", C_forbid, C_allow, nfC, kfC, naC, kaC),
    withPvals("F", F_forbid, F_allow, nfF, kfF, naF, kaF),
    withPvals("R(hex)", R_forbid, R_allow, nfR, kfR, naR, kaR),
    { type: "P", ratio: 1.0, forbid:0, allow:P_mean, counts:{ total: pm.length, present: pm.filter(Boolean).length }, pValue: null, confidenceStars: "★☆☆☆☆" }
  ];

  scores.sort((a,b)=> a.ratio - b.ratio);
  const best = scores[0];
  const second = scores[1] ?? { ratio: 1.0 };

  // 追加20260123：有意差評価と “未確定” ラベル
  const delta = Math.abs(second.ratio - best.ratio);
  const confident = (delta >= DELTA_MIN) && (best.ratio < RATIO_WEAK);

  const bestLabeled = { ...best };
  if (!confident) {
    bestLabeled.type = "P(?)"; // 未確定
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
      deltaMin: DELTA_MIN
    }
 };
}

// forbid/allow の中央値ベース比に加え、present 比率差の p 値と☆を付与
function withPvals(type, forb, allow, nf, kf, na, ka) {
  const ratio = forb / Math.max(allow, 1e-12);
  const { p } = zTestProportions(kf, nf, ka, na);
  return {
    type,
    ratio,
    forbid, allow,
    counts: { presentForbidden:kf, totalForbidden:nf, presentAllowed:ka, totalAllowed:na },
    pValue: p,
    confidenceStars: starsFromP(p)
  };
}
