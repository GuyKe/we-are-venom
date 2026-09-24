import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildEnvironment } from './Environment.js';
import { createVenomMaterial } from './venomTexture.js';
import { VenomArm } from './VenomArm.js';
import { RagdollHuman } from './Ragdoll.js';
import { Locomotion } from './Locomotion.js';
import { SludgeForm } from './Sludge.js';
import { TargetOrbs } from './TargetOrbs.js';
import { Hud } from './Hud.js';
import { playSmashSound, playPossessSound } from './sound.js';

const intro = document.getElementById('intro');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 100);
camera.position.set(0, 1.6, 3);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.xr.enabled = true;
document.getElementById('app').appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

buildEnvironment(scene);

// Player rig ("dolly"): move this to move the player around the baseplate.
const rig = new THREE.Group();
rig.add(camera);
scene.add(rig);

// Desktop preview controls (only used outside an active XR session).
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.target.set(0, 1.2, 0);
orbit.enableDamping = true;

// Shared glossy black symbiote material for both tendril-arms.
const venomMaterial = createVenomMaterial();
const armLeft = new VenomArm({ material: venomMaterial, side: 'left' });
const armRight = new VenomArm({ material: venomMaterial, side: 'right' });
scene.add(armLeft.mesh, armLeft.tipAnchor, armLeft.spikesGroup, armRight.mesh, armRight.tipAnchor, armRight.spikesGroup);

// Raw controller + grip spaces give us tracked pose data; we don't attach
// any visible controller model since the symbiote tendrils replace the hands.
const controllerGrips = [renderer.xr.getControllerGrip(0), renderer.xr.getControllerGrip(1)];
const controllers = [renderer.xr.getController(0), renderer.xr.getController(1)];
const handedness = { 0: null, 1: null };

const ragdoll = new RagdollHuman(scene, { standPosition: new THREE.Vector3(1.6, 0, -3.2) });

function forwardOf(quat, out) {
  return out.set(0, 0, -1).applyQuaternion(quat);
}

const tmpGrabOrigin = new THREE.Vector3();
const tmpGrabDir = new THREE.Vector3();
const tmpGrabQuat = new THREE.Quaternion();

function attemptGrab(side, originObject) {
  originObject.getWorldPosition(tmpGrabOrigin);
  originObject.getWorldQuaternion(tmpGrabQuat);
  forwardOf(tmpGrabQuat, tmpGrabDir);
  ragdoll.tryGrab(side, tmpGrabOrigin, tmpGrabDir);
}

controllers.forEach((controller, i) => {
  controller.addEventListener('connected', (event) => {
    handedness[i] = event.data.handedness;
  });
  controller.addEventListener('disconnected', () => {
    handedness[i] = null;
  });
  // Grip ("squeeze") grabs the ragdoll: a generous raycast range lets the
  // tendrils grab him from well beyond normal arm's reach.
  controller.addEventListener('squeezestart', () => {
    if (handedness[i]) attemptGrab(handedness[i], controller);
  });
  controller.addEventListener('squeezeend', () => {
    if (handedness[i]) ragdoll.releaseGrab(handedness[i]);
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

const hud = new Hud();
hud.mesh.position.set(0, 2.4, -4);
scene.add(hud.mesh);

let score = 0;
const orbs = new TargetOrbs(scene, {
  onScore: () => {
    score += 1;
    hud.setScore(score);
    playSmashSound();
  },
});

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

function computeShoulderAnchor(offset, out) {
  camera.getWorldPosition(tmpHeadPos);
  camera.getWorldQuaternion(tmpHeadQuat);
  out.copy(offset).applyQuaternion(tmpHeadQuat).add(tmpHeadPos);
  return out;
}

const prevTipPositions = { left: new THREE.Vector3(), right: new THREE.Vector3() };
const tipVelocities = { left: new THREE.Vector3(), right: new THREE.Vector3() };
const handWorldPositions = { left: new THREE.Vector3(), right: new THREE.Vector3() };

/** Raw hand/controller world position, independent of any active grab. */
function updateHandWorldPositions(inXR) {
  for (const side of ['left', 'right']) {
    const targetObject = (inXR && findGripBySide(side)) || desktopTargets[side];
    targetObject.getWorldPosition(handWorldPositions[side]);
  }
}

function updateArm(arm, side, offset, dt, inXR) {
  const anchor = computeShoulderAnchor(offset, tmpAnchor);
  const targetObject = (inXR && findGripBySide(side)) || desktopTargets[side];
  targetObject.getWorldQuaternion(tmpQuat);

  // While holding a grab, the tendril's tip stretches to the grabbed body
  // part instead of following the raw hand position, so the arm itself
  // visibly reaches all the way out to him.
  const grab = ragdoll.grabs[side];
  if (grab) {
    tmpTarget.copy(ragdoll.getParticlePosition(grab.index));
  } else {
    tmpTarget.copy(handWorldPositions[side]);
  }

  arm.update(anchor, tmpTarget, tmpQuat, dt);

  const tip = arm.getTip();
  const prev = prevTipPositions[side];
  const vel = tipVelocities[side];
  if (dt > 0) vel.copy(tip).sub(prev).divideScalar(dt);
  prev.copy(tip);
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

// Keyboard "B"/"X" mirror the same lash-out for desktop preview/testing.
// "G"/"F" mirror the right/left grip (aiming with wherever the camera looks).
// "Y" mirrors the left controller's sludge-form toggle.
window.addEventListener('keydown', (event) => {
  if (event.repeat) return;
  const key = event.key.toLowerCase();
  if (key === 'b') armRight.triggerExtend();
  if (key === 'x') armLeft.triggerExtend();
  if (key === 'y') sludge.toggle();
  if (renderer.xr.isPresenting) return;
  if (key === 'g') attemptGrab('right', camera);
  if (key === 'f') attemptGrab('left', camera);
});
window.addEventListener('keyup', (event) => {
  if (renderer.xr.isPresenting) return;
  const key = event.key.toLowerCase();
  if (key === 'g') ragdoll.releaseGrab('right');
  if (key === 'f') ragdoll.releaseGrab('left');
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
  } else {
    orbit.update();
    updateDesktopTargets(t);
  }

  updateHandWorldPositions(inXR);
  updateArm(armLeft, 'left', shoulderOffsetLeft, dt, inXR);
  updateArm(armRight, 'right', shoulderOffsetRight, dt, inXR);
  ragdoll.update(dt, handWorldPositions);

  if (sludge.checkTouch(ragdoll.getParticlePosition(RagdollHuman.PARTICLE.PELVIS))) {
    ragdoll.markPossessed();
    playPossessSound();
  }

  orbs.update(dt, [
    { position: armLeft.getTip(), velocity: tipVelocities.left },
    { position: armRight.getTip(), velocity: tipVelocities.right },
  ]);

  hud.mesh.lookAt(tmpHeadPos);

  renderer.render(scene, camera);
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
