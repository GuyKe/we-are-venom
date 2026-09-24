import * as THREE from 'three';

const ARENA_RADIUS = 8.5;
const SPAWN_HEIGHT_MIN = 1.0;
const SPAWN_HEIGHT_MAX = 2.1;
const ORB_RADIUS = 0.22;
const HIT_SPEED_THRESHOLD = 1.4; // m/s the tendril tip must be moving to count as a smash
const RESPAWN_DELAY = 0.6;
const PARTICLE_COUNT = 18;
const PARTICLE_LIFETIME = 0.6;

function randomSpawnPosition() {
  const angle = Math.random() * Math.PI * 2;
  const dist = Math.random() * ARENA_RADIUS * 0.8;
  return new THREE.Vector3(
    Math.cos(angle) * dist,
    SPAWN_HEIGHT_MIN + Math.random() * (SPAWN_HEIGHT_MAX - SPAWN_HEIGHT_MIN),
    Math.sin(angle) * dist
  );
}

/**
 * Floating orbs the player smashes with fast tendril-arm swings.
 * A hit needs both proximity AND a minimum swing speed, so gently touching
 * an orb doesn't score - you have to actually swing the symbiote arm at it.
 */
export class TargetOrbs {
  constructor(scene, { count = 6, onScore = () => {}, onSpawn = () => {} } = {}) {
    this.scene = scene;
    this.onScore = onScore;
    this.onSpawn = onSpawn;

    this.group = new THREE.Group();
    scene.add(this.group);

    const geometry = new THREE.IcosahedronGeometry(ORB_RADIUS, 1);
    this._materials = [0xff2fd0, 0x2fe0ff, 0xffcf2f, 0x6dff4a].map(
      (c) =>
        new THREE.MeshStandardMaterial({
          color: c,
          emissive: c,
          emissiveIntensity: 0.9,
          roughness: 0.35,
          metalness: 0.1,
        })
    );

    this.orbs = [];
    for (let i = 0; i < count; i++) {
      const material = this._materials[i % this._materials.length];
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(randomSpawnPosition());
      this.group.add(mesh);
      this.orbs.push({
        mesh,
        alive: true,
        spinAxis: new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize(),
        respawnTimer: 0,
        bobPhase: Math.random() * Math.PI * 2,
        basePos: mesh.position.clone(),
      });
    }

    this._particles = [];
    this._particleGeometry = new THREE.SphereGeometry(0.03, 6, 6);
    this._particleMaterial = new THREE.MeshBasicMaterial({ color: 0x0a0a0a });
  }

  _burst(position, color) {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const mat = this._particleMaterial.clone();
      mat.color.set(Math.random() < 0.7 ? 0x0a0a0a : color);
      const mesh = new THREE.Mesh(this._particleGeometry, mat);
      mesh.position.copy(position);
      const dir = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() * 0.8,
        Math.random() - 0.5
      ).normalize();
      const speed = 1.2 + Math.random() * 2.2;
      this.group.add(mesh);
      this._particles.push({
        mesh,
        velocity: dir.multiplyScalar(speed),
        age: 0,
      });
    }
  }

  /**
   * @param {{position: THREE.Vector3, velocity: THREE.Vector3}[]} tendrilTips
   */
  update(dt, tendrilTips) {
    for (const orb of this.orbs) {
      if (!orb.alive) {
        orb.respawnTimer -= dt;
        if (orb.respawnTimer <= 0) {
          orb.basePos.copy(randomSpawnPosition());
          orb.mesh.position.copy(orb.basePos);
          orb.mesh.visible = true;
          orb.alive = true;
          this.onSpawn(orb);
        }
        continue;
      }

      orb.mesh.rotateOnAxis(orb.spinAxis, dt * 1.4);
      orb.bobPhase += dt * 1.5;
      orb.mesh.position.y = orb.basePos.y + Math.sin(orb.bobPhase) * 0.08;

      for (const tip of tendrilTips) {
        const dist = tip.position.distanceTo(orb.mesh.position);
        const speed = tip.velocity.length();
        if (dist < ORB_RADIUS + 0.09 && speed > HIT_SPEED_THRESHOLD) {
          orb.alive = false;
          orb.mesh.visible = false;
          orb.respawnTimer = RESPAWN_DELAY;
          this._burst(orb.mesh.position, orb.mesh.material.color.getHex());
          this.onScore(orb);
          break;
        }
      }
    }

    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i];
      p.age += dt;
      if (p.age > PARTICLE_LIFETIME) {
        this.group.remove(p.mesh);
        p.mesh.material.dispose();
        this._particles.splice(i, 1);
        continue;
      }
      p.velocity.y -= 4.5 * dt;
      p.mesh.position.addScaledVector(p.velocity, dt);
      const t = p.age / PARTICLE_LIFETIME;
      p.mesh.scale.setScalar(1 - t);
    }
  }
}
