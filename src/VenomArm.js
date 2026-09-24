import * as THREE from 'three';

const GRAVITY = new THREE.Vector3(0, -3.2, 0);
const CONSTRAINT_ITERATIONS = 3;
const RADIAL_SEGMENTS = 8;

/**
 * A floppy, whip-like symbiote tendril that stretches from the player's
 * shoulder to their hand (the VR controller grip). Simulated with simple
 * verlet integration + distance constraints, so fast hand motion makes it
 * lag, sag and whip like living black goo, instead of a rigid arm.
 */
export class VenomArm {
  constructor({
    material,
    side = 'right',
    segmentCount = 9,
    slack = 1.4,
    armLength = 0.8,
    baseRadius = 0.075,
    tipRadius = 0.028,
  }) {
    this.side = side;
    this.segmentCount = segmentCount;
    this.slack = slack;
    this.baseRadius = baseRadius;
    this.tipRadius = tipRadius;

    this.points = [];
    this.prevPoints = [];
    for (let i = 0; i < segmentCount; i++) {
      this.points.push(new THREE.Vector3());
      this.prevPoints.push(new THREE.Vector3());
    }

    // A fixed nominal length (not derived from whatever the anchor/target
    // happen to be on the first tracked frame - that would freeze in a
    // wildly wrong reach if controllers weren't tracked yet at startup).
    this.restLength = (armLength / (segmentCount - 1)) * slack;
    this.initialized = false;

    this.lengthSegments = (segmentCount - 1) * 4;
    this.geometry = this._buildGeometry();
    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.frustumCulled = false;

    // Small claw spikes anchored to the tendril tip, oriented with the hand.
    this.tipAnchor = new THREE.Object3D();
    this.claws = new THREE.Group();
    const clawGeo = new THREE.ConeGeometry(0.012, 0.09, 8);
    clawGeo.translate(0, 0.045, 0);
    const clawCount = 4;
    for (let i = 0; i < clawCount; i++) {
      const claw = new THREE.Mesh(clawGeo, material);
      const a = (i / clawCount) * Math.PI * 2;
      claw.position.set(Math.cos(a) * 0.02, 0, Math.sin(a) * 0.02);
      claw.rotation.x = Math.PI * 0.5 + 0.5;
      claw.rotation.z = a;
      this.claws.add(claw);
    }
    this.tipAnchor.add(this.claws);
  }

  _buildGeometry() {
    const radial = RADIAL_SEGMENTS;
    const lengthSeg = this.lengthSegments;
    const vertCount = (lengthSeg + 1) * (radial + 1);
    const positions = new Float32Array(vertCount * 3);
    const normals = new Float32Array(vertCount * 3);
    const uvs = new Float32Array(vertCount * 2);

    for (let i = 0; i <= lengthSeg; i++) {
      for (let j = 0; j <= radial; j++) {
        const idx = i * (radial + 1) + j;
        uvs[idx * 2] = j / radial;
        uvs[idx * 2 + 1] = i / lengthSeg;
      }
    }

    const indices = [];
    for (let i = 0; i < lengthSeg; i++) {
      for (let j = 0; j < radial; j++) {
        const a = i * (radial + 1) + j;
        const b = a + radial + 1;
        const c = a + 1;
        const d = b + 1;
        indices.push(a, b, c, b, d, c);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    return geometry;
  }

  /** Seed the rope so it starts laid out between the given anchor/target. */
  reset(anchor, target) {
    for (let i = 0; i < this.segmentCount; i++) {
      const t = i / (this.segmentCount - 1);
      this.points[i].lerpVectors(anchor, target, t);
      this.prevPoints[i].copy(this.points[i]);
    }
    this.initialized = true;
  }

  /**
   * @param {THREE.Vector3} anchor world-space shoulder position (pinned start)
   * @param {THREE.Vector3} target world-space hand/controller position (pinned end)
   * @param {THREE.Quaternion} targetQuat controller orientation, for the claw tip
   * @param {number} dt seconds since last update
   */
  update(anchor, target, targetQuat, dt) {
    if (!this.initialized) this.reset(anchor, target);
    const clampedDt = Math.min(dt, 1 / 30);
    const points = this.points;
    const prev = this.prevPoints;

    // Verlet integration with gravity + light damping (floppiness)
    for (let i = 1; i < points.length - 1; i++) {
      const p = points[i];
      const velocity = p.clone().sub(prev[i]).multiplyScalar(0.96);
      prev[i].copy(p);
      p.add(velocity).addScaledVector(GRAVITY, clampedDt * clampedDt);
    }

    // Pin the ends: shoulder anchor and hand target
    points[0].copy(anchor);
    prev[0].copy(anchor);
    points[points.length - 1].copy(target);
    prev[points.length - 1].copy(target);

    // Distance constraints to keep the chain from stretching too far,
    // while remaining soft/floppy because we only relax a few iterations.
    for (let iter = 0; iter < CONSTRAINT_ITERATIONS; iter++) {
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i];
        const b = points[i + 1];
        const delta = b.clone().sub(a);
        const dist = delta.length() || 0.0001;
        const diff = (dist - this.restLength) / dist;
        const aPinned = i === 0;
        const bPinned = i + 1 === points.length - 1;
        if (aPinned && bPinned) continue;
        if (aPinned) {
          b.addScaledVector(delta, -diff);
        } else if (bPinned) {
          a.addScaledVector(delta, diff);
        } else {
          a.addScaledVector(delta, diff * 0.5);
          b.addScaledVector(delta, -diff * 0.5);
        }
      }
    }

    this._rebuildMesh();

    this.tipAnchor.position.copy(target);
    if (targetQuat) this.tipAnchor.quaternion.copy(targetQuat);
  }

