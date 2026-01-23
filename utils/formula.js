// utils/formula.js

export function parseFormula(str) {
  if (!str) return null;

  const re = /([A-Z][a-z]?)(\d*)/g;
  const out = {};
  let m;

  while ((m = re.exec(str)) !== null) {
    const elem = m[1];
    const num = m[2] ? parseInt(m[2], 10) : 1;
    out[elem] = (out[elem] || 0) + num;
  }
  return out;
}

// 平均原子番号（重元素の有無チェック）
export function meanZ(formulaObj) {
  if (!formulaObj) return null;

  const Z = {
    H:1, C:6, N:7, O:8, F:9, S:16, Cl:17, Br:35, I:53,
    // 必要に応じて追加
  };

  let sum = 0, count = 0;
  for (const [el, n] of Object.entries(formulaObj)) {
    if (Z[el]) {
      sum += Z[el] * n;
      count += n;
    }
  }
  return count > 0 ? sum / count : null;
}
