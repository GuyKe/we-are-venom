import * as THREE from 'three';

/**
 * Procedurally paints a Venom-symbiote style skin: glossy black base with
 * branching white "muscle crack" veins, like the comic/movie creature design.
 * No external image assets needed - everything is drawn on a canvas.
 */
function drawCracks(ctx, size, originX, originY, seedAngle, depth, maxDepth, width, crackRGB) {
  if (depth > maxDepth) return;

  let x = originX;
  let y = originY;
  let angle = seedAngle;
  const stepLength = size * (0.03 + Math.random() * 0.04);
  const steps = 4 + Math.floor(Math.random() * 5);

  ctx.lineWidth = Math.max(0.6, width);
  ctx.strokeStyle = `rgba(${crackRGB},${0.85 - depth * 0.12})`;

  for (let i = 0; i < steps; i++) {
    const nx = x + Math.cos(angle) * stepLength;
    const ny = y + Math.sin(angle) * stepLength;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(nx, ny);
    ctx.stroke();

    // occasionally branch into a thinner sub-crack
    if (Math.random() < 0.35) {
      drawCracks(
        ctx,
        size,
        nx,
        ny,
        angle + (Math.random() - 0.5) * 2.2,
        depth + 1,
        maxDepth,
        width * 0.6,
        crackRGB
      );
    }

    angle += (Math.random() - 0.5) * 0.9;
    x = nx;
    y = ny;

    if (x < 0 || x > size || y < 0 || y > size) break;
  }
}

export function createVenomTexture({
  size = 1024,
  crackCount = 14,
  baseColorStops = ['#141414', '#050505', '#000000'],
  crackRGB = '255,255,255',
  speckleRGB = '255,255,255',
} = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Glossy base with a very subtle radial sheen
  const base = ctx.createRadialGradient(
    size * 0.5, size * 0.4, size * 0.05,
    size * 0.5, size * 0.5, size * 0.75
  );
  base.addColorStop(0, baseColorStops[0]);
  base.addColorStop(0.5, baseColorStops[1]);
  base.addColorStop(1, baseColorStops[2]);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  // Branching symbiote cracks
  for (let i = 0; i < crackCount; i++) {
    const ox = Math.random() * size;
    const oy = Math.random() * size;
    const angle = Math.random() * Math.PI * 2;
    drawCracks(ctx, size, ox, oy, angle, 0, 3, size * 0.006, crackRGB);
  }

  // Fine speckle noise for an organic, wet texture
  const speckleCount = Math.floor(size * size * 0.02);
  for (let i = 0; i < speckleCount; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 1.3;
    const a = Math.random() * 0.06;
    ctx.fillStyle = `rgba(${speckleRGB},${a})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function createVenomMaterial() {
  const map = createVenomTexture();
  map.repeat.set(1, 3);

  return new THREE.MeshPhysicalMaterial({
    color: 0x060607,
    map,
    roughness: 0.18,
    metalness: 0.15,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    emissive: new THREE.Color(0x6f8bff),
    emissiveMap: map,
    emissiveIntensity: 0.1,
    sheen: 1.0,
    sheenColor: new THREE.Color(0x223355),
    sheenRoughness: 0.5,
  });
}

