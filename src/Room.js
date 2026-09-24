import * as THREE from 'three';

const WALL_THICKNESS = 0.25;
const FLOOR_DROP = 3.6; // meters the ground floor sits below the upper room

function createFloorTexture(baseColor) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);

  const planks = 8;
  for (let i = 0; i < planks; i++) {
    const y = (i / planks) * size;
    const shade = Math.random() * 0.12;
    ctx.fillStyle = `rgba(0,0,0,${shade})`;
    ctx.fillRect(0, y, size, size / planks);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }
  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, Math.random() * 40 + 5, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createWallTexture(baseColor) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 2500; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.035})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createYardTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#6d6d70';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 4000; i++) {
    const g = 55 + Math.random() * 40;
    ctx.fillStyle = `rgba(${g},${g},${g * 1.02},0.5)`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 4; i++) {
    const p = (i / 4) * size;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createCrateTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#8a5a34';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, size - 12, size - 12);
  ctx.beginPath();
  ctx.moveTo(6, 6);
  ctx.lineTo(size - 6, size - 6);
  ctx.moveTo(size - 6, 6);
  ctx.lineTo(6, size - 6);
  ctx.stroke();
  for (let i = 0; i < 400; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.08})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, Math.random() * 30 + 4, 1.5);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function addBox(group, material, w, h, d, x, y, z) {
  if (w <= 0 || h <= 0 || d <= 0) return;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  group.add(mesh);
}

/** A solid floor slab, or one with a rectangular hatch hole cut into it. */
function buildFloor(group, material, width, depth, y0, hole) {
  const surfaceY = y0 - WALL_THICKNESS / 2;
  if (!hole) {
    addBox(group, material, width, WALL_THICKNESS, depth, 0, surfaceY, 0);
    return;
  }

  const { x: hx, z: hz, w: hw, d: hd } = hole;
  const leftW = hx - hw / 2 + width / 2;
  const rightW = width / 2 - (hx + hw / 2);
  const frontD = hz - hd / 2 + depth / 2;
  const backD = depth / 2 - (hz + hd / 2);

  addBox(group, material, leftW, WALL_THICKNESS, depth, -width / 2 + leftW / 2, surfaceY, 0);
  addBox(group, material, rightW, WALL_THICKNESS, depth, width / 2 - rightW / 2, surfaceY, 0);
  addBox(group, material, hw, WALL_THICKNESS, frontD, hx, surfaceY, -depth / 2 + frontD / 2);
  addBox(group, material, hw, WALL_THICKNESS, backD, hx, surfaceY, depth / 2 - backD / 2);
}

/** Left/back/far walls (always solid) plus a right wall that's either a
 * window wall, fully open, or solid. */
function buildWalls(group, wallMat, width, depth, height, y0, rightWallMode) {
  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(depth, height), wallMat);
  leftWall.position.set(-width / 2, y0 + height / 2, 0);
  leftWall.rotation.y = Math.PI / 2;
  group.add(leftWall);

  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(width, height), wallMat);
  backWall.position.set(0, y0 + height / 2, depth / 2);
  backWall.rotation.y = Math.PI;
  group.add(backWall);

  const farWall = new THREE.Mesh(new THREE.PlaneGeometry(width, height), wallMat);
  farWall.position.set(0, y0 + height / 2, -depth / 2);
  group.add(farWall);

  if (rightWallMode === 'solid') {
    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(depth, height), wallMat);
    rightWall.position.set(width / 2, y0 + height / 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    group.add(rightWall);
  } else if (rightWallMode === 'windows') {
    const sillY = y0 + 1.0;
    const windowH = 1.5;
    const lintelY = sillY + windowH;
    const windowLen = depth * 0.22;
    const postLen = (depth - windowLen * 2) / 3;
    const wallX = width / 2;

    addBox(group, wallMat, WALL_THICKNESS, sillY - y0, depth, wallX, y0 + (sillY - y0) / 2, 0);
    addBox(group, wallMat, WALL_THICKNESS, y0 + height - lintelY, depth, wallX, lintelY + (y0 + height - lintelY) / 2, 0);
    addBox(group, wallMat, WALL_THICKNESS, windowH, postLen, wallX, sillY + windowH / 2, -depth / 2 + postLen / 2);
    addBox(
      group, wallMat, WALL_THICKNESS, windowH, postLen,
      wallX, sillY + windowH / 2, -depth / 2 + 1.5 * postLen + windowLen
    );
    addBox(group, wallMat, WALL_THICKNESS, windowH, postLen, wallX, sillY + windowH / 2, depth / 2 - postLen / 2);

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xbfe8ff,
      transparent: true,
      opacity: 0.12,
      roughness: 0.05,
      transmission: 0.6,
    });
    const window1Z = -depth / 2 + postLen + windowLen / 2;
    const window2Z = -depth / 2 + 2 * postLen + 1.5 * windowLen;
    for (const wz of [window1Z, window2Z]) {
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(windowLen * 0.94, windowH * 0.94), glassMat);
      pane.position.set(wallX - WALL_THICKNESS / 2 + 0.02, sillY + windowH / 2, wz);
      pane.rotation.y = -Math.PI / 2;
      group.add(pane);
    }
  }
  // rightWallMode === 'open': no wall at all - leads out to the yard.
}

