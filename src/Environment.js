import * as THREE from 'three';

function createGridTexture() {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#07080c';
  ctx.fillRect(0, 0, size, size);

  const cells = 16;
  const step = size / cells;
  ctx.strokeStyle = 'rgba(100, 170, 255, 0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= cells; i++) {
    ctx.beginPath();
    ctx.moveTo(i * step, 0);
    ctx.lineTo(i * step, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * step);
    ctx.lineTo(size, i * step);
    ctx.stroke();
  }

  // Faint radial glow toward the center
  const glow = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  glow.addColorStop(0, 'rgba(90, 140, 255, 0.18)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createStarfield() {
  const count = 1500;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const radius = 40 + Math.random() * 60;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = Math.abs(radius * Math.cos(phi)) * 0.6 + 2;
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color: 0xbfd4ff, size: 0.12, sizeAttenuation: true });
  return new THREE.Points(geometry, material);
}

/** Builds the floating baseplate arena: a glowing platform in a starry void. */
export function buildEnvironment(scene) {
  scene.background = new THREE.Color(0x02030a);
  scene.fog = new THREE.FogExp2(0x02030a, 0.022);

  const baseplate = new THREE.Mesh(
    new THREE.CylinderGeometry(9, 9.4, 0.4, 64),
    new THREE.MeshStandardMaterial({
      map: createGridTexture(),
      roughness: 0.75,
      metalness: 0.3,
    })
  );
  baseplate.position.y = -0.2;
  scene.add(baseplate);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(9, 0.06, 12, 96),
    new THREE.MeshStandardMaterial({
      color: 0x7fe0ff,
      emissive: 0x2fa0ff,
      emissiveIntensity: 1.4,
      roughness: 0.4,
    })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.005;
  scene.add(rim);

  scene.add(createStarfield());

  const hemi = new THREE.HemisphereLight(0x8fb3ff, 0x0a0a10, 0.9);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(4, 6, 3);
  scene.add(key);

  const rim2 = new THREE.PointLight(0x6f8bff, 6, 20, 2);
  rim2.position.set(-3, 3, -3);
  scene.add(rim2);

  return { baseplate };
}
