// Pillow Studio MVP
// Three.js via CDN ESM. 45x45 cotton pillow, upload image, rotate, lights from upper-right-back 45°.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const canvas = document.getElementById('pillow-canvas');
const stage = document.getElementById('stage');
const hud = document.getElementById('hud');

// ---- Renderer / scene / camera ----
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

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
// Ambient base
const ambient = new THREE.AmbientLight(0xffffff, 0.35);
scene.add(ambient);

// Hemisphere for soft sky/ground bounce
const hemi = new THREE.HemisphereLight(0xffffff, 0xc8c0b0, 0.45);
scene.add(hemi);

// KEY light: upper-right-back 45° from viewer's perspective
// Viewer looks down -Z; "right-back" means +X / +Z (behind pillow from viewer), "upper" means +Y.
// Place at 45° angles.
const keyLight = new THREE.DirectionalLight(0xfff2e1, 1.6);
keyLight.position.set(2.5, 2.5, 2.5); // right, up, back-of-pillow (closer to viewer because pillow faces -Z naturally)
// Wait: viewer at +Z looking toward origin. "Back of pillow from viewer" = -Z. So upper-right-back-of-pillow:
keyLight.position.set(2.2, 2.2, -2.2);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
keyLight.shadow.camera.left = -2;
keyLight.shadow.camera.right = 2;
keyLight.shadow.camera.top = 2;
keyLight.shadow.camera.bottom = -2;
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 8;
keyLight.shadow.bias = -0.0005;
scene.add(keyLight);

// Fill light from viewer-front-left, dimmer, cool
const fill = new THREE.DirectionalLight(0xcfd8ff, 0.45);
fill.position.set(-2.0, 0.8, 2.0);
scene.add(fill);

// Rim light to separate pillow from background
const rim = new THREE.DirectionalLight(0xffe6c8, 0.25);
rim.position.set(0, -1.0, -3.0);
scene.add(rim);

