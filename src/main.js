import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildRoom, createRainbowOrb } from './Room.js';
import { createVenomMaterial, createCarnageMaterial } from './venomTexture.js';
import { VenomArm } from './VenomArm.js';
import { VenomTwin } from './VenomTwin.js';
import { Locomotion } from './Locomotion.js';
import { SludgeForm } from './Sludge.js';
import { FloorMap, Faller, KnockBody } from './Gravity.js';

const intro = document.getElementById('intro');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 400);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.xr.enabled = true;
document.getElementById('app').appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

const { width, depth, height, groundY, tunnelRegion, mace, crates, spawnPosition, npcPosition, carnagePosition } =
  buildRoom(scene);

// Floor lookup for gravity: the upper room's floor and its roof both sit
// above the ground floor, which everything else shares - walking off any
// edge (or down the side tunnel) drops you to whatever's below. `maxY`
// keeps a floor above you (the roof, before you've flown up to it) from
// being mistaken for solid ground under your feet - see FloorMap.
const floorMap = new FloorMap();
floorMap.addRegion({ minX: -width / 2, maxX: width / 2, minZ: -depth / 2, maxZ: depth / 2, y: 0 });
floorMap.addRegion({ minX: -width / 2, maxX: width / 2, minZ: -depth / 2, maxZ: depth / 2, y: height });
floorMap.addRegion(tunnelRegion);
floorMap.addRegion({ minX: -Infinity, maxX: Infinity, minZ: -Infinity, maxZ: Infinity, y: groundY });
const playerFaller = new Faller(floorMap);
const venomFaller = new Faller(floorMap);
const maceFaller = new Faller(floorMap);

// Player rig ("dolly"): move this to move the player around the room.
const rig = new THREE.Group();
rig.position.copy(spawnPosition);
camera.position.set(0, 1.6, 0);
rig.add(camera);
scene.add(rig);

// Desktop preview controls (only used outside an active XR session).
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.target.set(0, 1.2, -1);
orbit.enableDamping = true;

// Shared glossy black symbiote material for both the player's tendril-arms
// and the Venom figure standing in the room.
const venomMaterial = createVenomMaterial();
const armLeft = new VenomArm({ material: venomMaterial, side: 'left' });
const armRight = new VenomArm({ material: venomMaterial, side: 'right' });
scene.add(armLeft.mesh, armLeft.tipAnchor, armLeft.spikesGroup, armRight.mesh, armRight.tipAnchor, armRight.spikesGroup);

const venomTwin = new VenomTwin(scene, venomMaterial, npcPosition);

// Carnage stands its ground near the crates - unlike Venom, it doesn't
// mirror the player at all, so a mace hit's knockback spin isn't fought
// every frame by a "turn back to face you" update.
const carnageMaterial = createCarnageMaterial();
const carnageTwin = new VenomTwin(scene, carnageMaterial, carnagePosition);
const carnageFaller = new Faller(floorMap);
const carnageKnock = new KnockBody();

// Every crate gets its own gravity and knockback, so a solid mace swing
// can send one tumbling off the platform instead of it being purely
// decorative set-dressing.
const crateBodies = crates.map((mesh) => ({ mesh, faller: new Faller(floorMap), knock: new KnockBody() }));

// Raw controller + grip spaces give us tracked pose data; we don't attach
// any visible controller model since the symbiote tendrils replace the hands.
const controllerGrips = [renderer.xr.getControllerGrip(0), renderer.xr.getControllerGrip(1)];
const controllers = [renderer.xr.getController(0), renderer.xr.getController(1)];
const handedness = { 0: null, 1: null };

controllers.forEach((controller, i) => {
  controller.addEventListener('connected', (event) => {
    handedness[i] = event.data.handedness;
  });
  controller.addEventListener('disconnected', () => {
    handedness[i] = null;
  });
  rig.add(controller);
  rig.add(controllerGrips[i]);
});

// Desktop fallback hand targets, so the tendrils are visible while previewing
// on a monitor without a headset connected.
const desktopTargets = {
  left: new THREE.Object3D(),
  right: new THREE.Object3D(),
};
rig.add(desktopTargets.left, desktopTargets.right);

