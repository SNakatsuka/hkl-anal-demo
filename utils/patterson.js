// utils/patterson.js
export function buildPattersonGrid(reflections, { gridSize = 64 }) {
  // 1) 複素配列 F(hkl) をグリッドに詰める（位相0 → 実数 = |F|²）
  const N = gridSize;
  const real = new Float32Array(N*N*N);
  const imag = new Float32Array(N*N*N); // 0 のまま

  for (const r of reflections) {
    const h = ((r.h % N) + N) % N;
    const k = ((r.k % N) + N) % N;
    const l = ((r.l % N) + N) % N;
    const idx = h + N*(k + N*l);
    const F2 = r.F * r.F;
    real[idx] += F2; // 累積
  }

  // 2) 3D 逆FFT（MVP は JS の FFT ライブラリ or 自前で 1D×3）
  // ここは最初は「ダミーのガウス」でもよいくらい。まず描画パイプを通す。
  const rho = ifft3D(real, imag, N); // Float32Array N³

  return { gridSize: N, data: rho };
}
