// utils/simple_fft3d.js
import FFT from './fft.js'; // 小型 FFT ライブラリ（後述）

// --- 1D 逆 FFT ---
function ifft1D(real, imag) {
  const N = real.length;
  const fft = new FFT(N);

  // 入力
  fft.real.set(real);
  fft.imag.set(imag);

  // 逆変換
  fft.inverseTransform();

  // 出力
  return {
    real: fft.real.slice(),
    imag: fft.imag.slice()
  };
}

// --- 3D 逆 FFT（x → y → z の順に 1D FFT） ---
export function ifft3D(real3D, imag3D, N) {
  const total = N * N * N;

  const real = new Float32Array(real3D);
  const imag = new Float32Array(imag3D);

  // --- X 方向 ---
  for (let z = 0; z < N; z++) {
    for (let y = 0; y < N; y++) {
      const base = z * N * N + y * N;
      const r = real.slice(base, base + N);
      const i = imag.slice(base, base + N);

      const out = ifft1D(r, i);
      real.set(out.real, base);
      imag.set(out.imag, base);
    }
  }

  // --- Y 方向 ---
  for (let z = 0; z < N; z++) {
    for (let x = 0; x < N; x++) {
      const r = new Float32Array(N);
      const i = new Float32Array(N);

      for (let y = 0; y < N; y++) {
        const idx = z * N * N + y * N + x;
        r[y] = real[idx];
        i[y] = imag[idx];
      }

      const out = ifft1D(r, i);

      for (let y = 0; y < N; y++) {
        const idx = z * N * N + y * N + x;
        real[idx] = out.real[y];
        imag[idx] = out.imag[y];
      }
    }
  }

  // --- Z 方向 ---
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const r = new Float32Array(N);
      const i = new Float32Array(N);

      for (let z = 0; z < N; z++) {
        const idx = z * N * N + y * N + x;
        r[z] = real[idx];
        i[z] = imag[idx];
      }

      const out = ifft1D(r, i);

      for (let z = 0; z < N; z++) {
        const idx = z * N * N + y * N + x;
        real[idx] = out.real[z];
        imag[idx] = out.imag[z];
      }
    }
  }

  return real; // Patterson は実数部だけで OK
}
