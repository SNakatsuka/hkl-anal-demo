// utils/e_normalize_bins.js
export function renormalizeE_byBins(reflections, bins) {
  const meanF2 = bins.map(bin => {
    if (bin.length === 0) return 1;
    const vals = bin.map(i => reflections[i].F * reflections[i].F);
    const m = vals.reduce((a,b)=>a+b,0) / vals.length;
    return m || 1;
  });

  // E を再計算
  bins.forEach((bin, j) => {
    const m = meanF2[j];
    const scale = 1 / Math.sqrt(m);
    bin.forEach(i => {
      reflections[i].E = reflections[i].F * scale;
    });
  });

  return { reflections, meanF2 };
}
