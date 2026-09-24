import * as THREE from 'three';

const MAX_DISTANCE = 30; // meters - buildings ring the arena well beyond arm's reach
const STANDOFF = 0.55; // meters to hang back from the wall surface
const PULL_SPEED_THRESHOLD = 2.6; // m/s the hand must be moving to count as a "yank"
const BACKWARD_DOT_THRESHOLD = -0.5; // how opposite to your facing the pull must be
const TRIGGER_COOLDOWN = 0.6; // seconds, per hand, so one yank doesn't fire repeatedly

/**
 * Web-sling wall grab: pulling a hand back fast (opposite to where you're
 * looking) fires a raycast from that hand toward whatever it's aimed at; if
 * it hits a city building, the player snaps onto the wall and sticks there
 * until they squeeze the grip to let go.
 */
export class WallGrapple {
  constructor(rig, buildingMeshes) {
    this.rig = rig;
    this.buildingMeshes = buildingMeshes;
    this.attached = false;
    this.groundY = rig.position.y;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = MAX_DISTANCE;
    this._cooldown = { left: 0, right: 0 };
    this._worldNormal = new THREE.Vector3();
  }

  update(dt) {
    this._cooldown.left = Math.max(0, this._cooldown.left - dt);
    this._cooldown.right = Math.max(0, this._cooldown.right - dt);
  }

  /**
   * Call once per hand per frame with that hand's current velocity. Fires a
   * grapple attempt when it looks like a deliberate fast pull backward.
   * Returns true the frame it successfully attaches to a wall.
   */
  tryTriggerFromPull(side, velocity, facingDir, originPos, aimDir) {
    if (this.attached || this._cooldown[side] > 0) return false;
    const speed = velocity.length();
    if (speed < PULL_SPEED_THRESHOLD) return false;
    if (velocity.dot(facingDir) / speed > BACKWARD_DOT_THRESHOLD) return false;

    this._cooldown[side] = TRIGGER_COOLDOWN;
    return this.attachTo(originPos, aimDir);
  }

  /** Raycasts from originPos along aimDir; attaches to the first wall hit. */
  attachTo(originPos, aimDir) {
    this.raycaster.set(originPos, aimDir);
    const hits = this.raycaster.intersectObjects(this.buildingMeshes, false);
    if (hits.length === 0) return false;

    const hit = hits[0];
    this._worldNormal.copy(hit.face.normal).transformDirection(hit.object.matrixWorld);

    this.groundY = this.rig.position.y;
    this.rig.position.copy(hit.point).addScaledVector(this._worldNormal, STANDOFF);
    this.attached = true;
    return true;
  }

  /** Lets go of the wall and drops back to normal ground height. */
  detach() {
    if (!this.attached) return;
    this.attached = false;
    this.rig.position.y = this.groundY;
  }
}
