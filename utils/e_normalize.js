
// Wilson型の簡易 E 正規化（MVP）
// E = F / sqrt(<F^2>)。本来は分解能シェルごとに <F^2> を評価する。
// TODO: d*（分解能）計算と B 因子推定を入れてシェル毎正規化へ拡張。
export function computeE(refWithF) {
  const F2 = refWithF.map(r => r.F * r.F);
  const meanF2 = F2.reduce((a,b)=>a+b,0) / Math.max(F2.length,1);
  const denom = Math.sqrt(meanF2 || 1e-12);
  const out = refWithF.map(r => ({ ...r, E: r.F / denom }));
  return { reflections: out, meanF2 };
}
