import * as THREE from 'three';

const GRAVITY = new THREE.Vector3(0, -9.8, 0);
const GROUND_Y = 0;
const CONSTRAINT_ITERATIONS = 6;
const DAMPING = 0.985;
const PELVIS_HEIGHT = 0.9;
const REEL_SPEED = 2.6; // m/s the rope shortens by while reeling someone in
const MIN_ROPE_LENGTH = 0.35;
const RESPAWN_DELAY = 5; // seconds with no grab held before he stands back up

const IDX = {
  PELVIS: 0,
  CHEST: 1,
  HEAD: 2,
  L_SHOULDER: 3,
  L_ELBOW: 4,
  L_HAND: 5,
  R_SHOULDER: 6,
  R_ELBOW: 7,
  R_HAND: 8,
  L_HIP: 9,
  L_KNEE: 10,
  L_FOOT: 11,
  R_HIP: 12,
  R_KNEE: 13,
  R_FOOT: 14,
};

// Standing rest-pose offsets from the pelvis, used to both seed the
// standing pose and compute each bone's natural (rest) length.
const REST_OFFSETS = [
  [0, 0, 0], // pelvis
  [0, 0.35, 0], // chest
  [0, 0.62, 0], // head
  [-0.19, 0.3, 0], // L shoulder
  [-0.21, 0.04, 0.04], // L elbow (arm hangs at the side)
  [-0.22, -0.24, 0.08], // L hand
  [0.19, 0.3, 0], // R shoulder
  [0.21, 0.04, 0.04], // R elbow
  [0.22, -0.24, 0.08], // R hand
  [-0.11, -0.04, 0], // L hip
  [-0.12, -0.47, 0], // L knee
  [-0.13, -0.9, 0.05], // L foot
  [0.11, -0.04, 0], // R hip
  [0.12, -0.47, 0], // R knee
  [0.13, -0.9, 0.05], // R foot
];

// [a, b, visualRadius] - a null radius is a physics-only bracing constraint
// (keeps the torso "box" from collapsing/twisting) with no rendered capsule.
const BONES = [
  [IDX.PELVIS, IDX.CHEST, 0.15],
  [IDX.CHEST, IDX.HEAD, null],
  [IDX.CHEST, IDX.L_SHOULDER, null],
  [IDX.L_SHOULDER, IDX.L_ELBOW, 0.06],
  [IDX.L_ELBOW, IDX.L_HAND, 0.05],
  [IDX.CHEST, IDX.R_SHOULDER, null],
  [IDX.R_SHOULDER, IDX.R_ELBOW, 0.06],
  [IDX.R_ELBOW, IDX.R_HAND, 0.05],
  [IDX.PELVIS, IDX.L_HIP, null],
  [IDX.L_HIP, IDX.L_KNEE, 0.09],
  [IDX.L_KNEE, IDX.L_FOOT, 0.07],
  [IDX.PELVIS, IDX.R_HIP, null],
  [IDX.R_HIP, IDX.R_KNEE, 0.09],
  [IDX.R_KNEE, IDX.R_FOOT, 0.07],
  [IDX.L_SHOULDER, IDX.R_SHOULDER, null],
  [IDX.L_HIP, IDX.R_HIP, null],
  [IDX.L_SHOULDER, IDX.R_HIP, null],
  [IDX.R_SHOULDER, IDX.L_HIP, null],
];

const JOINT_INDICES = [
  IDX.CHEST,
  IDX.L_SHOULDER,
  IDX.L_ELBOW,
  IDX.L_HAND,
  IDX.R_SHOULDER,
  IDX.R_ELBOW,
  IDX.R_HAND,
  IDX.L_HIP,
  IDX.L_KNEE,
  IDX.L_FOOT,
  IDX.R_HIP,
  IDX.R_KNEE,
  IDX.R_FOOT,
];

