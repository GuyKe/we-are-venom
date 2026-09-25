const GRAVITY_ACCEL = 9.8; // m/s^2
const SNAP_EPSILON = 0.01;

/**
 * A short list of axis-aligned floor regions (each with an optional hole),
 * used as a lightweight stand-in for a full physics engine: given an X/Z
 * position, what's the highest floor beneath it? Standing within a hole's
 * footprint excludes that region, so a hole falls through to whatever
 * region is below instead.
 */
export class FloorMap {
  constructor() {
    this.regions = [];
  }

  /** @param {{minX,maxX,minZ,maxZ,y,holes?:{minX,maxX,minZ,maxZ}[]}} region */
  addRegion(region) {
    this.regions.push(region);
  }

  _inside(box, x, z) {
    return x >= box.minX && x <= box.maxX && z >= box.minZ && z <= box.maxZ;
  }

  /** Highest floor height under the given world X/Z, or 0 if none defined. */
  getFloorHeightAt(x, z) {
    let best = null;
    for (const region of this.regions) {
      if (!this._inside(region, x, z)) continue;
      if (region.holes && region.holes.some((hole) => this._inside(hole, x, z))) continue;
      if (best === null || region.y > best) best = region.y;
    }
    return best === null ? 0 : best;
  }
}

/**
 * Falls a position toward whatever a FloorMap says is beneath it, so
 * stepping into a hole (or off an edge) drops you to the level below
 * instead of leaving you floating at your old height. Each faller (the
 * player, an NPC, ...) needs its own instance - the fall speed is
 * per-object state.
 */
export class Faller {
  constructor(floorMap) {
    this.floorMap = floorMap;
    this.fallSpeed = 0;
  }

  /**
   * Applies gravity to `position` (a THREE.Vector3-like with x/y/z), in
   * place. `fallSpeed` is a signed vertical speed (positive = falling,
   * negative = rising) - setting it negative from outside (a jump impulse)
   * kicks the faller airborne even while still standing exactly at floor
   * height, and gravity then arcs it back down naturally.
   */
  update(position, dt) {
    const floorY = this.floorMap.getFloorHeightAt(position.x, position.z);
    const airborne = position.y > floorY + SNAP_EPSILON || this.fallSpeed < 0;
    if (airborne) {
      this.fallSpeed += GRAVITY_ACCEL * dt;
      position.y -= this.fallSpeed * dt;
      if (position.y <= floorY) {
        position.y = floorY;
        this.fallSpeed = 0;
      }
    } else {
      position.y = floorY;
      this.fallSpeed = 0;
    }
  }
}
