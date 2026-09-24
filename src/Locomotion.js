import * as THREE from 'three';

const MOVE_SPEED = 2.2; // meters per second
const SNAP_ANGLE = THREE.MathUtils.degToRad(35);
const SNAP_DEBOUNCE = 0.35; // seconds
const DEADZONE = 0.18;

/**
 * Standard VR comfort locomotion: left thumbstick for smooth movement
 * (relative to where the headset is looking, flattened to the ground
 * plane), right thumbstick X for snap turns. Moves the whole player rig,
 * which is what keeps the player on the baseplate arena.
 */
export class Locomotion {
  constructor(rig, camera, renderer) {
    this.rig = rig;
    this.camera = camera;
    this.renderer = renderer;
    this._snapCooldown = 0;
    this._forward = new THREE.Vector3();
    this._right = new THREE.Vector3();
  }

  _getGamepads() {
    const session = this.renderer.xr.getSession();
    const result = { left: null, right: null };
    if (!session) return result;
    for (const source of session.inputSources) {
      if (!source.gamepad || !source.handedness) continue;
      if (source.handedness === 'left') result.left = source.gamepad;
      if (source.handedness === 'right') result.right = source.gamepad;
    }
    return result;
  }

  update(dt) {
    const { left, right } = this._getGamepads();

    if (left && left.axes.length >= 4) {
      const x = left.axes[2] ?? left.axes[0] ?? 0;
      const y = left.axes[3] ?? left.axes[1] ?? 0;
      if (Math.abs(x) > DEADZONE || Math.abs(y) > DEADZONE) {
        this.camera.getWorldDirection(this._forward);
        this._forward.y = 0;
        this._forward.normalize();
        this._right.crossVectors(this._forward, new THREE.Vector3(0, 1, 0)).negate();

        const move = new THREE.Vector3();
        move.addScaledVector(this._forward, -y);
        move.addScaledVector(this._right, x);
        if (move.lengthSq() > 1) move.normalize();
        this.rig.position.addScaledVector(move, MOVE_SPEED * dt);
      }
    }

    this._snapCooldown = Math.max(0, this._snapCooldown - dt);
    if (right && right.axes.length >= 4 && this._snapCooldown === 0) {
      const x = right.axes[2] ?? right.axes[0] ?? 0;
      if (Math.abs(x) > 0.7) {
        const angle = x > 0 ? -SNAP_ANGLE : SNAP_ANGLE;
        this._rotateRigAroundHead(angle);
        this._snapCooldown = SNAP_DEBOUNCE;
      }
    }
  }

  _rotateRigAroundHead(angle) {
    const headWorld = new THREE.Vector3();
    this.camera.getWorldPosition(headWorld);

    this.rig.position.sub(headWorld);
    this.rig.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    this.rig.position.add(headWorld);
    this.rig.rotateY(angle);
  }
}
