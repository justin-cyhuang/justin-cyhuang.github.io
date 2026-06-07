// Pillow Studio v3
// Three.js via CDN ESM. 支援抱枕 45×45 與馬克杯兩種模型
// 抱枕：載入 Blender GLB，套用三種布料材質，支援上傳圖片、改底色、切換背景、自動旋轉
// 馬克杯：雙材質區域（主造型 3:1 + 杯底圓形），各自獨立上傳和裁切

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const canvas = document.getElementById('pillow-canvas');
const stage = document.getElementById('stage');
const hud = document.getElementById('hud');

// ---- Global state ----
const appState = {
  currentModel: 'pillow', // 'pillow' or 'mug'
  pillowState: null,
  mugState: null
};

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

// ---- Image-on-fabric：把已處理好的 1024×1024 RGBA canvas 印在布料上 ----
// state.processedImageCanvas 由裁切 UI 產出：可能含 alpha=0 區域（fit 模式）。
// 透明區會用該布料 color texture 補底，讓圖案像「印在這塊布上」。
function makeImageOnFabricTexture(processedCanvas, baseColorHex, fabric, printScale = 1.0) {
  const size = 1024;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');

  // 1) 先用 fabric color 鋪滿底（含織紋雜訊），平鋪 2×2 來模擬 RepeatWrapping
  const fabricTile = document.createElement('canvas');
  const tileSize = 512;
  fabricTile.width = fabricTile.height = tileSize;
  const fctx = fabricTile.getContext('2d');
  fctx.fillStyle = baseColorHex;
  fctx.fillRect(0, 0, tileSize, tileSize);
  const fimg = fctx.getImageData(0, 0, tileSize, tileSize);
  const noiseAmp = (fabric && fabric.noiseAmp) || 22;
  for (let i = 0; i < fimg.data.length; i += 4) {
    const n = (Math.random() - 0.5) * noiseAmp;
    fimg.data[i]     = Math.max(0, Math.min(255, fimg.data[i]     + n));
    fimg.data[i + 1] = Math.max(0, Math.min(255, fimg.data[i + 1] + n));
    fimg.data[i + 2] = Math.max(0, Math.min(255, fimg.data[i + 2] + n));
  }
  fctx.putImageData(fimg, 0, 0);
  // 弱化的織紋
  fctx.globalAlpha = (fabric && fabric.weaveAlpha) || 0.06;
  fctx.strokeStyle = '#000';
  fctx.lineWidth = 1;
  for (let y = 0; y < tileSize; y += 3) { fctx.beginPath(); fctx.moveTo(0, y); fctx.lineTo(tileSize, y); fctx.stroke(); }
  for (let x = 0; x < tileSize; x += 3) { fctx.beginPath(); fctx.moveTo(x, 0); fctx.lineTo(x, tileSize); fctx.stroke(); }
  fctx.globalAlpha = 1;

  // 平鋪 fabric tile 到 1024×1024
  for (let ty = 0; ty < size; ty += tileSize) {
    for (let tx = 0; tx < size; tx += tileSize) {
      ctx.drawImage(fabricTile, tx, ty);
    }
  }

  // 2) 把使用者處理好的圖（含 alpha）疊上去（依 printScale 縮到中央，露出四周布料）
  const s = Math.max(0.1, Math.min(1.0, printScale));
  const dw = Math.round(size * s);
  const dh = Math.round(size * s);
  const dx = Math.round((size - dw) / 2);
  const dy = Math.round((size - dh) / 2);
  ctx.drawImage(processedCanvas, dx, dy, dw, dh);

  // 3) 微織紋雜訊：讓圖案看起來像印在布上
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
  image: null,                 // 原始 Image 物件
  processedImageCanvas: null,  // 裁切後的 1024×1024 RGBA canvas（含可能的 alpha）
  printScale: 1.0,             // 列印面積比例（0–1，1=滿版）
  pillowCm: 45,                // 抱枕邊長（cm），用於 UI 顯示實際印刷面積
  bg: 'solid',
  autoRotate: false,
};

