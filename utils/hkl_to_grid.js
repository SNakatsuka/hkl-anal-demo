//utils/hkl_to_grid.js
export function hklToGrid(reflections, N) {
  const real = new Float32Array(N*N*N);
  const imag = new Float32Array(N*N*N);

  for (const r of reflections) {
    const { h, k, l, F, phase } = r;
    const idx = ((h+N)%N)*N*N + ((k+N)%N)*N + ((l+N)%N);

    real[idx] = F * Math.cos(phase);
    imag[idx] = F * Math.sin(phase);
  }

  return { real, imag };
}