const locomotion = new Locomotion(rig, camera, renderer);

const sludge = new SludgeForm(rig, locomotion, venomMaterial, [
  armLeft.mesh,
  armLeft.tipAnchor,
  armLeft.spikesGroup,
  armRight.mesh,
  armRight.tipAnchor,
  armRight.spikesGroup,
]);

renderer.xr.addEventListener('sessionstart', () => {
  intro.classList.add('hidden');
});
renderer.xr.addEventListener('sessionend', () => {
  intro.classList.remove('hidden');
});
intro.addEventListener('click', () => {
  if (!renderer.xr.isPresenting) intro.classList.add('hidden');
});

function findGripBySide(side) {
  for (let i = 0; i < 2; i++) {
    if (handedness[i] === side) return controllerGrips[i];
  }
  return null;
}

const shoulderOffsetLeft = new THREE.Vector3(-0.22, -0.28, -0.08);
const shoulderOffsetRight = new THREE.Vector3(0.22, -0.28, -0.08);

const tmpAnchor = new THREE.Vector3();
const tmpTarget = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();
const tmpHeadPos = new THREE.Vector3();
const tmpHeadQuat = new THREE.Quaternion();
const tmpEuler = new THREE.Euler();

function computeShoulderAnchor(offset, out) {
  camera.getWorldPosition(tmpHeadPos);
  camera.getWorldQuaternion(tmpHeadQuat);
  out.copy(offset).applyQuaternion(tmpHeadQuat).add(tmpHeadPos);
  return out;
}

function updateArm(arm, side, offset, dt, inXR) {
  const anchor = computeShoulderAnchor(offset, tmpAnchor);
  const targetObject = (inXR && findGripBySide(side)) || desktopTargets[side];
  targetObject.getWorldPosition(tmpTarget);
  targetObject.getWorldQuaternion(tmpQuat);
  arm.update(anchor, tmpTarget, tmpQuat, dt);
}

function updateDesktopTargets(t) {
  desktopTargets.left.position.set(
    -0.35 + Math.sin(t * 1.3) * 0.12,
    1.15 + Math.sin(t * 2.1) * 0.15,
    -0.5 + Math.cos(t * 1.7) * 0.15
  );
  desktopTargets.right.position.set(
    0.35 + Math.cos(t * 1.5) * 0.12,
    1.15 + Math.cos(t * 1.9) * 0.15,
    -0.5 + Math.sin(t * 1.6) * 0.15
  );
}

// The Quest face buttons lash the matching tendril out and back (a one-shot
// pulse - see VenomArm.triggerExtend): right controller's B for the right
// arm, left controller's X for the left arm. In the xr-standard gamepad
// mapping, button index 4 is the primary face button (A on the right
// controller, X on the left) and index 5 is the secondary one (B / Y) - so
// each hand watches a different index for its "first" face button.
// Edge-detected per hand so holding the button doesn't keep re-triggering it.
const EXTEND_BUTTON_INDEX = { left: 4, right: 5 }; // left=X, right=B
const extendButtonState = { left: false, right: false };
function checkExtendButtons() {
  const session = renderer.xr.getSession();
  if (!session) return;
  for (const source of session.inputSources) {
    const side = source.handedness;
    if ((side !== 'left' && side !== 'right') || !source.gamepad) continue;
    const button = source.gamepad.buttons[EXTEND_BUTTON_INDEX[side]];
    const pressed = !!button && button.pressed;
    if (pressed && !extendButtonState[side]) {
      (side === 'left' ? armLeft : armRight).triggerExtend();
    }
    extendButtonState[side] = pressed;
  }
}

// The left controller's Y button toggles the sludge form (xr-standard
// button index 5 is the secondary face button - B on the right controller,
// Y on the left). Edge-detected so holding it doesn't keep re-toggling.
let sludgeButtonWasPressed = false;
function checkSludgeButton() {
  const session = renderer.xr.getSession();
  if (!session) return;
  for (const source of session.inputSources) {
    if (source.handedness !== 'left' || !source.gamepad) continue;
    const button = source.gamepad.buttons[5];
    const pressed = !!button && button.pressed;
    if (pressed && !sludgeButtonWasPressed) sludge.toggle();
    sludgeButtonWasPressed = pressed;
    return;
  }
}