// ---- 建構 GLB 單材質（整顆抱枕共用一個 material）----
function buildMaterial() {
  const fabric = FABRICS[state.fabric] || FABRICS.cotton;
  const { colorTex, normalTex, roughTex } = makeFabricTextures(state.baseColor, fabric);

  if (state.processedImageCanvas) {
    const imgTex = makeImageOnFabricTexture(state.processedImageCanvas, state.baseColor, fabric, state.printScale);
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

    // 修正反面鏡像：前後面共用同一張 UV [0,1]×[0,1]，從背後看時會左右反。
    // 攤平 index → 每個三角形獨立 → 把朝後（normal.z < -0.5）的三角形 UV 做 u→1-u。
    {
      const flat = pillow.geometry.index ? pillow.geometry.toNonIndexed() : pillow.geometry;
      const pos = flat.attributes.position.array;
      const uv  = flat.attributes.uv ? flat.attributes.uv.array : null;
      if (uv) {
        // 重算 normal（toNonIndexed 後 face normal 較乾淨）
        flat.computeVertexNormals();
        const nor = flat.attributes.normal.array;
        const triCount = pos.length / 9;
        let flipped = 0;
        for (let t = 0; t < triCount; t++) {
          const i0 = t * 3, i1 = t * 3 + 1, i2 = t * 3 + 2;
          const nzAvg = (nor[i0 * 3 + 2] + nor[i1 * 3 + 2] + nor[i2 * 3 + 2]) / 3;
          if (nzAvg < -0.5) {
            uv[i0 * 2] = 1 - uv[i0 * 2];
            uv[i1 * 2] = 1 - uv[i1 * 2];
            uv[i2 * 2] = 1 - uv[i2 * 2];
            flipped++;
          }
        }
        flat.attributes.uv.needsUpdate = true;
        console.log(`[pillow] mirrored UVs on ${flipped} back-facing tris`);
      }
      pillow.geometry = flat;
    }

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
      const ar = img.naturalWidth / img.naturalHeight;
      if (Math.abs(ar - 1) < 0.02) {
        // 已是 1:1（±2%），直接 cover 進 1024×1024 canvas，無需開裁切窗
        state.processedImageCanvas = bakeCanvas(img, 'crop', { offsetX: 0, offsetY: 0, scale: 1 });
        rebuildPillow();
        hud.textContent = `image ready · ${img.width}×${img.height} (1:1)`;
      } else {
        openCropModal(img);
      }
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

// ---- Bake processed image to 1024×1024 RGBA canvas ----
// mode='crop'：圖 cover 滿框，超出裁掉（offsetX/Y in [-1,1], scale>=1）
// mode='fit' ：圖 contain 進框置中，空白 alpha=0
function bakeCanvas(img, mode, transform, aspectRatio = 1, flipVertical = false) {
  const SIZE = 1024;
  const c = document.createElement('canvas');
  
  // Set canvas dimensions based on aspect ratio
  if (aspectRatio === 3.5) {
    c.width = Math.round(SIZE * 3.5);
    c.height = SIZE;
  } else {
    c.width = c.height = SIZE;
  }
  
  const ctx = c.getContext('2d');
  
  // Apply vertical flip if requested
  if (flipVertical) {
    ctx.translate(0, c.height);
    ctx.scale(1, -1);
  }
  
  ctx.clearRect(0, 0, c.width, c.height);
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (mode === 'fit') {
    // contain
    const s = Math.min(c.width / iw, c.height / ih);
    const dw = iw * s;
    const dh = ih * s;
    ctx.drawImage(img, (c.width - dw) / 2, (c.height - dh) / 2, dw, dh);
  } else {
    // crop / cover — free positioning (image can move beyond frame edges)
    const baseScale = Math.max(c.width / iw, c.height / ih);
    const s = baseScale * (transform.scale || 1);
    const dw = iw * s;
    const dh = ih * s;
    // offsetX/Y are in pixel units relative to canvas center
    const offX = transform.offsetX || 0;
    const offY = transform.offsetY || 0;
    ctx.drawImage(img, (c.width - dw) / 2 + offX, (c.height - dh) / 2 + offY, dw, dh);
  }
  return c;
}

// ---- Crop Modal ----
// aspectRatio: 1 for square, 3.5 for 3.5:1 (mug body), 'circle' for circular crop
function openCropModal(img, aspectRatio = 1, targetSlot = 'pillow') {
  const overlay = document.getElementById('crop-overlay');
  const preview = document.getElementById('crop-preview');
  const aspectLabel = document.getElementById('crop-aspect');
  const ar = img.naturalWidth / img.naturalHeight;
  
  // Update label based on target
  let targetDesc = '';
  if (targetSlot === 'pillow') {
    targetDesc = '抱枕 1:1';
  } else if (targetSlot === 'mug-body') {
    targetDesc = '馬克杯主造型 3.5:1';
    preview.classList.add('aspect-3-5-1');
    preview.classList.remove('aspect-circle');
  } else if (targetSlot === 'mug-bottom') {
    targetDesc = '馬克杯杯底 1:1 圓形';
    preview.classList.add('aspect-circle');
    preview.classList.remove('aspect-3-5-1');
  }
  
  aspectLabel.textContent = `原圖 ${img.naturalWidth}×${img.naturalHeight} · 比例 ${ar.toFixed(2)}:1 · ${targetDesc}`;

  let t = { offsetX: 0, offsetY: 0, scale: 1 };   // transform state
  let dragging = false;
  let dragStart = null;

  function renderPreview() {
    const ctx = preview.getContext('2d');
    const W = preview.width;
    const H = aspectRatio === 3.5 ? Math.round(W / 3.5) : W;
    
    // Adjust canvas size for 3:1
    if (aspectRatio === 3.5) {
      preview.height = H;
    } else {
      preview.height = W;
    }
    
    ctx.clearRect(0, 0, W, H);
    // 棋盤格底（提示透明區）
    const cell = 16;
    for (let y = 0; y < H; y += cell) {
      for (let x = 0; x < W; x += cell) {
        ctx.fillStyle = ((x / cell + y / cell) % 2 === 0) ? '#eee' : '#ddd';
        ctx.fillRect(x, y, cell, cell);
      }
    }
    // Bake and draw image with current transform
    const baked = bakeCanvas(img, 'crop', t, aspectRatio, false);
    ctx.drawImage(baked, 0, 0, W, H);
    
    // Draw frame
    ctx.strokeStyle = '#d97757';
    ctx.lineWidth = 2;
    
    if (targetSlot === 'mug-bottom') {
      // Draw circle for bottom
      ctx.beginPath();
      ctx.arc(W/2, W/2, W/2 - 2, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // Draw rectangle
      ctx.strokeRect(1, 1, W - 2, H - 2);
    }
  }

  // 拖曳 — free move, pixel-based, no clamping
  preview.onmousedown = (e) => {
    dragging = true;
    dragStart = { x: e.offsetX, y: e.offsetY, ox: t.offsetX, oy: t.offsetY };
  };
  preview.onmousemove = (e) => {
    if (!dragging) return;
    // Scale drag distance from preview canvas size to bake canvas size (1024-based)
    const canvasW = aspectRatio === 3.5 ? Math.round(1024 * 3.5) : 1024;
    const canvasH = 1024;
    const scaleX = canvasW / preview.width;
    const scaleY = canvasH / preview.height;
    const dx = (e.offsetX - dragStart.x) * scaleX;
    const dy = (e.offsetY - dragStart.y) * scaleY;
    t.offsetX = dragStart.ox + dx;
    t.offsetY = dragStart.oy + dy;
    renderPreview();
  };
  window.addEventListener('mouseup', () => { dragging = false; });

  // 縮放滑桿
  const zoom = document.getElementById('crop-zoom');
  zoom.value = '1';
  zoom.oninput = () => {
    t.scale = parseFloat(zoom.value);
    renderPreview();
  };

  // 確認/取消
  document.getElementById('crop-confirm').onclick = () => {
    const bakedCanvas = bakeCanvas(img, 'crop', t, aspectRatio, false);
    
    if (targetSlot === 'pillow') {
      state.processedImageCanvas = bakedCanvas;
      rebuildPillow();
      hud.textContent = `已套用圖片 · ${img.width}×${img.height}`;
    } else if (targetSlot === 'mug-body') {
      applyMugTexture('body', bakedCanvas);
      hud.textContent = `馬克杯主造型已套用 · ${img.width}×${img.height}`;
    } else if (targetSlot === 'mug-bottom') {
      applyMugTexture('bottom', bakedCanvas);
      hud.textContent = `馬克杯杯底已套用 · ${img.width}×${img.height}`;
    }
    
    // Reset preview classes
    preview.classList.remove('aspect-3-1', 'aspect-circle');
    overlay.style.display = 'none';
  };
  document.getElementById('crop-cancel').onclick = () => {
    // Reset preview classes
    preview.classList.remove('aspect-3-1', 'aspect-circle');
    overlay.style.display = 'none';
    if (targetSlot === 'pillow') {
      document.getElementById('img-upload').value = '';
    } else if (targetSlot === 'mug-body') {
      document.getElementById('img-upload-mug-body').value = '';
    } else if (targetSlot === 'mug-bottom') {
      document.getElementById('img-upload-mug-bottom').value = '';
    }
  };

  // Show overlay and render initial preview
  overlay.style.display = 'flex';
  renderPreview();
}

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

// ---- Print area (列印面積) ----
const printAreaHint = document.getElementById('print-area-hint');
function updatePrintAreaHint() {
  const cm = (state.pillowCm * state.printScale).toFixed(1).replace(/\.0$/, '');
  const pct = Math.round(state.printScale * 100);
  if (state.printScale >= 0.999) {
    printAreaHint.textContent = `滿版列印（${state.pillowCm} × ${state.pillowCm} cm）`;
  } else {
    printAreaHint.textContent = `${pct}% · 實際印刷區約 ${cm} × ${cm} cm，四周露出布料底紋`;
  }
}
document.querySelectorAll('#print-area-seg button').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('#print-area-seg button').forEach(x => x.setAttribute('aria-pressed', 'false'));
    b.setAttribute('aria-pressed', 'true');
    state.printScale = parseFloat(b.dataset.printScale);
    updatePrintAreaHint();
    rebuildPillow();
  });
});
updatePrintAreaHint();

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
window.__loadTestImage = function(dataUrl, mode) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      state.image = img;
      // 預設 crop 模式（cover），測試可傳 'fit' 來驗證保留全圖
      state.processedImageCanvas = bakeCanvas(img, mode || 'crop', { offsetX: 0, offsetY: 0, scale: 1 });
      rebuildPillow();
      hud.textContent = `test image loaded · ${img.width}×${img.height} · ${mode || 'crop'}`;
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

