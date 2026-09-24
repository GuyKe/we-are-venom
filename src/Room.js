import * as THREE from 'three';

const WALL_THICKNESS = 0.25;

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

function createGrassTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#3d7a2e';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 5000; i++) {
    const g = 90 + Math.random() * 70;
    ctx.fillStyle = `rgba(${(g * 0.3) | 0}, ${g | 0}, ${(g * 0.25) | 0}, 0.55)`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1.5, 4 + Math.random() * 4);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function addWindowWallBox(group, material, w, h, x, y, z) {
  if (w <= 0 || h <= 0) return;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, WALL_THICKNESS), material);
  mesh.position.set(x, y, z);
  group.add(mesh);
}

/**
 * A plain indoor room (mildly randomized dimensions each load) with two
 * windows cut into its far wall, looking out onto an exterior grass field
 * under open sky.
 */
export function buildRoom(scene) {
  const width = 8 + Math.random() * 3;
  const depth = 8 + Math.random() * 3;
  const height = 3.4;

  scene.background = new THREE.Color(0x8fc7ea);
  scene.fog = new THREE.FogExp2(0x9fd0ec, 0.02);

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

  const sideWallGeo = new THREE.PlaneGeometry(depth, height);
  const leftWall = new THREE.Mesh(sideWallGeo, wallMat);
  leftWall.position.set(-width / 2, height / 2, 0);
  leftWall.rotation.y = Math.PI / 2;
  group.add(leftWall);

  const rightWall = new THREE.Mesh(sideWallGeo, wallMat);
  rightWall.position.set(width / 2, height / 2, 0);
  rightWall.rotation.y = -Math.PI / 2;
  group.add(rightWall);

  // Entrance wall, behind the player's spawn point - solid, no window.
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(width, height), wallMat);
  backWall.position.set(0, height / 2, depth / 2);
  backWall.rotation.y = Math.PI;
  group.add(backWall);

  // Far wall, built from segments framing two window openings.
  const sillY = 1.0;
  const windowH = 1.5;
  const lintelY = sillY + windowH;
  const windowW = width * 0.22;
  const postW = (width - windowW * 2) / 3;
  const wallZ = -depth / 2;

  addWindowWallBox(group, wallMat, width, sillY, 0, sillY / 2, wallZ);
  addWindowWallBox(group, wallMat, width, height - lintelY, 0, lintelY + (height - lintelY) / 2, wallZ);
  addWindowWallBox(group, wallMat, postW, windowH, -width / 2 + postW / 2, sillY + windowH / 2, wallZ);
  addWindowWallBox(group, wallMat, postW, windowH, -width / 2 + 1.5 * postW + windowW, sillY + windowH / 2, wallZ);
  addWindowWallBox(group, wallMat, postW, windowH, width / 2 - postW / 2, sillY + windowH / 2, wallZ);

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xbfe8ff,
    transparent: true,
    opacity: 0.12,
    roughness: 0.05,
    transmission: 0.6,
  });
  const window1X = -width / 2 + postW + windowW / 2;
  const window2X = -width / 2 + 2 * postW + 1.5 * windowW;
  for (const wx of [window1X, window2X]) {
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(windowW * 0.94, windowH * 0.94), glassMat);
    pane.position.set(wx, sillY + windowH / 2, wallZ + WALL_THICKNESS / 2 - 0.02);
    group.add(pane);
  }

  // Exterior grass field, visible through the two window openings.
  const grassTex = createGrassTexture();
  grassTex.repeat.set(32, 32);
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 160),
    new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 })
  );
  grass.rotation.x = -Math.PI / 2;
  grass.position.set(0, -0.02, wallZ - 75);
  scene.add(grass);

  const ambient = new THREE.HemisphereLight(0xdfe9ff, 0x4a4030, 0.85);
  scene.add(ambient);
  const fillAmbient = new THREE.AmbientLight(0xfff2df, 0.3);
  scene.add(fillAmbient);
  const sun = new THREE.DirectionalLight(0xfff3d6, 1.1);
  sun.position.set(-4, 6, wallZ - 3); // angled as if streaming in through the windows
  sun.target.position.set(0, height / 2, 0);
  scene.add(sun);
  scene.add(sun.target);
  const fill = new THREE.PointLight(0xfff0dd, 0.6, 12, 2);
  fill.position.set(0, height - 0.3, depth / 2 - 1.5);
  scene.add(fill);

  return {
    width,
    depth,
    height,
    spawnPosition: new THREE.Vector3(0, 0, depth / 2 - 1.6),
    npcPosition: new THREE.Vector3(0, 0, -0.6),
  };
}
