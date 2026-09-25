import * as THREE from 'three';
import { createVenomMaterial } from './venomTexture.js';

const WALL_THICKNESS = 0.25;
const FLOOR_DROP = 3.6; // meters the ground floor sits below the upper room
const TUNNEL_WIDTH = 1.7;
const TUNNEL_HEIGHT = 2.2;
const TUNNEL_RUN = 6.5; // horizontal distance the tunnel covers as it descends

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
  // Dried-mud crack veins between patches of grass.
  ctx.strokeStyle = 'rgba(20,30,10,0.55)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    let x = Math.random() * size;
    let y = Math.random() * size;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let j = 0; j < 4; j++) {
      x += (Math.random() - 0.5) * size * 0.4;
      y += (Math.random() - 0.5) * size * 0.4;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
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

/** A solid floor slab. */
function buildFloor(group, material, width, depth, y0) {
  addBox(group, material, width, WALL_THICKNESS, depth, 0, y0 - WALL_THICKNESS / 2, 0);
}

/** The left wall, either a solid plane or - when an opening is given - built
 * from four boxes framing a rectangular doorway (the tunnel entrance). */
function buildLeftWall(group, wallMat, width, depth, height, y0, opening) {
  const x = -width / 2;
  if (!opening) {
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(depth, height), wallMat);
    leftWall.position.set(x, y0 + height / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    group.add(leftWall);
    return;
  }

  const { z: oz, y: oy, w: ow, h: oh } = opening;
  const bottomH = oy;
  const topH = height - oy - oh;
  const beforeD = oz - ow / 2 + depth / 2;
  const afterD = depth / 2 - (oz + ow / 2);

  addBox(group, wallMat, WALL_THICKNESS, bottomH, depth, x, y0 + bottomH / 2, 0);
  addBox(group, wallMat, WALL_THICKNESS, topH, depth, x, y0 + oy + oh + topH / 2, 0);
  addBox(group, wallMat, WALL_THICKNESS, oh, beforeD, x, y0 + oy + oh / 2, -depth / 2 + beforeD / 2);
  addBox(group, wallMat, WALL_THICKNESS, oh, afterD, x, y0 + oy + oh / 2, depth / 2 - afterD / 2);
}

/** Left/back/far walls (always solid) plus a right wall that's either a
 * window wall, fully open, or solid. */
function buildWalls(group, wallMat, width, depth, height, y0, rightWallMode, leftOpening = null) {
  buildLeftWall(group, wallMat, width, depth, height, y0, leftOpening);

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

// Small piles of crates - a base crate with a second one leaning/tilted
// against or on top of it, occasionally with a third alongside - rather
// than a field of individually scattered boxes. Returns every individual
// crate mesh so the caller can give each one its own physics.
function addCrateStacks(scene, crateTex, stackCount, centerX, centerZ, spread, groundY) {
  const material = new THREE.MeshStandardMaterial({ map: crateTex, roughness: 0.85 });
  const crates = [];

  for (let i = 0; i < stackCount; i++) {
    const cx = centerX + (Math.random() - 0.5) * spread;
    const cz = centerZ + (Math.random() - 0.5) * spread;

    const baseSize = 0.6 + Math.random() * 0.5;
    const base = new THREE.Mesh(new THREE.BoxGeometry(baseSize, baseSize, baseSize), material);
    base.position.set(cx, groundY + baseSize / 2, cz);
    base.rotation.y = Math.random() * Math.PI * 2;
    scene.add(base);
    crates.push(base);

    const topSize = 0.5 + Math.random() * 0.4;
    const top = new THREE.Mesh(new THREE.BoxGeometry(topSize, topSize, topSize), material);
    const lean = (Math.random() - 0.5) * 0.9;
    top.position.set(
      cx + Math.sin(lean) * topSize * 0.4,
      groundY + baseSize + Math.cos(lean) * topSize * 0.45,
      cz + (Math.random() - 0.5) * 0.2
    );
    top.rotation.z = lean;
    top.rotation.y = Math.random() * Math.PI * 2;
    scene.add(top);
    crates.push(top);

    if (Math.random() < 0.5) {
      const extraSize = 0.4 + Math.random() * 0.3;
      const extra = new THREE.Mesh(new THREE.BoxGeometry(extraSize, extraSize, extraSize), material);
      extra.position.set(cx + (Math.random() - 0.5) * 0.7, groundY + extraSize / 2, cz + (Math.random() - 0.5) * 0.7);
      extra.rotation.y = Math.random() * Math.PI * 2;
      scene.add(extra);
      crates.push(extra);
    }
  }

  return crates;
}

/**
 * A sloped, enclosed corridor descending from a doorway in the upper
 * room's left wall down to ground-floor level outside the building - the
 * physical "way downstairs", replacing a straight vertical drop. Built as
 * one rotated group so the floor/walls/ceiling all share the same slope;
 * `addRampRegion` (called separately, in main.js) gives it matching
 * walkable gravity.
 */
function buildTunnel(scene, wallMat, entrance) {
  const tunnelLen = Math.hypot(TUNNEL_RUN, FLOOR_DROP);
  const angle = Math.atan2(-FLOOR_DROP, -TUNNEL_RUN);

  const group = new THREE.Group();
  group.position.copy(entrance);
  group.rotation.z = angle;
  scene.add(group);

  addBox(group, wallMat, tunnelLen, WALL_THICKNESS, TUNNEL_WIDTH, tunnelLen / 2, -WALL_THICKNESS / 2, 0);
  addBox(group, wallMat, tunnelLen, TUNNEL_HEIGHT, WALL_THICKNESS, tunnelLen / 2, TUNNEL_HEIGHT / 2, TUNNEL_WIDTH / 2);
  addBox(group, wallMat, tunnelLen, TUNNEL_HEIGHT, WALL_THICKNESS, tunnelLen / 2, TUNNEL_HEIGHT / 2, -TUNNEL_WIDTH / 2);
  addBox(group, wallMat, tunnelLen, WALL_THICKNESS, TUNNEL_WIDTH, tunnelLen / 2, TUNNEL_HEIGHT + WALL_THICKNESS / 2, 0);

  const light = new THREE.PointLight(0xbcd4ff, 0.7, TUNNEL_WIDTH * 4, 2);
  light.position.set(tunnelLen / 2, TUNNEL_HEIGHT * 0.7, 0);
  group.add(light);

  return group;
}

/** A dark iron mace - handle plus a spiked head - sized to grip with a
 * controller trigger and swing. */
function createMace() {
  const group = new THREE.Group();

  const handleMat = new THREE.MeshStandardMaterial({ color: '#3b2a1a', roughness: 0.8 });
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.55, 8), handleMat);
  handle.position.y = 0.275;
  group.add(handle);

  const headMat = new THREE.MeshStandardMaterial({ color: '#5c5c66', roughness: 0.4, metalness: 0.65 });
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14, 0), headMat);
  head.position.y = 0.62;
  group.add(head);

  const spikeGeo = new THREE.ConeGeometry(0.035, 0.16, 6);
  for (let i = 0; i < 10; i++) {
    const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    const spike = new THREE.Mesh(spikeGeo, headMat);
    spike.position.copy(dir).multiplyScalar(0.15).add(new THREE.Vector3(0, 0.62, 0));
    spike.lookAt(spike.position.clone().add(dir));
    spike.rotateX(Math.PI / 2);
    group.add(spike);
  }

  return group;
}