// Ground shadow catcher (subtle)
const shadowMat = new THREE.ShadowMaterial({ opacity: 0.18 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), shadowMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.32;
ground.receiveShadow = true;
scene.add(ground);

// ---- Pillow geometry: puffy 45×45 cm cube with inflated faces ----
// Scene unit: 1 = 1 meter. 45cm = 0.45.
const PILLOW_W = 0.45;
const PILLOW_H = 0.45;
const PILLOW_D = 0.30; // depth — 1:3 thickness:width per linen pillow reference
const SEGS = 48;       // per side — enough for smooth bulge

function makePillowGeometry(w, h, d, segs) {
  // TRUE pillow topology: 2 cloth panels sewn together at the perimeter.
  // Result is a LENS shape with only 4 corners (perimeter sits on z=0 plane).
  //
  //   - At center (nx=0, ny=0): full thickness ±d/2
  //   - At edge (|nx|=1 OR |ny|=1): z=0 — front & back panels meet at the seam
  //   - At corner (|nx|=|ny|=1): z=0, 4 corners only (not 8)
  //
  // The XY silhouette stays a square (45x45 perimeter), with mild "ears" at corners
  // because the bulk of stuffing pushes XY outward where the panels meet.
  const geo = new THREE.BoxGeometry(w, h, d, segs, segs, Math.max(2, segs / 8));
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();

  const halfW = w / 2;
  const halfH = h / 2;
  const halfD = d / 2;

  // v12 — linen-pillow reference (平頂中央 + 軟邊 + 4 個 dog-ear 尖角):
  //   Z: plateau (flat center, soft falloff at edge). Front/back collapse to 0 at perimeter → 4 corners.
  //   XY: large dog-ear push at the 4 corners (~10% of side length), creates concave edges.
  const PLATEAU_FLAT  = 0.55;   // radius (0..1) of flat-top region in normalized space
  const EDGE_SOFT     = 0.95;   // soft-fall edge (1.0 = exactly at perimeter)
  const CORNER_EARS   = 0.045;  // dog-ear XY length (~10% of half-side 0.225m)
  const EARS_POW      = 1.8;    // lower = ear extends further inward from corner

  const smoothstep = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const nx = v.x / halfW;
    const ny = v.y / halfH;
    const nz = v.z / halfD;
    const ax = Math.abs(nx);
    const ay = Math.abs(ny);

    // Radial distance from center using L∞ (chebyshev) on squared coords for soft squircle feel.
    const r = Math.max(ax, ay);
    // Plateau profile: 1.0 inside PLATEAU_FLAT, smoothly to 0 by EDGE_SOFT.
    const profile = 1 - smoothstep(PLATEAU_FLAT, EDGE_SOFT, r);
    v.z = Math.sign(nz || 1) * halfD * profile;

    // Dog-ear XY push at the 4 corners.
    const earWeight = Math.pow(ax, EARS_POW) * Math.pow(ay, EARS_POW);
    if (earWeight > 0.001) {
      const dirLen = Math.hypot(nx, ny) || 1;
      v.x += (nx / dirLen) * CORNER_EARS * earWeight;
      v.y += (ny / dirLen) * CORNER_EARS * earWeight;
    }

    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

const pillowGeo = makePillowGeometry(PILLOW_W, PILLOW_H, PILLOW_D, SEGS);

// ---- Procedural cotton weave: color + normal + roughness maps ----
function makeCottonTextures(baseColorHex) {
  const size = 512;

  // ---- Color (albedo) map ----
  const cc = document.createElement('canvas');
  cc.width = cc.height = size;
  const ctx = cc.getContext('2d');
  ctx.fillStyle = baseColorHex;
  ctx.fillRect(0, 0, size, size);
  // Fine noise variation
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 22;
    img.data[i]     = Math.max(0, Math.min(255, img.data[i]     + n));
    img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1] + n));
    img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
  // Subtle weave lines — both directions, low alpha
  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  for (let y = 0; y < size; y += 3) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke(); }
  for (let x = 0; x < size; x += 3) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size); ctx.stroke(); }
  ctx.globalAlpha = 1;
  const colorTex = new THREE.CanvasTexture(cc);
  colorTex.colorSpace = THREE.SRGBColorSpace;
  colorTex.wrapS = colorTex.wrapT = THREE.RepeatWrapping;
  colorTex.repeat.set(8, 8);
  colorTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  // ---- Normal map: simulated woven cotton (over/under weave bumps) ----
  const nc = document.createElement('canvas');
  nc.width = nc.height = size;
  const nctx = nc.getContext('2d');
  const nimg = nctx.createImageData(size, size);
  const period = 8; // weave cell size in px
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Plain weave pattern: warps and wefts alternate above/below
      const cellX = Math.floor(x / period);
      const cellY = Math.floor(y / period);
      const isWarp = (cellX + cellY) % 2 === 0;
      // Within each cell, height varies sinusoidally
      const lx = ((x % period) / period) * Math.PI;
      const ly = ((y % period) / period) * Math.PI;
      const h = isWarp ? Math.sin(lx) * 0.7 : Math.sin(ly) * 0.7;
      // Add fine fiber noise
      const noise = (Math.random() - 0.5) * 0.15;
      const height = h + noise;
      // Derive normal (approx): blue=up, red/green = slope
      const i = (y * size + x) * 4;
      nimg.data[i]     = 128 + height * 60;      // R = X normal
      nimg.data[i + 1] = 128 + (isWarp ? Math.cos(lx) : Math.cos(ly)) * 50; // G
      nimg.data[i + 2] = 220;                     // B = up
      nimg.data[i + 3] = 255;
    }
  }
  nctx.putImageData(nimg, 0, 0);
  const normalTex = new THREE.CanvasTexture(nc);
  normalTex.wrapS = normalTex.wrapT = THREE.RepeatWrapping;
  normalTex.repeat.set(8, 8);
  normalTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  // ---- Roughness map: weave threads slightly less rough, gaps more rough ----
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
  roughTex.repeat.set(8, 8);

  return { colorTex, normalTex, roughTex };
}

