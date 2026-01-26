// utils/screw.js
// 0k0 の直列条件から 2₁@b の有無を推定

export function analyzeScrew_0k0(reflections, presentMask, { minCount = 20 } = {}) {
  const sel = [];
  for (let i = 0; i < reflections.length; i++) {
    const r = reflections[i];
    if (r.h === 0 && r.l === 0) {
      sel.push({ k: r.k, present: !!presentMask[i] });
    }
  }
  const even = { total: 0, present: 0 };
  const odd  = { total: 0, present: 0 };
  for (const it of sel) {
    if ((it.k & 1) === 0) { even.total++; if (it.present) even.present++; }
    else                 { odd.total++;  if (it.present) odd.present++;  }
  }
  let call = "判定不可（データ不足）";
  let score = 0;
  if ((even.total + odd.total) >= minCount && even.total >= 5 && odd.total >= 5) {
    const oddRate  = odd.present  / Math.max(odd.total, 1);
    const evenRate = even.present / Math.max(even.total, 1);
    // “奇数がほぼ消え、偶数が十分出る”条件を2₁の指標に
    if (oddRate < 0.05 && evenRate > 0.2) {
      call = "2₁ screw (b-axis) に適合 0k0: k=2n）";
      const oddSuppression = Math.max(0, 0.05 - oddRate) / 0.05;  // 0〜1
      const evenPresence   = Math.max(0, evenRate - 0.2) / 0.8;   // 0〜1
      score = Math.min(1, 0.5*oddSuppression + 0.5*evenPresence);
    } else {
      call = "顕著な 2₁@b は見えない";
      score = 0.0;
    }
  }
  return { even, odd, call, score };
}
``
