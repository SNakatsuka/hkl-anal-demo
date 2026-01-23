// utils/extinction.js

// 偶奇判定
function isEven(n) { return (n & 1) === 0; }
function isOdd(n) { return (n & 1) !== 0; }

// --- robust median（winsorize + median + eps） ---
function robustMedian(arr, eps = 1e-6) {
  if (!arr.length) return 0 + eps;
  // winsorize 5%
  const sorted = [...arr].sort((a,b)=>a-b);
  const n = sorted.length;
  const lo = sorted[Math.max(0, Math.floor(n*0.05))];
  const hi = sorted[Math.min(n-1, Math.floor(n*0.95))];
  
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

export function analyzeExtinction(reflections, withE = false) {
  if (!reflections || reflections.length === 0) return null;

  // I 値を使う（あるいは |E| を使いたいなら withE を渡せば切り替え可能）
  const getVal = (r)=> {
    if (withE && Number.isFinite(r.E)) return Math.abs(r.E);
    return Math.abs(r.I);
  };

  // Primitive (基準)
  const P_all = reflections.map(getVal);
  const P_mean = robustMedian(P_all);

  // I 格子：h+k+l 偶数のみ
  const If = [], Ia = [];
  for (const r of reflections){
    const s = r.h + r.k + r.l;
    if (isOdd(s)) If.push(getVal(r)); else Ia.push(getVal(r));
  }
  const I_forbid = robustMedian(If), I_allow = robustMedian(Ia);

  // C 格子：h+k 偶数のみ
  const Cf = [], Ca = [];
  for (const r of reflections){
    const s = r.h + r.k;
    if (isOdd(s)) Cf.push(getVal(r)); else Ca.push(getVal(r));
  }
  const C_forbid = robustMedian(Cf), C_allow = robustMedian(Ca);

  // F 格子：全偶数 or 全奇数のみ
  const Ff = [], Fa = [];
  for (const r of reflections){
    if (allowedF(r.h, r.k, r.l)) Fa.push(getVal(r)); else Ff.push(getVal(r));
  }
  const F_forbid = robustMedian(Ff), F_allow = robustMedian(Fa);

  // R(hex) 格子
  const Rf = [], Ra = [];
  for (const r of reflections){
    if (allowedRhex(r.h, r.k, r.l)) Ra.push(getVal(r)); else Rf.push(getVal(r));
  }
  const R_forbid = robustMedian(Rf), R_allow = robustMedian(Ra);

  // forbidden/allow の ratio を小さい順にランキング
  const eps = 1e-12;
  const safeDiv = (a, b) => a / (b + eps);
  
  const scores = [
    { type: "I", ratio: safeDiv(I_forbid, I_allow), forbid:I_forbid, allow:I_allow },
    { type: "C", ratio: safeDiv(C_forbid, C_allow), forbid:C_forbid, allow:C_allow },
    { type: "F", ratio: safeDiv(F_forbid, F_allow), forbid:F_forbid, allow:F_allow },
    { type: "R(hex)", ratio: safeDiv(R_forbid, R_allow), forbid:R_forbid, allow:R_allow },
    { type: "P", ratio: 1.0, forbid:0, allow:P_mean }
  ];

  scores.sort((a,b)=> a.ratio - b.ratio);
  return { scores, best: scores[0] };
}
