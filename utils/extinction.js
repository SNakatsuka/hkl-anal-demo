// utils/extinction.js

// 偶奇判定
function isEven(n) { return (n & 1) === 0; }
function isOdd(n) { return (n & 1) !== 0; }

export function analyzeExtinction(reflections, withE = null) {
  if (!reflections || reflections.length === 0) return null;

  // I 値を使う（あるいは |E| を使いたいなら withE を渡せば切り替え可能）
  const getVal = (r) => Math.abs(r.I);

  // Primitive (基準)
  const P_all = reflections.map(getVal);
  const P_mean = P_all.reduce((a,b)=>a+b,0) / P_all.length;

  // I 格子：h+k+l odd → forbidden
  const If = [];
  const Ia = [];
  for (const r of reflections) {
    const s = r.h + r.k + r.l;
    if (isOdd(s)) If.push(getVal(r)); else Ia.push(getVal(r));
  }
  const I_forbid = If.reduce((a,b)=>a+b,0) / Math.max(If.length,1);
  const I_allow  = Ia.reduce((a,b)=>a+b,0) / Math.max(Ia.length,1);

  // C 格子：h+k odd → forbidden
  const Cf = [];
  const Ca = [];
  for (const r of reflections) {
    const s = r.h + r.k;
    if (isOdd(s)) Cf.push(getVal(r)); else Ca.push(getVal(r));
  }
  const C_forbid = Cf.reduce((a,b)=>a+b,0) / Math.max(Cf.length,1);
  const C_allow  = Ca.reduce((a,b)=>a+b,0) / Math.max(Ca.length,1);

  // F 格子：許可される偶奇組のみ
  // E=even, O=odd
  function allowedF(h,k,l){
    const e = [isEven(h), isEven(k), isEven(l)]; // true=E
    // EEE, EOO, OEO, OOE のどれか
    const [H,K,L] = e;
    const ok1 = (H && K && L);           // EEE
    const ok2 = (H && !K && !L);         // EOO
    const ok3 = (!H && K && !L);         // OEO
    const ok4 = (!H && !K && L);         // OOE
    return ok1 || ok2 || ok3 || ok4;
  }
  const Ff = [], Fa = [];
  for (const r of reflections) {
    if (allowedF(r.h, r.k, r.l)) Fa.push(getVal(r));
    else Ff.push(getVal(r));
  }
  const F_forbid = Ff.reduce((a,b)=>a+b,0) / Math.max(Ff.length,1);
  const F_allow  = Fa.reduce((a,b)=>a+b,0) / Math.max(Fa.length,1);

  // forbidden/allow の ratio を小さい順にランキング
  const scores = [
    { type: "I", ratio: I_forbid / I_allow, forbid:I_forbid, allow:I_allow },
    { type: "C", ratio: C_forbid / C_allow, forbid:C_forbid, allow:C_allow },
    { type: "F", ratio: F_forbid / F_allow, forbid:F_forbid, allow:F_allow },
    { type: "P", ratio: 1.0, forbid:0, allow:P_mean }
  ];

  scores.sort((a,b)=>a.ratio - b.ratio); // 小さいほど「禁止反射が弱い」＝格子心の可能性大

  return {
    scores,
    best: scores[0]
  };
}