// ---- Model switching (pillow vs mug) ----
let currentModelType = 'pillow';
let mugModel = null;
let mugBodyMesh = null;  // Store reference to mug body mesh
let mugBottomMesh = null; // Store reference to mug bottom mesh
let mugBodyMeshes = [];   // Store reference to mug meshes (with UV filtering)
const loader = new GLTFLoader();

// ---- Apply texture to mug ----
let mugBodyTexture = null;
let mugBottomTexture = null;

function applyMugTexture(target, canvas) {
  if (!mugModel) {
    console.warn('Mug model not loaded yet');
    return;
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  // Our UV mapping and shader expect non-flipped texture
  texture.flipY = false;
  
  if (target === 'body') {
    mugBodyTexture = texture;
    mugBodyMeshes.forEach(mesh => {
      if (mesh.material.uniforms) {
        mesh.material.uniforms.bodyMap.value = mugBodyTexture;
        mesh.material.uniforms.hasBodyTexture.value = true;
        mesh.material.needsUpdate = true;
      }
    });
  } else if (target === 'bottom') {
    mugBottomTexture = texture;
    mugBodyMeshes.forEach(mesh => {
      if (mesh.material.uniforms) {
        mesh.material.uniforms.bottomMap.value = mugBottomTexture;
        mesh.material.uniforms.hasBottomTexture.value = true;
        mesh.material.needsUpdate = true;
      }
    });
  }
  
  console.log(`Applied ${target} texture to ${mugBodyMeshes.length} meshes`);
}

document.getElementById('model-select')?.addEventListener('change', (e) => {
  currentModelType = e.target.value;
  
  if (currentModelType === 'mug') {
    // Hide pillow
    pillowGroup.visible = false;
    
    // Load mug model if not already loaded
    // Now using separated models: body (printable) + handle (excluded)
    if (!mugModel) {
      // Create a container for both body and handle
      mugModel = new THREE.Group();
      scene.add(mugModel);
      
      // New model is larger than old one, scale 0.45
      mugModel.scale.set(0.225, 0.225, 0.225);
      mugModel.position.set(0, -0.3, 0);
      
      let bodyLoaded = false;
      
      // Load new mug model (Blender 5.0, seam-based UV unwrap)
      // UV layout: outer body V=[0,0.5], bottom V=[0.5,0.99]
      // Handle excluded at U=[0.40, 0.60]
      // Printable zone: U∈[0,0.40]∪[0.60,1.00], V∈[0.059,0.447]
      loader.load('/mug_new.glb', (gltf) => {
        const mugMesh = gltf.scene;
        
        mugMesh.traverse((child) => {
          if (child.isMesh) {
            mugBodyMeshes.push(child);
            
            child.material = new THREE.ShaderMaterial({
              uniforms: {
                bodyMap: { value: null },
                bottomMap: { value: null },
                hasBodyTexture: { value: false },
                hasBottomTexture: { value: false },
                // Printable zone constants (no external JSON needed)
                handleUMin: { value: 0.40 },
                handleUMax: { value: 0.60 },
                vMin: { value: 0.059 },
                vMax: { value: 0.447 },
                baseColor: { value: new THREE.Color(0xffffff) }
              },
              vertexShader: `
                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vWorldNormal;
                varying vec3 vWorldPosition;
                
                void main() {
                  vUv = uv;
                  vNormal = normalize(normalMatrix * normal);
                  
                  vec4 worldPos = modelMatrix * vec4(position, 1.0);
                  vWorldPosition = worldPos.xyz;
                  vWorldNormal = normalize(mat3(modelMatrix) * normal);
                  
                  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
              `,
              fragmentShader: `
                uniform sampler2D bodyMap;
                uniform sampler2D bottomMap;
                uniform bool hasBodyTexture;
                uniform bool hasBottomTexture;
                uniform float handleUMin;
                uniform float handleUMax;
                uniform float vMin;
                uniform float vMax;
                uniform vec3 baseColor;
                
                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vWorldNormal;
                varying vec3 vWorldPosition;
                
                void main() {
                  vec3 color = baseColor;
                  
                  // Radial direction in XZ plane (GLB Y-up, mug axis = Y)
                  vec2 radialDir = normalize(vWorldPosition.xz);
                  vec2 normalDir = normalize(vWorldNormal.xz);
                  float outwardDot = dot(radialDir, normalDir);
                  
                  // --- Body texture (outer surface, V < 0.5) ---
                  if (hasBodyTexture) {
                    bool inVRange = vUv.y >= vMin && vUv.y <= vMax;
                    
                    if (inVRange && outwardDot > 0.1) {
                      // Use atan2-based angle instead of vUv.x to avoid GPU interpolation
                      // artifact at the UV seam (where U jumps from 0 to 1).
                      // atan2 is computed per-fragment from world position → no interpolation.
                      //
                      // GLB node has 90° Y-rotation, so in WORLD space:
                      //   Handle at +X, Front at +Z, Left at -X, Back at -Z
                      // atan(-z, x) gives angle from +X (handle) going CCW:
                      //   Handle(+X): 0, Front(+Z): +PI/2, Left(-X): PI, Back(-Z): -PI/2
                      float rawAngle = atan(-vWorldPosition.z, vWorldPosition.x);
                      float fromHandle = rawAngle; // handle = 0
                      if (fromHandle < 0.0) fromHandle += 6.2831853;
                      float shiftedU = fromHandle / 6.2831853; // [0,1], handle=0/1, front=0.25
                      
                      // Handle exclusion: 20% centered at 0/1
                      // Printable zone: [0.10, 0.90]
                      if (shiftedU > 0.10 && shiftedU < 0.90) {
                        float remappedU = (shiftedU - 0.10) / 0.80;
                        float remappedV = (vUv.y - vMin) / (vMax - vMin);
                        vec4 texel = texture2D(bodyMap, vec2(remappedU, remappedV));
                        color = mix(baseColor, texel.rgb, texel.a);
                      }
                    }
                  }
                  
                  // --- Bottom texture (V > 0.5) ---
                  if (hasBottomTexture && vUv.y > 0.50) {
                    // Remap V from [0.50, 0.99] → [0, 1]
                    float bv = (vUv.y - 0.50) / 0.49;
                    // Polar mapping: remap U,V to circular coordinates
                    float bu = vUv.x;
                    // Convert from linear UV to polar for circular bottom
                    float angle = bu * 6.28318;  // U → angle [0, 2π]
                    float radius = bv;            // V → radius [0, 1]
                    // Convert polar to cartesian for texture lookup
                    float texU = 0.5 + radius * cos(angle) * 0.5;
                    float texV = 0.5 + radius * sin(angle) * 0.5;
                    if (texU >= 0.0 && texU <= 1.0 && texV >= 0.0 && texV <= 1.0) {
                      color = texture2D(bottomMap, vec2(texU, texV)).rgb;
                    }
                  }
                  
                  // Simple lighting
                  vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
                  float diff = max(dot(vNormal, lightDir), 0.0);
                  vec3 ambient = vec3(0.3);
                  vec3 lighting = ambient + diff * vec3(0.7);
                  
                  gl_FragColor = vec4(color * lighting, 1.0);
                }
              `,
              side: THREE.DoubleSide
            });
            
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        
        mugModel.add(mugMesh);
        bodyLoaded = true;
        console.log(`Mug model loaded: ${mugBodyMeshes.length} meshes`);
        hud.textContent = '馬克杯模型已載入 · 請上傳主造型和杯底圖案';
      }, undefined, (error) => {
        console.error('Error loading mug:', error);
        hud.textContent = '載入馬克杯模型失敗';
      });
    } else {
      mugModel.visible = true;
      hud.textContent = '馬克杯模型已載入 · 請上傳主造型和杯底圖案';
    }
    
    // Hide pillow-specific controls
    const pillowControls = document.getElementById('pillow-controls');
    if (pillowControls) pillowControls.style.display = 'none';
  } else {
    // Switch back to pillow
    pillowGroup.visible = true;
    if (mugModel) mugModel.visible = false;
    
    // Show pillow controls
    const pillowControls = document.getElementById('pillow-controls');
    if (pillowControls) pillowControls.style.display = '';
    
    hud.textContent = '已切換回抱枕模式';
  }
});

// ---- Mug image uploads ----
document.getElementById('img-upload-mug-body')?.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      openCropModal(img, 3.5, 'mug-body');
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

document.getElementById('img-upload-mug-bottom')?.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      openCropModal(img, 1, 'mug-bottom');
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});