/**
 * A standing ragdoll the player can grab with the symbiote tendrils.
 * Stands rigidly (no simulation) until grabbed; a grab switches it into a
 * verlet-physics ragdoll (particles + distance constraints, like VenomArm's
 * rope but as a small skeleton graph instead of a single chain) and reels
 * the grabbed body part toward whichever hand is holding it. Settles back
 * into its standing pose a few seconds after being let go.
 */
export class RagdollHuman {
  constructor(scene, { standPosition = new THREE.Vector3(0, 0, -3) } = {}) {
    this.group = new THREE.Group();
    scene.add(this.group);

    this.standPosition = standPosition.clone();
    this.state = 'standing';
    this.grabs = { left: null, right: null };
    this.settleTimer = 0;
    this.possessed = false;

    this.points = REST_OFFSETS.map(() => new THREE.Vector3());
    this.prevPoints = REST_OFFSETS.map(() => new THREE.Vector3());
    this._layoutStandingPose();

    this.restLengths = BONES.map(([a, b]) => this.points[a].distanceTo(this.points[b]));

    this.suitMaterial = new THREE.MeshStandardMaterial({
      color: 0x2b3140,
      roughness: 0.7,
      metalness: 0.1,
    });
    this.skinMaterial = new THREE.MeshStandardMaterial({ color: 0xd8a37d, roughness: 0.85 });

    this.boneMeshes = [];
    BONES.forEach(([a, b, radius], boneIndex) => {
      if (radius === null) return;
      const length = this.restLengths[boneIndex];
      const geometry = new THREE.CapsuleGeometry(radius, Math.max(length - radius * 2, 0.01), 4, 8);
      const mesh = new THREE.Mesh(geometry, this.suitMaterial);
      this.group.add(mesh);
      this.boneMeshes.push({ a, b, baseLength: length, mesh });
    });

    this.jointMeshes = JOINT_INDICES.map((i) => {
      const radius = i === IDX.CHEST ? 0.13 : 0.06;
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 10, 8), this.suitMaterial);
      this.group.add(mesh);
      return { i, mesh };
    });

    this.headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), this.skinMaterial);
    this.group.add(this.headMesh);

    this._updateMeshes();
  }

  _layoutStandingPose() {
    const base = this.standPosition.clone().add(new THREE.Vector3(0, PELVIS_HEIGHT, 0));
    for (let i = 0; i < REST_OFFSETS.length; i++) {
      const [ox, oy, oz] = REST_OFFSETS[i];
      this.points[i].set(base.x + ox, base.y + oy, base.z + oz);
      this.prevPoints[i].copy(this.points[i]);
    }
  }

  /** World-space position of a named particle (see IDX), e.g. for hit tests. */
  getParticlePosition(index) {
    return this.points[index];
  }

  /**
   * Casts a ray from `rayOrigin` along `rayDir` and grabs the nearest
   * ragdoll particle within `grabRadius` of the ray, out to `maxDistance`
   * away - this is what lets the tendrils grab him "from afar": range is
   * generous (default 6m) rather than requiring the hand to actually touch
   * him. Returns the grabbed particle index, or null if nothing was in range.
   */
  tryGrab(side, rayOrigin, rayDir, maxDistance = 6, grabRadius = 0.4) {
    let best = null;
    let bestPerp = grabRadius;
    const toPoint = new THREE.Vector3();
    const closest = new THREE.Vector3();

    for (let i = 0; i < this.points.length; i++) {
      toPoint.copy(this.points[i]).sub(rayOrigin);
      const along = THREE.MathUtils.clamp(toPoint.dot(rayDir), 0, maxDistance);
      closest.copy(rayOrigin).addScaledVector(rayDir, along);
      const perp = closest.distanceTo(this.points[i]);
      if (perp < bestPerp) {
        bestPerp = perp;
        best = i;
      }
    }
    if (best === null) return null;

    this.state = 'ragdoll';
    this.settleTimer = 0;
    this.grabs[side] = {
      index: best,
      ropeLength: this.points[best].distanceTo(rayOrigin),
    };
    return best;
  }

  releaseGrab(side) {
    this.grabs[side] = null;
  }

  /**
   * Marks him as taken over by the symbiote sludge: recolors him into a
   * glossy black husk so there's a lasting, visible sign he's been
   * possessed. Idempotent - only the first call has any effect.
   */
  markPossessed() {
    if (this.possessed) return;
    this.possessed = true;
    this.suitMaterial.color.set(0x050506);
    this.suitMaterial.roughness = 0.25;
    this.suitMaterial.metalness = 0.2;
    this.skinMaterial.color.set(0x1a1c22);
    this.skinMaterial.roughness = 0.3;
  }

  /**
   * @param {number} dt
   * @param {{left: THREE.Vector3, right: THREE.Vector3}} handPositions
   *        current world position of each hand - whichever hand(s) are
   *        holding a grab reel their grabbed body part toward this point.
   */
  update(dt, handPositions) {
    if (this.state === 'standing') {
      this._updateMeshes();
      return;
    }

    const clampedDt = Math.min(dt, 1 / 30);
    const points = this.points;
    const prev = this.prevPoints;

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const velocity = p.clone().sub(prev[i]).multiplyScalar(DAMPING);
      prev[i].copy(p);
      p.add(velocity).addScaledVector(GRAVITY, clampedDt * clampedDt);
    }

    // Ground collision against the baseplate, with simple friction so he
    // doesn't slide forever once he lands.
    for (let i = 0; i < points.length; i++) {
      if (points[i].y < GROUND_Y) {
        points[i].y = GROUND_Y;
        prev[i].x = THREE.MathUtils.lerp(prev[i].x, points[i].x, 0.6);
        prev[i].z = THREE.MathUtils.lerp(prev[i].z, points[i].z, 0.6);
        prev[i].y = points[i].y;
      }
    }

    for (let iter = 0; iter < CONSTRAINT_ITERATIONS; iter++) {
      BONES.forEach(([a, b], boneIndex) => {
        const pa = points[a];
        const pb = points[b];
        const delta = pb.clone().sub(pa);
        const dist = delta.length() || 0.0001;
        const diff = (dist - this.restLengths[boneIndex]) / dist;
        pa.addScaledVector(delta, diff * 0.5);
        pb.addScaledVector(delta, -diff * 0.5);
      });
    }

    // Reel in whatever's grabbed: the rope shortens over time, so the
    // grabbed body part gets yanked toward the hand instead of just
    // dangling at whatever distance it was first grabbed at.
    let grabbedThisFrame = false;
    for (const side of ['left', 'right']) {
      const grab = this.grabs[side];
      const handPos = handPositions[side];
      if (!grab || !handPos) continue;
      grabbedThisFrame = true;
      grab.ropeLength = Math.max(MIN_ROPE_LENGTH, grab.ropeLength - REEL_SPEED * clampedDt);
      const particle = points[grab.index];
      const toParticle = particle.clone().sub(handPos);
      const dist = toParticle.length();
      if (dist > grab.ropeLength) {
        particle.copy(handPos).addScaledVector(toParticle.normalize(), grab.ropeLength);
      }
    }

    this.settleTimer = grabbedThisFrame ? 0 : this.settleTimer + clampedDt;
    if (this.settleTimer > RESPAWN_DELAY) {
      this.state = 'standing';
      this._layoutStandingPose();
    }

    this._updateMeshes();
  }

  _updateMeshes() {
    for (const { a, b, baseLength, mesh } of this.boneMeshes) {
      const pa = this.points[a];
      const pb = this.points[b];
      const dir = pb.clone().sub(pa);
      const len = dir.length() || 0.0001;
      dir.normalize();
      mesh.position.copy(pa).addScaledVector(dir, len * 0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      mesh.scale.set(1, len / baseLength, 1);
    }
    for (const { i, mesh } of this.jointMeshes) {
      mesh.position.copy(this.points[i]);
    }
    this.headMesh.position.copy(this.points[IDX.HEAD]);
  }
}

RagdollHuman.PARTICLE = IDX;