// Image-on-fabric texture: paint user image centered on a fabric-tinted square.
function makeImageOnFabricTexture(image, baseColorHex) {
  const size = 1024;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');

  // Background fabric color
  ctx.fillStyle = baseColorHex;
  ctx.fillRect(0, 0, size, size);

  // Fit image EDGE-TO-EDGE with bleed (matches "各邊出血" reference): image fills
  // the whole canvas (cover, not contain), and the side faces sample the image edge
  // so the print wraps around the cushion.
  const iw = image.naturalWidth || image.width;
  const ih = image.naturalHeight || image.height;
  const scale = Math.max(size / iw, size / ih); // COVER
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(image, (size - dw) / 2, (size - dh) / 2, dw, dh);

  // Add subtle weave noise overlay on top so the image looks "printed on fabric"
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

// ---- Material assembly ----
// BoxGeometry materials order: [+X, -X, +Y, -Y, +Z, -Z]
// Visually: +Z = front (toward viewer), -Z = back, +X = right side, -X = left side, +Y = top, -Y = bottom.
const state = {
  baseColor: '#e8dccb',
  face: 'front', // 'front' | 'back' | 'both'
  image: null,   // HTMLImageElement
  bg: 'solid',
  autoRotate: false,
};

function buildMaterials() {
  const { colorTex, normalTex, roughTex } = makeCottonTextures(state.baseColor);
  const baseMat = new THREE.MeshPhysicalMaterial({
    map: colorTex,
    normalMap: normalTex,
    normalScale: new THREE.Vector2(0.8, 0.8),
    roughnessMap: roughTex,
    roughness: 0.95,
    metalness: 0.0,
    sheen: 0.7,
    sheenColor: new THREE.Color(0xfff5e8),
    sheenRoughness: 0.45,
    clearcoat: 0.0,
  });

  // For the printed image face, the user's image multiplies on top of fabric.
  // We still want weave normals/roughness, but the color map becomes the printed image.
  function makePrintedMat(imgTex) {
    const m = baseMat.clone();
    m.map = imgTex;
    m.normalMap = normalTex;       // share weave bumps
    m.roughnessMap = roughTex;
    // Printed surface slightly less rough / more sheen for ink-on-fabric look
    m.roughness = 0.88;
    m.sheen = 0.55;
    return m;
  }

  let frontMat, backMat;
  if (state.image) {
    const imgTex = makeImageOnFabricTexture(state.image, state.baseColor);
    if (state.face === 'front')      { frontMat = makePrintedMat(imgTex); backMat = baseMat.clone(); }
    else if (state.face === 'back')  { frontMat = baseMat.clone();        backMat = makePrintedMat(imgTex); }
    else                              { frontMat = makePrintedMat(imgTex); backMat = makePrintedMat(imgTex); }
  } else {
    frontMat = baseMat.clone();
    backMat = baseMat.clone();
  }

  // When user supplied an image, wrap it onto the side faces too (各邊出血 bleed).
  let sideMat;
  if (state.image) {
    const imgTex = makeImageOnFabricTexture(state.image, state.baseColor);
    sideMat = makePrintedMat(imgTex);
  } else {
    sideMat = baseMat;
  }

  // Material order: [+X, -X, +Y, -Y, +Z, -Z]
  return [
    sideMat.clone(),  // +X right side
    sideMat.clone(),  // -X left side
    sideMat.clone(),  // +Y top
    sideMat.clone(),  // -Y bottom
    frontMat,         // +Z front
    backMat,          // -Z back
  ];
}

let pillow = new THREE.Mesh(pillowGeo, buildMaterials());
pillow.castShadow = true;
pillow.receiveShadow = true;

// ---- Seam stitching: dashed line along the front-face perimeter, following the puffy surface ----
function makeSeams() {
  const group = new THREE.Group();
  const stitchMat = new THREE.MeshStandardMaterial({
    color: 0xfff3d8,
    roughness: 0.6,
    metalness: 0.0,
  });

  const inset = 0.018;
  const w2 = PILLOW_W / 2 - inset;
  const h2 = PILLOW_H / 2 - inset;
  const dashLen = 0.010;
  const gap = 0.008;
  const stitchRadius = 0.0022;

  // Approximate the puff offset at any (x,y) on the front face (matches makePillowGeometry math).
  // Returns z position of the surface at (x,y) on +Z face after bulge+pinch.
  function surfaceZ(x, y, faceSign) {
    const nx = x / (PILLOW_W / 2);
    const ny = y / (PILLOW_H / 2);
    // On the face, nz = ±1 so cos(nz*pi/2) = 0... we instead approximate the actual displaced Z.
    // The +Z face starts at z = faceSign * PILLOW_D/2, and at this face cos(±π/2)=0 so face-center bulge math collapses.
    // Use the formula: fz_at_face = cos(nx*π/2) * cos(ny*π/2) * BULGE * 1.15, plus subtract corner pinch toward origin (z component).
    const BULGE_LOCAL = 0.075 * 1.15;
    const CORNER_PINCH_LOCAL = 0.075;
    const fz = Math.cos(nx * Math.PI / 2) * Math.cos(ny * Math.PI / 2);
    const baseZ = faceSign * (PILLOW_D / 2 + BULGE_LOCAL * fz);
    // Corner pinch reduces this
    const ax = Math.abs(nx), ay = Math.abs(ny);
    const corner = Math.pow(ax, 2.0) * Math.pow(ay, 2.0);
    const pinch = CORNER_PINCH_LOCAL * corner * 0.5; // smaller weight on Z axis at face
    return baseZ - faceSign * pinch;
  }

  function addDashedRect(faceSign) {
    // Walk the four edges of the perimeter rectangle and emit dashes
    const corners = [
      [-w2, -h2], [ w2, -h2], [ w2,  h2], [-w2,  h2]
    ];
    for (let s = 0; s < 4; s++) {
      const [ax, ay] = corners[s];
      const [bx, by] = corners[(s + 1) % 4];
      const dx = bx - ax, dy = by - ay;
      const totalLen = Math.hypot(dx, dy);
      const step = dashLen + gap;
      let t = gap / 2;
      while (t + dashLen <= totalLen) {
        const t1 = t / totalLen;
        const t2 = (t + dashLen) / totalLen;
        const sx = ax + dx * t1, sy = ay + dy * t1;
        const ex = ax + dx * t2, ey = ay + dy * t2;
        const sz = surfaceZ(sx, sy, faceSign) + faceSign * 0.001;
        const ez = surfaceZ(ex, ey, faceSign) + faceSign * 0.001;
        const start = new THREE.Vector3(sx, sy, sz);
        const end   = new THREE.Vector3(ex, ey, ez);
        const mid   = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        const stitch = new THREE.Mesh(
          new THREE.CylinderGeometry(stitchRadius, stitchRadius, dashLen, 6),
          stitchMat
        );
        const up = new THREE.Vector3(0, 1, 0);
        const stitchDir = new THREE.Vector3().subVectors(end, start).normalize();
        stitch.quaternion.setFromUnitVectors(up, stitchDir);
        stitch.position.copy(mid);
        group.add(stitch);
        t += step;
      }
    }
  }
  addDashedRect( 1);
  addDashedRect(-1);
  return group;
}

const seams = makeSeams();
seams.visible = false; // hidden by default — reference cushion has no visible stitching

const pillowGroup = new THREE.Group();
pillowGroup.add(pillow);
pillowGroup.add(seams);
scene.add(pillowGroup);

function rebuildPillow() {
  // Dispose old materials/textures
  if (Array.isArray(pillow.material)) {
    pillow.material.forEach(m => {
      if (m.map) m.map.dispose();
      m.dispose();
    });
  }
  pillow.material = buildMaterials();
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

// Mark ready for Playwright
hud.textContent = 'ready · drag to rotate · scroll to zoom';
window.__pillowReady = true;

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

// ---- Playwright hook: load a test image programmatically ----
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
