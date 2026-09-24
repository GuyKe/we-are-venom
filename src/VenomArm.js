import * as THREE from 'three';

const GRAVITY = new THREE.Vector3(0, -3.2, 0);
const CONSTRAINT_ITERATIONS = 3;
const RADIAL_SEGMENTS = 8;
const UP = new THREE.Vector3(0, 1, 0);

/**
 * A floppy, whip-like symbiote tendril that stretches from the player's
 * shoulder to their hand (the VR controller grip). Simulated with simple
 * verlet integration + distance constraints, so fast hand motion makes it
 * lag, sag and whip like living black goo, instead of a rigid arm.
 *
 * Visually it's dressed up like a mass of thin symbiote tentacles rather
 * than a single smooth limb: a scattering of thin, sharp secondary spikes
 * branch off the main tendril's body and idly writhe, plus a few longer
 * claw-like spikes at the tip that curl with whatever way the hand turns.
 */
export class VenomArm {
  constructor({
    material,
    side = 'right',
    segmentCount = 9,
    slack = 1.4,
    armLength = 0.8,
    baseRadius = 0.055,
    tipRadius = 0.01,
    extendDistance = 1.0,
    extendDuration = 1.0,
    branchSpikeCount = 7,
  }) {
    this.side = side;
    this.segmentCount = segmentCount;
    this.slack = slack;
    this.baseRadius = baseRadius;
    this.tipRadius = tipRadius;
    this.extendDistance = extendDistance;
    this.extendDuration = extendDuration;
    this.extendTimer = 0;
    this.elapsed = 0;
    this._extendedTarget = new THREE.Vector3();
    this._forward = new THREE.Vector3();

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

    // Per-sample Frenet-ish frame of the main tube, filled in by
    // _rebuildMesh() and reused to plant the branch spikes on its surface.
    const sampleCount = this.lengthSegments + 1;
    this._frameCenters = Array.from({ length: sampleCount }, () => new THREE.Vector3());
    this._frameTangents = Array.from({ length: sampleCount }, () => new THREE.Vector3());
    this._frameNormals = Array.from({ length: sampleCount }, () => new THREE.Vector3());
    this._frameBinormals = Array.from({ length: sampleCount }, () => new THREE.Vector3());

    // A scattering of thin sharp tentacles branching off the main tendril's
    // body, each idly writhing - the "mass of symbiote whips" look, rather
    // than one smooth clean limb.
    this.spikesGroup = new THREE.Group();
    this.branchSpikes = [];
    for (let i = 0; i < branchSpikeCount; i++) {
      const length = 0.12 + Math.random() * 0.24;
      const radius = 0.006 + Math.random() * 0.008;
      const geometry = new THREE.ConeGeometry(radius, length, 6);
      geometry.translate(0, length / 2, 0);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.frustumCulled = false;
      this.spikesGroup.add(mesh);
      this.branchSpikes.push({
        mesh,
        tParam: 0.12 + Math.random() * 0.8,
        angleOffset: Math.random() * Math.PI * 2,
        tangentBias: -0.15 + Math.random() * 0.55,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 0.5 + Math.random() * 0.9,
        swayAmp: 0.2 + Math.random() * 0.35,
      });
    }

    // Longer claw-like spikes at the very tip, parented to the hand's own
    // orientation so they curl however the controller/hand is turned.
    this.tipAnchor = new THREE.Object3D();
    this.claws = new THREE.Group();
    const clawCount = 3;
    for (let i = 0; i < clawCount; i++) {
      const length = 0.11 + Math.random() * 0.1;
      const radius = 0.008 + Math.random() * 0.006;
      const clawGeo = new THREE.ConeGeometry(radius, length, 6);
      clawGeo.translate(0, length / 2, 0);
      const claw = new THREE.Mesh(clawGeo, material);
      const a = (i / clawCount) * Math.PI * 2 + Math.random() * 0.6;
      const spread = 0.4 + Math.random() * 0.4;
      claw.position.set(Math.cos(a) * 0.018, 0, Math.sin(a) * 0.018);
      const dir = new THREE.Vector3(Math.cos(a) * spread, -0.7, Math.sin(a) * spread).normalize();
      claw.quaternion.setFromUnitVectors(UP, dir);
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

  /** Lash the tendril out along the hand's forward direction, then let it snap back. */
  triggerExtend() {
    this.extendTimer = this.extendDuration;
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
    this.elapsed += clampedDt;
    const points = this.points;
    const prev = this.prevPoints;

    let effectiveTarget = target;
    if (this.extendTimer > 0) {
      this.extendTimer = Math.max(0, this.extendTimer - dt);
      const elapsed = this.extendDuration - this.extendTimer;
      // A single smooth extend-then-retract pulse over extendDuration seconds.
      const envelope = Math.sin(Math.PI * THREE.MathUtils.clamp(elapsed / this.extendDuration, 0, 1));
      this._forward.set(0, 0, -1).applyQuaternion(targetQuat);
      effectiveTarget = this._extendedTarget
        .copy(target)
        .addScaledVector(this._forward, this.extendDistance * envelope);
    }

    // Verlet integration with gravity + light damping (floppiness)
    for (let i = 1; i < points.length - 1; i++) {
      const p = points[i];
      const velocity = p.clone().sub(prev[i]).multiplyScalar(0.96);
      prev[i].copy(p);
      p.add(velocity).addScaledVector(GRAVITY, clampedDt * clampedDt);
    }

    // Pin the ends: shoulder anchor and hand target (or the extended lash tip)
    points[0].copy(anchor);
    prev[0].copy(anchor);
    points[points.length - 1].copy(effectiveTarget);
    prev[points.length - 1].copy(effectiveTarget);

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
    this._updateBranchSpikes();

    this.tipAnchor.position.copy(effectiveTarget);
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

      this._frameCenters[i].copy(center);
      this._frameTangents[i].copy(tangent);
      this._frameNormals[i].copy(normal);
      this._frameBinormals[i].copy(binormal);

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

  /** Plants each branch spike on the main tube's surface and lets it idly writhe. */
  _updateBranchSpikes() {
    const lengthSeg = this.lengthSegments;
    const dir = new THREE.Vector3();
    const radial = new THREE.Vector3();

    for (const spike of this.branchSpikes) {
      const index = Math.min(lengthSeg, Math.round(spike.tParam * lengthSeg));
      const center = this._frameCenters[index];
      const tangent = this._frameTangents[index];
      const normal = this._frameNormals[index];
      const binormal = this._frameBinormals[index];
      const tubeRadius = THREE.MathUtils.lerp(this.baseRadius, this.tipRadius, index / lengthSeg);

      const angle = spike.angleOffset + Math.sin(this.elapsed * spike.swaySpeed + spike.swayPhase) * spike.swayAmp;
      radial.copy(normal).multiplyScalar(Math.cos(angle)).addScaledVector(binormal, Math.sin(angle));

      dir.copy(radial).multiplyScalar(1 - Math.abs(spike.tangentBias)).addScaledVector(tangent, spike.tangentBias).normalize();

      spike.mesh.position.copy(center).addScaledVector(radial, tubeRadius * 0.85);
      spike.mesh.quaternion.setFromUnitVectors(UP, dir);
    }
  }
}
