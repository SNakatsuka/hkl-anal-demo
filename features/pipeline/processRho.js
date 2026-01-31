// features/pipeline/processRho.js
import { hklToGrid } from '../../utils/hkl_to_grid.js';
import { inverseFFT3D } from '../../utils/fft3d.js';
import { renderRhoVolumeViewer } from '../../ui/rho_volume_viewer.js';

export function processRho(ctx) {
  const { reflections, rhoContainer } = ctx;

  const N = 64;

  // HKL → F(hkl)
  const { real, imag } = hklToGrid(reflections, N);

  // IFFT → ρ(r)
  const rho = inverseFFT3D(real, imag, N);

  // 3D viewer へ
  renderRhoVolumeViewer(rhoContainer, {
    gridSize: N,
    data: rho
  });

  return rho;
}
