// utils/patterson.js
import { ifft3D } from './simple_fft3d.js'; // MVP: 自前 or 小型ライブラリ

export function buildPattersonGrid(reflections, { gridSize = 64 }) {
  const N = gridSize;
  const real = new Float32Array(N*N*N);
  const imag = new Float32Array(N*N*N); // 0 のまま

  // --- 1) hkl → F² をグリッドに詰める ---
  for (const r of reflections) {
    const h = ((r.h % N) + N) % N;
    const k = ((r.k % N) + N) % N;
    const l = ((r.l % N) + N) % N;
    const idx = h + N*(k + N*l);
    real[idx] += r.F * r.F; // Patterson は |F|²
  }

  // --- 2) 逆 FFT ---
  const rho = ifft3D(real, imag, N); // Float32Array N³

  return { gridSize: N, data: rho };
}
