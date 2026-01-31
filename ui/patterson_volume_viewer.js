// ui/patterson_volume_viewer.js
import * as THREE from '../webgl/three-esm.js';
import { viridisLUT, magmaLUT } from './colormaps.js';

function makeLUTTexture(lutArray) {
  const tex = new THREE.DataTexture(
    lutArray,
    256, 1,
    THREE.RGBFormat,
    THREE.FloatType
  );
  tex.needsUpdate = true;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

const viridisTex = makeLUTTexture(viridisLUT);
const magmaTex   = makeLUTTexture(magmaLUT);

export function renderPattersonVolumeViewer(container, pat) {
  const { gridSize: N, data } = pat;

  container.innerHTML = "";

  // --- UI ---
  const thresholdSlider = document.createElement("input");
  thresholdSlider.type = "range";
  thresholdSlider.min = 0;
  thresholdSlider.max = 100;
  thresholdSlider.value = 20;

  const opacitySlider = document.createElement("input");
  opacitySlider.type = "range";
  opacitySlider.min = 1;
  opacitySlider.max = 100;
  opacitySlider.value = 10;

  const cmapSel = document.createElement("select");
  cmapSel.innerHTML = `
    <option value="gray">Gray</option>
    <option value="magma">Magma</option>
    <option value="viridis">Viridis</option>
  `;

  const ui = document.createElement("div");
  ui.style.marginBottom = "8px";
  ui.append(
    document.createTextNode("threshold "),
    thresholdSlider,
    document.createTextNode(" opacity "),
    opacitySlider,
    document.createTextNode(" colormap "),
    cmapSel
