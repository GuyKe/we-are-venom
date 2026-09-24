import * as THREE from 'three';
import { VenomArm } from './VenomArm.js';

const IDLE_SWAY_RADIUS = 0.12;
const FOLLOW_SPEED = 1.9; // meters per second
const FOLLOW_STOP_DISTANCE = 1.1; // meters - how close it closes in before halting

const LEG_RADIUS = 0.1;
const LEG_LENGTH = 0.62;
const LEG_HEIGHT = LEG_LENGTH + LEG_RADIUS * 2;

const TORSO_RADIUS = 0.26;
const TORSO_LENGTH = 0.42;
const TORSO_HEIGHT = TORSO_LENGTH + TORSO_RADIUS * 2;
const TORSO_BOTTOM = LEG_HEIGHT;
const TORSO_TOP = TORSO_BOTTOM + TORSO_HEIGHT;

const HEAD_RADIUS = 0.17;
const HEAD_Y = TORSO_TOP + HEAD_RADIUS;

/**
 * A standing Venom (or Carnage, given a different material) figure: a
 * simple glossy body topped with a pair of iconic wide white eyes and a
 * jagged-toothed mouth, with two real VenomArm floppy tendrils for arms -
 * "floppy like you" - idly swaying on their own rather than being
 * controller-driven. Optionally walks toward and faces a followTarget
 * each frame (see update()), snapping to whatever floor a FloorMap says
 * is beneath it - so it can chase the player right through a floor hatch.
 */