// A swirling vortex texture for the portal hidden in the wall-face's
// mouth - a rotating conic rainbow gradient with a dark vortex core.
function createPortalTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;

  const gradient = ctx.createConicGradient(0, cx, cy);
  const hues = [280, 200, 320, 180, 260, 300, 280];
  hues.forEach((h, i) => gradient.addColorStop(i / (hues.length - 1), `hsl(${h}, 90%, 60%)`));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
  ctx.fill();

  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.5);
  core.addColorStop(0, 'rgba(5,0,15,0.9)');
  core.addColorStop(0.5, 'rgba(20,0,30,0.15)');
  core.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// A random symbiote face looming at the far end of the playground - a
// flat standing wall/monolith of black symbiote mass with wide eyes and a
// jagged, gaping mouth mounted on its front face, like the mouth-board
// from the reference image. Every dimension is randomized per load so no
// two are quite alike. It's turned to look back toward `lookAt` (the
// school building) rather than an arbitrary direction. Hidden inside its
// mouth is a portal, invisible until fed enough rainbow orbs - see
// buildRoom's returned `doorPortal`.
function addSymbioteFace(scene, position, lookAt) {
  const group = new THREE.Group();
  group.position.copy(position);
  const dx = lookAt.x - position.x;
  const dz = lookAt.z - position.z;
  group.rotation.y = Math.atan2(dx, dz) + (Math.random() - 0.5) * 0.3;
  scene.add(group);

  const material = createVenomMaterial();
  const wallWidth = 2.6 + Math.random() * 1.0;
  const wallHeight = 3.0 + Math.random() * 1.0;
  const wallThickness = 0.5 + Math.random() * 0.25;
  const wall = new THREE.Mesh(new THREE.BoxGeometry(wallWidth, wallHeight, wallThickness), material);
  wall.position.y = wallHeight / 2;
  group.add(wall);

  const faceZ = wallThickness / 2 + 0.015;

  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xf4f7ff });
  const eyeGeo = new THREE.SphereGeometry(1, 12, 10);
  eyeGeo.scale(wallWidth * (0.1 + Math.random() * 0.04), wallHeight * (0.045 + Math.random() * 0.015), 0.09);
  const eyeSep = wallWidth * (0.16 + Math.random() * 0.06);
  const eyeY = wallHeight * (0.68 + Math.random() * 0.08);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-eyeSep, eyeY, faceZ);
  leftEye.rotation.z = 0.3 + Math.random() * 0.25;
  group.add(leftEye);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(eyeSep, eyeY, faceZ);
  rightEye.rotation.z = -(0.3 + Math.random() * 0.25);
  group.add(rightEye);

  const mouthWidth = wallWidth * (0.28 + Math.random() * 0.12);
  const mouthHeight = wallHeight * (0.07 + Math.random() * 0.03);
  const mouthGeo = new THREE.SphereGeometry(1, 16, 12);
  mouthGeo.scale(mouthWidth, mouthHeight, 0.17);
  const mouthMat = new THREE.MeshStandardMaterial({ color: 0x050203, roughness: 0.7 });
  const mouth = new THREE.Mesh(mouthGeo, mouthMat);
  const mouthY = wallHeight * (0.4 + Math.random() * 0.1);
  mouth.position.set(0, mouthY, faceZ);
  group.add(mouth);

  // The portal itself - hidden in the mouth until fed enough orbs.
  const portalMat = new THREE.MeshBasicMaterial({
    map: createPortalTexture(),
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const portal = new THREE.Mesh(new THREE.CircleGeometry(1, 32), portalMat);
  portal.position.set(0, mouthY, faceZ + 0.07);
  portal.scale.set(mouthWidth * 0.85, mouthHeight * 0.85, 1);
  portal.visible = false;
  group.add(portal);

  const toothMat = new THREE.MeshStandardMaterial({ color: 0xf4f0e6, roughness: 0.3 });
  const toothCount = 6 + Math.floor(Math.random() * 5);
  const toothGeo = new THREE.ConeGeometry(0.055, 0.19, 6);
  for (let i = 0; i < toothCount; i++) {
    const tx = -mouthWidth * 0.75 + (i / (toothCount - 1)) * mouthWidth * 1.5;
    const jitter = (Math.random() - 0.5) * 0.05;
    const upper = new THREE.Mesh(toothGeo, toothMat);
    upper.position.set(tx, mouthY + 0.14 + jitter, faceZ + 0.03);
    upper.rotation.x = Math.PI;
    group.add(upper);
    const lower = new THREE.Mesh(toothGeo, toothMat);
    lower.position.set(tx, mouthY - 0.14 - jitter, faceZ + 0.03);
    group.add(lower);
  }

  return { group, portal };
}

// A small orb that shimmers through the rainbow, popped out when the mace
// connects with something. No gameplay meaning assigned yet - just the
// visual/physical object.
export function createRainbowOrb() {
  const geometry = new THREE.SphereGeometry(0.09, 14, 10);
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 1.1,
    roughness: 0.25,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.huePhase = Math.random();
  return mesh;
}

/**
 * Builds the whole building: an upper room (mildly randomized dimensions)
 * with windows in its right wall and a side tunnel leading downstairs,
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

  // The way downstairs: an opening in the left wall near the entrance
  // corner (where a closed door used to be) leading into a sloped tunnel,
  // rather than a hole you drop straight through.
  const tunnelOpening = { z: depth / 2 - 1.1, y: 0, w: TUNNEL_WIDTH, h: TUNNEL_HEIGHT };

  const upperGroup = new THREE.Group();
  scene.add(upperGroup);

  const floorMat = new THREE.MeshStandardMaterial({ map: createCheckerFloorTexture(), roughness: 0.85 });
  buildFloor(upperGroup, floorMat, width, depth, 0);

  // Flat, unlit black - a PS1-era ceiling that just isn't rendered as
  // anything but a void above the room, seen from inside looking up.
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), new THREE.MeshBasicMaterial({ color: 0x050505 }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = height;
  upperGroup.add(ceiling);

  const wallMat = new THREE.MeshStandardMaterial({ map: createWallTexture('#c9a45c'), roughness: 0.92 });
  buildWalls(upperGroup, wallMat, width, depth, height, 0, 'windows', tunnelOpening);

  // A chalkboard on the far wall, facing the spawn point.
  const chalkboard = new THREE.Mesh(
    new THREE.PlaneGeometry(Math.min(2.4, width * 0.5), 1.1),
    new THREE.MeshStandardMaterial({ map: createChalkboardTexture(), roughness: 0.8 })
  );
  chalkboard.position.set(width * 0.15, 1.7, -depth / 2 + WALL_THICKNESS / 2 + 0.02);
  upperGroup.add(chalkboard);

  // A low parapet rim around the roof, and the roof surface itself,
  // walkable now that flying can get you up there.
  const roofMat = new THREE.MeshStandardMaterial({ map: createWallTexture('#7d8592'), roughness: 0.85 });
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), roofMat);
  roof.rotation.x = -Math.PI / 2;
  roof.position.y = height;
  upperGroup.add(roof);
  const parapetH = 0.4;
  addBox(upperGroup, wallMat, width, parapetH, WALL_THICKNESS, 0, height + parapetH / 2, depth / 2);
  addBox(upperGroup, wallMat, width, parapetH, WALL_THICKNESS, 0, height + parapetH / 2, -depth / 2);
  addBox(upperGroup, wallMat, WALL_THICKNESS, parapetH, depth, -width / 2, height + parapetH / 2, 0);
  addBox(upperGroup, wallMat, WALL_THICKNESS, parapetH, depth, width / 2, height + parapetH / 2, 0);

  // A mace left up on the roof - pick it up with the trigger.
  const mace = createMace();
  mace.position.set(width * 0.15, height, -depth * 0.1);
  mace.rotation.y = Math.random() * Math.PI * 2;
  upperGroup.add(mace);

  // School desks scattered around the room, clear of the tunnel entrance,
  // the spawn point, and the Venom twin's starting spot.
  addDesks(upperGroup, width, depth, [
    { x: -width / 2 + 1.2, z: tunnelOpening.z, r: 1.3 },
    { x: 0, z: depth / 2 - 1.6, r: 1.0 },
    { x: 0, z: -0.6, r: 1.0 },
  ]);

  // The sloped tunnel itself, descending from the doorway to ground level
  // just outside the building.
  const tunnelWallMat = new THREE.MeshStandardMaterial({ map: createGlitchWallTexture(), roughness: 0.9 });
  const tunnelEntrance = new THREE.Vector3(-width / 2, tunnelOpening.y, tunnelOpening.z);
  buildTunnel(scene, tunnelWallMat, tunnelEntrance);

  // Matching walkable gravity for the tunnel's slope, handed to main.js's
  // FloorMap - a ramp region interpolating from ground level at the far
  // end back up to the doorway.
  const tunnelRegion = {
    minX: -width / 2 - TUNNEL_RUN,
    maxX: -width / 2,
    minZ: tunnelOpening.z - TUNNEL_WIDTH / 2,
    maxZ: tunnelOpening.z + TUNNEL_WIDTH / 2,
    ramp: { axis: 'x', y0: groundY, y1: tunnelOpening.y },
  };

  // Ground floor ("the playground"), directly below - same footprint,
  // open on the right onto the exterior. No ceiling of its own: it's
  // really just walls wrapped around part of the same ground level the
  // playground sits on. Glitched walls - a corrupted-looking texture
  // instead of a clean material.
  const groundGroup = new THREE.Group();
  scene.add(groundGroup);
  const groundWallMat = new THREE.MeshStandardMaterial({ map: createGlitchWallTexture(), roughness: 0.9 });
  buildWalls(groundGroup, groundWallMat, width, depth, groundHeight, groundY, 'open');

  // Exterior playground - a bounded platform of cracked ground rather than
  // an endless field, a little wider and quite a bit longer than before so
  // there's room to walk out to the symbiote face looming at the far end,
  // under a radiating rainbow sky.
  const wallX = width / 2;
  const yardWidth = 32;
  const yardLength = 58;
  const grassTex = createGlitchGrassTexture();
  grassTex.repeat.set(7, 13);
  const yard = new THREE.Mesh(
    new THREE.PlaneGeometry(yardLength, yardWidth),
    new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.95 })
  );
  yard.rotation.x = -Math.PI / 2;
  yard.position.set(wallX + yardLength / 2, groundY, 0);
  scene.add(yard);
  addSkydome(scene, new THREE.Vector3(wallX + yardLength / 2, groundY + 5, 0), 150);

  const crateTex = createCrateTexture();
  const crates = addCrateStacks(scene, crateTex, 3, wallX + 6, 0, 5, groundY);

  // Carnage stands watch near the crates, out at the platform's edge.
  const carnagePosition = new THREE.Vector3(wallX + 6, groundY, -4.5);

  const doorPosition = new THREE.Vector3(wallX + yardLength - 4, groundY, (Math.random() - 0.5) * yardWidth * 0.3);
  const { portal: doorPortal } = addSymbioteFace(
    scene,
    doorPosition,
    new THREE.Vector3(0, groundY, 0) // look back toward the school building
  );

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
  const faceGlow = new THREE.PointLight(0xffe0f5, 1.4, 26, 2);
  faceGlow.position.set(wallX + yardLength - 4, groundY + 3, 0);
  scene.add(faceGlow);
  const roofGlow = new THREE.PointLight(0xdce8ff, 0.7, 10, 2);
  roofGlow.position.set(0, height + 1.5, 0);
  scene.add(roofGlow);

  return {
    width,
    depth,
    height,
    groundY,
    tunnelRegion,
    mace,
    crates,
    spawnPosition: new THREE.Vector3(0, 0, depth / 2 - 1.6),
    npcPosition: new THREE.Vector3(0, 0, -0.6),
    carnagePosition,
    doorPosition,
    doorPortal,
  };
}
