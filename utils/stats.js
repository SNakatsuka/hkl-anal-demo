// utils/stats.js（新規ファイルにして import してOK）
export function eStats(withE) {
  const absE = withE.map(r => Math.abs(r.E)).filter(Number.isFinite);
  const n = absE.length;
  if (n === 0) return null;

  const mean = arr => arr.reduce((a,b)=>a+b,0) / arr.length;
  const pow = (x,p) => Math.pow(x,p);

  const e1 = mean(absE);
  const e2 = mean(absE.map(x => x*x));                      // ⟨|E|^2⟩
  const e3 = mean(absE.map(x => pow(x,3)));                 // ⟨|E|^3⟩
  const e4 = mean(absE.map(x => pow(x,4)));                 // ⟨|E|^4⟩
  const e2m1 = Math.abs(e2 - 1);                            // ⟨|E|^2⟩-1 の偏差
  const e2minus1_abs = mean(absE.map(x => Math.abs(x*x - 1))); // ⟨|E^2 - 1|⟩

  // 参考基準（理想値に近いかどうか）
  // acentric 理想: ⟨|E^2 - 1|⟩ ≈ 0.736
  // centric  理想: ⟨|E^2 - 1|⟩ ≈ 0.968
  const dA = Math.abs(e2minus1_abs - 0.736);
  const dC = Math.abs(e2minus1_abs - 0.968);
  const likely = (dA < dC) ? 'acentric（非セントロ）' : 'centric（セントロ）';

  return { 
  n, e1, e2, e3, e4,
  e2m1,
  e2minus1_abs,
  likely
};
