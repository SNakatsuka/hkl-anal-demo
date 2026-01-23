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
  
  const clipped = arr.map(x => Math.min(Math.max(x, lo), hi));

  // median
  const b = clipped.sort((x,y)=>x-y);
  const m = Math.floor(b.length/2);
  const med = (b.length % 2) ? b[m] : (b[m-1] + b[m]) / 2;

  return med + eps; // ゼロ割れ防止
}

export function analyzeExtinction(reflections, withE = null) {
  if (!reflections || reflections.length === 0) return null;

  // I 値を使う（あるいは |E| を使いたいなら withE を渡せば切り替え可能）
  const getVal = (r) => {
    if (withE && Number.isFinite(r.E)) return Math.abs(r.E);
    return Math.abs(r.I);
  };

  // Primitive (基準)
  const P_all = reflections.map(getVal);
  const P_mean = robustMedian(P_all);

  // I 格子：h+k+l odd → forbidden
  const If = [];
  const Ia = [];
  for (const r of reflections) {
    const s = r.h + r.k + r.l;
    if (isOdd(s)) If.push(getVal(r)); else Ia.push(getVal(r));
  }
  const I_forbid = robustMedian(If);
  const I_allow  = robustMedian(Ia);

  // C 格子：h+k odd → forbidden
  const Cf = [];
  const Ca = [];
  for (const r of reflections) {
    const s = r.h + r.k;
    if (isOdd(s)) Cf.push(getVal(r)); else Ca.push(getVal(r));
  }
  const C_forbid = robustMedian(Cf);
  const C_allow  = robustMedian(Ca);

  // F 格子：EEE または OOO のみ許可
  function allowedF(h,k,l){
    const eH = isEven(h), eK = isEven(k), eL = isEven(l);
    const allEven  =  eH &&  eK &&  eL;   // EEE
    const allOdd   = !eH && !eK && !eL;   // OOO
    return allEven || allOdd;
  }
  
  const Ff = [], Fa = [];
  for (const r of reflections) {
    if (allowedF(r.h, r.k, r.l)) Fa.push(getVal(r));
    else Ff.push(getVal(r));
  }
  const F_forbid = robustMedian(Ff);
  const F_allow  = robustMedian(Fa);

  // forbidden/allow の ratio を小さい順にランキング
  const eps = 1e-12;
  const safeDiv = (a, b) => a / (b + eps);
  
  const scores = [
    { type: "I", ratio: safeDiv(I_forbid, I_allow), forbid:I_forbid, allow:I_allow },
    { type: "C", ratio: safeDiv(C_forbid, C_allow), forbid:C_forbid, allow:C_allow },
    { type: "F", ratio: safeDiv(F_forbid, F_allow), forbid:F_forbid, allow:F_allow },
    { type: "P", ratio: 1.0, forbid:0, allow:P_mean }
  ];

  scores.sort((a,b)=>a.ratio - b.ratio); // 小さいほど「禁止反射が弱い」＝格子心の可能性大

  return {
    scores,
    best: scores[0]
  };
}
