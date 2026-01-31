// ui/patterson_viewer.js
import * as THREE from '../../libs/three/three-esm.js';

export function renderPattersonViewer(container, pat) {
  const { gridSize, data } = pat;

  container.innerHTML = ""; // reset
  const width = container.clientWidth;
  const height = 400;

  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(width, height);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(
    -1, 1, 1, -1, 0.1, 10
  );
  camera.position.z = 1;

  // --- 2D スライス用テクスチャ ---
  const sliceZ = Math.floor(gridSize / 2); // 中央スライス
  const slice = new Float32Array(gridSize * gridSize);

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const idx = x + gridSize * (y + gridSize * sliceZ);
      slice[x + gridSize * y] = data[idx];
    }
  }

  const tex = new THREE.DataTexture(
    slice,
    gridSize,
    gridSize,
    THREE.RedFormat,
    THREE.FloatType
  );
  tex.needsUpdate = true;

  const mat = new THREE.MeshBasicMaterial({ map: tex });
  const geo = new THREE.PlaneGeometry(2, 2);
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);

  renderer.render(scene, camera);
}