// The right controller's A button (index 4) jumps on a tap; keep holding
// it past FLY_HOLD_THRESHOLD and it turns into sustained flight instead,
// with a floppy "ragdolled" wobble on the whole rig while airborne.
const JUMP_SPEED = 4.5; // m/s upward impulse
const FLY_SPEED = 3.0; // m/s steady ascent while flying
const FLY_HOLD_THRESHOLD = 0.25; // seconds held before a jump becomes a flight
const RAGDOLL_WOBBLE_AMPLITUDE = 0.09; // radians
const RAGDOLL_WOBBLE_FREQ = 9; // radians/sec

let jumpHeld = false;
let jumpHeldTime = 0;
let flying = false;

function isGrounded() {
  const floorY = floorMap.getFloorHeightAt(rig.position.x, rig.position.z, rig.position.y);
  return Math.abs(rig.position.y - floorY) < 0.02;
}

function startJumpPress() {
  if (jumpHeld || sludge.active) return;
  jumpHeld = true;
  jumpHeldTime = 0;
  if (isGrounded()) playerFaller.fallSpeed = -JUMP_SPEED;
}

function endJumpPress() {
  jumpHeld = false;
  jumpHeldTime = 0;
  flying = false;
  rig.rotation.x = 0;
  rig.rotation.z = 0;
}

let jumpButtonWasPressed = false;
function checkJumpButton() {
  const session = renderer.xr.getSession();
  if (!session) return;
  for (const source of session.inputSources) {
    if (source.handedness !== 'right' || !source.gamepad) continue;
    const button = source.gamepad.buttons[4];
    const pressed = !!button && button.pressed;
    if (pressed && !jumpButtonWasPressed) startJumpPress();
    if (!pressed && jumpButtonWasPressed) endJumpPress();
    jumpButtonWasPressed = pressed;
    return;
  }
}

// Squeezing either controller's trigger (xr-standard button index 0) near
// the mace picks it up; it's simply reparented onto that hand's grip
// (Object3D.attach preserves its world transform, so it doesn't jump), and
// letting go of the trigger drops it back into the scene under gravity.
const PICKUP_RADIUS = 0.35;
let maceHeldBy = null;
const tmpHandPos = new THREE.Vector3();
const tmpMacePos = new THREE.Vector3();

function handNodeFor(side, inXR) {
  return (inXR && findGripBySide(side)) || desktopTargets[side];
}

function tryPickupMace(side, inXR) {
  if (maceHeldBy) return;
  const handNode = handNodeFor(side, inXR);
  handNode.getWorldPosition(tmpHandPos);
  mace.getWorldPosition(tmpMacePos);
  if (tmpHandPos.distanceTo(tmpMacePos) > PICKUP_RADIUS) return;
  handNode.attach(mace);
  maceHeldBy = side;
}

function dropMace() {
  if (!maceHeldBy) return;
  scene.attach(mace);
  maceFaller.fallSpeed = 0;
  maceHeldBy = null;
}

const triggerButtonState = { left: false, right: false };
function checkTriggerButtons() {
  const session = renderer.xr.getSession();
  if (!session) return;
  for (const source of session.inputSources) {
    const side = source.handedness;
    if ((side !== 'left' && side !== 'right') || !source.gamepad) continue;
    const button = source.gamepad.buttons[0];
    const pressed = !!button && button.pressed;
    if (pressed && !triggerButtonState[side]) tryPickupMace(side, true);
    if (!pressed && triggerButtonState[side] && maceHeldBy === side) dropMace();
    triggerButtonState[side] = pressed;
  }
}

// Swinging the held mace fast enough near Carnage or a crate knocks it
// back and pops out a rainbow orb - no gameplay meaning assigned to the
// orbs yet, just the hit-reaction.
const HIT_SPEED_THRESHOLD = 1.6; // m/s the mace head must be moving to count as a swing
const HIT_RADIUS = 0.6;
const HIT_COOLDOWN = 0.4; // seconds before the same target can be hit again
const KNOCK_FORCE = 3.5;
const MAX_ORBS = 40;

