const GRAVITY_ACCEL = 9.8; // m/s^2
const SNAP_EPSILON = 0.01;

/**
 * A short list of axis-aligned floor regions (each with an optional hole
 * or ramp), used as a lightweight stand-in for a full physics engine:
 * given an X/Z position (and how high up you currently are), what's the
 * highest floor at or below that height? Standing within a hole's
 * footprint excludes that region, so a hole falls through to whatever
 * region is below instead. A `ramp` linearly interpolates the region's
 * height along one axis instead of being flat, for a walkable slope.
 */
export class FloorMap {
  constructor() {
    this.regions = [];
  }

  /**
   * @param {{minX,maxX,minZ,maxZ,y,holes?:{minX,maxX,minZ,maxZ}[],
   *   ramp?:{axis:'x'|'z',y0:number,y1:number}}} region `y` is ignored
   *   when `ramp` is given - `ramp.y0` is the height at the region's min
   *   edge along `ramp.axis`, `ramp.y1` the height at its max edge.
   */
  addRegion(region) {
    this.regions.push(region);
  }

  _inside(box, x, z) {
    return x >= box.minX && x <= box.maxX && z >= box.minZ && z <= box.maxZ;
  }

  _heightOf(region, x, z) {
    if (!region.ramp) return region.y;
    const { axis, y0, y1 } = region.ramp;
    const t =
      axis === 'x'
        ? (x - region.minX) / (region.maxX - region.minX)
        : (z - region.minZ) / (region.maxZ - region.minZ);
    return y0 + (y1 - y0) * Math.max(0, Math.min(1, t));
  }

  /**
   * Highest floor at or below `maxY` beneath the given world X/Z, or 0 if
   * none defined. `maxY` (default: unbounded) keeps a floor that's above
   * you - a roof you haven't climbed to yet - from being treated as the
   * ground beneath your feet.
   */
  getFloorHeightAt(x, z, maxY = Infinity) {
    let best = null;
    for (const region of this.regions) {
      if (!this._inside(region, x, z)) continue;
      if (region.holes && region.holes.some((hole) => this._inside(hole, x, z))) continue;
      const regionY = this._heightOf(region, x, z);
      if (regionY > maxY + SNAP_EPSILON) continue;
      if (best === null || regionY > best) best = regionY;
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
    const floorY = this.floorMap.getFloorHeightAt(position.x, position.z, position.y);
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
