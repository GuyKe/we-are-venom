import * as THREE from 'three';

const WALL_THICKNESS = 0.25;
const FLOOR_DROP = 3.6; // meters the yard sits below the room floor - we're one story up

function createWoodFloorTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#5b3f2c';
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

function createWallTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#cfc9bd';
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
  // Faint expansion-joint grid, like a concrete yard.
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

function addWallBox(group, material, w, h, d, x, y, z) {
  if (w <= 0 || h <= 0 || d <= 0) return;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  group.add(mesh);
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
 * A plain indoor room (mildly randomized dimensions each load) on the
 * second floor of a building: two windows are cut into its right-hand
 * wall, looking down onto an exterior yard scattered with crates.
 */
export function buildRoom(scene) {
  const width = 8 + Math.random() * 3;
  const depth = 8 + Math.random() * 3;
  const height = 3.4;

  scene.background = new THREE.Color(0x1c2733);
  scene.fog = new THREE.FogExp2(0x1c2733, 0.018);

  const group = new THREE.Group();
  scene.add(group);

  const floorTex = createWoodFloorTexture();
  floorTex.repeat.set(width / 2, depth / 2);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.85 })
  );
  floor.rotation.x = -Math.PI / 2;
  group.add(floor);

  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.95 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = height;
  group.add(ceiling);

  const wallTex = createWallTexture();
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.92 });

  // Left wall - solid.
  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(depth, height), wallMat);
  leftWall.position.set(-width / 2, height / 2, 0);
  leftWall.rotation.y = Math.PI / 2;
  group.add(leftWall);

  // Entrance wall, behind the player's spawn point - solid.
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(width, height), wallMat);
  backWall.position.set(0, height / 2, depth / 2);
  backWall.rotation.y = Math.PI;
  group.add(backWall);

  // Far wall - solid.
  const farWall = new THREE.Mesh(new THREE.PlaneGeometry(width, height), wallMat);
  farWall.position.set(0, height / 2, -depth / 2);
  group.add(farWall);

  // Right wall, built from segments framing two window openings.
  const sillY = 1.0;
  const windowH = 1.5;
  const lintelY = sillY + windowH;
  const windowLen = depth * 0.22;
  const postLen = (depth - windowLen * 2) / 3;
  const wallX = width / 2;

  addWallBox(group, wallMat, WALL_THICKNESS, sillY, depth, wallX, sillY / 2, 0);
  addWallBox(group, wallMat, WALL_THICKNESS, height - lintelY, depth, wallX, lintelY + (height - lintelY) / 2, 0);
  addWallBox(group, wallMat, WALL_THICKNESS, windowH, postLen, wallX, sillY + windowH / 2, -depth / 2 + postLen / 2);
  addWallBox(
    group, wallMat, WALL_THICKNESS, windowH, postLen,
    wallX, sillY + windowH / 2, -depth / 2 + 1.5 * postLen + windowLen
  );
  addWallBox(group, wallMat, WALL_THICKNESS, windowH, postLen, wallX, sillY + windowH / 2, depth / 2 - postLen / 2);

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

  // Exterior yard, one story down - a Carnage-infested crate yard, seen
  // through the windows and looking down on it since this room is up on
  // the second floor.
  const groundY = -FLOOR_DROP;
  const yardTex = createYardTexture();
  yardTex.repeat.set(24, 24);
  const yard = new THREE.Mesh(
    new THREE.PlaneGeometry(140, 140),
    new THREE.MeshStandardMaterial({ map: yardTex, roughness: 0.95 })
  );
  yard.rotation.x = -Math.PI / 2;
  yard.position.set(wallX + 65, groundY, 0);
  scene.add(yard);

  const crateTex = createCrateTexture();
  addCrates(scene, crateTex, 14, wallX + 10, 1, 16, groundY);

  const ambient = new THREE.HemisphereLight(0xaebfe0, 0x2a2318, 0.7);
  scene.add(ambient);
  const fillAmbient = new THREE.AmbientLight(0xfff2df, 0.25);
  scene.add(fillAmbient);
  const sun = new THREE.DirectionalLight(0xdce8ff, 0.9);
  sun.position.set(wallX + 8, 8, -4); // cool moonlight slanting in through the windows
  sun.target.position.set(0, height / 2, 0);
  scene.add(sun);
  scene.add(sun.target);
  const fill = new THREE.PointLight(0xfff0dd, 0.5, 12, 2);
  fill.position.set(0, height - 0.3, depth / 2 - 1.5);
  scene.add(fill);
  const yardLight = new THREE.PointLight(0xff5540, 2.5, 30, 2);
  yardLight.position.set(wallX + 10, groundY + 4, 1);
  scene.add(yardLight);

  return {
    width,
    depth,
    height,
    spawnPosition: new THREE.Vector3(0, 0, depth / 2 - 1.6),
    npcPosition: new THREE.Vector3(0, 0, -0.6),
    carnagePosition: new THREE.Vector3(wallX + 11, groundY, 2),
  };
}
