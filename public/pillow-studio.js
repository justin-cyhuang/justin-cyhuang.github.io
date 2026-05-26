// Pillow Studio
// Three.js via CDN ESM. 45×45 抱枕：載入 Blender GLB，套用三種布料材質，
// 支援上傳圖片、改底色、切換背景、自動旋轉。

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const canvas = document.getElementById('pillow-canvas');
const stage = document.getElementById('stage');
const hud = document.getElementById('hud');

// ---- Renderer / scene / camera ----
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = false;

const scene = new THREE.Scene();
scene.background = null; // CSS handles bg

const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
const defaultCamPos = new THREE.Vector3(0, 0.35, 2.2);
camera.position.copy(defaultCamPos);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 1.2;
controls.maxDistance = 4.0;
controls.target.set(0, 0, 0);

// ---- Lights ----
scene.add(new THREE.AmbientLight(0xffffff, 0.35));
scene.add(new THREE.HemisphereLight(0xffffff, 0xc8c0b0, 0.45));

// KEY light: 從觀眾右上後方 45°
const keyLight = new THREE.DirectionalLight(0xfff2e1, 1.6);
keyLight.position.set(2.5, 3.0, 3.5);
scene.add(keyLight);

// Fill：觀眾正前左方，較暗、偏冷
const fill = new THREE.DirectionalLight(0xcfd8ff, 0.45);
fill.position.set(-2.0, 0.8, 2.0);
scene.add(fill);

// Rim：分離抱枕與背景
const rim = new THREE.DirectionalLight(0xffe6c8, 0.25);
rim.position.set(0, -1.0, -3.0);
scene.add(rim);

// ---- Procedural fabric textures (color + normal + roughness)，由布料 profile 驅動 ----
function makeFabricTextures(baseColorHex, fabric) {
  const size = 512;
  const { period, repeat, weaveAlpha, noiseAmp, normalStrength } = fabric;

  // Color (albedo)
  const cc = document.createElement('canvas');
  cc.width = cc.height = size;
  const ctx = cc.getContext('2d');
  ctx.fillStyle = baseColorHex;
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * noiseAmp;
    img.data[i]     = Math.max(0, Math.min(255, img.data[i]     + n));
    img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1] + n));
    img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
  ctx.globalAlpha = weaveAlpha;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  for (let y = 0; y < size; y += 3) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke(); }
  for (let x = 0; x < size; x += 3) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size); ctx.stroke(); }
  ctx.globalAlpha = 1;
  const colorTex = new THREE.CanvasTexture(cc);
  colorTex.colorSpace = THREE.SRGBColorSpace;
  colorTex.wrapS = colorTex.wrapT = THREE.RepeatWrapping;
  colorTex.repeat.set(repeat, repeat);
  colorTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  // Normal map：模擬經緯交織
  const nc = document.createElement('canvas');
  nc.width = nc.height = size;
  const nctx = nc.getContext('2d');
  const nimg = nctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cellX = Math.floor(x / period);
      const cellY = Math.floor(y / period);
      const isWarp = (cellX + cellY) % 2 === 0;
      const lx = ((x % period) / period) * Math.PI;
      const ly = ((y % period) / period) * Math.PI;
      const h = isWarp ? Math.sin(lx) * 0.7 : Math.sin(ly) * 0.7;
      const noise = (Math.random() - 0.5) * 0.15;
      const height = h + noise;
      const i = (y * size + x) * 4;
      nimg.data[i]     = 128 + height * normalStrength;
      nimg.data[i + 1] = 128 + (isWarp ? Math.cos(lx) : Math.cos(ly)) * normalStrength * 0.83;
      nimg.data[i + 2] = 220;
      nimg.data[i + 3] = 255;
    }
  }
  nctx.putImageData(nimg, 0, 0);
  const normalTex = new THREE.CanvasTexture(nc);
  normalTex.wrapS = normalTex.wrapT = THREE.RepeatWrapping;
  normalTex.repeat.set(repeat, repeat);
  normalTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  // Roughness map
  const rc = document.createElement('canvas');
  rc.width = rc.height = size;
  const rctx = rc.getContext('2d');
  const rimg = rctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cellX = Math.floor(x / period);
      const cellY = Math.floor(y / period);
      const isWarp = (cellX + cellY) % 2 === 0;
      const lx = ((x % period) / period) * Math.PI;
      const ly = ((y % period) / period) * Math.PI;
      const onThread = isWarp ? Math.sin(lx) : Math.sin(ly);
      const r = 180 + (1 - onThread) * 50 + (Math.random() - 0.5) * 20;
      const i = (y * size + x) * 4;
      rimg.data[i] = rimg.data[i + 1] = rimg.data[i + 2] = Math.max(0, Math.min(255, r));
      rimg.data[i + 3] = 255;
    }
  }
  rctx.putImageData(rimg, 0, 0);
  const roughTex = new THREE.CanvasTexture(rc);
  roughTex.wrapS = roughTex.wrapT = THREE.RepeatWrapping;
  roughTex.repeat.set(repeat, repeat);

  return { colorTex, normalTex, roughTex };
}

