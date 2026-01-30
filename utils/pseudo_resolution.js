// utils/pseudo_resolution.js
export function buildPseudoResolutionBins(reflections, nbin = 20) {
  // R = h²+k²+l²
  const arr = reflections.map((r, idx) => ({
    idx,
    R: r.h*r.h + r.k*r.k + r.l*r.l
  })).sort((a,b) => a.R - b.R);

  const bins = Array.from({ length: nbin }, () => []);
  const perBin = Math.ceil(arr.length / nbin);

  arr.forEach((item, i) => {
    const b = Math.floor(i / perBin);
    bins[Math.min(b, nbin - 1)].push(item.idx);
  });

  return bins; // [ [idx, idx...], [idx...] ... ]
}
