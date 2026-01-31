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
  );
  container.appendChild(ui);

  // --- Three.js ---
  const width = 512;
  const height = 512;

  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2");   // ★ WebGL2 を明示的に要求

  if (!gl) {
    container.innerHTML = "WebGL2 が利用できないため、3D 表示は無効です。";
    return;
  }

  const renderer = new THREE.WebGLRenderer({
    canvas,
    context: gl,
    antialias: true
  });
  renderer.setSize(width, height);
  container.appendChild(renderer.domElement);
    
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 1;

  // --- 3D Texture ---
  const tex3d = new THREE.Data3DTexture(data, N, N, N);
  tex3d.format = THREE.RedFormat;
  tex3d.type = THREE.FloatType;
  tex3d.minFilter = THREE.LinearFilter;
  tex3d.magFilter = THREE.LinearFilter;
  tex3d.unpackAlignment = 1;
  tex3d.needsUpdate = true;
    
  // --- Fullscreen quad ---
  const geometry = new THREE.PlaneGeometry(2, 2);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      volumeTex: { value: tex3d },
      threshold: { value: 0.2 },
      opacity: { value: 0.1 },
      lutTex: { value: null },
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
      precision highp sampler3D;   // ← これが必須！
      
      varying vec2 vUv;
      
      uniform sampler3D volumeTex;
      uniform sampler2D lutTex;
      uniform float threshold;
      uniform float opacity;
      uniform int cmap;

      void main() {
        vec3 rayDir = normalize(vec3(vUv - 0.5, 1.0));
        vec3 pos = vec3(vUv, 0.0);

        vec4 acc = vec4(0.0);

        for (int i = 0; i < 128; i++) {
          float v = texture(volumeTex, pos).r;

          if (v > threshold) {
            vec3 col = (cmap == 0)
              ? vec3(v)
              : texture(lutTex, vec2(v, 0.5)).rgb;

            acc.rgb += col * opacity;
            acc.a += opacity;
          }

          pos += rayDir * 0.01;
          if (pos.z > 1.0) break;
        }

        gl_FragColor = acc;
      }
    `
  });

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // --- Render loop ---
  function render() {
    material.uniforms.threshold.value = thresholdSlider.value / 100;
    material.uniforms.opacity.value = opacitySlider.value / 100;

    const cmap = cmapSel.selectedIndex;
    material.uniforms.cmap.value = cmap;

    if (cmap === 0) {
      material.uniforms.lutTex.value = null;
    } else if (cmap === 1) {
      material.uniforms.lutTex.value = magmaTex;
    } else {
      material.uniforms.lutTex.value = viridisTex;
    }

    renderer.render(scene, camera);
  }

  thresholdSlider.oninput = render;
  opacitySlider.oninput = render;
  cmapSel.onchange = render;

  render();
}