// ---- Image-on-fabric：使用者圖片 cover 鋪滿，邊緣出血以利包覆側面 ----
function makeImageOnFabricTexture(image, baseColorHex) {
  const size = 1024;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = baseColorHex;
  ctx.fillRect(0, 0, size, size);
  const iw = image.naturalWidth || image.width;
  const ih = image.naturalHeight || image.height;
  const scale = Math.max(size / iw, size / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(image, (size - dw) / 2, (size - dh) / 2, dw, dh);
  // 微織紋雜訊：讓圖看起來是「印在布上」
  const overlay = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < overlay.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 10;
    overlay.data[i]     = Math.max(0, Math.min(255, overlay.data[i]     + n));
    overlay.data[i + 1] = Math.max(0, Math.min(255, overlay.data[i + 1] + n));
    overlay.data[i + 2] = Math.max(0, Math.min(255, overlay.data[i + 2] + n));
  }
  ctx.putImageData(overlay, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

// ---- Fabric profiles ----
const FABRICS = {
  cotton: {
    label: '棉布 Cotton',
    period: 8, repeat: 8, weaveAlpha: 0.06, noiseAmp: 22,
    normalStrength: 60, normalScale: 0.8,
    roughness: 0.95, sheen: 0.7, sheenColor: 0xfff5e8, sheenRoughness: 0.45,
    printedRoughness: 0.88, printedSheen: 0.55,
  },
  linen: {
    label: '麻 Linen',
    period: 14, repeat: 6, weaveAlpha: 0.13, noiseAmp: 38,
    normalStrength: 95, normalScale: 1.15,
    roughness: 1.0, sheen: 0.15, sheenColor: 0xf3ede0, sheenRoughness: 0.85,
    printedRoughness: 0.96, printedSheen: 0.10,
  },
  velvet: {
    label: '絲絨 Velvet',
    period: 3, repeat: 12, weaveAlpha: 0.02, noiseAmp: 14,
    normalStrength: 25, normalScale: 0.35,
    roughness: 0.55, sheen: 1.0, sheenColor: 0xffeed8, sheenRoughness: 0.18,
    printedRoughness: 0.65, printedSheen: 0.9,
  },
};

const state = {
  baseColor: '#e8dccb',
  fabric: 'cotton',
  face: 'front', // 保留 state 以便 UI 不報錯；GLB 為單材質，整顆抱枕共用
  image: null,
  bg: 'solid',
  autoRotate: false,
};

// ---- 建構 GLB 單材質（整顆抱枕共用一個 material）----
function buildMaterial() {
  const fabric = FABRICS[state.fabric] || FABRICS.cotton;
  const { colorTex, normalTex, roughTex } = makeFabricTextures(state.baseColor, fabric);

  if (state.image) {
    const imgTex = makeImageOnFabricTexture(state.image, state.baseColor);
    return new THREE.MeshPhysicalMaterial({
      map: imgTex,
      normalMap: normalTex,
      normalScale: new THREE.Vector2(fabric.normalScale, fabric.normalScale),
      roughnessMap: roughTex,
      roughness: fabric.printedRoughness,
      metalness: 0.0,
      sheen: fabric.printedSheen,
      sheenColor: new THREE.Color(fabric.sheenColor),
      sheenRoughness: fabric.sheenRoughness,
    });
  }

  return new THREE.MeshPhysicalMaterial({
    map: colorTex,
    normalMap: normalTex,
    normalScale: new THREE.Vector2(fabric.normalScale, fabric.normalScale),
    roughnessMap: roughTex,
    roughness: fabric.roughness,
    metalness: 0.0,
    sheen: fabric.sheen,
    sheenColor: new THREE.Color(fabric.sheenColor),
    sheenRoughness: fabric.sheenRoughness,
  });
}

// ---- Load real pillow geometry from Blender export ----
const pillow = new THREE.Mesh(
  new THREE.BoxGeometry(0.001, 0.001, 0.001),  // placeholder until GLB loads
  buildMaterial()
);
pillow.visible = false;

const gltfLoader = new GLTFLoader();
gltfLoader.load(
  '/pillow.glb',
  (gltf) => {
    let glbMesh = null;
    gltf.scene.traverse((obj) => { if (obj.isMesh && !glbMesh) glbMesh = obj; });
    if (!glbMesh) {
      hud.textContent = 'pillow.glb 內找不到 mesh';
      return;
    }

    // 用 GLB 幾何取代 placeholder
    const oldGeo = pillow.geometry;
    pillow.geometry = glbMesh.geometry.clone();
    oldGeo.dispose();
    if (!pillow.geometry.attributes.normal) pillow.geometry.computeVertexNormals();

    // 置中、對齊到觀眾視角、縮放到 0.45m 寬
    pillow.geometry.computeBoundingBox();
    const center = new THREE.Vector3();
    pillow.geometry.boundingBox.getCenter(center);
    pillow.geometry.translate(-center.x, -center.y, -center.z);

    // GLB 大面在 ±Y → 旋轉 -90° 讓兩個正方形面朝 ±Z（鏡頭方向）
    pillow.geometry.rotateX(-Math.PI / 2);

    pillow.geometry.computeBoundingBox();
    const size = new THREE.Vector3();
    pillow.geometry.boundingBox.getSize(size);
    const scale = 0.45 / Math.max(size.x, size.y);
    pillow.geometry.scale(scale, scale, scale);

    pillow.visible = true;
    hud.textContent = `ready · GLB ${pillow.geometry.attributes.position.count.toLocaleString()} verts · drag to rotate`;
    window.__pillowReady = true;
    window.__pillowGLBLoaded = true;
  },
  (xhr) => {
    if (xhr.total) {
      const pct = Math.round((xhr.loaded / xhr.total) * 100);
      hud.textContent = `loading pillow… ${pct}%`;
    }
  },
  (err) => {
    console.error('Failed to load pillow.glb', err);
    hud.textContent = 'failed to load pillow.glb';
  }
);

const pillowGroup = new THREE.Group();
pillowGroup.add(pillow);
scene.add(pillowGroup);

function rebuildPillow() {
  const oldMat = pillow.material;
  if (oldMat) {
    if (oldMat.map) oldMat.map.dispose();
    if (oldMat.normalMap) oldMat.normalMap.dispose();
    if (oldMat.roughnessMap) oldMat.roughnessMap.dispose();
    oldMat.dispose();
  }
  pillow.material = buildMaterial();
}

// ---- Resize ----
function resize() {
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);
resize();

// ---- Animate ----
function loop() {
  requestAnimationFrame(loop);
  if (state.autoRotate) pillowGroup.rotation.y += 0.005;
  controls.update();
  renderer.render(scene, camera);
}
loop();

hud.textContent = 'loading pillow…';

// ---- UI bindings ----
document.getElementById('img-upload').addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      state.image = img;
      rebuildPillow();
      hud.textContent = `image loaded · ${img.width}×${img.height}`;
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

document.getElementById('base-color').addEventListener('input', (e) => {
  state.baseColor = e.target.value;
  rebuildPillow();
});

const fabricSel = document.getElementById('fabric');
if (fabricSel) {
  fabricSel.disabled = false;
  fabricSel.addEventListener('change', (e) => {
    state.fabric = e.target.value;
    rebuildPillow();
    const f = FABRICS[state.fabric];
    if (f) hud.textContent = `fabric · ${f.label}`;
  });
}

// 正/反/雙面：GLB 為單材質，目前先保留按鈕但只更新 state（未來實作 UV 投影時啟用）
document.querySelectorAll('#face-seg button').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('#face-seg button').forEach(x => x.setAttribute('aria-pressed', 'false'));
    b.setAttribute('aria-pressed', 'true');
    state.face = b.dataset.face;
    rebuildPillow();
  });
});

document.querySelectorAll('#bg-seg button, [data-bg]').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('[data-bg]').forEach(x => x.setAttribute('aria-pressed', 'false'));
    b.setAttribute('aria-pressed', 'true');
    state.bg = b.dataset.bg;
    stage.className = `stage-wrap bg-${state.bg}`;
  });
});

document.getElementById('reset-cam').addEventListener('click', () => {
  camera.position.copy(defaultCamPos);
  controls.target.set(0, 0, 0);
  controls.update();
});

const arBtn = document.getElementById('auto-rotate');
arBtn.addEventListener('click', () => {
  state.autoRotate = !state.autoRotate;
  arBtn.setAttribute('aria-pressed', String(state.autoRotate));
  arBtn.textContent = state.autoRotate ? '⏸ 停止旋轉' : '⟳ 自動旋轉';
});

// ---- Playwright hook ----
window.__loadTestImage = function(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      state.image = img;
      rebuildPillow();
      hud.textContent = `test image loaded · ${img.width}×${img.height}`;
      resolve(true);
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
};

window.__setBg = function(bg) {
  state.bg = bg;
  stage.className = `stage-wrap bg-${bg}`;
};