// Once popped out, a rainbow orb briefly hops from its own knockback, then
// - like Minecraft XP - flies straight at the player, speeding up the
// longer it chases, and is collected (removed) the moment it reaches you.
const ORB_POP_DURATION = 0.18; // seconds of hopping before it starts homing
const ORB_HOME_ACCEL = 9; // m/s^2
const ORB_HOME_MAX_SPEED = 9; // m/s
const ORB_COLLECT_RADIUS = 0.4;

const hittableTargets = [
  ...crateBodies.map((body) => ({ object: body.mesh, knock: body.knock, faller: body.faller, lastHitTime: -Infinity })),
  { object: carnageTwin.group, knock: carnageKnock, faller: null, lastHitTime: -Infinity },
];

const orbs = [];
const tmpMaceHeadPos = new THREE.Vector3();
const tmpPrevMaceHeadPos = new THREE.Vector3();
const tmpTargetPos = new THREE.Vector3();
const tmpHitDir = new THREE.Vector3();
const tmpOrbPlayerPos = new THREE.Vector3();
const tmpOrbDir = new THREE.Vector3();
let maceHeadTracked = false;

function spawnRainbowOrb(position, t) {
  const orbMesh = createRainbowOrb();
  orbMesh.position.copy(position);
  scene.add(orbMesh);
  const orb = { mesh: orbMesh, faller: new Faller(floorMap), knock: new KnockBody(), spawnTime: t, homeSpeed: 0 };
  orb.knock.applyImpulse(Math.random() - 0.5, Math.random() - 0.5, 1.5);
  orb.faller.fallSpeed = -2.5;
  orbs.push(orb);

  if (orbs.length > MAX_ORBS) {
    const stale = orbs.shift();
    scene.remove(stale.mesh);
  }
}

/** Advances every orb for one frame: a brief pop under its own knockback
 * and gravity, then homing in on the player until it's collected. */
function updateOrbs(dt, t) {
  for (let i = orbs.length - 1; i >= 0; i--) {
    const orb = orbs[i];
    if (t - orb.spawnTime < ORB_POP_DURATION) {
      orb.knock.update(orb.mesh, dt);
      orb.faller.update(orb.mesh.position, dt);
    } else {
      camera.getWorldPosition(tmpOrbPlayerPos);
      tmpOrbDir.subVectors(tmpOrbPlayerPos, orb.mesh.position);
      const dist = tmpOrbDir.length();
      if (dist < ORB_COLLECT_RADIUS) {
        scene.remove(orb.mesh);
        orbs.splice(i, 1);
        continue;
      }
      orb.homeSpeed = Math.min(orb.homeSpeed + ORB_HOME_ACCEL * dt, ORB_HOME_MAX_SPEED);
      orb.mesh.position.addScaledVector(tmpOrbDir.divideScalar(dist), orb.homeSpeed * dt);
    }

    const hue = (t * 0.4 + orb.mesh.userData.huePhase) % 1;
    orb.mesh.material.color.setHSL(hue, 0.9, 0.6);
    orb.mesh.material.emissive.copy(orb.mesh.material.color);
  }
}

function updateMaceHits(dt, t) {
  if (!maceHeldBy) {
    maceHeadTracked = false;
    return;
  }
  mace.localToWorld(tmpMaceHeadPos.set(0, 0.62, 0));
  if (!maceHeadTracked) {
    tmpPrevMaceHeadPos.copy(tmpMaceHeadPos);
    maceHeadTracked = true;
    return;
  }

  const speed = tmpMaceHeadPos.distanceTo(tmpPrevMaceHeadPos) / dt;
  if (speed > HIT_SPEED_THRESHOLD) {
    for (const target of hittableTargets) {
      target.object.getWorldPosition(tmpTargetPos);
      if (tmpMaceHeadPos.distanceTo(tmpTargetPos) > HIT_RADIUS) continue;
      if (t - target.lastHitTime < HIT_COOLDOWN) continue;

      target.lastHitTime = t;
      tmpHitDir.subVectors(tmpTargetPos, tmpMaceHeadPos);
      tmpHitDir.y = 0;
      if (tmpHitDir.lengthSq() < 1e-6) tmpHitDir.set(Math.random() - 0.5, 0, Math.random() - 0.5);
      target.knock.applyImpulse(tmpHitDir.x, tmpHitDir.z, KNOCK_FORCE);
      if (target.faller) target.faller.fallSpeed = -1.8;
      spawnRainbowOrb(tmpTargetPos, t);
    }
  }

  tmpPrevMaceHeadPos.copy(tmpMaceHeadPos);
}

