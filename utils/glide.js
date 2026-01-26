// utils/glide.js
// h0l 帯域条件から a/c/n/d-glide をランク付け

export function analyzeGlide_h0l(reflections, presentMask, { minCount = 30 } = {}) {
  const sel = [];
  for (let i = 0; i < reflections.length; i++) {
    const r = reflections[i];
    if (r.k === 0) sel.push({ h: r.h, l: r.l, present: !!presentMask[i] });
  }

  const tests = {
    "a-glide (h=2n)":   (h,l)=> ((h & 1) === 0),
    "c-glide (l=2n)":   (h,l)=> ((l & 1) === 0),
    "n-glide (h+l=2n)": (h,l)=> (((h + l) & 1) === 0),
    "d-glide (h+l≡0 mod 4)": (h,l)=> (((h + l) & 3) === 0),
  };

  const lines = [];
  for (const [name, allow] of Object.entries(tests)) {
    let totAllow=0, preAllow=0, totForb=0, preForb=0;
    for (const it of sel) {
      const ok = allow(it.h, it.l);
      if (ok) { totAllow++; if (it.present) preAllow++; }
      else    { totForb++;  if (it.present) preForb++;  }
    }
    const forbRate = totForb ? (preForb / totForb) : 1;
    const allowRate= totAllow ? (preAllow / totAllow) : 0;
    const raw = forbRate + 0.2*(1-allowRate);
    const score = Math.max(0, 1 - raw);  // forbRate=0, allowRate=1 → score=1    
    lines.push({ name, forbRate, allowRate, score, counts:{ totAllow, preAllow, totForb, preForb } });
  }

  lines.sort((a,b)=> a.score - b.score);
  const best = lines[0];
  const enough =
    (best.counts.totAllow + best.counts.totForb) >= minCount &&
    best.counts.totAllow >= 5 &&
    best.counts.totForb >= 5;  
  const summary = enough
    ? `Top=${best.name}（禁制側 出現率 ${(100*best.forbRate).toFixed(2)}%） / 候補: ${lines.map(r=>`${r.name}:${(100*r.forbRate).toFixed(2)}%`).join(", ")}`
    : "判定不可（データ不足）";

  // 信頼度スコア（十分データがあり、forbiddenが明確に減っていれば高く）
  let confidence = 0.0;
  if (enough) {
    confidence = Math.max(0, 1 - Math.min(1, best.forbRate * 2));
  }

  return { summary, ranked: lines, best, confidence };
}
