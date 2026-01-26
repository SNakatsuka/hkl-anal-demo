// utils/presence.js
// E 正規化後の present/absent 2値化と robustMedian を提供

export function robustMedian(arr, frac = 0.05, eps = 1e-6) {
  if (!arr || arr.length === 0) return eps;
  const sorted = [...arr].sort((a,b)=>a-b);
  const n = sorted.length;
  const lo = sorted[Math.max(0, Math.floor(n * frac))];
  const hi = sorted[Math.min(n - 1, Math.floor(n * (1 - frac)))];  
  const clipped = arr.map(x => Math.min(Math.max(x, lo), hi)).sort((a,b)=>a-b);
  const m = Math.floor(clipped.length/2);
  const med = (clipped.length % 2) ? clipped[m] : (clipped[m-1] + clipped[m]) / 2;
  return med + eps; // 0割り防止も兼ねる
}

// Eベース：E > threshold を“明確な存在”とする
export function buildPresentMaskE(reflectionsWithE, threshold = 0.6) {
  return reflectionsWithE.map(r => Number.isFinite(r.E) && (r.E > threshold));
}

// Iベース（必要時のみ）：全体中央値×fraction を閾値に
export function buildPresentMaskI(reflections, fraction = 0.05) {
  const medI = robustMedian(reflections.map(r => r.I).filter(Number.isFinite));
  const thr = medI * fraction;
  return reflections.map(r => Number.isFinite(r.I) && (r.I > thr));
}
``
