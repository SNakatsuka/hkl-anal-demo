// ui/patterson_viewer.js
import * as THREE from '../../libs/three/three-esm.js';  // ← リネーム済み

export function renderPattersonViewer(container, pat) {
  const { gridSize: N, data } = pat;

  container.innerHTML = "";

  // --- UI ---
  const axisSel = document.createElement("select");
  axisSel.innerHTML = `
    <option value="z">Z スライス</option>
    <option value="y">Y スライス</option>
    <option value="x">X スライス</option>
  `;

  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = 0;
  slider.max = N - 1;
  slider.value = Math.floor(N / 2);

  const cmapSel = document.createElement("select");
  cmapSel.innerHTML = `
    <option value="gray">Gray</option>
    <option value="magma">Magma</option>
    <option value="viridis">Viridis</option>
  `;

  const ui = document.createElement("div");
  ui.style.marginBottom = "8px";
  ui.append(axisSel, slider, cmapSel);
  container.appendChild(ui);

  // --- Three.js ---
  const width = 512;
  const height = 512;

  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(width, height);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 1;

  // --- Plane + ShaderMaterial ---
  const geometry = new THREE.PlaneGeometry(2, 2);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      sliceTex: { value: null },
      cmap: { value: 0 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D sliceTex;
      uniform int cmap;

      vec3 gray(float v) {
        return vec3(v);
      }

      vec3 magma(float v) {
        return vec3(
          pow(v, 0.25),
          pow(v, 0.5),
          v
        );
      }

      vec3 viridis(float v) {
        return vec3(
          0.2 + 0.8*v,
          0.1 + 0.9*v,
          0.3 + 0.7*v
        );
      }

      void main() {
        float v = texture2D(sliceTex, vUv).r;

        vec3 col;
        if (cmap == 0) col = gray(v);
        else if (cmap == 1) col = magma(v);
        else col = viridis(v);

        gl_FragColor = vec4(col, 1.0);
      }
    `
  });

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // --- スライス抽出 ---
  function extractSlice(axis, idx) {
    const slice = new Float32Array(N * N);

    if (axis === "z") {
      for (let y = 0; y < N; y++)
        for (let x = 0; x < N; x++)
          slice[y*N + x] = data[idx*N*N + y*N + x];
    }
    else if (axis === "y") {
      for (let z = 0; z < N; z++)
        for (let x = 0; x < N; x++)
          slice[z*N + x] = data[z*N*N + idx*N + x];
    }
    else { // x
      for (let z = 0; z < N; z++)
        for (let y = 0; y < N; y++)
          slice[z*N + y] = data[z*N*N + y*N + idx];
    }

    return slice;
  }

  // --- 描画 ---
  function render() {
    const axis = axisSel.value;
    const idx = parseInt(slider.value);
    const cmap = cmapSel.selectedIndex;

    const slice = extractSlice(axis, idx);

    const tex = new THREE.DataTexture(
      slice,
      N,
      N,
      THREE.RedFormat,
      THREE.FloatType
    );
    tex.needsUpdate = true;

    material.uniforms.sliceTex.value = tex;
    material.uniforms.cmap.value = cmap;

    renderer.render(scene, camera);
  }

  axisSel.onchange = render;
  slider.oninput = render;
  cmapSel.onchange = render;

  render();
}
