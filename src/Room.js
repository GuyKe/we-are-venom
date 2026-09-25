import * as THREE from 'three';

const WALL_THICKNESS = 0.25;
const FLOOR_DROP = 3.6; // meters the ground floor sits below the upper room

// A deliberately tiny, blurry-when-stretched checkerboard - the PS1-era
// look of a floor texture that's a handful of pixels magnified way up,
// rather than a crisp modern tile pattern.
function createCheckerFloorTexture() {
  const size = 64;
  const cells = 8;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const palette = ['#2f6e63', '#3f8f7a', '#4aa5a0', '#2a5a6e', '#356b52', '#57a08c'];

  const cell = size / cells;
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const checker = (x + y) % 2 === 0;
      const base = palette[Math.floor(Math.random() * palette.length)];
      ctx.fillStyle = checker ? base : '#173a3f';
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Same idea for the walls: a tiny canvas of soft color blobs, so tiling
// and magnification turn it into that mottled, low-res PS1 wall look
// instead of a sharp repeating pattern.
function createWallTexture(baseColor) {
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 40; i++) {
    const shade = (Math.random() - 0.5) * 0.5;
    ctx.fillStyle = shade > 0 ? `rgba(255,255,255,${shade})` : `rgba(0,0,0,${-shade})`;
    const r = 3 + Math.random() * 6;
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createChalkboardTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size / 2;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1c2b22';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 300; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`;
    ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createDoorTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size * 2;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#6b4326';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 6;
  for (const panelY of [0.06, 0.52]) {
    ctx.strokeRect(size * 0.14, canvas.height * panelY, size * 0.72, canvas.height * 0.38);
  }
  for (let i = 0; i < 300; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.08})`;
    ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 20 + 4, 1.5);
  }
  ctx.fillStyle = '#d8b25a';
  ctx.beginPath();
  ctx.arc(size * 0.82, canvas.height * 0.5, 6, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// A tiny, blurry-when-stretched green ground texture - smeared streaky
// grass rather than crisp blades, matching a hazy dreamcore playground
// field instead of a modern lawn.
function createGlitchGrassTexture() {
  const size = 48;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#4a7a1f';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 220; i++) {
    const g = 90 + Math.random() * 90;
    ctx.fillStyle = `rgba(${g * 0.55}, ${g}, ${g * 0.3}, 0.6)`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 3, 1 + Math.random() * 5);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Digital-corruption "glitched" walls: banded colour-channel offsets and
// blocky static noise instead of a clean material.
function createGlitchWallTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#12140f';
  ctx.fillRect(0, 0, size, size);

  // Horizontal bands, each shifted and tinted like a corrupted scanline.
  const bandCount = 14;
  for (let i = 0; i < bandCount; i++) {
    const y = (i / bandCount) * size;
    const h = size / bandCount;
    const hue = Math.floor(Math.random() * 360);
    const glitchy = Math.random() < 0.4;
    ctx.fillStyle = glitchy ? `hsl(${hue}, 90%, 55%)` : `hsl(${hue}, 25%, ${12 + Math.random() * 10}%)`;
    const xOffset = glitchy ? (Math.random() - 0.5) * size * 0.6 : 0;
    ctx.fillRect(xOffset, y, size, h);
  }

  // Blocky static noise in classic glitch colours.
  const glitchColors = ['#ff2fd0', '#2fe0ff', '#f7ff2f', '#ffffff'];
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = glitchColors[Math.floor(Math.random() * glitchColors.length)];
    ctx.globalAlpha = 0.5 + Math.random() * 0.4;
    const w = 2 + Math.random() * 10;
    const h = 1 + Math.random() * 3;
    ctx.fillRect(Math.random() * size, Math.random() * size, w, h);
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// A radiating rainbow "sunburst" for the sky, built with a conic
// gradient - a flat, poster-ish rainbow fan rather than a physical sky.
function createRainbowSkyTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size / 2;
  const ctx = canvas.getContext('2d');

  const cx = size / 2;
  const cy = canvas.height * 0.95;
  const gradient = ctx.createConicGradient(-Math.PI / 2 - 0.9, cx, cy);
  const hues = [0, 35, 60, 130, 200, 260, 300, 360];
  hues.forEach((h, i) => gradient.addColorStop(i / (hues.length - 1), `hsl(${h}, 85%, 68%)`));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, canvas.height);

  // Soft pastel wash over the top so it reads as hazy rather than a crisp print.
  const wash = ctx.createLinearGradient(0, 0, 0, canvas.height);
  wash.addColorStop(0, 'rgba(255,255,255,0.35)');
  wash.addColorStop(1, 'rgba(255,255,255,0.05)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, size, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function addSkydome(scene, center, radius) {
  const geometry = new THREE.SphereGeometry(radius, 24, 16);
  const material = new THREE.MeshBasicMaterial({
    map: createRainbowSkyTexture(),
    side: THREE.BackSide,
    fog: false,
  });
  const dome = new THREE.Mesh(geometry, material);
  dome.position.copy(center);
  scene.add(dome);
  return dome;
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
    // Small, roughly square windows in a row - three of them, framed by
    // posts, like a row of classroom windows.
    const windowCount = 3;
    const sillY = y0 + 1.15;
    const windowH = 1.15;
    const lintelY = sillY + windowH;
    const totalWindowLen = depth * 0.6;
    const windowLen = totalWindowLen / windowCount;
    const postLen = (depth - totalWindowLen) / (windowCount + 1);
    const wallX = width / 2;

    addBox(group, wallMat, WALL_THICKNESS, sillY - y0, depth, wallX, y0 + (sillY - y0) / 2, 0);
    addBox(group, wallMat, WALL_THICKNESS, y0 + height - lintelY, depth, wallX, lintelY + (y0 + height - lintelY) / 2, 0);

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xbfe8ff,
      transparent: true,
      opacity: 0.12,
      roughness: 0.05,
      transmission: 0.6,
    });

    let z = -depth / 2;
    for (let i = 0; i <= windowCount; i++) {
      addBox(group, wallMat, WALL_THICKNESS, windowH, postLen, wallX, sillY + windowH / 2, z + postLen / 2);
      z += postLen;
      if (i < windowCount) {
        const pane = new THREE.Mesh(new THREE.PlaneGeometry(windowLen * 0.9, windowH * 0.9), glassMat);
        pane.position.set(wallX - WALL_THICKNESS / 2 + 0.02, sillY + windowH / 2, z + windowLen / 2);
        pane.rotation.y = -Math.PI / 2;
        group.add(pane);
        z += windowLen;
      }
    }
  }
  // rightWallMode === 'open': no wall at all - leads out to the yard.
}

function addDesks(group, width, depth, exclusions) {
  const topMat = new THREE.MeshStandardMaterial({ color: '#b5651d', roughness: 0.7 });
  const legMat = new THREE.MeshStandardMaterial({ color: '#2b2b2b', roughness: 0.6 });
  const topGeo = new THREE.BoxGeometry(0.55, 0.04, 0.42);
  const legGeo = new THREE.CylinderGeometry(0.03, 0.05, 0.5, 8);

  const cols = 3;
  const rows = 2;
  const marginX = width * 0.2;
  const marginZ = depth * 0.2;
  const usableW = width - marginX * 2;
  const usableD = depth - marginZ * 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = -width / 2 + marginX + (c + 0.5) * (usableW / cols);
      const z = -depth / 2 + marginZ + (r + 0.5) * (usableD / rows);
      const blocked = exclusions.some((ex) => Math.abs(x - ex.x) < ex.r && Math.abs(z - ex.z) < ex.r);
      if (blocked) continue;

      const top = new THREE.Mesh(topGeo, topMat);
      top.position.set(x, 0.5, z);
      group.add(top);
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(x, 0.25, z);
      group.add(leg);
    }
  }
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
 * its right side onto an exterior playground under a psychedelic rainbow
 * sky.
 */
export function buildRoom(scene) {
  const width = 6 + Math.random() * 2;
  const depth = 6 + Math.random() * 2;
  const height = 3.4;
  const groundHeight = 3.0 + Math.random() * 0.6;
  const groundY = -FLOOR_DROP;

  scene.background = new THREE.Color(0xf0e6f5);
  scene.fog = new THREE.FogExp2(0xf0e6f5, 0.01);

  // Floor hatch: off toward the left wall, clear of the spawn point and
  // the Venom twin, so falling through it is deliberate, not accidental.
  const hole = { x: -width * 0.22, z: -depth * 0.12, w: 1.6, d: 1.6 };

  const upperGroup = new THREE.Group();
  scene.add(upperGroup);

  const floorMat = new THREE.MeshStandardMaterial({ map: createCheckerFloorTexture(), roughness: 0.85 });
  buildFloor(upperGroup, floorMat, width, depth, 0, hole);

  // Flat, unlit black - a PS1-era ceiling that just isn't rendered as
  // anything but a void above the room.
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), new THREE.MeshBasicMaterial({ color: 0x050505 }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = height;
  upperGroup.add(ceiling);

  const wallMat = new THREE.MeshStandardMaterial({ map: createWallTexture('#c9a45c'), roughness: 0.92 });
  buildWalls(upperGroup, wallMat, width, depth, height, 0, 'windows');

  // A chalkboard on the far wall, facing the spawn point.
  const chalkboard = new THREE.Mesh(
    new THREE.PlaneGeometry(Math.min(2.4, width * 0.5), 1.1),
    new THREE.MeshStandardMaterial({ map: createChalkboardTexture(), roughness: 0.8 })
  );
  chalkboard.position.set(width * 0.15, 1.7, -depth / 2 + WALL_THICKNESS / 2 + 0.02);
  upperGroup.add(chalkboard);

  // A closed door on the left wall, near the entrance corner.
  const door = new THREE.Mesh(
    new THREE.PlaneGeometry(0.95, 2.05),
    new THREE.MeshStandardMaterial({ map: createDoorTexture(), roughness: 0.75 })
  );
  door.position.set(-width / 2 + WALL_THICKNESS / 2 + 0.02, 1.025, depth / 2 - 1.1);
  door.rotation.y = Math.PI / 2;
  upperGroup.add(door);

  // School desks scattered around the room, clear of the hatch, the
  // spawn point, and the Venom twin's starting spot.
  addDesks(upperGroup, width, depth, [
    { x: hole.x, z: hole.z, r: 1.3 },
    { x: 0, z: depth / 2 - 1.6, r: 1.0 },
    { x: 0, z: -0.6, r: 1.0 },
  ]);

  // Ground floor ("the playground"), directly below - same footprint,
  // open on the right onto the exterior. No ceiling of its own: it's
  // really just walls wrapped around part of the same ground level the
  // playground sits on. Glitched walls - a corrupted-looking texture
  // instead of a clean material.
  const groundGroup = new THREE.Group();
  scene.add(groundGroup);
  const groundWallMat = new THREE.MeshStandardMaterial({ map: createGlitchWallTexture(), roughness: 0.9 });
  buildWalls(groundGroup, groundWallMat, width, depth, groundHeight, groundY, 'open');

  // Exterior playground - large enough to run underneath the whole
  // building footprint as well as out into the open field beyond it,
  // under a radiating rainbow sky.
  const wallX = width / 2;
  const grassTex = createGlitchGrassTexture();
  grassTex.repeat.set(48, 48);
  const yard = new THREE.Mesh(
    new THREE.PlaneGeometry(220, 220),
    new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.95 })
  );
  yard.rotation.x = -Math.PI / 2;
  yard.position.set(wallX, groundY, 0);
  scene.add(yard);
  addSkydome(scene, new THREE.Vector3(wallX + 15, groundY + 5, 0), 150);

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
  const groundFill = new THREE.PointLight(0xdce8ff, 0.8, 14, 2);
  groundFill.position.set(0, groundY + groundHeight - 0.3, 0);
  scene.add(groundFill);
  const playgroundGlow = new THREE.PointLight(0xffe0f5, 1.6, 30, 2);
  playgroundGlow.position.set(wallX + 15, groundY + 6, 0);
  scene.add(playgroundGlow);

  return {
    width,
    depth,
    height,
    groundY,
    hole,
    spawnPosition: new THREE.Vector3(0, 0, depth / 2 - 1.6),
    npcPosition: new THREE.Vector3(0, 0, -0.6),
  };
}
