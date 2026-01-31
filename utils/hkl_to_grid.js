// utils/hkl_to_grid.js
export function hklToGrid(reflections, N) {
  const real = new Float32Array(N*N*N);
  const imag = new Float32Array(N*N*N);

  for (const r of reflections) {
    const { h, k, l, F, phase } = r;

    // wrap index into 0..N-1
    const hh = (h % N + N) % N;
    const kk = (k % N + N) % N;
    const ll = (l % N + N) % N;

    const idx = hh*N*N + kk*N + ll;

    real[idx] = F * Math.cos(phase);
    imag[idx] = F * Math.sin(phase);
  }

  return { real, imag };
}