  /** Returns the world position of the tendril tip (for hit detection). */
  getTip() {
    return this.points[this.points.length - 1];
  }

  _rebuildMesh() {
    const curve = new THREE.CatmullRomCurve3(this.points, false, 'catmullrom', 0.5);
    const lengthSeg = this.lengthSegments;
    const radial = RADIAL_SEGMENTS;
    const positions = this.geometry.attributes.position.array;
    const normals = this.geometry.attributes.normal.array;

    const framePos = curve.getSpacedPoints(lengthSeg);

    // Parallel-transport frame to avoid the twisting/flipping artifacts of
    // Frenet frames on a wiggly, near-straight curve.
    let tangent = framePos[1].clone().sub(framePos[0]).normalize();
    let normal = new THREE.Vector3(0, 1, 0);
    if (Math.abs(tangent.dot(normal)) > 0.99) normal.set(1, 0, 0);
    normal.crossVectors(tangent, normal).cross(tangent).normalize();
    let binormal = new THREE.Vector3().crossVectors(tangent, normal);

    for (let i = 0; i <= lengthSeg; i++) {
      const center = framePos[i];
      const nextIdx = Math.min(i + 1, lengthSeg);
      const nextPos = framePos[nextIdx];
      const newTangent = nextPos.clone().sub(center);
      if (newTangent.lengthSq() > 1e-8) {
        newTangent.normalize();
        const axis = new THREE.Vector3().crossVectors(tangent, newTangent);
        const axisLen = axis.length();
        if (axisLen > 1e-6) {
          axis.divideScalar(axisLen);
          const angle = Math.acos(THREE.MathUtils.clamp(tangent.dot(newTangent), -1, 1));
          const q = new THREE.Quaternion().setFromAxisAngle(axis, angle);
          normal.applyQuaternion(q);
        }
        tangent = newTangent;
      }
      binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();
      normal = new THREE.Vector3().crossVectors(binormal, tangent).normalize();

      const t = i / lengthSeg;
      const radius = THREE.MathUtils.lerp(this.baseRadius, this.tipRadius, t);

      for (let j = 0; j <= radial; j++) {
        const theta = (j / radial) * Math.PI * 2;
        const cx = Math.cos(theta) * radius;
        const cy = Math.sin(theta) * radius;
        const idx = i * (radial + 1) + j;

        const px = center.x + normal.x * cx + binormal.x * cy;
        const py = center.y + normal.y * cx + binormal.y * cy;
        const pz = center.z + normal.z * cx + binormal.z * cy;

        positions[idx * 3] = px;
        positions[idx * 3 + 1] = py;
        positions[idx * 3 + 2] = pz;

        const nx = normal.x * Math.cos(theta) + binormal.x * Math.sin(theta);
        const ny = normal.y * Math.cos(theta) + binormal.y * Math.sin(theta);
        const nz = normal.z * Math.cos(theta) + binormal.z * Math.sin(theta);
        normals[idx * 3] = nx;
        normals[idx * 3 + 1] = ny;
        normals[idx * 3 + 2] = nz;
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.normal.needsUpdate = true;
    this.geometry.computeBoundingSphere();
  }
}
