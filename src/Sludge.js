import * as THREE from 'three';

const HEIGHT_DROP = 1.35; // meters the rig sinks by while in sludge form
const SLUDGE_MOVE_SPEED = 1.5; // meters per second - a deliberate "medium" pace

/**
 * The symbiote's alternate "sludge" form: a very short, ground-hugging
 * puddle that moves at a medium pace instead of a full-size humanoid, with
 * no arms while it's active.
 */
export class SludgeForm {
  constructor(rig, locomotion, material, hideWhileActive) {
    this.rig = rig;
    this.locomotion = locomotion;
    this.hideWhileActive = hideWhileActive;
    this.active = false;
    this.normalMoveSpeed = locomotion.moveSpeed;
    this.preSludgeY = rig.position.y;

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
    if (active) {
      // Capture whatever floor the player is currently standing on (they
      // may have fallen to a different level since the last toggle) so
      // deactivating puts them back exactly where they were, not wherever
      // they started the session.
      this.preSludgeY = this.rig.position.y;
      this.rig.position.y = this.preSludgeY - HEIGHT_DROP;
    } else {
      this.rig.position.y = this.preSludgeY;
    }
    this.locomotion.moveSpeed = active ? SLUDGE_MOVE_SPEED : this.normalMoveSpeed;
    this.blobMesh.visible = active;
    for (const obj of this.hideWhileActive) obj.visible = !active;
  }
}