function addCrates(scene, crateTex, count, centerX, centerZ, spread, groundY) {
  const material = new THREE.MeshStandardMaterial({ map: crateTex, roughness: 0.85 });
  for (let i = 0; i < count; i++) {
    const size = 0.55 + Math.random() * 0.65;
    const crate = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), material);
    crate.position.set(
      centerX + (Math.random() - 0.5) * spread,
      groundY + size / 2,
      centerZ + (Math.random() - 0.5) * spread
    );
    crate.rotation.y = Math.random() * Math.PI * 2;
    scene.add(crate);
  }
}

/**
 * Builds the whole building: an upper room (mildly randomized dimensions)
 * with windows in its right wall and a floor hatch you can drop through,
 * and a ground floor directly below sharing the same footprint, open on
 * its right side onto an exterior crate yard where Carnage lurks.
 */
export function buildRoom(scene) {
  const width = 6 + Math.random() * 2;
  const depth = 6 + Math.random() * 2;
  const height = 3.4;
  const groundHeight = 3.0 + Math.random() * 0.6;
  const groundY = -FLOOR_DROP;

  scene.background = new THREE.Color(0x1c2733);
  scene.fog = new THREE.FogExp2(0x1c2733, 0.018);

  // Floor hatch: off toward the left wall, clear of the spawn point and
  // the Venom twin, so falling through it is deliberate, not accidental.
  const hole = { x: -width * 0.22, z: -depth * 0.12, w: 1.6, d: 1.6 };

  const upperGroup = new THREE.Group();
  scene.add(upperGroup);

  const floorMat = new THREE.MeshStandardMaterial({ map: createFloorTexture('#2f5c33'), roughness: 0.85 });
  buildFloor(upperGroup, floorMat, width, depth, 0, hole);

  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.95 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = height;
  upperGroup.add(ceiling);

  const wallMat = new THREE.MeshStandardMaterial({ map: createWallTexture('#cfc9bd'), roughness: 0.92 });
  buildWalls(upperGroup, wallMat, width, depth, height, 0, 'windows');

  // Ground floor, directly below - same footprint, open on the right onto
  // the yard. No ceiling of its own: it's really just walls wrapped around
  // part of the same ground level the yard sits on.
  const groundGroup = new THREE.Group();
  scene.add(groundGroup);
  const groundWallMat = new THREE.MeshStandardMaterial({ map: createWallTexture('#5a5f66'), roughness: 0.9 });
  buildWalls(groundGroup, groundWallMat, width, depth, groundHeight, groundY, 'open');

  // Exterior/ground-level yard - large enough to run underneath the whole
  // building footprint as well as out into the open crate yard beyond it.
  const wallX = width / 2;
  const yardTex = createYardTexture();
  yardTex.repeat.set(48, 48);
  const yard = new THREE.Mesh(
    new THREE.PlaneGeometry(220, 220),
    new THREE.MeshStandardMaterial({ map: yardTex, roughness: 0.95 })
  );
  yard.rotation.x = -Math.PI / 2;
  yard.position.set(wallX, groundY, 0);
  scene.add(yard);

  const crateTex = createCrateTexture();
  addCrates(scene, crateTex, 14, wallX + 10, 1, 16, groundY);

  const ambient = new THREE.HemisphereLight(0xaebfe0, 0x2a2318, 0.7);
  scene.add(ambient);
  const fillAmbient = new THREE.AmbientLight(0xfff2df, 0.25);
  scene.add(fillAmbient);
  const sun = new THREE.DirectionalLight(0xdce8ff, 0.9);
  sun.position.set(wallX + 8, 8, -4);
  sun.target.position.set(0, height / 2, 0);
  scene.add(sun);
  scene.add(sun.target);
  const fill = new THREE.PointLight(0xfff0dd, 0.5, 12, 2);
  fill.position.set(0, height - 0.3, depth / 2 - 1.5);
  scene.add(fill);
  const yardLight = new THREE.PointLight(0xff5540, 2.5, 30, 2);
  yardLight.position.set(wallX + 10, groundY + 4, 1);
  scene.add(yardLight);
  const groundFill = new THREE.PointLight(0xdce8ff, 0.8, 14, 2);
  groundFill.position.set(0, groundY + groundHeight - 0.3, 0);
  scene.add(groundFill);

  return {
    width,
    depth,
    height,
    groundY,
    hole,
    spawnPosition: new THREE.Vector3(0, 0, depth / 2 - 1.6),
    npcPosition: new THREE.Vector3(0, 0, -0.6),
    carnagePosition: new THREE.Vector3(wallX + 11, groundY, 2),
  };
}