export class VenomTwin {
  constructor(scene, material, position) {
    this.group = new THREE.Group();
    this.group.position.copy(position);
    scene.add(this.group);

    const legGeo = new THREE.CapsuleGeometry(LEG_RADIUS, LEG_LENGTH, 4, 8);
    const leftLeg = new THREE.Mesh(legGeo, material);
    leftLeg.position.set(-0.12, LEG_HEIGHT / 2, 0);
    this.group.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeo, material);
    rightLeg.position.set(0.12, LEG_HEIGHT / 2, 0);
    this.group.add(rightLeg);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(TORSO_RADIUS, TORSO_LENGTH, 4, 8), material);
    torso.position.set(0, TORSO_BOTTOM + TORSO_HEIGHT / 2, 0);
    this.group.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(HEAD_RADIUS, 20, 16), material);
    head.position.set(0, HEAD_Y, 0);
    this.group.add(head);

    // Iconic wide white Venom eyes.
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xf4f7ff });
    const eyeGeo = new THREE.SphereGeometry(1, 12, 10);
    eyeGeo.scale(0.065, 0.04, 0.02);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.085, HEAD_Y + 0.01, HEAD_RADIUS * 0.92);
    leftEye.rotation.z = 0.35;
    this.group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.085, HEAD_Y + 0.01, HEAD_RADIUS * 0.92);
    rightEye.rotation.z = -0.35;
    this.group.add(rightEye);

    this._buildFace();

    // Floppy tendril arms - the same verlet-rope system the player uses,
    // so they visibly read as "the same kind of arms as you".
    this.armLeft = new VenomArm({ material, side: 'left', armLength: 0.7 });
    this.armRight = new VenomArm({ material, side: 'right', armLength: 0.7 });
    scene.add(this.armLeft.mesh, this.armLeft.tipAnchor, this.armLeft.spikesGroup);
    scene.add(this.armRight.mesh, this.armRight.tipAnchor, this.armRight.spikesGroup);

    this.shoulderOffsetLeft = new THREE.Vector3(-0.26, TORSO_TOP - 0.05, 0);
    this.shoulderOffsetRight = new THREE.Vector3(0.26, TORSO_TOP - 0.05, 0);
    this.handRestLeft = new THREE.Vector3(-0.32, 0.55, 0.1);
    this.handRestRight = new THREE.Vector3(0.32, 0.55, 0.1);

    this._tmpAnchor = new THREE.Vector3();
    this._tmpTarget = new THREE.Vector3();
    this._identityQuat = new THREE.Quaternion();
    this.elapsed = Math.random() * 10;
  }

  /** The gaping, jagged-toothed mouth with a lolling tongue. */
  _buildFace() {
    const mouthGeo = new THREE.SphereGeometry(1, 16, 12);
    mouthGeo.scale(0.095, 0.05, 0.035);
    const mouthMat = new THREE.MeshStandardMaterial({ color: 0x050203, roughness: 0.7 });
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, HEAD_Y - 0.07, HEAD_RADIUS * 0.94);
    this.group.add(mouth);

    const toothMat = new THREE.MeshStandardMaterial({ color: 0xf4f0e6, roughness: 0.3 });
    const toothGeo = new THREE.ConeGeometry(0.013, 0.045, 6);
    const toothCount = 6;
    for (let i = 0; i < toothCount; i++) {
      const tx = -0.08 + (i / (toothCount - 1)) * 0.16;
      const jitter = (i % 2 === 0 ? 1 : -1) * 0.006;

      const upper = new THREE.Mesh(toothGeo, toothMat);
      upper.position.set(tx, HEAD_Y - 0.048 + jitter * 0.3, HEAD_RADIUS * 0.96);
      upper.rotation.x = Math.PI;
      this.group.add(upper);

      const lower = new THREE.Mesh(toothGeo, toothMat);
      lower.position.set(tx, HEAD_Y - 0.096 - jitter * 0.3, HEAD_RADIUS * 0.96);
      this.group.add(lower);
    }

    // A long lolling tongue, hanging out and curling forward/down.
    const tongueMat = new THREE.MeshStandardMaterial({ color: 0xb32436, roughness: 0.35 });
    const tongueUpper = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.07, 4, 8), tongueMat);
    tongueUpper.position.set(0.015, HEAD_Y - 0.09, HEAD_RADIUS * 1.08);
    tongueUpper.rotation.x = Math.PI / 2 - 0.25;
    this.group.add(tongueUpper);

    const tongueLower = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.1, 4, 8), tongueMat);
    tongueLower.position.set(0.03, HEAD_Y - 0.17, HEAD_RADIUS * 1.22);
    tongueLower.rotation.x = Math.PI / 2 + 0.55;
    this.group.add(tongueLower);
  }

  /**
   * @param {number} dt
   * @param {THREE.Vector3} [followTarget] world position to walk toward and face
   * @param {import('./Gravity.js').Faller} [faller] keeps it grounded on
   *        whatever floor is beneath it (falls through a hatch it walks over)
   */
  update(dt, followTarget = null, faller = null) {
    this.elapsed += dt;

    if (followTarget) {
      const dx = followTarget.x - this.group.position.x;
      const dz = followTarget.z - this.group.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist > FOLLOW_STOP_DISTANCE) {
        const step = Math.min(dist - FOLLOW_STOP_DISTANCE, FOLLOW_SPEED * dt);
        this.group.position.x += (dx / dist) * step;
        this.group.position.z += (dz / dist) * step;
      }
      if (dist > 0.01) {
        this.group.rotation.y = Math.atan2(dx, dz);
      }
    }

    if (faller) faller.update(this.group.position, dt);

    const groupQuat = this.group.quaternion;
    const anchorL = this._tmpAnchor
      .copy(this.shoulderOffsetLeft)
      .applyQuaternion(groupQuat)
      .add(this.group.position);
    const targetL = this._tmpTarget.copy(this.handRestLeft).applyQuaternion(groupQuat).add(this.group.position);
    targetL.x += Math.sin(this.elapsed * 0.8) * IDLE_SWAY_RADIUS;
    targetL.z += Math.cos(this.elapsed * 0.6) * IDLE_SWAY_RADIUS;
    this.armLeft.update(anchorL, targetL, groupQuat, dt);

    const anchorR = this._tmpAnchor
      .copy(this.shoulderOffsetRight)
      .applyQuaternion(groupQuat)
      .add(this.group.position);
    const targetR = this._tmpTarget.copy(this.handRestRight).applyQuaternion(groupQuat).add(this.group.position);
    targetR.x += Math.sin(this.elapsed * 0.7 + 2) * IDLE_SWAY_RADIUS;
    targetR.z += Math.cos(this.elapsed * 0.9 + 1) * IDLE_SWAY_RADIUS;
    this.armRight.update(anchorR, targetR, groupQuat, dt);
  }
}
