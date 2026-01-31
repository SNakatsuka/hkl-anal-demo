// utils/fft3d.js
import fft from 'ndarray-fft';
import ndarray from 'ndarray';

/**
 * 3D IFFT
 * @param {Float32Array} real - 実部 (N^3)
 * @param {Float32Array} imag - 虚部 (N^3)
 * @param {number} N - グリッドサイズ
 * @returns {Float32Array} rho - ρ(r) の実部 (N^3)
 */
export function inverseFFT3D(real, imag, N) {
  // ndarray に変換
  const realND = ndarray(real, [N, N, N]);
  const imagND = ndarray(imag, [N, N, N]);

  // -1 = IFFT
  fft(-1, realND, imagND);

  // 実部が ρ(r)
  return real;
}
