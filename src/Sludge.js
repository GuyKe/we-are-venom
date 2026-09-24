import * as THREE from 'three';

const HEIGHT_DROP = 1.35; // meters the rig sinks by while in sludge form
const SLUDGE_MOVE_SPEED = 1.5; // meters per second - a deliberate "medium" pace
const TOUCH_RADIUS = 0.55; // meters (ground-plane distance) to trigger a takeover

/**
 * The symbiote's alternate "sludge" form: a very short, ground-hugging
 * puddle that moves at a medium pace instead of a full-size humanoid. It
 * has no arms - just crawl into a ragdoll to take it over.
 */
export class SludgeForm {
  constructor(rig, locomotion, material, hideWhileActive) {
    this.rig = rig;
    this.locomotion = locomotion;
    this.hideWhileActive = hideWhileActive;
    this.active = false;
    this.normalMoveSpeed = locomotion.moveSpeed;
    this.normalRigY = rig.position.y;

    const geometry = new THREE.SphereGeometry(0.26, 16, 10);
    geometry.scale(1, 0.32, 1);
    this.blobMesh = new THREE.Mesh(geometry, material);
    this.blobMesh.position.set(0, 0.1, 0);
    this.blobMesh.visible = false;
    rig.add(this.blobMesh);
  }

  toggle() {
    this.setActive(!this.active);
  }

  setActive(active) {
    if (active === this.active) return;
    this.active = active;
    this.rig.position.y = active ? this.normalRigY - HEIGHT_DROP : this.normalRigY;
    this.locomotion.moveSpeed = active ? SLUDGE_MOVE_SPEED : this.normalMoveSpeed;
    this.blobMesh.visible = active;
    for (const obj of this.hideWhileActive) obj.visible = !active;
  }

  /**
   * Checks whether the sludge has crawled into the given world-space point
   * (e.g. the ragdoll's pelvis). If so, reverts to normal form and reports
   * the takeover so the caller can react (recolor the ragdoll, play a cue).
   */
  checkTouch(targetWorldPos) {
    if (!this.active) return false;
    const dx = this.rig.position.x - targetWorldPos.x;
    const dz = this.rig.position.z - targetWorldPos.z;
    if (dx * dx + dz * dz > TOUCH_RADIUS * TOUCH_RADIUS) return false;
    this.setActive(false);
    return true;
  }
}