// Keyboard "B"/"X" mirror the same lash-out for desktop preview/testing.
// "Y" mirrors the left controller's sludge-form toggle. "A" mirrors the
// right controller's jump/fly button. "Q"/"E" mirror the left/right
// trigger for picking up the mace.
window.addEventListener('keydown', (event) => {
  if (event.repeat) return;
  const key = event.key.toLowerCase();
  if (key === 'b') armRight.triggerExtend();
  if (key === 'x') armLeft.triggerExtend();
  if (key === 'y') sludge.toggle();
  if (key === 'a') startJumpPress();
  if (key === 'q') tryPickupMace('left', false);
  if (key === 'e') tryPickupMace('right', false);
});
window.addEventListener('keyup', (event) => {
  const key = event.key.toLowerCase();
  if (key === 'a') endJumpPress();
  if (key === 'q' && maceHeldBy === 'left') dropMace();
  if (key === 'e' && maceHeldBy === 'right') dropMace();
});

const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  const t = clock.elapsedTime;
  const inXR = renderer.xr.isPresenting;

  if (inXR) {
    locomotion.update(dt);
    checkExtendButtons();
    checkSludgeButton();
    checkJumpButton();
    checkTriggerButtons();
  } else {
    orbit.update();
    updateDesktopTargets(t);
  }

  // Holding the jump button past the threshold turns the jump into
  // sustained flight - climbing steadily and tumbling with a bounded
  // pitch/roll wobble (a "ragdolled" feel without spinning the camera,
  // which would be nauseating in VR) instead of arcing back down.
  if (jumpHeld && !sludge.active) {
    jumpHeldTime += dt;
    if (jumpHeldTime > FLY_HOLD_THRESHOLD) {
      flying = true;
      playerFaller.fallSpeed = 0;
      rig.position.y += FLY_SPEED * dt;
      rig.rotation.x = Math.sin(t * RAGDOLL_WOBBLE_FREQ) * RAGDOLL_WOBBLE_AMPLITUDE;
      rig.rotation.z = Math.cos(t * RAGDOLL_WOBBLE_FREQ * 0.8) * RAGDOLL_WOBBLE_AMPLITUDE;
    }
  }

  // Sludge fully owns the player's height while active, and flight owns it
  // while airborne; gravity resumes once neither is in control.
  if (!sludge.active && !flying) playerFaller.update(rig.position, dt);

  // The mace falls like anything else once it's been dropped; while held,
  // it's simply a child of the holding hand and needs no per-frame update.
  if (!maceHeldBy) maceFaller.update(mace.position, dt);

  // Detect mace-vs-crate/Carnage hits, then let every knocked body's
  // velocity/spin and gravity play out for this frame.
  updateMaceHits(dt, t);
  for (const body of crateBodies) {
    body.knock.update(body.mesh, dt);
    body.faller.update(body.mesh.position, dt);
  }
  carnageKnock.update(carnageTwin.group, dt);
  updateOrbs(dt, t);

  updateArm(armLeft, 'left', shoulderOffsetLeft, dt, inXR);
  updateArm(armRight, 'right', shoulderOffsetRight, dt, inXR);

  // Venom doesn't chase the player - it just stands there mirroring
  // whatever direction the player is currently facing.
  camera.getWorldQuaternion(tmpHeadQuat);
  tmpEuler.setFromQuaternion(tmpHeadQuat, 'YXZ');
  venomTwin.update(dt, tmpEuler.y, venomFaller);

  // Carnage doesn't mirror the player - it just stands its ground near the
  // crates, reacting only to being knocked around.
  carnageTwin.update(dt, null, carnageFaller);

  renderer.render(scene, camera);
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
