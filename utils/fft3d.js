// utils/fft3d.js
import FFT from './fft.js';

/**
 * 3D IFFT using your existing 1D FFT implementation.
 * 外部依存ゼロ。x → y → z の順に 1D IFFT を適用する。
 *
 * @param {Float32Array} real - 実部 (N^3)
 * @param {Float32Array} imag - 虚部 (N^3)
 * @param {number} N - グリッドサイズ
 * @returns {Float32Array} real - IFFT 後の実部（= ρ(r)）
 */
export function inverseFFT3D(real, imag, N) {

  const fft = new FFT(N);

  // --- X 軸方向 ---
  for (let y = 0; y < N; y++) {
    for (let z = 0; z < N; z++) {

      // スライス抽出
      for (let x = 0; x < N; x++) {
        const idx = x*N*N + y*N + z;
        fft.real[x] = real[idx];
        fft.imag[x] = imag[idx];
      }

      // 1D IFFT
      fft.inverseTransform();

      // 戻す
      for (let x = 0; x < N; x++) {
        const idx = x*N*N + y*N + z;
        real[idx] = fft.real[x];
        imag[idx] = fft.imag[x];
      }
    }
  }

  // --- Y 軸方向 ---
  for (let x = 0; x < N; x++) {
    for (let z = 0; z < N; z++) {

      for (let y = 0; y < N; y++) {
        const idx = x*N*N + y*N + z;
        fft.real[y] = real[idx];
        fft.imag[y] = imag[idx];
      }

      fft.inverseTransform();

      for (let y = 0; y < N; y++) {
        const idx = x*N*N + y*N + z;
        real[idx] = fft.real[y];
        imag[idx] = fft.imag[y];
      }
    }
  }

  // --- Z 軸方向 ---
  for (let x = 0; x < N; x++) {
    for (let y = 0; y < N; y++) {

      for (let z = 0; z < N; z++) {
        const idx = x*N*N + y*N + z;
        fft.real[z] = real[idx];
        fft.imag[z] = imag[idx];
      }

      fft.inverseTransform();

      for (let z = 0; z < N; z++) {
        const idx = x*N*N + y*N + z;
        real[idx] = fft.real[z];
        imag[idx] = fft.imag[z];
      }
    }
  }

  return real; // 実部が ρ(r)
}
