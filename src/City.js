import * as THREE from 'three';

const RING_INNER_RADIUS = 11; // just outside the baseplate (radius 9)
const RING_OUTER_RADIUS = 24;
const BUILDING_COUNT = 46;
const WINDOW_TEXTURE_WORLD_SIZE = 3.5; // meters of facade per texture tile

function createWindowTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0b0d13';
  ctx.fillRect(0, 0, size, size);

  const cols = 6;
  const rows = 6;
  const pad = size / cols / 5;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cellW = size / cols;
      const cellH = size / rows;
      const lit = Math.random() < 0.4;
      ctx.fillStyle = lit
        ? Math.random() < 0.5
          ? 'rgba(255, 214, 140, 0.95)'
          : 'rgba(140, 220, 255, 0.9)'
        : 'rgba(30, 34, 46, 0.9)';
      ctx.fillRect(x * cellW + pad, y * cellH + pad, cellW - pad * 2, cellH - pad * 2);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * A ring of lit-window skyscrapers surrounding the floating baseplate, so
 * the arena reads as hovering near a city at night instead of empty space.
 * The building meshes are returned so other systems (the wall-grapple) can
 * raycast against them.
 */
export function buildCity(scene) {
  const group = new THREE.Group();
  scene.add(group);

  const windowTexture = createWindowTexture();
  const buildingMeshes = [];

  for (let i = 0; i < BUILDING_COUNT; i++) {
    const angle = (i / BUILDING_COUNT) * Math.PI * 2 + Math.random() * 0.15;
    const radius = RING_INNER_RADIUS + Math.random() * (RING_OUTER_RADIUS - RING_INNER_RADIUS);
    const width = 2.5 + Math.random() * 4.5;
    const depth = 2.5 + Math.random() * 4.5;
    const height = 6 + Math.random() * 34;

    const map = windowTexture.clone();
    map.needsUpdate = true;
    map.repeat.set(
      Math.max(1, Math.round(width / WINDOW_TEXTURE_WORLD_SIZE)),
      Math.max(1, Math.round(height / WINDOW_TEXTURE_WORLD_SIZE))
    );

    const material = new THREE.MeshStandardMaterial({
      map,
      color: 0x9aa0ad,
      roughness: 0.8,
      metalness: 0.2,
    });

    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(Math.cos(angle) * radius, height / 2 - 0.2, Math.sin(angle) * radius);
    mesh.userData.isCityWall = true;
    group.add(mesh);
    buildingMeshes.push(mesh);
  }

  return { group, buildingMeshes };
}
